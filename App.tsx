import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/types';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateNotaScreen from './src/screens/CreateNotaScreen';
import AdminScreen from './src/screens/AdminScreen';
import BluetoothSettingsScreen from './src/screens/BluetoothSettingsScreen';
import SyncScreen from './src/screens/SyncScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Login"
            screenOptions={{
              headerShown: false
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
