import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type LanguageCode = 'en' | 'am';

type Dictionary = Record<LanguageCode, Record<string, string>>;

const EN_OVERRIDES: Record<string, string> = {
  'Height (cm) placeholder': 'Height (cm)',
  InterestsTitle: 'Interests',
};

const DICT: Dictionary = {
  en: EN_OVERRIDES,
  am: {
    Discover: 'ቍልጥ',
    Likes: 'ወደትቶት',
    Messages: 'መልዕክቶች',
    Profile: 'መገለጫ',
    Settings: 'ማስተካከያ',
    Account: 'መለያ',
    'Edit profile': 'መገለጫ አርትዕ',
    Privacy: 'ግላዊነት',
    'Privacy settings': 'የግላዊነት ማስተካከያ',
    Notifications: 'ማሳሰቢያዎች',
    'Manage notifications': 'ማሳሰቢያ አስተዳድር',
    'Growth': 'እድገት',
    'Share & Get Gold': 'አጋራ እና ጎልድ አግኝ',
    'Share via Email': 'በኢሜይል አጋራ',
    'Profile options': 'የመገለጫ አማራጮች',
    'Block user': 'ተጠቃሚን አግድ',
    'Blocked': 'ታግዷል',
    'has been blocked': 'ታግዷል',
    'Report user': 'ተጠቃሚ አመልክት',
    'Describe the issue (spam, fake, harassment, etc.)': 'ችግኑን ግለጹ (ስፓም፣ የተሳሳተ፣ ጭቆና፣ ወዘተ)',
    'Thank you': 'አመሰግናለሁ',
    'Your report has been submitted.': 'ሪፖርትዎ ተልኳል።',
    'Submit': 'አስገባ',
    'Send a Compliment': 'ማስተናገድ ላክ',
    'Write a short, kind message': 'አጭር በጎ መልዕክት ጻፍ',
    'Send': 'ላክ',
    'Sent': 'ተልኳል',
    'Limit reached': 'ገደብ ተደርሷል',
    'Free users can send 1 compliment/day. Upgrade to Gold for more.': 'ነፃ ተጠቃሚዎች በቀን 1 ማስተናገድ ብቻ ይልካሉ። ለተጨማሪ ወደ ጎልድ ይሻሻሉ።',
    'Account settings': 'የመለያ ማስተካከያ',
    Subscription: 'ሰብስክሪፕሽን',
    'Upgrade to Premium': 'ወደ ፕሪሚየም አሻሽል',
    App: 'መተግበሪያ',
    Language: 'ቋንቋ',
    'Language updated': 'ቋንቋ ተዘምኗል',
    'The app will use your selected language. Some screens may refresh.': 'መተግበሪያው የመረጡትን ቋንቋ ይጠቀማል። አንዳንድ ገጾች ሊታዩ ይችላሉ።',
    About: 'ስለ እኛ',
    Interests: 'ፍላጎቶች',
    Like: 'መውደድ',
    'Super Like': 'ሱፐር ላይክ',
    Message: 'መልዕክት',
    Verified: 'የተረጋገጠ',
    'Profile not found': 'መገለጫ አልተገኘም',
    'Upgrade needed': 'ማሻሻል ያስፈልጋል',
    'Out of views': 'እይታዎች አልቋሉ',
    'See plans': 'ዕቅዶችን ተመልከት',
    'Create Account': 'መለያ ፍጠር',
    'Sign up to start finding your perfect match': 'ለምቹ ጥሩ አጣጥፍ ለመጀመር ይመዝገቡ',
    Name: 'ስም',
    Email: 'ኢሜይል',
    Password: 'የይለፍ ቃል',
    'Sign Up': 'መመዝገብ',
    'Already have an account?': 'መለያ አለዎት?',
    'Sign In': 'ግባ',
    'Profile details': 'የመገለጫ ዝርዝሮች',
    'First name': 'ስም',
    'Last name': 'የአባት ስም',
    'Enter your first name': 'የመጀመሪያ ስምዎን ያስገቡ',
    'Enter your last name': 'የአባት ስምዎን ያስገቡ',
    Birthday: 'የልደት ቀን',
    Confirm: 'አረጋግጥ',
    Continue: 'ቀጥል',
    'I am a': 'እኔ',
    Girl: 'ልጃገረድ',
    Boy: 'ወንድ',
    'More about you': 'ስለ እርስዎ የበለጠ',
    Location: 'አካባቢ',
    'Height (cm)': 'ቁመት (ሴ.ሜ.)',
    Education: 'ትምህርት',
    'Your interests': 'ፍላጎቶችዎ',
    "Select a few of your interests and let everyone know what you're passionate about.": 'ጥቂት ፍላጎቶችዎን ይምረጡ እና ስለ ምን ይወዳሉ ያሳዩ።',
    Save: 'አስቀምጥ',
    'Age restriction': 'የእድሜ ገደብ',
    'You must be at least 18 years old.': 'ቢያንስ 18 ዓመት መሆን አለብዎት።',
    'Choose birthday date': 'የልደት ቀን ይምረጡ',
    'Permission required': 'ፍቃድ ያስፈልጋል',
    'We need access to your photos to set a profile picture.': 'የመገለጫ ፎቶ ለማቀናበር ወደ ፎቶዎችዎ መዳረሻ እንፈልጋለን።',
    Error: 'ስህተት',
    'Please enter your first name': 'የመጀመሪያ ስምዎን ያስገቡ',
    'Please select your gender': 'ፆታዎን ይምረጡ',
    'No more profiles!': 'ሌሎች መገለጫዎች የሉም!',
    'Check back later for more matches': 'ለተጨማሪ ማጣመር በኋላ ይመለሱ',
    'Be seen': 'ታይ',
    'Boost visibility': 'ታይነት ጨምር',
    'Free plan': 'ነፃ ዕቅድ',
    'swipes left today': 'ዛሬ የቀሩ ስዋይፖች',
    views: 'እይታዎች',
    'Tap to upgrade': 'ለማሻሻል ንኩ',
    'Upgrade Required': 'ማሻሻል ያስፈልጋል',
    "You're out of likes for today!": 'ዛሬ ላይኮችዎ አልቋሉ!',
    'Out of Super Likes': 'ሱፐር ላይኮች አልቋሉ',
    Cancel: 'ሰርዝ',
    'Get More': 'ተጨማሪ አግኝ',
    OK: 'እሺ',
    'Profile Settings': 'የመገለጫ ማስተካከያ',
    'Basic Info': 'መረጃ መሰረታዊ',
    'Your name': 'ስምዎ',
    Age: 'እድሜ',
    'City, Country': 'ከተማ, አገር',
    'Height (cm) placeholder': 'ቁመት (ሴ.ሜ.)',
    'Education (e.g., Bachelor in CS)': 'ትምህርት (ለምሳሌ፣ ባችለር በኮምፒውተር ሳይንስ)',
    'Photo Gallery': 'የፎቶ ማቅረቢያ',
    'Add up to 6 photos to showcase yourself': 'እስከ 6 ፎቶዎች ያክሉ',
    'Add from Camera': 'ከካሜራ ያክሉ',
    'Add from Gallery': 'ከጋለሪ ያክሉ',
    'Customize Profile': 'መገለጫ አቀራረብ አብጁ',
    'Choose a theme for your info panel. Purchased themes stay unlocked.': 'ለመረጃ ፓነሉ ገጽታ ይምረጡ። የተገዙ ገጽታዎች ይቀመጣሉ።',
    Applied: 'ተፈጽሟል',
    Removed: 'ተወግዷል',
    None: 'ምንም',
    'About Me': 'ስለ እኔ',
    'Tell others about yourself...': 'ስለ እርስዎ ንገር...',
    InterestsTitle: 'ፍላጎቶች',
    'Select your interests to find better matches': 'የተሻለ ማጣመር ለማግኘት ፍላጎቶችዎን ይምረጡ',
    'Location & Distance': 'አካባቢ እና ርቀት',
    'Search radius': 'የፍለጋ ክልል',
    'Profile Visibility': 'የመገለጫ ይታያል',
    everyone: 'ሁሉም',
    matches: 'ጣመሩ',
    nobody: 'ማንም',
    'Hide online status': 'የመስመር ላይ ሁኔታ መደበቅ',
    'Incognito mode (VIP feature)': 'እንኳን የማታይ ሁነታ (VIP)',
    'Save Changes': 'ለውጦችን አስቀምጥ',
    'Profile updated successfully!': 'መገለጫ ተዘምኗል!',
    'You can only add up to 6 photos': 'እስከ 6 ፎቶዎች ብቻ ትጨምራለህ',
    'Camera access is needed.': 'የካሜራ ፍቃድ ያስፈልጋል።',
    'Photo library access is needed.': 'የፎቶ ላይብረሪ ፍቃድ ያስፈልጋል።',
    'Create profile first': 'መጀመሪያ መገለጫ ፍጠር',
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