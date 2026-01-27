import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, List, Button, Text, ActivityIndicator, Card, IconButton, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, WeighingSession } from '../types';
import { OfflineStorageService } from '../services/offlineStorage';
import { db } from '../config/firebaseConfig';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';

type SyncScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Sync'>;
};

export default function SyncScreen({ navigation }: SyncScreenProps) {
  const [offlineSessions, setOfflineSessions] = useState<WeighingSession[]>([]);
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

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Tidak ada koneksi internet');
      return;
    }

    if (offlineSessions.length === 0) {
      Alert.alert('Info', 'Tidak ada data untuk disinkronkan');
      return;
    }

    setSyncing(true);
    let successCount = 0;
    let failCount = 0;

    for (const session of offlineSessions) {
      try {
        const { id, ...sessionData } = session;
        
        // Check if it's a new record (offline ID) or an update
        if (id.startsWith('offline_')) {
          // New record: use addDoc to let Firestore generate ID
          await addDoc(collection(db, 'weighing_sessions'), sessionData);
        } else {
          // Existing record: use setDoc with existing ID
          await setDoc(doc(db, 'weighing_sessions', id), sessionData);
        }

        // Remove from local storage upon success
        await OfflineStorageService.removeSession(id);
        successCount++;
      } catch (error) {
        console.error(`Failed to sync session ${session.id}:`, error);
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
      Alert.alert('Selesai Sebagian', `${successCount} berhasil, ${failCount} gagal. Silakan coba lagi nanti.`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

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
              <Text style={styles.summarySubtext}>
                Data ini tersimpan di perangkat dan belum masuk ke database pusat.
              </Text>
            </View>

            {offlineSessions.map((item, index) => (
              <Card 
                key={item.id} 
                style={styles.card} 
                onPress={() => navigation.navigate('CreateNota', { session: item })}
              >
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Text style={styles.buyerName}>{item.buyer}</Text>
                    <Text style={styles.date}>{new Date(item.date).toLocaleDateString('id-ID')}</Text>
                  </View>
                  <Divider style={{ marginVertical: 8 }} />
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
          disabled={syncing || offlineSessions.length === 0 || !isConnected}
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
  summarySubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyerName: {
    fontWeight: 'bold',
    fontSize: 16,
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
