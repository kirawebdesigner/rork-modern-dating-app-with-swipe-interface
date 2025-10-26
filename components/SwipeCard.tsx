import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { MapPin, CheckCircle, Crown, Shield, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { User, ThemeId } from '@/types';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface SwipeCardProps {
  user: User;
  onPress?: () => void;
}

function TierBadge({ tier }: { tier?: User['membershipTier'] }) {
  if (!tier || tier === 'free') return null;
  let color: string = '#6B7280';
  let Content = Shield;
  if (tier === 'gold') {
    color = '#F59E0B';
    Content = Crown;
  } else if (tier === 'vip') {
    color = '#8B5CF6';
    Content = Star;
  }
  return (
    <View style={[styles.tierBadge, { borderColor: color }]}> 
      <Content size={14} color={color} />
      <Text style={[styles.tierBadgeText, { color }]}>{tier.toUpperCase()}</Text>
    </View>
  );
}

export default function SwipeCard({ user, onPress }: SwipeCardProps) {
  const topInterests = useMemo(() => (user.interests ?? []).slice(0, 3), [user.interests]);

  const theme = user.profileTheme as ThemeId | undefined;
  const renderThemeBackdrop = () => {
    if (!theme) return null;
    if (theme === 'geometric') {
      return (
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop' }}
          style={styles.themeImage}
          resizeMode="cover"
        />
      );
    }
    if (theme === 'midnight') {
      return (
        <LinearGradient
          colors={["rgba(12,16,32,0.95)", "rgba(12,16,32,0.6)"]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.themeGradient}
        />
      );
    }
    if (theme === 'sunset') {
      return (
        <LinearGradient
          colors={["rgba(255,94,58,0.95)", "rgba(255,149,0,0.7)"]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.themeGradient}
        />
      );
    }
    return null;
  };

  return (
    <View style={styles.card} testID="swipe-card">
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={!onPress} style={{ flex: 1 }}>
        <Image source={{ uri: user.photos[0] }} style={styles.image} />
      </TouchableOpacity>
      <TierBadge tier={user.membershipTier} />
      <LinearGradient
        colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.35)", "transparent"]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={styles.gradient}
      />
      <View style={styles.overlay}>
        <View style={styles.themeBackdrop}>
          {renderThemeBackdrop()}
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {user.name}, {user.age}
            </Text>
            {user.verified && (
              <CheckCircle size={20} color={Colors.info} style={styles.verifiedIcon} />
            )}
          </View>
          <View style={styles.locationRow}>
            <MapPin size={16} color={Colors.text.white} />
            <Text style={styles.location} numberOfLines={1}>
              {user.location.city}{user.location.distance ? ` • ${user.location.distance} miles away` : ''}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsRow}
            style={styles.tagsScroller}
            testID="tags-scroll"
          >
            {topInterests.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
          {Boolean(user.bio) && (
            <View style={styles.bioWrap} testID="bio-wrap">
              <Text style={styles.bio} numberOfLines={3}>
                {user.bio}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tierBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1.5,
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tierBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 90,
    paddingBottom: 96,
    paddingHorizontal: 20,
  },
  themeBackdrop: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    top: undefined as unknown as number,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  themeGradient: {
    ...Platform.select({ default: {}, web: {} }),
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  themeImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.22,
  },
  info: {
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  location: {
    fontSize: 14,
    color: Colors.text.white,
    opacity: 0.9,
  },
  tagsScroller: { marginTop: 6, maxHeight: 36 },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 10,
  },
  tagPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tagText: {
    color: Colors.text.white,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 140,
  },
  bioWrap: {
    marginTop: 8,
  },
  bio: {
    color: Colors.text.white,
    fontSize: 14,
    opacity: 0.95,
  },
});