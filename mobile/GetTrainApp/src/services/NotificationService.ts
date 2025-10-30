import notifee, { AndroidImportance, TriggerType, TimestampTrigger, EventType, Event } from '@notifee/react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TrainReminder {
  trainNumber: string;
  departureStation: string;
  departureTime: Date;
  leaveTime: Date;
}

interface StoredReminder extends TrainReminder {
  notificationId: string;
  notificationTime: Date;
}

class NotificationService {
  private channelId = 'train-reminders';
  private currentNotificationId: string | null = null;
  private readonly STORAGE_KEY = '@train_reminder';
  private readonly NOTIFICATION_PRESSED_KEY = '@notification_pressed';

  async initialize() {
    // Create notification channel for Android
    await notifee.createChannel({
      id: this.channelId,
      name: 'Train Reminders',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    // Set up notification event listeners
    this.setupNotificationHandlers();
  }

  private setupNotificationHandlers() {
    // Handle notification press when app is in foreground or background
    notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log('[GetTrain] Foreground notification event:', type);
      if (type === EventType.PRESS) {
        console.log('[GetTrain] Notification pressed (foreground)');
        await this.markNotificationPressed();
      }
    });

    // Handle notification press when app is opened from quit state
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      console.log('[GetTrain] Background notification event:', type);
      if (type === EventType.PRESS) {
        console.log('[GetTrain] Notification pressed (background)');
        await this.markNotificationPressed();
      }
    });
  }

  private async markNotificationPressed() {
    try {
      await AsyncStorage.setItem(this.NOTIFICATION_PRESSED_KEY, 'true');
      console.log('[GetTrain] Marked notification as pressed');
    } catch (error) {
      console.error('[GetTrain] Error marking notification pressed:', error);
    }
  }

  async wasNotificationPressed(): Promise<boolean> {
    try {
      const pressed = await AsyncStorage.getItem(this.NOTIFICATION_PRESSED_KEY);
      if (pressed === 'true') {
        // Clear the flag
        await AsyncStorage.removeItem(this.NOTIFICATION_PRESSED_KEY);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GetTrain] Error checking notification pressed:', error);
      return false;
    }
  }

  async checkInitialNotification(): Promise<boolean> {
    try {
      // Check if app was opened from a notification press (when app was killed)
      const initialNotification = await notifee.getInitialNotification();
      console.log('[GetTrain] Initial notification:', initialNotification);

      if (initialNotification) {
        console.log('[GetTrain] App was opened from notification tap');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GetTrain] Error checking initial notification:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    // For Android < 13, notifications are allowed by default
    return true;
  }

  async scheduleTrainReminder(reminder: TrainReminder): Promise<string | null> {
    try {
      console.log('=== SCHEDULING NOTIFICATION ===');
      console.log('Reminder details:', reminder);

      // Request permission first
      console.log('Requesting notification permission...');
      const hasPermission = await this.requestPermission();
      console.log('Permission granted:', hasPermission);

      if (!hasPermission) {
        console.log('❌ Notification permission denied');
        return null;
      }

      // Initialize channel
      console.log('Initializing notification channel...');
      await this.initialize();
      console.log('✓ Channel initialized');

      // Cancel existing notification if any
      if (this.currentNotificationId) {
        console.log('Cancelling existing notification:', this.currentNotificationId);
        await this.cancelReminder();
      }

      // Calculate notification time (15 minutes before leave time)
      const notificationTime = new Date(reminder.leaveTime.getTime() - 15 * 60 * 1000);
      console.log('📅 Notification scheduled for:', notificationTime);
      console.log('📅 Current time:', new Date());
      console.log('📅 Time until notification (ms):', notificationTime.getTime() - Date.now());

      // Check if notification time is in the past
      if (notificationTime <= new Date()) {
        console.log('⚠️ Notification time is in the past, not scheduling');
        return null;
      }

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: notificationTime.getTime(),
      };
      console.log('🔔 Trigger config:', trigger);

      // Format times for display
      const leaveTimeStr = reminder.leaveTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const departureTimeStr = reminder.departureTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      console.log('Creating trigger notification...');

      // Schedule notification
      const notificationId = await notifee.createTriggerNotification(
        {
          title: '🚂 Time to leave for your train!',
          body: `Train #${reminder.trainNumber} departs at ${departureTimeStr} from ${reminder.departureStation}. Leave now (${leaveTimeStr})!`,
          android: {
            channelId: this.channelId,
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
            // Don't specify smallIcon - will use default app icon
            color: '#007AFF',
          },
        },
        trigger
      );

      this.currentNotificationId = notificationId;
      console.log(`✓ Scheduled notification ${notificationId} for ${notificationTime}`);
      console.log('=== NOTIFICATION SCHEDULING COMPLETE ===');

      // Save reminder to storage
      await this.saveReminder(reminder, notificationId, notificationTime);

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async cancelReminder(): Promise<void> {
    try {
      if (this.currentNotificationId) {
        await notifee.cancelNotification(this.currentNotificationId);
        console.log(`Cancelled notification ${this.currentNotificationId}`);
        this.currentNotificationId = null;
      }
      // Clear from storage
      await this.clearReminder();
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  getCurrentNotificationId(): string | null {
    return this.currentNotificationId;
  }

  async saveReminder(reminder: TrainReminder, notificationId: string, notificationTime: Date): Promise<void> {
    try {
      const storedReminder: StoredReminder = {
        ...reminder,
        notificationId,
        notificationTime,
        // Convert dates to ISO strings for storage
        departureTime: reminder.departureTime,
        leaveTime: reminder.leaveTime,
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedReminder));
      console.log('Reminder saved to storage');
    } catch (error) {
      console.error('Error saving reminder:', error);
    }
  }

  async getActiveReminder(): Promise<StoredReminder | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const reminder: StoredReminder = JSON.parse(stored);
      // Convert date strings back to Date objects
      reminder.departureTime = new Date(reminder.departureTime);
      reminder.leaveTime = new Date(reminder.leaveTime);
      reminder.notificationTime = new Date(reminder.notificationTime);

      // Check if reminder is still valid (train hasn't departed yet)
      // Keep the reminder active until the train departs
      if (reminder.departureTime <= new Date()) {
        console.log('[GetTrain] Reminder expired (train has departed), clearing');
        await this.clearReminder();
        return null;
      }

      this.currentNotificationId = reminder.notificationId;
      console.log('[GetTrain] Active reminder found, train departs at', reminder.departureTime);
      return reminder;
    } catch (error) {
      console.error('Error loading reminder:', error);
      return null;
    }
  }

  async clearReminder(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('Reminder cleared from storage');
    } catch (error) {
      console.error('Error clearing reminder:', error);
    }
  }

  async getAllScheduledNotifications(): Promise<void> {
    try {
      const triggers = await notifee.getTriggerNotifications();
      console.log('=== ALL SCHEDULED NOTIFICATIONS ===');
      console.log('Total scheduled:', triggers.length);
      triggers.forEach((trigger, index) => {
        console.log(`[${index}] ID: ${trigger.notification.id}`);
        console.log(`    Title: ${trigger.notification.title}`);
        console.log(`    Trigger time: ${new Date(trigger.trigger.timestamp)}`);
      });
      console.log('=== END SCHEDULED NOTIFICATIONS ===');
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
    }
  }

  async testImmediateNotification(): Promise<void> {
    try {
      console.log('=== TESTING IMMEDIATE NOTIFICATION ===');

      // Request permission first
      const hasPermission = await this.requestPermission();
      console.log('Permission granted:', hasPermission);

      if (!hasPermission) {
        console.log('❌ Permission denied');
        return;
      }

      // Initialize channel
      await this.initialize();
      console.log('✓ Channel initialized');

      // Display an immediate notification (no trigger)
      console.log('Creating immediate notification...');
      const notificationId = await notifee.displayNotification({
        title: '🔔 Test Notification',
        body: 'If you see this, notifications are working!',
        android: {
          channelId: this.channelId,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          // Don't specify smallIcon - will use default app icon
          color: '#007AFF',
        },
      });

      console.log('✓ Immediate notification displayed with ID:', notificationId);
      console.log('=== TEST COMPLETE ===');
    } catch (error) {
      console.error('❌ Error displaying test notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
