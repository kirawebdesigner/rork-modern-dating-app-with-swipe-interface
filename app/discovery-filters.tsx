import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, MapPin, Lock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { useApp } from '@/hooks/app-context';
import { useMembership } from '@/hooks/membership-context';

type InterestedIn = 'girl' | 'boy';

export default function DiscoveryFilters() {
  const router = useRouter();
  const { filters, setFilters } = useApp();
  const { features } = useMembership();
  const [localFilters, setLocalFilters] = useState(() => ({
    ...filters,
    interestedIn: filters.interestedIn || 'girl',
  }));

  const handleSave = async () => {
    try {
      await setFilters(localFilters);
      router.back();
    } catch (error) {
      console.error('Error saving filters:', error);
      Alert.alert('Error', 'Failed to save filters');
    }
  };

  const handleGenderSelect = (gender: InterestedIn) => {
    setLocalFilters(prev => ({ ...prev, interestedIn: gender }));
  };

  const handleAgeChange = (type: 'min' | 'max', value: number) => {
    setLocalFilters(prev => ({
      ...prev,
      [type === 'min' ? 'ageMin' : 'ageMax']: Math.max(18, Math.min(99, value))
    }));
  };

  const handleDistanceChange = (distance: number) => {
    setLocalFilters(prev => ({ ...prev, distanceKm: Math.max(1, Math.min(100, distance)) }));
  };

  const advancedDisabled = !features.advancedFilters;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Discovery Filters</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Show me</Text>
          <View style={styles.genderOptions}>
            <TouchableOpacity
              style={[
                styles.genderOption,
                localFilters.interestedIn === 'girl' && styles.genderOptionSelected
              ]}
              onPress={() => handleGenderSelect('girl')}
              testID="filter-girl"
            >
              <Text style={[
                styles.genderOptionText,
                localFilters.interestedIn === 'girl' && styles.genderOptionTextSelected
              ]}>Girls</Text>
              {localFilters.interestedIn === 'girl' && (
                <Check size={20} color={Colors.text.white} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderOption,
                localFilters.interestedIn === 'boy' && styles.genderOptionSelected
              ]}
              onPress={() => handleGenderSelect('boy')}
              testID="filter-boy"
            >
              <Text style={[
                styles.genderOptionText,
                localFilters.interestedIn === 'boy' && styles.genderOptionTextSelected
              ]}>Boys</Text>
              {localFilters.interestedIn === 'boy' && (
                <Check size={20} color={Colors.text.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationBlock}>
            <View style={styles.locationRow}>
              <MapPin size={18} color={Colors.primary} />
              <Text style={styles.locationLabel}>{localFilters.locationLabel ?? 'Ethiopia'}</Text>
            </View>
            <TextInput
              style={styles.locationInput}
              placeholder="Enter city or country"
              placeholderTextColor={Colors.text.light}
              value={localFilters.locationLabel}
              onChangeText={(text) => setLocalFilters(prev => ({ ...prev, locationLabel: text }))}
              testID="filter-location-input"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {['Ethiopia','Addis Ababa','Dire Dawa','Mekelle','Gondar','Bahir Dar','Adama','Hawassa'].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setLocalFilters(prev => ({ ...prev, locationLabel: c }))}
                  style={[styles.chip, (localFilters.locationLabel ?? '').toLowerCase() === c.toLowerCase() && styles.chipSelected]}
                  testID={`chip-${c.replace(/\s+/g,'-').toLowerCase()}`}
                >
                  <Text style={[styles.chipText, (localFilters.locationLabel ?? '').toLowerCase() === c.toLowerCase() && styles.chipTextSelected]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Age Range</Text>
          <View style={styles.ageContainer}>
            <View style={styles.ageInputContainer}>
              <Text style={styles.ageLabel}>Min Age</Text>
              <View style={styles.ageControls}>
                <TouchableOpacity
                  style={styles.ageButton}
                  onPress={() => handleAgeChange('min', localFilters.ageMin - 1)}
                >
                  <Text style={styles.ageButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.ageValue}>{localFilters.ageMin}</Text>
                <TouchableOpacity
                  style={styles.ageButton}
                  onPress={() => handleAgeChange('min', localFilters.ageMin + 1)}
                >
                  <Text style={styles.ageButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.ageInputContainer}>
              <Text style={styles.ageLabel}>Max Age</Text>
              <View style={styles.ageControls}>
                <TouchableOpacity
                  style={styles.ageButton}
                  onPress={() => handleAgeChange('max', localFilters.ageMax - 1)}
                >
                  <Text style={styles.ageButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.ageValue}>{localFilters.ageMax}</Text>
                <TouchableOpacity
                  style={styles.ageButton}
                  onPress={() => handleAgeChange('max', localFilters.ageMax + 1)}
                >
                  <Text style={styles.ageButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance</Text>
          <View style={styles.distanceContainer}>
            <View style={styles.distanceControls}>
              <TouchableOpacity
                style={styles.distanceButton}
                onPress={() => handleDistanceChange(localFilters.distanceKm - 5)}
              >
                <Text style={styles.distanceButtonText}>-5</Text>
              </TouchableOpacity>
              <View style={styles.distanceDisplay}>
                <Text style={styles.distanceValue}>{localFilters.distanceKm}</Text>
                <Text style={styles.distanceUnit}>km</Text>
              </View>
              <TouchableOpacity
                style={styles.distanceButton}
                onPress={() => handleDistanceChange(localFilters.distanceKm + 5)}
              >
                <Text style={styles.distanceButtonText}>+5</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Filters</Text>
          <View style={[styles.advancedBlock, advancedDisabled && styles.advancedDisabled]}>
            {advancedDisabled && (
              <View style={styles.lockOverlay} pointerEvents="none">
                <Lock size={18} color={Colors.text.white} />
                <Text style={styles.lockText}>Upgrade to Gold to unlock</Text>
              </View>
            )}
            <View style={styles.rowBetween}>
              <Text style={styles.advancedLabel}>Education</Text>
              <TextInput
                style={styles.advancedInput}
                editable={!advancedDisabled}
                placeholder="e.g., Bachelor, Master"
                placeholderTextColor={Colors.text.light}
                value={(localFilters as any).education ?? ''}
                onChangeText={(text) => setLocalFilters(prev => ({ ...prev, education: text }))}
              />
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.advancedLabel}>Height</Text>
              <TextInput
                style={styles.advancedInput}
                editable={!advancedDisabled}
                placeholder="e.g., 160-190 cm"
                placeholderTextColor={Colors.text.light}
                value={(localFilters as any).heightRange ?? ''}
                onChangeText={(text) => setLocalFilters(prev => ({ ...prev, heightRange: text }))}
              />
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.advancedLabel}>Specific Location</Text>
              <TextInput
                style={styles.advancedInput}
                editable={!advancedDisabled}
                placeholder="Neighborhood / District"
                placeholderTextColor={Colors.text.light}
                value={(localFilters as any).specificLocation ?? ''}
                onChangeText={(text) => setLocalFilters(prev => ({ ...prev, specificLocation: text }))}
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton
          title="Apply Filters"
          onPress={handleSave}
          style={styles.applyButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  locationBlock: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  locationInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
  },
  chipsRow: {
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: Colors.card,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.text.white,
  },
  genderOptions: {
    gap: 12,
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  genderOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  genderOptionTextSelected: {
    color: Colors.text.white,
  },
  ageContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  ageInputContainer: {
    flex: 1,
  },
  ageLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  ageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 8,
  },
  ageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageButtonText: {
    color: Colors.text.white,
    fontSize: 18,
    fontWeight: '600',
  },
  ageValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  distanceContainer: {
    alignItems: 'center',
  },
  distanceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
  },
  distanceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceButtonText: {
    color: Colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  distanceDisplay: {
    alignItems: 'center',
    marginHorizontal: 24,
  },
  distanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  distanceUnit: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  advancedBlock: { backgroundColor: Colors.backgroundSecondary, borderRadius: 16, padding: 12, position: 'relative' },
  advancedDisabled: { opacity: 0.7 },
  lockOverlay: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockText: { color: Colors.text.white, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  advancedLabel: { color: Colors.text.secondary },
  advancedInput: { flex: 1, height: 40, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 10, backgroundColor: Colors.card, color: Colors.text.primary },
  bottomSpacing: {
    height: 100,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  applyButton: {
    marginTop: 16,
  },
});