import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { DestinationScreen } from '../screens/DestinationScreen';
import { TimingScreen } from '../screens/TimingScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import ActiveReminderScreen from '../screens/ActiveReminderScreen';
import { Destination, Timing, Station } from '../types';
import { notificationService } from '../services/NotificationService';

type Screen = 'location' | 'destination' | 'timing' | 'results' | 'active-reminder';

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
  activeReminder?: {
    trainNumber: string;
    departureStation: string;
    departureTime: Date;
    leaveTime: Date;
    notificationId: string;
    notificationTime: Date;
  } | null;
}

export const MainNavigator: React.FC = () => {
  const [navState, setNavState] = useState<NavigationState>({
    currentScreen: 'location',
  });

  // Check for active reminder on mount or when notification is pressed
  useEffect(() => {
    const checkActiveReminder = async () => {
      console.log('[GetTrain] Checking for active reminder or notification press...');

      // Check if app was opened by tapping notification (when app was killed)
      const initialNotification = await notificationService.checkInitialNotification();
      console.log('[GetTrain] Initial notification check:', initialNotification);

      // Check if app was opened by tapping notification (flag-based)
      const notificationPressed = await notificationService.wasNotificationPressed();
      console.log('[GetTrain] Notification pressed flag:', notificationPressed);

      const reminder = await notificationService.getActiveReminder();
      console.log('[GetTrain] Active reminder:', reminder ? 'Found' : 'None');

      if (reminder && (initialNotification || notificationPressed)) {
        console.log('[GetTrain] >>> Navigating to reminder screen (notification tapped)');
        setNavState({
          currentScreen: 'active-reminder',
          activeReminder: reminder,
        });
      } else if (reminder) {
        console.log('[GetTrain] >>> Navigating to reminder screen (app opened normally)');
        setNavState({
          currentScreen: 'active-reminder',
          activeReminder: reminder,
        });
      } else if (notificationPressed || initialNotification) {
        console.log('[GetTrain] Notification was pressed but no active reminder found');
      }
    };

    checkActiveReminder();

    // Also listen for when app comes to foreground
    const interval = setInterval(async () => {
      const notificationPressed = await notificationService.wasNotificationPressed();
      if (notificationPressed) {
        const reminder = await notificationService.getActiveReminder();
        if (reminder) {
          console.log('[GetTrain] >>> Notification pressed, showing reminder screen');
          setNavState({
            currentScreen: 'active-reminder',
            activeReminder: reminder,
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  const handleReminderCancel = () => {
    setNavState({ currentScreen: 'location' });
  };

  const handleReminderContinue = () => {
    setNavState({ currentScreen: 'location' });
  };

  const renderCurrentScreen = () => {
    switch (navState.currentScreen) {
      case 'active-reminder':
        if (!navState.activeReminder) {
          // Fallback to location screen if no reminder
          return (
            <HomeScreen
              onLocationSelected={navigateToDestination}
            />
          );
        }
        return (
          <ActiveReminderScreen
            reminder={navState.activeReminder}
            onCancel={handleReminderCancel}
            onContinue={handleReminderContinue}
          />
        );

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