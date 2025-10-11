import {
  getShopSettings,
  upsertShopSettings,
} from "~/utils/shopSettings";
import {
  Card,
  Page,
  TextField,
  Button,
  FormLayout,
  Text,
  BlockStack,
  Checkbox,
  Select,
  List,
  Link,
  Layout,
  Box,
  Badge,
  Icon,
  InlineStack,
  Divider,
  Toast,
  Frame,
  Banner,
  Tooltip,
  Tabs,
} from "@shopify/polaris";
import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import {
  useLoaderData,
  useSubmit,
  useActionData,
  Form,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getLanguageFromRequest, getTranslations, isRTL } from "../utils/i18n.server";
import {
  QuestionCircleIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ExternalIcon,
  SettingsIcon,
  ViewIcon,
} from "@shopify/polaris-icons";
import db from "../db.server";

// Type definition for ui-save-bar element (using any to bypass type conflicts)
interface UISaveBarElement extends HTMLElement {
  show(): Promise<void>;
  hide(): Promise<void>;
  toggle(): Promise<void>;
  showing: boolean;
  discardConfirmation: boolean;
}

// Define the pixel settings interface
interface PixelSettings {
  facebookPixelId?: string;
  googlePixelId?: string;
  tiktokPixelId?: string;
  snapchatPixelId?: string;
  pinterestPixelId?: string;
  sharechatPixelId?: string;
  taboolaPixelId?: string;
  kwaiPixelId?: string;
  sendFbAddToCart?: boolean;
  sendFbAddPaymentInfo?: boolean;
  disableAllEvents?: boolean;
  fbPurchaseEvent?: string;
  sendPinterestAddToCart?: boolean;
}

// Define the shape of what getShopSettings returns from database
interface DatabaseShopSettings {
  id: number;
  shopId: string;
  formFields: string | null;
  formStyle: string | null;
  shippingRates: string | null;
  pixelSettings: string | null; // JSON string from database
  createdAt: Date;
  updatedAt: Date;
}

// Database-connected loader using the utility function
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const language = await getLanguageFromRequest(request);
  const translations = await getTranslations(language);
  const rtl = isRTL(language);
  
  const settings: DatabaseShopSettings | null = await getShopSettings(session.shop);

  // Parse the JSON string and provide proper typing
  let pixelSettings: PixelSettings = {};
  
  if (settings?.pixelSettings) {
    try {
      pixelSettings = JSON.parse(settings.pixelSettings) as PixelSettings;
    } catch (error) {
      console.error('Failed to parse pixelSettings JSON:', error);
      pixelSettings = {};
    }
  }

  return json({
    // Provide default values for every setting to prevent undefined errors
    facebookPixelId: pixelSettings.facebookPixelId || "",
    googlePixelId: pixelSettings.googlePixelId || "",
    tiktokPixelId: pixelSettings.tiktokPixelId || "",
    snapchatPixelId: pixelSettings.snapchatPixelId || "",
    pinterestPixelId: pixelSettings.pinterestPixelId || "",
    sharechatPixelId: pixelSettings.sharechatPixelId || "",
    taboolaPixelId: pixelSettings.taboolaPixelId || "",
    kwaiPixelId: pixelSettings.kwaiPixelId || "",
    sendFbAddToCart: pixelSettings.sendFbAddToCart ?? true,
    sendFbAddPaymentInfo: pixelSettings.sendFbAddPaymentInfo ?? false,
    disableAllEvents: pixelSettings.disableAllEvents ?? false,
    fbPurchaseEvent: pixelSettings.fbPurchaseEvent || "Purchase",
    sendPinterestAddToCart: pixelSettings.sendPinterestAddToCart ?? true,
    language,
    translations,
    rtl,
  });
};

// Database-connected action using the utility function
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  // Convert FormData to a settings object
  const pixelSettings: PixelSettings = {
    facebookPixelId: formData.get("facebookPixelId") as string,
    googlePixelId: formData.get("googlePixelId") as string,
    tiktokPixelId: formData.get("tiktokPixelId") as string,
    snapchatPixelId: formData.get("snapchatPixelId") as string,
    pinterestPixelId: formData.get("pinterestPixelId") as string,
    sharechatPixelId: formData.get("sharechatPixelId") as string,
    taboolaPixelId: formData.get("taboolaPixelId") as string,
    kwaiPixelId: formData.get("kwaiPixelId") as string,
    sendFbAddToCart: formData.get("sendFbAddToCart") === "true",
    sendFbAddPaymentInfo: formData.get("sendFbAddPaymentInfo") === "true",
    disableAllEvents: formData.get("disableAllEvents") === "true",
    fbPurchaseEvent: formData.get("fbPurchaseEvent") as string,
    sendPinterestAddToCart: formData.get("sendPinterestAddToCart") === "true",
  };

  // Use the utility function to correctly upsert the settings object
  await upsertShopSettings(session.shop, { pixelSettings });

  return json({ success: true, message: "Settings saved successfully!" });
};

// Platform configurations moved inside component

// Define the form state type based on loader return
type FormState = {
  facebookPixelId: string;
  googlePixelId: string;
  tiktokPixelId: string;
  snapchatPixelId: string;
  pinterestPixelId: string;
  sharechatPixelId: string;
  taboolaPixelId: string;
  kwaiPixelId: string;
  sendFbAddToCart: boolean;
  sendFbAddPaymentInfo: boolean;
  disableAllEvents: boolean;
  fbPurchaseEvent: string;
  sendPinterestAddToCart: boolean;
};

// Custom hook to detect form changes
function useFormChanges(initialData: FormState, currentData: FormState) {
  const hasChanges = JSON.stringify(initialData) !== JSON.stringify(currentData);
  return hasChanges;
}

// The React component for your page
export default function PixelsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const { t } = useTranslation('pixels');
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  // Platform configurations with translations
  const PLATFORMS = [
    {
      name: t('platforms.facebook'),
      key: "facebookPixelId" as const,
      label: "Facebook Pixel ID",
      placeholder: "123456789012345",
      color: "#1877F2",
      iconUrl: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
      events: ["InitiateCheckout", "Purchase", "AddToCart", "AddPaymentInfo"],
      helpText: t('helpText.facebook'),
      category: "primary",
    },
    {
      name: t('platforms.googleAnalytics'),
      key: "googlePixelId" as const,
      label: "Google Analytics ID",
      placeholder: "G-XXXXXXXXXX",
      color: "#4285F4",
      iconUrl: "https://cdn-icons-png.flaticon.com/512/732/732204.png",
      events: ["begin_checkout", "purchase"],
      helpText: t('helpText.googleAnalytics'),
      category: "primary",
    },
    {
      name: t('platforms.tiktok'),
      key: "tiktokPixelId" as const,
      label: "TikTok Pixel ID",
      placeholder: "C13XXXXXXXXXXXXXXXXXX",
      color: "#000000",
      iconUrl: "https://cdn-icons-png.flaticon.com/512/3046/3046120.png",
      events: ["InitiateCheckout", "PlaceAnOrder", "CompletePayment"],
      helpText: t('helpText.tiktok'),
      category: "primary",
    },
    {
      name: t('platforms.snapchat'),
      key: "snapchatPixelId" as const,
      label: "Snapchat Pixel ID",
      placeholder: "12345678-1234-1234-1234-123456789012",
      color: "#FFFC00",
      iconUrl: "https://cdn-icons-png.flaticon.com/128/15707/15707784.png",
      events: ["START_CHECKOUT", "PURCHASE"],
      helpText: t('helpText.snapchat'),
      category: "additional",
    },
    {
      name: t('platforms.pinterest'),
      key: "pinterestPixelId" as const,
      label: "Pinterest Tag ID",
      placeholder: "2612345678901",
      color: "#E60023",
      iconUrl: "https://cdn-icons-png.flaticon.com/512/145/145808.png",
      events: ["Checkout", "AddToCart"],
      helpText: t('helpText.pinterest'),
      category: "additional",
    },
  ];

  // State for all form fields, initialized from loader data
  const [formState, setFormState] = useState<FormState>(loaderData);
  const [initialFormState, setInitialFormState] = useState<FormState>(loaderData); // Keep initial state for comparison
  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedTab, setSelectedTab] = useState(0);

  // Save bar ref (using any to bypass Shopify's type conflicts)
  const saveBarRef = useRef<any>(null);

  // Check for unsaved changes
  const hasUnsavedChanges = useFormChanges(initialFormState, formState);

  // Calculate configured pixels for status
  const configuredPixels = PLATFORMS.filter(
    (platform) => formState[platform.key],
  ).length;

  const handleInputChange = useCallback(
    (value: string, name: string) => {
      setFormState((prev) => ({ ...prev, [name]: value }));
      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors],
  );

  const handleCheckboxChange = useCallback((checked: boolean, name: string) => {
    setFormState((prev) => ({ ...prev, [name]: checked }));
  }, []);

  // Show/hide save bar based on changes
  useEffect(() => {
    const saveBarElement = saveBarRef.current;
    if (!saveBarElement) return;

    if (hasUnsavedChanges) {
      saveBarElement.show();
    } else {
      saveBarElement.hide();
    }
  }, [hasUnsavedChanges]);

  // Validate pixel IDs
  const validatePixelId = (value: string, platform: typeof PLATFORMS[0]) => {
    if (!value) return "";

    switch (platform.name) {
      case "Facebook":
        return /^\d{15,16}$/.test(value)
          ? ""
          : "Facebook Pixel ID should be 15-16 digits";
      case "Google Analytics":
        return /^G-[A-Z0-9]{10}$/.test(value)
          ? ""
          : "Google Analytics ID should start with 'G-' followed by 10 characters";
      case "TikTok":
        return /^C[A-Z0-9]{20,}$/.test(value)
          ? ""
          : "TikTok Pixel ID should start with 'C' followed by alphanumeric characters";
      case "Snapchat":
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
          ? ""
          : "Snapchat Pixel ID should be in UUID format";
      default:
        return "";
    }
  };

  const handleSave = useCallback(() => {
    // Validate all fields
    const newErrors: Record<string, string> = {};
    PLATFORMS.forEach((platform) => {
      const value = formState[platform.key];
      const error = validatePixelId(value, platform);
      if (error) {
        newErrors[platform.key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    submit(formState as any, { method: "post", replace: true });
  }, [formState, submit]);

  const handleDiscard = useCallback(() => {
    setFormState(initialFormState);
    setErrors({});
  }, [initialFormState]);

  // Show toast on successful save and update initial state
  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);
      setIsLoading(false);
      // Update initial state to current state after successful save
      setInitialFormState(formState);
    }
  }, [actionData,formState]);

  const fbPurchaseOptions = [
    { label: "Purchase", value: "Purchase" },
    { label: "Custom Event", value: "Custom" },
  ];

  const getPixelStatus = (pixelId: string) => {
    if (!pixelId) return { status: "not-configured", badge: null };
    return {
      status: "configured",
      badge: <Badge tone="success">Active</Badge>,
    };
  };

  const renderPlatformCard = (platform: typeof PLATFORMS[0]) => {
    const pixelValue = formState[platform.key];
    const pixelStatus = getPixelStatus(pixelValue);
    const error = errors[platform.key];

    return (
      <Card key={platform.key}>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ marginRight: '2px' }}>
                <img 
                  src={platform.iconUrl} 
                  alt={platform.name}
                  style={{ 
                    width: 16, 
                    height: 16,
                    objectFit: 'contain'
                  }}
                />
              </div>
              <Text as="h3" variant="headingMd">
                {platform.name}
              </Text>
            </div>
            {pixelStatus.badge}
          </InlineStack>

          <TextField
            label={platform.label}
            name={platform.key}
            value={pixelValue}
            onChange={(val) => handleInputChange(val, platform.key)}
            placeholder={platform.placeholder}
            helpText={platform.helpText}
            error={error}
            autoComplete="off"
          />

          {pixelValue && (
            <Box background="bg-surface-secondary" padding="300" borderRadius="200">
              <Text as="p" variant="bodyXs" tone="subdued">
                Tracked Events: {platform.events.join(", ")}
              </Text>
            </Box>
          )}
        </BlockStack>
      </Card>
    );
  };

  const tabs = [
    {
      id: "platforms",
      content: "Platforms",
      accessibilityLabel: "Platform configuration",
      panelID: "platforms-panel",
    },
    {
      id: "events",
      content: "Events",
      accessibilityLabel: "Event configuration",
      panelID: "events-panel",
    },
    {
      id: "settings",
      content: "Settings",
      accessibilityLabel: "Global settings",
      panelID: "settings-panel",
    },
  ];

  const toastMarkup = showToast ? (
    <Toast
      content="Settings saved successfully!"
      onDismiss={() => setShowToast(false)}
    />
  ) : null;

  return (
    <Frame>
      {toastMarkup}
      
      {/* Save Bar Component */}
      <ui-save-bar 
        ref={saveBarRef} 
        id="pixel-save-bar" 
        discardConfirmation={hasUnsavedChanges}
      >
        <button variant="primary" onClick={handleSave} disabled={isLoading}>
          {isLoading ? t('common:saving') : t('common:save')}
        </button>
        <button onClick={handleDiscard}>
          {t('common:discard')}
        </button>
      </ui-save-bar>
        <Form method="post">
          <Layout>
          <Layout.Section>
            <BlockStack gap="600">
              {/* Overview Card */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg">
                      Analytics Overview
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ marginRight: '2px' }}>
                        <Icon source={ViewIcon} tone="base" />
                      </div>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {configuredPixels === 0
                          ? "No platforms configured"
                          : `${configuredPixels} platform${configuredPixels !== 1 ? 's' : ''} active`
                        }
                      </Text>
                    </div>
                  </InlineStack>

                  <Text as="p" variant="bodyMd" tone="subdued">
                    Set up your analytics pixels to track form interactions, conversions, and customer behavior across different advertising platforms.
                  </Text>

                  {formState.disableAllEvents && (
                    <Banner tone="critical">
                      <Text as="p" variant="bodyMd">
                        All event tracking is currently disabled. Enable tracking to start collecting analytics data.
                      </Text>
                    </Banner>
                  )}
                </BlockStack>
              </Card>

              {/* Tabbed Interface */}
              <Card>
                <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                  <Box padding="500">
                    {selectedTab === 0 && (
                      <BlockStack gap="500">
                        <Text as="h2" variant="headingMd">
                          Platform Configuration
                        </Text>

                        {/* Primary Platforms */}
                        <BlockStack gap="400">
                          <Text as="h3" variant="headingSm" tone="subdued">
                            Primary Platforms
                          </Text>
                          <FormLayout>
                            {PLATFORMS.filter(p => p.category === "primary").map(renderPlatformCard)}
                          </FormLayout>
                        </BlockStack>

                        {/* Additional Platforms */}
                        <BlockStack gap="400">
                          <Text as="h3" variant="headingSm" tone="subdued">
                            Additional Platforms
                          </Text>
                          <FormLayout>
                            <FormLayout.Group>
                              {PLATFORMS.filter(p => p.category === "additional").map(renderPlatformCard)}
                            </FormLayout.Group>
                          </FormLayout>
                        </BlockStack>
                      </BlockStack>
                    )}

                    {selectedTab === 1 && (
                      <BlockStack gap="500">
                        <Text as="h2" variant="headingMd">
                          Event Configuration
                        </Text>

                        <FormLayout>
                          <Select
                            label="Facebook Purchase Event Type"
                            options={fbPurchaseOptions}
                            onChange={(val) => handleInputChange(val, "fbPurchaseEvent")}
                            value={formState.fbPurchaseEvent}
                            helpText="Choose how purchase events are sent to Facebook"
                          />

                          <Card>
                            <BlockStack gap="400">
                              <Text as="h3" variant="headingMd">
                                Facebook Events
                              </Text>
                              <BlockStack gap="300">
                                <Checkbox
                                  label="Send AddToCart events"
                                  checked={formState.sendFbAddToCart}
                                  onChange={(checked) => handleCheckboxChange(checked, "sendFbAddToCart")}
                                  name="sendFbAddToCart"
                                  helpText="Track when customers add items to their cart"
                                />
                                <Checkbox
                                  label="Send AddPaymentInfo events"
                                  checked={formState.sendFbAddPaymentInfo}
                                  onChange={(checked) => handleCheckboxChange(checked, "sendFbAddPaymentInfo")}
                                  name="sendFbAddPaymentInfo"
                                  helpText="Track when customers enter payment information"
                                />
                              </BlockStack>
                            </BlockStack>
                          </Card>

                          <Card>
                            <BlockStack gap="400">
                              <Text as="h3" variant="headingMd">
                                Pinterest Events
                              </Text>
                              <Checkbox
                                label="Send AddToCart events to Pinterest"
                                checked={formState.sendPinterestAddToCart}
                                onChange={(checked) => handleCheckboxChange(checked, "sendPinterestAddToCart")}
                                name="sendPinterestAddToCart"
                                helpText="Track Pinterest add-to-cart events"
                              />
                            </BlockStack>
                          </Card>
                        </FormLayout>
                      </BlockStack>
                    )}

                    {selectedTab === 2 && (
                      <BlockStack gap="500">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ marginRight: '2px' }}>
                            <Icon source={SettingsIcon} tone="base" />
                          </div>
                          <Text as="h2" variant="headingMd">Global Settings</Text>
                        </div>

                        <Banner tone="warning">
                          <Text as="p" variant="bodyMd">
                            Disabling all events will stop tracking across all platforms. This action affects all configured pixels.
                          </Text>
                        </Banner>

                        <Card>
                          <BlockStack gap="400">
                            <Checkbox
                              label="Disable all event tracking"
                              checked={formState.disableAllEvents}
                              onChange={(checked) => handleCheckboxChange(checked, "disableAllEvents")}
                              name="disableAllEvents"
                              helpText="This will disable all pixel events sent by the app across all platforms"
                            />
                          </BlockStack>
                        </Card>
                      </BlockStack>
                    )}
                  </Box>
                </Tabs>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Enhanced Sidebar */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              {/* Status Card */}
              <Card>
                <BlockStack gap="400">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ marginRight: '2px' }}>
                      <Icon
                        source={configuredPixels > 0 ? CheckCircleIcon : AlertCircleIcon}
                        tone={configuredPixels > 0 ? "success" : "base"}
                      />
                    </div>
                    <Text as="h3" variant="headingMd">Configuration Status</Text>
                  </div>

                  <BlockStack gap="300">
                    {PLATFORMS.map((platform) => {
                      const isConfigured = !!formState[platform.key];
                      return (
                        <InlineStack key={platform.key} align="space-between" blockAlign="center">
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ marginRight: '4px' }}>
                              <img 
                                src={platform.iconUrl} 
                                alt={platform.name}
                                style={{ 
                                  width: 12, 
                                  height: 12,
                                  objectFit: 'contain',
                                  opacity: isConfigured ? 1 : 0.5
                                }}
                              />
                            </div>
                            <Text as="span" variant="bodySm">
                              {platform.name}
                            </Text>
                          </div>
                          <Badge tone={isConfigured ? "success" : "info"}>
                            {isConfigured ? "Active" : "Not set"}
                          </Badge>
                        </InlineStack>
                      );
                    })}
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Quick Help */}
              <Card>
                <BlockStack gap="400">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ marginRight: '2px' }}>
                      <Icon source={QuestionCircleIcon} tone="base" />
                    </div>
                    <Text as="h3" variant="headingMd">Quick Setup</Text>
                  </div>

                  <Text as="p" variant="bodyMd" tone="subdued">
                    Already have pixels configured in Shopify? This app will work with your existing setup automatically.
                  </Text>

                  <Text as="p" variant="bodyMd" tone="subdued">
                    Add additional pixels here only if you need tracking beyond your current Shopify configuration.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
          </Layout>
        </Form>
    </Frame>
  );
}