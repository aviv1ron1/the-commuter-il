import React, { useEffect, useState, useRef } from 'react';
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
import { SortBy } from '../services/JourneyPlanner';
import { notificationService } from '../services/NotificationService';

interface Props {
  destination?: Destination;
  timing: Timing;
  selectedTime?: Date;
  isReturnTrip?: boolean;
  fromLocation?: Destination;
  parkedStation?: Station;
  onBack: () => void;
  onRememberStation?: (station: Station) => void;
}

export const ResultsScreen: React.FC<Props> = ({
  destination,
  timing,
  selectedTime,
  isReturnTrip = false,
  fromLocation,
  parkedStation,
  onBack,
  onRememberStation,
}) => {
  const insets = useSafeAreaInsets();
  const [journeyData, setJourneyData] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directOnly, setDirectOnly] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('arrival_time');
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [expandedChartRow, setExpandedChartRow] = useState<number | null>(null);
  const [reminderSetFor, setReminderSetFor] = useState<number | null>(null);
  const listScrollViewRef = useRef<ScrollView>(null);
  const cardPositions = useRef<number[]>([]);

  useEffect(() => {
    fetchJourneyData();
  }, []); // Only fetch once on mount

  // Scroll to card and clear highlight after 3 seconds when switching to list view
  useEffect(() => {
    if (viewMode === 'list' && expandedChartRow !== null) {
      // Scroll to the card using measured position
      setTimeout(() => {
        const yPosition = cardPositions.current[expandedChartRow];
        if (yPosition !== undefined) {
          listScrollViewRef.current?.scrollTo({
            y: yPosition,
            animated: true
          });
        }
      }, 100); // Small delay to ensure layout is ready

      const timer = setTimeout(() => {
        setExpandedChartRow(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [viewMode, expandedChartRow]);

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

  const handleSetReminder = async (option: JourneyOption, index: number) => {
    try {
      // If this train already has a reminder, cancel it
      if (reminderSetFor === index) {
        await notificationService.cancelReminder();
        setReminderSetFor(null);
        console.log('Reminder cancelled');
        return;
      }

      // Cancel any existing reminder
      if (reminderSetFor !== null) {
        await notificationService.cancelReminder();
      }

      // Schedule new reminder
      const notificationId = await notificationService.scheduleTrainReminder({
        trainNumber: option.train_number || 'Unknown',
        departureStation: option.departure_station,
        departureTime: new Date(option.train_departure),
        leaveTime: new Date(option.leave_time),
      });

      if (notificationId) {
        setReminderSetFor(index);

        // Remember station for forward trips (home to office)
        if (!isReturnTrip && onRememberStation) {
          const stationName = option.departure_station === 'Lehavim-Rahat' ? 'Lehavim' : option.departure_station;
          onRememberStation(stationName as Station);
          console.log('Remembered station:', stationName);
        }

        // Debug: Check all scheduled notifications
        await notificationService.getAllScheduledNotifications();

        console.log('Reminder set successfully for train', option.train_number);
      } else {
        console.error('Failed to set reminder - no notification ID returned');
      }
    } catch (error) {
      console.error('Error setting reminder:', error);
    }
  };

  const getFilteredOptions = (): JourneyOption[] => {
    if (!journeyData?.options) return [];

    // Filter by direct trains if needed
    let options = directOnly
      ? journeyData.options.filter(option => option.is_direct)
      : journeyData.options;

    // Sort client-side based on preference
    const sortedOptions = [...options];
    if (sortBy === 'arrival_time') {
      // Sort by final arrival time
      sortedOptions.sort((a, b) => {
        const timeA = new Date(a.final_arrival).getTime();
        const timeB = new Date(b.final_arrival).getTime();
        // For trips to office: latest first; for trips home: earliest first
        return isReturnTrip ? timeA - timeB : timeB - timeA;
      });
    } else {
      // Sort by leave time (latest first - leave as late as possible)
      sortedOptions.sort((a, b) => {
        const timeA = new Date(a.leave_time).getTime();
        const timeB = new Date(b.leave_time).getTime();
        return timeB - timeA;
      });
    }

    return sortedOptions;
  };

  const renderJourneyOption = (option: JourneyOption, index: number) => {
    const isHighlighted = expandedChartRow === index && viewMode === 'list';

    return (
    <View
      key={index}
      style={[
        styles.optionCard,
        isHighlighted && styles.optionCardHighlighted
      ]}
      onLayout={(event) => {
        cardPositions.current[index] = event.nativeEvent.layout.y;
      }}
    >
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

      <TouchableOpacity
        style={[
          styles.reminderButton,
          reminderSetFor === index && styles.reminderButtonActive
        ]}
        onPress={() => handleSetReminder(option, index)}
      >
        <Text style={[
          styles.reminderButtonText,
          reminderSetFor === index && styles.reminderButtonTextActive
        ]}>
          {reminderSetFor === index ? '✓ Reminder Set' : '🔔 Set Reminder'}
        </Text>
        {reminderSetFor === index && (
          <Text style={styles.reminderTimeText}>
            Alert 15 min before leaving ({formatTime(new Date(new Date(option.leave_time).getTime() - 15 * 60 * 1000).toISOString())})
          </Text>
        )}
      </TouchableOpacity>
    </View>
    );
  };

  const getScreenTitle = () => {
    if (isReturnTrip) {
      return `Going Home from ${fromLocation}`;
    }
    return `Going to ${destination}`;
  };

  const calculateTimeScale = (options: JourneyOption[]) => {
    if (options.length === 0) {
      return { minTime: new Date(), maxTime: new Date(), timeRange: 0 };
    }

    const times = options.flatMap(opt => [
      new Date(opt.leave_time).getTime(),
      new Date(opt.final_arrival).getTime()
    ]);

    const minTime = new Date(Math.min(...times));
    const maxTime = new Date(Math.max(...times));
    const timeRange = maxTime.getTime() - minTime.getTime();

    return { minTime, maxTime, timeRange };
  };

  const calculateBarPosition = (time: Date, minTime: Date, timeRange: number, barWidth: number) => {
    const offset = time.getTime() - minTime.getTime();
    return (offset / timeRange) * barWidth;
  };

  const renderChartView = () => {
    const options = getFilteredOptions();
    if (options.length === 0) return null;

    const { minTime, maxTime, timeRange } = calculateTimeScale(options);
    // Make chart wider based on time range - roughly 100px per hour
    const hoursSpan = timeRange / (1000 * 60 * 60);
    const chartWidth = Math.max(280, hoursSpan * 120);

    // Generate hour guides and half-hour guides
    const hourGuides: Date[] = [];
    const halfHourGuides: Date[] = [];
    const startHour = new Date(minTime);
    startHour.setMinutes(0, 0, 0);

    let currentTime = new Date(startHour);
    while (currentTime <= maxTime) {
      if (currentTime >= minTime) {
        // Check if this is on the hour or half-hour
        if (currentTime.getMinutes() === 0) {
          hourGuides.push(new Date(currentTime));
        } else {
          halfHourGuides.push(new Date(currentTime));
        }
      }
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // Add 30 minutes
    }

    return (
      <View style={styles.chartContainer}>
        <View style={styles.unifiedGraph}>
          <View style={styles.chartMainRow}>
            {/* Station labels column - fixed on left */}
            <View style={styles.stationLabelsColumn}>
              <View style={styles.stationLabelSpace} />
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.stationLabelCell}
                  onPress={() => {
                    setViewMode('list');
                    setExpandedChartRow(index);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chartStationName} numberOfLines={1}>
                    {option.departure_station}
                  </Text>
                  {option.train_number && (
                    <Text style={styles.chartTrainNumber}>#{option.train_number}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Scrollable chart area */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.graphAreaScroll}
            >
              <View style={{ width: chartWidth }}>
                {/* Time scale */}
                <View style={styles.timeScaleHeader}>
                  <View style={styles.timeScale}>
                    <Text style={styles.timeScaleLabel}>{formatTime(minTime.toISOString())}</Text>
                    <Text style={styles.timeScaleLabel}>{formatTime(maxTime.toISOString())}</Text>
                  </View>

                  {/* Hour guides and half-hour guides */}
                  <View style={styles.hourGuidesContainer}>
                    {/* Half-hour guides (lighter, no labels) */}
                    {halfHourGuides.map((halfHourTime, idx) => {
                      const position = calculateBarPosition(halfHourTime, minTime, timeRange, chartWidth);
                      return (
                        <View key={`half-${idx}`} style={[styles.halfHourGuide, { left: position }]} />
                      );
                    })}
                    {/* Hour guides (with labels) */}
                    {hourGuides.map((hourTime, idx) => {
                      const position = calculateBarPosition(hourTime, minTime, timeRange, chartWidth);
                      return (
                        <View key={`hour-${idx}`} style={[styles.hourGuide, { left: position }]}>
                          <Text style={styles.hourLabel}>{formatTime(hourTime.toISOString())}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* All bars */}
                {options.map((option, index) => {
                  const leaveTime = new Date(option.leave_time);
                  const trainDep = new Date(option.train_departure);
                  const trainArr = new Date(option.train_arrival);
                  const finalArr = new Date(option.final_arrival);

                  const startPos = calculateBarPosition(leaveTime, minTime, timeRange, chartWidth);
                  const driveWidth = calculateBarPosition(trainDep, minTime, timeRange, chartWidth) - startPos;
                  const trainWidth = calculateBarPosition(trainArr, minTime, timeRange, chartWidth) - (startPos + driveWidth);
                  const walkWidth = calculateBarPosition(finalArr, minTime, timeRange, chartWidth) - (startPos + driveWidth + trainWidth);

                  return (
                    <View key={index} style={styles.chartBarRow}>
                      <View style={styles.barContainer}>
                        <View style={[styles.timelineBar, { marginLeft: startPos }]}>
                          <View style={[styles.barSegment, styles.driveSegment, { width: driveWidth }]} />
                          <View style={[styles.barSegment, styles.trainSegment, { width: trainWidth }]} />
                          <View style={[styles.barSegment, styles.walkSegment, { width: walkWidth }]} />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

        </View>
      </View>
    );
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
        <View style={styles.filterRow}>
          <View style={styles.filterToggle}>
            <Text style={styles.filterLabel}>Direct only</Text>
            <Switch
              value={directOnly}
              onValueChange={setDirectOnly}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor='white'
            />
          </View>

          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'leave_time' && styles.sortButtonActive
              ]}
              onPress={() => setSortBy('leave_time')}
            >
              <Text style={[
                styles.sortButtonText,
                sortBy === 'leave_time' && styles.sortButtonTextActive
              ]}>🏠</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'arrival_time' && styles.sortButtonActive
              ]}
              onPress={() => setSortBy('arrival_time')}
            >
              <Text style={[
                styles.sortButtonText,
                sortBy === 'arrival_time' && styles.sortButtonTextActive
              ]}>🏁</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[
                styles.sortButton,
                viewMode === 'list' && styles.sortButtonActive
              ]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[
                styles.sortButtonText,
                viewMode === 'list' && styles.sortButtonTextActive
              ]}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                viewMode === 'chart' && styles.sortButtonActive
              ]}
              onPress={() => setViewMode('chart')}
            >
              <Text style={[
                styles.sortButtonText,
                viewMode === 'chart' && styles.sortButtonTextActive
              ]}>📊</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView ref={listScrollViewRef} style={styles.scrollContainer}>
        {viewMode === 'list' ? (
          <>
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
          </>
        ) : (
          <>
            {renderChartView()}
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
          </>
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
    borderRadius: 8,
    marginBottom: 15,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  sortButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 18,
  },
  sortButtonTextActive: {
    fontSize: 18,
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
  optionCardHighlighted: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
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
  chartContainer: {
    paddingVertical: 8,
  },
  unifiedGraph: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeScaleRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stationLabelSpace: {
    width: 80,
    height: 36,
    justifyContent: 'center',
  },
  graphAreaScroll: {
    flex: 1,
  },
  graphArea: {
    position: 'relative',
  },
  timeScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeScaleLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  hourGuidesContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  hourGuide: {
    position: 'absolute',
    top: 20,
    bottom: -1000, // Extend down through all rows
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  halfHourGuide: {
    position: 'absolute',
    top: 20,
    bottom: -1000, // Extend down through all rows
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  hourLabel: {
    position: 'absolute',
    top: -18,
    fontSize: 9,
    color: '#999',
    marginLeft: -12,
  },
  chartMainRow: {
    flexDirection: 'row',
  },
  stationLabelsColumn: {
    width: 80,
  },
  stationLabelCell: {
    height: 36,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingRight: 8,
  },
  timeScaleHeader: {
    height: 36,
    position: 'relative',
  },
  chartBarRow: {
    height: 36,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chartRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  chartRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartStationName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  chartTrainNumber: {
    fontSize: 9,
    color: '#666',
  },
  barContainer: {
    height: 20,
    position: 'relative',
  },
  timelineBar: {
    flexDirection: 'row',
    height: 20,
  },
  barSegment: {
    height: 20,
    borderRadius: 3,
  },
  driveSegment: {
    backgroundColor: '#9e9e9e',
  },
  trainSegment: {
    backgroundColor: '#007AFF',
  },
  walkSegment: {
    backgroundColor: '#e0e0e0',
  },
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  reminderButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  reminderButtonActive: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  reminderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderButtonTextActive: {
    color: 'white',
  },
  reminderTimeText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
});