import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

interface NotificationsCenterScreenProps {
  navigation: any;
}

export const NotificationsCenterScreen: React.FC<NotificationsCenterScreenProps> = ({ navigation }) => {
  const { themeMode, contrastMode, fontSizeScale, notifications, markNotificationAsRead, clearAllNotifications } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const getEmojiForType = (type: string) => {
    switch (type) {
      case 'medication_refill':
        return '⚠️';
      case 'medication_reminder':
        return '💊';
      case 'appointment':
        return '📅';
      case 'daily_check':
      default:
        return '🔔';
    }
  };

  const handleClearAll = () => {
    Alert.alert('Clear Notifications', 'Are you sure you want to clear your notification alerts history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearAllNotifications },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontSize: 22 * fontScale }]}>Notifications Center</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Text style={[styles.clearBtnText, { color: theme.danger, fontSize: 15 * fontScale }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.scrollList}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 40 }}>🔔</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 16 * fontScale, marginTop: 8, textAlign: 'center' }}>
              No notifications yet. You will see alerts for low stock refills and follow-up sessions here.
            </Text>
            <Button
              title="Return to Dashboard"
              onPress={() => navigation.goBack()}
              variant="primary"
              style={{ marginTop: 24 }}
            />
          </View>
        ) : (
          notifications.map((notif) => (
            <Card
              key={notif.id}
              style={[
                styles.notifCard,
                {
                  opacity: notif.isRead ? 0.7 : 1,
                  borderLeftColor: notif.isRead ? theme.border : theme.primary,
                  borderLeftWidth: 4,
                },
              ]}
            >
              <View style={styles.notifContent}>
                <Text style={{ fontSize: 22 }}>{getEmojiForType(notif.type)}</Text>
                
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.notifTitle, { color: theme.text, fontSize: 15 * fontScale, fontWeight: notif.isRead ? 'bold' : '900' }]}>
                    {notif.title}
                  </Text>
                  <Text style={[styles.notifMsg, { color: theme.textSecondary, fontSize: 14 * fontScale }]}>
                    {notif.message}
                  </Text>
                  <Text style={[styles.timestamp, { color: theme.textSecondary, fontSize: 11 * fontScale }]}>
                    {new Date(notif.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </Text>
                </View>
                
                {!notif.isRead && (
                  <TouchableOpacity
                    onPress={() => markNotificationAsRead(notif.id)}
                    style={[styles.readBtn, { backgroundColor: theme.primaryLight }]}
                  >
                    <Text style={[styles.readBtnTxt, { color: theme.primary, fontSize: 12 * fontScale }]}>Mark Read</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    fontWeight: 'bold',
  },
  scrollList: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  notifCard: {
    padding: 12,
    marginBottom: 10,
  },
  notifContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifTitle: {
    marginBottom: 2,
  },
  notifMsg: {
    lineHeight: 18,
    marginVertical: 2,
  },
  timestamp: {
    fontWeight: '500',
    marginTop: 2,
  },
  readBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readBtnTxt: {
    fontWeight: 'bold',
  },
});
