/**
 * Station data management for the GetTrain app
 * Ported from Python backend
 */

// Station data from stations.json
import stationsData from '../data/stations.json';

interface StationData {
  Id: string;
  Heb: string[];
  Eng: string[];
  Rus: string[];
  Arb: string[];
}

export class Stations {
  private stationsData: Record<string, StationData> = {};

  constructor() {
    this.loadStationsData();
  }

  private loadStationsData() {
    // Convert array to object with station ID as key for faster lookup
    for (const station of stationsData as StationData[]) {
      const stationId = station.Id; // Note: 'Id' not 'id' in the JSON
      this.stationsData[stationId] = station;
    }
  }

  getStationNameFromId(stationId: number | string): string {
    const stationIdStr = stationId.toString();
    
    if (stationIdStr in this.stationsData) {
      const engNames = this.stationsData[stationIdStr].Eng || [];
      return engNames[0] || `Station ${stationId}`;
    }
    
    return `Unknown Station ${stationId}`;
  }

  getStationIdFromName(stationName: string): number | null {
    for (const [stationId, stationData] of Object.entries(this.stationsData)) {
      const engNames = stationData.Eng || [];
      for (const engName of engNames) {
        if (engName.toLowerCase() === stationName.toLowerCase()) {
          return parseInt(stationId);
        }
      }
    }
    return null;
  }

  getAllStations(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [stationId, stationData] of Object.entries(this.stationsData)) {
      const engNames = stationData.Eng || [];
      result[stationId] = engNames[0] || `Station ${stationId}`;
    }
    return result;
  }

  getMyStations(): Record<string, number> {
    const myStationNames = [
      'Netivot',
      'Lehavim-Rahat', 
      'Kiryat Gat',
      'Tel Aviv-Savidor Center',
      'Haifa-Hof HaKarmel (Razi`el)'
    ];
    
    const stations: Record<string, number> = {};
    for (const stationName of myStationNames) {
      const stationId = this.getStationIdFromName(stationName);
      if (stationId) {
        stations[stationName] = stationId;
      }
    }
    
    return stations;
  }
}