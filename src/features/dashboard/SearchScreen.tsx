import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import {
  getMedications,
  getSymptomsHistory,
  getDoctorVisits,
  getPrescriptions,
  MedicationDB,
  SymptomDB,
  DoctorVisitDB,
  PrescriptionDB,
} from '../../database/dbHelpers';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';

type SearchCategory = 'All' | 'Medicines' | 'Symptoms' | 'Visits' | 'Prescriptions';

interface SearchResultItem {
  id: number;
  title: string;
  subtitle: string;
  category: SearchCategory;
  date: string; // YYYY-MM-DD
  severity?: number; // Optional severity (symptoms only)
  extraText?: string;
  rawItem: any;
}

export const SearchScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const { themeMode, contrastMode, fontSizeScale, user } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('All');
  const [allData, setAllData] = useState<SearchResultItem[]>([]);
  const [filteredData, setFilteredData] = useState<SearchResultItem[]>([]);

  useEffect(() => {
    if (isFocused && user) {
      compileAllRecords();
    }
  }, [isFocused, user]);

  useEffect(() => {
    filterRecords();
  }, [searchQuery, selectedCategory, allData]);

  const compileAllRecords = () => {
    if (!user) return;
    setLoading(true);
    try {
      const items: SearchResultItem[] = [];

      // 1. Medications
      const meds = getMedications(user.id);
      meds.forEach((m) => {
        items.push({
          id: m.id,
          title: `💊 Medication: ${m.name}`,
          subtitle: `${m.dosage} ${m.unit} - ${m.instructions || ''}`,
          category: 'Medicines',
          date: m.start_date,
          extraText: m.frequency_type,
          rawItem: m,
        });
      });

      // 2. Symptoms
      const symptoms = getSymptomsHistory(user.id, 100);
      symptoms.forEach((s) => {
        items.push({
          id: s.id,
          title: `🤒 Symptom: ${s.name}`,
          subtitle: s.notes || 'No description notes',
          category: 'Symptoms',
          date: s.timestamp.split('T')[0],
          severity: s.severity,
          extraText: `Severity: ${s.severity}/10`,
          rawItem: s,
        });
      });

      // 3. Doctor Visits
      const visits = getDoctorVisits(user.id);
      visits.forEach((v) => {
        items.push({
          id: v.id,
          title: `🩺 Doctor Visit: ${v.doctor_name}`,
          subtitle: `${v.specialization} at ${v.clinic_hospital}`,
          category: 'Visits',
          date: v.visit_date,
          extraText: v.notes || '',
          rawItem: v,
        });
      });

      // 4. Prescriptions
      const prescriptions = getPrescriptions(user.id);
      prescriptions.forEach((p) => {
        items.push({
          id: p.id,
          title: `📄 Prescription: ${p.file_name}`,
          subtitle: `Doctor: ${p.doctor_tag || 'N/A'}`,
          category: 'Prescriptions',
          date: p.visit_date_tag || p.uploaded_at.split('T')[0],
          extraText: `Cabinet: ${p.folder_name}`,
          rawItem: p,
        });
      });

      // Sort all items chronologically
      items.sort((a, b) => b.date.localeCompare(a.date));
      setAllData(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let result = allData;

    // Filter by Category
    if (selectedCategory !== 'All') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Filter by Query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          (item.extraText && item.extraText.toLowerCase().includes(q))
      );
    }

    setFilteredData(result);
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
      {/* Search Input */}
      <View style={styles.searchHeader}>
        <Input
          label="Global Search Cabinet"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Type keywords (e.g. Lisinopril, Dr. Chen, Headache)..."
        />
      </View>

      {/* Categories selector pills */}
      <View>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.catPillsList}>
          {(['All', 'Medicines', 'Symptoms', 'Visits', 'Prescriptions'] as SearchCategory[]).map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.catPill,
                {
                  backgroundColor: selectedCategory === cat ? theme.primary : theme.card,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={{
                  color: selectedCategory === cat ? '#FFFFFF' : theme.text,
                  fontWeight: 'bold',
                  fontSize: 13 * fontScale,
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      <ScrollView contentContainerStyle={styles.scrollList}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary, fontSize: 14 * fontScale }]}>
          Found {filteredData.length} records matching search
        </Text>

        {filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 36 }}>🔍</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 16 * fontScale, marginTop: 8, textAlign: 'center' }}>
              No matches found. Try typing a different medical condition or medication name.
            </Text>
          </View>
        ) : (
          filteredData.map((item) => (
            <Card key={`${item.category}-${item.id}`} style={styles.resultCard}>
              <View style={styles.resultRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultTitle, { color: theme.text, fontSize: 16 * fontScale }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.resultSubtitle, { color: theme.textSecondary, fontSize: 14 * fontScale }]}>
                    {item.subtitle}
                  </Text>
                  
                  {item.extraText ? (
                    <Text style={[styles.resultExtra, { color: theme.primary, fontSize: 13 * fontScale }]}>
                      {item.extraText}
                    </Text>
                  ) : null}

                  <Text style={[styles.resultDate, { color: theme.textSecondary, fontSize: 12 * fontScale }]}>
                    📅 Date: {item.date}
                  </Text>
                </View>
                
                <View style={[styles.catBadge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.catBadgeText, { color: theme.primary, fontSize: 11 * fontScale }]}>
                    {item.category}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
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
  searchHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  catPillsList: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    height: 48,
    marginVertical: 4,
  },
  catPill: {
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    marginRight: 8,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 40,
  },
  resultsCount: {
    fontWeight: '600',
    marginBottom: 10,
    paddingLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  resultCard: {
    padding: 12,
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultTitle: {
    fontWeight: '900',
  },
  resultSubtitle: {
    fontWeight: '500',
    marginTop: 2,
  },
  resultExtra: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  resultDate: {
    fontWeight: '500',
    marginTop: 6,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  catBadgeText: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
