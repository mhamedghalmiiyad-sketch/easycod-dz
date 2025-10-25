import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// Client-side i18n configuration
const clientI18n = i18next.createInstance();

// Use initReactI18next plugin but don't initialize yet
// Initialization will happen in entry.client.tsx
clientI18n.use(initReactI18next);

export default clientI18n;

// Helper function to check if language is RTL
export function isRTL(language: string): boolean {
  return language === 'ar';
}
