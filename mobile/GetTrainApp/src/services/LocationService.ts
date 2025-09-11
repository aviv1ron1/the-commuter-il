import { Location } from '../types';
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export class LocationService {
  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'GetTrain needs access to your location to provide context-aware train schedules.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      // iOS
      const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return result === RESULTS.GRANTED;
    }
  }

  async getCurrentLocation(): Promise<Location> {
    const hasPermission = await this.requestLocationPermission();
    
    if (!hasPermission) {
      console.log('Location permission denied, using fallback location');
      // Return home location as fallback
      return {
        latitude: 31.445083,
        longitude: 34.673111,
      };
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Return home location as fallback (Klachim 249)
          resolve({
            latitude: 31.445083,
            longitude: 34.673111,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    });
  }

  async watchLocation(callback: (location: Location) => void): Promise<number> {
    return new Promise((resolve, reject) => {
      const watchId = Geolocation.watchPosition(
        (position) => {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error watching location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );

      resolve(watchId);
    });
  }

  clearWatch(watchId: number): void {
    Geolocation.clearWatch(watchId);
  }
}

export const locationService = new LocationService();