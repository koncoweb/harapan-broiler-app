import React, { useState, useEffect, createElement } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Appbar, TextInput, Button, Text, Card, DataTable, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, WeighingItem, WeighingSession, FarmSettings } from '../types';
import { db, auth } from '../config/firebaseConfig';
import { collection, addDoc, setDoc, doc, getDoc } from 'firebase/firestore';
import { printReceiptAuto } from '../services/printerService';
import DateTimePicker from '@react-native-community/datetimepicker';
import NetInfo from '@react-native-community/netinfo';
import { OfflineStorageService } from '../services/offlineStorage';

type CreateNotaScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateNota'>;
  route: RouteProp<RootStackParamList, 'CreateNota'>;
};

export default function CreateNotaScreen({ navigation, route }: CreateNotaScreenProps) {
  // Check if editing
  const editingSession = route.params?.session;
  const isEditing = !!editingSession;

  // A. Data Umum
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Initialize time with current HH:MM
  const now = new Date();
  const defaultTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const [time, setTime] = useState(defaultTime);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [buyer, setBuyer] = useState('');
  const [driver, setDriver] = useState('');
  const [settings, setSettings] = useState<FarmSettings | null>(null);

  // Fetch Settings & Populate Data if Editing
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as FarmSettings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();

    // Populate Data if Editing
    if (editingSession) {
      setDate(editingSession.date);
      setTime(editingSession.time || defaultTime);
      setBuyer(editingSession.buyer);
      setDriver(editingSession.driver);
      setBasePrice(formatIndonesianNumber(editingSession.basePrice));
      setCnAmount(formatIndonesianNumber(editingSession.cnAmount));
      setItems(editingSession.items || []);
      setAmountPaid(editingSession.amountPaid ? formatIndonesianNumber(editingSession.amountPaid) : '');
    }
  }, [editingSession]);

  // B. Setingan Harga
  const [basePrice, setBasePrice] = useState('');
  const [cnAmount, setCnAmount] = useState('');
  const [finalPrice, setFinalPrice] = useState(0);

  // D. Pembayaran
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'Lunas' | 'Belum Lunas' | 'Sebagian'>('Belum Lunas');


  // Helper functions for Indonesian number format
  const parseIndonesianNumber = (value: string) => {
    return parseFloat(value.replace(',', '.')) || 0;
  };

  const formatIndonesianNumber = (value: number) => {
    if (value === 0) return '';
    return value.toString().replace('.', ',');
  };

  // C. Tabel Penimbangan
  const [items, setItems] = useState<WeighingItem[]>([
    { id: '1', index: 1, grossWeight: 0 },
    { id: '2', index: 2, grossWeight: 0 },
    { id: '3', index: 3, grossWeight: 0 },
  ]); // Default 3 rows

  // State untuk menyimpan input text sementara (untuk menampilkan koma saat mengetik)
  const [inputValues, setInputValues] = useState<{[key: string]: string}>({});

  const [loading, setLoading] = useState(false);

  // Effect untuk menghitung Harga Bersih
  useEffect(() => {
    const hrg = parseIndonesianNumber(basePrice);
    const cn = parseIndonesianNumber(cnAmount);
    setFinalPrice(Math.max(0, hrg - cn));
  }, [basePrice, cnAmount]);

  // Effect untuk Status Pembayaran
  useEffect(() => {
    const paid = parseIndonesianNumber(amountPaid);
    // Note: totalAmount is calculated in render, but we need it here.
    // Re-calculate local totalAmount or rely on render cycle?
    // Safer to recalculate here or use the calculated value if it was state.
    // Since totalAmount is derived in render, we can't easily put it in dependency array without infinite loop if we set state based on it.
    // BUT, we can calculate it here.
    const hrg = parseIndonesianNumber(basePrice);
    const cn = parseIndonesianNumber(cnAmount);
    const final = Math.max(0, hrg - cn);
    const weight = items.reduce((acc, curr) => acc + curr.grossWeight, 0);
    const total = final * weight;

    if (paid >= total && total > 0) {
      setPaymentStatus('Lunas');
    } else if (paid > 0) {
      setPaymentStatus('Sebagian');
    } else {
      setPaymentStatus('Belum Lunas');
    }
  }, [amountPaid, basePrice, cnAmount, items]);

  // Helper untuk update item dengan dukungan input text sementara
  const updateItem = (id: string, field: 'grossWeight', value: string) => {
    // Simpan input text sementara untuk display
    setInputValues(prev => ({
      ...prev,
      [id]: value
    }));

    // Convert Indonesian comma format to dot format for storage
    const normalizedValue = value.replace(',', '.');
    const numericValue = parseFloat(normalizedValue) || 0;
    
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: numericValue };
      }
      return item;
    });
    setItems(newItems);
  };

  // Helper untuk mendapatkan nilai display (prioritas input text, fallback ke formatted number)
  const getDisplayValue = (itemId: string, weight: number) => {
    // Jika ada input text sementara, gunakan itu
    if (inputValues[itemId] !== undefined && inputValues[itemId] !== '') {
      return inputValues[itemId];
    }
    // Jika tidak ada input atau kosong, format dari number
    return formatWeightForDisplay(weight);
  };

  // Helper untuk clear input text saat focus hilang
  const handleInputBlur = (itemId: string, weight: number) => {
    // Clear input text sementara, biarkan display menggunakan formatted number
    setInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[itemId];
      return newValues;
    });
  };

  const addNewRow = () => {
    const newId = (items.length + 1).toString();
    setItems([...items, { id: newId, index: items.length + 1, grossWeight: 0 }]);
  };

  // Helper to format number for display (with Indonesian comma, no trailing zeros)
  const formatWeightForDisplay = (weight: number) => {
    if (!weight && weight !== 0) return '';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(weight);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  };

  // Web Date Picker Component
  const WebDatePicker = () => {
    if (Platform.OS !== 'web') return null;
    
    return (
      <View style={styles.webDateContainer}>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Tanggal Timbang</Text>
        {createElement('input', {
          type: 'date',
          value: date,
          onChange: (e: any) => setDate(e.target.value),
          style: {
            padding: 10,
            borderRadius: 4,
            border: '1px solid #ccc',
            fontSize: 14,
            width: '100%',
            fontFamily: 'System',
            color: 'black',
            backgroundColor: 'white',
          }
        })}
      </View>
    );
  };

  // Web Time Picker Component
  const WebTimePicker = () => {
    if (Platform.OS !== 'web') return null;

    return (
      <View style={styles.webDateContainer}>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Jam</Text>
        {createElement('input', {
          type: 'time',
          value: time,
          onChange: (e: any) => setTime(e.target.value),
          style: {
            padding: 10,
            borderRadius: 4,
            border: '1px solid #ccc',
            fontSize: 14,
            width: '100%',
            fontFamily: 'System',
            color: 'black',
            backgroundColor: 'white',
          }
        })}
      </View>
    );
  };

  // Format weight without trailing zeros
  const formatWeight = (weight: number) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(weight);
  };

  // Kalkulasi Total
  const totalNetWeight = items.reduce((acc, curr) => acc + curr.grossWeight, 0);
  
  const totalAmount = finalPrice * totalNetWeight;

  const handleSaveAndPrint = async () => {
    if (!buyer || !basePrice) {
      Alert.alert('Error', 'Mohon lengkapi data pembeli dan harga');
      return;
    }

    if (!time) {
      Alert.alert('Error', 'Waktu harus diisi');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'Sesi login berakhir');
      return;
    }

    setLoading(true);
    try {
      const validItems = items.filter(i => i.grossWeight > 0);
      
      const sessionData: Omit<WeighingSession, 'id'> = {
        date,
        time,
        buyer,
        driver,
        basePrice: parseIndonesianNumber(basePrice),
        cnAmount: parseIndonesianNumber(cnAmount) || 0,
        finalPrice,
        items: validItems,
        totalNetWeight,
        totalAmount,
        totalColi: validItems.length,
        amountPaid: parseIndonesianNumber(amountPaid),
        paymentStatus,
        notes: "",
        createdBy: isEditing ? (editingSession?.createdBy || auth.currentUser.email || auth.currentUser.uid) : (auth.currentUser.email || auth.currentUser.uid),
        createdAt: isEditing ? (editingSession?.createdAt || Date.now()) : Date.now()
      };

      let savedSession: WeighingSession;

      const netState = await NetInfo.fetch();
      const isOffline = !netState.isConnected;

      if (isOffline) {
        // OFFLINE MODE
        if (isEditing && editingSession) {
          savedSession = { id: editingSession.id, ...sessionData };
        } else {
          // Generate temporary offline ID
          const offlineId = `offline_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          savedSession = { id: offlineId, ...sessionData };
        }

        await OfflineStorageService.saveSession(savedSession);
        
        // Print Struk (Bluetooth works offline)
        await printReceiptAuto(savedSession, settings || undefined);

        Alert.alert('Tersimpan Offline', 'Data tersimpan di perangkat. Mohon sinkronisasi saat online.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // ONLINE MODE (Existing Logic)
        if (isEditing && editingSession) {
          // Update existing document
          await setDoc(doc(db, 'weighing_sessions', editingSession.id), sessionData);
          savedSession = { id: editingSession.id, ...sessionData };
        } else {
          // Create new document
          const docRef = await addDoc(collection(db, 'weighing_sessions'), sessionData);
          savedSession = { id: docRef.id, ...sessionData };
        }

        // Print Struk
        await printReceiptAuto(savedSession, settings || undefined);

        Alert.alert('Sukses', `Nota berhasil ${isEditing ? 'diperbarui' : 'disimpan'} dan dicetak`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', `Gagal ${isEditing ? 'memperbarui' : 'menyimpan'} nota`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="white" />
        <Appbar.Content title={isEditing ? "EDIT NOTA" : "FORM NOTA BARU"} titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* A. DATA UMUM - Compact */}
        <Card style={styles.card}>
          <Card.Content style={styles.cardContentCompact}>
            <View style={styles.row}>
              {/* Date Picker Section */}
              <View style={[styles.col, { flex: 0.35, marginRight: 8 }]}>
                {Platform.OS === 'web' ? (
                  <WebDatePicker />
                ) : (
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateTouchable}>
                    <TextInput
                      label="Tanggal"
                      value={date}
                      editable={false}
                      mode="outlined"
                      dense
                      style={styles.input}
                      textColor="black"
                      right={<TextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
                      theme={{ colors: { background: 'white' } }}
                    />
                    <View style={StyleSheet.absoluteFill} /> 
                  </TouchableOpacity>
                )}
              </View>

              {/* Time Picker Section */}
              <View style={[styles.col, { flex: 0.25, marginRight: 8 }]}>
                {Platform.OS === 'web' ? (
                  <WebTimePicker />
                ) : (
                  <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.dateTouchable}>
                    <TextInput
                      label="Jam"
                      value={time}
                      editable={false}
                      mode="outlined"
                      dense
                      style={styles.input}
                      textColor="black"
                      right={<TextInput.Icon icon="clock" onPress={() => setShowTimePicker(true)} />}
                      theme={{ colors: { background: 'white' } }}
                    />
                    <View style={StyleSheet.absoluteFill} /> 
                  </TouchableOpacity>
                )}
              </View>

              {/* Buyer Input */}
              <View style={[styles.col, { flex: 0.4 }]}>
                <TextInput
                  label="Nama Pembeli"
                  value={buyer}
                  onChangeText={setBuyer}
                  mode="outlined"
                  dense
                  style={styles.input}
                  textColor="black"
                  theme={{ colors: { background: 'white' } }}
                />
              </View>
            </View>

            {/* Driver Input - Full Width */}
            <View style={{ marginTop: 8 }}>
              <TextInput
                label="Supir / Plat No"
                value={driver}
                onChangeText={setDriver}
                mode="outlined"
                dense
                style={styles.input}
                textColor="black"
                theme={{ colors: { background: 'white' } }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* B. KONFIGURASI HARGA - Compact */}
        <Card style={[styles.card, styles.priceCard]}>
          <Card.Content style={styles.cardContentCompact}>
            <Text style={styles.sectionTitle}>$ HARGA</Text>
            <View style={styles.row}>
              <View style={[styles.col, { marginRight: 8 }]}>
                <TextInput
                  label="Harga Dasar"
                  value={basePrice}
                  onChangeText={setBasePrice}
                  keyboardType="numeric"
                  mode="outlined"
                  dense
                  style={styles.input}
                  textColor="black"
                  theme={{ colors: { background: 'white' } }}
                  placeholder="0,00"
                />
              </View>
              <View style={styles.col}>
                <TextInput
                  label="Potongan CN"
                  value={cnAmount}
                  onChangeText={setCnAmount}
                  keyboardType="numeric"
                  mode="outlined"
                  dense
                  style={styles.input}
                  textColor="black"
                  theme={{ colors: { background: 'white' } }}
                  placeholder="0,00"
                />
              </View>
            </View>

            <View style={styles.finalPriceBoxCompact}>
              <Text style={styles.finalPriceLabel}>HARGA BERSIH</Text>
              <Text style={styles.finalPriceValue}>
                Rp {new Intl.NumberFormat('id-ID').format(finalPrice)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* C. DAFTAR PENIMBANGAN - Grid Layout */}
        <Card style={styles.card}>
          <View style={styles.tableHeaderCompact}>
            <Text style={styles.tableTitle}>TIMBANGAN ({items.length})</Text>
            <Button mode="text" compact onPress={addNewRow} labelStyle={{color: '#4CAF50'}}>+ Baris</Button>
          </View>
          
          <View style={styles.gridContainer}>
            {items.map((item, index) => (
              <View key={item.id} style={styles.gridItem}>
                <TextInput
                  label={`${item.index}. Berat (Kg)`}
                  value={getDisplayValue(item.id, item.grossWeight)}
                  onChangeText={(val) => updateItem(item.id, 'grossWeight', val)}
                  onBlur={() => handleInputBlur(item.id, item.grossWeight)}
                  keyboardType="numeric"
                  mode="outlined"
                  dense
                  style={styles.gridInput}
                  textColor="black"
                  theme={{ colors: { background: 'white' } }}
                  placeholder="0,00"
                />
              </View>
            ))}
          </View>
        </Card>

        {/* SUMMARY & ACTION - Compact */}
        <Card style={[styles.card, styles.summaryCard]}>
          <Card.Content style={styles.cardContentCompact}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>TOTAL BERAT</Text>
                <Text style={styles.summaryValueBig}>{formatWeight(totalNetWeight)} Kg</Text>
                <Text style={styles.summarySub}>{items.filter(i => i.grossWeight > 0).length} Timbangan</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.summaryLabel}>TOTAL BAYAR</Text>
                <Text style={styles.summaryValueGreen}>
                  Rp {new Intl.NumberFormat('id-ID').format(totalAmount)}
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={[styles.row, { alignItems: 'center' }]}>
              <View style={[styles.col, { flex: 0.6 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    label="Jumlah Bayar (Rp)"
                    value={amountPaid}
                    onChangeText={setAmountPaid}
                    keyboardType="numeric"
                    mode="outlined"
                    dense
                    style={[styles.input, { flex: 1 }]}
                    textColor="black"
                    theme={{ colors: { background: 'white' } }}
                    placeholder="0,00"
                  />
                  <TouchableOpacity 
                    onPress={() => setAmountPaid(formatIndonesianNumber(totalAmount))}
                    style={{ 
                      marginLeft: 8, 
                      backgroundColor: '#E8F5E9', 
                      padding: 10, 
                      borderRadius: 4,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#4CAF50'
                    }}
                  >
                    <Text style={{ color: '#2E7D32', fontWeight: 'bold', fontSize: 12 }}>LUNAS</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.col, { flex: 0.4, alignItems: 'flex-end' }]}>
                <Text style={{
                  fontWeight: 'bold', 
                  fontSize: 14,
                  color: paymentStatus === 'Lunas' ? '#4CAF50' : paymentStatus === 'Sebagian' ? '#FFC107' : '#F44336'
                }}>
                  {paymentStatus.toUpperCase()}
                </Text>
                {paymentStatus !== 'Lunas' && (
                  <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                    Sisa: {new Intl.NumberFormat('id-ID').format(Math.max(0, totalAmount - parseIndonesianNumber(amountPaid)))}
                  </Text>
                )}
                {paymentStatus === 'Lunas' && parseIndonesianNumber(amountPaid) > totalAmount && (
                  <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                    Kembali: {new Intl.NumberFormat('id-ID').format(parseIndonesianNumber(amountPaid) - totalAmount)}
                  </Text>
                )}
              </View>
            </View>

            <Button 
              mode="contained" 
              onPress={handleSaveAndPrint}
              loading={loading}
              icon="printer"
              style={styles.saveButton}
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              {isEditing ? 'UPDATE & CETAK' : 'SIMPAN'}
            </Button>
          </Card.Content>
        </Card>

        <View style={{height: 50}} />
      </ScrollView>

      {/* Native Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Native Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date()} // Can't easily parse HH:MM back to Date without date part, but for time picker default to now is fine or construct it
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    backgroundColor: '#2E7D32', // Dark Green
    elevation: 4,
    height: 50,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 18,
  },
  content: {
    padding: 10, // Reduced padding
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8, // Slightly less rounded
    marginBottom: 10, // Reduced margin
    elevation: 2,
  },
  cardContentCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    backgroundColor: 'white',
    fontSize: 14,
    height: 40, // Compact height
  },
  webDateContainer: {
    height: 46, // Match input height roughly including label
    justifyContent: 'flex-end',
  },
  dateTouchable: {
    flex: 1,
  },
  priceCard: {
    backgroundColor: '#E8F5E9',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  col: {
    flex: 1,
  },
  finalPriceBoxCompact: {
    backgroundColor: '#43A047',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  finalPriceLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  finalPriceValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tableHeaderCompact: {
    backgroundColor: '#1B263B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tableContainer: {
    padding: 8,
  },
  gridContainer: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%', // Two columns with small gap
    marginBottom: 12,
  },
  gridInput: {
    backgroundColor: 'white',
    fontSize: 14,
    height: 45,
  },
  tableRowHeader: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingHorizontal: 2,
  },
  tableRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  th: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  td: {
    fontSize: 12,
    color: '#333',
  },
  inputTable: {
    backgroundColor: 'white',
    height: 35, // Very compact
    fontSize: 14,
    marginHorizontal: 2,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  summaryValueBig: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryValueGreen: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  summarySub: {
    fontSize: 12,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
});
