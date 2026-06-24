import { Platform } from 'react-native';
import { getDB, initDatabase } from './sqliteService';
import { UserSession } from '../store/appStore';

// --- TYPES ---

export interface UserDB {
  id: number;
  name: string;
  email: string;
  phone: string;
  pin_hash: string;
  biometrics_enabled: number;
}

export interface MedicalProfileDB {
  id: number;
  user_id: number;
  age: number;
  gender: string;
  dob: string;
  blood_group: string;
  height: number;
  weight: number;
  conditions: string; // JSON Array of strings
  allergies: string;    // JSON Array of strings
  medications: string;  // JSON Array of strings
  surgeries: string;    // JSON Array of strings
  family_history: string; // JSON Array of strings
}

export interface EmergencyContactDB {
  id: number;
  user_id: number;
  name: string;
  relation: string;
  phone: string;
}

export interface VitalDB {
  id: number;
  user_id: number;
  systolic: number | null;
  diastolic: number | null;
  blood_sugar_fasting: number | null;
  blood_sugar_post_meal: number | null;
  temperature: number | null;
  weight: number | null;
  spo2: number | null;
  heart_rate: number | null;
  timestamp: string;
}

export interface MedicationDB {
  id: number;
  user_id: number;
  name: string;
  dosage: string;
  unit: string;
  instructions: string | null;
  start_date: string;
  end_date: string;
  frequency_type: string;
  frequency_details: string; // JSON array of reminder times
  stock_remaining: number;
  refill_alert_threshold: number;
  reminders_enabled: number;
}

export interface MedicationLogDB {
  id: number;
  medication_id: number;
  scheduled_time: string;
  status: 'TAKEN' | 'SKIPPED' | 'MISSED';
  logged_at: string;
}

export interface SymptomDB {
  id: number;
  user_id: number;
  name: string;
  severity: number;
  notes: string | null;
  photo_uri: string | null;
  timestamp: string;
}

export interface DoctorVisitDB {
  id: number;
  user_id: number;
  visit_date: string;
  doctor_name: string;
  specialization: string;
  clinic_hospital: string;
  notes: string | null;
  prescription_summary: string | null;
  follow_up_date: string | null;
}

export interface PrescriptionDB {
  id: number;
  user_id: number;
  file_name: string;
  file_uri: string;
  file_type: string;
  doctor_tag: string | null;
  visit_date_tag: string | null;
  folder_name: string;
  uploaded_at: string;
}

export interface ReportDB {
  id: number;
  user_id: number;
  report_name: string;
  file_path: string;
  generated_date: string;
}

// --- WEB MOCK DATABASE STORE (IN-MEMORY) ---

let webUsers: UserDB[] = [
  { id: 1, name: 'Johnathan Doe', email: 'john.doe@meditrack.com', phone: '+15550199', pin_hash: '1234', biometrics_enabled: 0 }
];

let webMedicalProfiles: MedicalProfileDB[] = [
  {
    id: 1,
    user_id: 1,
    age: 68,
    gender: 'Male',
    dob: '1958-04-12',
    blood_group: 'O-Positive',
    height: 175.2,
    weight: 82.4,
    conditions: JSON.stringify(['Type 2 Diabetes', 'Hypertension']),
    allergies: JSON.stringify(['Penicillin', 'Peanuts']),
    medications: JSON.stringify(['Metformin 500mg', 'Lisinopril 10mg']),
    surgeries: JSON.stringify(['Appendectomy (1985)']),
    family_history: JSON.stringify(['Father: Heart Disease', 'Mother: Hypertension'])
  }
];

let webEmergencyContacts: EmergencyContactDB[] = [
  { id: 1, user_id: 1, name: 'Sarah Doe (Daughter)', relation: 'Child', phone: '+15559876' }
];

let webVitals: VitalDB[] = [];
let webMedications: MedicationDB[] = [
  {
    id: 1,
    user_id: 1,
    name: 'Metformin',
    dosage: '500',
    unit: 'mg',
    instructions: 'Take with breakfast and dinner',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    frequency_type: 'Twice Daily',
    frequency_details: JSON.stringify(['08:00', '20:00']),
    stock_remaining: 54,
    refill_alert_threshold: 14,
    reminders_enabled: 1
  },
  {
    id: 2,
    user_id: 1,
    name: 'Lisinopril',
    dosage: '10',
    unit: 'mg',
    instructions: 'Take in the morning on empty stomach',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    frequency_type: 'Once Daily',
    frequency_details: JSON.stringify(['08:00']),
    stock_remaining: 28,
    refill_alert_threshold: 7,
    reminders_enabled: 1
  }
];

let webMedicationLogs: MedicationLogDB[] = [];
let webSymptoms: SymptomDB[] = [
  {
    id: 1,
    user_id: 1,
    name: 'Mild Dizziness',
    severity: 3,
    notes: 'Felt slightly lightheaded after standing up in the morning. Resolved after drinking water.',
    photo_uri: null,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    user_id: 1,
    name: 'Fatigue',
    severity: 4,
    notes: 'Felt unusual fatigue in the afternoon.',
    photo_uri: null,
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let webDoctorVisits: DoctorVisitDB[] = [
  {
    id: 1,
    user_id: 1,
    visit_date: '2026-05-15',
    doctor_name: 'Dr. Robert Chen',
    specialization: 'Endocrinologist',
    clinic_hospital: 'Metropolitan Endocrinology Center',
    notes: 'Routine review of diabetes parameters. A1C was 6.8%. Recommended staying active and maintaining strict medication compliance.',
    prescription_summary: 'Metformin 500mg, Lisinopril 10mg continued.',
    follow_up_date: '2026-11-15'
  }
];

let webPrescriptions: PrescriptionDB[] = [];
let webReports: ReportDB[] = [];

// Initialize Web vitals logs
const initWebVitals = () => {
  if (webVitals.length > 0) return;
  const baseDate = new Date();
  for (let i = 6; i >= 0; i--) {
    const logDate = new Date(baseDate);
    logDate.setDate(baseDate.getDate() - i);
    const dateStr = logDate.toISOString().split('T')[0];

    webVitals.push({
      id: i + 1,
      user_id: 1,
      systolic: 118 + Math.floor(Math.random() * 15),
      diastolic: 75 + Math.floor(Math.random() * 10),
      blood_sugar_fasting: 95 + Math.floor(Math.random() * 20),
      blood_sugar_post_meal: 130 + Math.floor(Math.random() * 30),
      temperature: parseFloat((36.4 + Math.random() * 0.6).toFixed(1)),
      weight: parseFloat((82.4 - i * 0.1).toFixed(1)),
      spo2: 96 + Math.floor(Math.random() * 4),
      heart_rate: 70 + Math.floor(Math.random() * 15),
      timestamp: `${dateStr} 08:30:00`
    });
  }
};
initWebVitals();

// --- USER OPERATIONS ---

export const registerUser = (name: string, email: string, phone: string, pin: string): UserSession | null => {
  if (Platform.OS === 'web') {
    const emailLower = email.toLowerCase().trim();
    if (webUsers.find(u => u.email === emailLower)) return null;

    const newId = webUsers.length + 1;
    const newUser: UserDB = {
      id: newId,
      name,
      email: emailLower,
      phone,
      pin_hash: pin,
      biometrics_enabled: 0
    };
    webUsers.push(newUser);

    webMedicalProfiles.push({
      id: newId,
      user_id: newId,
      age: 0,
      gender: '',
      dob: '',
      blood_group: '',
      height: 0,
      weight: 0,
      conditions: '[]',
      allergies: '[]',
      medications: '[]',
      surgeries: '[]',
      family_history: '[]'
    });

    return { id: newId, name, email: emailLower, phone };
  }

  const db = getDB();
  try {
    const result = db.runSync(
      `INSERT INTO users (name, email, phone, pin_hash, biometrics_enabled) 
       VALUES (?, ?, ?, ?, 0);`,
      [name, email.toLowerCase().trim(), phone, pin]
    );

    const insertId = result.lastInsertRowId;
    if (insertId) {
      db.runSync(
        `INSERT INTO medical_profiles (user_id, age, gender, dob, blood_group, height, weight, conditions, allergies, medications, surgeries, family_history)
         VALUES (?, 0, '', '', '', 0, 0, '[]', '[]', '[]', '[]', '[]');`,
        [insertId]
      );
      
      return {
        id: insertId,
        name,
        email: email.toLowerCase().trim(),
        phone,
      };
    }
    return null;
  } catch (error) {
    console.error('registerUser error:', error);
    return null;
  }
};

export const loginWithPin = (email: string, pin: string): UserSession | null => {
  if (Platform.OS === 'web') {
    const emailLower = email.toLowerCase().trim();
    const user = webUsers.find(u => u.email === emailLower && u.pin_hash === pin);
    if (user) {
      return { id: user.id, name: user.name, email: user.email, phone: user.phone };
    }
    return null;
  }

  const db = getDB();
  try {
    const user = db.getFirstSync<UserDB>(
      'SELECT * FROM users WHERE email = ? AND pin_hash = ?;',
      [email.toLowerCase().trim(), pin]
    );
    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      };
    }
    return null;
  } catch (error) {
    console.error('loginWithPin error:', error);
    return null;
  }
};

export const checkUserExists = (): UserDB | null => {
  if (Platform.OS === 'web') {
    return webUsers.length > 0 ? webUsers[0] : null;
  }

  const db = getDB();
  try {
    return db.getFirstSync<UserDB>('SELECT * FROM users LIMIT 1;');
  } catch (error) {
    console.error('checkUserExists error:', error);
    return null;
  }
};

export const updateBiometricsSetting = (userId: number, enabled: boolean) => {
  if (Platform.OS === 'web') {
    const user = webUsers.find(u => u.id === userId);
    if (user) user.biometrics_enabled = enabled ? 1 : 0;
    return;
  }

  const db = getDB();
  db.runSync('UPDATE users SET biometrics_enabled = ? WHERE id = ?;', [enabled ? 1 : 0, userId]);
};

export const resetUserPin = (email: string, phone: string, newPin: string): boolean => {
  if (Platform.OS === 'web') {
    const emailLower = email.toLowerCase().trim();
    const user = webUsers.find(u => u.email === emailLower && u.phone === phone);
    if (user) {
      user.pin_hash = newPin;
      return true;
    }
    return false;
  }

  const db = getDB();
  try {
    const result = db.runSync(
      'UPDATE users SET pin_hash = ? WHERE email = ? AND phone = ?;',
      [newPin, email.toLowerCase().trim(), phone]
    );
    return result.changes > 0;
  } catch (error) {
    console.error('resetUserPin error:', error);
    return false;
  }
};

// --- MEDICAL PROFILE OPERATIONS ---

export const getMedicalProfile = (userId: number): MedicalProfileDB | null => {
  if (Platform.OS === 'web') {
    const p = webMedicalProfiles.find(profile => profile.user_id === userId);
    return p || null;
  }

  const db = getDB();
  try {
    return db.getFirstSync<MedicalProfileDB>('SELECT * FROM medical_profiles WHERE user_id = ?;', [userId]);
  } catch (error) {
    console.error('getMedicalProfile error:', error);
    return null;
  }
};

export const updateMedicalProfile = (profile: Omit<MedicalProfileDB, 'id'>) => {
  if (Platform.OS === 'web') {
    const index = webMedicalProfiles.findIndex(p => p.user_id === profile.user_id);
    if (index !== -1) {
      webMedicalProfiles[index] = {
        ...webMedicalProfiles[index],
        ...profile
      };
    }
    return;
  }

  const db = getDB();
  db.runSync(
    `UPDATE medical_profiles 
     SET age = ?, gender = ?, dob = ?, blood_group = ?, height = ?, weight = ?, 
         conditions = ?, allergies = ?, medications = ?, surgeries = ?, family_history = ?
     WHERE user_id = ?;`,
    [
      profile.age,
      profile.gender,
      profile.dob,
      profile.blood_group,
      profile.height,
      profile.weight,
      profile.conditions,
      profile.allergies,
      profile.medications,
      profile.surgeries,
      profile.family_history,
      profile.user_id,
    ]
  );
};

export const getEmergencyContact = (userId: number): EmergencyContactDB | null => {
  if (Platform.OS === 'web') {
    const c = webEmergencyContacts.find(contact => contact.user_id === userId);
    return c || null;
  }

  const db = getDB();
  try {
    return db.getFirstSync<EmergencyContactDB>('SELECT * FROM emergency_contacts WHERE user_id = ?;', [userId]);
  } catch (error) {
    console.error('getEmergencyContact error:', error);
    return null;
  }
};

export const saveEmergencyContact = (userId: number, name: string, relation: string, phone: string) => {
  if (Platform.OS === 'web') {
    const index = webEmergencyContacts.findIndex(c => c.user_id === userId);
    if (index !== -1) {
      webEmergencyContacts[index] = { id: index + 1, user_id: userId, name, relation, phone };
    } else {
      webEmergencyContacts.push({
        id: webEmergencyContacts.length + 1,
        user_id: userId,
        name,
        relation,
        phone
      });
    }
    return;
  }

  const db = getDB();
  const contact = getEmergencyContact(userId);
  if (contact) {
    db.runSync(
      'UPDATE emergency_contacts SET name = ?, relation = ?, phone = ? WHERE user_id = ?;',
      [name, relation, phone, userId]
    );
  } else {
    db.runSync(
      'INSERT INTO emergency_contacts (user_id, name, relation, phone) VALUES (?, ?, ?, ?);',
      [userId, name, relation, phone]
    );
  }
};

// --- VITALS OPERATIONS ---

export const addVitalLog = (vital: Omit<VitalDB, 'id' | 'timestamp'>) => {
  if (Platform.OS === 'web') {
    webVitals.unshift({
      id: webVitals.length + 1,
      ...vital,
      timestamp: new Date().toISOString()
    });
    return;
  }

  const db = getDB();
  db.runSync(
    `INSERT INTO vitals (user_id, systolic, diastolic, blood_sugar_fasting, blood_sugar_post_meal, temperature, weight, spo2, heart_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      vital.user_id,
      vital.systolic,
      vital.diastolic,
      vital.blood_sugar_fasting,
      vital.blood_sugar_post_meal,
      vital.temperature,
      vital.weight,
      vital.spo2,
      vital.heart_rate,
    ]
  );
};

export const getVitalsHistory = (userId: number, limit = 50): VitalDB[] => {
  if (Platform.OS === 'web') {
    return webVitals.filter(v => v.user_id === userId).slice(0, limit);
  }

  const db = getDB();
  try {
    return db.getAllSync<VitalDB>(
      'SELECT * FROM vitals WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?;',
      [userId, limit]
    );
  } catch (error) {
    console.error('getVitalsHistory error:', error);
    return [];
  }
};

export const getVitalsRange = (userId: number, days: number): VitalDB[] => {
  if (Platform.OS === 'web') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return webVitals
      .filter(v => v.user_id === userId && new Date(v.timestamp) >= cutoff)
      .reverse(); // Chronological order
  }

  const db = getDB();
  try {
    return db.getAllSync<VitalDB>(
      `SELECT * FROM vitals 
       WHERE user_id = ? AND timestamp >= datetime('now', ?) 
       ORDER BY timestamp ASC;`,
      [userId, `-${days} days`]
    );
  } catch (error) {
    console.error('getVitalsRange error:', error);
    return [];
  }
};

// --- MEDICATIONS OPERATIONS ---

export const addMedication = (med: Omit<MedicationDB, 'id'>): number => {
  if (Platform.OS === 'web') {
    const newId = webMedications.length + 1;
    webMedications.push({
      id: newId,
      ...med
    });
    return newId;
  }

  const db = getDB();
  const result = db.runSync(
    `INSERT INTO medications (user_id, name, dosage, unit, instructions, start_date, end_date, frequency_type, frequency_details, stock_remaining, refill_alert_threshold, reminders_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      med.user_id,
      med.name,
      med.dosage,
      med.unit,
      med.instructions,
      med.start_date,
      med.end_date,
      med.frequency_type,
      med.frequency_details,
      med.stock_remaining,
      med.refill_alert_threshold,
      med.reminders_enabled,
    ]
  );
  return result.lastInsertRowId;
};

export const updateMedication = (med: MedicationDB) => {
  if (Platform.OS === 'web') {
    const index = webMedications.findIndex(m => m.id === med.id);
    if (index !== -1) {
      webMedications[index] = med;
    }
    return;
  }

  const db = getDB();
  db.runSync(
    `UPDATE medications 
     SET name = ?, dosage = ?, unit = ?, instructions = ?, start_date = ?, end_date = ?, 
         frequency_type = ?, frequency_details = ?, stock_remaining = ?, refill_alert_threshold = ?, reminders_enabled = ?
     WHERE id = ?;`,
    [
      med.name,
      med.dosage,
      med.unit,
      med.instructions,
      med.start_date,
      med.end_date,
      med.frequency_type,
      med.frequency_details,
      med.stock_remaining,
      med.refill_alert_threshold,
      med.reminders_enabled,
      med.id,
    ]
  );
};

export const deleteMedication = (id: number) => {
  if (Platform.OS === 'web') {
    webMedications = webMedications.filter(m => m.id !== id);
    return;
  }

  const db = getDB();
  db.runSync('DELETE FROM medications WHERE id = ?;', [id]);
};

export const getMedications = (userId: number): MedicationDB[] => {
  if (Platform.OS === 'web') {
    return webMedications.filter(m => m.user_id === userId);
  }

  const db = getDB();
  try {
    return db.getAllSync<MedicationDB>('SELECT * FROM medications WHERE user_id = ?;', [userId]);
  } catch (error) {
    console.error('getMedications error:', error);
    return [];
  }
};

export const logMedicationDose = (medId: number, scheduledTime: string, status: 'TAKEN' | 'SKIPPED' | 'MISSED') => {
  if (Platform.OS === 'web') {
    webMedicationLogs.unshift({
      id: webMedicationLogs.length + 1,
      medication_id: medId,
      scheduled_time: scheduledTime,
      status,
      logged_at: new Date().toISOString()
    });

    if (status === 'TAKEN') {
      const med = webMedications.find(m => m.id === medId);
      if (med) {
        med.stock_remaining = Math.max(0, med.stock_remaining - 1);
      }
    }
    return;
  }

  const db = getDB();
  db.runSync(
    'INSERT INTO medication_logs (medication_id, scheduled_time, status) VALUES (?, ?, ?);',
    [medId, scheduledTime, status]
  );

  if (status === 'TAKEN') {
    db.runSync(
      'UPDATE medications SET stock_remaining = MAX(0, stock_remaining - 1) WHERE id = ?;',
      [medId]
    );
  }
};

export const getMedicationLogs = (userId: number, days = 30): (MedicationLogDB & { name: string; dosage: string; unit: string })[] => {
  if (Platform.OS === 'web') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return webMedicationLogs
      .filter(l => new Date(l.logged_at) >= cutoff)
      .map(log => {
        const m = webMedications.find(med => med.id === log.medication_id);
        return {
          ...log,
          name: m ? m.name : 'Unknown Medicine',
          dosage: m ? m.dosage : '',
          unit: m ? m.unit : '',
        };
      })
      .filter(log => {
        const m = webMedications.find(med => med.id === log.medication_id);
        return m ? m.user_id === userId : false;
      });
  }

  const db = getDB();
  try {
    return db.getAllSync<any>(
      `SELECT ml.*, m.name, m.dosage, m.unit 
       FROM medication_logs ml
       JOIN medications m ON ml.medication_id = m.id
       WHERE m.user_id = ? AND ml.logged_at >= datetime('now', ?)
       ORDER BY ml.logged_at DESC;`,
      [userId, `-${days} days`]
    );
  } catch (error) {
    console.error('getMedicationLogs error:', error);
    return [];
  }
};

export const getAdherenceStats = (userId: number, days = 30): { taken: number; total: number } => {
  if (Platform.OS === 'web') {
    const logs = getMedicationLogs(userId, days);
    const taken = logs.filter(l => l.status === 'TAKEN').length;
    return {
      taken,
      total: logs.length
    };
  }

  const db = getDB();
  try {
    const stats = db.getFirstSync<{ taken: number; total: number }>(
      `SELECT 
         SUM(CASE WHEN ml.status = 'TAKEN' THEN 1 ELSE 0 END) as taken,
         COUNT(*) as total
       FROM medication_logs ml
       JOIN medications m ON ml.medication_id = m.id
       WHERE m.user_id = ? AND ml.logged_at >= datetime('now', ?);`,
      [userId, `-${days} days`]
    );
    return {
      taken: stats?.taken || 0,
      total: stats?.total || 0,
    };
  } catch (error) {
    console.error('getAdherenceStats error:', error);
    return { taken: 0, total: 0 };
  }
};

// --- SYMPTOMS OPERATIONS ---

export const addSymptomLog = (symptom: Omit<SymptomDB, 'id' | 'timestamp'>) => {
  if (Platform.OS === 'web') {
    webSymptoms.unshift({
      id: webSymptoms.length + 1,
      ...symptom,
      timestamp: new Date().toISOString()
    });
    return;
  }

  const db = getDB();
  db.runSync(
    'INSERT INTO symptoms (user_id, name, severity, notes, photo_uri) VALUES (?, ?, ?, ?, ?);',
    [symptom.user_id, symptom.name, symptom.severity, symptom.notes, symptom.photo_uri]
  );
};

export const getSymptomsHistory = (userId: number, limit = 50): SymptomDB[] => {
  if (Platform.OS === 'web') {
    return webSymptoms.filter(s => s.user_id === userId).slice(0, limit);
  }

  const db = getDB();
  try {
    return db.getAllSync<SymptomDB>(
      'SELECT * FROM symptoms WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?;',
      [userId, limit]
    );
  } catch (error) {
    console.error('getSymptomsHistory error:', error);
    return [];
  }
};

// --- DOCTOR VISITS OPERATIONS ---

export const addDoctorVisit = (visit: Omit<DoctorVisitDB, 'id'>) => {
  if (Platform.OS === 'web') {
    webDoctorVisits.unshift({
      id: webDoctorVisits.length + 1,
      ...visit
    });
    return;
  }

  const db = getDB();
  db.runSync(
    `INSERT INTO doctor_visits (user_id, visit_date, doctor_name, specialization, clinic_hospital, notes, prescription_summary, follow_up_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      visit.user_id,
      visit.visit_date,
      visit.doctor_name,
      visit.specialization,
      visit.clinic_hospital,
      visit.notes,
      visit.prescription_summary,
      visit.follow_up_date,
    ]
  );
};

export const updateDoctorVisit = (visit: DoctorVisitDB) => {
  if (Platform.OS === 'web') {
    const index = webDoctorVisits.findIndex(v => v.id === visit.id);
    if (index !== -1) {
      webDoctorVisits[index] = visit;
    }
    return;
  }

  const db = getDB();
  db.runSync(
    `UPDATE doctor_visits 
     SET visit_date = ?, doctor_name = ?, specialization = ?, clinic_hospital = ?, notes = ?, prescription_summary = ?, follow_up_date = ?
     WHERE id = ?;`,
    [
      visit.visit_date,
      visit.doctor_name,
      visit.specialization,
      visit.clinic_hospital,
      visit.notes,
      visit.prescription_summary,
      visit.follow_up_date,
      visit.id,
    ]
  );
};

export const getDoctorVisits = (userId: number): DoctorVisitDB[] => {
  if (Platform.OS === 'web') {
    return webDoctorVisits.filter(v => v.user_id === userId);
  }

  const db = getDB();
  try {
    return db.getAllSync<DoctorVisitDB>(
      'SELECT * FROM doctor_visits WHERE user_id = ? ORDER BY visit_date DESC;',
      [userId]
    );
  } catch (error) {
    console.error('getDoctorVisits error:', error);
    return [];
  }
};

// --- PRESCRIPTION OPERATIONS ---

export const addPrescription = (presc: Omit<PrescriptionDB, 'id' | 'uploaded_at'>) => {
  if (Platform.OS === 'web') {
    webPrescriptions.unshift({
      id: webPrescriptions.length + 1,
      ...presc,
      uploaded_at: new Date().toISOString()
    });
    return;
  }

  const db = getDB();
  db.runSync(
    `INSERT INTO prescriptions (user_id, file_name, file_uri, file_type, doctor_tag, visit_date_tag, folder_name)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      presc.user_id,
      presc.file_name,
      presc.file_uri,
      presc.file_type,
      presc.doctor_tag,
      presc.visit_date_tag,
      presc.folder_name,
    ]
  );
};

export const getPrescriptions = (userId: number): PrescriptionDB[] => {
  if (Platform.OS === 'web') {
    return webPrescriptions.filter(p => p.user_id === userId);
  }

  const db = getDB();
  try {
    return db.getAllSync<PrescriptionDB>(
      'SELECT * FROM prescriptions WHERE user_id = ? ORDER BY uploaded_at DESC;',
      [userId]
    );
  } catch (error) {
    console.error('getPrescriptions error:', error);
    return [];
  }
};

export const renamePrescription = (id: number, newName: string) => {
  if (Platform.OS === 'web') {
    const presc = webPrescriptions.find(p => p.id === id);
    if (presc) presc.file_name = newName;
    return;
  }

  const db = getDB();
  db.runSync('UPDATE prescriptions SET file_name = ? WHERE id = ?;', [newName, id]);
};

export const deletePrescription = (id: number) => {
  if (Platform.OS === 'web') {
    webPrescriptions = webPrescriptions.filter(p => p.id !== id);
    return;
  }

  const db = getDB();
  db.runSync('DELETE FROM prescriptions WHERE id = ?;', [id]);
};

export const updateUserPin = (userId: number, newPin: string): boolean => {
  if (Platform.OS === 'web') {
    const user = webUsers.find(u => u.id === userId);
    if (user) {
      user.pin_hash = newPin;
      return true;
    }
    return false;
  }

  const db = getDB();
  try {
    const result = db.runSync('UPDATE users SET pin_hash = ? WHERE id = ?;', [newPin, userId]);
    return result.changes > 0;
  } catch (error) {
    console.error('updateUserPin error:', error);
    return false;
  }
};

export const resetDatabase = () => {
  if (Platform.OS === 'web') {
    // Clear and re-seed the in-memory store
    webUsers = [
      { id: 1, name: 'Johnathan Doe', email: 'john.doe@meditrack.com', phone: '+15550199', pin_hash: '1234', biometrics_enabled: 0 }
    ];
    webMedicalProfiles = [
      {
        id: 1,
        user_id: 1,
        age: 68,
        gender: 'Male',
        dob: '1958-04-12',
        blood_group: 'O-Positive',
        height: 175.2,
        weight: 82.4,
        conditions: JSON.stringify(['Type 2 Diabetes', 'Hypertension']),
        allergies: JSON.stringify(['Penicillin', 'Peanuts']),
        medications: JSON.stringify(['Metformin 500mg', 'Lisinopril 10mg']),
        surgeries: JSON.stringify(['Appendectomy (1985)']),
        family_history: JSON.stringify(['Father: Heart Disease', 'Mother: Hypertension'])
      }
    ];
    webEmergencyContacts = [
      { id: 1, user_id: 1, name: 'Sarah Doe (Daughter)', relation: 'Child', phone: '+15559876' }
    ];
    webVitals = [];
    webMedications = [
      {
        id: 1,
        user_id: 1,
        name: 'Metformin',
        dosage: '500',
        unit: 'mg',
        instructions: 'Take with breakfast and dinner',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        frequency_type: 'Twice Daily',
        frequency_details: JSON.stringify(['08:00', '20:00']),
        stock_remaining: 54,
        refill_alert_threshold: 14,
        reminders_enabled: 1
      },
      {
        id: 2,
        user_id: 1,
        name: 'Lisinopril',
        dosage: '10',
        unit: 'mg',
        instructions: 'Take in the morning on empty stomach',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        frequency_type: 'Once Daily',
        frequency_details: JSON.stringify(['08:00']),
        stock_remaining: 28,
        refill_alert_threshold: 7,
        reminders_enabled: 1
      }
    ];
    webMedicationLogs = [];
    webSymptoms = [
      {
        id: 1,
        user_id: 1,
        name: 'Mild Dizziness',
        severity: 3,
        notes: 'Felt slightly lightheaded after standing up in the morning. Resolved after drinking water.',
        photo_uri: null,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        user_id: 1,
        name: 'Fatigue',
        severity: 4,
        notes: 'Felt unusual fatigue in the afternoon.',
        photo_uri: null,
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    webDoctorVisits = [
      {
        id: 1,
        user_id: 1,
        visit_date: '2026-05-15',
        doctor_name: 'Dr. Robert Chen',
        specialization: 'Endocrinologist',
        clinic_hospital: 'Metropolitan Endocrinology Center',
        notes: 'Routine review of diabetes parameters. A1C was 6.8%. Recommended staying active and maintaining strict medication compliance.',
        prescription_summary: 'Metformin 500mg, Lisinopril 10mg continued.',
        follow_up_date: '2026-11-15'
      }
    ];
    webPrescriptions = [];
    webReports = [];
    initWebVitals();
    return;
  }

  const db = getDB();
  // Delete tables
  db.execSync('DROP TABLE IF EXISTS users;');
  db.execSync('DROP TABLE IF EXISTS medical_profiles;');
  db.execSync('DROP TABLE IF EXISTS vitals;');
  db.execSync('DROP TABLE IF EXISTS medications;');
  db.execSync('DROP TABLE IF EXISTS medication_logs;');
  db.execSync('DROP TABLE IF EXISTS symptoms;');
  db.execSync('DROP TABLE IF EXISTS doctor_visits;');
  db.execSync('DROP TABLE IF EXISTS prescriptions;');
  db.execSync('DROP TABLE IF EXISTS emergency_contacts;');
  db.execSync('DROP TABLE IF EXISTS reports;');
  
  // Re-initialize and seed
  initDatabase();
};

export const addReport = (userId: number, reportName: string, filePath: string): number => {
  const dateStr = new Date().toISOString();
  if (Platform.OS === 'web') {
    const newId = webReports.length + 1;
    webReports.unshift({
      id: newId,
      user_id: userId,
      report_name: reportName,
      file_path: filePath,
      generated_date: dateStr,
    });
    return newId;
  }

  const db = getDB();
  try {
    const result = db.runSync(
      'INSERT INTO reports (user_id, report_name, file_path, generated_date) VALUES (?, ?, ?, ?);',
      [userId, reportName, filePath, dateStr]
    );
    return result.lastInsertRowId || 0;
  } catch (error) {
    console.error('addReport error:', error);
    return 0;
  }
};

export const getReports = (userId: number): ReportDB[] => {
  if (Platform.OS === 'web') {
    return webReports.filter(r => r.user_id === userId);
  }

  const db = getDB();
  try {
    return db.getAllSync<ReportDB>(
      'SELECT * FROM reports WHERE user_id = ? ORDER BY generated_date DESC;',
      [userId]
    );
  } catch (error) {
    console.error('getReports error:', error);
    return [];
  }
};

export const deleteReport = (id: number) => {
  if (Platform.OS === 'web') {
    webReports = webReports.filter(r => r.id !== id);
    return;
  }

  const db = getDB();
  try {
    db.runSync('DELETE FROM reports WHERE id = ?;', [id]);
  } catch (error) {
    console.error('deleteReport error:', error);
  }
};

export const getMedicationLogsRange = (
  userId: number,
  startDate: string,
  endDate: string
): (MedicationLogDB & { name: string; dosage: string; unit: string })[] => {
  if (Platform.OS === 'web') {
    return webMedicationLogs
      .filter(l => {
        const logDate = l.scheduled_time.split(' ')[0];
        return logDate >= startDate && logDate <= endDate;
      })
      .map(log => {
        const m = webMedications.find(med => med.id === log.medication_id);
        return {
          ...log,
          name: m ? m.name : 'Unknown Medicine',
          dosage: m ? m.dosage : '',
          unit: m ? m.unit : '',
        };
      })
      .filter(log => {
        const m = webMedications.find(med => med.id === log.medication_id);
        return m ? m.user_id === userId : false;
      });
  }

  const db = getDB();
  try {
    return db.getAllSync<any>(
      `SELECT ml.*, m.name, m.dosage, m.unit 
       FROM medication_logs ml
       JOIN medications m ON ml.medication_id = m.id
       WHERE m.user_id = ? AND date(ml.scheduled_time) BETWEEN date(?) AND date(?)
       ORDER BY ml.scheduled_time DESC;`,
      [userId, startDate, endDate]
    );
  } catch (error) {
    console.error('getMedicationLogsRange error:', error);
    return [];
  }
};
