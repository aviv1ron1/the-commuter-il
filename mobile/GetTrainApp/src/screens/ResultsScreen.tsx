import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JourneyResponse, JourneyOption, Destination, Timing, Station } from '../types';
import { apiService } from '../services/ApiService';

interface Props {
  destination?: Destination;
  timing: Timing;
  selectedTime?: Date;
  isReturnTrip?: boolean;
  fromLocation?: Destination;
  parkedStation?: Station;
  onBack: () => void;
}

export const ResultsScreen: React.FC<Props> = ({
  destination,
  timing,
  selectedTime,
  isReturnTrip = false,
  fromLocation,
  parkedStation,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [journeyData, setJourneyData] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directOnly, setDirectOnly] = useState(true);

  useEffect(() => {
    fetchJourneyData();
  }, []);

  const fetchJourneyData = async () => {
    try {
      setLoading(true);
      setError(null);

      let response: JourneyResponse;

      if (isReturnTrip && fromLocation && parkedStation) {
        response = await apiService.planReturnJourney(
          fromLocation,
          parkedStation,
          timing,
          selectedTime
        );
      } else if (destination) {
        response = await apiService.planJourney(
          destination,
          timing,
          selectedTime
        );
      } else {
        throw new Error('Missing required parameters');
      }

      setJourneyData(response);
    } catch (error) {
      console.error('Error fetching journey data:', error);
      setError('Failed to load train schedules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getFilteredOptions = (): JourneyOption[] => {
    if (!journeyData?.options) return [];
    if (directOnly) {
      return journeyData.options.filter(option => option.is_direct);
    }
    return journeyData.options;
  };

  const renderJourneyOption = (option: JourneyOption, index: number) => (
    <View key={index} style={styles.optionCard}>
      <View style={styles.optionHeader}>
        <Text style={styles.stationName}>{option.departure_station}</Text>
        <Text style={styles.totalDuration}>
          Total: {formatDuration(option.total_duration_minutes)}
        </Text>
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTime}>
              {formatTime(option.leave_time)}
            </Text>
            <Text style={styles.timelineLabel}>
              {isReturnTrip ? 'Leave office' : 'Leave home'}
            </Text>
          </View>
        </View>

        <View style={styles.timelineConnector} />

        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTime}>
              {formatTime(option.train_departure)}
            </Text>
            <Text style={styles.timelineLabel}>Train departure</Text>
            <Text style={styles.timelineDetail}>
              {option.departure_station} station
              {option.train_number ? ` • Train ${option.train_number}` : ''}
              {option.departure_platform ? ` • Platform ${option.departure_platform}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.timelineConnector} />

        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTime}>
              {formatTime(option.train_arrival)}
            </Text>
            <Text style={styles.timelineLabel}>Train arrival</Text>
            <Text style={styles.timelineDetail}>
              Duration: {formatDuration(option.train_duration_minutes)}
            </Text>
          </View>
        </View>

        <View style={styles.timelineConnector} />

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.finalDot]} />
          <View style={styles.timelineContent}>
            <Text style={[styles.timelineTime, styles.finalTime]}>
              {formatTime(option.final_arrival)}
            </Text>
            <Text style={styles.timelineLabel}>
              {isReturnTrip ? 'Arrive home' : 'Arrive at office'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.breakdown}>
        <Text style={styles.breakdownTitle}>Time breakdown:</Text>
        <Text style={styles.breakdownText}>
          {isReturnTrip ? 'Walk to station' : 'Drive + parking'}: {formatDuration(
            isReturnTrip ? option.final_transport_minutes : 
            option.drive_time_minutes + 15
          )}
        </Text>
        <Text style={styles.breakdownText}>
          Train: {formatDuration(option.train_duration_minutes)}
        </Text>
        <Text style={styles.breakdownText}>
          {isReturnTrip ? 'Drive home' : 'Walk to office'}: {formatDuration(
            isReturnTrip ? option.drive_time_minutes : option.final_transport_minutes
          )}
        </Text>
      </View>
    </View>
  );

  const getScreenTitle = () => {
    if (isReturnTrip) {
      return `Going Home from ${fromLocation}`;
    }
    return `Going to ${destination}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Finding train schedules...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchJourneyData}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{getScreenTitle()}</Text>
        <Text style={styles.subtitle}>
          {getFilteredOptions().length} of {journeyData?.options.length} options shown
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterToggle}>
          <Text style={styles.filterLabel}>Direct trains only</Text>
          <Switch
            value={directOnly}
            onValueChange={setDirectOnly}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor='white'
          />
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {getFilteredOptions().map((option, index) => 
          renderJourneyOption(option, index)
        )}
        {getFilteredOptions().length === 0 && journeyData?.options && journeyData.options.length > 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No direct trains found.</Text>
            <Text style={styles.emptySubtext}>Turn off "Direct trains only" to see all options.</Text>
          </View>
        )}
        {journeyData?.options.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No trains found for this time.</Text>
            <Text style={styles.emptySubtext}>Try selecting a different time.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 15,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalDuration: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  timeline: {
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    marginRight: 12,
  },
  finalDot: {
    backgroundColor: '#34C759',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  finalTime: {
    color: '#34C759',
  },
  timelineLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timelineDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  timelineConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginLeft: 5,
    marginVertical: 4,
  },
  breakdown: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  breakdownText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});