import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all language files
import en from './locales/en.json';
import th from './locales/th.json';
import zh from './locales/zh.json';
import hi from './locales/hi.json';
import gu from './locales/gu.json';
import ar from './locales/ar.json';
import vi from './locales/vi.json';
import id from './locales/id.json';
import ta from './locales/ta.json';
import mr from './locales/mr.json';
import es from './locales/es.json';

// Language configuration with metadata
export const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', dir: 'ltr' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
];

const resources = {
  en: { translation: en },
  th: { translation: th },
  zh: { translation: zh },
  hi: { translation: hi },
  gu: { translation: gu },
  ar: { translation: ar },
  vi: { translation: vi },
  id: { translation: id },
  ta: { translation: ta },
  mr: { translation: mr },
  es: { translation: es },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Function to get current language direction
export const getLanguageDirection = (langCode) => {
  const lang = languages.find(l => l.code === langCode);
  return lang?.dir || 'ltr';
};

// Function to get language by code
export const getLanguageByCode = (code) => {
  return languages.find(l => l.code === code);
};

export default i18n;
