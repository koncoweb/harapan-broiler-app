import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserData } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { validateEmail, validatePassword, validateRequired } from '../utils/validation';
import { getErrorMessage } from '../utils/firebaseErrors';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
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
      Alert.alert('Peringatan', displayNameValidation.error);
      return;
    }

    const emailValidation = validateEmail(trimmedEmail);
    if (!emailValidation.valid) {
      Alert.alert('Peringatan', emailValidation.error);
      return;
    }

    const passwordValidation = validatePassword(trimmedPassword);
    if (!passwordValidation.valid) {
      Alert.alert('Peringatan', passwordValidation.error);
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      // Update Auth Profile
      await updateProfile(user, { displayName: trimmedDisplayName });

      // Create User Document in Firestore
      const userData: UserData = {
        uid: user.uid,
        email: user.email || '',
        displayName: trimmedDisplayName,
        role: 'user' // Default role
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      Alert.alert('Sukses', 'Akun berhasil dibuat', [
        { text: 'OK', onPress: () => navigation.replace('Home') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error));
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
          <View style={styles.headerContent}>
            <Text variant="headlineMedium" style={styles.headerTitle}>Bergabung</Text>
            <Text variant="bodyLarge" style={styles.headerSubtitle}>Buat akun baru anda</Text>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Surface style={styles.card} elevation={4}>
            <Text variant="headlineSmall" style={styles.cardTitle}>Pendaftaran</Text>
            <Text variant="bodyMedium" style={styles.cardSubtitle}>Isi data diri anda</Text>

            <TextInput
              label="Nama Lengkap"
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account-outline" color="#666" />}
              theme={{ colors: { primary: '#2E7D32', background: 'white' } }}
            />

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

            <Button 
              mode="contained" 
              onPress={handleRegister} 
              loading={loading}
              contentStyle={styles.buttonContent}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              DAFTAR
            </Button>
          </Surface>

          <View style={styles.footer}>
            <Text style={{ color: '#666' }}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>Login Disini</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerContainer: {
    height: 250,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
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
    paddingTop: 160,
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
  button: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    elevation: 2,
    marginTop: 8,
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
