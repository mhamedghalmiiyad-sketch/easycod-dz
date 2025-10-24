import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import React, { useState, useCallback, useEffect } from 'react';
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Button,
  Badge,
  Icon,
  Text,
  ProgressBar,
  Collapsible,
  ButtonGroup,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Banner,
  List,
  Frame,
  Toast,
  Modal,
  TextContainer,
} from '@shopify/polaris';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  QuestionCircleIcon,
  ChatIcon,
  BookIcon,
} from '@shopify/polaris-icons';
import enTranslations from '@shopify/polaris/locales/en.json';
// ⬇️ Import the 'useTranslation' hook
import { useTranslation, I18nextProvider } from 'react-i18next';
// ⬇️ This is the instance we need to pre-populate
import clientI18n from '../utils/i18n.client';
import { getLanguageFromRequest, getTranslations, isRTL } from '../utils/i18n.server';

// --- START LOADER FIX ---
export const loader = async (args: LoaderFunctionArgs) => {
  const { request, context } = args; // Destructure args
  const { authenticate } = await import("~/shopify.server");
  
  // 1. Pass the *entire* 'args' object to authenticate.admin
  const { session } = await authenticate.admin(args);
  
  // Get language and translations
  const language = await getLanguageFromRequest(request, session.id);
  const translations = await getTranslations(language);
  const rtl = isRTL(language);

  // 2. Pre-populate the i18n instance on the server
  Object.entries(translations).forEach(([namespace, bundle]) => {
    if (!clientI18n.hasResourceBundle(language, namespace)) {
      clientI18n.addResourceBundle(language, namespace, bundle, true, true);
    }
  });
  // 3. Set the language for the server-side render
  await clientI18n.changeLanguage(language);
  
  return json({ 
    shop: session.shop,
    language,
    translations, // Still pass translations for client-side hydration
    rtl,
  });
};
// --- END LOADER FIX ---

const ShopifyDashboard = () => {
  const { shop, language, translations, rtl } = useLoaderData<typeof loader>();
  // --- START TRANSLATION FIX ---
  // 4. Use the i18n hook
  const { t } = useTranslation(['dashboard', 'common']);
  // --- END TRANSLATION FIX ---

  const navigate = useNavigate();
  const [isSetupExpanded, setIsSetupExpanded] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  // Initialize client i18n with server data
  useEffect(() => {
    // This logic is safer now because the server has already loaded the bundles
    if (!clientI18n.hasResourceBundle(language, 'common')) {
        Object.entries(translations).forEach(([namespace, bundle]) => {
          clientI18n.addResourceBundle(language, namespace, bundle, true, true);
        });
    }
    
    if (clientI18n.language !== language) {
        clientI18n.changeLanguage(language);
    }
    
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language, translations, rtl]);

  const setupData = {
    completedSteps: 0,
    totalSteps: 3,
    get setupProgress() {
      return Math.round((this.completedSteps / this.totalSteps) * 100);
    }
  };

  // 5. Use the 't' function to get translations
  const setupSteps = [
    {
      id: "embed_widget",
      title: t("setupSteps.embedWidget.title", { ns: 'dashboard' }),
      description: t("setupSteps.embedWidget.description", { ns: 'dashboard' }),
      completed: false,
      isEmbedWidget: true,
      buttonText: t("setupSteps.embedWidget.buttonText", { ns: 'dashboard' }),
      buttonVariant: "primary",
      helpText: t("setupSteps.embedWidget.helpText", { ns: 'dashboard' })
    },
    {
      id: "configure_cod",
      title: t("setupSteps.configureCod.title", { ns: 'dashboard' }),
      description: t("setupSteps.configureCod.description", { ns: 'dashboard' }),
      completed: false,
      buttonText: t("setupSteps.configureCod.buttonText", { ns: 'dashboard' }),
      buttonVariant: "primary",
      helpText: t("setupSteps.configureCod.helpText", { ns: 'dashboard' })
    },
    {
      id: "customize_form",
      title: t("setupSteps.customizeForm.title", { ns: 'dashboard' }),
      description: t("setupSteps.customizeForm.description", { ns: 'dashboard' }),
      completed: false,
      buttonText: t("setupSteps.customizeForm.buttonText", { ns: 'dashboard' }),
      buttonVariant: "primary",
      helpText: t("setupSteps.customizeForm.helpText", { ns: 'dashboard' })
    }
  ];

  const supportItems = [
    {
      id: "live_chat",
      title: t("support.liveChat.title", { ns: 'dashboard' }),
      description: t("support.liveChat.description", { ns: 'dashboard' }),
      buttonText: t("support.liveChat.buttonText", { ns: 'dashboard' }),
      icon: ChatIcon,
      badge: "Popular"
    },
    {
      id: "faq",
      title: t("support.faq.title", { ns: 'dashboard' }),
      description: t("support.faq.description", { ns: 'dashboard' }),
      buttonText: t("support.faq.buttonText", { ns: 'dashboard' }),
      icon: QuestionCircleIcon
    },
    {
      id: "installation",
      title: t("support.documentation.title", { ns: 'dashboard' }),
      description: t("support.documentation.description", { ns: 'dashboard' }),
      buttonText: t("support.documentation.buttonText", { ns: 'dashboard' }),
      icon: BookIcon
    },
  ];

  const handleStepClick = useCallback((step: typeof setupSteps[0]) => {
    if (step.isEmbedWidget) {
      setSelectedStep(step.id);
      setShowModal(true);
    } else if (step.id === "customize_form") {
      navigate("/app/form-designer");
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [navigate]);

  const handleToggleSetup = useCallback(() => {
    setIsSetupExpanded(!isSetupExpanded);
  }, [isSetupExpanded]);

  // We no longer need the manual 'translateStep' function
  // We no longer need 'translatedSetupSteps' or 'translatedSupportItems'
  // We can use 'setupSteps' and 'supportItems' directly

  const toastMarkup = showToast ? (
    <Toast
      content="Navigating to configuration page..."
      onDismiss={() => setShowToast(false)}
    />
  ) : null;

  const modalMarkup = (
    <Modal
      open={showModal}
      onClose={() => setShowModal(false)}
      title="Enable App Embed"
      primaryAction={{
        content: 'Open Theme Editor',
        onAction: () => {
          setShowModal(false);
          const shopName = shop.replace('.myshopify.com', '');
          const themeEditorUrl = `https://admin.shopify.com/store/${shopName}/themes`;
          window.open(themeEditorUrl, '_blank');
        },
      }}
      secondaryActions={[
        {
          content: 'Learn More',
          onAction: () => {
            setShowModal(false);
          },
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <Text variant="bodyMd" as="p">
            To enable the app embed, you'll need to access your theme customizer:
          </Text>
          <Box paddingBlockStart="400">
            <List type="number">
              <List.Item>Go to Online Store → Themes</List.Item>
              <List.Item>Click "Customize" on your active theme</List.Item>
              <List.Item>Navigate to App embeds section</List.Item>
              <List.Item>Enable "COD Form" toggle</List.Item>
              <List.Item>Save your changes</List.Item>
            </List>
          </Box>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  // 6. Use 't' function for all other strings
  const setupGuideText = t('setupGuide', { ns: 'dashboard' });

  const setupCardMarkup = (
    <Card>
      <Box padding="400">
        <ButtonGroup>
          <Button
            onClick={handleToggleSetup}
            ariaExpanded={isSetupExpanded}
            ariaControls="setup-content"
            icon={isSetupExpanded ? ChevronUpIcon : ChevronDownIcon}
            variant="plain"
            size="large"
          >
            {setupGuideText}
          </Button>
        </ButtonGroup>
        
        <Box paddingBlockStart="400">
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="bodySm" as="span">
                {setupData.completedSteps} of {setupData.totalSteps} completed
              </Text>
              <Text variant="bodySm" as="span" tone="subdued">
                {setupData.setupProgress}%
              </Text>
            </InlineStack>
            <ProgressBar 
              progress={setupData.setupProgress} 
              size="small" 
            />
          </BlockStack>
        </Box>
      </Box>

      <Collapsible
        open={isSetupExpanded}
        id="setup-content"
        transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
      >
        <Box paddingInline="400" paddingBlockEnd="400">
          <Divider />
          <Box paddingBlockStart="400">
            <BlockStack gap="400">
              {/* Use 'setupSteps' directly */}
              {setupSteps.map((step, index) => (
                <Card key={step.id}>
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="start">
                      <InlineStack gap="200" blockAlign="center">
                        {step.completed && (
                          <Icon
                            source={CheckCircleIcon}
                            tone="success"
                          />
                        )}
                        <Box>
                          <Text 
                            variant="headingSm" 
                            as="h3"
                            tone={step.completed ? 'subdued' : undefined}
                          >
                            {step.title}
                          </Text>
                          {step.completed && (
                            <Badge tone="success" size="small">
                              Completed
                            </Badge>
                          )}
                        </Box>
                      </InlineStack>
                      {!step.completed && step.buttonText && (
                        <Button
                          variant={step.buttonVariant as 'primary' | 'secondary'}
                          onClick={() => handleStepClick(step)}
                          size="slim"
                        >
                          {step.buttonText}
                        </Button>
                      )}
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued" as="p">
                      {step.description}
                    </Text>
                    {step.helpText && (
                      <Banner tone="info">
                        <Text variant="bodySm" as="p">{step.helpText}</Text>
                      </Banner>
                    )}
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          </Box>
        </Box>
      </Collapsible>
    </Card>
  );

  const supportCardMarkup = (
    <Card>
      <BlockStack gap="400">
        {/* Use 'supportItems' directly */}
        {supportItems.map((item) => (
          <Box key={item.id}>
            <BlockStack gap="200" align="start">
              <InlineStack gap="200" blockAlign="center">
                <Box>
                  <Icon source={item.icon} />
                </Box>
                <Box>
                  <BlockStack gap="100" align="start">
                    <InlineStack gap="100" blockAlign="center">
                      <Text variant="headingSm" as="h3">
                        {item.title}
                      </Text>
                      {item.badge && (
                        <Badge size="small">{item.badge}</Badge>
                      )}
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued" as="p">
                      {item.description}
                    </Text>
                  </BlockStack>
                </Box>
              </InlineStack>
              <Box paddingBlockStart="200">
                <Button 
                  size="slim" 
                  variant="plain"
                  onClick={() => {
                    if (item.id === "faq") {
                      const shopName = shop.replace('.myshopify.com', '');
                      const faqUrl = `https://admin.shopify.com/store/${shopName}/apps/alma-cod/app/faq`;
                      window.open(faqUrl, '_blank');
                    }
                  }}
                >
                  {item.buttonText}
                </Button>
              </Box>
            </BlockStack>
            {item.id !== supportItems[supportItems.length - 1].id && (
              <Box paddingBlockStart="400">
                <Divider />
              </Box>
            )}
          </Box>
        ))}
      </BlockStack>
    </Card>
  );

  // 7. Use 't' function for page title and subtitle
  const pageTitle = t('title', { ns: 'dashboard' });
  const pageSubtitle = t('subtitle', { ns: 'dashboard' });

  const pageMarkup = (
    <Page
      title={pageTitle}
      subtitle={pageSubtitle}
      compactTitle
    >
      <Layout>
        <Layout.Section>
          {setupCardMarkup}
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          {supportCardMarkup}
        </Layout.Section>
      </Layout>
    </Page>
  );

  return (
    <I18nextProvider i18n={clientI18n}>
      <div style={{ height: '100vh' }}>
        <AppProvider
          i18n={enTranslations}
          features={{ newDesignLanguage: true }}
        >
          <Frame>
            {pageMarkup}
            {toastMarkup}
            {modalMarkup}
          </Frame>
        </AppProvider>
      </div>
    </I18nextProvider>
  );
};

export default ShopifyDashboard;
