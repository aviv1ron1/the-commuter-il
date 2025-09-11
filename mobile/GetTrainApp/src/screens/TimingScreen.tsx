import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Destination, Timing } from '../types';

interface Props {
  destination?: Destination;
  isReturnTrip?: boolean;
  onContinue: (timing: Timing, selectedTime?: Date) => void;
  onBack: () => void;
}

export const TimingScreen: React.FC<Props> = ({ 
  destination, 
  isReturnTrip = false, 
  onContinue, 
  onBack 
}) => {
  const insets = useSafeAreaInsets();
  const [selectedTiming, setSelectedTiming] = useState<Timing | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(() => {
    const defaultTime = new Date();
    defaultTime.setHours(defaultTime.getHours() + 1);
    defaultTime.setMinutes(0);
    defaultTime.setSeconds(0);
    defaultTime.setMilliseconds(0);
    return defaultTime;
  });

  const handleTimingSelect = (timing: Timing) => {
    setSelectedTiming(timing);
    
    if (timing === 'now') {
      onContinue(timing);
    } else {
      setShowDatePicker(true);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const newDateTime = new Date(selectedDateTime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setSelectedDateTime(newDateTime);
      
      if (Platform.OS === 'android') {
        setShowTimePicker(true);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      const newDateTime = new Date(selectedDateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setSelectedDateTime(newDateTime);
      
      if (Platform.OS === 'android') {
        onContinue('later', newDateTime);
      }
    }
  };

  const handleConfirm = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
    onContinue('later', selectedDateTime);
  };

  const getScreenTitle = () => {
    if (isReturnTrip) {
      return 'Going Home';
    }
    return `Going to ${destination}`;
  };

  const getTimeDescription = () => {
    if (isReturnTrip) {
      return 'When do you want to leave the office?';
    }
    return 'When do you want to arrive?';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{getScreenTitle()}</Text>
        <Text style={styles.subtitle}>{getTimeDescription()}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.timingButton,
            selectedTiming === 'now' && styles.selectedButton
          ]}
          onPress={() => handleTimingSelect('now')}
        >
          <Text style={[
            styles.buttonText,
            selectedTiming === 'now' && styles.selectedButtonText
          ]}>
            Now
          </Text>
          <Text style={[
            styles.buttonSubtext,
            selectedTiming === 'now' && styles.selectedButtonSubtext
          ]}>
            {isReturnTrip ? 'Leave as soon as possible' : 'Next 3 hours of trains'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.timingButton,
            selectedTiming === 'later' && styles.selectedButton
          ]}
          onPress={() => handleTimingSelect('later')}
        >
          <Text style={[
            styles.buttonText,
            selectedTiming === 'later' && styles.selectedButtonText
          ]}>
            Later
          </Text>
          <Text style={[
            styles.buttonSubtext,
            selectedTiming === 'later' && styles.selectedButtonSubtext
          ]}>
            {isReturnTrip ? 'Choose departure time' : 'Choose arrival time'}
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Select Date:</Text>
          <DateTimePicker
            value={selectedDateTime}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => {
                setShowDatePicker(false);
                setShowTimePicker(true);
              }}
            >
              <Text style={styles.nextButtonText}>Next: Select Time</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showTimePicker && (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Select Time:</Text>
          <DateTimePicker
            value={selectedDateTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.timeButtonContainer}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                  setSelectedTiming(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {selectedTiming === 'later' && !showDatePicker && !showTimePicker && (
        <View style={styles.selectedTimeContainer}>
          <Text style={styles.selectedTimeText}>
            Selected: {selectedDateTime.toLocaleDateString()} at {selectedDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <TouchableOpacity
            style={styles.changeTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.changeTimeButtonText}>Change Time</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  timingButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedButton: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  selectedButtonText: {
    color: 'white',
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerLabel: {
    fontSize: 18,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  nextButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedTimeContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedTimeText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  changeTimeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  changeTimeButtonText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  timeButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  confirmButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#333',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});