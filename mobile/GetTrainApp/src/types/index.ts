export interface Location {
  latitude: number;
  longitude: number;
}

export interface JourneyOption {
  departure_station: string;
  leave_time: string;
  train_departure: string;
  train_arrival: string;
  final_arrival: string;
  total_duration_minutes: number;
  drive_time_minutes: number;
  train_duration_minutes: number;
  final_transport_minutes: number;
  is_direct: boolean;
  train_number?: string;
  departure_platform?: string;
}

export interface JourneyResponse {
  destination?: string;
  from_location?: string;
  parked_station?: string;
  reference_time: string;
  options: JourneyOption[];
}

export interface LocationInfo {
  location: 'home' | 'tlv_office' | 'haifa_office' | 'unknown';
  show_destinations: boolean;
  return_destination?: string;
}

export type Destination = 'TLV' | 'Haifa';
export type Timing = 'now' | 'later';
export type Station = 'Netivot' | 'Kiryat Gat' | 'Lehavim';