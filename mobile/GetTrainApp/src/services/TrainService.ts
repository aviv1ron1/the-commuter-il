/**
 * Train service for direct Israel Railway API integration
 * Ported from Python backend
 */

import { Stations } from './Stations';

export interface TrainRoute {
  departure_station: string;
  arrival_station: string;
  departure_time: Date;
  arrival_time: Date;
  duration_minutes: number;
  is_direct: boolean;
  train_number?: string;
  departure_platform?: string;
}

export class TrainService {
  private apiBase = 'https://rail-api.rail.co.il/rjpa/api/v1';
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'ocp-apim-subscription-key': '5e64d66cf03f4547bcac5de2de06b566',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  constructor(private stations: Stations) {}

  async searchRoutes(
    fromStation: string,
    toStation: string,
    departureTime: Date,
    directOnly: boolean = false
  ): Promise<TrainRoute[]> {
    const stations = this.stations.getMyStations();
    
    const fromId = stations[fromStation];
    const toId = stations[toStation];
    
    if (!fromId || !toId) {
      console.error(`Station not found: ${fromStation} -> ${toStation}`);
      return [];
    }

    try {
      const dateStr = departureTime.toISOString().split('T')[0];
      const timeStr = departureTime.toTimeString().slice(0, 5);
      
      const params = new URLSearchParams({
        fromStation: fromId.toString(),
        toStation: toId.toString(),
        date: dateStr,
        hour: timeStr,
        scheduleType: '1',
        systemType: '2',
        languageId: 'English'
      });

      const url = `${this.apiBase}/timetable/searchTrainLuzForDateTime?${params}`;
      console.log('Requesting rail API:', url);
      
      const response = await fetch(url, { headers: this.headers });
      console.log('Rail API response status:', response.status);
      
      if (!response.ok) {
        console.error('Rail API failed with', response.status);
        return [];
      }
        
      const data = await response.json();
      console.log('Rail API response type:', typeof data);
      
      const routes: TrainRoute[] = [];
      let routeList: any[] = [];
      
      if (typeof data === 'object' && data) {
        if (data.result && data.result.travels) {
          routeList = data.result.travels;
          console.log(`Found ${routeList.length} travels in result.travels`);
        } else {
          routeList = data.travels || data.routes || data.Routes || [];
          console.log(`Found ${routeList.length} routes in fallback structure`);
        }
      }
      
      for (let i = 0; i < routeList.length; i++) {
        console.log(`Processing route ${i + 1}/${routeList.length}`);
        const route = this.parseNewApiRoute(routeList[i], directOnly);
        if (route) {
          console.log(`Successfully parsed route: ${route.departure_station} -> ${route.arrival_station}`);
          routes.push(route);
        }
      }
      
      console.log(`Successfully parsed ${routes.length} out of ${routeList.length} routes`);
      return routes.slice(0, 10); // Limit to 10 results
      
    } catch (error) {
      console.error('Error searching routes:', error);
      return [];
    }
  }

  private parseNewApiRoute(routeData: any, directOnly: boolean): TrainRoute | null {
    try {
      // Get departure and arrival times
      const departureTimeStr = routeData.departureTime;
      const arrivalTimeStr = routeData.arrivalTime;
      
      // Station names are in the trains array
      let departureStation = 'Unknown';
      let arrivalStation = 'Unknown';
      let trainNumber: string | undefined;
      let departurePlatform: string | undefined;
      
      const trains = routeData.trains || [];
      const isDirectRoute = trains.length === 1;
      
      if (trains.length > 0) {
        // First train has departure station ID
        const firstTrain = trains[0];
        const departureStationId = (
          firstTrain.orignStation || 
          firstTrain.originStation || 
          firstTrain.fromStationId
        );
        
        if (departureStationId) {
          departureStation = this.stations.getStationNameFromId(departureStationId);
        }
        
        // Extract train number and departure platform
        trainNumber = firstTrain.trainNumber;
        departurePlatform = firstTrain.platform;
        
        // Last train has arrival station ID
        const lastTrain = trains[trains.length - 1];
        const arrivalStationId = (
          lastTrain.destinationStation || 
          lastTrain.arrivalStation || 
          lastTrain.toStationId
        );
        
        if (arrivalStationId) {
          arrivalStation = this.stations.getStationNameFromId(arrivalStationId);
        }
      }
      
      console.log(`Extracted: dep=${departureTimeStr}, arr=${arrivalTimeStr}, from=${departureStation}, to=${arrivalStation}`);
      
      if (!departureTimeStr || !arrivalTimeStr) {
        console.log('Missing time fields in API route data');
        return null;
      }
      
      // Parse time
      let departureTime: Date;
      let arrivalTime: Date;
      
      try {
        // Try full datetime ISO format first
        departureTime = new Date(departureTimeStr.replace('Z', '+00:00'));
        if (departureTime.toString() === 'Invalid Date') throw new Error('Invalid date');
        
        arrivalTime = new Date(arrivalTimeStr.replace('Z', '+00:00'));
        if (arrivalTime.toString() === 'Invalid Date') throw new Error('Invalid date');
      } catch {
        try {
          // Try HH:MM format
          const today = new Date();
          const [depHours, depMinutes] = departureTimeStr.split(':').map(Number);
          const [arrHours, arrMinutes] = arrivalTimeStr.split(':').map(Number);
          
          departureTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), depHours, depMinutes);
          arrivalTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), arrHours, arrMinutes);
          
          // Handle next day arrivals
          if (arrivalTime < departureTime) {
            arrivalTime.setDate(arrivalTime.getDate() + 1);
          }
        } catch {
          console.log(`Could not parse time formats: ${departureTimeStr}, ${arrivalTimeStr}`);
          return null;
        }
      }
      
      if (!departureTime || !arrivalTime) {
        return null;
      }
        
      const duration = Math.floor((arrivalTime.getTime() - departureTime.getTime()) / 60000);
      
      // Log suspicious short durations
      if (duration < 20) {
        console.warn(`Suspiciously short train duration: ${duration}m from ${departureStation} to ${arrivalStation}`);
      }
      
      return {
        departure_station: departureStation || 'Unknown',
        arrival_station: arrivalStation || 'Unknown',
        departure_time: departureTime,
        arrival_time: arrivalTime,
        duration_minutes: duration,
        is_direct: isDirectRoute,
        train_number: trainNumber,
        departure_platform: departurePlatform
      };
      
    } catch (error) {
      console.error('Error parsing API route:', error);
      return null;
    }
  }
}