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
import { TextInput, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { register } from '../services/authService';
import { RootStackParamList } from '../types';
import { colors, palette, radius, spacing, shadows, type, weights, sizes } from '../theme';
import { haptic } from '../theme/haptics';
import GradientButton from '../components/GradientButton';
import { validateEmail, validatePassword, validateRequired } from '../utils/validation';
import { getAuthErrorMessage } from '../utils/authErrors';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedDisplayName = displayName.trim();

    const displayNameValidation = validateRequired(trimmedDisplayName, 'Nama lengkap');
    if (!displayNameValidation.valid) {
      haptic.error();
      Alert.alert('Peringatan', displayNameValidation.error);
      return;
    }
    const emailValidation = validateEmail(trimmedEmail);
    if (!emailValidation.valid) {
      haptic.error();
      Alert.alert('Peringatan', emailValidation.error);
      return;
    }
    const passwordValidation = validatePassword(trimmedPassword);
    if (!passwordValidation.valid) {
      haptic.error();
      Alert.alert('Peringatan', passwordValidation.error);
      return;
    }

    setLoading(true);
    try {
      await register({ email: trimmedEmail, password: trimmedPassword, displayName: trimmedDisplayName });
      haptic.success();
      Alert.alert('Sukses', 'Akun berhasil dibuat', [
        { text: 'OK', onPress: () => navigation.replace('Home') },
      ]);
    } catch (error: any) {
      haptic.error();
      Alert.alert('Error', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
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
            <Text style={styles.appTitle}>Bergabung</Text>
            <Text style={styles.appSubtitle}>Buat akun baru anda</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pendaftaran</Text>
            <Text style={styles.cardSubtitle}>Isi data diri anda</Text>

            <TextInput
              label="Nama Lengkap"
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
              style={styles.input}
              contentStyle={styles.inputContent}
              left={<TextInput.Icon icon="account-outline" color={palette.slate400} />}
            />

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
              onSubmitEditing={handleRegister}
              returnKeyType="go"
            />

            <GradientButton label="Daftar" onPress={handleRegister} loading={loading} disabled={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerMuted}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Login Disini</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  watermark: { position: 'absolute', width: '100%', height: '100%', opacity: 0.12 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerMuted: { color: 'rgba(255,255,255,0.85)' },
  footerLink: { color: '#fff', fontWeight: weights.extrabold },
});
