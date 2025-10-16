/**
 * Journey planner that calculates complete travel times and options
 * Ported from Python backend
 */

import { TrainService, TrainRoute } from './TrainService';
import { Stations } from './Stations';
import { 
  HOME, 
  TLV_OFFICE, 
  HAIFA_OFFICE, 
  TRAIN_STATIONS, 
  DESTINATION_STATIONS,
  TrainStation,
  Destination 
} from './Locations';

export interface JourneyOption {
  departure_station: string;
  leave_time: Date;
  train_departure: Date;
  train_arrival: Date;
  final_arrival: Date;
  total_duration_minutes: number;
  drive_time_minutes: number;
  train_duration_minutes: number;
  final_transport_minutes: number;
  is_direct: boolean;
  train_number?: string;
  departure_platform?: string;
}

export type SortBy = 'leave_time' | 'arrival_time';

export class JourneyPlanner {
  private trainService: TrainService;

  constructor() {
    const stations = new Stations();
    this.trainService = new TrainService(stations);
  }

  async planJourneyFromHome(
    destination: string,
    arrivalTime: Date,
    timeWindowHours: number = 3,
    sortBy: SortBy = 'arrival_time'
  ): Promise<JourneyOption[]> {
    const destinationInfo = destination === 'TLV' ? TLV_OFFICE : HAIFA_OFFICE;
    const targetStation = DESTINATION_STATIONS[`${destination} Office`];

    const allOptions: JourneyOption[] = [];

    // Check routes from each of the 3 stations
    for (const station of TRAIN_STATIONS) {
      // Get train routes for the time window
      // Subtract walk time from arrival time to get the required train arrival time
      const requiredTrainArrival = new Date(
        arrivalTime.getTime() - destinationInfo.walk_or_transport_minutes * 60000
      );

      const routes = await this.getRoutesInWindow(
        station.name,
        targetStation,
        requiredTrainArrival,
        timeWindowHours,
        true // search backwards
      );

      // Convert each route to a complete journey option
      for (const route of routes) {
        const option = this.createJourneyOptionFromHome(station, route, destinationInfo);
        // Only include if final arrival is before desired time
        if (option && option.final_arrival <= arrivalTime) {
          allOptions.push(option);
        }
      }
    }

    // Sort based on preference
    if (sortBy === 'arrival_time') {
      // Latest arrival first (so you can take the latest train)
      allOptions.sort((a, b) => b.final_arrival.getTime() - a.final_arrival.getTime());
    } else {
      // Latest leave time first (so you can leave as late as possible)
      allOptions.sort((a, b) => b.leave_time.getTime() - a.leave_time.getTime());
    }
    return allOptions;
  }

  async planJourneyFromHomeForward(
    destination: string,
    departureTime: Date,
    timeWindowHours: number = 12,
    sortBy: SortBy = 'leave_time'
  ): Promise<JourneyOption[]> {
    const destinationInfo = destination === 'TLV' ? TLV_OFFICE : HAIFA_OFFICE;
    const targetStation = DESTINATION_STATIONS[`${destination} Office`];
    
    const allOptions: JourneyOption[] = [];
    
    // Check routes from each of the 3 stations
    for (const station of TRAIN_STATIONS) {
      // Get train routes starting from departure time
      const routes = await this.getRoutesInWindow(
        station.name,
        targetStation,
        departureTime,
        timeWindowHours,
        false // search forwards
      );
      
      // Convert each route to a complete journey option
      for (const route of routes) {
        // Calculate when to leave home to catch this train
        const leaveHomeTime = new Date(
          route.departure_time.getTime() - 
          (station.drive_time_minutes + station.parking_and_walk_minutes + 15) * 60000
        );
        
        // Only include if we can still make this train
        if (leaveHomeTime >= departureTime) {
          const option = this.createJourneyOptionFromHome(station, route, destinationInfo);
          if (option) {
            allOptions.push(option);
          }
        }
      }
    }
    
    // Sort based on preference
    if (sortBy === 'arrival_time') {
      // Earliest arrival first
      allOptions.sort((a, b) => a.final_arrival.getTime() - b.final_arrival.getTime());
    } else {
      // Latest leave time first (so you can leave as late as possible)
      allOptions.sort((a, b) => b.leave_time.getTime() - a.leave_time.getTime());
    }
    return allOptions;
  }

  async planJourneyToHome(
    fromLocation: string,
    departureStation: string,
    departureTime: Date,
    timeWindowHours: number = 3,
    sortBy: SortBy = 'arrival_time'
  ): Promise<JourneyOption[]> {
    // Find the station info
    const stationInfo = TRAIN_STATIONS.find(s => s.name === departureStation);
    if (!stationInfo) {
      return [];
    }
    
    // Get walk time to station from office
    let officeToStationMinutes: number;
    let sourceStation: string;
    
    if (fromLocation === 'TLV') {
      officeToStationMinutes = TLV_OFFICE.walk_or_transport_minutes;
      sourceStation = DESTINATION_STATIONS['TLV Office'];
    } else { // Haifa
      officeToStationMinutes = HAIFA_OFFICE.walk_or_transport_minutes;
      sourceStation = DESTINATION_STATIONS['Haifa Office'];
    }
    
    // Get train routes
    const routes = await this.getRoutesInWindow(
      sourceStation,
      departureStation,
      departureTime,
      timeWindowHours,
      false // search forwards
    );
    
    const allOptions: JourneyOption[] = [];
    for (const route of routes) {
      const option = this.createJourneyOptionToHome(stationInfo, route, officeToStationMinutes);
      if (option) {
        allOptions.push(option);
      }
    }

    // Sort based on preference
    if (sortBy === 'arrival_time') {
      // Earliest arrival first (get home sooner)
      allOptions.sort((a, b) => a.final_arrival.getTime() - b.final_arrival.getTime());
    } else {
      // Latest leave time first (so you can leave office as late as possible)
      allOptions.sort((a, b) => b.leave_time.getTime() - a.leave_time.getTime());
    }
    return allOptions;
  }

  private async getRoutesInWindow(
    fromStation: string,
    toStation: string,
    referenceTime: Date,
    windowHours: number,
    searchBackwards: boolean = false
  ): Promise<TrainRoute[]> {
    // Make single API call for the day
    const allRoutes = await this.trainService.searchRoutes(
      fromStation,
      toStation,
      referenceTime,
      false // Get all routes (direct and non-direct) so frontend can filter
    );
    
    // Filter results client-side based on time window
    const filteredRoutes: TrainRoute[] = [];
    
    if (searchBackwards) {
      // For arrival time planning, find trains that arrive before reference time
      const startTime = new Date(referenceTime.getTime() - windowHours * 60 * 60 * 1000);
      console.log(`Backwards search: looking for arrivals between ${startTime} and ${referenceTime}`);
      
      for (const route of allRoutes) {
        console.log(`Checking route: depart=${route.departure_time}, arrive=${route.arrival_time}`);
        if (route.arrival_time >= startTime && route.arrival_time <= referenceTime) {
          filteredRoutes.push(route);
          console.log('Route INCLUDED');
        } else {
          console.log(`Route filtered out - arrival ${route.arrival_time} not in window`);
        }
      }
    } else {
      // For departure time planning, find trains that depart after reference time
      const endTime = new Date(referenceTime.getTime() + windowHours * 60 * 60 * 1000);
      console.log(`Forward search: looking for departures between ${referenceTime} and ${endTime}`);
      
      for (const route of allRoutes) {
        console.log(`Checking route: depart=${route.departure_time}, arrive=${route.arrival_time}`);
        if (route.departure_time >= referenceTime && route.departure_time <= endTime) {
          filteredRoutes.push(route);
          console.log('Route INCLUDED');
        } else {
          console.log(`Route filtered out - departure ${route.departure_time} not in window`);
        }
      }
    }
    
    console.log(`Filtered ${allRoutes.length} routes down to ${filteredRoutes.length} routes`);
    return filteredRoutes;
  }

  private createJourneyOptionFromHome(
    station: TrainStation,
    route: TrainRoute,
    destinationInfo: Destination
  ): JourneyOption | null {
    try {
      // Calculate when to leave home
      const totalPreTrainTime = station.drive_time_minutes + station.parking_and_walk_minutes;
      const leaveTime = new Date(route.departure_time.getTime() - totalPreTrainTime * 60000);
      
      // Calculate final arrival (train arrival + walk/transport to office)
      const finalArrival = new Date(
        route.arrival_time.getTime() + destinationInfo.walk_or_transport_minutes * 60000
      );
      
      // Calculate total duration
      const totalDuration = Math.floor((finalArrival.getTime() - leaveTime.getTime()) / 60000);
      
      return {
        departure_station: station.name,
        leave_time: leaveTime,
        train_departure: route.departure_time,
        train_arrival: route.arrival_time,
        final_arrival: finalArrival,
        total_duration_minutes: totalDuration,
        drive_time_minutes: station.drive_time_minutes,
        train_duration_minutes: route.duration_minutes,
        final_transport_minutes: destinationInfo.walk_or_transport_minutes,
        is_direct: route.is_direct,
        train_number: route.train_number,
        departure_platform: route.departure_platform
      };
    } catch (error) {
      console.error('Error creating journey option:', error);
      return null;
    }
  }

  private createJourneyOptionToHome(
    station: TrainStation,
    route: TrainRoute,
    officeToStationMinutes: number
  ): JourneyOption | null {
    try {
      // Calculate when to leave office (add 10 min buffer for return trips)
      const bufferMinutes = 10;
      const leaveTime = new Date(route.departure_time.getTime() - (officeToStationMinutes + bufferMinutes) * 60000);
      
      // Calculate final arrival (train arrival + drive home from station)
      const finalArrival = new Date(
        route.arrival_time.getTime() + station.drive_time_minutes * 60000
      );
      
      // Calculate total duration
      const totalDuration = Math.floor((finalArrival.getTime() - leaveTime.getTime()) / 60000);
      
      return {
        departure_station: station.name,
        leave_time: leaveTime,
        train_departure: route.departure_time,
        train_arrival: route.arrival_time,
        final_arrival: finalArrival,
        total_duration_minutes: totalDuration,
        drive_time_minutes: station.drive_time_minutes,
        train_duration_minutes: route.duration_minutes,
        final_transport_minutes: officeToStationMinutes,
        is_direct: route.is_direct,
        train_number: route.train_number,
        departure_platform: route.departure_platform
      };
    } catch (error) {
      console.error('Error creating return journey option:', error);
      return null;
    }
  }
}