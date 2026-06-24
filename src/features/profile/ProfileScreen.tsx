import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import { getMedicalProfile, updateMedicalProfile, getEmergencyContact, saveEmergencyContact, MedicalProfileDB } from '../../database/dbHelpers';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { BackgroundGrid } from '../../components/BackgroundGrid';

type ProfileSection = 'personal' | 'medical' | 'emergency';

export const ProfileScreen: React.FC = () => {
  const { themeMode, contrastMode, fontSizeScale, user, logout } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<MedicalProfileDB | null>(null);
  
  // Form states - Personal Info
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Form states - Medical Info (comma separated strings for ease of entry)
  const [conditions, setConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');

  // Form states - Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = () => {
    if (!user) return;
    
    // Load Medical Profile
    const medProfile = getMedicalProfile(user.id);
    if (medProfile) {
      setProfile(medProfile);
      
      // Personal
      setName(user.name);
      setAge(medProfile.age.toString());
      setGender(medProfile.gender);
      setDob(medProfile.dob);
      setBloodGroup(medProfile.blood_group);
      setHeight(medProfile.height.toString());
      setWeight(medProfile.weight.toString());

      // Medical Arrays
      setConditions(parseJsonArrayToCommaString(medProfile.conditions));
      setAllergies(parseJsonArrayToCommaString(medProfile.allergies));
      setMedications(parseJsonArrayToCommaString(medProfile.medications));
      setSurgeries(parseJsonArrayToCommaString(medProfile.surgeries));
      setFamilyHistory(parseJsonArrayToCommaString(medProfile.family_history));
    }

    // Load Emergency Contact
    const contact = getEmergencyContact(user.id);
    if (contact) {
      setEmergencyName(contact.name);
      setEmergencyRelation(contact.relation);
      setEmergencyPhone(contact.phone);
    }
  };

  const parseJsonArrayToCommaString = (jsonStr: string | null): string => {
    if (!jsonStr) return '';
    try {
      const arr = JSON.parse(jsonStr);
      return Array.isArray(arr) ? arr.join(', ') : '';
    } catch {
      return '';
    }
  };

  const parseCommaStringToJsonArray = (commaStr: string): string => {
    const arr = commaStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return JSON.stringify(arr);
  };

  const handleSave = () => {
    if (!user || !profile) return;

    // Validate inputs
    if (activeSection === 'personal') {
      if (!name.trim() || !age.trim() || !dob.trim() || !bloodGroup.trim() || !height.trim() || !weight.trim()) {
        Alert.alert('Validation Error', 'Please fill in all personal details.');
        return;
      }
      
      const parsedAge = parseInt(age, 10);
      const parsedHeight = parseFloat(height);
      const parsedWeight = parseFloat(weight);

      if (isNaN(parsedAge) || isNaN(parsedHeight) || isNaN(parsedWeight)) {
        Alert.alert('Validation Error', 'Age, height, and weight must be numerical values.');
        return;
      }

      updateMedicalProfile({
        user_id: user.id,
        age: parsedAge,
        gender,
        dob,
        blood_group: bloodGroup,
        height: parsedHeight,
        weight: parsedWeight,
        conditions: profile.conditions,
        allergies: profile.allergies,
        medications: profile.medications,
        surgeries: profile.surgeries,
        family_history: profile.family_history,
      });

      Alert.alert('Success', 'Personal profile details updated.');
    } 
    
    else if (activeSection === 'medical') {
      updateMedicalProfile({
        user_id: user.id,
        age: profile.age,
        gender: profile.gender,
        dob: profile.dob,
        blood_group: profile.blood_group,
        height: profile.height,
        weight: profile.weight,
        conditions: parseCommaStringToJsonArray(conditions),
        allergies: parseCommaStringToJsonArray(allergies),
        medications: parseCommaStringToJsonArray(medications),
        surgeries: parseCommaStringToJsonArray(surgeries),
        family_history: parseCommaStringToJsonArray(familyHistory),
      });

      Alert.alert('Success', 'Medical records updated.');
    } 
    
    else if (activeSection === 'emergency') {
      if (!emergencyName.trim() || !emergencyRelation.trim() || !emergencyPhone.trim()) {
        Alert.alert('Validation Error', 'Please fill in all emergency contact details.');
        return;
      }

      saveEmergencyContact(user.id, emergencyName, emergencyRelation, emergencyPhone);
      Alert.alert('Success', 'Emergency contact saved.');
    }

    setIsEditing(false);
    loadProfileData(); // Reload
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out of your session?')) {
        logout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to log out of your session?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const renderPersonalView = () => {
    if (isEditing) {
      return (
        <Card style={styles.formCard}>
          <Input label="Full Name" value={name} onChangeText={setName} placeholder="John Doe" />
          <Input label="Age" value={age} onChangeText={setAge} placeholder="e.g. 65" keyboardType="number-pad" />
          <Input label="Gender" value={gender} onChangeText={setGender} placeholder="Male / Female / Other" />
          <Input label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
          <Input label="Blood Group" value={bloodGroup} onChangeText={setBloodGroup} placeholder="e.g. A-Positive" />
          <Input label="Height (cm)" value={height} onChangeText={setHeight} placeholder="e.g. 175" keyboardType="decimal-pad" />
          <Input label="Weight (kg)" value={weight} onChangeText={setWeight} placeholder="e.g. 80.5" keyboardType="decimal-pad" />
        </Card>
      );
    }

    return (
      <Card style={styles.viewCard}>
        <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Full Name</Text><Text style={[styles.value, { color: theme.text, fontSize: 17 * fontScale }]}>{name}</Text></View>
        <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Age</Text><Text style={[styles.value, { color: theme.text, fontSize: 17 * fontScale }]}>{age} years</Text></View>
        <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Gender</Text><Text style={[styles.value, { color: theme.text, fontSize: 17 * fontScale }]}>{gender || 'Not specified'}</Text></View>
        <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Date of Birth</Text><Text style={[styles.value, { color: theme.text, fontSize: 17 * fontScale }]}>{dob || 'Not specified'}</Text></View>
        <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Blood Group</Text><Text style={[styles.value, { color: theme.text, fontSize: 17 * fontScale, fontWeight: 'bold' }]}>{bloodGroup || 'Not specified'}</Text></View>
        <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Height</Text><Text style={[styles.value, { color: theme.text, fontSize: 17 * fontScale }]}>{height} cm</Text></View>
        <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Weight</Text><Text style={[styles.value, { color: theme.text, fontSize: 17 * fontScale }]}>{weight} kg</Text></View>
      </Card>
    );
  };

  const renderMedicalView = () => {
    if (isEditing) {
      return (
        <Card style={styles.formCard}>
          <Input label="Existing Medical Conditions (comma separated)" value={conditions} onChangeText={setConditions} placeholder="e.g. Diabetes, Hypertension" multiline={true} />
          <Input label="Allergies & Reactions" value={allergies} onChangeText={setAllergies} placeholder="e.g. Penicillin, Peanuts" multiline={true} />
          <Input label="Current Prescribed Medications" value={medications} onChangeText={setMedications} placeholder="e.g. Metformin 500mg, Lisinopril 10mg" multiline={true} />
          <Input label="Past Surgeries & Procedures" value={surgeries} onChangeText={setSurgeries} placeholder="e.g. Appendectomy (1985)" multiline={true} />
          <Input label="Family Medical History" value={familyHistory} onChangeText={setFamilyHistory} placeholder="e.g. Father: Heart Disease" multiline={true} />
        </Card>
      );
    }

    return (
      <Card style={styles.viewCard}>
        <View style={styles.dataBlock}>
          <Text style={[styles.blockLabel, { color: theme.primary, fontSize: 15 * fontScale }]}>Existing Conditions</Text>
          <Text style={[styles.blockValue, { color: theme.text, fontSize: 16 * fontScale }]}>{conditions || 'None listed'}</Text>
        </View>
        <View style={styles.dataBlock}>
          <Text style={[styles.blockLabel, { color: theme.danger, fontSize: 15 * fontScale }]}>Allergies</Text>
          <Text style={[styles.blockValue, { color: theme.text, fontSize: 16 * fontScale, fontWeight: allergies ? 'bold' : 'normal' }]}>{allergies || 'No known allergies'}</Text>
        </View>
        <View style={styles.dataBlock}>
          <Text style={[styles.blockLabel, { color: theme.primary, fontSize: 15 * fontScale }]}>Current Medications</Text>
          <Text style={[styles.blockValue, { color: theme.text, fontSize: 16 * fontScale }]}>{medications || 'None listed'}</Text>
        </View>
        <View style={styles.dataBlock}>
          <Text style={[styles.blockLabel, { color: theme.primary, fontSize: 15 * fontScale }]}>Past Surgeries</Text>
          <Text style={[styles.blockValue, { color: theme.text, fontSize: 16 * fontScale }]}>{surgeries || 'None listed'}</Text>
        </View>
        <View style={styles.dataBlock}>
          <Text style={[styles.blockLabel, { color: theme.primary, fontSize: 15 * fontScale }]}>Family History</Text>
          <Text style={[styles.blockValue, { color: theme.text, fontSize: 16 * fontScale }]}>{familyHistory || 'None listed'}</Text>
        </View>
      </Card>
    );
  };

  const renderEmergencyView = () => {
    if (isEditing) {
      return (
        <Card style={styles.formCard}>
          <Input label="Contact Full Name" value={emergencyName} onChangeText={setEmergencyName} placeholder="Sarah Doe" />
          <Input label="Relationship to Patient" value={emergencyRelation} onChangeText={setEmergencyRelation} placeholder="e.g. Spouse, Daughter, Son" />
          <Input label="Phone Number" value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="e.g. +1 555 9876" keyboardType="phone-pad" />
        </Card>
      );
    }

    return (
      <Card style={styles.viewCard}>
        {emergencyName ? (
          <>
            <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Contact Name</Text><Text style={[styles.value, { color: theme.text, fontSize: 17 * fontScale }]}>{emergencyName}</Text></View>
            <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Relationship</Text><Text style={[styles.value, { color: theme.text, fontSize: 17 * fontScale }]}>{emergencyRelation}</Text></View>
            <View style={styles.dataRow}><Text style={[styles.label, { color: theme.textSecondary, fontSize: 15 * fontScale }]}>Phone Number</Text><Text style={[styles.value, { color: theme.danger, fontSize: 18 * fontScale, fontWeight: 'bold' }]}>{emergencyPhone}</Text></View>
          </>
        ) : (
          <View style={{ alignItems: 'center', padding: 12 }}>
            <Text style={{ color: theme.danger, fontSize: 16 * fontScale, fontWeight: 'bold', textAlign: 'center' }}>
              ⚠️ No Emergency Contact Listed!
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14 * fontScale, textAlign: 'center', marginTop: 4 }}>
              Add a contact so the SOS module can function correctly in emergencies.
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundGrid />
      <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header Profile Area */}
      <View style={[styles.profileHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.avatarCircle}>
          <Text style={{ fontSize: 32, color: theme.primary }}>👤</Text>
        </View>
        <Text style={[styles.profileName, { color: theme.text, fontSize: 22 * fontScale }]}>
          {name || 'MediTrack User'}
        </Text>
        <Text style={[styles.profileEmail, { color: theme.textSecondary, fontSize: 14 * fontScale }]}>
          {user?.email}
        </Text>
      </View>

      {/* Tabs Selector */}
      <View style={styles.tabContainer}>
        {(['personal', 'medical', 'emergency'] as ProfileSection[]).map((section) => (
          <TouchableOpacity
            key={section}
            onPress={() => {
              setActiveSection(section);
              setIsEditing(false);
            }}
            style={[
              styles.tabButton,
              {
                borderBottomColor: activeSection === section ? theme.primary : 'transparent',
                borderBottomWidth: activeSection === section ? 3 : 0,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeSection === section ? theme.primary : theme.textSecondary,
                  fontWeight: activeSection === section ? 'bold' : '600',
                  fontSize: 14 * fontScale,
                },
              ]}
            >
              {section === 'personal' ? 'Personal' : section === 'medical' ? 'Medical' : 'Emergency'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Profile Active content */}
      <View style={styles.contentContainer}>
        {activeSection === 'personal' && renderPersonalView()}
        {activeSection === 'medical' && renderMedicalView()}
        {activeSection === 'emergency' && renderEmergencyView()}

        {/* Action button row */}
        <View style={styles.actionRow}>
          {isEditing ? (
            <>
              <Button title="Save Updates" onPress={handleSave} variant="primary" style={{ flex: 1, marginRight: 8 }} />
              <Button title="Cancel" onPress={() => setIsEditing(false)} variant="secondary" style={{ flex: 1 }} />
            </>
          ) : (
            <Button
              title={`Edit ${activeSection === 'personal' ? 'Personal' : activeSection === 'medical' ? 'Medical' : 'Emergency'} Details`}
              onPress={() => setIsEditing(true)}
              variant="primary"
              style={{ width: '100%' }}
            />
          )}
        </View>

        {!isEditing && (
          <Button
            title="Log Out Session"
            onPress={handleLogout}
            variant="danger"
            style={{ width: '100%', marginTop: 24, marginBottom: 40 }}
          />
        )}
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontWeight: '900',
  },
  profileEmail: {
    fontWeight: '500',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 48,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    textTransform: 'uppercase',
  },
  contentContainer: {
    padding: 16,
  },
  viewCard: {
    paddingVertical: 8,
  },
  formCard: {
    padding: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 8,
  },
  label: {
    fontWeight: '600',
  },
  value: {
    fontWeight: '700',
    textAlign: 'right',
  },
  dataBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 8,
  },
  blockLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  blockValue: {
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    width: '100%',
  },
});
