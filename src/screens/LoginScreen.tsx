import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions, TouchableOpacity, Image } from 'react-native';
import { TextInput, Button, Text, useTheme, Surface } from 'react-native-paper';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { getErrorMessage } from '../utils/firebaseErrors';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Peringatan', 'Mohon isi email dan password anda');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert('Login Gagal', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Decor */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#1B5E20', '#4CAF50']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Image 
            source={require('../../assets/header.png')} 
            style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%', opacity: 0.18 }]}
            resizeMode="cover"
            blurRadius={Platform.OS === 'ios' ? 5 : 2}
          />
          <View style={styles.headerContent}>
            <View style={styles.logoRow}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <Text variant="headlineMedium" style={styles.headerTitle}>Harapan Broiler</Text>
            </View>
            <Text variant="bodyLarge" style={styles.headerSubtitle}>Sistem Manajemen Digital</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Surface style={styles.card} elevation={4}>
            <Text variant="headlineSmall" style={styles.cardTitle}>Selamat Datang</Text>
            <Text variant="bodyMedium" style={styles.cardSubtitle}>Silakan masuk ke akun anda</Text>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" color="#666" />}
              theme={{ colors: { primary: '#2E7D32', background: 'white' } }}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              left={<TextInput.Icon icon="lock-outline" color="#666" />}
              right={
                <TextInput.Icon 
                  icon={showPassword ? "eye-off" : "eye"} 
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              theme={{ colors: { primary: '#2E7D32', background: 'white' } }}
            />

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => Alert.alert('Info', 'Silakan hubungi admin untuk reset password')}
            >
              <Text style={{ color: '#2E7D32', fontWeight: '600' }}>Lupa Password?</Text>
            </TouchableOpacity>

            <Button 
              mode="contained" 
              onPress={handleLogin} 
              loading={loading}
              contentStyle={styles.buttonContent}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              MASUK
            </Button>
          </Surface>

          <View style={styles.footer}>
            <Text style={{ color: '#666' }}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.versionText}>Versi Juni 2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 11,
    marginTop: 8,
    marginBottom: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerContainer: {
    height: 280,
    width: '100%',
    position: 'absolute',
    top: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 4,
  },
  headerGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoIcon: {
    width: 44,
    height: 44,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 180, // Push down to overlap header
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 24,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#666',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    elevation: 2,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
});
