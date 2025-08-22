import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/hooks/app-context';
import { useMembership } from '@/hooks/membership-context';
import { ThemeId } from '@/types';
import { Plus, Lock, Globe, EyeOff, ArrowLeft, X, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { categorizedInterests } from '@/mocks/interests';
import GradientButton from '@/components/GradientButton';

export default function ProfileSettings() {
  const router = useRouter();
  const { currentProfile, updateProfile, filters, setFilters } = useApp();
  const { tier } = useMembership();
  const [bio, setBio] = useState<string>(currentProfile?.bio ?? '');
  const [photos, setPhotos] = useState<string[]>(currentProfile?.photos ?? []);
  const [interests, setInterests] = useState<string[]>(currentProfile?.interests ?? []);
  const [radius, setRadius] = useState<number>(filters.distanceKm);
  const [privacy, setPrivacy] = useState<'everyone' | 'matches' | 'nobody'>(currentProfile?.privacy?.visibility ?? 'everyone');
  const [hideOnline, setHideOnline] = useState<boolean>(currentProfile?.privacy?.hideOnlineStatus ?? false);
  const [incognito, setIncognito] = useState<boolean>(currentProfile?.privacy?.incognito ?? false);
  const [name, setName] = useState<string>(currentProfile?.name ?? '');
  const [age, setAge] = useState<string>(currentProfile?.age ? String(currentProfile.age) : '');
  const ownedThemes = (currentProfile?.ownedThemes ?? []) as ThemeId[];
  const selectedTheme = (currentProfile?.profileTheme ?? null) as ThemeId | null;

  const canAdvanced = useMemo(() => tier === 'gold' || tier === 'vip', [tier]);

  const addPhoto = async () => {
    if (photos.length >= 6) {
      Alert.alert('Limit reached', 'You can only add up to 6 photos');
      return;
    }

    try {
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!res.granted) {
        Alert.alert('Permission required', 'Photo library access is needed.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ 
        allowsEditing: true, 
        aspect: [1, 1],
        quality: 0.8, 
        mediaTypes: ImagePicker.MediaTypeOptions.Images 
      });
      if (!result.canceled && result.assets[0]) {
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (e) {
      console.log('[ProfileSettings] pick error', e);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const capturePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Camera access is needed.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (e) {
      console.log('[ProfileSettings] capture error', e);
    }
  };

  const save = async () => {
    try {
      await updateProfile({ bio, photos, interests, privacy: { visibility: privacy, hideOnlineStatus: hideOnline, incognito } });
      await setFilters({ ...filters, distanceKm: radius });
      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const renderPhotoGrid = () => (
    <View style={styles.photoGrid}>
      {Array.from({ length: 6 }).map((_, index) => {
        const photo = photos[index];
        return (
          <View key={index} style={styles.photoSlot}>
            {photo ? (
              <>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <X size={16} color={Colors.text.white} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.addPhoto}
                onPress={addPhoto}
                disabled={index > photos.length}
              >
                {index === photos.length ? (
                  <>
                    <Camera size={24} color={Colors.text.secondary} />
                    <Text style={styles.addPhotoText}>Add Photo</Text>
                  </>
                ) : (
                  <Plus size={24} color={Colors.text.light} />
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderInterestTag = (interest: string, icon: string) => (
    <TouchableOpacity
      key={interest}
      style={[
        styles.interestTag,
        interests.includes(interest) && styles.interestTagSelected
      ]}
      onPress={() => toggleInterest(interest)}
    >
      <Text style={styles.interestIcon}>{icon}</Text>
      <Text style={[
        styles.interestText,
        interests.includes(interest) && styles.interestTextSelected
      ]}>
        {interest}
      </Text>
    </TouchableOpacity>
  );

  if (!currentProfile) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Create profile first</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/profile' as any); } }} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={styles.placeholder} />
      </View>

      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <View style={styles.rowInputs}>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.text.secondary}
            />
            <TextInput
              style={styles.textInput}
              value={age}
              onChangeText={setAge}
              inputMode="numeric"
              placeholder="Age"
              placeholderTextColor={Colors.text.secondary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Gallery</Text>
          <Text style={styles.sectionSubtitle}>Add up to 6 photos to showcase yourself</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <GradientButton title="Add from Camera" onPress={capturePhoto} style={{ flex: 1 }} />
            <GradientButton title="Add from Gallery" variant="secondary" onPress={addPhoto} style={{ flex: 1 }} />
          </View>
          <View style={{ height: 12 }} />
          {renderPhotoGrid()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customize Profile</Text>
          <Text style={styles.sectionSubtitle}>Choose a theme for your info panel. Purchased themes stay unlocked.</Text>
          <View style={styles.themesRow}>
            {(['midnight','sunset','geometric'] as ThemeId[]).map((th) => {
              const owned = ownedThemes.includes(th);
              const isSelected = selectedTheme === th;
              return (
                <TouchableOpacity
                  key={th}
                  style={[styles.themeCard, isSelected && styles.themeCardActive, !owned && styles.themeCardLocked]}
                  onPress={async () => {
                    console.log('[ProfileSettings] theme press', { th, owned });
                    if (!owned) { Alert.alert('Theme locked', 'Buy this theme in the Store (Premium page).'); return; }
                    await updateProfile({ profileTheme: th });
                    Alert.alert('Applied', `${th === 'midnight' ? 'Midnight' : th === 'sunset' ? 'Sunset' : 'Geometric'} applied to your info panel.`);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: !owned }}
                  testID={`theme-option-${th}`}
                >
                  <View style={[styles.themePreview, th === 'geometric' ? styles.geoPreview : th === 'midnight' ? styles.midnightPreview : styles.sunsetPreview]} />
                  <Text style={styles.themeLabel}>
                    {th === 'midnight' ? 'Midnight' : th === 'sunset' ? 'Sunset' : 'Geometric'} {owned ? '' : '🔒'}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity 
              style={[styles.themeCard, selectedTheme == null && styles.themeCardActive]}
              onPress={async () => { await updateProfile({ profileTheme: null }); Alert.alert('Removed', 'Theme cleared.'); }}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedTheme == null }}
              testID="theme-option-none"
            >
              <View style={[styles.themePreview, styles.nonePreview]} />
              <Text style={styles.themeLabel}>None</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself..."
            placeholderTextColor={Colors.text.secondary}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{bio.length}/500</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <Text style={styles.sectionSubtitle}>Select your interests to find better matches</Text>
          {categorizedInterests.map((category) => (
            <View key={category.name} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <View style={styles.interestsGrid}>
                {category.interests.map((interest) => 
                  renderInterestTag(interest.name, interest.icon)
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location & Distance</Text>
          <Text style={styles.label}>Search radius {canAdvanced ? '' : '(Gold+ feature)'}</Text>
          <View style={styles.radiusContainer}>
            <TouchableOpacity
              style={[styles.radiusButton, !canAdvanced && styles.disabled]}
              onPress={() => canAdvanced && setRadius(Math.max(1, radius - 5))}
              disabled={!canAdvanced}
            >
              <Text style={styles.radiusButtonText}>-5</Text>
            </TouchableOpacity>
            <Text style={styles.radiusValue}>{radius} km</Text>
            <TouchableOpacity
              style={[styles.radiusButton, !canAdvanced && styles.disabled]}
              onPress={() => canAdvanced && setRadius(Math.min(100, radius + 5))}
              disabled={!canAdvanced}
            >
              <Text style={styles.radiusButtonText}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          
          <Text style={styles.label}>Profile Visibility</Text>
          <View style={styles.privacyRow}>
            {(['everyone','matches','nobody'] as const).map(v => (
              <TouchableOpacity key={v} onPress={() => setPrivacy(v)} style={[styles.privacyChip, privacy === v && styles.privacyChipActive]}>
                {v === 'everyone' && <Globe size={16} color={privacy === 'everyone' ? '#fff' : Colors.text.primary} />}
                {v === 'matches' && <Lock size={16} color={privacy === 'matches' ? '#fff' : Colors.text.primary} />}
                {v === 'nobody' && <EyeOff size={16} color={privacy === 'nobody' ? '#fff' : Colors.text.primary} />}          
                <Text style={[styles.privacyText, privacy === v && styles.privacyTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity onPress={() => setHideOnline(!hideOnline)} style={[styles.toggle, hideOnline && styles.toggleOn]}>
              <View style={[styles.knob, hideOnline && styles.knobOn]} />
            </TouchableOpacity>
            <Text style={styles.toggleLabel}>Hide online status</Text>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity onPress={() => setIncognito(!incognito)} style={[styles.toggle, incognito && styles.toggleOn]}>
              <View style={[styles.knob, incognito && styles.knobOn]} />
            </TouchableOpacity>
            <Text style={styles.toggleLabel}>Incognito mode (VIP feature)</Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton
          title="Save Changes"
          onPress={async () => {
            await updateProfile({ name, age: Number(age) || currentProfile.age, photos, bio, interests, privacy: { visibility: privacy, hideOnlineStatus: hideOnline, incognito } });
            await setFilters({ ...filters, distanceKm: radius });
            Alert.alert('Success', 'Profile updated successfully!');
            if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/profile' as any); }
          }}
          style={styles.saveButton}
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
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
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
  headerTitle: {
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
  cameraOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  themesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: { width: '47%', borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, backgroundColor: Colors.backgroundSecondary },
  themeCardActive: { borderColor: Colors.primary },
  themePreview: { height: 60, borderRadius: 10, marginBottom: 8 },
  midnightPreview: { backgroundColor: '#0c1020' },
  sunsetPreview: { backgroundColor: '#ff7a59' },
  geoPreview: { backgroundColor: '#ECEFF3' },
  nonePreview: { backgroundColor: Colors.background },
  themeLabel: { color: Colors.text.primary, fontWeight: '600' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  textInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, height: 48, color: Colors.text.primary },
  themeCardLocked: { opacity: 0.6 },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text.primary, marginVertical: 16 },
  label: { fontSize: 14, color: Colors.text.secondary, marginBottom: 8, marginTop: 16 },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoSlot: {
    width: '30%',
    aspectRatio: 1,
    position: 'relative',
  },
  photo: { 
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  addPhoto: { 
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  addPhotoText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background,
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'right',
    marginTop: 8,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  interestTagSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  interestIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  interestText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  interestTextSelected: {
    color: Colors.text.white,
  },
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  radiusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusButtonText: {
    color: Colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  radiusValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginHorizontal: 20,
  },
  disabled: { opacity: 0.4 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  privacyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  privacyChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  privacyText: { color: Colors.text.primary },
  privacyTextActive: { color: '#fff', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: Colors.backgroundSecondary, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: Colors.primary },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.text.light, position: 'absolute', left: 2 },
  knobOn: { backgroundColor: '#fff', transform: [{ translateX: 22 }] },
  toggleLabel: { color: Colors.text.primary, flex: 1 },
  bottomSpacing: {
    height: 100,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  saveButton: {
    marginTop: 16,
  },
});