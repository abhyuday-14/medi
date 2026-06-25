import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import {
  getMedicalProfile,
  getEmergencyContact,
  getMedications,
  getVitalsRange,
  getSymptomsHistory,
  getDoctorVisits,
  getAdherenceStats,
  addReport,
  getReports,
  deleteReport,
  ReportDB,
  VitalDB,
  SymptomDB,
} from '../../database/dbHelpers';
import { generateAndShareReport, ReportData } from '../../services/pdfService';
import { deleteLocalFile } from '../../services/fileService';
import * as Sharing from 'expo-sharing';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { BackgroundGrid } from '../../components/BackgroundGrid';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

export const ReportsScreen: React.FC = () => {
  const { themeMode, contrastMode, fontSizeScale, user } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [exporting, setExporting] = useState(false);
  const [savedReports, setSavedReports] = useState<ReportDB[]>([]);

  useEffect(() => {
    if (user) {
      loadSavedReports();
    }
  }, [user]);

  const loadSavedReports = () => {
    const list = getReports(user?.id || 1);
    setSavedReports(list);
  };

  const handleExportReport = async () => {
    if (!user) return;
    setExporting(true);

    try {
      const days = parseInt(dateRange, 10);
      const dateRangeLabel = days === 7 ? 'Last 7 Days (Weekly)' : days === 30 ? 'Last 30 Days (Monthly)' : 'Last 90 Days (Quarterly)';

      // 1. Fetch Patient Info & Medical Profile
      const mProfile = getMedicalProfile(user.id);
      if (!mProfile) {
        Alert.alert('Incomplete Profile', 'Please complete your medical profile first.');
        setExporting(false);
        return;
      }

      // Parse JSON fields
      let conditions: string[] = [];
      let allergies: string[] = [];
      let currentMeds: string[] = [];
      try { conditions = JSON.parse(mProfile.conditions || '[]'); } catch {}
      try { allergies = JSON.parse(mProfile.allergies || '[]'); } catch {}
      try { currentMeds = JSON.parse(mProfile.medications || '[]'); } catch {}

      // 2. Fetch Emergency Contact
      const eContact = getEmergencyContact(user.id);
      const emergencyContact = eContact ? { name: eContact.name, relation: eContact.relation, phone: eContact.phone } : null;

      // 3. Fetch Medications list
      const meds = getMedications(user.id);
      const medicationList = meds.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        unit: m.unit,
        instructions: m.instructions || 'None',
        frequencyType: m.frequency_type,
        stock: m.stock_remaining,
      }));

      // 4. Fetch Adherence Rate
      const stats = getAdherenceStats(user.id, days);
      const adherencePercentage = stats.total > 0 ? (stats.taken / stats.total) * 100 : 100;

      // 5. Fetch Vitals logs
      const vitalsLogs = getVitalsRange(user.id, days);

      // 6. Fetch Symptom logs
      const allSymptoms = getSymptomsHistory(user.id, 100);
      const symptomLogs = allSymptoms.filter((s) => {
        const logDate = new Date(s.timestamp);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return logDate >= cutoff;
      });

      // 7. Fetch Doctor Visits
      const allVisits = getDoctorVisits(user.id);
      const doctorVisits = allVisits.filter((v) => {
        const vDate = new Date(v.visit_date);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return vDate >= cutoff;
      });

      // Validation: If no data exists at all
      if (
        vitalsLogs.length === 0 &&
        medicationList.length === 0 &&
        symptomLogs.length === 0 &&
        doctorVisits.length === 0
      ) {
        Alert.alert('No Data Found', 'No health data available for selected period.');
        setExporting(false);
        return;
      }

      // Assemble full report dataset
      const reportData: ReportData = {
        patientName: user.name,
        age: mProfile.age,
        gender: mProfile.gender,
        bloodGroup: mProfile.blood_group,
        dob: mProfile.dob,
        height: mProfile.height,
        weight: mProfile.weight,
        conditions,
        allergies,
        medications: currentMeds,
        emergencyContact,
        adherencePercentage,
        medicationList,
        vitalsLogs: vitalsLogs.map((v) => ({
          systolic: v.systolic || undefined,
          diastolic: v.diastolic || undefined,
          blood_sugar_fasting: v.blood_sugar_fasting || undefined,
          blood_sugar_post_meal: v.blood_sugar_post_meal || undefined,
          temperature: v.temperature || undefined,
          weight: v.weight || undefined,
          spo2: v.spo2 || undefined,
          heart_rate: v.heart_rate || undefined,
          timestamp: v.timestamp,
        })),
        symptomLogs: symptomLogs.map((s) => ({
          name: s.name,
          severity: s.severity,
          notes: s.notes || undefined,
          timestamp: s.timestamp,
        })),
        doctorVisits: doctorVisits.map((v) => ({
          visit_date: v.visit_date,
          doctor_name: v.doctor_name,
          specialization: v.specialization,
          notes: v.notes || undefined,
          prescription_summary: v.prescription_summary || undefined,
          follow_up_date: v.follow_up_date || undefined,
        })),
      };

      // Generate PDF & save metadata
      const filePath = await generateAndShareReport(reportData, dateRangeLabel);
      if (filePath) {
        const reportName = `Health Report - ${dateRangeLabel}`;
        addReport(user.id, reportName, filePath);
        loadSavedReports();

        Alert.alert('Report Generated', 'Your health summary PDF report was compiled successfully.');

        // For native mobile, trigger sharing overlay immediately
        if (Platform.OS !== 'web' && filePath !== 'web_print') {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, {
              mimeType: 'application/pdf',
              dialogTitle: reportName,
              UTI: 'com.adobe.pdf',
            });
          }
        }
      } else {
        Alert.alert('Export Failed', 'Unable to generate PDF report.');
      }

    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An error occurred during report preparation.');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenReport = async (report: ReportDB) => {
    if (Platform.OS === 'web' || report.file_path === 'web_print') {
      Alert.alert('Web Print', 'Print/PDF view was triggered in your browser tab.');
      return;
    }

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(report.file_path, {
          mimeType: 'application/pdf',
          dialogTitle: report.report_name,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Unavailable', 'Sharing is not available on this platform.');
      }
    } catch (e) {
      console.error('Error opening report:', e);
      Alert.alert('Error', 'Could not open the report file.');
    }
  };

  const handleDeleteReport = (report: ReportDB) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            deleteReport(report.id);
            if (Platform.OS !== 'web' && report.file_path !== 'web_print') {
              await deleteLocalFile(report.file_path);
            }
            loadSavedReports();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundGrid />
      <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]} contentContainerStyle={{ paddingBottom: 120 }}>
      <Text style={[styles.title, { color: theme.text, fontSize: 22 * fontScale }]}>Clinical PDF Reports</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>
        Compile and export structured clinical records to share with your physicians and specialists.
      </Text>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.text, fontSize: 16 * fontScale }]}>Select Reporting Date Window</Text>
        
        <View style={styles.selectorRow}>
          <TouchableOpacity
            onPress={() => setDateRange('7')}
            style={[
              styles.selectorBtn,
              {
                backgroundColor: dateRange === '7' ? theme.primary : theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                overflow: 'hidden',
              },
            ]}
          >
            {dateRange === '7' && (
              <ExpoLinearGradient
                colors={themeMode === 'dark' ? ['#3B82F6', '#1E3A8A'] : ['#60A5FA', '#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[styles.selectorBtnText, { color: dateRange === '7' ? '#FFFFFF' : theme.text, fontSize: 14 * fontScale, zIndex: 1 }]}>
              Weekly (7d)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDateRange('30')}
            style={[
              styles.selectorBtn,
              {
                backgroundColor: dateRange === '30' ? theme.primary : theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                marginLeft: 8,
                overflow: 'hidden',
              },
            ]}
          >
            {dateRange === '30' && (
              <ExpoLinearGradient
                colors={themeMode === 'dark' ? ['#3B82F6', '#1E3A8A'] : ['#60A5FA', '#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[styles.selectorBtnText, { color: dateRange === '30' ? '#FFFFFF' : theme.text, fontSize: 14 * fontScale, zIndex: 1 }]}>
              Monthly (30d)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDateRange('90')}
            style={[
              styles.selectorBtn,
              {
                backgroundColor: dateRange === '90' ? theme.primary : theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                marginLeft: 8,
                overflow: 'hidden',
              },
            ]}
          >
            {dateRange === '90' && (
              <ExpoLinearGradient
                colors={themeMode === 'dark' ? ['#3B82F6', '#1E3A8A'] : ['#60A5FA', '#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[styles.selectorBtnText, { color: dateRange === '90' ? '#FFFFFF' : theme.text, fontSize: 14 * fontScale, zIndex: 1 }]}>
              Quarterly (90d)
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Information recap block */}
      <Card style={styles.infoCard}>
        <Text style={[styles.infoTitle, { color: theme.text, fontSize: 15 * fontScale }]}>📋 Included In Your PDF Report:</Text>
        
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.bulletLabel, { color: theme.text, fontSize: 14 * fontScale }]}>Patient demographics, vital statistics, conditions, and allergies.</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.bulletLabel, { color: theme.text, fontSize: 14 * fontScale }]}>Medication compliance rate and active daily schedules.</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.bulletLabel, { color: theme.text, fontSize: 14 * fontScale }]}>History log records for blood pressure, sugar, SpO2, and weight.</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.bulletLabel, { color: theme.text, fontSize: 14 * fontScale }]}>Timeline of experienced symptoms and severity charts.</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.bulletLabel, { color: theme.text, fontSize: 14 * fontScale }]}>Consultation summaries and special clinic/hospital tags.</Text>
        </View>
      </Card>

      {/* Export Action */}
      <View style={styles.actionBlock}>
        {exporting ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loaderText, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>
              Generating report...
            </Text>
          </View>
        ) : (
          <Button title="📄 Compile & Export PDF Report" onPress={handleExportReport} variant="primary" style={styles.exportBtn} />
        )}
      </View>

      {/* Saved Reports History */}
      <Card style={[styles.historyCard, { marginBottom: 35 }]}>
        <Text style={[styles.historyTitle, { color: theme.text, fontSize: 16 * fontScale }]}>
          📂 Saved Reports History
        </Text>
        
        {savedReports.length === 0 ? (
          <Text style={[styles.emptyHistoryText, { color: theme.textSecondary, fontSize: 14 * fontScale }]}>
            No compiled clinical reports yet. Choose a date window above and click Compile to export.
          </Text>
        ) : (
          savedReports.map((report) => (
            <View
              key={report.id}
              style={[
                styles.historyItem,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.text, fontSize: 14 * fontScale }]} numberOfLines={1}>
                  {report.report_name}
                </Text>
                <Text style={[styles.itemDate, { color: theme.textSecondary, fontSize: 12 * fontScale }]}>
                  Generated: {new Date(report.generated_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => handleOpenReport(report)}
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                  accessibilityLabel={`Open ${report.report_name}`}
                >
                  <Text style={styles.actionBtnText}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteReport(report)}
                  style={[styles.actionBtn, styles.deleteBtn]}
                  accessibilityLabel={`Delete ${report.report_name}`}
                >
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: {
    fontWeight: '500',
    marginTop: 6,
    lineHeight: 22,
    marginBottom: 16,
  },
  card: {
    padding: 14,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  selectorRow: {
    flexDirection: 'row',
  },
  selectorBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorBtnText: {
    fontWeight: 'bold',
  },
  infoCard: {
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    lineHeight: 18,
  },
  bulletLabel: {
    flex: 1,
    lineHeight: 20,
  },
  actionBlock: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  loaderContainer: {
    alignItems: 'center',
    padding: 16,
  },
  loaderText: {
    fontWeight: '600',
    marginTop: 12,
  },
  exportBtn: {
    width: '100%',
    height: 52,
  },
  historyCard: {
    padding: 16,
    marginTop: 8,
  },
  historyTitle: {
    fontWeight: 'bold',
    marginBottom: 14,
  },
  emptyHistoryText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 6,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 10,
  },
  itemName: {
    fontWeight: '700',
    marginBottom: 4,
  },
  itemDate: {
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
});
