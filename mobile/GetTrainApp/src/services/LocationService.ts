import { Location } from '../types';
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export class LocationService {
  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // First check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        console.log('Location permission already granted:', hasPermission);
        
        if (hasPermission) {
          return true;
        }
        
        // If not granted, request it
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
        
        console.log('Permission request result:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission error:', err);
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
      console.log('Location permission denied');
      throw new Error('Location permission denied');
    }

    // Try high accuracy first (GPS), then fallback to network location
    try {
      console.log('Trying high accuracy GPS location...');
      return await this.getLocationWithOptions({
        enableHighAccuracy: true,
        timeout: 20000, // 20 seconds for GPS
        maximumAge: 60000, // 1 minute cache
      });
    } catch (error) {
      console.log('GPS failed, trying network location...', error.message);
      
      try {
        return await this.getLocationWithOptions({
          enableHighAccuracy: false, // Use network/WiFi location
          timeout: 10000, // 10 seconds for network
          maximumAge: 300000, // 5 minute cache for network location
        });
      } catch (networkError) {
        console.error('Both GPS and network location failed');
        throw new Error(`Failed to get location: ${networkError.message}`);
      }
    }
  }

  private getLocationWithOptions(options: any): Promise<Location> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained:', position.coords.latitude, position.coords.longitude, 'accuracy:', position.coords.accuracy);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`${error.message}`));
        },
        options
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