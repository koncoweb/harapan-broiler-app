import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
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
import { colors, palette, radius, spacing, shadows, type, weights } from '../theme';
import { haptic } from '../theme/haptics';

type BluetoothSettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BluetoothSettings'>;
};

const LAST_PRINTER_KEY = 'lastConnectedPrinter';

export default function BluetoothSettingsScreen({ navigation }: BluetoothSettingsScreenProps) {
  const insets = useSafeAreaInsets();
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
            color={isConnected ? palette.green500 : colors.textSecondary}
          />
        )}
        right={() => (
          <View style={styles.deviceActions}>
            {isConnected && (
              <Chip
                mode="flat"
                textStyle={{ ...type.micro, color: 'white' }}
                style={{ backgroundColor: palette.green500, marginRight: 8 }}
              >
                Connected
              </Chip>
            )}
            {device.address === lastSavedPrinter?.address && !isConnected && (
              <Chip
                mode="outlined"
                textStyle={type.micro}
                style={{ marginRight: 8 }}
              >
                Last Used
              </Chip>
            )}
            {isConnecting ? (
              <ActivityIndicator size="small" color={palette.green700} />
            ) : isConnected ? (
              <Button
                mode="outlined"
                compact
                onPress={handleDisconnect}
                textColor={palette.danger}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                mode="contained"
                compact
                onPress={() => handleConnectDevice(device)}
                buttonColor={palette.green700}
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
      <StatusBar style="light" />
      <LinearGradient
        colors={[palette.green900, palette.green700, palette.green600]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrap}
      >
        <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => { haptic.tap(); navigation.goBack(); }} style={styles.backTouch}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bluetooth Printer</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Bluetooth Status */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Bluetooth Status:</Text>
              <Chip
                mode="flat"
                textStyle={{ color: 'white' }}
                style={{
                  backgroundColor: bluetoothEnabled ? palette.green500 : palette.danger
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
                buttonColor={palette.green700}
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
    backgroundColor: colors.background,
  },
  headerWrap: {
    width: '100%',
    overflow: 'hidden',
    boxShadow: shadows.header,
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
    paddingBottom: spacing.xxl + 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    marginBottom: spacing.lg,
    boxShadow: shadows.card,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusLabel: {
    ...type.body,
    color: colors.textSecondary,
  },
  connectedPrinterName: {
    ...type.bodyStrong,
    fontWeight: weights.bold,
    color: palette.green700,
  },
  sectionTitle: {
    ...type.sectionTitle,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  deviceItem: {
    backgroundColor: palette.cloud,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingVertical: spacing.sm,
  },
  connectedDevice: {
    backgroundColor: palette.successBg,
    borderColor: palette.green500,
    borderWidth: 1,
  },
  deviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  helpSection: {
    marginBottom: spacing.sm,
  },
  helpStep: {
    ...type.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  helpNote: {
    ...type.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    backgroundColor: palette.infoBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
});