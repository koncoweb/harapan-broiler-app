import React, { useEffect, useState, createElement } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Appbar, Text, ActivityIndicator, TextInput, Button, IconButton, Card, Divider, useTheme, Portal, Modal } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserData, WeighingSession, FarmSettings } from '../types';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { printReceipt, printReceiptAuto } from '../services/printerService';
import { exportToExcel } from '../services/excelService';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessions, setSessions] = useState<WeighingSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<WeighingSession[]>([]);
  const [settings, setSettings] = useState<FarmSettings | null>(null);
  const [exporting, setExporting] = useState(false);

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
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Expanded State
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      if (!auth.currentUser) {
        navigation.replace('Login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData;
          if (userData.role === 'admin') {
            setIsAdmin(true);
            
            // Fetch Settings
            const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
            if (settingsDoc.exists()) {
              setSettings(settingsDoc.data() as FarmSettings);
            }

            // Subscribe to Data
            const q = query(collection(db, 'weighing_sessions'), orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
              const data: WeighingSession[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              } as WeighingSession));
              setSessions(data);
              setFilteredSessions(data);
              setLoading(false);
            });

            return unsubscribe;
          } else {
            Alert.alert('Akses Ditolak', 'Anda bukan admin!');
            navigation.goBack();
          }
        } else {
          Alert.alert('Error', 'Data user tidak ditemukan');
          navigation.goBack();
        }
      } catch (error) {
        console.error("Error checking admin:", error);
        Alert.alert('Error', 'Gagal memverifikasi hak akses');
        navigation.goBack();
        setLoading(false);
      }
    };

    checkAdminAndFetchData();
  }, []);

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
  }, [sessions, filterStartDate, filterEndDate, filterBuyer, filterDriver]);

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
      
      await setDoc(doc(db, 'settings', 'general'), newSettings);
      setSettings(newSettings);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  // Format weight without trailing zeros
  const formatWeight = (weight: number) => {
    return parseFloat(weight.toFixed(2)).toString().replace('.', ',');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAdmin) return null;

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="white" />
        <Appbar.Content title="REKAP NOTA" titleStyle={styles.headerTitle} />
        <Appbar.Action icon="cog" onPress={openSettingsModal} color="white" />
      </Appbar.Header>

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
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Button mode="text" onPress={() => {
            setFilterStartDate('');
            setFilterEndDate('');
            setFilterBuyer('');
            setFilterDriver('');
          }} compact textColor={theme.colors.primary}>Reset Filter</Button>

          <Button 
            mode="contained" 
            onPress={handleExport} 
            loading={exporting}
            disabled={exporting || filteredSessions.length === 0}
            icon="file-excel"
            buttonColor="#2E7D32"
            compact
          >
            Ekspor Excel
          </Button>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 0.9 }]}>Tanggal</Text>
        <Text style={[styles.headerCell, { flex: 0.5, textAlign: 'center' }]}>Jam</Text>
        <Text style={[styles.headerCell, { flex: 1.4 }]}>Pembeli</Text>
        <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'right' }]}>Total (Rp)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredSessions.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <Card key={item.id} style={styles.card} onPress={() => toggleExpand(item.id)}>
              <View style={styles.cardRow}>
                <Text style={[styles.cell, { flex: 0.9 }]}>{item.date}</Text>
                <Text style={[styles.cell, { flex: 0.5, textAlign: 'center', color: '#666' }]}>{item.time || '-'}</Text>
                <Text style={[styles.cell, { flex: 1.4, fontWeight: 'bold' }]}>{item.buyer}</Text>
                <Text style={[styles.cell, { flex: 1.2, textAlign: 'right', fontWeight: 'bold', color: 'green' }]}>
                  {formatCurrency(item.totalAmount || 0)}
                </Text>
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
                      color: (item.paymentStatus || 'Belum Lunas') === 'Lunas' ? '#4CAF50' : 
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
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#C62828', // Darker Red
    elevation: 4,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 8,
  },
  filterTitle: {
    fontWeight: '700',
    marginBottom: 12,
    fontSize: 16,
    color: '#424242',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'white',
    fontSize: 14,
    height: 40,
  },
  webDateContainer: {
    flex: 1,
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    backgroundColor: 'white',
  },
  inputLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EEEEEE',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '700',
    color: '#424242',
  },
  listContainer: {
    padding: 8,
    paddingBottom: 24,
  },
  card: {
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  cell: {
    fontSize: 14,
    color: '#212121',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  divider: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  printButton: {
    marginTop: 12,
  },
  modalContent: {
    padding: 20,
    margin: 20,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: 'white',
  }
});
