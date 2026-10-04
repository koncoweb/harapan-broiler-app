import React, { useState, useEffect, createElement } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, Image } from 'react-native';
import { Appbar, TextInput, Button, Text, Card, DataTable, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList, WeighingItem, WeighingSession } from '../types';
import { createSession, updateSession } from '../services/weighingService';
import { getCurrentUser } from '../services/authService';
import { printReceiptAuto } from '../services/printerService';
import DateTimePicker from '@react-native-community/datetimepicker';
import NetInfo from '@react-native-community/netinfo';
import { OfflineStorageService, OfflineSession } from '../services/offlineStorage';
import { useFarmSettings } from '../hooks/useFarmSettings';
import { parseIndonesianNumber, formatNumber, formatWeightForDisplay, timeToDate } from '../utils/format';
import { validateWeighingForm } from '../utils/validation';
import { colors, palette, radius, spacing, shadows, tabularNums, type, weights, sizes } from '../theme';
import { haptic } from '../theme/haptics';

type CreateNotaScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateNota'>;
  route: RouteProp<RootStackParamList, 'CreateNota'>;
};

export default function CreateNotaScreen({ navigation, route }: CreateNotaScreenProps) {
  // Check if editing
  const editingSession = route.params?.session;
  const isEditing = !!editingSession;
  const insets = useSafeAreaInsets();

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
  const { settings } = useFarmSettings();

  // Populate Data if Editing
  useEffect(() => {
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


  const formatIndonesianNumber = (value: number) => {
    if (value === 0) return '';
    return value.toString().replace('.', ',');
  };

  const cleanLeadingZeros = (value: string) => {
    if (!value) return '';
    let cleaned = value;
    cleaned = cleaned.replace(/^0+([1-9])/, '$1');
    cleaned = cleaned.replace(/^0+$/, '0');
    cleaned = cleaned.replace(/^0+(0[,.])/, '$1');
    return cleaned;
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
    const cleanedValue = cleanLeadingZeros(value);
    // Simpan input text sementara untuk display
    setInputValues(prev => ({
      ...prev,
      [id]: cleanedValue
    }));

    // Convert Indonesian comma format to dot format for storage
    const normalizedValue = cleanedValue.replace(',', '.');
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
        <Text style={{ ...type.label, color: '#666', marginBottom: 4 }}>Tanggal Timbang</Text>
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
        <Text style={{ ...type.label, color: '#666', marginBottom: 4 }}>Jam</Text>
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

  // Kalkulasi Total
  const totalNetWeight = items.reduce((acc, curr) => acc + curr.grossWeight, 0);
  
  const totalAmount = finalPrice * totalNetWeight;

  const handleSaveAndPrint = async () => {
    const user = await getCurrentUser();
    if (!user) {
      Alert.alert('Error', 'Sesi login berakhir');
      navigation.replace('Login');
      return;
    }

    if (!time) {
      Alert.alert('Error', 'Waktu harus diisi');
      return;
    }

    const formValidation = validateWeighingForm({
      buyer,
      basePrice: parseIndonesianNumber(basePrice),
      cnAmount: parseIndonesianNumber(cnAmount),
      items,
      date,
    });

    if (!formValidation.valid) {
      Alert.alert('Peringatan', formValidation.error);
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
        createdBy: isEditing ? (editingSession?.createdBy || user.email || user.uid) : (user.email || user.uid),
        createdAt: isEditing ? (editingSession?.createdAt || Date.now()) : Date.now()
      };

      let savedSession: WeighingSession;

      const netState = await NetInfo.fetch();
      const isOffline = !netState.isConnected;

      // Persist to the on-device queue (new = temp id, edit = keep real id).
      const queueForSync = async (editTarget?: WeighingSession): Promise<OfflineSession> => {
        const offlineId = editTarget
          ? editTarget.id
          : `offline_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const offlineSession: OfflineSession = {
          id: offlineId,
          ...sessionData,
          syncStatus: 'pending',
          syncAttempts: 0,
        };
        await OfflineStorageService.saveSession(offlineSession);
        return offlineSession;
      };

      if (isOffline) {
        // OFFLINE MODE — save locally, print via Bluetooth, sync later.
        savedSession = await queueForSync(isEditing ? editingSession : undefined);

        // Print Struk (Bluetooth works offline)
        await printReceiptAuto(savedSession, settings || undefined);

        Alert.alert('Tersimpan Offline', 'Data tersimpan di perangkat. Mohon sinkronisasi saat online.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // ONLINE MODE — write straight to Turso.
        try {
          if (isEditing && editingSession) {
            await updateSession(editingSession.id, sessionData);
            savedSession = { id: editingSession.id, ...sessionData };
          } else {
            const id = await createSession(sessionData);
            savedSession = { id, ...sessionData };
          }

          // Print Struk
          await printReceiptAuto(savedSession, settings || undefined);

          Alert.alert('Sukses', `Nota berhasil ${isEditing ? 'diperbarui' : 'disimpan'} dan dicetak`, [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } catch (writeError: any) {
          // Connected but the server write failed (token/500/offline replica).
          // Fall back to the queue so the operator's input is never lost.
          console.warn('Online write failed, queueing offline:', writeError);
          savedSession = await queueForSync(isEditing ? editingSession : undefined);

          await printReceiptAuto(savedSession, settings || undefined);

          Alert.alert(
            'Ditahan Offline',
            'Tidak dapat menyimpan ke server saat ini. Data disimpan di perangkat — silakan sinkronkan nantinya.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
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
      <StatusBar style="light" />
      <LinearGradient
        colors={[palette.green900, palette.green700, palette.green600]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrap}
      >
        <Image
          source={require('../../assets/header.png')}
          style={styles.headerTexture}
          resizeMode="cover"
          blurRadius={Platform.OS === 'ios' ? 5 : 2}
        />
        <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => { haptic.tap(); navigation.goBack(); }} style={styles.backTouch}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'EDIT NOTA' : 'FORM NOTA BARU'}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
                  onChangeText={(val) => setBasePrice(cleanLeadingZeros(val))}
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
                  onChangeText={(val) => setCnAmount(cleanLeadingZeros(val))}
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
                Rp {formatNumber(finalPrice)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* C. DAFTAR PENIMBANGAN - Grid Layout */}
        <Card style={styles.card}>
          <View style={styles.tableHeaderCompact}>
            <Text style={styles.tableTitle}>TIMBANGAN ({items.length})</Text>
            <Button mode="text" compact onPress={addNewRow} labelStyle={{ color: palette.green700 }}>+ Baris</Button>
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
                <Text style={styles.summaryValueBig}>{formatWeightForDisplay(totalNetWeight)} Kg</Text>
                <Text style={styles.summarySub}>{items.filter(i => i.grossWeight > 0).length} Timbangan</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.summaryLabel}>TOTAL BAYAR</Text>
                <Text style={styles.summaryValueGreen}>
                  Rp {formatNumber(totalAmount)}
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
                    onChangeText={(val) => setAmountPaid(cleanLeadingZeros(val))}
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
                      backgroundColor: palette.green100, 
                      padding: 10, 
                      borderRadius: radius.sm,
                      borderCurve: 'continuous',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: palette.green300
                    }}
                  >
                    <Text style={{ ...type.label, color: palette.green700 }}>LUNAS</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.col, { flex: 0.4, alignItems: 'flex-end' }]}>
                <Text style={{
                  ...type.numericSm,
                  color: paymentStatus === 'Lunas' ? palette.green600 : paymentStatus === 'Sebagian' ? '#FFC107' : '#F44336'
                }}>
                  {paymentStatus.toUpperCase()}
                </Text>
                {paymentStatus !== 'Lunas' && (
                  <Text style={{ ...type.caption, color: '#666', marginTop: 2 }}>
                    Sisa: {new Intl.NumberFormat('id-ID').format(Math.max(0, totalAmount - parseIndonesianNumber(amountPaid)))}
                  </Text>
                )}
                {paymentStatus === 'Lunas' && parseIndonesianNumber(amountPaid) > totalAmount && (
                  <Text style={{ ...type.caption, color: '#666', marginTop: 2 }}>
                    Kembali: {formatNumber(parseIndonesianNumber(amountPaid) - totalAmount)}
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
              labelStyle={type.buttonLabel}
            >
              {isEditing ? 'UPDATE & CETAK' : 'SIMPAN & CETAK'}
            </Button>
          </Card.Content>
        </Card>

        <View style={{height: 20}} />
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
    backgroundColor: colors.background,
  },
  headerWrap: {
    width: '100%',
    overflow: 'hidden',
    boxShadow: shadows.header,
  },
  headerTexture: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.18,
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
    ...type.screenTitle,
    color: 'white',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    marginBottom: spacing.md,
    boxShadow: shadows.card,
  },
  cardContentCompact: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  input: {
    backgroundColor: 'white',
    fontSize: 14,
    height: 44,
  },
  webDateContainer: {
    height: 46, // Match input height roughly including label
    justifyContent: 'flex-end',
  },
  dateTouchable: {
    flex: 1,
  },
  priceCard: {
    backgroundColor: palette.green50,
  },
  sectionTitle: {
    ...type.label,
    fontWeight: weights.extrabold,
    color: palette.green700,
    marginBottom: spacing.sm,
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
    backgroundColor: palette.green700,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    boxShadow: shadows.fab,
  },
  finalPriceLabel: {
    color: 'rgba(255,255,255,0.9)',
    ...type.label,
  },
  finalPriceValue: {
    color: 'white',
    ...type.numericMd,
    fontSize: sizes.xxxl,
  },
  tableHeaderCompact: {
    backgroundColor: palette.ink900,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  tableTitle: {
    color: 'white',
    ...type.label,
    fontWeight: weights.extrabold,
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
    ...type.micro,
    fontWeight: weights.bold,
    color: '#555',
    textAlign: 'center',
  },
  td: {
    ...type.caption,
    color: '#333',
    ...tabularNums,
  },
  inputTable: {
    backgroundColor: 'white',
    height: 35, // Very compact
    fontSize: 14,
    marginHorizontal: 2,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    boxShadow: shadows.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  summaryValueBig: {
    ...type.numericLg,
    color: colors.text,
  },
  summaryValueGreen: {
    ...type.numericLg,
    color: palette.green700,
  },
  summarySub: {
    ...type.caption,
    color: colors.textSecondary,
  },
  saveButton: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    marginTop: spacing.md,
    boxShadow: shadows.fab,
  },
});
