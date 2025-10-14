import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationInfo, Location, Destination } from '../types';
import { apiService } from '../services/ApiService';
import { locationService } from '../services/LocationService';
import { HOME, TLV_OFFICE, HAIFA_OFFICE, calculateDistance } from '../services/Locations';

interface Props {
  onLocationSelected: (location: string) => void;
}

export const HomeScreen: React.FC<Props> = ({ onLocationSelected }) => {
  const insets = useSafeAreaInsets();
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('checking');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [autoSelected, setAutoSelected] = useState<boolean>(false);

  useEffect(() => {
    detectCurrentLocation();
  }, []);

  const detectCurrentLocation = async () => {
    try {
      setPermissionStatus('checking');
      
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      setPermissionStatus('granted');
      
      const info = await apiService.detectLocation(location);
      setLocationInfo(info);
      
      // Auto-select location if we detect one and user hasn't manually selected yet
      if (!selectedLocation) {
        let detectedLocation = null;
        if (info.location === 'home') {
          detectedLocation = 'home';
        } else if (info.location === 'tlv_office') {
          detectedLocation = 'tel_aviv';
        } else if (info.location === 'haifa_office') {
          detectedLocation = 'haifa';
        }
        
        if (detectedLocation) {
          setSelectedLocation(detectedLocation);
          setAutoSelected(true);
          // Auto-proceed to next screen
          onLocationSelected(detectedLocation);
        }
      }
    } catch (error) {
      console.error('Error detecting location:', error);
      setPermissionStatus(`error: ${error.message}`);
    }
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setAutoSelected(false); // User manually selected
    
    // Proceed to next screen
    onLocationSelected(location);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>GetTrain</Text>
        <Text style={styles.subtitle}>Where are you right now?</Text>
        {autoSelected && <Text style={styles.autoSelectedText}>📍 Auto-detected</Text>}
        
        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Permission: {permissionStatus}</Text>
          {currentLocation && (
            <>
              <Text style={styles.debugText}>
                GPS: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </Text>
              <Text style={styles.debugText}>
                Home: {calculateDistance([currentLocation.latitude, currentLocation.longitude], HOME.coordinates).toFixed(2)}km
              </Text>
              <Text style={styles.debugText}>
                TLV: {calculateDistance([currentLocation.latitude, currentLocation.longitude], TLV_OFFICE.coordinates).toFixed(2)}km
              </Text>
              <Text style={styles.debugText}>
                Haifa: {calculateDistance([currentLocation.latitude, currentLocation.longitude], HAIFA_OFFICE.coordinates).toFixed(2)}km
              </Text>
              <Text style={styles.debugText}>Threshold: 0.5km</Text>
            </>
          )}
        </View>
      </View>

      {/* Location Selection */}
      <View style={styles.locationContainer}>
        <TouchableOpacity
          style={[
            styles.locationButton,
            selectedLocation === 'home' && styles.locationButtonSelected
          ]}
          onPress={() => handleLocationSelect('home')}
        >
          <Text style={[
            styles.locationButtonText,
            selectedLocation === 'home' && styles.locationButtonTextSelected
          ]}>🏠 Home</Text>
          <Text style={styles.locationButtonSubtext}>Klachim 249</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.locationButton,
            selectedLocation === 'tel_aviv' && styles.locationButtonSelected
          ]}
          onPress={() => handleLocationSelect('tel_aviv')}
        >
          <Text style={[
            styles.locationButtonText,
            selectedLocation === 'tel_aviv' && styles.locationButtonTextSelected
          ]}>🏢 Tel Aviv</Text>
          <Text style={styles.locationButtonSubtext}>Givatayim Office</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.locationButton,
            selectedLocation === 'haifa' && styles.locationButtonSelected
          ]}
          onPress={() => handleLocationSelect('haifa')}
        >
          <Text style={[
            styles.locationButtonText,
            selectedLocation === 'haifa' && styles.locationButtonTextSelected
          ]}>🏢 Haifa</Text>
          <Text style={styles.locationButtonSubtext}>IBM R&D Labs</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={detectCurrentLocation}
      >
        <Text style={styles.refreshText}>🔄 Refresh GPS</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  refreshButton: {
    marginTop: 20,
    padding: 12,
    alignItems: 'center',
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 16,
  },
  debugContainer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
  autoSelectedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
    marginTop: 4,
  },
  locationContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  locationButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  locationButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  locationButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationButtonTextSelected: {
    color: 'white',
  },
  locationButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
});