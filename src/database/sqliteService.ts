import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDB = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('meditrack.db');
  }
  return dbInstance;
};

// Initialize schema
export const initDatabase = () => {
  const db = getDB();

  // Enable foreign key support
  db.execSync('PRAGMA foreign_keys = ON;');

  // 1. Users Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      biometrics_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Medical Profiles Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS medical_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      dob TEXT NOT NULL,
      blood_group TEXT NOT NULL,
      height REAL NOT NULL,
      weight REAL NOT NULL,
      conditions TEXT,
      allergies TEXT,
      medications TEXT,
      surgeries TEXT,
      family_history TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Emergency Contacts Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      relation TEXT NOT NULL,
      phone TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 4. Vitals Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      systolic REAL,
      diastolic REAL,
      blood_sugar_fasting REAL,
      blood_sugar_post_meal REAL,
      temperature REAL,
      weight REAL,
      spo2 REAL,
      heart_rate REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 5. Medications Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      unit TEXT NOT NULL,
      instructions TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      frequency_type TEXT NOT NULL,
      frequency_details TEXT,
      stock_remaining REAL NOT NULL,
      refill_alert_threshold REAL,
      reminders_enabled INTEGER DEFAULT 1,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 6. Medication Logs Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS medication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(medication_id) REFERENCES medications(id) ON DELETE CASCADE
    );
  `);

  // 7. Symptoms Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS symptoms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      severity INTEGER NOT NULL,
      notes TEXT,
      photo_uri TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 8. Doctor Visits Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS doctor_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      visit_date TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      specialization TEXT NOT NULL,
      clinic_hospital TEXT NOT NULL,
      notes TEXT,
      prescription_summary TEXT,
      follow_up_date TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 9. Prescriptions Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      file_type TEXT NOT NULL,
      doctor_tag TEXT,
      visit_date_tag TEXT,
      folder_name TEXT DEFAULT 'All',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 10. Reports Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      report_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default data if users table is empty
  const count = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM users;');
  if (count && count.count === 0) {
    seedDefaultData(db);
  }
};

const seedDefaultData = (db: SQLite.SQLiteDatabase) => {
  db.runSync(
    `INSERT INTO users (name, email, phone, pin_hash, biometrics_enabled) 
     VALUES (?, ?, ?, ?, ?);`,
    ['Johnathan Doe', 'john.doe@meditrack.com', '+15550199', '1234', 0]
  );

  const userId = 1;

  db.runSync(
    `INSERT INTO medical_profiles (user_id, age, gender, dob, blood_group, height, weight, conditions, allergies, medications, surgeries, family_history)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      userId,
      68,
      'Male',
      '1958-04-12',
      'O-Positive',
      175.2,
      82.4,
      JSON.stringify(['Type 2 Diabetes', 'Hypertension']),
      JSON.stringify(['Penicillin', 'Peanuts']),
      JSON.stringify(['Metformin 500mg', 'Lisinopril 10mg']),
      JSON.stringify(['Appendectomy (1985)']),
      JSON.stringify(['Father: Heart Disease', 'Mother: Hypertension']),
    ]
  );

  db.runSync(
    `INSERT INTO emergency_contacts (user_id, name, relation, phone)
     VALUES (?, ?, ?, ?);`,
    [userId, 'Sarah Doe (Daughter)', 'Child', '+15559876']
  );

  const baseDate = new Date();
  for (let i = 6; i >= 0; i--) {
    const logDate = new Date(baseDate);
    logDate.setDate(baseDate.getDate() - i);
    const dateStr = logDate.toISOString().split('T')[0];

    const systolic = 118 + Math.floor(Math.random() * 15);
    const diastolic = 75 + Math.floor(Math.random() * 10);
    const sugarFasting = 95 + Math.floor(Math.random() * 20);
    const sugarPost = 130 + Math.floor(Math.random() * 30);
    const temp = 36.4 + (Math.random() * 0.6);
    const weight = 82.4 - (i * 0.1) + (Math.random() * 0.2);
    const spo2 = 96 + Math.floor(Math.random() * 4);
    const heartRate = 70 + Math.floor(Math.random() * 15);

    db.runSync(
      `INSERT INTO vitals (user_id, systolic, diastolic, blood_sugar_fasting, blood_sugar_post_meal, temperature, weight, spo2, heart_rate, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        userId,
        systolic,
        diastolic,
        sugarFasting,
        sugarPost,
        parseFloat(temp.toFixed(1)),
        parseFloat(weight.toFixed(1)),
        spo2,
        heartRate,
        `${dateStr} 08:30:00`,
      ]
    );
  }

  db.runSync(
    `INSERT INTO medications (user_id, name, dosage, unit, instructions, start_date, end_date, frequency_type, frequency_details, stock_remaining, refill_alert_threshold, reminders_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      userId,
      'Metformin',
      '500',
      'mg',
      'Take with breakfast and dinner',
      '2026-01-01',
      '2026-12-31',
      'Twice Daily',
      JSON.stringify(['08:00', '20:00']),
      54,
      14,
      1,
    ]
  );

  db.runSync(
    `INSERT INTO medications (user_id, name, dosage, unit, instructions, start_date, end_date, frequency_type, frequency_details, stock_remaining, refill_alert_threshold, reminders_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      userId,
      'Lisinopril',
      '10',
      'mg',
      'Take in the morning on empty stomach',
      '2026-01-01',
      '2026-12-31',
      'Once Daily',
      JSON.stringify(['08:00']),
      28,
      7,
      1,
    ]
  );

  for (let d = 3; d >= 1; d--) {
    const logDate = new Date(baseDate);
    logDate.setDate(baseDate.getDate() - d);
    const dateStr = logDate.toISOString().split('T')[0];

    db.runSync(
      `INSERT INTO medication_logs (medication_id, scheduled_time, status, logged_at)
       VALUES (?, ?, ?, ?);`,
      [1, `${dateStr} 08:00`, 'TAKEN', `${dateStr} 08:15:00`]
    );

    const status = d === 2 ? 'SKIPPED' : 'TAKEN';
    db.runSync(
      `INSERT INTO medication_logs (medication_id, scheduled_time, status, logged_at)
       VALUES (?, ?, ?, ?);`,
      [1, `${dateStr} 20:00`, status, `${dateStr} 20:05:00`]
    );

    db.runSync(
      `INSERT INTO medication_logs (medication_id, scheduled_time, status, logged_at)
       VALUES (?, ?, ?, ?);`,
      [2, `${dateStr} 08:00`, 'TAKEN', `${dateStr} 08:02:00`]
    );
  }

  db.runSync(
    `INSERT INTO symptoms (user_id, name, severity, notes, timestamp)
     VALUES (?, ?, ?, ?, ?);`,
    [
      userId,
      'Mild Dizziness',
      3,
      'Felt slightly lightheaded after standing up in the morning. Resolved after drinking water.',
      new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ]
  );

  db.runSync(
    `INSERT INTO symptoms (user_id, name, severity, notes, timestamp)
     VALUES (?, ?, ?, ?, ?);`,
    [
      userId,
      'Fatigue',
      4,
      'Felt unusual fatigue in the afternoon.',
      new Date(baseDate.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    ]
  );

  db.runSync(
    `INSERT INTO doctor_visits (user_id, visit_date, doctor_name, specialization, clinic_hospital, notes, prescription_summary, follow_up_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      userId,
      '2026-05-15',
      'Dr. Robert Chen',
      'Endocrinologist',
      'Metropolitan Endocrinology Center',
      'Routine review of diabetes parameters. A1C was 6.8%. Recommended staying active and maintaining strict medication compliance.',
      'Metformin 500mg, Lisinopril 10mg continued.',
      '2026-11-15',
    ]
  );
};
