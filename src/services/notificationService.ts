import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set global configuration for incoming notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Configure interactive action categories on boot
export const registerNotificationCategories = async () => {
  if (Platform.OS === 'web') return;

  await Notifications.setNotificationCategoryAsync('MEDICINE_ALERT', [
    {
      identifier: 'TAKEN',
      buttonTitle: 'Mark Taken ✅',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'SKIP',
      buttonTitle: 'Skip ❌',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: 'Snooze 10 Min ⏰',
      options: { opensAppToForeground: false },
    },
  ]);
};

// Request permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for local notification!');
    return false;
  }

  // Set up Android Channel for custom sounds / high priority
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }

  await registerNotificationCategories();
  return true;
};

// Schedule medication reminder
// frequencyDetails: Array of times, e.g. ["08:00", "20:00"]
export const scheduleMedicationReminders = async (
  medId: number,
  medName: string,
  dosage: string,
  unit: string,
  times: string[]
): Promise<string[]> => {
  const triggerIds: string[] = [];

  for (const time of times) {
    const [hoursStr, minutesStr] = time.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    const triggerId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💊 Medication Reminder: ${medName}`,
        body: `It is time to take ${dosage} ${unit} of ${medName}. Open to log!`,
        categoryIdentifier: 'MEDICINE_ALERT',
        data: { medId, medName, dosage, unit, scheduledTime: time },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    });

    triggerIds.push(triggerId);
  }

  return triggerIds;
};

// Schedule stock refill reminder
export const scheduleRefillAlert = async (
  medId: number,
  medName: string,
  stockRemaining: number
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ Refill Alert: ${medName}`,
      body: `You only have ${stockRemaining} doses of ${medName} left. Please refill soon!`,
      data: { medId, type: 'refill' },
      sound: true,
    },
    trigger: null, // trigger immediately
  });
};

// Cancel single scheduled reminder
export const cancelReminder = async (id: string) => {
  await Notifications.cancelScheduledNotificationAsync(id);
};

// Cancel all notifications
export const cancelAllReminders = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
