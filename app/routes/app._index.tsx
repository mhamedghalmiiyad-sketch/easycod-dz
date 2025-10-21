import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import React, { useState, useCallback, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  Icon,
  Text,
  ProgressBar,
  Collapsible,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Toast,
  Modal,
  TextContainer,
} from '@shopify/polaris';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  QuestionCircleIcon,
  BookIcon,
} from '@shopify/polaris-icons';
import { MessageCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../components/LanguageSelector';
import { getLanguageFromRequest, getTranslations, isRTL, saveLanguagePreference } from '../utils/i18n.server';
import clientI18n from '../utils/i18n.client';
import { authenticate } from "../shopify.server";

// This loader MUST authenticate to protect the page content.
export const loader = async (args: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(args);
  const { request } = args;

  // Load page-specific data, including translations.
  const language = await getLanguageFromRequest(request, session.id);
  const translations = await getTranslations(language); // This was missing
  const rtl = isRTL(language); // This was missing

  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  if (langParam && ['en', 'ar', 'fr'].includes(langParam)) {
    try {
      await saveLanguagePreference(session.id, langParam);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  }

  return json({
    shop: session.shop,
    language,
    translations, // Pass translations
    rtl, // Pass RTL setting
  });
};


// This component renders the full dashboard UI and uses context from its parent (app.tsx).
export default function ShopifyDashboard() {
  const { shop, language, translations, rtl } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  // This hook now works because the I18nextProvider is in the parent app.tsx
  const { t: clientT } = useTranslation('dashboard');
  const [isClientReady, setIsClientReady] = useState(false);

  // This useEffect correctly initializes i18n
  useEffect(() => {
    Object.entries(translations || {}).forEach(([namespace, bundle]) => {
      clientI18n.addResourceBundle(language, namespace, bundle || {}, true, true);
    });
    clientI18n.changeLanguage(language).then(() => {
      document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', language);
      setIsClientReady(true);
    });
  }, [language, translations, rtl]);

  // This t() function correctly handles server/client rendering
  const t = (key: string) => {
    if (!isClientReady) {
      // Use server-side translation during initial render
      return (translations as any)?.dashboard?.[key] || key;
    }
    return clientT(key); // Use client-side hook after hydration
  };
  
  // All your original state and hooks...
  const [isSetupExpanded, setIsSetupExpanded] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showFAQ, setShowFAQ] = useState(false);
  const [expandedFAQItems, setExpandedFAQItems] = useState<number[]>([]);

  const setupData = {
    completedSteps: 0,
    totalSteps: 3,
    get setupProgress() {
      return Math.round((this.completedSteps / this.totalSteps) * 100);
    }
  };

  const setupSteps = [
    { 
      id: "customize_form", 
      title: t('setupSteps.customizeForm.title'), 
      description: t('setupSteps.customizeForm.description'), 
      completed: false, 
      buttonText: t('setupSteps.customizeForm.buttonText'), 
      buttonVariant: "primary", 
      helpText: t('setupSteps.customizeForm.helpText')
    },
    { 
      id: "embed_widget", 
      title: t('setupSteps.embedWidget.title'), 
      description: t('setupSteps.embedWidget.description'), 
      completed: false, 
      isEmbedWidget: true, 
      buttonText: t('setupSteps.embedWidget.buttonText'), 
      buttonVariant: "primary", 
      helpText: t('setupSteps.embedWidget.helpText')
    },
    { 
      id: "configure_cod", 
      title: t('setupSteps.configureCod.title'), 
      description: t('setupSteps.configureCod.description'), 
      completed: false, 
      buttonText: t('setupSteps.configureCod.buttonText'), 
      buttonVariant: "primary", 
      helpText: t('setupSteps.configureCod.helpText')
    }
  ];

  const supportItems = [
    { 
      id: "contact_support", 
      title: "Contact Support", 
      description: "Get in touch with our support team instantly:", 
      isContactSupport: true 
    },
    { 
      id: "faq", 
      title: t('support.faq.title'), 
      description: t('support.faq.description'), 
      buttonText: t('support.faq.buttonText'), 
      icon: QuestionCircleIcon 
    },
    { 
      id: "installation", 
      title: t('support.documentation.title'), 
      description: t('support.documentation.description'), 
      buttonText: t('support.documentation.buttonText'), 
      icon: BookIcon 
    },
  ];

  const faqItems = [
    { 
      id: 1, 
      question: "What is Alma COD Form & Builder?", 
      answer: "Alma COD Form & Builder is a Shopify app that lets you add a customizable Cash on Delivery (COD) order form to your store. It also includes one-tick upsells, downsells, and order management features designed to boost your sales and increase your average order value." 
    },
    { 
      id: 2, 
      question: "How do I add the COD form to my store?", 
      answer: "Adding the COD form is easy:\n\n1. Install Alma COD Form & Builder from the Shopify App Store.\n2. Open the dashboard and follow the guided setup steps.\n3. Enable the app embed inside your theme customizer.\n4. Customize the form and integrate it into your checkout flow.\n5. Test the form on your storefront." 
    },
    { 
      id: 3, 
      question: "Can I customize the appearance of the COD form?", 
      answer: "Yes, you can fully customize the form to match your brand. Options include:\n\n• Custom colors, fonts, and button styles\n• Multiple layouts (popup, inline, or embedded)\n• Custom input fields\n• Branded messages and copywriting\n• Mobile-optimized design\n• Advanced CSS overrides for developers" 
    },
    { 
      id: 4, 
      question: "Can I choose which products show upsells or downsells?", 
      answer: "Absolutely. You can select specific products to display one-tick upsell or downsell offers. This ensures your promotions are targeted to the right customers and products." 
    },
    { 
      id: 5, 
      question: "Will the app work with my Shopify theme?", 
      answer: "Alma COD Form & Builder works with most Shopify themes. If you encounter layout issues or conflicts, our support team is available to help you fix them quickly." 
    },
    { 
      id: 6, 
      question: "Does the app support PageFly and other page builders?", 
      answer: "Yes. The app integrates seamlessly with PageFly, GemPages, Shogun, and other popular page builders. You can embed the COD form and upsell offers directly on custom-built pages." 
    },
    { 
      id: 7, 
      question: "What happens if I uninstall the app?", 
      answer: "Recurring app charges are billed at the start of each billing cycle. If you uninstall the app shortly after installing, you may still see a charge for that cycle. To avoid unexpected charges, consider uninstalling before the next billing cycle begins." 
    }
  ];

  const toggleFAQItem = useCallback((id: number) => {
    setExpandedFAQItems(prev => prev.includes(id) ? [] : [id]);
  }, []);

  const handleFAQClick = useCallback(() => {
    setShowFAQ(true);
    if (faqItems.length > 0) setExpandedFAQItems([faqItems[0].id]);
  }, [faqItems]);

  const handleBackToDashboard = useCallback(() => {
    setShowFAQ(false);
    setExpandedFAQItems([]);
  }, []);

  const handleStepClick = useCallback((step: typeof setupSteps[0]) => {
    if (step.isEmbedWidget) {
      setSelectedStep(step.id);
      setShowModal(true);
    } else if (step.id === "customize_form") {
      navigate("/app/form-designer");
    } else if (step.id === "configure_cod") {
      navigate("/app/settings/pixels");
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [navigate]);

  const handleToggleSetup = useCallback(() => setIsSetupExpanded(!isSetupExpanded), [isSetupExpanded]);

  const toastMarkup = showToast ? <Toast content="Loading..." onDismiss={() => setShowToast(false)} /> : null;

  const modalMarkup = (
    <Modal 
      open={showModal} 
      onClose={() => setShowModal(false)} 
      title={t('setupSteps.embedWidget.title')}
      primaryAction={{ 
        content: 'Open Theme Editor', 
        onAction: () => {
          setShowModal(false);
          const shopName = shop.replace('.myshopify.com', '');
          window.open(`https://admin.shopify.com/store/${shopName}/themes`, '_blank');
        }
      }}
      secondaryActions={[{ 
        content: 'Learn More', 
        onAction: () => setShowModal(false) 
      }]}
    >
      <Modal.Section>
        <TextContainer>
          <Text variant="bodyMd" as="p">
            {t('setupSteps.embedWidget.description')}
          </Text>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  const setupCardMarkup = (
    <Card>
      <Box padding="100" paddingBlock="200">
        <InlineStack align="space-between" blockAlign="center">
          <div 
            role="button" 
            tabIndex={0} 
            onClick={handleToggleSetup} 
            onKeyDown={(e) => { 
              if (e.key === 'Enter' || e.key === ' ') { 
                e.preventDefault(); 
                handleToggleSetup(); 
              } 
            }}
          >
            <InlineStack gap="150" blockAlign="center">
              <Icon source={isSetupExpanded ? ChevronUpIcon : ChevronDownIcon} />
              <Icon source={CheckCircleIcon} tone="success" />
              <Text variant="headingSm" as="span">{t('setupProgress')}</Text>
            </InlineStack>
          </div>
          <InlineStack gap="150" blockAlign="center">
            <Text variant="bodySm" as="span">{setupData.completedSteps} of {setupData.totalSteps} completed</Text>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#6b7280' }} />
            <Text variant="bodySm" as="span" tone="subdued">{setupData.setupProgress}%</Text>
          </InlineStack>
        </InlineStack>
        <Box paddingBlockStart="150">
          <ProgressBar 
            progress={setupData.setupProgress} 
            size="small" 
            tone={setupData.setupProgress === 100 ? 'success' : 'primary'} 
          />
        </Box>
      </Box>
      <Collapsible open={isSetupExpanded} id="setup-content">
        <Box paddingInline="200" paddingBlock="200">
          <BlockStack gap="200">
            {setupSteps.map((step, index) => (
              <div 
                key={step.id} 
                style={{ 
                  padding: '12px', 
                  border: '1px solid #e1e3e5', 
                  borderRadius: '6px' 
                }}
              >
                <BlockStack gap="150">
                  <InlineStack align="space-between" blockAlign="start">
                    <InlineStack gap="150" blockAlign="center">
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        backgroundColor: step.completed ? '#10b981' : '#f3f4f6', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        border: step.completed ? 'none' : '2px solid #e5e7eb' 
                      }}>
                        {step.completed ? (
                          <Icon source={CheckCircleIcon} tone="success" />
                        ) : (
                          <Text variant="bodySm" as="span" fontWeight="semibold" tone="subdued">
                            {index + 1}
                          </Text>
                        )}
                      </div>
                      <Text variant="headingSm" as="h3" tone={step.completed ? 'subdued' : undefined}>
                        {step.title}
                      </Text>
                    </InlineStack>
                    {!step.completed && step.buttonText && (
                      <Button 
                        variant={step.buttonVariant as any} 
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
                    <div style={{ 
                      padding: '8px', 
                      backgroundColor: '#eff6ff', 
                      border: '1px solid #bfdbfe', 
                      borderRadius: '4px', 
                      marginTop: '6px' 
                    }}>
                      <Text variant="bodySm" as="p">
                        {step.helpText}
                      </Text>
                    </div>
                  )}
                </BlockStack>
              </div>
            ))}
          </BlockStack>
        </Box>
      </Collapsible>
    </Card>
  );

  const supportCardMarkup = (
    <Card>
      <BlockStack gap="400">
        {supportItems.map((item, index) => (
          <Box key={item.id}>
            <BlockStack gap="200" align="start">
              {item.isContactSupport ? (
                <>
                  <Text variant="headingSm" as="h3">{item.title}</Text>
                  <Text variant="bodySm" tone="subdued" as="p">{item.description}</Text>
                  <Box paddingBlockStart="200">
                    <BlockStack gap="200">
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '8px 12px', 
                          backgroundColor: '#008060', 
                          color: 'white', 
                          borderRadius: '6px', 
                          cursor: 'pointer' 
                        }} 
                        onClick={() => window.open('https://wa.me/213540178342', '_blank')}
                      >
                        <MessageCircle size={16} />
                        <span>WhatsApp Chat</span>
                      </div>
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '8px 12px', 
                          backgroundColor: '#f6f6f7', 
                          color: '#202223', 
                          border: '1px solid #d1d3d4', 
                          borderRadius: '6px', 
                          cursor: 'pointer' 
                        }} 
                        onClick={() => window.open('mailto:ghalmaimiyad@gmail.com', '_blank')}
                      >
                        <Mail size={16} />
                        <span>Email Us</span>
                      </div>
                    </BlockStack>
                  </Box>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {item.icon && (
                      <div style={{ marginRight: '2px' }}>
                        <Icon source={item.icon as any} tone="base" />
                      </div>
                    )}
                    <Text variant="headingSm" as="h3">{item.title}</Text>
                  </div>
                  <Text variant="bodySm" tone="subdued" as="p">{item.description}</Text>
                  <Box paddingBlockStart="200">
                    <Button 
                      size="slim" 
                      variant="plain" 
                      onClick={() => { 
                        if (item.id === "faq") { 
                          handleFAQClick(); 
                        } 
                      }}
                    >
                      {item.buttonText}
                    </Button>
                  </Box>
                </>
              )}
            </BlockStack>
            {index < supportItems.length - 1 && (
              <Box paddingBlockStart="400">
                <Divider />
              </Box>
            )}
          </Box>
        ))}
      </BlockStack>
    </Card>
  );

  const faqMarkup = (
    <Card>
      <BlockStack gap="0">
        {faqItems.map((item, index) => {
          const isExpanded = expandedFAQItems.includes(item.id);
          return (
            <React.Fragment key={item.id}>
              <div 
                role="button" 
                tabIndex={0} 
                onClick={() => toggleFAQItem(item.id)} 
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' || e.key === ' ') { 
                    e.preventDefault(); 
                    toggleFAQItem(item.id); 
                  } 
                }} 
                aria-expanded={isExpanded} 
                style={{ cursor: 'pointer', width: '100%', display: 'block' }}
              >
                <Box padding="400">
                  <InlineStack align="space-between" blockAlign="center" wrap={false} gap="400">
                    <div style={{ flex: 1 }}>
                      <Text variant="headingMd" as="h3">
                        {item.question}
                      </Text>
                    </div>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#6B7280' 
                    }}>
                      {isExpanded ? '−' : '+'}
                    </div>
                  </InlineStack>
                </Box>
              </div>
              <Collapsible open={isExpanded} id={`faq-content-${item.id}`}>
                <Box paddingInline="400" paddingBlockEnd="400">
                  <BlockStack gap="200">
                    {item.answer.split('\n').map((line, lineIndex) => (
                      <Text key={lineIndex} as="p" variant="bodyMd" tone="subdued">
                        {line}
                      </Text>
                    ))}
                  </BlockStack>
                </Box>
              </Collapsible>
              {index < faqItems.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </BlockStack>
    </Card>
  );

  const pageMarkup = showFAQ ? (
    <Page 
      title="FAQ & Help Center" 
      subtitle="Find answers to common questions and get support" 
      compactTitle 
      backAction={{ content: 'Dashboard', onAction: handleBackToDashboard }}
    >
      <Layout>
        <Layout.Section>
          {faqMarkup}
        </Layout.Section>
      </Layout>
    </Page>
  ) : (
    <Page title={t('title')} subtitle={t('subtitle')} compactTitle>
      <Layout>
        <Layout.Section>
          {setupCardMarkup}
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <Box padding="400">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    {t('support.title')}
                  </Text>
                </BlockStack>
              </Box>
              {supportCardMarkup}
            </Card>
            <Card>
              <BlockStack gap="200">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ marginRight: '2px' }}>
                    <Icon source={QuestionCircleIcon} tone="base" />
                  </div>
                  <Text as="h3" variant="headingMd">Language</Text>
                </div>
                <Text as="p" tone="subdued">
                  Choose your preferred language for the application interface.
                </Text>
                <LanguageSelector />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );

  return (
    <>
      {pageMarkup}
      {toastMarkup}
      {modalMarkup}
    </>
  );
}