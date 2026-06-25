import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import { getVitalsHistory, addVitalLog, VitalDB } from '../../database/dbHelpers';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { VitalBadge, VitalStatus } from '../../components/VitalBadge';
import { BackgroundGrid } from '../../components/BackgroundGrid';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

export const VitalsScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const { themeMode, contrastMode, fontSizeScale, user } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [loading, setLoading] = useState(true);
  const [vitalsList, setVitalsList] = useState<VitalDB[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Form inputs state
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [sugarFasting, setSugarFasting] = useState('');
  const [sugarPostMeal, setSugarPostMeal] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [spo2, setSpo2] = useState('');
  const [heartRate, setHeartRate] = useState('');

  useEffect(() => {
    if (isFocused && user) {
      loadVitals();
    }
  }, [isFocused, user]);

  const loadVitals = () => {
    if (!user) return;
    setLoading(true);
    try {
      const history = getVitalsHistory(user.id, 50);
      setVitalsList(history);
    } catch (error) {
      console.error('Error loading vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVitals = () => {
    if (!user) return;

    // Check if at least one vital parameter is entered
    if (
      !systolic &&
      !diastolic &&
      !sugarFasting &&
      !sugarPostMeal &&
      !temperature &&
      !weight &&
      !spo2 &&
      !heartRate
    ) {
      Alert.alert('Empty Form', 'Please enter at least one vital parameter value to save a log.');
      return;
    }

    // Parse inputs
    const pSystolic = systolic ? parseFloat(systolic) : null;
    const pDiastolic = diastolic ? parseFloat(diastolic) : null;
    const pSugarFasting = sugarFasting ? parseFloat(sugarFasting) : null;
    const pSugarPostMeal = sugarPostMeal ? parseFloat(sugarPostMeal) : null;
    const pTemp = temperature ? parseFloat(temperature) : null;
    const pWeight = weight ? parseFloat(weight) : null;
    const pSpo2 = spo2 ? parseFloat(spo2) : null;
    const pBpm = heartRate ? parseFloat(heartRate) : null;

    // Save log
    addVitalLog({
      user_id: user.id,
      systolic: pSystolic,
      diastolic: pDiastolic,
      blood_sugar_fasting: pSugarFasting,
      blood_sugar_post_meal: pSugarPostMeal,
      temperature: pTemp,
      weight: pWeight,
      spo2: pSpo2,
      heart_rate: pBpm,
    });

    Alert.alert('Saved', 'Your vitals have been logged successfully.');
    setModalVisible(false);
    
    // Clear form inputs
    setSystolic('');
    setDiastolic('');
    setSugarFasting('');
    setSugarPostMeal('');
    setTemperature('');
    setWeight('');
    setSpo2('');
    setHeartRate('');
    
    // Refresh history
    loadVitals();
  };

  // Threshold evaluations based on prompt requirements
  const getBpStatus = (sys: number | null, dia: number | null): { status: VitalStatus; text: string } | null => {
    if (sys === null || dia === null) return null;
    // Critical: >=140 systolic OR >=90 diastolic
    if (sys >= 140 || dia >= 90) return { status: 'critical', text: 'Critical High' };
    // Borderline: 121-139 systolic OR 81-89 diastolic
    if ((sys >= 121 && sys <= 139) || (dia >= 81 && dia <= 89)) return { status: 'borderline', text: 'Borderline' };
    // Normal: 90-120 systolic AND 60-80 diastolic
    if (sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80) return { status: 'normal', text: 'Normal' };
    return { status: 'borderline', text: 'Varying' };
  };

  const getSugarStatus = (fasting: number | null): { status: VitalStatus; text: string } | null => {
    if (fasting === null) return null;
    // Critical: >=126
    if (fasting >= 126) return { status: 'critical', text: 'Critical High' };
    // Borderline: 100-125
    if (fasting >= 100 && fasting <= 125) return { status: 'borderline', text: 'Pre-diabetic' };
    // Normal: <100
    return { status: 'normal', text: 'Normal' };
  };

  const getSpo2Status = (val: number | null): { status: VitalStatus; text: string } | null => {
    if (val === null) return null;
    // Critical: below 90
    if (val < 90) return { status: 'critical', text: 'Critical Low' };
    // Borderline: 90-94
    if (val >= 90 && val <= 94) return { status: 'borderline', text: 'Borderline' };
    // Normal: 95-100
    return { status: 'normal', text: 'Normal' };
  };

  const getTempStatus = (val: number | null): { status: VitalStatus; text: string } | null => {
    if (val === null) return null;
    // Critical: >=38 or <36.1
    if (val >= 38 || val < 36.1) return { status: 'critical', text: 'Fever/Low Temp' };
    // Normal: 36.1-37.2
    return { status: 'normal', text: 'Normal' };
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundGrid />
      <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* Title Header with Add Button */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontSize: 22 * fontScale }]}>Vitals Log History</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.addBtn, { backgroundColor: theme.primary, minHeight: 48, minWidth: 48, overflow: 'hidden' }]}
          >
            <ExpoLinearGradient
              colors={themeMode === 'dark' ? ['#3B82F6', '#1E3A8A'] : ['#60A5FA', '#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.addBtnText, { zIndex: 1 }]}>+ Log Vitals</Text>
          </TouchableOpacity>
        </View>

        {/* History scroll list */}
        <View style={styles.scrollList}>
          {vitalsList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40 }}>🩸</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 16 * fontScale, marginTop: 8 }}>
                No vitals logged yet. Tap the button above to log your first record.
              </Text>
            </View>
          ) : (
            vitalsList.map((item) => {
              const bp = getBpStatus(item.systolic, item.diastolic);
              const sugar = getSugarStatus(item.blood_sugar_fasting);
              const oxygen = getSpo2Status(item.spo2);
              const temp = getTempStatus(item.temperature);

              return (
                <Card key={item.id} style={styles.vitalCard}>
                  {/* Date Header */}
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTime, { color: theme.textSecondary, fontSize: 14 * fontScale }]}>
                      📅 {new Date(item.timestamp).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>

                  {/* Grid layout for parameters */}
                  <View style={styles.paramGrid}>
                    {/* BP */}
                    {item.systolic && item.diastolic && bp && (
                      <View style={styles.paramBox}>
                        <Text style={[styles.paramName, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>BP</Text>
                        <Text style={[styles.paramVal, { color: theme.text, fontSize: 16 * fontScale }]}>
                          {item.systolic}/{item.diastolic}
                          <Text style={{ fontSize: 10 }}> mmHg</Text>
                        </Text>
                        <VitalBadge status={bp.status} label={bp.text} />
                      </View>
                    )}

                    {/* Sugar */}
                    {(item.blood_sugar_fasting || item.blood_sugar_post_meal) && (
                      <View style={styles.paramBox}>
                        <Text style={[styles.paramName, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>Sugar</Text>
                        <Text style={[styles.paramVal, { color: theme.text, fontSize: 15 * fontScale }]}>
                          {item.blood_sugar_fasting ? `Fasting: ${item.blood_sugar_fasting}` : ''}
                          {item.blood_sugar_post_meal ? `Post: ${item.blood_sugar_post_meal}` : ''}
                          <Text style={{ fontSize: 10 }}> mg/dL</Text>
                        </Text>
                        {sugar && <VitalBadge status={sugar.status} label={sugar.text} />}
                      </View>
                    )}

                    {/* SpO2 */}
                    {item.spo2 && oxygen && (
                      <View style={styles.paramBox}>
                        <Text style={[styles.paramName, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>SpO2</Text>
                        <Text style={[styles.paramVal, { color: theme.text, fontSize: 16 * fontScale }]}>
                          {item.spo2}%
                        </Text>
                        <VitalBadge status={oxygen.status} label={oxygen.text} />
                      </View>
                    )}

                    {/* Temp */}
                    {item.temperature && temp && (
                      <View style={styles.paramBox}>
                        <Text style={[styles.paramName, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>Temp</Text>
                        <Text style={[styles.paramVal, { color: theme.text, fontSize: 16 * fontScale }]}>
                          {item.temperature}°C
                        </Text>
                        <VitalBadge status={temp.status} label={temp.text} />
                      </View>
                    )}

                    {/* HR */}
                    {item.heart_rate && (
                      <View style={styles.paramBox}>
                        <Text style={[styles.paramName, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>HR</Text>
                        <Text style={[styles.paramVal, { color: theme.text, fontSize: 16 * fontScale }]}>
                          {item.heart_rate} <Text style={{ fontSize: 10 }}>BPM</Text>
                        </Text>
                      </View>
                    )}

                    {/* Weight */}
                    {item.weight && (
                      <View style={styles.paramBox}>
                        <Text style={[styles.paramName, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>Weight</Text>
                        <Text style={[styles.paramVal, { color: theme.text, fontSize: 16 * fontScale }]}>
                          {item.weight} <Text style={{ fontSize: 10 }}>kg</Text>
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Logging Modal Form */}
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 0 }]}>
              <Text style={[styles.modalTitle, { color: theme.text, fontSize: 20 * fontScale }]}>Log Today's Vitals</Text>

              <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.formRow}>
                  <Input
                    label="Systolic BP (mmHg)"
                    value={systolic}
                    onChangeText={setSystolic}
                    placeholder="e.g. 120"
                    keyboardType="numeric"
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Input
                    label="Diastolic BP (mmHg)"
                    value={diastolic}
                    onChangeText={setDiastolic}
                    placeholder="e.g. 80"
                    keyboardType="numeric"
                    style={{ flex: 1 }}
                  />
                </View>

                <View style={styles.formRow}>
                  <Input
                    label="Fasting Sugar (mg/dL)"
                    value={sugarFasting}
                    onChangeText={setSugarFasting}
                    placeholder="e.g. 95"
                    keyboardType="numeric"
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Input
                    label="Post-Meal Sugar (mg/dL)"
                    value={sugarPostMeal}
                    onChangeText={setSugarPostMeal}
                    placeholder="e.g. 140"
                    keyboardType="numeric"
                    style={{ flex: 1 }}
                  />
                </View>

                <View style={styles.formRow}>
                  <Input
                    label="SpO2 (%)"
                    value={spo2}
                    onChangeText={setSpo2}
                    placeholder="e.g. 98"
                    keyboardType="numeric"
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Input
                    label="Heart Rate (BPM)"
                    value={heartRate}
                    onChangeText={setHeartRate}
                    placeholder="e.g. 72"
                    keyboardType="numeric"
                    style={{ flex: 1 }}
                  />
                </View>

                <View style={styles.formRow}>
                  <Input
                    label="Temperature (°C)"
                    value={temperature}
                    onChangeText={setTemperature}
                    placeholder="e.g. 36.6"
                    keyboardType="numeric"
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Input
                    label="Weight (kg)"
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="e.g. 78.4"
                    keyboardType="numeric"
                    style={{ flex: 1 }}
                  />
                </View>

                <View style={{ marginTop: 24 }}>
                  <Button title="Save Log Record" onPress={handleSaveVitals} variant="primary" />
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  addBtn: {
    paddingHorizontal: 16,
    borderRadius: 8,
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
  vitalCard: {
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  cardTime: {
    fontWeight: '600',
  },
  paramGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paramBox: {
    width: '48%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
    backgroundColor: '#FAFDFE',
    borderRadius: 6,
    marginVertical: 4,
  },
  paramName: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  paramVal: {
    fontWeight: 'bold',
    marginVertical: 4,
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
});
