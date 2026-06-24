import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import { getDoctorVisits, addDoctorVisit, updateDoctorVisit, DoctorVisitDB } from '../../database/dbHelpers';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

export const DoctorVisitsScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const { themeMode, contrastMode, fontSizeScale, user, addNotification } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [loading, setLoading] = useState(true);
  const [visitsList, setVisitsList] = useState<DoctorVisitDB[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVisit, setEditingVisit] = useState<DoctorVisitDB | null>(null);

  // Form states
  const [visitDate, setVisitDate] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [clinicHospital, setClinicHospital] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptionSummary, setPrescriptionSummary] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    if (isFocused && user) {
      loadDoctorVisits();
    }
  }, [isFocused, user]);

  const loadDoctorVisits = () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = getDoctorVisits(user.id);
      setVisitsList(data);

      // Alert about upcoming follow-ups if they exist
      data.forEach((visit) => {
        if (visit.follow_up_date) {
          const followUp = new Date(visit.follow_up_date);
          const diffDays = Math.ceil((followUp.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 0 && diffDays <= 7) {
            addNotification({
              title: `📅 Follow-up Appointment: ${visit.doctor_name}`,
              message: `You have a follow-up scheduled on ${visit.follow_up_date} (${diffDays} days away) with ${visit.doctor_name}.`,
              type: 'appointment',
              referenceId: visit.id,
            });
          }
        }
      });
    } catch (error) {
      console.error('Error loading doctor visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingVisit(null);
    setVisitDate(new Date().toISOString().split('T')[0]);
    setDoctorName('');
    setSpecialization('');
    setClinicHospital('');
    setNotes('');
    setPrescriptionSummary('');
    setFollowUpDate('');
    setModalVisible(true);
  };

  const handleOpenEdit = (visit: DoctorVisitDB) => {
    setEditingVisit(visit);
    setVisitDate(visit.visit_date);
    setDoctorName(visit.doctor_name);
    setSpecialization(visit.specialization);
    setClinicHospital(visit.clinic_hospital);
    setNotes(visit.notes || '');
    setPrescriptionSummary(visit.prescription_summary || '');
    setFollowUpDate(visit.follow_up_date || '');
    setModalVisible(true);
  };

  const handleSaveVisit = () => {
    if (!user) return;

    if (!visitDate.trim() || !doctorName.trim() || !specialization.trim() || !clinicHospital.trim()) {
      Alert.alert('Validation Error', 'Date, Doctor Name, Specialization, and Clinic/Hospital are required fields.');
      return;
    }

    const visitData = {
      user_id: user.id,
      visit_date: visitDate.trim(),
      doctor_name: doctorName.trim(),
      specialization: specialization.trim(),
      clinic_hospital: clinicHospital.trim(),
      notes: notes.trim() || null,
      prescription_summary: prescriptionSummary.trim() || null,
      follow_up_date: followUpDate.trim() || null,
    };

    try {
      if (editingVisit) {
        updateDoctorVisit({
          ...visitData,
          id: editingVisit.id,
        });
        Alert.alert('Success', 'Visit entry updated successfully.');
      } else {
        addDoctorVisit(visitData);
        Alert.alert('Success', 'Doctor visit logged successfully.');
      }

      setModalVisible(false);
      loadDoctorVisits(); // Reload list
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save doctor visit details.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontSize: 22 * fontScale }]}>Doctor Visit Logs</Text>
        <TouchableOpacity
          onPress={handleOpenAdd}
          style={[styles.addBtn, { backgroundColor: theme.primary, minHeight: 48, minWidth: 48 }]}
        >
          <Text style={styles.addBtnText}>+ Log Visit</Text>
        </TouchableOpacity>
      </View>

      {/* Visits List */}
      <ScrollView contentContainerStyle={styles.scrollList}>
        {visitsList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 40 }}>🩺</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 16 * fontScale, marginTop: 8, textAlign: 'center' }}>
              No doctor visits logged yet. Click "+ Log Visit" to document a consultation.
            </Text>
          </View>
        ) : (
          visitsList.map((visit) => (
            <Card key={visit.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.doctorName, { color: theme.text, fontSize: 17 * fontScale }]}>
                    {visit.doctor_name}
                  </Text>
                  <Text style={[styles.specialization, { color: theme.primary, fontSize: 14 * fontScale }]}>
                    {visit.specialization}
                  </Text>
                  <Text style={[styles.clinicText, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>
                    🏥 {visit.clinic_hospital}
                  </Text>
                </View>
                
                <TouchableOpacity onPress={() => handleOpenEdit(visit)} style={styles.editBtn}>
                  <Text style={{ fontSize: 16, color: theme.primary }}>✏️ Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.detailsDivider} />

              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: theme.text, fontSize: 13 * fontScale }]}>
                  📅 Date: <strong>{visit.visit_date}</strong>
                </Text>
                {visit.follow_up_date && (
                  <Text style={[styles.metaText, { color: theme.danger, fontSize: 13 * fontScale, fontWeight: 'bold' }]}>
                    📅 Follow-up: {visit.follow_up_date}
                  </Text>
                )}
              </View>

              {visit.notes && (
                <View style={styles.contentBlock}>
                  <Text style={[styles.blockLabel, { color: theme.textSecondary, fontSize: 12 * fontScale }]}>Consultation Notes</Text>
                  <Text style={[styles.blockValue, { color: theme.text, fontSize: 14 * fontScale }]}>
                    {visit.notes}
                  </Text>
                </View>
              )}

              {visit.prescription_summary && (
                <View style={[styles.contentBlock, { marginTop: 8, backgroundColor: theme.primaryLight, padding: 8, borderRadius: 6 }]}>
                  <Text style={[styles.blockLabel, { color: theme.primary, fontSize: 12 * fontScale }]}>Prescription Changes</Text>
                  <Text style={[styles.blockValue, { color: theme.text, fontSize: 14 * fontScale }]}>
                    {visit.prescription_summary}
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 0 }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: 20 * fontScale }]}>
              {editingVisit ? 'Edit Visit Log' : 'Log Doctor Visit'}
            </Text>

            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
              <Input label="Visit Date" value={visitDate} onChangeText={setVisitDate} placeholder="YYYY-MM-DD" />
              <Input label="Doctor's Full Name" value={doctorName} onChangeText={setDoctorName} placeholder="Dr. Robert Chen" />
              <Input label="Specialization / Specialty" value={specialization} onChangeText={setSpecialization} placeholder="e.g. Cardiologist, Endocrinologist" />
              <Input label="Clinic / Hospital Name" value={clinicHospital} onChangeText={setClinicHospital} placeholder="Metropolitan Health Clinic" />
              
              <Input
                label="Diagnosis / Consultation Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Details about visit discussions and recommendations..."
                multiline={true}
              />

              <Input
                label="Prescription changes Summary"
                value={prescriptionSummary}
                onChangeText={setPrescriptionSummary}
                placeholder="e.g. Lisinopril continued, Metformin doubled to 1000mg"
                multiline={true}
              />

              <Input
                label="Scheduled Follow-up Date (Optional)"
                value={followUpDate}
                onChangeText={setFollowUpDate}
                placeholder="YYYY-MM-DD"
              />

              <View style={{ marginTop: 24 }}>
                <Button title={editingVisit ? 'Update Log' : 'Save Visit Log'} onPress={handleSaveVisit} variant="primary" />
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
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  visitCard: {
    padding: 14,
    marginBottom: 12,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doctorName: {
    fontWeight: '900',
  },
  specialization: {
    fontWeight: '700',
    marginVertical: 2,
  },
  clinicText: {
    fontWeight: '500',
  },
  editBtn: {
    padding: 6,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: {
    fontWeight: '500',
  },
  contentBlock: {
    marginTop: 6,
  },
  blockLabel: {
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockValue: {
    lineHeight: 20,
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
    maxHeight: '90%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formScroll: {
    paddingBottom: 24,
  },
});
