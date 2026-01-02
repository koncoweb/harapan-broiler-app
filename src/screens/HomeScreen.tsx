import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Alert } from 'react-native';
import { Appbar, Card, Text, FAB, ActivityIndicator, Button, IconButton, TextInput } from 'react-native-paper';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, WeighingSession, FarmSettings, UserData } from '../types';
import { signOut } from 'firebase/auth';
import { printReceiptAuto, shareReceipt } from '../services/printerService';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [sessions, setSessions] = useState<WeighingSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<WeighingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<FarmSettings | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [showActivities, setShowActivities] = useState(true); // Toggle for activities section
  const [searchQuery, setSearchQuery] = useState(''); // Search functionality
  
  // STATISTIK DIHAPUS DARI UI - DATA TETAP TERSIMPAN

  useEffect(() => {
    // Check authentication
    if (!auth.currentUser) {
      navigation.replace('Login');
      return;
    }

    // Fetch User Role
    const fetchUserRole = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            setUserRole(userData.role);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
    };
    fetchUserRole();

    // Fetch Settings
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

    // Subscribe to Weighing Sessions
    const q = query(collection(db, 'weighing_sessions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: WeighingSession[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WeighingSession));
      setSessions(data);
      setFilteredSessions(data); // Initialize filtered sessions
      setLoading(false);
    }, (error) => {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat data');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Advanced multi-search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Split query into multiple terms (support space, comma, and semicolon separators)
    const searchTerms = query.split(/[\s,;]+/).filter(term => term.length > 0);
    
    const filtered = sessions.filter(session => {
      // For each session, check if it matches ALL search terms (AND logic)
      return searchTerms.every(term => {
        // Check each term against all searchable fields
        const buyerMatch = session.buyer.toLowerCase().includes(term);
        const driverMatch = session.driver.toLowerCase().includes(term);
        
        // Date matching
        const dateMatch = session.date.includes(term);
        const [year, month, day] = session.date.split('-');
        const monthYearMatch = `${month}-${year}`.includes(term) || 
                              `${year}-${month}`.includes(term) ||
                              `${month}/${year}`.includes(term) ||
                              `${year}/${month}`.includes(term) ||
                              `${day}/${month}`.includes(term) ||
                              `${day}-${month}`.includes(term);
        
        // Indonesian date format
        const formattedDate = new Date(session.date).toLocaleDateString('id-ID');
        const formattedDateMatch = formattedDate.toLowerCase().includes(term);
        
        // Month names (Indonesian)
        const monthNames = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 
                           'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
        const monthIndex = parseInt(month) - 1;
        const monthNameMatch = monthNames[monthIndex] && monthNames[monthIndex].includes(term);
        
        // Amount matching (remove formatting for search)
        const amountMatch = session.totalAmount && 
                           session.totalAmount.toString().includes(term.replace(/[.,]/g, ''));
        
        // Weight matching
        const weightMatch = session.totalNetWeight && 
                           session.totalNetWeight.toString().replace('.', ',').includes(term);
        
        // Time matching
        const timeMatch = session.time && session.time.includes(term);
        
        // Special operators
        let operatorMatch = false;
        
        // Amount range operator: >1000000 or <500000
        if (term.startsWith('>') || term.startsWith('<')) {
          const operator = term.charAt(0);
          const value = parseFloat(term.slice(1).replace(/[.,]/g, ''));
          if (!isNaN(value) && session.totalAmount) {
            operatorMatch = operator === '>' ? session.totalAmount > value : session.totalAmount < value;
          }
        }
        
        // Date range operator: >2024-12-01 or <2024-12-31
        if (term.startsWith('>') || term.startsWith('<')) {
          const operator = term.charAt(0);
          const dateValue = term.slice(1);
          if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            operatorMatch = operator === '>' ? session.date > dateValue : session.date < dateValue;
          }
        }
        
        // Weight range operator: berat>100 or berat<50
        if (term.startsWith('berat>') || term.startsWith('berat<')) {
          const operator = term.includes('>') ? '>' : '<';
          const value = parseFloat(term.split(operator)[1].replace(',', '.'));
          if (!isNaN(value) && session.totalNetWeight) {
            operatorMatch = operator === '>' ? session.totalNetWeight > value : session.totalNetWeight < value;
          }
        }
        
        return buyerMatch || driverMatch || dateMatch || monthYearMatch || 
               formattedDateMatch || monthNameMatch || amountMatch || 
               weightMatch || timeMatch || operatorMatch;
      });
    });

    // Sort filtered results by relevance and date
    filtered.sort((a, b) => {
      // Calculate relevance score
      const scoreA = calculateRelevanceScore(a, searchTerms);
      const scoreB = calculateRelevanceScore(b, searchTerms);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      
      // If same relevance, sort by date (newest first)
      const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
      const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredSessions(filtered);
  }, [searchQuery, sessions]);

  // Calculate relevance score for sorting
  const calculateRelevanceScore = (session: WeighingSession, terms: string[]) => {
    let score = 0;
    
    terms.forEach(term => {
      // Exact match in buyer name gets highest score
      if (session.buyer.toLowerCase() === term) score += 10;
      else if (session.buyer.toLowerCase().includes(term)) score += 5;
      
      // Driver match
      if (session.driver.toLowerCase() === term) score += 8;
      else if (session.driver.toLowerCase().includes(term)) score += 4;
      
      // Date match gets medium score
      if (session.date.includes(term)) score += 3;
      
      // Amount match gets lower score
      if (session.totalAmount && session.totalAmount.toString().includes(term)) score += 2;
    });
    
    return score;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error(error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const renderSessionItem = ({ item }: { item: WeighingSession }) => (
    <Card style={styles.compactCard}>
      <Card.Content style={styles.compactCardContent}>
        <View style={styles.compactCardHeader}>
          <View style={styles.compactCardLeft}>
            <Text style={styles.compactCardTitle}>{item.buyer}</Text>
            <Text style={styles.compactCardSubtitle}>
              {(item.totalNetWeight || 0).toFixed(2).replace('.', ',')} Kg • {item.totalColi || 0} Timbangan
            </Text>
          </View>
          <View style={styles.compactCardRight}>
            <Text style={styles.compactCardDate}>{new Date(item.date).toLocaleDateString('id-ID')}</Text>
            <Text style={styles.compactCardPrice}>{formatCurrency(item.totalAmount || 0)}</Text>
          </View>
        </View>
      </Card.Content>
      <View style={styles.compactCardActions}>
        <IconButton 
          icon="printer" 
          size={18} 
          onPress={() => printReceiptAuto(item, settings || undefined)} 
        />
        <IconButton 
          icon="share-variant" 
          size={18} 
          onPress={() => shareReceipt(item, settings || undefined)} 
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header style={[styles.header, {backgroundColor: '#1B5E20'}]}>
        <Appbar.Content title={settings?.farmName || "Harapan Broiler"} titleStyle={{color: 'white', fontWeight: 'bold'}} />
        <Appbar.Action icon="bluetooth" color="white" onPress={() => navigation.navigate('BluetoothSettings')} />
        {userRole === 'admin' && (
          <Appbar.Action icon="shield-account" color="white" onPress={() => navigation.navigate('Admin')} />
        )}
        <Appbar.Action icon="logout" color="white" onPress={handleLogout} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* STATISTIK CARD DIHAPUS - HANYA INPUT DAN AKTIVITAS */}
        
        {/* Input Timbangan Baru CTA - Prominent */}
        <View style={styles.ctaContainer}>
          <FAB
            style={styles.fabLarge}
            icon="plus"
            color="white"
            onPress={() => navigation.navigate('CreateNota')}
            label="INPUT TIMBANGAN BARU"
          />
        </View>

        {/* Aktivitas Terakhir - Collapsible */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AKTIVITAS TERAKHIR</Text>
          <IconButton
            icon={showActivities ? "chevron-up" : "chevron-down"}
            size={20}
            onPress={() => setShowActivities(!showActivities)}
          />
        </View>

        {showActivities && (
          <>
            {/* Advanced Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                mode="outlined"
                placeholder="Cari: budi desember, &gt;2000000, berat&gt;100, B1234..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                left={<TextInput.Icon icon="magnify" />}
                right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : null}
                style={styles.searchInput}
                dense
                theme={{ colors: { background: 'white' } }}
                multiline={false}
              />
              
              {/* Search Tips */}
              {!searchQuery && (
                <View style={styles.searchTips}>
                  <Text style={styles.searchTipsText}>
                    💡 Tips: Gunakan spasi/koma untuk multi pencarian. Contoh: "budi desember" atau "&gt;1000000"
                  </Text>
                </View>
              )}
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 20 }} />
            ) : (
              <>
                {searchQuery && (
                  <View style={styles.searchResultsContainer}>
                    <Text style={styles.searchResults}>
                      {filteredSessions.length} hasil ditemukan untuk "{searchQuery}"
                    </Text>
                    {/* Show parsed search terms */}
                    {searchQuery.includes(' ') || searchQuery.includes(',') || searchQuery.includes(';') ? (
                      <View style={styles.searchTermsContainer}>
                        <Text style={styles.searchTermsLabel}>Kata kunci: </Text>
                        {searchQuery.toLowerCase().split(/[\s,;]+/).filter(term => term.length > 0).map((term, index) => (
                          <View key={index} style={styles.searchTerm}>
                            <Text style={styles.searchTermText}>{term}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                )}
                {filteredSessions.slice(0, 20).map(session => (
                  <View key={session.id} style={{marginBottom: 8}}>
                    {renderSessionItem({item: session})}
                  </View>
                ))}
                {filteredSessions.length === 0 && searchQuery && (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>Tidak ada hasil ditemukan</Text>
                    <Text style={styles.noResultsSubtext}>
                      Coba kata kunci lain, gunakan operator (&gt;, &lt;), atau periksa ejaan
                    </Text>
                    <View style={styles.searchExamples}>
                      <Text style={styles.searchExamplesTitle}>Contoh pencarian:</Text>
                      <Text style={styles.searchExample}>• "budi desember" - Budi di bulan Desember</Text>
                      <Text style={styles.searchExample}>• "&gt;2000000" - Transaksi di atas 2 juta</Text>
                      <Text style={styles.searchExample}>• "berat&gt;100" - Berat di atas 100 kg</Text>
                      <Text style={styles.searchExample}>• "B1234 januari" - Sopir B1234 di Januari</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </>
        )}
        
        <View style={{height: 100}} /> 
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  ctaContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  fabLarge: {
    backgroundColor: '#4CAF50',
    width: '100%',
    borderRadius: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 16,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: 'white',
    fontSize: 14,
  },
  searchTips: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  searchTipsText: {
    fontSize: 11,
    color: '#2E7D32',
    fontStyle: 'italic',
  },
  searchResultsContainer: {
    marginBottom: 12,
  },
  searchResults: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  searchTermsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  searchTermsLabel: {
    fontSize: 11,
    color: '#999',
    marginRight: 4,
  },
  searchTerm: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
    marginBottom: 2,
  },
  searchTermText: {
    fontSize: 10,
    color: '#1976D2',
    fontWeight: '500',
  },
  noResults: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 10,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  searchExamples: {
    alignItems: 'flex-start',
    width: '100%',
  },
  searchExamplesTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6,
  },
  searchExample: {
    fontSize: 12,
    color: '#777',
    marginBottom: 2,
  },
  compactCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 1,
    marginBottom: 2,
  },
  compactCardContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  compactCardRight: {
    alignItems: 'flex-end',
  },
  compactCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  compactCardSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  compactCardDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  compactCardPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  compactCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
});
