import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type LanguageCode = 'en' | 'am';

type Dictionary = Record<LanguageCode, Record<string, string>>;

const DICT: Dictionary = {
  en: {
    Discover: 'Discover',
    Likes: 'Likes',
    Messages: 'Messages',
    Profile: 'Profile',
    Settings: 'Settings',
    Account: 'Account',
    'Edit profile': 'Edit profile',
    Privacy: 'Privacy',
    'Privacy settings': 'Privacy settings',
    Notifications: 'Notifications',
    'Manage notifications': 'Manage notifications',
    Subscription: 'Subscription',
    'Upgrade to Premium': 'Upgrade to Premium',
    App: 'App',
    Language: 'Language',
    'Language updated': 'Language updated',
    'The app will use your selected language. Some screens may refresh.': 'The app will use your selected language. Some screens may refresh.',
    About: 'About',
    Interests: 'Interests',
    Like: 'Like',
    'Super Like': 'Super Like',
    Message: 'Message',
    Verified: 'Verified',
    'Profile not found': 'Profile not found',
    'Upgrade needed': 'Upgrade needed',
    'Out of views': 'Out of views',
    'See plans': 'See plans',
  },
  am: {
    Discover: 'ፈልግ',
    Likes: 'ወደድኩት',
    Messages: 'መልዕክቶች',
    Profile: 'መገለጫ',
    Settings: 'ማስተካከያ',
    Account: 'መለያ',
    'Edit profile': 'መገለጫ አርትዕ',
    Privacy: 'ግላዊነት',
    'Privacy settings': 'የግላዊነት ማስተካከያ',
    Notifications: 'ማሳወቂያዎች',
    'Manage notifications': 'ማሳወቂያ አስተዳድር',
    Subscription: 'ሰብስክሪፕሽን',
    'Upgrade to Premium': 'ወደ ፕሪሚየም አድስ',
    App: 'መተግበሪያ',
    Language: 'ቋንቋ',
    'Language updated': 'ቋንቋ ተቀይሯል',
    'The app will use your selected language. Some screens may refresh.': 'መተግበሪያው የተመረጠውን ቋንቋ ይጠቀማል። አንዳንድ ገጾች ሊያዘምኑ ይችላሉ።',
    About: 'ስለ እኔ',
    Interests: 'ፍላጎቶች',
    Like: 'እወዳለሁ',
    'Super Like': 'ሱፐር ላይክ',
    Message: 'መልዕክት',
    Verified: 'የተረጋገጠ',
    'Profile not found': 'መገለጫ አልተገኘም',
    'Upgrade needed': 'አዘምን ያስፈልጋል',
    'Out of views': 'ተመልከቶች አልተቀሩም',
    'See plans': 'ዕቅዶችን እይ',
  },
};

interface I18nContextType {
  lang: LanguageCode;
  t: (key: string) => string;
  setLanguage: (code: LanguageCode) => Promise<void>;
}

export const [I18nProvider, useI18n] = createContextHook<I18nContextType>(() => {
  const [lang, setLang] = useState<LanguageCode>('en');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('app_language');
        const parsed = (stored as LanguageCode) || 'en';
        setLang(parsed);
      } catch (e) {
        console.log('[i18n] load error');
      }
    })();
  }, []);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    await AsyncStorage.setItem('app_language', code);
    setLang(code);
  }, []);

  const t = useCallback(
    (key: string) => {
      const pack = DICT[lang];
      return (pack && pack[key]) ?? key;
    },
    [lang]
  );

  return useMemo(() => ({ lang, t, setLanguage }), [lang, t, setLanguage]);
});