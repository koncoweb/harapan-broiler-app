import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Appbar, 
  Card, 
  Text, 
  Button, 
  List, 
  ActivityIndicator, 
  Chip,
  Divider,
  IconButton
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scanBluetoothDevices,
  connectToBluetoothPrinter,
  disconnectBluetoothPrinter,
  isBluetoothEnabled,
  isBluetoothPrinterConnected,
  BluetoothDevice
} from '../services/bluetoothPrinterService';

type BluetoothSettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BluetoothSettings'>;
};

const LAST_PRINTER_KEY = 'lastConnectedPrinter';

export default function BluetoothSettingsScreen({ navigation }: BluetoothSettingsScreenProps) {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [lastSavedPrinter, setLastSavedPrinter] = useState<BluetoothDevice | null>(null);

  useEffect(() => {
    checkBluetoothStatus();
    loadLastSavedPrinter();
  }, []);

  const checkBluetoothStatus = async () => {
    const enabled = await isBluetoothEnabled();
    setBluetoothEnabled(enabled);
    
    if (enabled) {
      const connected = await isBluetoothPrinterConnected();
      if (connected && lastSavedPrinter) {
        setConnectedDevice(lastSavedPrinter);
      }
    }
  };

  const loadLastSavedPrinter = async () => {
    try {
      const saved = await AsyncStorage.getItem(LAST_PRINTER_KEY);
      if (saved) {
        const printer = JSON.parse(saved) as BluetoothDevice;
        setLastSavedPrinter(printer);
      }
    } catch (error) {
      console.error('Error loading last printer:', error);
    }
  };

  const saveLastPrinter = async (device: BluetoothDevice) => {
    try {
      await AsyncStorage.setItem(LAST_PRINTER_KEY, JSON.stringify(device));
      setLastSavedPrinter(device);
    } catch (error) {
      console.error('Error saving last printer:', error);
    }
  };

  const handleScanDevices = async () => {
    if (!bluetoothEnabled) {
      Alert.alert('Bluetooth Disabled', 'Please enable Bluetooth first');
      return;
    }

    setScanning(true);
    try {
      const foundDevices = await scanBluetoothDevices();
      setDevices(foundDevices);
      
      if (foundDevices.length === 0) {
        Alert.alert('No Devices Found', 'No Bluetooth devices found. Make sure your printer is paired and nearby.');
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Scan Failed', 'Failed to scan for Bluetooth devices');
    } finally {
      setScanning(false);
    }
  };

  const handleConnectDevice = async (device: BluetoothDevice) => {
    setConnecting(device.address);
    try {
      const success = await connectToBluetoothPrinter(device.address);
      if (success) {
        setConnectedDevice(device);
        await saveLastPrinter(device);
        Alert.alert('Connected', `Successfully connected to ${device.name}`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Failed', `Failed to connect to ${device.name}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectBluetoothPrinter();
      setConnectedDevice(null);
      Alert.alert('Disconnected', 'Printer disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
      Alert.alert('Disconnect Failed', 'Failed to disconnect printer');
    }
  };

  const handleAutoConnect = async () => {
    if (!lastSavedPrinter) {
      Alert.alert('No Saved Printer', 'No previously connected printer found');
      return;
    }

    await handleConnectDevice(lastSavedPrinter);
  };

  const renderDeviceItem = (device: BluetoothDevice) => {
    const isConnected = connectedDevice?.address === device.address;
    const isConnecting = connecting === device.address;

    return (
      <List.Item
        key={device.address}
        title={device.name || 'Unknown Device'}
        description={device.address}
        left={(props) => (
          <List.Icon 
            {...props} 
            icon={isConnected ? "printer-check" : "printer"} 
            color={isConnected ? "#4CAF50" : "#666"}
          />
        )}
        right={() => (
          <View style={styles.deviceActions}>
            {isConnected && (
              <Chip 
                mode="flat" 
                textStyle={{ color: 'white', fontSize: 10 }}
                style={{ backgroundColor: '#4CAF50', marginRight: 8 }}
              >
                Connected
              </Chip>
            )}
            {device.address === lastSavedPrinter?.address && !isConnected && (
              <Chip 
                mode="outlined" 
                textStyle={{ fontSize: 10 }}
                style={{ marginRight: 8 }}
              >
                Last Used
              </Chip>
            )}
            {isConnecting ? (
              <ActivityIndicator size="small" color="#2E7D32" />
            ) : isConnected ? (
              <Button 
                mode="outlined" 
                compact 
                onPress={handleDisconnect}
                textColor="#f44336"
              >
                Disconnect
              </Button>
            ) : (
              <Button 
                mode="contained" 
                compact 
                onPress={() => handleConnectDevice(device)}
                buttonColor="#2E7D32"
              >
                Connect
              </Button>
            )}
          </View>
        )}
        style={[
          styles.deviceItem,
          isConnected && styles.connectedDevice
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="white" />
        <Appbar.Content title="Bluetooth Printer Settings" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Bluetooth Status */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Bluetooth Status:</Text>
              <Chip 
                mode="flat"
                textStyle={{ color: 'white' }}
                style={{ 
                  backgroundColor: bluetoothEnabled ? '#4CAF50' : '#f44336' 
                }}
              >
                {bluetoothEnabled ? 'Enabled' : 'Disabled'}
              </Chip>
            </View>
            
            {connectedDevice && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Connected Printer:</Text>
                <Text style={styles.connectedPrinterName}>{connectedDevice.name}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <Button 
                mode="contained" 
                icon="bluetooth-connect"
                onPress={handleScanDevices}
                loading={scanning}
                disabled={!bluetoothEnabled}
                style={styles.actionButton}
                buttonColor="#2E7D32"
              >
                {scanning ? 'Scanning...' : 'Scan Devices'}
              </Button>
              
              {lastSavedPrinter && !connectedDevice && (
                <Button 
                  mode="outlined" 
                  icon="printer-check"
                  onPress={handleAutoConnect}
                  disabled={!bluetoothEnabled}
                  style={styles.actionButton}
                >
                  Connect to {lastSavedPrinter.name}
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Available Devices */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Devices ({devices.length})</Text>
              <IconButton 
                icon="refresh" 
                size={20} 
                onPress={handleScanDevices}
                disabled={scanning || !bluetoothEnabled}
              />
            </View>
            
            {devices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {bluetoothEnabled 
                    ? 'No devices found. Tap "Scan Devices" to search for printers.'
                    : 'Enable Bluetooth to scan for printers.'
                  }
                </Text>
              </View>
            ) : (
              <View>
                {devices.map(renderDeviceItem)}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Help Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Setup Instructions</Text>
            <View style={styles.helpSection}>
              <Text style={styles.helpStep}>1. Make sure your thermal printer is turned on</Text>
              <Text style={styles.helpStep}>2. Pair the printer in Android Bluetooth settings first</Text>
              <Text style={styles.helpStep}>3. Tap "Scan Devices" to find paired printers</Text>
              <Text style={styles.helpStep}>4. Tap "Connect" next to your printer</Text>
              <Text style={styles.helpStep}>5. Test printing from the main screen</Text>
            </View>
            
            <Divider style={{ marginVertical: 12 }} />
            
            <Text style={styles.helpNote}>
              💡 Supported printers: ESC/POS thermal printers (58mm/80mm)
              {'\n'}📱 Recommended: Rongta RPP210, Epson TM series
            </Text>
          </Card.Content>
        </Card>

        <View style={{ height: 50 }} />
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
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  connectedPrinterName: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtons: {
    gap: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  deviceItem: {
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 4,
  },
  connectedDevice: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  deviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  helpSection: {
    marginBottom: 8,
  },
  helpStep: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    paddingLeft: 8,
  },
  helpNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 4,
  },
});