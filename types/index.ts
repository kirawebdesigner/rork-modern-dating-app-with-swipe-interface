export type Gender = 'boy' | 'girl';

export interface PrivacySettings {
  visibility: 'everyone' | 'matches' | 'nobody';
  hideOnlineStatus: boolean;
  incognito: boolean;
}

export type ThemeId = 'midnight' | 'sunset' | 'geometric';

export interface User {
  id: string;
  name: string;
  age: number;
  birthday?: Date;
  gender: Gender;
  interestedIn?: Gender;
  bio: string;
  photos: string[];
  interests: string[];
  location: {
    city: string;
    distance?: number;
    latitude?: number;
    longitude?: number;
  };
  heightCm?: number;
  education?: string;
  instagram?: string;
  verified?: boolean;
  isPremium?: boolean;
  lastActive?: Date;
  privacy?: PrivacySettings;
  credits?: UserCredits;
  membershipTier?: MembershipTier;
  ownedThemes?: ThemeId[];
  profileTheme?: ThemeId | null;
  completed?: boolean;
}

export interface Match {
  id: string;
  user: User;
  matchedAt: Date;
  hasNewMessage?: boolean;
  lastMessage?: Message;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

export interface SwipeAction {
  userId: string;
  action: 'like' | 'nope' | 'superlike';
  timestamp: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profile?: User;
}

export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: string;
}

export type MembershipTier = 'free' | 'silver' | 'gold' | 'vip';

export interface MembershipFeatures {
  dailyMessages: number;
  dailyCompliments: number;
  dailyRightSwipes: number | 'unlimited';
  profileViews: number | 'unlimited';
  advancedFilters: boolean;
  priorityMatching: boolean;
  seeWhoLikedYou: boolean;
  incognitoMode: boolean;
  profileBoost: boolean;
  rewind: boolean;
  travelMode: boolean;
  hideLocation: boolean;
}

export interface MonthlyAllowances {
  monthlyBoosts: number;
  monthlySuperLikes: number;
}

export interface UserCredits {
  messages: number;
  boosts: number;
  superLikes: number;
  compliments: number;
  unlocks: number;
}