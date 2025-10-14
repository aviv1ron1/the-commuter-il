import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Destination, Station } from '../types';
import { TRAIN_STATIONS } from '../services/Locations';

interface Props {
  currentLocation: string; // 'home', 'tel_aviv', 'haifa'
  onSelectDestination: (destination: Destination) => void;
  onGoHome: () => void;
  onBack: () => void;
  rememberedStation?: Station; // For return trips
}

export const DestinationScreen: React.FC<Props> = ({ 
  currentLocation, 
  onSelectDestination, 
  onGoHome, 
  onBack,
  rememberedStation 
}) => {
  const insets = useSafeAreaInsets();
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);

  useEffect(() => {
    // Auto-select remembered station for return trips
    if (currentLocation !== 'home' && rememberedStation) {
      setSelectedDestination(rememberedStation);
      // Auto-proceed after a brief moment to show the selection
      setTimeout(() => {
        onGoHome();
      }, 1000);
    }
  }, [currentLocation, rememberedStation, onGoHome]);

  const handleDestinationSelect = (destination: string) => {
    setSelectedDestination(destination);
    
    if (currentLocation === 'home') {
      // Going to office
      onSelectDestination(destination as Destination);
    } else {
      // Going home from office
      onGoHome();
    }
  };

  const renderOfficeButtons = () => (
    <>
      <TouchableOpacity
        style={[
          styles.destinationButton,
          selectedDestination === 'TLV' && styles.destinationButtonSelected
        ]}
        onPress={() => handleDestinationSelect('TLV')}
      >
        <Text style={[
          styles.buttonText,
          selectedDestination === 'TLV' && styles.buttonTextSelected
        ]}>🏢 TLV Office</Text>
        <Text style={styles.buttonSubtext}>Tel Aviv - Givatayim</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.destinationButton,
          selectedDestination === 'Haifa' && styles.destinationButtonSelected
        ]}
        onPress={() => handleDestinationSelect('Haifa')}
      >
        <Text style={[
          styles.buttonText,
          selectedDestination === 'Haifa' && styles.buttonTextSelected
        ]}>🏢 Haifa Office</Text>
        <Text style={styles.buttonSubtext}>IBM R&D Labs</Text>
      </TouchableOpacity>
    </>
  );

  const renderStationButtons = () => (
    <>
      {TRAIN_STATIONS.map((station) => {
        const stationName = station.name === 'Lehavim-Rahat' ? 'Lehavim' : station.name;
        const isSelected = selectedDestination === stationName;
        const isRemembered = rememberedStation === stationName;
        
        return (
          <TouchableOpacity
            key={station.name}
            style={[
              styles.destinationButton,
              isSelected && styles.destinationButtonSelected,
              isRemembered && styles.rememberedStation
            ]}
            onPress={() => handleDestinationSelect(stationName)}
          >
            <Text style={[
              styles.buttonText,
              isSelected && styles.buttonTextSelected
            ]}>
              🚂 {stationName}
              {isRemembered && ' ⭐'}
            </Text>
            <Text style={styles.buttonSubtext}>
              {station.drive_time_minutes} min drive
              {isRemembered && ' • Remembered from today'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </>
  );

  const getLocationTitle = () => {
    switch (currentLocation) {
      case 'home':
        return 'From Home 🏠';
      case 'tel_aviv':
        return 'From TLV Office 🏢';
      case 'haifa':
        return 'From Haifa Office 🏢';
      default:
        return 'Choose Destination';
    }
  };

  const getSubtitle = () => {
    if (currentLocation === 'home') {
      return 'Which office are you going to?';
    } else {
      return 'Which station did you park at?';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>{getLocationTitle()}</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>
        
        {rememberedStation && currentLocation !== 'home' && (
          <Text style={styles.rememberedText}>
            ⭐ Auto-selecting {rememberedStation} (remembered from today)
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {currentLocation === 'home' ? renderOfficeButtons() : renderStationButtons()}
      </View>
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
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
    textAlign: 'center',
  },
  rememberedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  destinationButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  destinationButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  rememberedStation: {
    borderColor: '#34C759',
    backgroundColor: '#f0fff4',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  buttonTextSelected: {
    color: 'white',
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});