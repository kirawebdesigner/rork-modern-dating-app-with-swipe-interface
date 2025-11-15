import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Modal, Alert, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Camera, Calendar, Check, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { categorizedInterests } from '@/mocks/interests';
import { useApp } from '@/hooks/app-context';
import { useI18n } from '@/hooks/i18n-context';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';

type ProfileStep = 'details' | 'gender' | 'extras' | 'interests';

interface ProfileData {
  firstName: string;
  lastName: string;
  birthday: Date | null;
  gender: 'girl' | 'boy' | null;
  interestedIn: 'girl' | 'boy' | null;
  interests: string[];
  photoUri?: string | null;
  city?: string;
  heightCm?: string;
  education?: string;
  phone?: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const;

export default function ProfileSetup() {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<ProfileStep>('details');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(1995);
  const [selectedMonth, setSelectedMonth] = useState<number>(6);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [typedYear, setTypedYear] = useState<string>('1995');
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    birthday: null,
    gender: null,
    interestedIn: null,
    interests: [],
    photoUri: null,
    phone: '',
  });

  const { setCurrentProfile, setFilters, filters } = useApp();
  const { t } = useI18n();

  React.useEffect(() => {
    (async () => {
      try {
        const storedIdRaw = await AsyncStorage.getItem('user_id');
        const storedPhoneRaw = await AsyncStorage.getItem('user_phone');
        
        if (storedIdRaw || storedPhoneRaw) {
          const id = storedIdRaw ?? '';
          if (id) {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('completed')
              .eq('id', id)
              .maybeSingle();
            
            if (!error && profile?.completed) {
              console.log('[ProfileSetup] Profile already completed, redirecting to tabs');
              router.replace('/(tabs)' as any);
              return;
            }
          }
        }
        
        const saved = await AsyncStorage.getItem('profile_setup_state');
        if (saved) {
          const parsed = JSON.parse(saved) as { step: ProfileStep; data: ProfileData };
          setCurrentStep(parsed.step);
          setProfileData(parsed.data);
          console.log('[ProfileSetup] Resumed saved progress at step', parsed.step);
        }
      } catch (e) {
        console.log('[ProfileSetup] Failed to restore saved progress', e);
      }
    })();
  }, [router]);

  React.useEffect(() => {
    (async () => {
      try {
        const payload = JSON.stringify({ step: currentStep, data: profileData });
        await AsyncStorage.setItem('profile_setup_state', payload);
      } catch (e) {
        console.log('[ProfileSetup] Failed to persist progress', e);
      }
    })();
  }, [currentStep, profileData]);

  const handleBack = () => {
    if (currentStep === 'details') {
      const canGoBack = (router as any)?.canGoBack?.() ?? false;
      if (canGoBack) {
        router.back();
      } else {
        router.replace('/(tabs)' as any);
      }
    } else if (currentStep === 'gender') {
      setCurrentStep('details');
    } else if (currentStep === 'extras') {
      setCurrentStep('gender');
    } else if (currentStep === 'interests') {
      setCurrentStep('extras');
    }
  };

  const handleSkip = () => {
    if (currentStep === 'details') {
      setCurrentStep('gender');
    } else if (currentStep === 'gender') {
      setCurrentStep('extras');
    } else if (currentStep === 'extras') {
      setCurrentStep('interests');
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handleContinue = async () => {
    if (currentStep === 'details') {
      if (!profileData.firstName.trim()) {
        Alert.alert(t('Error'), t('Please enter your first name'));
        return;
      }
      if (!profileData.birthday) {
        Alert.alert(t('Age restriction'), t('Choose birthday date'));
        return;
      }
      const ageNow = calculateAge(profileData.birthday);
      if (ageNow < 18) {
        Alert.alert(t('Age restriction'), t('You must be at least 18 years old.'));
        return;
      }
      setCurrentStep('gender');
    } else if (currentStep === 'gender') {
      if (!profileData.gender) {
        Alert.alert(t('Error'), t('Please select your gender'));
        return;
      }
      try {
        const nextFilters = { ...filters, interestedIn: profileData.interestedIn } as any;
        await setFilters(nextFilters);
        console.log('[ProfileSetup] Set interestedIn to', profileData.interestedIn);
      } catch (e) {
        console.log('[ProfileSetup] setFilters failed', e);
      }
      setCurrentStep('extras');
    } else if (currentStep === 'extras') {
      try {
        const storedPhone = await AsyncStorage.getItem('user_phone');
        if (!storedPhone) {
          Alert.alert(t('Error'), t('Phone number not found. Please login again.'));
          return;
        }
        const { data: dbProfile, error: fetchErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', storedPhone)
          .maybeSingle();
        if (fetchErr || !dbProfile) {
          Alert.alert(t('Error'), t('Profile not found. Please login again.'));
          return;
        }
        const authId = dbProfile.id as string;
        const name = `${profileData.firstName.trim()} ${profileData.lastName.trim()}`.trim();
        const birthday = profileData.birthday ?? new Date(1995, 0, 1);
        const age = calculateAge(birthday);
        const user: User = {
          id: authId,
          name: name || 'New User',
          age,
          birthday,
          gender: (profileData.gender ?? 'girl'),
          interestedIn: profileData.interestedIn ?? undefined,
          bio: 'Hey there! I am new here.',
          photos: [profileData.photoUri ?? 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop'],
          interests: profileData.interests,
          location: { city: profileData.city ?? '' },
          heightCm: profileData.heightCm ? Number(profileData.heightCm) : undefined,
          education: profileData.education ?? undefined,
          verified: false,
          isPremium: false,
          lastActive: new Date(),
        } as User;
        try {
          const { error: upErr } = await supabase
            .from('profiles')
            .update({
              name: user.name,
              age: user.age,
              birthday: birthday.toISOString().slice(0,10),
              gender: user.gender,
              interested_in: user.interestedIn ?? null,
              bio: user.bio,
              photos: user.photos,
              interests: user.interests,
              city: user.location?.city ?? null,
              height_cm: user.heightCm ?? null,
              education: user.education ?? null,
              completed: false,
            })
            .eq('id', authId);
          if (upErr) {
            console.log('[ProfileSetup] profiles update (extras) error', upErr.message);
          }
        } catch (dbErr) {
          console.log('[ProfileSetup] Supabase update (extras) exception', dbErr);
        }
        await setCurrentProfile(user);
        console.log('[ProfileSetup] Saved partial profile (extras)');
      } catch (e) {
        console.log('[ProfileSetup] Save profile error', e);
      }
      setCurrentStep('interests');
    } else if (currentStep === 'interests') {
      try {
        const storedPhone = await AsyncStorage.getItem('user_phone');
        if (!storedPhone) {
          Alert.alert(t('Error'), t('Phone number not found. Please login again.'));
          return;
        }
        const { data: dbProfile, error: fetchErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', storedPhone)
          .maybeSingle();
        if (fetchErr || !dbProfile) {
          Alert.alert(t('Error'), t('Profile not found. Please login again.'));
          return;
        }
        const authId = dbProfile.id as string;
        const name = `${profileData.firstName.trim()} ${profileData.lastName.trim()}`.trim();
        const birthday = profileData.birthday ?? new Date(1995, 0, 1);
        const age = calculateAge(birthday);
        const user: User = {
          id: authId,
          name: name || 'New User',
          age,
          birthday,
          gender: (profileData.gender ?? 'girl'),
          interestedIn: profileData.interestedIn ?? undefined,
          bio: 'Hey there! I am new here.',
          photos: [profileData.photoUri ?? 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop'],
          interests: profileData.interests,
          location: { city: profileData.city ?? '' },
          heightCm: profileData.heightCm ? Number(profileData.heightCm) : undefined,
          education: profileData.education ?? undefined,
          verified: false,
          isPremium: false,
          lastActive: new Date(),
        } as User;
        try {
          const { error: upErr } = await supabase
            .from('profiles')
            .update({
              name: user.name,
              age: user.age,
              birthday: birthday.toISOString().slice(0,10),
              gender: user.gender,
              interested_in: user.interestedIn ?? null,
              bio: user.bio,
              photos: user.photos,
              interests: user.interests,
              city: user.location?.city ?? null,
              height_cm: user.heightCm ?? null,
              education: user.education ?? null,
              completed: true,
            })
            .eq('id', authId);
          if (upErr) {
            console.log('[ProfileSetup] profiles update (final) error', upErr.message);
            Alert.alert(t('Error'), t('Failed to save your profile. Please try again.'));
            return;
          }
        } catch (dbErr) {
          console.log('[ProfileSetup] Supabase update (final) exception', dbErr);
        }
        await setCurrentProfile(user);
        console.log('[ProfileSetup] Saved profile on interests');
      } catch (e) {
        console.log('[ProfileSetup] Final save error', e);
      }
      try {
        await AsyncStorage.removeItem('profile_setup_state');
      } catch {}
      router.replace('/(tabs)' as any);
    }
  };

  const formatDate = (date: Date) => {
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('Permission required'), t('We need access to your photos to set a profile picture.'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.9 });
      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri ?? null;
        setProfileData(prev => ({ ...prev, photoUri: uri }));
      }
    } catch (e) {
      console.log('[ProfileSetup] Image pick error', e);
      Alert.alert(t('Error'), 'Could not select image.');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <ArrowLeft size={24} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSkip} testID="skip-top">
        <Text style={styles.skipText}>{t('Skip')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfileDetails = () => (
    <View style={styles.container}>
      {renderHeader()}
      <Text style={styles.title}>{t('Profile details')}</Text>

      <View style={styles.profileImageContainer}>
        <TouchableOpacity style={styles.profileImagePlaceholder} onPress={pickImage} testID="pick-photo">
          {profileData.photoUri ? (
            <Image source={{ uri: profileData.photoUri }} style={styles.profileImage} />
          ) : (
            <Camera size={36} color={colors.text.light} />
          )}
          <View style={styles.cameraIcon}>
            <Camera size={20} color={colors.text.white} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t('First name')}</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.firstName}
          onChangeText={(text) => setProfileData(prev => ({ ...prev, firstName: text }))}
          placeholder={t('Enter your first name')}
          placeholderTextColor={colors.text.light}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t('Last name')}</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.lastName}
          onChangeText={(text) => setProfileData(prev => ({ ...prev, lastName: text }))}
          placeholder={t('Enter your last name')}
          placeholderTextColor={colors.text.light}
        />
      </View>

      <TouchableOpacity style={styles.birthdayButton} onPress={() => setShowDatePicker(true)} testID="open-birthday">
        <Calendar size={20} color={colors.primary} />
        <Text style={styles.birthdayButtonText}>
          {profileData.birthday ? `${formatDate(profileData.birthday)} (${calculateAge(profileData.birthday)} yrs)` : t('Choose birthday date')}
        </Text>
      </TouchableOpacity>

      <View style={[styles.bottomContainerFixed, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <GradientButton title={t('Confirm')} onPress={handleContinue} style={styles.confirmButton} />
      </View>
    </View>
  );

  const renderGenderSelection = () => (
    <View style={styles.container}>
      {renderHeader()}
      <Text style={styles.title}>{t('I am a')}</Text>
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[styles.genderOption, profileData.gender === 'girl' && styles.genderOptionSelected]}
          onPress={() => setProfileData(prev => ({ ...prev, gender: 'girl', interestedIn: 'boy' }))}
          testID="gender-girl"
        >
          <Text style={[styles.genderOptionText, profileData.gender === 'girl' && styles.genderOptionTextSelected]}>{t('Girl')}</Text>
          {profileData.gender === 'girl' && (<Check size={20} color={colors.text.white} />)}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.genderOption, profileData.gender === 'boy' && styles.genderOptionSelected]}
          onPress={() => setProfileData(prev => ({ ...prev, gender: 'boy', interestedIn: 'girl' }))}
          testID="gender-boy"
        >
          <Text style={[styles.genderOptionText, profileData.gender === 'boy' && styles.genderOptionTextSelected]}>{t('Boy')}</Text>
          {profileData.gender === 'boy' && (<Check size={20} color={colors.text.white} />)}
        </TouchableOpacity>
      </View>


      <View style={[styles.bottomContainerFixed, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <GradientButton title={t('Continue')} onPress={handleContinue} style={styles.confirmButton} />
      </View>
    </View>
  );

  const toggleInterest = (interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest) ? prev.interests.filter(i => i !== interest) : [...prev.interests, interest]
    }));
  };

  const renderInterestTag = (interest: string, icon: string) => (
    <TouchableOpacity
      key={interest}
      style={[styles.interestTag, profileData.interests.includes(interest) && styles.interestTagSelected]}
      onPress={() => toggleInterest(interest)}
      testID={`interest-${interest}`}
    >
      <Text style={styles.interestIcon}>{icon}</Text>
      <Text style={[styles.interestText, profileData.interests.includes(interest) && styles.interestTextSelected]}>{interest}</Text>
    </TouchableOpacity>
  );

  const renderExtras = () => (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('More about you')}</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('Location')}</Text>
          <TextInput
            style={styles.textInput}
            value={profileData.city ?? ''}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, city: text }))}
            placeholder={t('City, Country')}
            placeholderTextColor={colors.text.light}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('Height (cm)')}</Text>
          <TextInput
            style={styles.textInput}
            value={profileData.heightCm ?? ''}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, heightCm: text.replace(/[^0-9]/g,'') }))}
            placeholder={t('Height (cm) placeholder')}
            placeholderTextColor={colors.text.light}
            inputMode="numeric"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('Education')}</Text>
          <TextInput
            style={styles.textInput}
            value={profileData.education ?? ''}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, education: text }))}
            placeholder={t('Education (e.g., Bachelor in CS)')}
            placeholderTextColor={colors.text.light}
            testID="education-input"
          />
          <View style={styles.quickRow}>
            {['High school','Bachelor','Master','PhD'].map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setProfileData(prev => ({ ...prev, education: level }))}
                style={[styles.chip, (profileData.education ?? '') === level && styles.chipActive]}
                testID={`edu-${level.toLowerCase().replace(/\s+/g,'-')}`}
              >
                <Text style={[styles.chipText, (profileData.education ?? '') === level && styles.chipTextActive]}>{t(level)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setProfileData(prev => ({ ...prev, education: t('Prefer not to answer') }))}
              style={[styles.chip, (profileData.education ?? '') === t('Prefer not to answer') && styles.chipActive]}
              testID="edu-prefer-not"
            >
              <Text style={[styles.chipText, (profileData.education ?? '') === t('Prefer not to answer') && styles.chipTextActive]}>{t('Prefer not to answer')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.bottomContainerFixed, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <GradientButton title={t('Continue')} onPress={handleContinue} style={styles.confirmButton} />
      </View>
    </View>
  );

  const renderInterestSelection = () => (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('Your interests')}</Text>
        <Text style={styles.subtitle}>{t("Select a few of your interests and let everyone know what you're passionate about.")}</Text>
        {categorizedInterests.map((category) => (
          <View key={category.name} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category.name}</Text>
            <View style={styles.interestsGrid}>
              {category.interests.map((interest) => renderInterestTag(interest.name, interest.icon))}
            </View>
          </View>
        ))}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      <View style={[styles.bottomContainerFixed, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <GradientButton title={t('Continue')} onPress={handleContinue} style={styles.confirmButton} />
      </View>
    </View>
  );

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setSelectedDay(null);
  };

  const handleDaySelect = (day: number) => setSelectedDay(day);

  const handleSaveDate = () => {
    if (selectedDay) {
      const newDate = new Date(selectedYear, selectedMonth, selectedDay);
      const age = calculateAge(newDate);
      if (age < 18) {
        console.log('[ProfileSetup] Age validation failed', { age, newDate: newDate.toISOString() });
        Alert.alert(t('Age restriction'), t('You must be at least 18 years old.'));
        return;
      }
      setProfileData(prev => ({ ...prev, birthday: newDate }));
      setShowDatePicker(false);
    }
  };

  const CalendarGrid = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const today = new Date();

    return (
      <View style={styles.calendarGrid}>
        {Array.from({ length: firstDay }, (_, i) => (
          <View key={`empty-${i}`} style={[styles.calendarDayCell, styles.calendarDay]} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const thisDate = new Date(selectedYear, selectedMonth, day);
          const isFuture = thisDate > today;
          const isSelected = selectedDay === day && !isFuture;
          return (
            <TouchableOpacity
              key={`day-${day}`}
              testID={`day-${day}`}
              disabled={isFuture}
              style={[
                styles.calendarDayCell,
                styles.calendarDay,
                styles.calendarDayButton,
                isSelected && styles.calendarDaySelected,
                isFuture && styles.calendarDayDisabled,
              ]}
              onPress={() => !isFuture && handleDaySelect(day)}
            >
              <Text
                style={[
                  styles.calendarDayText,
                  isSelected && styles.calendarDayTextSelected,
                  isFuture && styles.calendarDayTextDisabled,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderDatePickerModal = () => (
    <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.datePickerContainer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={styles.datePickerHeader}>
            <TouchableOpacity onPress={() => setShowDatePicker(false)} testID="close-date-picker">
              <Text style={styles.skipText}>{t('Close')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.datePickerTitle}>{t('Birthday')}</Text>
          <View style={styles.monthYearContainer}>
            <TouchableOpacity onPress={handlePreviousMonth} style={styles.monthNavButton} testID="prev-month">
              <ChevronLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.monthYearDisplay}>
              <View style={styles.yearRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  testID="year-minus-10"
                  onPress={() => {
                    const next = selectedYear - 10;
                    setSelectedYear(next);
                    setTypedYear(String(next));
                  }}
                  style={styles.yearMiniBtn}
                >
                  <Minus size={16} color={colors.primary} />
                  <Text style={styles.yearMiniBtnText}>10</Text>
                </TouchableOpacity>
                <TextInput
                  testID="year-input"
                  style={styles.yearInput}
                  value={typedYear}
                  onChangeText={(text) => {
                    const normalized = text.replace(/[^0-9]/g, '');
                    const limited = normalized.slice(0, 4);
                    setTypedYear(limited);
                    const parsed = parseInt(limited, 10);
                    if (!Number.isNaN(parsed)) setSelectedYear(parsed);
                  }}
                  keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
                  maxLength={4}
                  placeholder="YYYY"
                  placeholderTextColor={colors.text.light}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  testID="year-plus-10"
                  onPress={() => {
                    const next = selectedYear + 10;
                    const yearToday = new Date().getFullYear();
                    const clamped = Math.min(next, yearToday);
                    setSelectedYear(clamped);
                    setTypedYear(String(clamped));
                  }}
                  style={styles.yearMiniBtn}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text style={styles.yearMiniBtnText}>10</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.monthText}>{t(MONTHS[selectedMonth]) ?? MONTHS[selectedMonth]}</Text>
            </View>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavButton} testID="next-month">
              <ChevronRight size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.monthsGrid}>
            {MONTHS.map((m: string, idx: number) => (
              <TouchableOpacity key={m} testID={`month-${idx}`} onPress={() => setSelectedMonth(idx)} style={[styles.monthChip, selectedMonth === idx && styles.monthChipActive]}>
                <Text style={[styles.monthChipText, selectedMonth === idx && styles.monthChipTextActive]}>{m.slice(0,3)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.weekDaysContainer}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <Text key={i} style={styles.weekDayText}>{d}</Text>
            ))}
          </View>
          <CalendarGrid />
          <GradientButton title={t('Save')} onPress={handleSaveDate} style={[styles.saveButton, !selectedDay && styles.saveButtonDisabled]} disabled={!selectedDay} testID="save-date" />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {currentStep === 'details' && renderProfileDetails()}
      {currentStep === 'gender' && renderGenderSelection()}
      {currentStep === 'extras' && renderExtras()}
      {currentStep === 'interests' && renderInterestSelection()}
      {renderDatePickerModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 24 },
  scrollContainer: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 32 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
  skipText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.text.primary, marginBottom: 32 },
  subtitle: { fontSize: 16, color: colors.text.secondary, marginBottom: 32, lineHeight: 24 },
  profileImageContainer: { alignItems: 'center', marginBottom: 40 },
  profileImagePlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  profileImage: { width: 120, height: 120 },
  cameraIcon: { position: 'absolute', bottom: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  inputContainer: { marginBottom: 24 },
  inputLabel: { fontSize: 14, color: colors.text.secondary, marginBottom: 8 },
  textInput: { height: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: colors.text.primary, backgroundColor: colors.background },
  birthdayButton: { flexDirection: 'row', alignItems: 'center', height: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, backgroundColor: colors.backgroundSecondary, marginBottom: 40 },
  birthdayButtonText: { fontSize: 16, color: colors.primary, marginLeft: 12, fontWeight: '500' },
  genderContainer: { flex: 1, paddingTop: 40 },
  genderOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 64, borderWidth: 2, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 24, marginBottom: 16, backgroundColor: colors.background },
  genderOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderOptionText: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  genderOptionTextSelected: { color: colors.text.white },
  categoryContainer: { marginBottom: 32 },
  categoryTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary, marginBottom: 16 },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  interestTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 8 },
  interestTagSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  interestIcon: { fontSize: 16, marginRight: 8 },
  interestText: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  interestTextSelected: { color: colors.text.white },
  bottomContainer: { paddingBottom: 16 },
  bottomContainerFixed: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  confirmButton: { marginTop: 16 },
  bottomSpacing: { height: 120 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text.primary, fontWeight: '600' },
  chipTextActive: { color: colors.text.white },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  datePickerContainer: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, minHeight: 500 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 20 },
  datePickerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary, textAlign: 'center', marginBottom: 32 },
  monthYearContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingHorizontal: 20 },
  monthNavButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  monthYearDisplay: { alignItems: 'center' },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  yearMiniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
  yearMiniBtnText: { color: colors.primary, fontWeight: '700' },
  yearInput: { fontSize: 28, fontWeight: '700', color: colors.primary, textAlign: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, minWidth: 110, backgroundColor: colors.background },
  monthText: { fontSize: 18, fontWeight: '600', color: colors.primary },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 },
  monthChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border, marginBottom: 6, minWidth: 48, alignItems: 'center' },
  monthChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthChipText: { color: colors.text.primary, fontWeight: '600' },
  monthChipTextActive: { color: colors.text.white, fontWeight: '700' },
  weekDaysContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 8 },
  weekDayText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary, width: '14.2857%', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 32, paddingHorizontal: 8 },
  calendarDayCell: { width: '14.2857%' },
  calendarDay: { height: 44, marginBottom: 8 },
  calendarDayButton: { justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
  calendarDaySelected: { backgroundColor: colors.primary },
  calendarDayDisabled: { opacity: 0.35 },
  calendarDayText: { fontSize: 16, fontWeight: '500', color: colors.text.primary },
  calendarDayTextSelected: { color: colors.text.white, fontWeight: 'bold' },
  calendarDayTextDisabled: { color: colors.text.secondary },
  saveButton: { marginTop: 16 },
  saveButtonDisabled: { opacity: 0.5 },
});