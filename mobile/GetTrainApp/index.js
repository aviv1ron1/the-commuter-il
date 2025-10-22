/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom logger to show "GetTrain" instead of "ReactNative" in logs
if (__DEV__) {
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleInfo = console.info;
  const originalConsoleDebug = console.debug;

  console.log = (...args) => {
    originalConsoleLog('[GetTrain]', ...args);
  };

  console.warn = (...args) => {
    originalConsoleWarn('[GetTrain]', ...args);
  };

  console.error = (...args) => {
    originalConsoleError('[GetTrain]', ...args);
  };

  console.info = (...args) => {
    originalConsoleInfo('[GetTrain]', ...args);
  };

  console.debug = (...args) => {
    originalConsoleDebug('[GetTrain]', ...args);
  };
}

// Register background handler for notifications
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('[GetTrain] Background notification event:', type);
  if (type === EventType.PRESS) {
    console.log('[GetTrain] Notification pressed in background');
    try {
      await AsyncStorage.setItem('@notification_pressed', 'true');
      console.log('[GetTrain] Marked notification as pressed');
    } catch (error) {
      console.error('[GetTrain] Error marking notification pressed:', error);
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
