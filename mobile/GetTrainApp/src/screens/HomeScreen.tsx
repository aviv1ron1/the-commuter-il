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

interface Props {
  onSelectDestination: (destination: Destination) => void;
  onGoHome: () => void;
}

export const HomeScreen: React.FC<Props> = ({ onSelectDestination, onGoHome }) => {
  const insets = useSafeAreaInsets();
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectCurrentLocation();
  }, []);

  const detectCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      
      const info = await apiService.detectLocation(location);
      setLocationInfo(info);
    } catch (error) {
      console.error('Error detecting location:', error);
      Alert.alert('Location Error', 'Could not detect your location. Using default settings.');
      // Set default to show destinations
      setLocationInfo({
        location: 'unknown',
        show_destinations: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDestinationSelect = (destination: Destination) => {
    onSelectDestination(destination);
  };

  const handleGoHome = () => {
    onGoHome();
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Detecting your location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>GetTrain</Text>
        <Text style={styles.subtitle}>
          {locationInfo?.location === 'home' && 'You are at home'}
          {locationInfo?.location === 'tlv_office' && 'You are at TLV office'}
          {locationInfo?.location === 'haifa_office' && 'You are at Haifa office'}
          {locationInfo?.location === 'unknown' && 'Choose your destination'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {locationInfo?.show_destinations ? (
          <>
            <TouchableOpacity
              style={styles.destinationButton}
              onPress={() => handleDestinationSelect('TLV')}
            >
              <Text style={styles.buttonText}>TLV Office</Text>
              <Text style={styles.buttonSubtext}>Tel Aviv - Givatayim</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.destinationButton}
              onPress={() => handleDestinationSelect('Haifa')}
            >
              <Text style={styles.buttonText}>Haifa Office</Text>
              <Text style={styles.buttonSubtext}>IBM R&D Labs</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleGoHome}
          >
            <Text style={styles.buttonText}>Go Home</Text>
            <Text style={styles.buttonSubtext}>Back to Klachim 249</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={detectCurrentLocation}
      >
        <Text style={styles.refreshText}>Refresh Location</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  destinationButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  homeButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
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
});