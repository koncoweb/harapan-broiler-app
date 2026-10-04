import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Image, RefreshControl } from 'react-native';
import { Card, Text, ActivityIndicator, Button, IconButton, TextInput, Icon } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList, WeighingSession } from '../types';
import { signOut, getCurrentUser } from '../services/authService';
import { printReceiptAuto, shareReceipt } from '../services/printerService';
import { OfflineStorageService, OfflineSession } from '../services/offlineStorage';
import NetInfo from '@react-native-community/netinfo';
import { useUserRole } from '../hooks/useUserRole';
import { useFarmSettings } from '../hooks/useFarmSettings';
import { useWeighingSessions } from '../hooks/useWeighingSessions';
import { formatCurrency, formatWeight, formatDateId } from '../utils/format';
import { colors, palette, radius, spacing, shadows, tabularNums, type, weights, sizes } from '../theme';
import { haptic } from '../theme/haptics';
import GradientButton from '../components/GradientButton';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [filteredSessions, setFilteredSessions] = useState<WeighingSession[]>([]);
  const [showActivities, setShowActivities] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [offlineSessions, setOfflineSessions] = useState<OfflineSession[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const prevConnected = useRef<boolean | null>(null);

  const { role: userRole } = useUserRole();
  const { settings } = useFarmSettings();
  const { sessions, loading, fromCache, refresh } = useWeighingSessions({
    // Large window keeps the existing client-side advanced search behaving the
    // same as the old onSnapshot full-load; pagination tuning comes in the UI pass.
    pageSize: 500,
    onError: () => Alert.alert('Error', 'Gagal memuat data'),
  });

  useEffect(() => {
    // Check authentication (Turso session persisted in AsyncStorage)
    getCurrentUser().then((user) => {
      if (!user) {
        navigation.replace('Login');
      }
    });
  }, [navigation]);

  // Server rows merged with the offline queue so notes entered while offline
  // (and edits to existing rows) stay visible until they sync.
  const baseSessions = useMemo<WeighingSession[]>(() => {
    if (!offlineSessions.length) return sessions;
    const byId = new Map(sessions.map((s) => [s.id, s as WeighingSession]));
    const additions: WeighingSession[] = [];
    for (const off of offlineSessions) {
      if (byId.has(off.id)) byId.set(off.id, off);
      else additions.push(off);
    }
    return [...additions, ...Array.from(byId.values())];
  }, [sessions, offlineSessions]);

  const offlineIds = useMemo(() => new Set(offlineSessions.map((s) => s.id)), [offlineSessions]);

  useEffect(() => {
    setFilteredSessions(baseSessions);
  }, [baseSessions, navigation]);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      if (connected && prevConnected.current === false) {
        // Came back online: refresh list + queue (app-wide auto-sync pushes it).
        refresh();
        checkPendingItems();
      }
      prevConnected.current = connected;
    });
    return () => unsubscribeNetInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  // Re-read the offline queue AND re-fetch the server list every time Home gains
  // focus. The Turso data layer fetches once per mount (no live onSnapshot like
  // the old Firestore listener), so a nota saved online in CreateNota wouldn't
  // appear until a full remount — which users worked around by logging out and
  // back in. Refreshing on re-focus makes saves show up immediately. The first
  // focus is skipped because the hook already loads on mount.
  const didInitialLoad = useRef(false);
  useFocusEffect(
    useCallback(() => {
      checkPendingItems();
      if (didInitialLoad.current) {
        refresh();
      }
      didInitialLoad.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh])
  );

  const checkPendingItems = async () => {
    const [count, queued] = await Promise.all([
      OfflineStorageService.getPendingCount(),
      OfflineStorageService.getSessions(),
    ]);
    setPendingCount(count);
    setOfflineSessions(queued);
  };

  // Advanced multi-search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(baseSessions);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Split query into multiple terms (support space, comma, and semicolon separators)
    const searchTerms = query.split(/[\s,;]+/).filter(term => term.length > 0);
    
    const filtered = baseSessions.filter(session => {
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
        const formattedDate = formatDateId(session.date);
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
  }, [searchQuery, baseSessions]);

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
      await signOut();
      navigation.replace('Login');
    } catch (error) {
      console.error(error);
    }
  };

  const renderSessionItem = ({ item }: { item: WeighingSession }) => (
    <Card style={styles.compactCard} mode="contained">
      <Card.Content style={styles.compactCardContent}>
        <View style={styles.compactCardHeader}>
          <View style={styles.compactCardLeft}>
            <View style={styles.buyerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.buyer.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.compactCardTitle} numberOfLines={1}>{item.buyer}</Text>
                <Text style={styles.compactCardSubtitle}>
                  {formatWeight(item.totalNetWeight || 0)} Kg • {item.totalColi || 0} Timbangan
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.compactCardRight}>
            <Text style={styles.compactCardDate}>{formatDateId(item.date)}</Text>
            <Text style={styles.compactCardPrice}>{formatCurrency(item.totalAmount || 0)}</Text>
            {offlineIds.has(item.id) && (
              <Text style={styles.unsyncedBadge}>Belum sync</Text>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          <IconButton
            icon="printer"
            size={18}
            iconColor={palette.green700}
            style={styles.actionBtn}
            onPress={() => { haptic.tap(); printReceiptAuto(item, settings || undefined); }}
          />
          <IconButton
            icon="share-variant"
            size={18}
            iconColor={palette.green700}
            style={styles.actionBtn}
            onPress={() => { haptic.tap(); shareReceipt(item, settings || undefined); }}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient header */}
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
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {settings?.farmName || 'Harapan Broiler'}
            </Text>
            <Text style={styles.headerSubtitle}>Aktivitas Timbangan</Text>
          </View>
          <IconButton icon="bluetooth" size={22} iconColor="#fff" onPress={() => { haptic.tap(); navigation.navigate('BluetoothSettings'); }} />
          {userRole === 'admin' && (
            <IconButton icon="shield-account" size={22} iconColor="#fff" onPress={() => { haptic.tap(); navigation.navigate('Admin'); }} />
          )}
          <IconButton icon="logout" size={22} iconColor="#fff" onPress={handleLogout} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={async () => {
              setPullRefreshing(true);
              try {
                await Promise.all([refresh(), checkPendingItems()]);
              } finally {
                setPullRefreshing(false);
              }
            }}
            colors={[palette.green700]}
            tintColor={palette.green700}
          />
        }
      >
        {((isConnected === false) || pendingCount > 0) && (
          <View style={[styles.offlineBanner, { marginBottom: spacing.lg }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineBannerTitle}>
                {isConnected === false ? 'Mode Offline' : 'Data Belum Tersinkron'}
              </Text>
              {isConnected === false && pendingCount === 0 && (
                <Text style={styles.offlineBannerText}>
                  Anda sedang offline. Data baru akan tersimpan di perangkat.
                </Text>
              )}
              {pendingCount > 0 && (
                <Text style={styles.offlineBannerText}>
                  {pendingCount} data tersimpan di perangkat
                </Text>
              )}
            </View>
            <Button
              mode="contained"
              buttonColor={palette.warning}
              textColor="#fff"
              compact
              style={styles.shadowSoft}
              onPress={() => { haptic.tap(); navigation.navigate('Sync'); }}
            >
              Sync
            </Button>
          </View>
        )}

        {/* Input Timbangan Baru CTA */}
        <GradientButton
          label="Input Timbangan Baru"
          icon={<Icon source="plus" size={22} color="#fff" />}
          onPress={() => { haptic.medium(); navigation.navigate('CreateNota'); }}
          style={{ marginBottom: spacing.xl }}
        />

        {/* Aktivitas Terakhir - Collapsible */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AKTIVITAS TERAKHIR</Text>
          <IconButton
            icon={showActivities ? 'chevron-up' : 'chevron-down'}
            size={20}
            onPress={() => { haptic.tap(); setShowActivities(!showActivities); }}
          />
        </View>

        {showActivities && (
          <>
            {/* Advanced Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                mode="outlined"
                placeholder="Cari: budi desember, >2000000, berat>100, B1234..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                left={<TextInput.Icon icon="magnify" />}
                right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : undefined}
                style={styles.searchInput}
                dense
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

            {fromCache && !loading && (
              <View style={styles.cacheNote}>
                <Text style={styles.cacheNoteText}>
                  Menampilkan data tersimpan (offline). Daftar bisa jadi belum terbaru.
                </Text>
              </View>
            )}

            {loading && filteredSessions.length === 0 ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
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
                  <View key={session.id} style={{ marginBottom: spacing.sm }}>
                    {renderSessionItem({ item: session })}
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

        <Text style={styles.versionText}>Harapan Broiler v1.0.3 • Oktober 2026</Text>
      </ScrollView>
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
    opacity: 0.08,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  headerTitle: {
    color: '#fff',
    ...type.screenTitle,
  },
  headerSubtitle: {
    color: palette.green300,
    ...type.caption,
    marginTop: 2,
  },
  shadowSoft: {
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  offlineBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.warningBg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  offlineBannerTitle: {
    color: palette.warning,
    ...type.bodyStrong,
    fontWeight: weights.extrabold,
  },
  offlineBannerText: {
    color: palette.warning,
    ...type.caption,
    marginTop: 2,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl + 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    ...type.sectionTitle,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    fontSize: 14,
    borderRadius: radius.md,
  },
  searchTips: {
    backgroundColor: palette.successBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    marginTop: spacing.sm,
  },
  searchTipsText: {
    ...type.micro,
    color: palette.success,
    fontStyle: 'italic',
  },
  searchResultsContainer: {
    marginBottom: spacing.md,
  },
  searchResults: {
    ...type.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  searchTermsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  searchTermsLabel: {
    ...type.micro,
    color: colors.textMuted,
    marginRight: 4,
  },
  searchTerm: {
    backgroundColor: palette.infoBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  searchTermText: {
    ...type.micro,
    fontWeight: weights.semibold,
    color: palette.info,
  },
  noResults: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    marginTop: spacing.md,
    boxShadow: shadows.card,
  },
  noResultsText: {
    ...type.cardTitle,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  noResultsSubtext: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  searchExamples: {
    alignItems: 'flex-start',
    width: '100%',
  },
  searchExamplesTitle: {
    ...type.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  searchExample: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  compactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    boxShadow: shadows.card,
  },
  compactCardContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  compactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  compactCardLeft: {
    flex: 1,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.green100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.green800,
    fontSize: sizes.lg,
    fontWeight: weights.extrabold,
  },
  compactCardRight: {
    alignItems: 'flex-end',
  },
  compactCardTitle: {
    ...type.cardTitleSm,
    color: colors.text,
  },
  compactCardSubtitle: {
    ...type.subtitle,
    color: colors.textSecondary,
    marginTop: 2,
    ...tabularNums,
  },
  compactCardDate: {
    ...type.micro,
    color: colors.textMuted,
    marginBottom: 2,
  },
  compactCardPrice: {
    ...type.numericSm,
    fontWeight: weights.extrabold,
    color: palette.green700,
  },
  unsyncedBadge: {
    marginTop: 2,
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: palette.warningBg,
    color: palette.warning,
    ...type.micro,
    fontWeight: weights.bold,
    overflow: 'hidden',
  },
  cacheNote: {
    backgroundColor: palette.infoBg,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  cacheNoteText: {
    color: palette.info,
    ...type.caption,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    backgroundColor: palette.green50,
    borderRadius: radius.pill,
    margin: 0,
  },
  versionText: {
    textAlign: 'center',
    color: colors.textMuted,
    ...type.micro,
    marginTop: spacing.xl,
  },
});
