import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { TimingScreen } from '../screens/TimingScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { Destination, Timing, Station } from '../types';

type Screen = 'home' | 'timing' | 'results';

interface NavigationState {
  currentScreen: Screen;
  destination?: Destination;
  timing?: Timing;
  selectedTime?: Date;
  isReturnTrip?: boolean;
  fromLocation?: Destination;
  parkedStation?: Station;
}

export const MainNavigator: React.FC = () => {
  const [navState, setNavState] = useState<NavigationState>({
    currentScreen: 'home',
  });

  const navigateToTiming = (destination: Destination) => {
    setNavState({
      currentScreen: 'timing',
      destination,
      isReturnTrip: false,
    });
  };

  const navigateToReturnTiming = () => {
    // For now, we'll assume the user parked at Netivot
    // In a real app, you'd remember where they parked or ask them
    setNavState({
      currentScreen: 'timing',
      isReturnTrip: true,
      fromLocation: 'TLV', // This would be determined by location detection
      parkedStation: 'Netivot', // This would be remembered from the morning trip
    });
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
    if (navState.currentScreen === 'timing') {
      setNavState({ currentScreen: 'home' });
    } else if (navState.currentScreen === 'results') {
      setNavState({
        ...navState,
        currentScreen: 'timing',
      });
    }
  };

  const resetToHome = () => {
    setNavState({ currentScreen: 'home' });
  };

  const renderCurrentScreen = () => {
    switch (navState.currentScreen) {
      case 'home':
        return (
          <HomeScreen
            onSelectDestination={navigateToTiming}
            onGoHome={navigateToReturnTiming}
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
            onSelectDestination={navigateToTiming}
            onGoHome={navigateToReturnTiming}
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