import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { TextInput, Text, Portal, Modal, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { login, changePassword } from '../services/authService';
import { RootStackParamList } from '../types';
import { colors, palette, radius, spacing, shadows, type, weights, sizes } from '../theme';
import { haptic } from '../theme/haptics';
import GradientButton from '../components/GradientButton';
import { getAuthErrorMessage } from '../utils/authErrors';
import { validatePassword } from '../utils/validation';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forced first-login password change (default password = <email-local>123).
  const [changeVisible, setChangeVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      haptic.error();
      Alert.alert('Peringatan', 'Mohon isi email dan password anda');
      return;
    }
    setLoading(true);
    try {
      const { mustChangePassword } = await login(trimmedEmail, trimmedPassword);
      haptic.success();
      if (mustChangePassword) {
        setChangeVisible(true);
      } else {
        navigation.replace('Home');
      }
    } catch (error: any) {
      haptic.error();
      Alert.alert('Login Gagal', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const v = validatePassword(newPassword);
    if (!v.valid) {
      Alert.alert('Peringatan', v.error);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Peringatan', 'Konfirmasi password tidak cocok');
      return;
    }
    setChanging(true);
    try {
      await changePassword(password.trim(), newPassword);
      setChangeVisible(false);
      haptic.success();
      Alert.alert('Sukses', 'Password berhasil diganti', [
        { text: 'OK', onPress: () => navigation.replace('Home') },
      ]);
    } catch (error: any) {
      haptic.error();
      Alert.alert('Error', getAuthErrorMessage(error));
    } finally {
      setChanging(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={styles.screen}
    >
      <StatusBar style="light" />
      <Image
        source={require('../../assets/header.png')}
        style={styles.watermark}
        resizeMode="cover"
        blurRadius={Platform.OS === 'ios' ? 6 : 3}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <Image source={require('../../assets/icon.jpg')} style={styles.logo} />
            </View>
            <Text style={styles.appTitle}>Harapan Broiler</Text>
            <Text style={styles.appSubtitle}>Sistem Manajemen Digital</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Selamat Datang</Text>
            <Text style={styles.cardSubtitle}>Masuk untuk melanjutkan</Text>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              contentStyle={styles.inputContent}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" color={palette.slate400} />}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              contentStyle={styles.inputContent}
              left={<TextInput.Icon icon="lock-outline" color={palette.slate400} />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  color={palette.slate400}
                  onPress={() => setShowPassword((v) => !v)}
                />
              }
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            <TouchableOpacity
              style={styles.forgot}
              onPress={() => Alert.alert('Info', 'Silakan hubungi admin untuk reset password')}
            >
              <Text style={styles.forgotText}>Lupa Password?</Text>
            </TouchableOpacity>

            <GradientButton label="Masuk" onPress={handleLogin} loading={loading} disabled={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerMuted}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.version}>Versi v1.0.3 • Oktober 2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Modal
          visible={changeVisible}
          onDismiss={() => {}}
          dismissable={false}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalBadge}>
              <Icon source="key-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Ganti Password Default</Text>
            <Text style={styles.modalText}>
              Ini login pertama Anda. Buat password baru (minimal 6 karakter).
            </Text>
            <TextInput
              label="Password Baru"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              contentStyle={styles.inputContent}
            />
            <TextInput
              label="Konfirmasi Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              contentStyle={styles.inputContent}
            />
            <GradientButton
              label="Simpan & Masuk"
              onPress={handleChangePassword}
              loading={changing}
              disabled={changing}
            />
          </View>
        </Modal>
      </Portal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  watermark: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.12,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    boxShadow: shadows.raised,
  },
  logo: { width: 60, height: 60, borderRadius: radius.md },
  appTitle: { color: '#fff', ...type.screenTitle, fontSize: sizes.displayLg },
  appSubtitle: { color: 'rgba(255,255,255,0.85)', ...type.body, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.xs,
    boxShadow: shadows.raised,
  },
  cardTitle: { ...type.screenTitle, color: colors.text },
  cardSubtitle: { ...type.body, color: colors.textSecondary, marginBottom: spacing.md },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  inputContent: { minHeight: 52 },
  forgot: { alignSelf: 'flex-end', marginBottom: spacing.lg },
  forgotText: { color: colors.primary, ...type.bodyStrong },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerMuted: { color: 'rgba(255,255,255,0.85)' },
  footerLink: { color: '#fff', fontWeight: weights.extrabold },
  version: { ...type.micro, textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: spacing.md },
  modal: { padding: spacing.xl, backgroundColor: 'transparent' },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    padding: spacing.xl,
  },
  modalBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.green100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { ...type.sectionTitle, color: colors.text },
  modalText: { ...type.body, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
});
