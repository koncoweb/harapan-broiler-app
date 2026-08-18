import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, Button, Text, ActivityIndicator, Card, IconButton, Divider, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { OfflineStorageService, OfflineSession, SyncStatus } from '../services/offlineStorage';
import { db } from '../config/firebaseConfig';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { formatCurrency, formatDateId } from '../utils/format';
import { getErrorMessage } from '../utils/firebaseErrors';

type SyncScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Sync'>;
};

const MAX_SYNC_ATTEMPTS = 3;

export default function SyncScreen({ navigation }: SyncScreenProps) {
  const [offlineSessions, setOfflineSessions] = useState<OfflineSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    loadOfflineData();
    const unsubscribeNet = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    const unsubscribeFocus = navigation.addListener('focus', () => {
      loadOfflineData();
    });

    return () => {
      unsubscribeNet();
      unsubscribeFocus();
    };
  }, [navigation]);

  const loadOfflineData = async () => {
    setLoading(true);
    const data = await OfflineStorageService.getSessions();
    setOfflineSessions(data);
    setLoading(false);
  };

  const syncSingleSession = async (session: OfflineSession): Promise<boolean> => {
    try {
      await OfflineStorageService.updateSessionSyncStatus(session.id, 'syncing');

      const { id, syncStatus, syncAttempts, lastSyncError, ...sessionData } = session;

      if (id.startsWith('offline_')) {
        await addDoc(collection(db, 'weighing_sessions'), sessionData);
      } else {
        await setDoc(doc(db, 'weighing_sessions', id), sessionData);
      }

      await OfflineStorageService.removeSession(id);
      return true;
    } catch (error: any) {
      console.error(`Failed to sync session ${session.id}:`, error);
      await OfflineStorageService.updateSessionSyncStatus(session.id, 'failed', getErrorMessage(error));
      return false;
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Tidak ada koneksi internet');
      return;
    }

    const retryableSessions = offlineSessions.filter(
      s => !s.syncStatus || s.syncStatus === 'pending' ||
        (s.syncStatus === 'failed' && (s.syncAttempts || 0) < MAX_SYNC_ATTEMPTS)
    );

    if (retryableSessions.length === 0) {
      Alert.alert('Info', 'Tidak ada data yang dapat disinkronkan. Semua data sudah mencapai batas percobaan.');
      return;
    }

    setSyncing(true);
    let successCount = 0;
    let failCount = 0;

    for (const session of retryableSessions) {
      const success = await syncSingleSession(session);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setSyncing(false);
    await loadOfflineData(); // Refresh list

    if (failCount === 0) {
      Alert.alert('Sukses', `${successCount} data berhasil disinkronkan!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Selesai Sebagian', `${successCount} berhasil, ${failCount} gagal. Data yang gagal tetap tersimpan dan bisa dicoba lagi.`);
    }
  };

  const handleRetry = async (session: OfflineSession) => {
    if (!isConnected) {
      Alert.alert('Error', 'Tidak ada koneksi internet');
      return;
    }

    if ((session.syncAttempts || 0) >= MAX_SYNC_ATTEMPTS) {
      Alert.alert('Info', 'Data ini sudah mencapai batas percobaan sinkronisasi.');
      return;
    }

    setSyncing(true);
    const success = await syncSingleSession(session);
    setSyncing(false);
    await loadOfflineData();

    if (success) {
      Alert.alert('Sukses', 'Data berhasil disinkronkan.');
    } else {
      Alert.alert('Gagal', 'Data masih gagal disinkronkan. Silakan coba lagi nanti.');
    }
  };

  const handleDeleteFailed = (session: OfflineSession) => {
    Alert.alert(
      'Konfirmasi Hapus',
      `Hapus data ${session.buyer} (${formatDateId(session.date)}) dari perangkat? Data yang sudah dihapus tidak bisa dikembalikan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await OfflineStorageService.removeSession(session.id);
              await loadOfflineData();
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus data');
            }
          }
        }
      ]
    );
  };

  const getStatusChip = (status?: SyncStatus, attempts?: number) => {
    switch (status) {
      case 'syncing':
        return <Chip icon="sync" style={{ backgroundColor: '#E3F2FD' }} textStyle={{ color: '#1976D2' }}>Menyinkronkan</Chip>;
      case 'failed':
        const maxed = (attempts || 0) >= MAX_SYNC_ATTEMPTS;
        return (
          <Chip
            icon="alert-circle"
            style={{ backgroundColor: maxed ? '#FFEBEE' : '#FFF3E0' }}
            textStyle={{ color: maxed ? '#D32F2F' : '#E65100' }}
          >
            {maxed ? 'Gagal Total' : `Gagal (${attempts || 0}/${MAX_SYNC_ATTEMPTS})`}
          </Chip>
        );
      case 'pending':
      default:
        return <Chip icon="clock-outline" style={{ backgroundColor: '#E8F5E9' }} textStyle={{ color: '#2E7D32' }}>Menunggu</Chip>;
    }
  };

  const retryableCount = offlineSessions.filter(
    s => !s.syncStatus || s.syncStatus === 'pending' ||
      (s.syncStatus === 'failed' && (s.syncAttempts || 0) < MAX_SYNC_ATTEMPTS)
  ).length;

  const failedCount = offlineSessions.filter(s => s.syncStatus === 'failed').length;

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="white" />
        <Appbar.Content title="Sinkronisasi Data" titleStyle={{ color: 'white', fontWeight: 'bold' }} />
      </Appbar.Header>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status Koneksi: {isConnected ? <Text style={{color: 'green', fontWeight: 'bold'}}>ONLINE</Text> : <Text style={{color: 'red', fontWeight: 'bold'}}>OFFLINE</Text>}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} size="large" />
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                {offlineSessions.length} Data Pending
              </Text>
              {failedCount > 0 && (
                <Text style={styles.summaryWarning}>
                  {failedCount} data gagal sync
                </Text>
              )}
              <Text style={styles.summarySubtext}>
                Data ini tersimpan di perangkat dan belum masuk ke database pusat.
              </Text>
            </View>

            {offlineSessions.map((item) => (
              <Card
                key={item.id}
                style={[
                  styles.card,
                  item.syncStatus === 'failed' && styles.failedCard
                ]}
              >
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Text style={styles.buyerName}>{item.buyer}</Text>
                    {getStatusChip(item.syncStatus, item.syncAttempts)}
                  </View>
                  <Divider style={{ marginVertical: 8 }} />
                  <View style={styles.row}>
                    <Text>Tanggal:</Text>
                    <Text style={{ fontWeight: 'bold' }}>{formatDateId(item.date)} {item.time}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>Total Berat:</Text>
                    <Text style={{ fontWeight: 'bold' }}>{item.totalNetWeight} Kg</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>Total Bayar:</Text>
                    <Text style={{ fontWeight: 'bold' }}>{formatCurrency(item.totalAmount)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>Tipe:</Text>
                    <Text style={{ fontStyle: 'italic', color: item.id.startsWith('offline_') ? '#1976D2' : '#E64A19' }}>
                      {item.id.startsWith('offline_') ? 'Data Baru' : 'Edit Data'}
                    </Text>
                  </View>

                  {item.lastSyncError && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{item.lastSyncError}</Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => navigation.navigate('CreateNota', { session: item })}
                    />
                    {item.syncStatus === 'failed' && (item.syncAttempts || 0) < MAX_SYNC_ATTEMPTS && (
                      <IconButton
                        icon="sync"
                        size={20}
                        onPress={() => handleRetry(item)}
                        disabled={syncing || !isConnected}
                      />
                    )}
                    {item.syncStatus === 'failed' && (
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor="#D32F2F"
                        onPress={() => handleDeleteFailed(item)}
                        disabled={syncing}
                      />
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))}

            {offlineSessions.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ color: '#888', textAlign: 'center' }}>Tidak ada data yang perlu disinkronkan.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSync}
          loading={syncing}
          disabled={syncing || retryableCount === 0 || !isConnected}
          style={styles.syncButton}
          contentStyle={{ height: 50 }}
        >
          {syncing ? 'Menyinkronkan...' : 'SINKRONISASI SEKARANG'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2E7D32',
  },
  statusContainer: {
    padding: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryWarning: {
    fontSize: 14,
    color: '#D32F2F',
    marginTop: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  failedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyerName: {
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 4,
  },
  syncButton: {
    backgroundColor: '#2E7D32',
  }
});
