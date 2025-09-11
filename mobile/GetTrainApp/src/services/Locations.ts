/**
 * Location data and calculations for the GetTrain app
 * Ported from Python backend
 */

export interface Location {
  name: string;
  coordinates: [number, number]; // [latitude, longitude]
}

export interface TrainStation {
  name: string;
  coordinates: [number, number];
  drive_time_minutes: number;
  parking_and_walk_minutes: number;
}

export interface Destination {
  name: string;
  coordinates: [number, number];
  train_station: string;
  walk_or_transport_minutes: number;
}

// Home location
export const HOME: Location = {
  name: 'Home',
  coordinates: [31.445083, 34.673111] // Klachim 249
};

// Office locations
export const TLV_OFFICE: Destination = {
  name: 'TLV Office',
  coordinates: [32.080028, 34.799806], // Ariel Sharon 4, Givatayim
  train_station: 'Tel Aviv-Savidor Center',
  walk_or_transport_minutes: 10
};

export const HAIFA_OFFICE: Destination = {
  name: 'Haifa Office', 
  coordinates: [32.765122, 35.015306], // IBM R&D Labs, University of Haifa
  train_station: 'Haifa-Hof HaKarmel (Razi`el)',
  walk_or_transport_minutes: 30 // taxi time
};

// Train stations near home
export const TRAIN_STATIONS: TrainStation[] = [
  {
    name: 'Netivot',
    coordinates: [31.411306, 34.571861],
    drive_time_minutes: 20,
    parking_and_walk_minutes: 15
  },
  {
    name: 'Kiryat Gat', 
    coordinates: [31.603444, 34.776472],
    drive_time_minutes: 30,
    parking_and_walk_minutes: 15
  },
  {
    name: 'Lehavim-Rahat',
    coordinates: [31.369750, 34.798167],
    drive_time_minutes: 20,
    parking_and_walk_minutes: 15
  }
];

// Destination train stations mapping
export const DESTINATION_STATIONS: Record<string, string> = {
  'TLV Office': 'Tel Aviv-Savidor Center',
  'Haifa Office': 'Haifa-Hof HaKarmel (Razi`el)'
};

export function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  
  const R = 6371; // Earth radius in km
  
  const dlat = (lat2 - lat1) * Math.PI / 180;
  const dlon = (lon2 - lon1) * Math.PI / 180;
  
  const a = (
    Math.sin(dlat / 2) ** 2 + 
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dlon / 2) ** 2
  );
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

export function isAtLocation(
  currentCoords: [number, number], 
  targetLocation: Location, 
  thresholdKm: number = 0.5
): boolean {
  const distance = calculateDistance(currentCoords, targetLocation.coordinates);
  return distance <= thresholdKm;
}