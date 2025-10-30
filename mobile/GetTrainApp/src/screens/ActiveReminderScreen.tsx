import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { notificationService } from '../services/NotificationService';

interface ActiveReminderScreenProps {
  reminder: {
    trainNumber: string;
    departureStation: string;
    departureTime: Date;
    leaveTime: Date;
    notificationId: string;
    notificationTime: Date;
  };
  onCancel: () => void;
  onContinue: () => void;
}

export default function ActiveReminderScreen({
  reminder,
  onCancel,
  onContinue,
}: ActiveReminderScreenProps) {
  const [timeUntilNotification, setTimeUntilNotification] = useState('');
  const [timeUntilLeave, setTimeUntilLeave] = useState('');

  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();
      const notificationTime = new Date(reminder.notificationTime);
      const leaveTime = new Date(reminder.leaveTime);

      // Calculate time until notification
      const msUntilNotification = notificationTime.getTime() - now.getTime();
      if (msUntilNotification > 0) {
        const minutes = Math.floor(msUntilNotification / 60000);
        const seconds = Math.floor((msUntilNotification % 60000) / 1000);
        setTimeUntilNotification(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilNotification('Any moment now!');
      }

      // Calculate time until leave
      const msUntilLeave = leaveTime.getTime() - now.getTime();
      if (msUntilLeave > 0) {
        const hours = Math.floor(msUntilLeave / 3600000);
        const minutes = Math.floor((msUntilLeave % 3600000) / 60000);
        if (hours > 0) {
          setTimeUntilLeave(`${hours}h ${minutes}m`);
        } else {
          setTimeUntilLeave(`${minutes}m`);
        }
      } else {
        setTimeUntilLeave('Time to leave!');
      }
    };

    // Update immediately
    updateCountdowns();

    // Update every second
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [reminder]);

  const handleCancelReminder = async () => {
    Alert.alert(
      'Cancel Reminder',
      'Are you sure you want to cancel this train reminder?',
      [
        {
          text: 'No, Keep It',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await notificationService.cancelReminder();
            onCancel();
          },
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🔔</Text>
          <Text style={styles.headerTitle}>Active Train Reminder</Text>
          <Text style={styles.headerSubtitle}>
            You have a reminder set for your upcoming train
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.countdownSection}>
            <Text style={styles.countdownLabel}>Notification in:</Text>
            <Text style={styles.countdownTime}>{timeUntilNotification}</Text>
            <Text style={styles.countdownSubtext}>
              Alert at {formatTime(new Date(reminder.notificationTime))}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.trainDetails}>
            <Text style={styles.sectionTitle}>Train Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Train Number:</Text>
              <Text style={styles.detailValue}>#{reminder.trainNumber}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Departure Station:</Text>
              <Text style={styles.detailValue}>{reminder.departureStation}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Train Departs:</Text>
              <Text style={styles.detailValue}>
                {formatTime(new Date(reminder.departureTime))}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Leave Home:</Text>
              <Text style={styles.detailValue}>
                {formatTime(new Date(reminder.leaveTime))}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(new Date(reminder.departureTime))}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.leaveTimeSection}>
            <Text style={styles.leaveTimeLabel}>Time to leave:</Text>
            <Text style={styles.leaveTimeValue}>{timeUntilLeave}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinue}
          >
            <Text style={styles.continueButtonText}>Continue to App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelReminder}
          >
            <Text style={styles.cancelButtonText}>Cancel Reminder</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  headerEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  countdownSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  countdownLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  countdownTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  countdownSubtext: {
    fontSize: 18,
    color: '#999',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  trainDetails: {
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  leaveTimeSection: {
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 10,
  },
  leaveTimeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  leaveTimeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});
