import React, { useCallback } from 'react';
import { useNavigate, useLocation } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  InlineStack,
  Text,
  Icon,
  Box,
} from '@shopify/polaris';
import { LanguageIcon } from '@shopify/polaris-icons';

interface LanguageOption {
  label: string;
  value: string;
  flag: string;
}

const languageOptions: LanguageOption[] = [
  { label: 'English', value: 'en', flag: '🇺🇸' },
  { label: 'العربية', value: 'ar', flag: '🇩🇿' },
  { label: 'Français', value: 'fr', flag: '🇫🇷' },
];

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLanguageChange = useCallback((value: string) => {
    // Update URL with new language parameter
    const url = new URL(location.pathname + location.search, window.location.origin);
    url.searchParams.set('lang', value);
    
    // Navigate to the new URL to trigger SSR reload
    navigate(url.pathname + url.search, { replace: true });
  }, [navigate, location]);

  return (
    <div className="language-selector-container">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ marginRight: '2px' }}>
          <Icon source={LanguageIcon} tone="base" />
        </div>
        <Text variant="bodyMd" as="span">
          {t('language:selector.title')}:
        </Text>
        <div style={{ marginLeft: '8px' }}>
          <Box minWidth="120px">
            <Select
              label=""
              labelHidden
              options={languageOptions.map(option => ({
                label: `${option.flag}\u2009${option.label}`,
                value: option.value,
              }))}
              value={i18n.language}
              onChange={handleLanguageChange}
            />
          </Box>
        </div>
      </div>
    </div>
  );
}
