import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface ReportData {
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  dob: string;
  height: number;
  weight: number;
  conditions: string[];
  allergies: string[];
  medications: string[];
  emergencyContact: { name: string; relation: string; phone: string } | null;
  adherencePercentage: number;
  medicationList: Array<{
    name: string;
    dosage: string;
    unit: string;
    instructions: string;
    frequencyType: string;
    stock: number;
  }>;
  vitalsLogs: Array<{
    systolic?: number;
    diastolic?: number;
    blood_sugar_fasting?: number;
    blood_sugar_post_meal?: number;
    temperature?: number;
    weight?: number;
    spo2?: number;
    heart_rate?: number;
    timestamp: string;
  }>;
  symptomLogs: Array<{
    name: string;
    severity: number;
    notes?: string;
    timestamp: string;
  }>;
  doctorVisits: Array<{
    visit_date: string;
    doctor_name: string;
    specialization: string;
    notes?: string;
    prescription_summary?: string;
    follow_up_date?: string;
  }>;
}

interface MetricStats {
  latest: string;
  min: string;
  max: string;
  avg: string;
}

const getMetricStats = (
  logs: any[],
  getter1: (v: any) => number | undefined,
  getter2?: (v: any) => number | undefined,
  unit = ''
): MetricStats => {
  const vals1: number[] = [];
  const vals2: number[] = [];

  // Logs are ordered ASC (oldest first, latest last)
  logs.forEach(l => {
    const v1 = getter1(l);
    if (v1 !== undefined && v1 !== null) vals1.push(v1);

    if (getter2) {
      const v2 = getter2(l);
      if (v2 !== undefined && v2 !== null) vals2.push(v2);
    }
  });

  if (vals1.length === 0 && (!getter2 || vals2.length === 0)) {
    return { latest: 'N/A', min: 'N/A', max: 'N/A', avg: 'N/A' };
  }

  const calculate = (arr: number[]) => {
    if (arr.length === 0) return { latest: 0, min: 0, max: 0, avg: 0 };
    const sum = arr.reduce((a, b) => a + b, 0);
    return {
      latest: arr[arr.length - 1], // Last element is latest in ASC list
      min: Math.min(...arr),
      max: Math.max(...arr),
      avg: Math.round((sum / arr.length) * 10) / 10,
    };
  };

  const s1 = calculate(vals1);
  if (!getter2) {
    return {
      latest: `${s1.latest}${unit}`,
      min: `${s1.min}${unit}`,
      max: `${s1.max}${unit}`,
      avg: `${s1.avg}${unit}`,
    };
  }

  const s2 = calculate(vals2);
  return {
    latest: `${s1.latest}/${s2.latest}${unit}`,
    min: `${s1.min}/${s2.min}${unit}`,
    max: `${s1.max}/${s2.max}${unit}`,
    avg: `${s1.avg}/${s2.avg}${unit}`,
  };
};

const generateSvgChart = (
  data: Array<{ value1: number; value2?: number; label: string }>,
  title: string,
  color1: string,
  color2?: string,
  label1 = 'Value 1',
  label2 = 'Value 2'
): string => {
  if (data.length === 0) {
    return `
      <div style="text-align: center; padding: 30px; background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 6px; color: #64748B; font-size: 12px; margin-bottom: 20px;">
        <strong>No clinical records logged for ${title} trend.</strong>
      </div>
    `;
  }

  const width = 600;
  const height = 160;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const allVals: number[] = [];
  data.forEach(d => {
    allVals.push(d.value1);
    if (d.value2 !== undefined) allVals.push(d.value2);
  });
  let maxVal = Math.max(...allVals);
  let minVal = Math.min(...allVals);

  if (maxVal === minVal) {
    maxVal += 10;
    minVal -= 10;
  } else {
    const diff = maxVal - minVal;
    maxVal += diff * 0.1;
    minVal -= diff * 0.1;
  }

  if (maxVal - minVal < 10) {
    maxVal = minVal + 10;
  }

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return height - paddingBottom - ((val - minVal) / (maxVal - minVal)) * chartHeight;
  };

  let path1 = '';
  let path2 = '';
  let dots1 = '';
  let dots2 = '';

  data.forEach((d, idx) => {
    const x = getX(idx);
    const y1 = getY(d.value1);

    if (idx === 0) {
      path1 = `M ${x} ${y1}`;
    } else {
      path1 += ` L ${x} ${y1}`;
    }
    dots1 += `<circle cx="${x}" cy="${y1}" r="3" fill="${color1}" stroke="#FFFFFF" stroke-width="1" />`;

    if (d.value2 !== undefined) {
      const y2 = getY(d.value2);
      if (idx === 0) {
        path2 = `M ${x} ${y2}`;
      } else {
        path2 += ` L ${x} ${y2}`;
      }
      dots2 += `<circle cx="${x}" cy="${y2}" r="3" fill="${color2 || '#EF4444'}" stroke="#FFFFFF" stroke-width="1" />`;
    }
  });

  let yGridLines = '';
  const divisions = 3;
  for (let i = 0; i <= divisions; i++) {
    const gridVal = minVal + (i / divisions) * (maxVal - minVal);
    const y = getY(gridVal);
    yGridLines += `
      <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${paddingLeft - 8}" y="${y + 3}" fill="#64748B" font-size="8" text-anchor="end" font-family="sans-serif">${Math.round(gridVal)}</text>
    `;
  }

  let xLabels = '';
  if (data.length > 0) {
    const indicesToShow = data.length === 1 ? [0] : data.length === 2 ? [0, 1] : [0, Math.floor(data.length / 2), data.length - 1];
    indicesToShow.forEach(idx => {
      const x = getX(idx);
      xLabels += `
        <text x="${x}" y="${height - paddingBottom + 12}" fill="#64748B" font-size="8" text-anchor="middle" font-family="sans-serif">${data[idx].label}</text>
      `;
    });
  }

  return `
    <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-weight: 700; color: #1E3A8A; font-size: 11px; text-transform: uppercase;">${title}</span>
        <div style="font-size: 8px; display: flex; gap: 8px; font-family: sans-serif; color: #475569;">
          <span style="display: flex; align-items: center; gap: 2px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${color1};"></span>
            ${label1}
          </span>
          ${data.length > 0 && data[0].value2 !== undefined ? `
            <span style="display: flex; align-items: center; gap: 2px;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${color2 || '#EF4444'};"></span>
              ${label2}
            </span>
          ` : ''}
        </div>
      </div>
      <svg width="100%" height="160" viewBox="0 0 600 160" style="display: block;">
        ${yGridLines}
        ${xLabels}
        <path d="${path1}" fill="none" stroke="${color1}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        ${path2 ? `<path d="${path2}" fill="none" stroke="${color2 || '#EF4444'}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />` : ''}
        ${dots1}
        ${dots2}
      </svg>
    </div>
  `;
};

export const generateAndShareReport = async (data: ReportData, dateRangeLabel: string): Promise<string> => {
  // Add required debug logging
  console.log("PROFILE:", {
    patientName: data.patientName,
    age: data.age,
    gender: data.gender,
    bloodGroup: data.bloodGroup,
    dob: data.dob,
    height: data.height,
    weight: data.weight,
    conditions: data.conditions,
    allergies: data.allergies,
    medications: data.medications,
    emergencyContact: data.emergencyContact,
  });
  console.log("VITALS:", data.vitalsLogs);
  console.log("MEDICATIONS:", data.medicationList);
  console.log("SYMPTOMS:", data.symptomLogs);
  console.log("VISITS:", data.doctorVisits);

  try {
    // 1. Calculate stats dynamically
    const bpStats = getMetricStats(data.vitalsLogs, v => v.systolic, v => v.diastolic);
    const sugarStats = getMetricStats(data.vitalsLogs, v => v.blood_sugar_fasting, v => v.blood_sugar_post_meal);
    const tempStats = getMetricStats(data.vitalsLogs, v => v.temperature, undefined, '°C');
    const hrStats = getMetricStats(data.vitalsLogs, v => v.heart_rate, undefined, ' bpm');
    const spo2Stats = getMetricStats(data.vitalsLogs, v => v.spo2, undefined, '%');
    const weightStats = getMetricStats(data.vitalsLogs, v => v.weight, undefined, ' kg');

    // 2. Generate charts SVGs
    const bpChart = generateSvgChart(
      data.vitalsLogs.filter(v => v.systolic && v.diastolic).map(v => ({
        value1: v.systolic!,
        value2: v.diastolic!,
        label: new Date(v.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })),
      'Blood Pressure Trend',
      '#2563EB',
      '#EF4444',
      'Systolic',
      'Diastolic'
    );

    const sugarChart = generateSvgChart(
      data.vitalsLogs.filter(v => v.blood_sugar_fasting || v.blood_sugar_post_meal).map(v => ({
        value1: v.blood_sugar_fasting || 0,
        value2: v.blood_sugar_post_meal || undefined,
        label: new Date(v.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })),
      'Blood Sugar Trend',
      '#10B981',
      '#D97706',
      'Fasting',
      'Post-Meal'
    );

    const weightChart = generateSvgChart(
      data.vitalsLogs.filter(v => v.weight).map(v => ({
        value1: v.weight!,
        label: new Date(v.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })),
      'Weight Trend',
      '#4F46E5',
      undefined,
      'Weight (kg)'
    );

    const spo2Chart = generateSvgChart(
      data.vitalsLogs.filter(v => v.spo2).map(v => ({
        value1: v.spo2!,
        label: new Date(v.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })),
      'Oxygen Saturation (SpO2)',
      '#7C3AED',
      undefined,
      'SpO2 (%)'
    );

    const hrChart = generateSvgChart(
      data.vitalsLogs.filter(v => v.heart_rate).map(v => ({
        value1: v.heart_rate!,
        label: new Date(v.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })),
      'Heart Rate',
      '#DC2626',
      undefined,
      'Heart Rate (BPM)'
    );

    // 3. Assemble Clinical HTML Report
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>MediTrack Clinical Health Summary Report</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1E293B;
            margin: 0;
            padding: 30px;
            font-size: 12px;
            line-height: 1.4;
            background-color: #FFFFFF;
          }
          .header {
            border-bottom: 2px solid #2563EB;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-title h1 {
            color: #2563EB;
            font-size: 24px;
            margin: 0 0 4px 0;
            font-weight: 700;
          }
          .header-title p {
            color: #64748B;
            margin: 0;
            font-size: 12px;
          }
          .header-meta {
            text-align: right;
            font-size: 11px;
            color: #64748B;
          }
          .section-title {
            color: #1E3A8A;
            border-bottom: 1px solid #E2E8F0;
            padding-bottom: 4px;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 700;
            page-break-after: avoid;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .card {
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          .card-title {
            font-weight: 700;
            color: #2563EB;
            margin-bottom: 8px;
            font-size: 11px;
            text-transform: uppercase;
          }
          .profile-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            border-bottom: 1px dashed #E2E8F0;
            padding-bottom: 3px;
          }
          .profile-label {
            color: #64748B;
            font-weight: 600;
          }
          .profile-value {
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          th {
            background-color: #2563EB;
            color: #FFFFFF;
            font-weight: 600;
            text-align: left;
            padding: 6px 8px;
            font-size: 11px;
          }
          td {
            padding: 6px 8px;
            border-bottom: 1px solid #E2E8F0;
            font-size: 11px;
          }
          tr:nth-child(even) {
            background-color: #F8FAFC;
          }
          .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 10px;
            text-align: center;
          }
          .badge-blue { background-color: #DBEAFE; color: #2563EB; }
          .badge-green { background-color: #D1FAE5; color: #10B981; }
          .badge-red { background-color: #FEE2E2; color: #EF4444; }
          .badge-orange { background-color: #FEF3C7; color: #D97706; }
          .adherence-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .adherence-score {
            font-size: 28px;
            font-weight: 800;
            color: #10B981;
            margin-right: 15px;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #E2E8F0;
            padding-top: 10px;
            text-align: center;
            font-size: 10px;
            color: #94A3B8;
            page-break-inside: avoid;
          }
          .bullet-list {
            margin: 0;
            padding-left: 15px;
          }
          .bullet-list li {
            margin-bottom: 4px;
          }
          .page-break {
            page-break-before: always;
          }
        </style>
      </head>
      <body>
        <!-- SECTION 1: MediTrack Clinical Report -->
        <div class="header">
          <div class="header-title">
            <h1>MediTrack Clinical Report</h1>
            <p>Generated Health Summary & Trends</p>
          </div>
          <div class="header-meta">
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Report Period:</strong> ${dateRangeLabel}</p>
          </div>
        </div>

        <!-- SECTION 2 & 10: Patient Information & Emergency Information -->
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Patient Information</div>
            <div class="profile-row">
              <span class="profile-label">Full Name:</span>
              <span class="profile-value">${data.patientName}</span>
            </div>
            <div class="profile-row">
              <span class="profile-label">Date of Birth:</span>
              <span class="profile-value">${data.dob} (${data.age} yrs)</span>
            </div>
            <div class="profile-row">
              <span class="profile-label">Gender:</span>
              <span class="profile-value">${data.gender}</span>
            </div>
            <div class="profile-row">
              <span class="profile-label">Blood Group:</span>
              <span class="profile-value">${data.bloodGroup}</span>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Emergency Contact Details</div>
            ${
              data.emergencyContact
                ? `
              <div class="profile-row">
                <span class="profile-label">Primary Contact:</span>
                <span class="profile-value">${data.emergencyContact.name}</span>
              </div>
              <div class="profile-row">
                <span class="profile-label">Relationship:</span>
                <span class="profile-value">${data.emergencyContact.relation}</span>
              </div>
              <div class="profile-row">
                <span class="profile-label">Phone Number:</span>
                <span class="profile-value" style="color: #EF4444;">${data.emergencyContact.phone}</span>
              </div>
              `
                : `<p style="color: #EF4444; margin: 0; font-weight: bold; font-size: 11px;">No emergency contacts listed.</p>`
            }
          </div>
        </div>

        <!-- SECTION 3: Medical Profile -->
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Medical Conditions</div>
            ${
              data.conditions.length > 0
                ? `<ul class="bullet-list">${data.conditions.map((c) => `<li><strong>${c}</strong></li>`).join('')}</ul>`
                : `<p style="margin: 0; color: #64748B;">No chronic conditions listed.</p>`
            }
          </div>
          <div class="card">
            <div class="card-title">Allergies & Contraindications</div>
            ${
              data.allergies.length > 0
                ? `<ul class="bullet-list">${data.allergies
                    .map((a) => `<li style="color: #DC2626;"><strong>${a}</strong></li>`)
                    .join('')}</ul>`
                : `<p style="margin: 0; color: #64748B;">No known drug/food allergies.</p>`
            }
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title">Previous Surgeries</div>
            ${
              data.medications && data.medications.length > 0
                ? `<p style="margin: 0;">${data.medications.join(', ')}</p>`
                : `<p style="margin: 0; color: #64748B;">No prior surgeries recorded.</p>`
            }
          </div>
          <div class="card">
            <div class="card-title">Family History Notes</div>
            ${
              data.medications && data.medications.length > 1
                ? `<p style="margin: 0;">${data.medications[1] || ''}</p>`
                : `<p style="margin: 0; color: #64748B;">No family history logged.</p>`
            }
          </div>
        </div>

        <!-- SECTION 4: Vitals Summary Table -->
        <div class="section-title">Clinical Vitals Range Summary</div>
        <table>
          <thead>
            <tr>
              <th>Vital Metric</th>
              <th>Latest Recorded Value</th>
              <th>Minimum Value</th>
              <th>Maximum Value</th>
              <th>Range Average</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Blood Pressure (mmHg)</strong></td>
              <td><strong>${bpStats.latest}</strong></td>
              <td>${bpStats.min}</td>
              <td>${bpStats.max}</td>
              <td><strong>${bpStats.avg}</strong></td>
            </tr>
            <tr>
              <td><strong>Blood Sugar (mg/dL)</strong></td>
              <td><strong>${sugarStats.latest}</strong></td>
              <td>${sugarStats.min}</td>
              <td>${sugarStats.max}</td>
              <td><strong>${sugarStats.avg}</strong></td>
            </tr>
            <tr>
              <td><strong>Oxygen (SpO2)</strong></td>
              <td><strong>${spo2Stats.latest}</strong></td>
              <td>${spo2Stats.min}</td>
              <td>${spo2Stats.max}</td>
              <td><strong>${spo2Stats.avg}</strong></td>
            </tr>
            <tr>
              <td><strong>Heart Rate (BPM)</strong></td>
              <td><strong>${hrStats.latest}</strong></td>
              <td>${hrStats.min}</td>
              <td>${hrStats.max}</td>
              <td><strong>${hrStats.avg}</strong></td>
            </tr>
            <tr>
              <td><strong>Temperature (°C)</strong></td>
              <td><strong>${tempStats.latest}</strong></td>
              <td>${tempStats.min}</td>
              <td>${tempStats.max}</td>
              <td><strong>${tempStats.avg}</strong></td>
            </tr>
            <tr>
              <td><strong>Weight (kg)</strong></td>
              <td><strong>${weightStats.latest}</strong></td>
              <td>${weightStats.min}</td>
              <td>${weightStats.max}</td>
              <td><strong>${weightStats.avg}</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- SECTION 5 & 6: Medication Summary & Adherence Statistics -->
        <div class="section-title">Medication Schedules & Adherence</div>
        <div class="adherence-container">
          <div style="display: flex; align-items: center;">
            <div class="adherence-score">${data.adherencePercentage.toFixed(1)}%</div>
            <div>
              <span class="badge ${data.adherencePercentage >= 85 ? 'badge-green' : data.adherencePercentage >= 65 ? 'badge-orange' : 'badge-red'}">
                ${data.adherencePercentage >= 85 ? 'High Adherence' : data.adherencePercentage >= 65 ? 'Moderate Compliance' : 'Review Required'}
              </span>
              <div style="font-size: 10px; color: #64748B; margin-top: 3px; font-family: sans-serif;">Doses marked as taken in log schedule</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #475569; width: 55%; text-align: right;">
            Adherence index is computed by querying all logged medication schedule times.
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Active Medication</th>
              <th>Strength / Dosage</th>
              <th>Frequency</th>
              <th>Usage Instructions</th>
              <th>Remaining Stock</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.medicationList.length > 0
                ? data.medicationList
                    .map(
                      (m) => `
              <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.dosage} ${m.unit}</td>
                <td><span class="badge badge-blue">${m.frequencyType}</span></td>
                <td>${m.instructions || 'Take as directed'}</td>
                <td>${m.stock} doses left</td>
              </tr>
            `
                    )
                    .join('')
                : `<tr><td colspan="5" style="text-align:center; color: #64748B;">No medications listed.</td></tr>`
            }
          </tbody>
        </table>

        <!-- Page break for trend charts to fit nicely -->
        <div class="page-break"></div>

        <!-- SECTION 9: Health Trend Charts -->
        <div class="section-title">Health Trend Visualizations</div>
        <div style="margin-bottom: 20px;">
          ${bpChart}
          ${sugarChart}
          ${weightChart}
          ${spo2Chart}
          ${hrChart}
        </div>

        <div class="page-break"></div>

        <!-- SECTION 7: Symptom History -->
        <div class="section-title">Symptom Severity & Notes Timeline</div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Timestamp</th>
              <th style="width: 25%;">Experienced Symptom</th>
              <th style="width: 15%;">Severity</th>
              <th style="width: 35%;">Clinical Context Notes</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.symptomLogs.length > 0
                ? data.symptomLogs
                    .map(
                      (s) => `
              <tr>
                <td>${new Date(s.timestamp).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}</td>
                <td><strong>${s.name}</strong></td>
                <td>
                  <span class="badge ${s.severity >= 7 ? 'badge-red' : s.severity >= 4 ? 'badge-orange' : 'badge-green'}">
                    Sev: ${s.severity}/10
                  </span>
                </td>
                <td>${s.notes || 'No notes logged.'}</td>
              </tr>
            `
                    )
                    .join('')
                : `<tr><td colspan="4" style="text-align:center; color: #64748B;">No symptoms experienced during this period.</td></tr>`
            }
          </tbody>
        </table>

        <!-- SECTION 8: Doctor Visit History -->
        <div class="section-title">Doctor Visit Consultation History</div>
        <table>
          <thead>
            <tr>
              <th>Visit Date</th>
              <th>Clinician / Specialist</th>
              <th>Consultation Summary Notes</th>
              <th>Scheduled Follow-up</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.doctorVisits.length > 0
                ? data.doctorVisits
                    .map(
                      (dv) => `
              <tr>
                <td>${dv.visit_date}</td>
                <td><strong>${dv.doctor_name}</strong><br><span style="font-size: 10px; color:#64748B;">${dv.specialization}</span></td>
                <td>
                  ${dv.notes || 'Routine consultation.'}
                  ${dv.prescription_summary ? `<br><em>Prescriptions:</em> ${dv.prescription_summary}` : ''}
                </td>
                <td>${dv.follow_up_date || 'None scheduled'}</td>
              </tr>
            `
                    )
                    .join('')
                : `<tr><td colspan="4" style="text-align:center; color: #64748B;">No clinical consultations logged.</td></tr>`
            }
          </tbody>
        </table>

        <div class="footer">
          <p><strong>Clinical Disclaimer:</strong> MediTrack Clinical Reports are generated for reference purposes only and do not constitute professional diagnosis or prescriptions.</p>
          <p>&copy; ${new Date().getFullYear()} MediTrack Personal Companion. Data stored locally and securely.</p>
        </div>
      </body>
      </html>
    `;

    console.log("HTML LENGTH:", htmlContent.length);

    // 4. Handle Platform Printing & PDF conversion
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        console.log("PDF PATH:", "web_print");
        return 'web_print';
      }
      return '';
    }

    // Native printing to file
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    console.log("PDF PATH:", uri);
    return uri;

  } catch (error) {
    console.error('Error generating or sharing report:', error);
    return '';
  }
};
