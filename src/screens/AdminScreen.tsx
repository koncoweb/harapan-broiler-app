import React, { useEffect, useState, createElement } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Appbar, Text, ActivityIndicator, TextInput, Button, IconButton, Card, Divider, useTheme, Portal, Modal, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList, WeighingSession, FarmSettings } from '../types';
import { deleteSession, deleteMany } from '../services/weighingService';
import { getCurrentUser } from '../services/authService';
import { printReceipt, printReceiptAuto } from '../services/printerService';
import { exportToExcel } from '../services/excelService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUserRole } from '../hooks/useUserRole';
import { useFarmSettings } from '../hooks/useFarmSettings';
import { useWeighingSessions } from '../hooks/useWeighingSessions';
import { formatCurrency, formatWeight } from '../utils/format';
import { colors, palette, radius, spacing, shadows, tabularNums, paymentStatusColors, type, weights } from '../theme';
import { haptic } from '../theme/haptics';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type AdminScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Admin'>;
};

export default function AdminScreen({ navigation }: AdminScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [filteredSessions, setFilteredSessions] = useState<WeighingSession[]>([]);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { isAdmin, loading: roleLoading } = useUserRole();
  const { settings, setSettings, save: saveSettings } = useFarmSettings();
  // Rekap/Export/Delete operate over the full dataset, so load a large window.
  const { sessions, loading: sessionsLoading, refresh } = useWeighingSessions({ pageSize: 10000 });

  // Settings Modal State
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editFarmName, setEditFarmName] = useState('');
  const [editFarmAddress, setEditFarmAddress] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterBuyer, setFilterBuyer] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>(''); // '' means all
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Expanded State
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) navigation.replace('Login');
    });

    if (!roleLoading && !isAdmin) {
      Alert.alert('Akses Ditolak', 'Anda bukan admin!');
      navigation.goBack();
    }
  }, [isAdmin, roleLoading, navigation]);

  useEffect(() => {
    setFilteredSessions(sessions);
  }, [sessions]);

    // Filter Logic
  useEffect(() => {
    let result = [...sessions]; // Create a copy

    if (filterStartDate) {
      result = result.filter(s => s.date >= filterStartDate);
    }
    if (filterEndDate) {
      result = result.filter(s => s.date <= filterEndDate);
    }
    if (filterBuyer) {
      result = result.filter(s => s.buyer.toLowerCase().includes(filterBuyer.toLowerCase()));
    }
    if (filterDriver) {
      result = result.filter(s => s.driver.toLowerCase().includes(filterDriver.toLowerCase()));
    }
    if (filterPaymentStatus) {
      result = result.filter(s => {
        const status = s.paymentStatus || 'Belum Lunas';
        return status === filterPaymentStatus;
      });
    }

    // Sort by Date and Time Descending
    result.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      const dateTimeA = `${a.date}T${timeA}`;
      const dateTimeB = `${b.date}T${timeB}`;
      
      if (dateTimeA < dateTimeB) return 1;
      if (dateTimeA > dateTimeB) return -1;
      return 0;
    });

    setFilteredSessions(result);
  }, [sessions, filterStartDate, filterEndDate, filterBuyer, filterDriver, filterPaymentStatus]);

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFilterStartDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setFilterEndDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const openSettingsModal = () => {
    if (settings) {
      setEditFarmName(settings.farmName);
      setEditFarmAddress(settings.farmAddress);
    }
    setSettingsModalVisible(true);
  };

  const handleSaveSettings = async () => {
    if (!editFarmName || !editFarmAddress) {
      Alert.alert('Error', 'Nama dan Alamat harus diisi');
      return;
    }

    setSavingSettings(true);
    try {
      const newSettings: FarmSettings = {
        farmName: editFarmName,
        farmAddress: editFarmAddress
      };
      
      await saveSettings(newSettings);
      setSettingsModalVisible(false);
      Alert.alert('Sukses', 'Pengaturan berhasil disimpan');
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert('Error', 'Gagal menyimpan pengaturan');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleEditSession = (session: WeighingSession) => {
    navigation.navigate('CreateNota', { session });
  };

  const handleDeleteSession = (session: WeighingSession) => {
    Alert.alert(
      'Konfirmasi Hapus',
      `Hapus data ${session.buyer} (${session.date})?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(session.id);
              refresh();
            } catch (error) {
              console.error("Error deleting session:", error);
              Alert.alert('Error', 'Gagal menghapus data');
            }
          }
        }
      ]
    );
  };

  const handleDeleteFiltered = async () => {
    if (filteredSessions.length === 0) {
      Alert.alert('Info', 'Tidak ada data untuk dihapus');
      return;
    }

    Alert.alert(
      'Konfirmasi Hapus',
      `Apakah Anda yakin ingin menghapus ${filteredSessions.length} data yang terfilter? Tindakan ini tidak dapat dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteMany(filteredSessions.map((s) => s.id));
              refresh();
              Alert.alert('Sukses', `${filteredSessions.length} data berhasil dihapus`);
            } catch (error) {
              console.error("Error deleting sessions:", error);
              Alert.alert('Error', 'Gagal menghapus data');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleExport = async () => {
    if (filteredSessions.length === 0) {
      Alert.alert('Info', 'Tidak ada data untuk diekspor');
      return;
    }
  
    setExporting(true);
    try {
      await exportToExcel(filteredSessions);
      if (Platform.OS === 'web') {
          // Alert.alert('Sukses', 'File Excel sedang diunduh');
          // Browser handles download UI
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  };

  // Web Date Picker Helper
  const WebDatePicker = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
    if (Platform.OS !== 'web') return null;
    return (
      <View style={styles.webDateContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        {createElement('input', {
          type: 'date',
          value: value,
          onChange: (e: any) => onChange(e.target.value),
          style: {
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid #ccc',
            width: '100%',
            fontFamily: 'System',
            color: '#333',
            backgroundColor: 'white',
            fontSize: '14px',
            boxSizing: 'border-box'
          }
        })}
      </View>
    );
  };

  if (roleLoading || sessionsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAdmin) return null;

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
          <Text style={styles.headerTitle}>REKAP NOTA</Text>
          <IconButton icon="cog" size={22} iconColor="#fff" onPress={() => { haptic.tap(); openSettingsModal(); }} />
        </View>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Filter Data</Text>
        
        {/* Date Filters */}
        <View style={styles.row}>
          {Platform.OS === 'web' ? (
            <>
              <WebDatePicker value={filterStartDate} onChange={setFilterStartDate} label="Dari Tanggal" />
              <WebDatePicker value={filterEndDate} onChange={setFilterEndDate} label="Sampai Tanggal" />
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateInput}>
                <Text style={styles.inputLabel}>Dari Tanggal</Text>
                <Text style={styles.dateValue}>{filterStartDate || 'Semua'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateInput}>
                <Text style={styles.inputLabel}>Sampai Tanggal</Text>
                <Text style={styles.dateValue}>{filterEndDate || 'Semua'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Text Filters */}
        <View style={styles.row}>
          <TextInput
            label="Cari Pembeli"
            value={filterBuyer}
            onChangeText={setFilterBuyer}
            mode="outlined"
            dense
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            theme={{ colors: { background: 'white' } }}
          />
          <TextInput
            label="Cari Sopir"
            value={filterDriver}
            onChangeText={setFilterDriver}
            mode="outlined"
            dense
            style={[styles.input, { flex: 1 }]}
            theme={{ colors: { background: 'white' } }}
          />
        </View>

        {/* Payment Status Filter */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ ...type.bodyStrong, color: '#666', marginBottom: 8 }}>Status Pembayaran:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip 
              selected={filterPaymentStatus === ''} 
              onPress={() => setFilterPaymentStatus('')}
              showSelectedOverlay
            >
              Semua
            </Chip>
            <Chip 
              selected={filterPaymentStatus === 'Lunas'} 
              onPress={() => setFilterPaymentStatus('Lunas')}
              showSelectedOverlay
              textStyle={{ color: palette.green700 }}
            >
              Lunas
            </Chip>
            <Chip 
              selected={filterPaymentStatus === 'Sebagian'} 
              onPress={() => setFilterPaymentStatus('Sebagian')}
              showSelectedOverlay
              textStyle={{ color: '#F57C00' }}
            >
              Sebagian
            </Chip>
            <Chip 
              selected={filterPaymentStatus === 'Belum Lunas'} 
              onPress={() => setFilterPaymentStatus('Belum Lunas')}
              showSelectedOverlay
              textStyle={{ color: '#C62828' }}
            >
              Belum Lunas
            </Chip>
          </ScrollView>
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Button mode="text" onPress={() => {
            setFilterStartDate('');
            setFilterEndDate('');
            setFilterBuyer('');
            setFilterDriver('');
            setFilterPaymentStatus('');
          }} compact textColor={theme.colors.primary}>Reset Filter</Button>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button 
              mode="contained" 
              onPress={handleDeleteFiltered} 
              loading={deleting}
              disabled={deleting || filteredSessions.length === 0}
              icon="delete"
              buttonColor="#D32F2F"
              compact
            >
              Hapus ({filteredSessions.length})
            </Button>

            <Button 
              mode="contained" 
              onPress={handleExport} 
              loading={exporting}
              disabled={exporting || filteredSessions.length === 0}
              icon="file-excel"
              buttonColor={palette.green700}
              compact
            >
              Ekspor Excel
            </Button>
          </View>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 0.8 }]}>Tanggal</Text>
        <Text style={[styles.headerCell, { flex: 1.5 }]}>Pembeli / Status</Text>
        <Text style={[styles.headerCell, { flex: 1.5, textAlign: 'right' }]}>Tagihan</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredSessions.map((item) => {
          const isExpanded = expandedId === item.id;
          const status = item.paymentStatus || 'Belum Lunas';
          const isLunas = status === 'Lunas';
          const isSebagian = status === 'Sebagian';
          
          const statusColors: { bg: string; text: string } = isLunas
            ? { bg: palette.successBg, text: palette.success }
            : isSebagian
            ? { bg: palette.warningBg, text: palette.warning }
            : { bg: palette.dangerBg, text: palette.danger };

          return (
            <Card key={item.id} style={styles.card} onPress={() => toggleExpand(item.id)}>
              <View style={styles.cardRow}>
                {/* Date & Time Column */}
                <View style={[styles.cell, { flex: 0.8 }]}>
                  <Text style={{ ...type.subtitle, fontWeight: weights.medium, ...tabularNums }}>{item.date}</Text>
                  <Text style={{ ...type.caption, color: '#666', ...tabularNums }}>{item.time || '-'}</Text>
                </View>

                {/* Buyer & Status Column */}
                <View style={[styles.cell, { flex: 1.5 }]}>
                  <Text style={{ ...type.cardTitleSm, marginBottom: 4 }}>{item.buyer}</Text>
                  <View style={{ 
                    alignSelf: 'flex-start',
                    backgroundColor: statusColors.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 12,
                  }}>
                    <Text style={{ ...type.micro, fontWeight: weights.bold, color: statusColors.text }}>
                      {status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Price Column */}
                <View style={[styles.cell, { flex: 1.5, alignItems: 'flex-end' }]}>
                  {/* Total Tagihan */}
                  <Text style={{ 
                    ...type.numericSm,
                    color: isLunas ? palette.green700 : '#333' 
                  }}>
                    {formatCurrency(item.totalAmount || 0)}
                  </Text>

                  {/* Partial Payment Details */}
                  {isSebagian && (
                    <>
                      <Text style={{ ...type.micro, color: '#666', marginTop: 1, ...tabularNums }}>
                        Bayar: {formatCurrency(item.amountPaid || 0)}
                      </Text>
                      <Text style={{ ...type.caption, fontWeight: weights.bold, color: '#D32F2F', marginTop: 1, ...tabularNums }}>
                        Sisa: {formatCurrency((item.totalAmount || 0) - (item.amountPaid || 0))}
                      </Text>
                    </>
                  )}
                  
                  {/* Belum Lunas Info (Optional, just explicit red text) */}
                  {!isLunas && !isSebagian && (
                     <Text style={{ ...type.micro, color: '#D32F2F', marginTop: 1 }}>
                       Belum Dibayar
                     </Text>
                  )}
                </View>

                {/* Delete Action */}
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor="#D32F2F"
                  onPress={() => handleDeleteSession(item)}
                  style={{ margin: 0 }}
                />
              </View>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <Divider style={styles.divider} />
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sopir:</Text>
                    <Text style={styles.detailValue}>{item.driver}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Berat:</Text>
                    <Text style={styles.detailValue}>{formatWeight(item.totalNetWeight || 0)} Kg</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Timbangan:</Text>
                    <Text style={styles.detailValue}>{item.totalColi || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Harga Bersih:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(item.finalPrice || 0)} / Kg</Text>
                  </View>

                  <Divider style={{ marginVertical: 8 }} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, { 
                      fontWeight: 'bold',
                      color: (item.paymentStatus || 'Belum Lunas') === 'Lunas' ? palette.green600 : 
                             (item.paymentStatus === 'Sebagian' ? '#FFA000' : '#D32F2F')
                    }]}>
                      {(item.paymentStatus || 'Belum Lunas').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dibayar:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(item.amountPaid || 0)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sisa Tagihan:</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(Math.max(0, (item.totalAmount || 0) - (item.amountPaid || 0)))}
                    </Text>
                  </View>
                  <Divider style={{ marginVertical: 8 }} />

                  <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
                    <Button 
                      mode="outlined" 
                      icon="pencil" 
                      onPress={() => handleEditSession(item)}
                      style={[styles.printButton, {flex: 1, borderColor: theme.colors.primary}]}
                      textColor={theme.colors.primary}
                    >
                      Edit
                    </Button>

                    <Button 
                      mode="contained" 
                      icon="printer" 
                      onPress={() => printReceiptAuto(item, settings || undefined)}
                      style={[styles.printButton, {flex: 1}]}
                      buttonColor={theme.colors.primary}
                    >
                      Cetak
                    </Button>
                  </View>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>

      {/* Mobile Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={filterStartDate ? new Date(filterStartDate) : new Date()}
          mode="date"
          onChange={handleStartDateChange}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={filterEndDate ? new Date(filterEndDate) : new Date()}
          mode="date"
          onChange={handleEndDateChange}
        />
      )}

      <Portal>
        <Modal visible={settingsModalVisible} onDismiss={() => setSettingsModalVisible(false)} contentContainerStyle={styles.modalContent}>
          <Card>
            <Card.Title title="Pengaturan Kandang" />
            <Card.Content>
              <TextInput
                label="Nama Kandang"
                value={editFarmName}
                onChangeText={setEditFarmName}
                mode="outlined"
                style={styles.modalInput}
              />
              <TextInput
                label="Alamat Kandang"
                value={editFarmAddress}
                onChangeText={setEditFarmAddress}
                mode="outlined"
                style={styles.modalInput}
                multiline
              />
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => setSettingsModalVisible(false)}>Batal</Button>
              <Button mode="contained" onPress={handleSaveSettings} loading={savingSettings}>Simpan</Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  filterContainer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    marginBottom: spacing.md,
    boxShadow: shadows.card,
  },
  filterTitle: {
    ...type.sectionTitle,
    marginBottom: spacing.md,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    backgroundColor: 'white',
    fontSize: 14,
    height: 44,
  },
  webDateContainer: {
    flex: 1,
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: spacing.md,
    backgroundColor: palette.green50,
    marginRight: spacing.sm,
  },
  inputLabel: {
    ...type.label,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateValue: {
    ...type.bodyStrong,
    color: colors.text,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.green50,
  },
  headerCell: {
    ...type.label,
    fontWeight: weights.extrabold,
    color: colors.textSecondary,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  card: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    boxShadow: shadows.card,
  },
  cardRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'center',
  },
  cell: {
    // fontSize and color removed to fix ViewStyle type error
  },
  expandedContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: palette.green50,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  divider: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    ...type.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...type.bodyStrong,
    color: colors.text,
    ...tabularNums,
  },
  printButton: {
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    marginTop: spacing.md,
  },
  modalContent: {
    padding: spacing.xl,
    margin: spacing.xl,
  },
  modalInput: {
    marginBottom: spacing.md,
    backgroundColor: 'white',
  }
});
