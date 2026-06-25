import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert, TouchableOpacity, Switch, ActivityIndicator, Animated, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import {
  getMedications,
  addMedication,
  updateMedication,
  deleteMedication,
  getMedicationLogs,
  getMedicationLogsRange,
  logMedicationDose,
  MedicationDB,
  MedicationLogDB,
} from '../../database/dbHelpers';
import { scheduleMedicationReminders, cancelAllReminders, scheduleRefillAlert } from '../../services/notificationService';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { BackgroundGrid } from '../../components/BackgroundGrid';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

export const MedicinesScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const { themeMode, contrastMode, fontSizeScale, user, addNotification } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'schedule' | 'history'>('schedule');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownAnimation] = useState(new Animated.Value(0));

  // Medications list & Today's Schedule Checklist
  const [medsList, setMedsList] = useState<MedicationDB[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<Array<{
    med: MedicationDB;
    time: string;
    taken: boolean;
    skipped: boolean;
  }>>([]);

  // History stats & logs
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'today' | '7days' | '30days' | 'custom'>('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [historyStats, setHistoryStats] = useState({
    total: 0,
    taken: 0,
    missed: 0,
    adherence: 100,
  });

  // Modal & Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicationDB | null>(null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frequencyType, setFrequencyType] = useState('Once Daily');
  const [timesInput, setTimesInput] = useState('08:00');
  const [stockRemaining, setStockRemaining] = useState('');
  const [refillThreshold, setRefillThreshold] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  useEffect(() => {
    if (isFocused && user) {
      if (viewMode === 'schedule') {
        loadTodaySchedule();
      } else {
        loadHistory();
      }
    }
  }, [isFocused, user, viewMode, historyFilter, customStart, customEnd]);

  const loadTodaySchedule = () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = getMedications(user.id);
      setMedsList(data);

      const todayLogs = getMedicationLogs(user.id, 1);
      const schedule: typeof todaySchedule = [];

      data.forEach((med) => {
        let times: string[] = [];
        try {
          times = JSON.parse(med.frequency_details || '[]');
        } catch {
          times = ['08:00'];
        }

        times.forEach((time) => {
          const scheduledTimeStr = `${new Date().toISOString().split('T')[0]} ${time}`;
          const isLogged = todayLogs.find(
            (l) => l.medication_id === med.id && l.scheduled_time === scheduledTimeStr
          );

          schedule.push({
            med,
            time,
            taken: isLogged?.status === 'TAKEN',
            skipped: isLogged?.status === 'SKIPPED',
          });
        });
      });

      schedule.sort((a, b) => a.time.localeCompare(b.time));
      setTodaySchedule(schedule);

      // Check stock alert notifications
      data.forEach((med) => {
        if (med.stock_remaining <= med.refill_alert_threshold) {
          scheduleRefillAlert(med.id, med.name, med.stock_remaining);
          addNotification({
            title: `⚠️ Refill Alert: ${med.name}`,
            message: `${med.name} stock is low (${med.stock_remaining} left). Refill soon!`,
            type: 'medication_refill',
            referenceId: med.id,
          });
        }
      });
    } catch (error) {
      console.error('Error loading medications today schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = () => {
    if (!user) return;
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      let startStr = todayStr;
      let endStr = todayStr;

      if (historyFilter === '7days') {
        const start = new Date();
        start.setDate(start.getDate() - 6);
        startStr = start.toISOString().split('T')[0];
      } else if (historyFilter === '30days') {
        const start = new Date();
        start.setDate(start.getDate() - 29);
        startStr = start.toISOString().split('T')[0];
      } else if (historyFilter === 'custom') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(customStart) && dateRegex.test(customEnd)) {
          startStr = customStart;
          endStr = customEnd;
        } else {
          // If custom input is invalid, default to last 7 days
          const start = new Date();
          start.setDate(start.getDate() - 6);
          startStr = start.toISOString().split('T')[0];
        }
      }

      const logs = getMedicationLogsRange(user.id, startStr, endStr);
      setHistoryLogs(logs);

      // Calculate statistics
      const total = logs.length;
      const taken = logs.filter((l) => l.status === 'TAKEN').length;
      const missed = logs.filter((l) => l.status === 'SKIPPED' || l.status === 'MISSED').length;
      const adherence = total > 0 ? (taken / total) * 100 : 100;

      setHistoryStats({
        total,
        taken,
        missed,
        adherence,
      });
    } catch (error) {
      console.error('Error loading medication history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => {
    if (dropdownOpen) {
      Animated.timing(dropdownAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setDropdownOpen(false));
    } else {
      setDropdownOpen(true);
      Animated.timing(dropdownAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleSelectViewMode = (mode: 'schedule' | 'history') => {
    setViewMode(mode);
    toggleDropdown();
  };

  const handleLogDose = (medId: number, time: string, status: 'TAKEN' | 'SKIPPED') => {
    if (!user) return;
    const scheduledTime = `${new Date().toISOString().split('T')[0]} ${time}`;
    
    // Deduct stock locally if Taken
    if (status === 'TAKEN') {
      const med = medsList.find((m) => m.id === medId);
      if (med) {
        const nextStock = Math.max(0, med.stock_remaining - 1);
        if (nextStock <= med.refill_alert_threshold) {
          addNotification({
            title: `⚠️ Refill Alert: ${med.name}`,
            message: `${med.name} stock is low (${nextStock} left). Refill soon!`,
            type: 'medication_refill',
            referenceId: med.id,
          });
        }
      }
    }

    logMedicationDose(medId, scheduledTime, status);
    Alert.alert('Medication Logged', `Marked dose scheduled at ${time} as ${status.toLowerCase()}.`);
    loadTodaySchedule();
  };

  const handleOpenAdd = () => {
    setEditingMed(null);
    setName('');
    setDosage('');
    setUnit('mg');
    setInstructions('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('2026-12-31');
    setFrequencyType('Once Daily');
    setTimesInput('08:00');
    setStockRemaining('30');
    setRefillThreshold('7');
    setRemindersEnabled(true);
    setModalVisible(true);
  };

  const handleOpenEdit = (med: MedicationDB) => {
    setEditingMed(med);
    setName(med.name);
    setDosage(med.dosage);
    setUnit(med.unit);
    setInstructions(med.instructions || '');
    setStartDate(med.start_date);
    setEndDate(med.end_date);
    setFrequencyType(med.frequency_type);
    
    let parsedTimes = '08:00';
    try {
      const arr = JSON.parse(med.frequency_details || '[]');
      parsedTimes = arr.join(', ');
    } catch {}
    setTimesInput(parsedTimes);
    
    setStockRemaining(med.stock_remaining.toString());
    setRefillThreshold(med.refill_alert_threshold.toString());
    setRemindersEnabled(med.reminders_enabled === 1);
    setModalVisible(true);
  };

  const handleSaveMed = async () => {
    if (!user) return;

    if (!name.trim() || !dosage.trim() || !unit.trim() || !startDate.trim() || !endDate.trim() || !stockRemaining.trim()) {
      Alert.alert('Validation Error', 'Please fill in all mandatory medication details.');
      return;
    }

    const pStock = parseFloat(stockRemaining);
    const pThreshold = refillThreshold ? parseFloat(refillThreshold) : 0;
    if (isNaN(pStock) || isNaN(pThreshold)) {
      Alert.alert('Validation Error', 'Stock values must be numbers.');
      return;
    }

    const times = timesInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^\d{2}:\d{2}$/.test(t));

    if (times.length === 0) {
      Alert.alert('Validation Error', 'Please specify at least one time in HH:MM format (e.g. 08:00).');
      return;
    }

    const medData = {
      user_id: user.id,
      name,
      dosage,
      unit,
      instructions: instructions || null,
      start_date: startDate,
      end_date: endDate,
      frequency_type: frequencyType,
      frequency_details: JSON.stringify(times),
      stock_remaining: pStock,
      refill_alert_threshold: pThreshold,
      reminders_enabled: remindersEnabled ? 1 : 0,
    };

    try {
      if (editingMed) {
        updateMedication({
          ...medData,
          id: editingMed.id,
        });
        
        if (remindersEnabled) {
          await scheduleMedicationReminders(editingMed.id, name, dosage, unit, times);
        }
        Alert.alert('Success', 'Medication updated successfully.');
      } else {
        const insertId = addMedication(medData);
        if (remindersEnabled) {
          await scheduleMedicationReminders(insertId, name, dosage, unit, times);
        }
        Alert.alert('Success', 'Medication scheduled successfully.');
      }

      setModalVisible(false);
      if (viewMode === 'schedule') {
        loadTodaySchedule();
      } else {
        loadHistory();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save medication schedule.');
    }
  };

  const handleDeleteMed = (id: number) => {
    Alert.alert('Delete Medication', 'Are you sure you want to delete this medication and all scheduled reminders?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMedication(id);
          if (viewMode === 'schedule') {
            loadTodaySchedule();
          } else {
            loadHistory();
          }
        },
      },
    ]);
  };

  const groupLogsByDate = (logs: any[]) => {
    const groups: { [key: string]: any[] } = {};
    const todayStr = new Date().toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    logs.forEach((log) => {
      const datePart = log.scheduled_time.split(' ')[0];
      let displayDate = datePart;

      if (datePart === todayStr) {
        displayDate = 'Today';
      } else if (datePart === yesterdayStr) {
        displayDate = 'Yesterday';
      } else {
        try {
          const dateObj = new Date(datePart);
          displayDate = dateObj.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        } catch {}
      }

      if (!groups[displayDate]) {
        groups[displayDate] = [];
      }
      groups[displayDate].push(log);
    });

    return groups;
  };

  // Dropdown animated style
  const dropdownMenuStyle = {
    opacity: dropdownAnimation,
    transform: [
      {
        scaleY: dropdownAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
      },
      {
        translateY: dropdownAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 0],
        }),
      },
    ],
  };

  const historyGrouped = groupLogsByDate(historyLogs);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundGrid />
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Dynamic Header row */}
      <View style={styles.topRow}>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            onPress={toggleDropdown}
            style={[styles.dropdownSelect, { backgroundColor: theme.primary, overflow: 'hidden' }]}
            activeOpacity={0.85}
          >
            <ExpoLinearGradient
              colors={themeMode === 'dark' ? ['#3B82F6', '#1E3A8A'] : ['#60A5FA', '#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.dropdownSelectText, { zIndex: 1 }]}>
              {viewMode === 'schedule' ? '▼ My Medicine Schedules' : '▼ My Medicine History'}
            </Text>
          </TouchableOpacity>

          {dropdownOpen && (
            <Animated.View style={[styles.dropdownMenu, dropdownMenuStyle, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                onPress={() => handleSelectViewMode('schedule')}
                style={[
                  styles.dropdownOption,
                  viewMode === 'schedule' && { backgroundColor: theme.background },
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    {
                      color: theme.text,
                      fontWeight: viewMode === 'schedule' ? '900' : '500',
                    },
                  ]}
                >
                  My Medicine Schedules
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSelectViewMode('history')}
                style={[
                  styles.dropdownOption,
                  viewMode === 'history' && { backgroundColor: theme.background },
                  { borderTopWidth: 1, borderTopColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    {
                      color: theme.text,
                      fontWeight: viewMode === 'history' ? '900' : '500',
                    },
                  ]}
                >
                  My Medicine History
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <TouchableOpacity
          onPress={handleOpenAdd}
          style={[styles.addBtn, { backgroundColor: theme.primary, overflow: 'hidden' }]}
          activeOpacity={0.85}
        >
          <ExpoLinearGradient
            colors={themeMode === 'dark' ? ['#3B82F6', '#1E3A8A'] : ['#60A5FA', '#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.addBtnText, { zIndex: 1 }]}>+ Add Routine</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content loader */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollList}>
          {viewMode === 'schedule' ? (
            /* SCHEDULE CHECKLIST VIEW */
            todaySchedule.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 40 }}>💊</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: 16 * fontScale }]}>
                  No medications scheduled for today. Click "+ Add Routine" to schedule some.
                </Text>
              </View>
            ) : (
              todaySchedule.map((item, idx) => {
                const isLowStock = item.med.stock_remaining <= item.med.refill_alert_threshold;
                return (
                  <Card key={`${item.med.id}-${item.time}-${idx}`} style={styles.scheduleCard}>
                    <View style={styles.scheduleHeader}>
                      <View style={styles.scheduleLeft}>
                        <Text style={[styles.medName, { color: theme.text, fontSize: 18 * fontScale }]}>
                          {item.med.name}
                        </Text>
                        <Text style={[styles.medTime, { color: theme.primary, fontSize: 14 * fontScale }]}>
                          ⏰ Scheduled Time: {item.time}
                        </Text>
                      </View>
                      <View style={styles.actionIconsRow}>
                        <TouchableOpacity onPress={() => handleOpenEdit(item.med)} style={styles.miniActionIcon}>
                          <Text style={{ fontSize: 16, color: theme.primary }}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteMed(item.med.id)} style={[styles.miniActionIcon, { marginLeft: 10 }]}>
                          <Text style={{ fontSize: 16, color: theme.danger }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.medDesc, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>
                      {item.med.dosage} {item.med.unit} — {item.med.instructions || 'No instructions provided.'}
                    </Text>

                    <View style={styles.scheduleBottom}>
                      <Text style={[styles.stockText, { color: isLowStock ? theme.danger : theme.textSecondary, fontSize: 12 * fontScale }]}>
                        Stock: {item.med.stock_remaining} remaining {isLowStock ? '⚠️ LOW' : ''}
                      </Text>

                      {/* Log Action Buttons / Statuses */}
                      {item.taken ? (
                        <View style={[styles.statusBadge, styles.statusTaken]}>
                          <Text style={styles.statusBadgeText}>🟢 Taken</Text>
                        </View>
                      ) : item.skipped ? (
                        <View style={[styles.statusBadge, styles.statusSkipped]}>
                          <Text style={styles.statusBadgeText}>🔴 Skipped</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonsGroup}>
                          <TouchableOpacity
                            onPress={() => handleLogDose(item.med.id, item.time, 'TAKEN')}
                            style={[styles.actionBtn, styles.takeBtn, { minHeight: 48 }]}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.actionBtnText}>✓ Taken</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleLogDose(item.med.id, item.time, 'SKIPPED')}
                            style={[styles.actionBtn, styles.skipBtn, { minHeight: 48 }]}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.actionBtnText}>✕ Skipped</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })
            )
          ) : (
            /* HISTORY COMPLIANCE LOGS VIEW */
            <View>
              {/* Stats Card */}
              <Card style={styles.statsCard}>
                <Text style={[styles.statsTitle, { color: theme.text, fontSize: 16 * fontScale }]}>Adherence Dashboard</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statsBox}>
                    <Text style={[styles.statsVal, { color: theme.text }]}>{historyStats.total}</Text>
                    <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Scheduled</Text>
                  </View>
                  <View style={styles.statsBox}>
                    <Text style={[styles.statsVal, { color: '#10B981' }]}>{historyStats.taken}</Text>
                    <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Taken</Text>
                  </View>
                  <View style={styles.statsBox}>
                    <Text style={[styles.statsVal, { color: theme.danger }]}>{historyStats.missed}</Text>
                    <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Missed</Text>
                  </View>
                  <View style={styles.statsBox}>
                    <Text style={[styles.statsVal, { color: theme.primary }]}>{historyStats.adherence.toFixed(0)}%</Text>
                    <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Compliance</Text>
                  </View>
                </View>
              </Card>

              {/* Date Filters Row */}
              <Card style={styles.filterCard}>
                <View style={styles.filterRow}>
                  <TouchableOpacity
                    onPress={() => setHistoryFilter('today')}
                    style={[styles.filterBtn, historyFilter === 'today' && { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.filterBtnText, { color: historyFilter === 'today' ? '#FFFFFF' : theme.text }]}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setHistoryFilter('7days')}
                    style={[styles.filterBtn, historyFilter === '7days' && { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.filterBtnText, { color: historyFilter === '7days' ? '#FFFFFF' : theme.text }]}>7 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setHistoryFilter('30days')}
                    style={[styles.filterBtn, historyFilter === '30days' && { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.filterBtnText, { color: historyFilter === '30days' ? '#FFFFFF' : theme.text }]}>30 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setHistoryFilter('custom')}
                    style={[styles.filterBtn, historyFilter === 'custom' && { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.filterBtnText, { color: historyFilter === 'custom' ? '#FFFFFF' : theme.text }]}>Custom</Text>
                  </TouchableOpacity>
                </View>

                {historyFilter === 'custom' && (
                  <View style={styles.customDateContainer}>
                    <Input
                      label="Start Date (YYYY-MM-DD)"
                      value={customStart}
                      onChangeText={setCustomStart}
                      placeholder="e.g. 2026-06-01"
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    <Input
                      label="End Date (YYYY-MM-DD)"
                      value={customEnd}
                      onChangeText={setCustomEnd}
                      placeholder="e.g. 2026-06-21"
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </Card>

              {/* Grouped Logs List */}
              {historyLogs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 32 }}>📋</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: 14 * fontScale, marginTop: 8 }]}>
                    No medication log records found for the selected time range.
                  </Text>
                </View>
              ) : (
                Object.keys(historyGrouped).map((dateKey) => (
                  <View key={dateKey} style={styles.dateGroupContainer}>
                    <Text style={[styles.dateGroupHeader, { color: theme.text, fontSize: 15 * fontScale }]}>
                      {dateKey}
                    </Text>
                    {historyGrouped[dateKey].map((log) => (
                      <View
                        key={log.id}
                        style={[
                          styles.logItemRow,
                          {
                            borderColor: theme.border,
                            backgroundColor: theme.card,
                          },
                        ]}
                      >
                        <View style={styles.logLeft}>
                          <Text style={[styles.logCheckIcon, { color: log.status === 'TAKEN' ? '#10B981' : theme.danger }]}>
                            {log.status === 'TAKEN' ? '✓' : '✕'}
                          </Text>
                          <View style={{ marginLeft: 8 }}>
                            <Text style={[styles.logMedName, { color: theme.text, fontSize: 14 * fontScale }]}>
                              {log.name}
                            </Text>
                            <Text style={[styles.logMedTime, { color: theme.textSecondary, fontSize: 12 * fontScale }]}>
                              Dosage: {log.dosage} {log.unit} — Scheduled: {log.scheduled_time.split(' ')[1]}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.logStatusBadge, log.status === 'TAKEN' ? styles.statusTaken : styles.statusSkipped]}>
                          <Text style={styles.logStatusText}>
                            {log.status === 'TAKEN' ? 'Taken' : 'Skipped'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Routine Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 0 }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: 20 * fontScale }]}>
              {editingMed ? 'Edit Medication Schedule' : 'Schedule New Medication'}
            </Text>

            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
              <Input label="Medicine Name" value={name} onChangeText={setName} placeholder="e.g. Lisinopril" />

              <View style={styles.formRow}>
                <Input
                  label="Dosage"
                  value={dosage}
                  onChangeText={setDosage}
                  placeholder="e.g. 10"
                  keyboardType="numeric"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Input
                  label="Unit"
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="e.g. mg, pill, puff"
                  style={{ flex: 1 }}
                />
              </View>

              <Input
                label="Special Instructions"
                value={instructions}
                onChangeText={setInstructions}
                placeholder="e.g. Take with food in the morning"
              />

              <View style={styles.formRow}>
                <Input
                  label="Start Date"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Input label="End Date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
              </View>

              <Input
                label="Frequency Type"
                value={frequencyType}
                onChangeText={setFrequencyType}
                placeholder="Once Daily / Twice Daily / Weekly / Custom"
              />

              <Input
                label="Scheduled Times (comma-separated HH:MM)"
                value={timesInput}
                onChangeText={setTimesInput}
                placeholder="e.g. 08:00, 20:00"
              />

              <View style={styles.formRow}>
                <Input
                  label="Stock Remaining (doses)"
                  value={stockRemaining}
                  onChangeText={setStockRemaining}
                  placeholder="e.g. 60"
                  keyboardType="numeric"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Input
                  label="Refill Notice Threshold"
                  value={refillThreshold}
                  onChangeText={setRefillThreshold}
                  placeholder="e.g. 7"
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                />
              </View>

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: theme.text, fontSize: 16 * fontScale }]}>
                  Enable Local Reminders (Alarms)
                </Text>
                <Switch value={remindersEnabled} onValueChange={setRemindersEnabled} trackColor={{ true: theme.primary }} />
              </View>

              <View style={{ marginTop: 24 }}>
                <Button title={editingMed ? 'Save Changes' : 'Schedule Medication'} onPress={handleSaveMed} variant="primary" />
                <Button
                  title="Cancel"
                  onPress={() => setModalVisible(false)}
                  variant="secondary"
                  style={{ marginTop: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    zIndex: 100,
  },
  dropdownContainer: {
    position: 'relative',
    width: '60%',
  },
  dropdownSelect: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  dropdownSelectText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 52,
    left: 0,
    width: 220,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownOptionText: {
    fontSize: 14,
  },
  addBtn: {
    width: '36%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 120,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  scheduleCard: {
    padding: 14,
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scheduleLeft: {
    flex: 1,
  },
  medName: {
    fontWeight: '900',
  },
  medTime: {
    fontWeight: '700',
    marginTop: 4,
  },
  actionIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniActionIcon: {
    padding: 6,
  },
  medDesc: {
    marginTop: 8,
    lineHeight: 18,
  },
  scheduleBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  stockText: {
    fontWeight: '600',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusTaken: {
    backgroundColor: '#D1FAE5',
  },
  statusSkipped: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  buttonsGroup: {
    flexDirection: 'row',
  },
  actionBtn: {
    paddingHorizontal: 12,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
  },
  takeBtn: {
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  skipBtn: {
    backgroundColor: '#EF4444',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statsCard: {
    padding: 16,
    marginBottom: 12,
  },
  statsTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsBox: {
    alignItems: 'center',
    width: '23%',
  },
  statsVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  filterCard: {
    padding: 12,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: '#F1F5F9',
  },
  filterBtnText: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  customDateContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  dateGroupContainer: {
    marginBottom: 16,
  },
  dateGroupHeader: {
    fontWeight: 'bold',
    marginBottom: 8,
    paddingLeft: 4,
  },
  logItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logCheckIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'center',
  },
  logMedName: {
    fontWeight: '700',
  },
  logMedTime: {
    marginTop: 2,
  },
  logStatusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  logStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formScroll: {
    paddingBottom: 24,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontWeight: '600',
  },
});
