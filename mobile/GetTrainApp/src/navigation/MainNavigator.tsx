import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { DestinationScreen } from '../screens/DestinationScreen';
import { TimingScreen } from '../screens/TimingScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { Destination, Timing, Station } from '../types';

type Screen = 'location' | 'destination' | 'timing' | 'results';

interface NavigationState {
  currentScreen: Screen;
  currentLocation?: string; // 'home', 'tel_aviv', 'haifa'
  destination?: Destination;
  timing?: Timing;
  selectedTime?: Date;
  isReturnTrip?: boolean;
  fromLocation?: Destination;
  parkedStation?: Station;
  rememberedStation?: Station;
}

export const MainNavigator: React.FC = () => {
  const [navState, setNavState] = useState<NavigationState>({
    currentScreen: 'location',
  });

  const navigateToDestination = (location: string) => {
    // Get remembered station for return trips
    const rememberedStation = getRememberedStation();
    
    setNavState({
      currentScreen: 'destination',
      currentLocation: location,
      rememberedStation: location !== 'home' ? rememberedStation : undefined,
    });
  };

  const navigateToTiming = (destination: Destination) => {
    console.log('=== NAVIGATION DEBUG ===');
    console.log('Going to timing with destination:', destination);
    console.log('Current location:', navState.currentLocation);
    console.log('Is return trip: false');
    
    setNavState({
      ...navState,
      currentScreen: 'timing',
      destination,
      isReturnTrip: false,
    });
  };

  const navigateToReturnTiming = () => {
    const fromLocation = navState.currentLocation === 'tel_aviv' ? 'TLV' : 'Haifa';
    const parkedStation = navState.rememberedStation || 'Netivot';
    
    console.log('=== RETURN TRIP DEBUG ===');
    console.log('From location:', fromLocation);
    console.log('Parked station:', parkedStation);
    console.log('Current location:', navState.currentLocation);
    console.log('Is return trip: true');
    
    setNavState({
      ...navState,
      currentScreen: 'timing',
      isReturnTrip: true,
      fromLocation: fromLocation as Destination,
      parkedStation: parkedStation as Station,
    });
  };

  // Simple in-memory storage for today's station (in real app, use AsyncStorage)
  const [todaysStation, setTodaysStation] = useState<Station | null>(null);
  
  const getRememberedStation = (): Station | undefined => {
    return todaysStation || undefined;
  };

  const rememberStation = (station: Station) => {
    setTodaysStation(station);
  };

  const navigateToResults = (timing: Timing, selectedTime?: Date) => {
    setNavState({
      ...navState,
      currentScreen: 'results',
      timing,
      selectedTime,
    });
  };

  const navigateBack = () => {
    if (navState.currentScreen === 'destination') {
      setNavState({ currentScreen: 'location' });
    } else if (navState.currentScreen === 'timing') {
      setNavState({
        ...navState,
        currentScreen: 'destination',
      });
    } else if (navState.currentScreen === 'results') {
      setNavState({
        ...navState,
        currentScreen: 'timing',
      });
    }
  };

  const resetToHome = () => {
    setNavState({ currentScreen: 'location' });
  };

  const renderCurrentScreen = () => {
    switch (navState.currentScreen) {
      case 'location':
        return (
          <HomeScreen
            onLocationSelected={navigateToDestination}
          />
        );

      case 'destination':
        return (
          <DestinationScreen
            currentLocation={navState.currentLocation!}
            onSelectDestination={navigateToTiming}
            onGoHome={navigateToReturnTiming}
            onBack={navigateBack}
            rememberedStation={navState.rememberedStation}
          />
        );

      case 'timing':
        return (
          <TimingScreen
            destination={navState.destination}
            isReturnTrip={navState.isReturnTrip}
            onContinue={navigateToResults}
            onBack={navigateBack}
          />
        );

      case 'results':
        return (
          <ResultsScreen
            destination={navState.destination}
            timing={navState.timing!}
            selectedTime={navState.selectedTime}
            isReturnTrip={navState.isReturnTrip}
            fromLocation={navState.fromLocation}
            parkedStation={navState.parkedStation}
            onBack={navigateBack}
          />
        );

      default:
        return (
          <HomeScreen
            onLocationSelected={navigateToDestination}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});