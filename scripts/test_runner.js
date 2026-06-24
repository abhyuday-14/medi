// MediTrack Core Calculations Unit Tests
// Run with: node scripts/test_runner.js

const {
  evaluateBloodPressure,
  evaluateBloodSugar,
  evaluateSpO2,
  evaluateTemperature,
  calculateAdherence,
  calculateHealthScore
} = require('../src/utils/calculations');

let testCount = 0;
let passedCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('--- STARTING MEDITRACK UNIT TESTS ---\n');

// 1. Blood Pressure Threshold Tests
console.log('Testing Blood Pressure thresholds...');
const normalBP = evaluateBloodPressure(115, 75);
assert(normalBP.status === 'normal' && normalBP.text === 'Normal', '115/75 mmHg should be evaluated as Normal');

const borderlineBP1 = evaluateBloodPressure(125, 75);
assert(borderlineBP1.status === 'borderline' && borderlineBP1.text === 'Borderline', '125/75 mmHg should be evaluated as Borderline (systolic high)');

const borderlineBP2 = evaluateBloodPressure(115, 85);
assert(borderlineBP2.status === 'borderline' && borderlineBP2.text === 'Borderline', '115/85 mmHg should be evaluated as Borderline (diastolic high)');

const criticalBP1 = evaluateBloodPressure(145, 75);
assert(criticalBP1.status === 'critical' && criticalBP1.text === 'Critical High', '145/75 mmHg should be evaluated as Critical High (systolic high)');

const criticalBP2 = evaluateBloodPressure(115, 95);
assert(criticalBP2.status === 'critical' && criticalBP2.text === 'Critical High', '115/95 mmHg should be evaluated as Critical High (diastolic high)');


// 2. Blood Sugar Threshold Tests
console.log('\nTesting Blood Sugar thresholds...');
const normalSugar = evaluateBloodSugar(95);
assert(normalSugar.status === 'normal' && normalSugar.text === 'Normal', '95 mg/dL should be evaluated as Normal fasting');

const borderlineSugar = evaluateBloodSugar(110);
assert(borderlineSugar.status === 'borderline' && borderlineSugar.text === 'Pre-diabetic', '110 mg/dL should be evaluated as Borderline / Pre-diabetic');

const criticalSugar = evaluateBloodSugar(135);
assert(criticalSugar.status === 'critical' && criticalSugar.text === 'Critical High', '135 mg/dL should be evaluated as Critical High');


// 3. SpO2 Threshold Tests
console.log('\nTesting Oxygen Saturation (SpO2) thresholds...');
const normalSpO2 = evaluateSpO2(98);
assert(normalSpO2.status === 'normal' && normalSpO2.text === 'Normal', '98% SpO2 should be evaluated as Normal');

const borderlineSpO2 = evaluateSpO2(92);
assert(borderlineSpO2.status === 'borderline' && borderlineSpO2.text === 'Borderline', '92% SpO2 should be evaluated as Borderline');

const criticalSpO2 = evaluateSpO2(88);
assert(criticalSpO2.status === 'critical' && criticalSpO2.text === 'Critical Low', '88% SpO2 should be evaluated as Critical Low');


// 4. Temperature Threshold Tests
console.log('\nTesting Body Temperature thresholds...');
const normalTemp = evaluateTemperature(36.5);
assert(normalTemp.status === 'normal' && normalTemp.text === 'Normal', '36.5°C should be evaluated as Normal');

const criticalTempHigh = evaluateTemperature(38.2);
assert(criticalTempHigh.status === 'critical' && criticalTempHigh.text === 'Fever/Low Temp', '38.2°C should be evaluated as Critical High (Fever)');

const criticalTempLow = evaluateTemperature(35.8);
assert(criticalTempLow.status === 'critical' && criticalTempLow.text === 'Fever/Low Temp', '35.8°C should be evaluated as Critical Low (Hypothermia)');


// 5. Adherence Calculations Tests
console.log('\nTesting Medication Adherence math...');
assert(calculateAdherence(10, 10) === 100, '10/10 doses taken should be 100%');
assert(calculateAdherence(7, 10) === 70, '7/10 doses taken should be 70%');
assert(calculateAdherence(3, 9) === 33.3, '3/9 doses taken should be 33.3%');
assert(calculateAdherence(0, 0) === 100, '0/0 scheduled doses should default to 100%');


// 6. Health Score Calculations Tests
console.log('\nTesting Health Score logging consistency...');
const perfectState = calculateHealthScore({ vitalsLoggedPast24h: true, symptomLoggedPast24h: true, adherenceRate: 90 });
assert(perfectState === 100, 'Perfect logs: vitals, symptoms, adherence >= 85% should score 100');

const goodState = calculateHealthScore({ vitalsLoggedPast24h: true, symptomLoggedPast24h: false, adherenceRate: 75 });
assert(goodState === 80, 'Good logs: vitals, no symptoms, adherence 75% should score 80 (50 base + 20 vitals + 10 adherence)');

const poorState = calculateHealthScore({ vitalsLoggedPast24h: false, symptomLoggedPast24h: false, adherenceRate: 50 });
assert(poorState === 50, 'Poor logs: no logs and low adherence should score base 50');


console.log(`\n--- TEST SUMMARY: ${passedCount}/${testCount} PASSED ---\n`);

if (passedCount !== testCount) {
  process.exit(1);
} else {
  console.log('🎉 All unit tests compiled and executed successfully!');
  process.exit(0);
}
