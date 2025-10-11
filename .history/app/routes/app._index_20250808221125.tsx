// app/routes/app._index.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Box,
  ProgressBar,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// --- INTERFACES & TYPES ---
interface SetupStep {
  id: string;
  title: string;
  description: string;
  url: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  isEmbedWidget?: boolean; // Flag for embed widget step
}

interface SupportItem {
  id: string;
  title: string;
  description: string;
  url: string;
  icon?: any;
}

// --- HELPER FUNCTIONS ---
function isFormFieldsConfigured(formFields: string | null): boolean {
  if (!formFields || formFields === "[]") return false;
  try {
    const fields = JSON.parse(formFields);
    const essentialFields = ['first-name', 'last-name', 'phone', 'address', 'city'];
    const fieldIds = fields.map((f: any) => f.id);
    return essentialFields.every(field => fieldIds.includes(field));
  } catch {
    return false;
  }
}

// This is a placeholder - you would implement logic to check if the embed is truly enabled.
// For example, by using the Shopify Admin API to check the theme's settings_data.json.
function isEmbedWidgetEnabled(shopSettings: any): boolean {
  return shopSettings?.embedEnabled || false;
}

const calculateSetupProgress = (shopSettings: any) => {
  const stepData: SetupStep[] = [
    {
      id: "embed_widget",
      title: "Setup embed widget",
      description: "Enable the app embed block from theme Customizer",
      url: "/app/embed", // This URL is not used directly for this step
      completed: isEmbedWidgetEnabled(shopSettings),
      priority: "high",
      isEmbedWidget: true,
    },
    {
      id: "configure_cod",
      title: "Setup COD",
      description: "Configure settings",
      url: "/app/general",
      completed: true, // Assuming this is always complete for this example
      priority: "high",
    },
    {
      id: "customize_form",
      title: "Customize COD Form",
      description: "Customize your COD Form with one click.",
      url: "/app/form-designer",
      completed: isFormFieldsConfigured(shopSettings?.formFields || null),
      priority: "high",
    },
  ];

  const completedSteps = stepData.filter(step => step.completed).length;
  const totalSteps = stepData.length;
  const setupProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return { setupSteps, completedSteps, totalSteps, setupProgress };
};

// --- LOADER ---
// The loader runs on the server and can safely access environment variables.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
  });

  const { setupSteps, completedSteps, totalSteps, setupProgress } = calculateSetupProgress(shopSettings);

  const supportItems: SupportItem[] = [
    {
      id: "installation",
      title: "Get support",
      description: "Installation & Help center\nExplore our app installation page for detailed guide.",
      url: "/app/help",
    },
    {
      id: "faq",
      title: "FAQ & Help center",
      description: "Get quick answers and support in our Help Center.",
      url: "/app/faq",
    },
    {
      id: "live_chat",
      title: "24/7 live chat support",
      description: "Our expert support team is always ready to help.",
      url: "/app/support",
    },
  ];

  // We return the API key from the server's environment variables in the JSON payload.
  return json({
    setupSteps,
    setupProgress,
    completedSteps,
    totalSteps,
    supportItems,
    shopDomain: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY, // Pass the key to the component
  });
};

// --- MAIN COMPONENT ---
export default function DashboardPage() {
  const navigate = useNavigate();
  
  // The component receives the apiKey from the loader via the useLoaderData hook.
  const {
    setupSteps,
    setupProgress,
    completedSteps,
    totalSteps,
    supportItems,
    shopDomain,
    apiKey, // Receive the API key from the loader
  } = useLoaderData<typeof loader>();

  // This function now uses the apiKey passed from the server.
  const generateEmbedDeepLink = () => {
    const EMBED_HANDLE = "app-embed"; // Must match your extension block file name (e.g., app-embed.liquid)

    if (!apiKey) {
      console.error("Shopify API Key is missing from loader data. Ensure it's in your .env file.");
      alert("Configuration error: Could not find the app's API Key. Please restart the server and try again.");
      return;
    }
    
    const deepLinkUrl = `https://${shopDomain}/admin/themes/current/editor?context=apps&activateAppId=${apiKey}/${EMBED_HANDLE}`;
    
    // Open the theme editor in a new tab
    window.open(deepLinkUrl, '_blank');
  };

  const handleStepClick = (step: SetupStep) => {
    if (step.isEmbedWidget) {
      generateEmbedDeepLink();
    } else {
      navigate(step.url);
    }
  };

  return (
    <Page fullWidth>
      <BlockStack gap="600">
        {/* Hero Header */}
        <Card>
          <Box padding="600">
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '40px',
              color: 'white',
              textAlign: 'center'
            }}>
              <Text as="h1" variant="heading2xl" fontWeight="bold">
                Dashboard
              </Text>
              <Box paddingBlockStart="200">
                <Text as="p" variant="bodyLg">
                  This page is ready
                </Text>
              </Box>
            </div>
          </Box>
        </Card>

        <Layout>
          {/* Setup Guide Section */}
          <Layout.Section>
            <Card>
              <Box padding="600">
                <BlockStack gap="600">
                  {/* Setup Guide Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
                    borderRadius: '16px',
                    padding: '32px',
                    textAlign: 'center',
                    border: '2px solid #E2E8F0'
                  }}>
                    <Text as="h2" variant="headingXl" fontWeight="bold">
                      Setup Guide
                    </Text>
                    <Box paddingBlockStart="200">
                      <Text as="p" variant="bodyLg" tone="subdued">
                        Use this personalized guide to get your app up and running.
                      </Text>
                    </Box>
                    <Box paddingBlockStart="400">
                      <InlineStack gap="400" align="center" inlineAlign="center" blockAlign="center">
                        <Text as="p" variant="headingMd" fontWeight="bold">
                          {completedSteps} / {totalSteps} completed
                        </Text>
                        <Badge tone="success" size="large">
                          {setupProgress.toFixed(0)}%
                        </Badge>
                      </InlineStack>
                    </Box>
                    <Box paddingBlockStart="400">
                      <ProgressBar progress={setupProgress} tone="primary" size="large" />
                    </Box>
                  </div>

                  {/* Setup Steps */}
                  <BlockStack gap="400">
                    {setupSteps.map((step, index) => (
                      <SetupStepCard 
                        key={step.id}
                        step={step}
                        stepNumber={index + 1}
                        onClick={() => handleStepClick(step)}
                      />
                    ))}
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Support Section */}
          <Layout.Section variant="oneThird">
            <Card>
              <Box padding="600">
                <BlockStack gap="600">
                  {/* Support Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <Text as="h3" variant="headingLg" fontWeight="bold">
                      Support
                    </Text>
                  </div>

                  {/* Support Items */}
                  <BlockStack gap="400">
                    {supportItems.map((item) => (
                      <SupportCard 
                        key={item.id}
                        item={item}
                        onClick={() => navigate(item.url)}
                      />
                    ))}
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

// --- SETUP STEP CARD ---
function SetupStepCard({ step, stepNumber, onClick }: {
  step: SetupStep;
  stepNumber: number;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      style={{
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        boxShadow: isHovered ? '0 8px 32px rgba(0, 0, 0, 0.12)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={onClick}
        style={{
          padding: '24px',
          borderRadius: '12px',
          border: step.completed 
            ? '2px solid #10B981' 
            : '2px solid #E5E7EB',
          background: step.completed 
            ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' 
            : 'white',
          cursor: 'pointer',
        }}
      >
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="400" blockAlign="center">
            {/* Step Icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: step.completed 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: step.completed ? '0 4px 16px rgba(16, 185, 129, 0.3)' : 'none'
            }}>
              {step.completed ? (
                <div style={{ color: 'white', fontSize: '20px' }}>✅</div>
              ) : (
                <div style={{
                  color: '#6B7280',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  {stepNumber}
                </div>
              )}
            </div>
            
            {/* Step Content */}
            <BlockStack gap="100">
              <Text as="p" variant="headingMd" fontWeight="semibold">
                {step.title}
                {step.isEmbedWidget && !step.completed && (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '12px', 
                    padding: '2px 6px', 
                    background: '#667eea', 
                    color: 'white', 
                    borderRadius: '4px' 
                  }}>
                    Opens Theme Editor
                  </span>
                )}
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {step.description}
              </Text>
            </BlockStack>
          </InlineStack>
          
          {/* Status Badge */}
          <div style={{
            padding: '8px 16px',
            borderRadius: '20px',
            background: step.completed 
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              : '#F9FAFB',
            color: step.completed ? 'white' : '#6B7280',
            fontSize: '14px',
            fontWeight: '600',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            {step.completed ? '✅ Done' : (step.isEmbedWidget ? '🔗 Setup' : '⏳ Todo')}
          </div>
        </InlineStack>
      </div>
    </div>
  );
}

// --- SUPPORT CARD ---
function SupportCard({ item, onClick }: {
  item: SupportItem;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      style={{
        transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={onClick}
        style={{
          padding: '20px',
          borderRadius: '12px',
          background: isHovered 
            ? 'linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)'
            : 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
          border: `2px solid ${isHovered ? '#667eea' : '#E2E8F0'}`,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {isHovered && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: '#667eea',
            borderRadius: '0 4px 4px 0'
          }} />
        )}
        
        <InlineStack gap="400" blockAlign="start">
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#667eea20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <div style={{ fontSize: '20px' }}>
              {item.id === 'installation' ? '📖' : 
               item.id === 'faq' ? '❓' : '💬'}
            </div>
          </div>
          <BlockStack gap="200">
            <Text as="p" variant="bodyLg" fontWeight="semibold">
              {item.title}
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              {item.description}
            </Text>
          </BlockStack>
        </InlineStack>
      </div>
    </div>
  );
}
