import { createInstance } from 'i18next';
import { resolve } from 'path';

// Per-request i18n instance factory
export async function initI18n(lang: string) {
  const instance = createInstance();
  
  // Dynamically import Backend to avoid top-level await issues
  const Backend = (await import('i18next-fs-backend')).default;
  
  await instance.use(Backend).init({
    lng: lang,
    fallbackLng: 'en',
    ns: ['common', 'dashboard', 'settings', 'navigation', 'language', 'formDesigner', 'protection', 'pixels', 'visibility', 'googleSheets'],
    defaultNS: 'common',
    backend: {
      loadPath: resolve(process.cwd(), 'app/locales/{{ns}}.{{lng}}.json'),
    },
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    react: {
      useSuspense: false,
    },
  });
  return instance;
}

// Helper function to get language from request
export async function getLanguageFromRequest(request: Request, sessionId?: string): Promise<string> {
  const url = new URL(request.url);
  
  // Check URL parameter first (highest priority)
  const langParam = url.searchParams.get('lang');
  if (langParam && ['en', 'ar', 'fr'].includes(langParam)) {
    return langParam;
  }
  
  // Check database for saved language preference (if sessionId is provided)
  if (sessionId) {
    try {
      const { db } = await import('../db.server');
      const session = await db.session.findUnique({
        where: { id: sessionId },
        select: { locale: true }
      });
      
      if (session?.locale && ['en', 'ar', 'fr'].includes(session.locale)) {
        return session.locale;
      }
    } catch (error) {
      console.warn('Failed to get language from database:', error);
    }
  }
  
  // Check cookie for saved language preference
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const cookieLang = cookies['i18nextLng'];
    if (cookieLang && ['en', 'ar', 'fr'].includes(cookieLang)) {
      return cookieLang;
    }
  }
  
  // Check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().toLowerCase());
    
    // Check for exact matches first
    for (const lang of languages) {
      if (['en', 'ar', 'fr'].includes(lang)) {
        return lang;
      }
    }
    
    // Check for language prefixes (e.g., 'ar-SA' -> 'ar')
    for (const lang of languages) {
      const prefix = lang.split('-')[0];
      if (['en', 'ar', 'fr'].includes(prefix)) {
        return prefix;
      }
    }
  }
  
  // Default to English
  return 'en';
}

// Helper function to check if language is RTL
export function isRTL(language: string): boolean {
  return language === 'ar';
}

// Helper function to get translations for a language
export async function getTranslations(language: string) {
  const i18n = await initI18n(language);
  return {
    common: i18n.getResourceBundle(language, 'common'),
    dashboard: i18n.getResourceBundle(language, 'dashboard'),
    settings: i18n.getResourceBundle(language, 'settings'),
    navigation: i18n.getResourceBundle(language, 'navigation'),
    language: i18n.getResourceBundle(language, 'language'),
    formDesigner: i18n.getResourceBundle(language, 'formDesigner'),
    protection: i18n.getResourceBundle(language, 'protection'),
    pixels: i18n.getResourceBundle(language, 'pixels'),
    visibility: i18n.getResourceBundle(language, 'visibility'),
    googleSheets: i18n.getResourceBundle(language, 'googleSheets'),
  };
}

// Helper function to save language preference to database
export async function saveLanguagePreference(sessionId: string, language: string): Promise<void> {
  try {
    const { db } = await import('../db.server');
    await db.session.update({
      where: { id: sessionId },
      data: { locale: language }
    });
    console.log(`✅ Language preference saved to database: ${language} for session ${sessionId}`);
  } catch (error) {
    console.error('❌ Failed to save language preference to database:', error);
    throw error;
  }
}
