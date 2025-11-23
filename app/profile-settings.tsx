import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, SafeAreaView, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';
import { useApp } from '@/hooks/app-context';
import { useMembership } from '@/hooks/membership-context';
import { ThemeId } from '@/types';
import { Plus, Lock, Globe, EyeOff, ArrowLeft, X, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { categorizedInterests, InterestCategory, Interest } from '../mocks/interests';
import GradientButton from '@/components/GradientButton';

export default function ProfileSettings() {
  const router = useRouter();
  const { currentProfile, updateProfile, filters, setFilters } = useApp();
  const { t } = useI18n();
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
  const [city, setCity] = useState<string>(currentProfile?.location?.city ?? '');
  const [heightCm, setHeightCm] = useState<string>(currentProfile?.heightCm ? String(currentProfile.heightCm) : '');
  const [education, setEducation] = useState<string>(currentProfile?.education ?? '');
  const ownedThemes = (currentProfile?.ownedThemes ?? []) as ThemeId[];
  const selectedTheme = (currentProfile?.profileTheme ?? null) as ThemeId | null;
  const [instagram, setInstagram] = useState<string>(currentProfile?.instagram ?? '');
  const scrollRef = useRef<ScrollView | null>(null);
  const [activeSeg, setActiveSeg] = useState<'basic' | 'photos' | 'about' | 'interests' | 'location' | 'privacy'>('basic');
  const sectionsYRef = useRef<Record<string, number>>({});
  const sectionsY = sectionsYRef.current;

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

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    try {
      const y: number = e?.nativeEvent?.contentOffset?.y ?? 0;
      const order: { key: typeof activeSeg; y: number }[] = [
        { key: 'basic' as typeof activeSeg, y: sectionsY['basic'] ?? 0 },
        { key: 'photos' as typeof activeSeg, y: sectionsY['photos'] ?? 0 },
        { key: 'about' as typeof activeSeg, y: sectionsY['about'] ?? 0 },
        { key: 'interests' as typeof activeSeg, y: sectionsY['interests'] ?? 0 },
        { key: 'location' as typeof activeSeg, y: sectionsY['location'] ?? 0 },
        { key: 'privacy' as typeof activeSeg, y: sectionsY['privacy'] ?? 0 },
      ].sort((a, b) => a.y - b.y);
      let current = 'basic' as typeof activeSeg;
      for (let i = 0; i < order.length; i++) {
        const next = order[i + 1];
        if (!next || y + 20 < next.y) { current = order[i].key; break; }
      }
      if (current !== activeSeg) setActiveSeg(current);
    } catch (err) {
      console.log('[ProfileSettings] onScroll parse error', err);
    }
  }, [activeSeg, sectionsY]);

  const scrollTo = useCallback((key: typeof activeSeg) => {
    const y = sectionsY[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
  }, [sectionsY]);

  if (!currentProfile) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>{t('Create profile first')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn-back" onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/profile' as any); } }} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Profile Settings')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        testID="scroll-profile-settings"
      >
        <View style={styles.profileHeaderCard} onLayout={(e) => { sectionsY['top'] = e.nativeEvent.layout.y; }}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: (currentProfile.photos?.[0] ?? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop') as string }}
              style={styles.avatar}
            />
            <View style={styles.tierPill}>
              <Text style={styles.tierPillText}>{tier?.toUpperCase?.() ?? 'FREE'}</Text>
            </View>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{name || currentProfile.name || t('Your Name')}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{city || currentProfile.location?.city || t('Add location')}</Text>
          </View>
        </View>

        <View style={styles.segmentBar} testID="segmented-control">
          {([
            { key: 'basic', label: t('Basic') },
            { key: 'photos', label: t('Photos') },
            { key: 'about', label: t('About') },
            { key: 'interests', label: t('Interests') },
            { key: 'location', label: t('Location') },
            { key: 'privacy', label: t('Privacy') },
          ] as { key: typeof activeSeg; label: string }[]).map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => scrollTo(tab.key as typeof activeSeg)}
              style={[styles.segmentItem, activeSeg === (tab.key as typeof activeSeg) && styles.segmentItemActive]}
              testID={`segment-${tab.key}`}
            >
              <Text style={[styles.segmentText, activeSeg === (tab.key as typeof activeSeg) && styles.segmentTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View onLayout={(e) => { sectionsY['basic'] = e.nativeEvent.layout.y; }} style={styles.cardSection} testID="section-basic">
          <Text style={styles.sectionTitle}>{t('Basic Info')}</Text>
          <View style={styles.rowInputs}>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder={t('Your name')}
              placeholderTextColor={Colors.text.secondary}
              autoCapitalize="words"
              testID="input-name"
            />
            <TextInput
              style={styles.textInput}
              value={age}
              onChangeText={setAge}
              inputMode="numeric"
              placeholder={t('Age')}
              placeholderTextColor={Colors.text.secondary}
              testID="input-age"
            />
          </View>
          <View style={[styles.rowInputs, { marginTop: 12 }]}> 
            <TextInput
              style={styles.textInput}
              value={city}
              onChangeText={setCity}
              placeholder={t('City, Country')}
              placeholderTextColor={Colors.text.secondary}
              autoCapitalize="words"
              testID="input-location"
            />
            <TextInput
              style={styles.textInput}
              value={heightCm}
              onChangeText={(txt) => setHeightCm(txt.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder={t('Height (cm) placeholder')}
              placeholderTextColor={Colors.text.secondary}
              testID="input-height"
            />
          </View>
          <View style={{ marginTop: 12 }}>
            <TextInput
              style={styles.textInput}
              value={education}
              onChangeText={setEducation}
              placeholder={t('Education (e.g., Bachelor in CS)')}
              placeholderTextColor={Colors.text.secondary}
              autoCapitalize="sentences"
              testID="input-education"
            />
          </View>
          <View style={{ marginTop: 12 }}>
            <TextInput
              style={styles.textInput}
              value={instagram}
              onChangeText={(val) => {
                const cleaned = String(val ?? '')
                  .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, '')
                  .replace(/^@+/, '')
                  .trim();
                setInstagram(cleaned);
              }}
              placeholder={t('Instagram username (optional)')}
              placeholderTextColor={Colors.text.secondary}
              autoCapitalize="none"
              autoCorrect={false}
              testID="input-instagram"
            />
          </View>
        </View>

        <View onLayout={(e) => { sectionsY['photos'] = e.nativeEvent.layout.y; }} style={styles.cardSection} testID="section-photos">
          <Text style={styles.sectionTitle}>{t('Photo Gallery')}</Text>
          <Text style={styles.sectionSubtitle}>{t('Add up to 6 photos to showcase yourself')}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <GradientButton title={t('Add from Camera')} onPress={capturePhoto} style={{ flex: 1 }} />
            <GradientButton title={t('Add from Gallery')} variant="secondary" onPress={addPhoto} style={{ flex: 1 }} />
          </View>
          <View style={{ height: 12 }} />
          {renderPhotoGrid()}
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>{t('Customize Profile')}</Text>
          <Text style={styles.sectionSubtitle}>{t('Choose a theme for your info panel. Purchased themes stay unlocked.')}</Text>
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
                    if (!owned) { Alert.alert(t('Upgrade needed'), 'Buy this theme in the Store (Premium page).'); return; }
                    await updateProfile({ profileTheme: th });
                    Alert.alert(t('Applied'), `${th === 'midnight' ? 'Midnight' : th === 'sunset' ? 'Sunset' : 'Geometric'} applied to your info panel.`);
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
              <Text style={styles.themeLabel}>{t('None')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View onLayout={(e) => { sectionsY['about'] = e.nativeEvent.layout.y; }} style={styles.cardSection} testID="section-about">
          <Text style={styles.sectionTitle}>{t('About Me')}</Text>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            placeholder={t('Tell others about yourself...')}
            placeholderTextColor={Colors.text.secondary}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{bio.length}/500</Text>
        </View>

        <View onLayout={(e) => { sectionsY['interests'] = e.nativeEvent.layout.y; }} style={styles.cardSection} testID="section-interests">
          <Text style={styles.sectionTitle}>{t('InterestsTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('Select your interests to find better matches')}</Text>
          {categorizedInterests.map((category: InterestCategory) => (
            <View key={category.name} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <View style={styles.interestsGrid}>
                {category.interests.map((interest: Interest) => (
                  <TouchableOpacity
                    key={`${category.name}-${interest.name}`}
                    style={[
                      styles.interestTag,
                      interests.includes(interest.name) && styles.interestTagSelected,
                    ]}
                    onPress={() => toggleInterest(interest.name)}
                    testID={`interest-${interest.name}`}
                  >
                    <Text style={styles.interestIcon}>{interest.icon}</Text>
                    <Text
                      style={[
                        styles.interestText,
                        interests.includes(interest.name) && styles.interestTextSelected,
                      ]}
                    >
                      {interest.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View onLayout={(e) => { sectionsY['location'] = e.nativeEvent.layout.y; }} style={styles.cardSection} testID="section-location">
          <Text style={styles.sectionTitle}>{t('Location & Distance')}</Text>
          <Text style={styles.label}>{t('Search radius')} {canAdvanced ? '' : '(Gold+ feature)'}</Text>
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

        <View onLayout={(e) => { sectionsY['privacy'] = e.nativeEvent.layout.y; }} style={styles.cardSection} testID="section-privacy">
          <Text style={styles.sectionTitle}>{t('Privacy settings')}</Text>
          
          <Text style={styles.label}>{t('Profile Visibility')}</Text>
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
            <Text style={styles.toggleLabel}>{t('Hide online status')}</Text>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity onPress={() => setIncognito(!incognito)} style={[styles.toggle, incognito && styles.toggleOn]}>
              <View style={[styles.knob, incognito && styles.knobOn]} />
            </TouchableOpacity>
            <Text style={styles.toggleLabel}>{t('Incognito mode (VIP feature)')}</Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <View style={styles.footer} testID="save-bar">
        <GradientButton
          title={t('Save Changes')}
          onPress={async () => {
            const nextAge = Number(age) || currentProfile.age || 0;
            if (nextAge < 18) { Alert.alert(t('Age restriction'), t('You must be at least 18 years old.')); return; }
            const ig = instagram.trim() || undefined;
            await updateProfile({ name, age: nextAge, photos, bio, interests, instagram: ig, privacy: { visibility: privacy, hideOnlineStatus: hideOnline, incognito }, location: { ...(currentProfile.location ?? { city: '' }), city }, heightCm: Number(heightCm) || undefined, education: education || undefined });
            await setFilters({ ...filters, distanceKm: radius });
            Alert.alert(t('Applied'), t('Profile updated successfully!'));
            if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/profile' as any); }
          }}
          style={styles.saveButton}
        />
      </View>
    </SafeAreaView>
  );

  function renderPhotoGrid() {
    return (
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
  }
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
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.white,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cameraOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  profileHeaderCard: {
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.backgroundSecondary },
  tierPill: { position: 'absolute', bottom: -6, right: -6, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  tierPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  headerInfo: { marginLeft: 12, flex: 1 },
  headerName: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  headerSub: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },

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
  textInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, height: 48, color: Colors.text.primary, backgroundColor: Colors.background },
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
    height: 120,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'web' ? 20 : 34,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  saveButton: {
    marginTop: 8,
  },
  cardSection: {
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingVertical: 10,
    gap: 8,
  },
  segmentItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  segmentItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentText: { color: Colors.text.primary, fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: '#fff' },
});
