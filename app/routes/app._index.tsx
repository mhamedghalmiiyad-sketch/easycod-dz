import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import React, { useState, useCallback } from 'react';
import {
  Page, Layout, Card, Button, Icon, Text, ProgressBar, Collapsible, BlockStack, InlineStack, Box, Divider, Toast, Modal, TextContainer
} from '@shopify/polaris';
import {
  CheckCircleIcon, ChevronDownIcon, ChevronUpIcon, QuestionCircleIcon, BookIcon
} from '@shopify/polaris-icons';
import { MessageCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../components/LanguageSelector';
import { getLanguageFromRequest, saveLanguagePreference } from '../utils/i18n.server';
import { authenticate } from "../shopify.server";

// This loader MUST authenticate to protect the page content.
export const loader = async (args: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(args);
  const { request } = args;

  // You can still load page-specific data here.
  const language = await getLanguageFromRequest(request, session.id);
  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  if (langParam && ['en', 'ar', 'fr'].includes(langParam)) {
    await saveLanguagePreference(session.id, langParam);
  }
  
  return json({
    shop: session.shop,
    language,
  });
};


// This component now just renders the page content and USES the context from its parent.
export default function ShopifyDashboard() {
  const { shop, language } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  // This hook now works because the I18nextProvider is in the parent component.
  const { t } = useTranslation('dashboard');
  
  // All your original state and hooks...
  const [isSetupExpanded, setIsSetupExpanded] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showFAQ, setShowFAQ] = useState(false);
  const [expandedFAQItems, setExpandedFAQItems] = useState<number[]>([]);

  // ... (Rest of your original component logic: setupData, setupSteps, supportItems, faqItems, handlers, etc.)
  const setupData = { completedSteps: 0, totalSteps: 3, get setupProgress() { return Math.round((this.completedSteps / this.totalSteps) * 100); } };
  const setupSteps = [ { id: "customize_form", title: t('setupSteps.customizeForm.title'), description: t('setupSteps.customizeForm.description'), completed: false, buttonText: t('setupSteps.customizeForm.buttonText'), buttonVariant: "primary", helpText: t('setupSteps.customizeForm.helpText') }, { id: "embed_widget", title: t('setupSteps.embedWidget.title'), description: t('setupSteps.embedWidget.description'), completed: false, isEmbedWidget: true, buttonText: t('setupSteps.embedWidget.buttonText'), buttonVariant: "primary", helpText: t('setupSteps.embedWidget.helpText') }, { id: "configure_cod", title: t('setupSteps.configureCod.title'), description: t('setupSteps.configureCod.description'), completed: false, buttonText: t('setupSteps.configureCod.buttonText'), buttonVariant: "primary", helpText: t('setupSteps.configureCod.helpText') } ];
  const supportItems = [ { id: "contact_support", title: "Contact Support", description: "Get in touch with our support team instantly:", isContactSupport: true }, { id: "faq", title: t('support.faq.title'), description: t('support.faq.description'), buttonText: t('support.faq.buttonText'), icon: QuestionCircleIcon }, { id: "installation", title: t('support.documentation.title'), description: t('support.documentation.description'), buttonText: t('support.documentation.buttonText'), icon: BookIcon }, ];
  const faqItems = [ { id: 1, question: "What is Alma COD Form & Builder?", answer: "...", }, { id: 2, question: "How do I add the COD form to my store?", answer: "...", }, { id: 3, question: "Can I customize the appearance of the COD form?", answer: "...", }, { id: 4, question: "Can I choose which products show upsells or downsells?", answer: "...", }, { id: 5, question: "Will the app work with my Shopify theme?", answer: "...", }, { id: 6, question: "Does the app support PageFly and other page builders?", answer: "...", }, { id: 7, question: "What happens if I uninstall the app?", answer: "...", }, ];
  const toggleFAQItem = useCallback((id: number) => { setExpandedFAQItems(prev => { const isCurrentlyExpanded = prev.includes(id); if (isCurrentlyExpanded) { return []; } return [id]; }); }, []);
  const handleFAQClick = useCallback(() => { setShowFAQ(true); if (expandedFAQItems.length === 0 && faqItems.length > 0) { setExpandedFAQItems([faqItems[0].id]); } }, [expandedFAQItems.length, faqItems.length]);
  const handleBackToDashboard = useCallback(() => { setShowFAQ(false); setExpandedFAQItems([]); }, []);
  const handleStepClick = useCallback((step: typeof setupSteps[0]) => { if (step.isEmbedWidget) { setSelectedStep(step.id); setShowModal(true); } else if (step.id === "customize_form") { navigate("/app/form-designer"); } else if (step.id === "configure_cod") { navigate("/app/settings/pixels"); } else { setShowToast(true); setTimeout(() => setShowToast(false), 3000); } }, [navigate]);
  const handleToggleSetup = useCallback(() => { setIsSetupExpanded(!isSetupExpanded); }, [isSetupExpanded]);
  const toastMarkup = showToast ? ( <Toast content="Loading..." onDismiss={() => setShowToast(false)} /> ) : null;
  const modalMarkup = ( <Modal open={showModal} onClose={() => setShowModal(false)} title={t('setupSteps.embedWidget.title')} primaryAction={{ content: 'Open Theme Editor', onAction: () => { setShowModal(false); const shopName = shop.replace('.myshopify.com', ''); const themeEditorUrl = `https://admin.shopify.com/store/${shopName}/themes`; window.open(themeEditorUrl, '_blank'); }, }} secondaryActions={[ { content: 'Learn More', onAction: () => { setShowModal(false); }, }, ]} > <Modal.Section> <TextContainer> <Text variant="bodyMd" as="p"> {t('setupSteps.embedWidget.description')} </Text> </TextContainer> </Modal.Section> </Modal> );
  const setupCardMarkup = ( <Card> <Box padding="100" paddingBlock="200"> <InlineStack align="space-between" blockAlign="center"> <div style={{ transition: 'all 0.2s ease-in-out', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }} onClick={handleToggleSetup} role="button" tabIndex={0} > <InlineStack gap="150" blockAlign="center"> <Icon source={isSetupExpanded ? ChevronUpIcon : ChevronDownIcon} /> <Icon source={CheckCircleIcon} tone="success" /> <Text variant="headingSm" as="span"> {t('setupProgress')} </Text> </InlineStack> </div> <InlineStack gap="150" blockAlign="center"> <Text variant="bodySm" as="span"> {setupData.completedSteps} of {setupData.totalSteps} completed </Text> <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#6b7280' }} /> <Text variant="bodySm" as="span" tone="subdued"> {setupData.setupProgress}% </Text> </InlineStack> </InlineStack> <Box paddingBlockStart="150"> <ProgressBar progress={setupData.setupProgress} size="small" tone={setupData.setupProgress === 100 ? 'success' : 'primary'} /> </Box> </Box> <Collapsible open={isSetupExpanded} id="setup-content" > <Box paddingInline="200" paddingBlock="200"> <BlockStack gap="200"> {setupSteps.map((step, index) => ( <div key={step.id} style={{ padding: '12px', border: '1px solid #e1e3e5', borderRadius: '6px', backgroundColor: '#ffffff', }}> <BlockStack gap="150"> <InlineStack align="space-between" blockAlign="start"> <InlineStack gap="150" blockAlign="center"> <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: step.completed ? '#10b981' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: step.completed ? 'none' : '2px solid #e5e7eb', }}> {step.completed ? ( <Icon source={CheckCircleIcon} tone="success" /> ) : ( <Text variant="bodySm" as="span" fontWeight="semibold" tone="subdued"> {index + 1} </Text> )} </div> <Text variant="headingSm" as="h3" tone={step.completed ? 'subdued' : undefined} > {step.title} </Text> </InlineStack> {!step.completed && step.buttonText && ( <Button variant={step.buttonVariant as 'primary' | 'secondary'} onClick={() => handleStepClick(step)} size="slim" > {step.buttonText} </Button> )} </InlineStack> <Text variant="bodySm" tone="subdued" as="p"> {step.description} </Text> {step.helpText && ( <div style={{ padding: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', marginTop: '6px' }}> <Text variant="bodySm" as="p"> {step.helpText} </Text> </div> )} </BlockStack> </div> ))} </BlockStack> </Box> </Collapsible> </Card> );
  const supportCardMarkup = ( <Card> <BlockStack gap="400"> {supportItems.map((item) => ( <Box key={item.id}> <BlockStack gap="200" align="start"> {item.isContactSupport ? ( <> <Text variant="headingSm" as="h3">{item.title}</Text> <Text variant="bodySm" tone="subdued" as="p">{item.description}</Text> <Box paddingBlockStart="200"> <BlockStack gap="200"> <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#008060', color: 'white', borderRadius: '6px', cursor: 'pointer' }} onClick={() => window.open('https://wa.me/213540178342', '_blank')}> <MessageCircle size={16} /> <span>WhatsApp Chat</span> </div> <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#f6f6f7', color: '#202223', border: '1px solid #d1d3d4', borderRadius: '6px', cursor: 'pointer' }} onClick={() => window.open('mailto:ghalmaimiyad@gmail.com', '_blank')}> <Mail size={16} /> <span>Email Us</span> </div> </BlockStack> </Box> </> ) : ( <> <div style={{ display: 'flex', alignItems: 'center' }}> {item.icon && ( <div style={{ marginRight: '2px' }}><Icon source={item.icon as any} tone="base" /></div> )} <Text variant="headingSm" as="h3">{item.title}</Text> </div> <Text variant="bodySm" tone="subdued" as="p">{item.description}</Text> <Box paddingBlockStart="200"> <Button size="slim" variant="plain" onClick={() => { if (item.id === "faq") { handleFAQClick(); } }} >{item.buttonText}</Button> </Box> </> )} </BlockStack> {item.id !== supportItems[supportItems.length - 1].id && ( <Box paddingBlockStart="400"><Divider /></Box> )} </Box> ))} </BlockStack> </Card> );
  const faqMarkup = ( <Card> <BlockStack gap="0"> {faqItems.map((item, index) => { const isExpanded = expandedFAQItems.includes(item.id); return ( <React.Fragment key={item.id}> <div role="button" tabIndex={0} onClick={() => toggleFAQItem(item.id)} onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleFAQItem(item.id); } }} aria-expanded={isExpanded} style={{ cursor: 'pointer', width: '100%', display: 'block' }} > <Box padding="400"> <InlineStack align="space-between" blockAlign="center" wrap={false} gap="400"> <div style={{ flex: 1 }}> <Text variant="headingMd" as="h3"> {item.question} </Text> </div> <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', color: '#6B7280' }}> {isExpanded ? '−' : '+'} </div> </InlineStack> </Box> </div> <Collapsible open={isExpanded} id={`faq-content-${item.id}`} > <Box paddingInline="400" paddingBlockEnd="400"> <BlockStack gap="200"> {item.answer.split('\n').map((line, lineIndex) => ( <Text key={lineIndex} as="p" variant="bodyMd" tone="subdued" > {line} </Text> ))} </BlockStack> </Box> </Collapsible> {index < faqItems.length - 1 && <Divider />} </React.Fragment> ); })} </BlockStack> </Card> );
  const pageMarkup = showFAQ ? ( <Page title="FAQ & Help Center" subtitle="Find answers to common questions and get support" compactTitle backAction={{ content: 'Dashboard', onAction: handleBackToDashboard }} > <Layout> <Layout.Section> {faqMarkup} </Layout.Section> </Layout> </Page> ) : ( <Page title={t('title')} subtitle={t('subtitle')} compactTitle > <Layout> <Layout.Section> {setupCardMarkup} </Layout.Section> <Layout.Section variant="oneThird"> <BlockStack gap="400"> <Card> <Box padding="400"> <BlockStack gap="400"> <Text variant="headingMd" as="h2"> {t('support.title')} </Text> </BlockStack> </Box> {supportCardMarkup} </Card> <Card> <BlockStack gap="200"> <div style={{ display: 'flex', alignItems: 'center' }}> <div style={{ marginRight: '2px' }}> <Icon source={QuestionCircleIcon} tone="base" /> </div> <Text as="h3" variant="headingMd">Language</Text> </div> <Text as="p" tone="subdued"> Choose your preferred language for the application interface. </Text> <LanguageSelector /> </BlockStack> </Card> </BlockStack> </Layout.Section> </Layout> </Page> );

  // No debug background color needed now
  return (
    <>
      {pageMarkup}
      {toastMarkup}
      {modalMarkup}
    </>
  );
}
// --- END ORIGINAL COMPONENT CODE ---