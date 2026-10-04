import React from 'react';
import { NavigationContainer, DefaultTheme as NavLightTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/types';
import { paperTheme, colors } from './src/theme';
import { useAutoSync } from './src/hooks/useAutoSync';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateNotaScreen from './src/screens/CreateNotaScreen';
import AdminScreen from './src/screens/AdminScreen';
import BluetoothSettingsScreen from './src/screens/BluetoothSettingsScreen';
import SyncScreen from './src/screens/SyncScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Headless component: pushes the offline queue to Turso automatically whenever
// the app is foregrounded or the connection returns.
function AutoSync() {
  useAutoSync();
  return null;
}

// Navigation theme aligned with the Paper design tokens.
const navTheme = {
  ...NavLightTheme,
  colors: {
    ...NavLightTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navTheme}>
          <AutoSync />
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CreateNota" component={CreateNotaScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="BluetoothSettings" component={BluetoothSettingsScreen} />
            <Stack.Screen name="Sync" component={SyncScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
