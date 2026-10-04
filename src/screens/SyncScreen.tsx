import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Button, Text, ActivityIndicator, Card, IconButton, Divider, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from '../types';
import { OfflineStorageService, OfflineSession, SyncStatus } from '../services/offlineStorage';
import { syncSingleSession, MAX_SYNC_ATTEMPTS } from '../services/syncService';
import NetInfo from '@react-native-community/netinfo';
import { formatCurrency, formatDateId } from '../utils/format';
import { colors, palette, radius, spacing, shadows, type, sizes } from '../theme';
import { haptic } from '../theme/haptics';

type SyncScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Sync'>;
};

export default function SyncScreen({ navigation }: SyncScreenProps) {
  const insets = useSafeAreaInsets();
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

  const syncSingle = (session: OfflineSession) => syncSingleSession(session);

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
      const success = await syncSingle(session);
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
    const success = await syncSingle(session);
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
        return <Chip icon="sync" style={{ backgroundColor: palette.infoBg }} textStyle={{ color: palette.info }}>Menyinkronkan</Chip>;
      case 'failed':
        const maxed = (attempts || 0) >= MAX_SYNC_ATTEMPTS;
        return (
          <Chip
            icon="alert-circle"
            style={{ backgroundColor: maxed ? palette.dangerBg : palette.warningBg }}
            textStyle={{ color: maxed ? palette.danger : palette.warning }}
          >
            {maxed ? 'Gagal Total' : `Gagal (${attempts || 0}/${MAX_SYNC_ATTEMPTS})`}
          </Chip>
        );
      case 'pending':
      default:
        return <Chip icon="clock-outline" style={{ backgroundColor: palette.successBg }} textStyle={{ color: palette.success }}>Menunggu</Chip>;
    }
  };

  const retryableCount = offlineSessions.filter(
    s => !s.syncStatus || s.syncStatus === 'pending' ||
      (s.syncStatus === 'failed' && (s.syncAttempts || 0) < MAX_SYNC_ATTEMPTS)
  ).length;

  const failedCount = offlineSessions.filter(s => s.syncStatus === 'failed').length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[palette.green900, palette.green700, palette.green600]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrap}
      >
        <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => { haptic.tap(); navigation.goBack(); }} style={styles.backTouch}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sinkronisasi Data</Text>
        </View>
      </LinearGradient>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status Koneksi: {isConnected ? <Text style={{ ...type.bodyStrong, color: palette.success }}>ONLINE</Text> : <Text style={{ ...type.bodyStrong, color: palette.danger }}>OFFLINE</Text>}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
                    <Text style={styles.rowValue}>{formatDateId(item.date)} {item.time}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>Total Berat:</Text>
                    <Text style={styles.rowValue}>{item.totalNetWeight} Kg</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>Total Bayar:</Text>
                    <Text style={styles.rowValue}>{formatCurrency(item.totalAmount)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>Tipe:</Text>
                    <Text style={{ fontStyle: 'italic', color: item.id.startsWith('offline_') ? palette.info : palette.warning }}>
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
                      onPress={() => { haptic.tap(); navigation.navigate('CreateNota', { session: item }); }}
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
                        iconColor={palette.danger}
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
                <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Tidak ada data yang perlu disinkronkan.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          mode="contained"
          onPress={() => { haptic.medium(); handleSync(); }}
          loading={syncing}
          disabled={syncing || retryableCount === 0 || !isConnected}
          style={styles.syncButton}
          contentStyle={{ height: 52 }}
          labelStyle={type.buttonLabel}
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
    backgroundColor: colors.background,
  },
  headerWrap: {
    width: '100%',
    overflow: 'hidden',
    boxShadow: shadows.header,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backTouch: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  backIcon: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 28,
    marginTop: -3,
  },
  headerTitle: {
    color: 'white',
    ...type.screenTitle,
    flex: 1,
  },
  statusContainer: {
    padding: spacing.md,
    backgroundColor: palette.green50,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.green100,
  },
  statusText: {
    ...type.body,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summaryContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  summaryText: {
    ...type.numericMd,
    fontSize: sizes.xxxl,
    color: colors.text,
  },
  summaryWarning: {
    ...type.body,
    color: palette.danger,
    marginTop: spacing.xs,
  },
  summarySubtext: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    boxShadow: shadows.card,
  },
  failedCard: {
    borderLeftWidth: 4,
    borderLeftColor: palette.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyerName: {
    ...type.cardTitle,
    flex: 1,
    marginRight: spacing.sm,
    color: colors.text,
  },
  date: {
    ...type.caption,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  rowValue: {
    ...type.numericSm,
    color: colors.text,
  },
  errorBox: {
    backgroundColor: palette.dangerBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    color: palette.danger,
    ...type.caption,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  emptyState: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    boxShadow: shadows.raised,
  },
  syncButton: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
  }
});
