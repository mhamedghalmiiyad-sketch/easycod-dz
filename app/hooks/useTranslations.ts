import { useTranslation } from 'react-i18next';

export function useTranslations() {
  const { t, i18n } = useTranslation();
  
  const isRTL = i18n.language === 'ar';
  
  return {
    t,
    language: i18n.language,
    isRTL,
    currentLanguage: i18n.language,
    i18n,
  };
}
