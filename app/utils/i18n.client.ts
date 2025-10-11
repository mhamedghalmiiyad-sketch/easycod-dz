import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// Client-side i18n configuration
const clientI18n = i18next.createInstance();

// Initialize with proper configuration to prevent hydration mismatches
clientI18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    ns: ['common', 'dashboard', 'settings', 'navigation', 'language', 'formDesigner', 'protection', 'pixels', 'visibility', 'googleSheets'],
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },

    react: {
      useSuspense: false,
    },
    
    // Initialize with empty resources - they will be populated by the server data
    resources: {},
    
    // Disable automatic language detection to prevent hydration issues
    detection: {
      order: [],
    },
  })
  .catch((error) => {
    console.error('i18n initialization error:', error);
  });

export default clientI18n;

// Helper function to check if language is RTL
export function isRTL(language: string): boolean {
  return language === 'ar';
}
