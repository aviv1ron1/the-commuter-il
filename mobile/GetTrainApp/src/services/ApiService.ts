import { Location, LocationInfo, JourneyResponse, Destination, Timing, Station } from '../types';
import { JourneyPlanner, JourneyOption } from './JourneyPlanner';
import { 
  HOME, 
  TLV_OFFICE, 
  HAIFA_OFFICE, 
  TRAIN_STATIONS, 
  calculateDistance, 
  isAtLocation 
} from './Locations';

class ApiService {
  private journeyPlanner: JourneyPlanner;

  constructor() {
    this.journeyPlanner = new JourneyPlanner();
  }

  async detectLocation(location: Location): Promise<LocationInfo> {
    try {
      const currentCoords: [number, number] = [location.latitude, location.longitude];
      
      // Check if at home
      if (isAtLocation(currentCoords, HOME)) {
        return {
          location: 'home',
          show_destinations: true,
        };
      }
      
      // Check if at TLV office
      if (isAtLocation(currentCoords, TLV_OFFICE)) {
        return {
          location: 'tlv_office',
          show_destinations: false,
          return_destination: 'TLV',
        };
      }
      
      // Check if at Haifa office
      if (isAtLocation(currentCoords, HAIFA_OFFICE)) {
        return {
          location: 'haifa_office',
          show_destinations: false,
          return_destination: 'Haifa',
        };
      }
      
      // Unknown location - show destinations
      return {
        location: 'unknown',
        show_destinations: true,
      };
    } catch (error) {
      console.error('Error detecting location:', error);
      // Fallback to show destinations if detection fails
      return {
        location: 'unknown',
        show_destinations: true,
      };
    }
  }

  async planJourney(
    destination: Destination,
    timing: Timing,
    arrivalTime?: Date,
    currentLocation?: Location
  ): Promise<JourneyResponse> {
    try {
      let journeyOptions: JourneyOption[];
      
      if (timing === 'now') {
        // Plan forward from current time
        journeyOptions = await this.journeyPlanner.planJourneyFromHomeForward(
          destination,
          new Date()
        );
      } else {
        // Plan backward from arrival time
        if (!arrivalTime) {
          throw new Error('Arrival time required for "later" timing');
        }
        journeyOptions = await this.journeyPlanner.planJourneyFromHome(
          destination,
          arrivalTime
        );
      }
      
      // Convert to API response format
      return {
        destination: destination,
        reference_time: timing === 'now' ? new Date().toISOString() : arrivalTime!.toISOString(),
        options: journeyOptions.map(this.convertJourneyOption)
      };
    } catch (error) {
      console.error('Error planning journey:', error);
      throw error;
    }
  }

  async planReturnJourney(
    fromLocation: Destination,
    parkedStation: Station,
    timing: Timing,
    departureTime?: Date
  ): Promise<JourneyResponse> {
    try {
      // Convert station name to match our internal naming
      let stationName = parkedStation;
      if (parkedStation === 'Lehavim') {
        stationName = 'Lehavim-Rahat';
      }
      
      let journeyOptions: JourneyOption[];
      
      if (timing === 'now') {
        // Plan forward from current time
        journeyOptions = await this.journeyPlanner.planJourneyToHome(
          fromLocation,
          stationName,
          new Date()
        );
      } else {
        // Plan forward from departure time
        if (!departureTime) {
          throw new Error('Departure time required for "later" timing');
        }
        journeyOptions = await this.journeyPlanner.planJourneyToHome(
          fromLocation,
          stationName,
          departureTime
        );
      }
      
      // Convert to API response format
      return {
        from_location: fromLocation,
        parked_station: parkedStation,
        reference_time: timing === 'now' ? new Date().toISOString() : departureTime!.toISOString(),
        options: journeyOptions.map(this.convertJourneyOption)
      };
    } catch (error) {
      console.error('Error planning return journey:', error);
      throw error;
    }
  }

  async getStations(): Promise<{stations: Array<{name: string, drive_time: number}>}> {
    try {
      // Return our hardcoded train stations
      return {
        stations: TRAIN_STATIONS.map(station => ({
          name: station.name === 'Lehavim-Rahat' ? 'Lehavim' : station.name, // Convert back for UI compatibility
          drive_time: station.drive_time_minutes
        }))
      };
    } catch (error) {
      console.error('Error getting stations:', error);
      // Return fallback stations
      return {
        stations: [
          { name: 'Netivot', drive_time: 20 },
          { name: 'Kiryat Gat', drive_time: 30 },
          { name: 'Lehavim', drive_time: 20 },
        ],
      };
    }
  }

  private convertJourneyOption(option: JourneyOption) {
    return {
      departure_station: option.departure_station,
      leave_time: option.leave_time.toISOString(),
      train_departure: option.train_departure.toISOString(),
      train_arrival: option.train_arrival.toISOString(),
      final_arrival: option.final_arrival.toISOString(),
      total_duration_minutes: option.total_duration_minutes,
      drive_time_minutes: option.drive_time_minutes,
      train_duration_minutes: option.train_duration_minutes,
      final_transport_minutes: option.final_transport_minutes,
      is_direct: option.is_direct,
      train_number: option.train_number,
      departure_platform: option.departure_platform
    };
  }
}

export const apiService = new ApiService();