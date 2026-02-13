import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeGoBack } from '@/lib/navigation';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';
import { useApp } from '@/hooks/app-context';
import { useMembership } from '@/hooks/membership-context';
import { ThemeId } from '@/types';
import { ChevronLeft, X, Camera, ImagePlus, Globe, EyeOff, Lock, Check, Ruler, GraduationCap, MapPin, Instagram, User, Palette, Heart, Shield } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { categorizedInterests, InterestCategory, Interest } from '@/mocks/interests';
import { LinearGradient } from 'expo-linear-gradient';
import GradientButton from '@/components/GradientButton';

export default function ProfileSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [instagram, setInstagram] = useState<string>(currentProfile?.instagram ?? '');
  const scrollY = useRef(new Animated.Value(0)).current;

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (e) {
      console.log('[ProfileSettings] pick error', e);
    }
  };

  const removePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleInterest = (interest: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (e) {
      console.log('[ProfileSettings] capture error', e);
    }
  };

  const handleSave = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextAge = Number(age) || currentProfile?.age || 0;
    if (nextAge < 18) {
      Alert.alert(t('Age restriction'), t('You must be at least 18 years old.'));
      return;
    }
    const ig = instagram.trim() || undefined;
    await updateProfile({
      name,
      age: nextAge,
      photos,
      bio,
      interests,
      instagram: ig,
      privacy: { visibility: privacy, hideOnlineStatus: hideOnline, incognito },
      location: { ...(currentProfile?.location ?? { city: '' }), city },
      heightCm: Number(heightCm) || undefined,
      education: education || undefined,
    });
    await setFilters({ ...filters, distanceKm: radius });
    Alert.alert(t('Applied'), t('Profile updated successfully!'));
    safeGoBack(router, '/(tabs)/profile');
  }, [name, age, photos, bio, interests, instagram, privacy, hideOnline, incognito, city, heightCm, education, radius, currentProfile, filters, updateProfile, setFilters, router, t]);

  if (!currentProfile) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>{t('Create profile first')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF2D55', '#FF6B8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerBg, { paddingTop: insets.top }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity testID="btn-back" onPress={() => safeGoBack(router, '/(tabs)/profile')} style={styles.headerBtn}>
            <ChevronLeft size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Edit Profile')}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn}>
            <Text style={styles.saveHeaderText}>{t('Save')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <Image
              source={{ uri: (photos[0] ?? currentProfile.photos?.[0] ?? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400') }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.avatarEditBtn} onPress={addPhoto}>
              <Camera size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{name || currentProfile.name || 'Your Name'}</Text>
            <Text style={styles.profileLocation} numberOfLines={1}>{city || currentProfile.location?.city || 'Add location'}</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{tier?.toUpperCase?.() ?? 'FREE'}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}
        testID="scroll-profile-settings"
      >
        <SectionCard icon={<User size={18} color="#FF2D55" />} title={t('Basic Info')}>
          <InputField label={t('Your name')} value={name} onChangeText={setName} testID="input-name" autoCapitalize="words" />
          <View style={styles.row}>
            <View style={styles.halfField}>
              <InputField label={t('Age')} value={age} onChangeText={setAge} testID="input-age" keyboardType="numeric" />
            </View>
            <View style={styles.halfField}>
              <InputField label={t('Height (cm)')} value={heightCm} onChangeText={(txt) => setHeightCm(txt.replace(/[^0-9]/g, ''))} testID="input-height" keyboardType="numeric" icon={<Ruler size={16} color={Colors.text.light} />} />
            </View>
          </View>
          <InputField label={t('Education')} value={education} onChangeText={setEducation} testID="input-education" icon={<GraduationCap size={16} color={Colors.text.light} />} />
          <InputField
            label={t('Instagram')}
            value={instagram}
            onChangeText={(val) => {
              const cleaned = String(val ?? '').replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, '').replace(/^@+/, '').trim();
              setInstagram(cleaned);
            }}
            testID="input-instagram"
            autoCapitalize="none"
            icon={<Instagram size={16} color={Colors.text.light} />}
          />
        </SectionCard>

        <SectionCard icon={<Camera size={18} color="#FF9500" />} title={t('Photos')}>
          <Text style={styles.sectionHint}>{t('Add up to 6 photos to showcase yourself')}</Text>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoActionBtn} onPress={capturePhoto}>
              <Camera size={18} color="#FF2D55" />
              <Text style={styles.photoActionText}>{t('Camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoActionBtn} onPress={addPhoto}>
              <ImagePlus size={18} color="#FF2D55" />
              <Text style={styles.photoActionText}>{t('Gallery')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.photoGrid}>
            {Array.from({ length: 6 }).map((_, index) => {
              const photo = photos[index];
              return (
                <View key={index} style={styles.photoSlot}>
                  {photo ? (
                    <>
                      <Image source={{ uri: photo }} style={styles.photo} />
                      <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(index)}>
                        <X size={12} color="#FFF" />
                      </TouchableOpacity>
                      {index === 0 && (
                        <View style={styles.mainPhotoBadge}>
                          <Text style={styles.mainPhotoText}>Main</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity style={styles.emptyPhoto} onPress={addPhoto} disabled={index > photos.length}>
                      {index === photos.length ? (
                        <ImagePlus size={22} color={Colors.text.light} />
                      ) : (
                        <View style={styles.emptyDot} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard icon={<Heart size={18} color="#5856D6" />} title={t('About Me')}>
          <View style={styles.bioContainer}>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder={t('Tell others about yourself...')}
              placeholderTextColor={Colors.text.light}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </View>
        </SectionCard>

        <SectionCard icon={<Palette size={18} color="#FF9500" />} title={t('Profile Theme')}>
          <Text style={styles.sectionHint}>{t('Customize your info panel look')}</Text>
          <View style={styles.themesRow}>
            {(['midnight', 'sunset', 'geometric'] as ThemeId[]).map((th) => {
              const owned = (currentProfile?.ownedThemes ?? []).includes(th);
              const isSelected = (currentProfile?.profileTheme ?? null) === th;
              const themeLabel = th === 'midnight' ? 'Midnight' : th === 'sunset' ? 'Sunset' : 'Geometric';
              return (
                <TouchableOpacity
                  key={th}
                  style={[styles.themeCard, isSelected && styles.themeCardActive]}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (!owned) { Alert.alert(t('Upgrade needed'), 'Buy this theme in the Store.'); return; }
                    await updateProfile({ profileTheme: th });
                  }}
                  testID={`theme-option-${th}`}
                >
                  <View style={[styles.themePreview, th === 'midnight' && styles.midnightPrev, th === 'sunset' && styles.sunsetPrev, th === 'geometric' && styles.geoPrev]}>
                    {isSelected && <Check size={18} color="#FFF" />}
                    {!owned && <Lock size={16} color="rgba(255,255,255,0.7)" />}
                  </View>
                  <Text style={[styles.themeLabel, isSelected && styles.themeLabelActive]}>{themeLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard icon={<Palette size={18} color="#34C759" />} title={t('Interests')}>
          <Text style={styles.sectionHint}>{t('Select your interests to find better matches')}</Text>
          {categorizedInterests.map((category: InterestCategory) => (
            <View key={category.name} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <View style={styles.interestsGrid}>
                {category.interests.map((interest: Interest) => {
                  const selected = interests.includes(interest.name);
                  return (
                    <TouchableOpacity
                      key={`${category.name}-${interest.name}`}
                      style={[styles.interestChip, selected && styles.interestChipSelected]}
                      onPress={() => toggleInterest(interest.name)}
                      testID={`interest-${interest.name}`}
                    >
                      <Text style={styles.interestEmoji}>{interest.icon}</Text>
                      <Text style={[styles.interestName, selected && styles.interestNameSelected]}>{interest.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </SectionCard>

        <SectionCard icon={<MapPin size={18} color="#007AFF" />} title={t('Location & Distance')}>
          <InputField label={t('City, Country')} value={city} onChangeText={setCity} testID="input-location" icon={<MapPin size={16} color={Colors.text.light} />} />
          <Text style={styles.radiusLabel}>{t('Search radius')} {!canAdvanced && <Text style={styles.premiumTag}>(Gold+)</Text>}</Text>
          <View style={styles.radiusRow}>
            <TouchableOpacity
              style={[styles.radiusBtn, !canAdvanced && styles.radiusBtnDisabled]}
              onPress={() => { if (canAdvanced) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRadius(Math.max(1, radius - 5)); } }}
              disabled={!canAdvanced}
            >
              <Text style={styles.radiusBtnText}>-5</Text>
            </TouchableOpacity>
            <View style={styles.radiusDisplay}>
              <Text style={styles.radiusValue}>{radius}</Text>
              <Text style={styles.radiusUnit}>km</Text>
            </View>
            <TouchableOpacity
              style={[styles.radiusBtn, !canAdvanced && styles.radiusBtnDisabled]}
              onPress={() => { if (canAdvanced) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRadius(Math.min(100, radius + 5)); } }}
              disabled={!canAdvanced}
            >
              <Text style={styles.radiusBtnText}>+5</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        <SectionCard icon={<Shield size={18} color="#FF3B30" />} title={t('Privacy')}>
          <Text style={styles.privacyLabel}>{t('Profile Visibility')}</Text>
          <View style={styles.privacyOptions}>
            {([
              { value: 'everyone' as const, label: 'Everyone', icon: <Globe size={16} color={privacy === 'everyone' ? '#FFF' : Colors.text.primary} /> },
              { value: 'matches' as const, label: 'Matches', icon: <Lock size={16} color={privacy === 'matches' ? '#FFF' : Colors.text.primary} /> },
              { value: 'nobody' as const, label: 'Nobody', icon: <EyeOff size={16} color={privacy === 'nobody' ? '#FFF' : Colors.text.primary} /> },
            ]).map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.privacyChip, privacy === opt.value && styles.privacyChipActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPrivacy(opt.value); }}
              >
                {opt.icon}
                <Text style={[styles.privacyChipText, privacy === opt.value && styles.privacyChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ToggleRow label={t('Hide online status')} value={hideOnline} onToggle={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHideOnline(!hideOnline); }} />
          <ToggleRow label={t('Incognito mode (VIP)')} value={incognito} onToggle={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIncognito(!incognito); }} />
        </SectionCard>
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} testID="save-bar">
        <GradientButton title={t('Save Changes')} onPress={handleSave} style={styles.saveBtn} />
      </View>
    </View>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.card}>
      <View style={sectionStyles.headerRow}>
        <View style={sectionStyles.iconWrap}>{icon}</View>
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InputField({ label, value, onChangeText, testID, autoCapitalize, keyboardType, icon }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  testID?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'default' | 'numeric';
  icon?: React.ReactNode;
}) {
  return (
    <View style={inputStyles.container}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={inputStyles.inputRow}>
        {icon && <View style={inputStyles.iconWrap}>{icon}</View>}
        <TextInput
          style={[inputStyles.input, icon ? inputStyles.inputWithIcon : undefined]}
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor={Colors.text.light}
          autoCapitalize={autoCapitalize}
          inputMode={keyboardType === 'numeric' ? 'numeric' : 'text'}
          testID={testID}
        />
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={toggleStyles.row}>
      <Text style={toggleStyles.label}>{label}</Text>
      <TouchableOpacity onPress={onToggle} style={[toggleStyles.track, value && toggleStyles.trackOn]}>
        <View style={[toggleStyles.thumb, value && toggleStyles.thumbOn]} />
      </TouchableOpacity>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF1F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
});

const inputStyles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    position: 'relative',
  },
  iconWrap: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.text.primary,
    backgroundColor: '#FAFAFA',
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
});

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  label: {
    fontSize: 15,
    color: Colors.text.primary,
    flex: 1,
  },
  track: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    padding: 3,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: '#FF2D55',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  thumbOn: {
    transform: [{ translateX: 20 }],
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FA',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8FA',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  headerBg: {
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  saveHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
  },
  saveHeaderText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  avatarSection: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  profileLocation: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  scrollContent: {
    flex: 1,
    marginTop: -12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFF1F3',
    borderWidth: 1,
    borderColor: '#FFE1EA',
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FF2D55',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoSlot: {
    width: '30%',
    aspectRatio: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mainPhotoText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  emptyPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  bioContainer: {
    position: 'relative',
  },
  bioInput: {
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    backgroundColor: '#FAFAFA',
    minHeight: 100,
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 11,
    color: Colors.text.light,
  },
  themesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  themeCardActive: {
    borderColor: '#FF2D55',
  },
  themePreview: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  midnightPrev: {
    backgroundColor: '#0c1020',
  },
  sunsetPrev: {
    backgroundColor: '#ff7a59',
  },
  geoPrev: {
    backgroundColor: '#CBD5E1',
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
  },
  themeLabelActive: {
    color: '#FF2D55',
    fontWeight: '700' as const,
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 10,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  interestChipSelected: {
    backgroundColor: '#FF2D55',
    borderColor: '#FF2D55',
  },
  interestEmoji: {
    fontSize: 14,
    marginRight: 5,
  },
  interestName: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  interestNameSelected: {
    color: '#FFF',
    fontWeight: '600' as const,
  },
  radiusLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
    marginTop: 8,
  },
  premiumTag: {
    color: '#FF9500',
    fontWeight: '600' as const,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  radiusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  radiusBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  radiusDisplay: {
    alignItems: 'center',
  },
  radiusValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1A1A1A',
  },
  radiusUnit: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600' as const,
  },
  privacyLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 10,
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  privacyChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  privacyChipActive: {
    backgroundColor: '#FF2D55',
    borderColor: '#FF2D55',
  },
  privacyChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  privacyChipTextActive: {
    color: '#FFF',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  saveBtn: {
    marginBottom: 4,
  },
});
