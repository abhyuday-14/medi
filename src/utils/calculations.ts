import { VitalStatus } from '../components/VitalBadge';

// --- VITALS THRESHOLD LOGIC ---

export const evaluateBloodPressure = (systolic: number, diastolic: number): { status: VitalStatus; text: string } => {
  // Critical: >=140 systolic OR >=90 diastolic
  if (systolic >= 140 || diastolic >= 90) {
    return { status: 'critical', text: 'Critical High' };
  }
  // Borderline: 121-139 systolic OR 81-89 diastolic
  if ((systolic >= 121 && systolic <= 139) || (diastolic >= 81 && diastolic <= 89)) {
    return { status: 'borderline', text: 'Borderline' };
  }
  // Normal: 90-120 systolic AND 60-80 diastolic
  if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) {
    return { status: 'normal', text: 'Normal' };
  }
  return { status: 'borderline', text: 'Varying' };
};

export const evaluateBloodSugar = (fasting: number): { status: VitalStatus; text: string } => {
  // Critical: >=126
  if (fasting >= 126) {
    return { status: 'critical', text: 'Critical High' };
  }
  // Borderline: 100-125
  if (fasting >= 100 && fasting <= 125) {
    return { status: 'borderline', text: 'Pre-diabetic' };
  }
  // Normal: <100
  return { status: 'normal', text: 'Normal' };
};

export const evaluateSpO2 = (spo2: number): { status: VitalStatus; text: string } => {
  // Critical: below 90
  if (spo2 < 90) {
    return { status: 'critical', text: 'Critical Low' };
  }
  // Borderline: 90-94
  if (spo2 >= 90 && spo2 <= 94) {
    return { status: 'borderline', text: 'Borderline' };
  }
  // Normal: 95-100
  return { status: 'normal', text: 'Normal' };
};

export const evaluateTemperature = (temp: number): { status: VitalStatus; text: string } => {
  // Critical: >=38 or <36.1
  if (temp >= 38 || temp < 36.1) {
    return { status: 'critical', text: 'Fever/Low Temp' };
  }
  // Normal: 36.1-37.2
  return { status: 'normal', text: 'Normal' };
};

// --- COMPLIANCE MATH ---

export const calculateAdherence = (takenDoses: number, totalScheduledDoses: number): number => {
  if (totalScheduledDoses <= 0) return 100;
  return parseFloat(((takenDoses / totalScheduledDoses) * 100).toFixed(1));
};

// --- HEALTH SCORE CALCULATION ---

export interface HealthScoreInput {
  vitalsLoggedPast24h: boolean;
  symptomLoggedPast24h: boolean;
  adherenceRate: number;
}

export const calculateHealthScore = (input: HealthScoreInput): number => {
  let score = 50; // Base score
  
  if (input.vitalsLoggedPast24h) {
    score += 20;
  }
  if (input.symptomLoggedPast24h) {
    score += 10;
  }
  if (input.adherenceRate >= 85) {
    score += 20;
  } else if (input.adherenceRate >= 65) {
    score += 10;
  }
  
  return Math.min(100, score);
};
