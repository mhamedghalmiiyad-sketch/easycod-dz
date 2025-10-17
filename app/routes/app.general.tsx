import { useState, useCallback, useEffect, KeyboardEvent } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, Form, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  Checkbox,
  ChoiceList,
  TextField,
  Frame,
  Toast,
  Icon,
  InlineStack,
  Divider,
  Banner,
  Tooltip,
  Badge,
  Box,
  Collapsible,
  Grid,
  Select,
} from "@shopify/polaris";
import {
  ReplayIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "@shopify/polaris-icons";
import { getAuthenticate } from "../lib/shopify.lazy.server";
import { db } from "../db.server";
import { z, ZodIssue } from "zod";
import DOMPurify from 'isomorphic-dompurify';
import { initializeShopSettings } from "../utils/shopSettings";

// Define a clear interface for our settings (removed abandoned cart settings)
interface GeneralSettings {
  orderCreationMode: "cod" | "draft";
  saveUtmParameters: boolean;
  disableShopifyDiscounts: boolean;
  disableAutofill: boolean;
  trimLeadingZeroPhone: boolean;
  addOrderTag: boolean;
  redirectMode: "shopify" | "custom" | "whatsapp" | "message";
  redirectUrl: string;
  whatsappRedirectPhone: string;
  whatsappRedirectMessage: string;
  customThankYouMessage: string;
}

const generalSettingsSchema = z.object({
  orderCreationMode: z.enum(['cod', 'draft']),
  saveUtmParameters: z.boolean(),
  disableShopifyDiscounts: z.boolean(),
  disableAutofill: z.boolean(),
  trimLeadingZeroPhone: z.boolean(),
  addOrderTag: z.boolean(),
  redirectMode: z.enum(['shopify', 'custom', 'whatsapp', 'message']),
  redirectUrl: z.string().url({ message: "Must be a valid URL." }).or(z.literal('')),
  whatsappRedirectPhone: z.string().regex(/^\d{7,15}$/, "Invalid phone number. Use digits only.").or(z.literal('')),
  whatsappRedirectMessage: z.string().max(500, "Message is too long (max 500 characters)."),
  customThankYouMessage: z.string().max(1000, "Message is too long (max 1000 characters)."),
});

type ActionResponse =
  | { success: true; message: string; }
  | { success: false; error: string; };

const DEFAULT_SETTINGS: GeneralSettings = {
  orderCreationMode: "cod",
  saveUtmParameters: true,
  disableShopifyDiscounts: false,
  disableAutofill: false,
  trimLeadingZeroPhone: false,
  addOrderTag: true,
  redirectMode: "shopify",
  redirectUrl: "",
  whatsappRedirectPhone: "",
  whatsappRedirectMessage: "Hello, I have just completed my order with number {order_id}!",
  customThankYouMessage: "Thank you for your order! We will contact you shortly to confirm.",
};

const validateUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return true;
  try {
    const parsed = new URL(url.trim());
    const validProtocols = ['http:', 'https:'];
    if (!validProtocols.includes(parsed.protocol)) {
      return false;
    }
    if (!parsed.hostname || parsed.hostname === 'localhost') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const CACHE_TTL = 5 * 60 * 1000;
const settingsCache = new Map<string, { data: GeneralSettings; timestamp: number }>();

const getCachedSettings = async (sessionId: string): Promise<GeneralSettings> => {
  const cacheKey = `settings:${sessionId}`;
  const cached = settingsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("📦 Using cached settings");
    return cached.data;
  }

  try {
    const settings = await db.shopSettings.findUnique({
      where: { shopId: sessionId }
    });

    let parsedSettings: GeneralSettings;

    if (settings?.generalSettings) {
      try {
        const stored = JSON.parse(settings.generalSettings as string);
        parsedSettings = { ...DEFAULT_SETTINGS, ...stored };
      } catch (parseError) {
        console.error("Failed to parse stored settings, using defaults:", parseError);
        parsedSettings = DEFAULT_SETTINGS;
      }
    } else {
      console.log("No settings found, using defaults");
      parsedSettings = DEFAULT_SETTINGS;
    }

    settingsCache.set(cacheKey, { data: parsedSettings, timestamp: Date.now() });
    return parsedSettings;
  } catch (error) {
    console.error("Error fetching settings from database:", error);
    return DEFAULT_SETTINGS;
  }
};

const resetAllAppData = async (sessionId: string, shopDomain: string) => {
  console.log(`🔄 Starting full database reset for shop: ${shopDomain} (session: ${sessionId})`);
  
  try {
    settingsCache.clear();
    
    const tablesToReset = [
      'shopSettings',
      'orders',
      'products',
      'customers',
      'logs',
      'webhooks',
    ];

    for (const table of tablesToReset) {
      try {
        if (table === 'shopSettings') {
          await db.shopSettings.deleteMany({
            where: { shopId: shopDomain }
          });
        }
        console.log(`✅ Cleared table: ${table}`);
      } catch (tableError) {
        console.warn(`⚠️ Could not clear table ${table}:`, tableError);
      }
    }

    await initializeShopSettings(shopDomain);
    
    console.log(`✅ Database reset completed for shop: ${shopDomain}`);
    return true;
  } catch (error) {
    console.error(`❌ Database reset failed for shop: ${shopDomain}`, error);
    throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const authenticate = await getAuthenticate();
  const { session } = await authenticate.admin(request);
  console.log("🔍 Session ID:", session.id);
  console.log("🏪 Shop domain:", session.shop);
  
  await initializeShopSettings(session.shop);
  
  const generalSettings = await getCachedSettings(session.id);
  return json(generalSettings);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const authenticate = await getAuthenticate();
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    console.log("🔍 Session ID:", session.id);
    console.log("🏪 Shop domain:", session.shop);
    console.log("🎯 Action type:", actionType);

    let settingsToSave: GeneralSettings;

    if (actionType === "reset") {
      await resetAllAppData(session.id, session.shop);
      settingsToSave = DEFAULT_SETTINGS;
      console.log("🔄 Complete database reset performed");
    } else {
      await initializeShopSettings(session.shop);

      const rawSettings = {
        orderCreationMode: formData.get("orderCreationMode") as "cod" | "draft",
        saveUtmParameters: formData.get("saveUtmParameters") === "true",
        disableShopifyDiscounts: formData.get("disableShopifyDiscounts") === "true",
        disableAutofill: formData.get("disableAutofill") === "true",
        trimLeadingZeroPhone: formData.get("trimLeadingZeroPhone") === "true",
        addOrderTag: formData.get("addOrderTag") === "true",
        redirectMode: formData.get("redirectMode") as "shopify" | "custom" | "whatsapp" | "message",
        redirectUrl: (formData.get("redirectUrl") as string) || "",
        whatsappRedirectPhone: (formData.get("whatsappRedirectPhone") as string) || "",
        whatsappRedirectMessage: (formData.get("whatsappRedirectMessage") as string) || "Hello, I have just completed my order with number {order_id}!",
        customThankYouMessage: (formData.get("customThankYouMessage") as string) || "Thank you for your order! We will contact you shortly to confirm.",
      };

      console.log("📋 Raw settings received:", rawSettings);

      const validationResult = generalSettingsSchema.safeParse(rawSettings);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("❌ Validation failed:", errorMessage);
        return json({ success: false, error: `Validation failed: ${errorMessage}` }, { status: 400 });
      }

      settingsToSave = validationResult.data;

      if (settingsToSave.redirectMode === "custom" && settingsToSave.redirectUrl && !validateUrl(settingsToSave.redirectUrl)) {
        return json({ success: false, error: "Invalid redirect URL. Must be a valid http/https URL." }, { status: 400 });
      }

      settingsToSave.whatsappRedirectMessage = DOMPurify.sanitize(settingsToSave.whatsappRedirectMessage);
      settingsToSave.customThankYouMessage = DOMPurify.sanitize(settingsToSave.customThankYouMessage);
    }

    const previousSettings = await db.shopSettings.findUnique({ where: { shopId: session.shop } });

    await db.shopSettings.upsert({
      where: { shopId: session.shop },
      update: {
        generalSettings: JSON.stringify(settingsToSave),
        updatedAt: new Date()
      },
      create: {
        generalSettings: JSON.stringify(settingsToSave),
        Session: {
          connect: { id: session.id }
        }
      },
    });

    settingsCache.delete(`settings:${session.id}`);
    
    await logSettingsChange(session.shop, {
      from: previousSettings?.generalSettings || "{}",
      to: JSON.stringify(settingsToSave)
    }, session.id);

    const message = actionType === "reset" 
      ? "All app data has been reset to factory defaults. The application has been completely reinitialized." 
      : "General settings saved successfully!";
    console.log("✅ Settings saved successfully");
    return json({ success: true, message });

  } catch (error) {
    console.error('❌ General settings action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return json({
      success: false,
      error: `Failed to save settings: ${errorMessage}`
    }, { status: 500 });
  }
};

async function logSettingsChange(shop: string, changes: { from: string; to: string }, sessionId: string) {
  try {
    console.log(`⚙️ Settings changed for shop ${shop} (session: ${sessionId})`);
    console.log("📝 Changes:", {
      from: JSON.parse(changes.from),
      to: JSON.parse(changes.to)
    });
  } catch (error) {
    console.error('Failed to log settings change:', error);
  }
}

interface SettingsSectionProps {
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

function SettingsSection({
  title,
  description,
  badge,
  children,
  collapsible = false,
  defaultOpen = true,
}: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const collapsibleId = `${title.replace(/\s+/g, "-").toLowerCase()}-collapsible`;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const headerContent = (
    <InlineStack gap="200" blockAlign="center">
      <Text as="h2" variant="headingMd">{title}</Text>
      {badge && <Badge tone="info">{badge}</Badge>}
    </InlineStack>
  );

  const headerMarkup = collapsible ? (
    <div
      onClick={() => setIsOpen(!isOpen)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      aria-controls={collapsibleId}
      style={{ cursor: 'pointer' }}
    >
      <Box padding="400">
        <InlineStack blockAlign="center" align="space-between" wrap={false}>
          {headerContent}
          <Icon source={isOpen ? ChevronUpIcon : ChevronDownIcon} />
        </InlineStack>
      </Box>
    </div>
  ) : (
    <Box padding="400">{headerContent}</Box>
  );

  return (
    <Card>
      <BlockStack gap="0">
        {headerMarkup}
        {description && (
          <Box paddingBlockEnd="0" paddingBlockStart="0" paddingInlineStart="400" paddingInlineEnd="400">
            <Text as="p" tone="subdued" variant="bodyMd">{description}</Text>
          </Box>
        )}
        <Collapsible
          open={isOpen}
          id={collapsibleId}
          transition={{ duration: "300ms", timingFunction: "ease-in-out" }}
        >
          <Box padding="400" paddingBlockStart={description ? "300" : "400"}>
            <BlockStack gap="400">
              {children}
            </BlockStack>
          </Box>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}

const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true;
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 7 && cleanPhone.length <= 15;
};

export default function GeneralSettingsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResponse>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [formState, setFormState] = useState<GeneralSettings>(loaderData);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isLoading = navigation.state === "submitting" || navigation.state === "loading";
  const hasUnsavedChanges = JSON.stringify(formState) !== JSON.stringify(loaderData);

  const handleFormChange = useCallback((value: string | boolean | string[], name: keyof GeneralSettings) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const validateForm = useCallback(() => {
    const result = generalSettingsSchema.safeParse(formState);
    const errors: Record<string, string> = {};

    if (!result.success) {
      result.error.issues.forEach((err: ZodIssue) => {
        const field = err.path[0] as string;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
    }

    if (formState.redirectMode === 'whatsapp' && formState.whatsappRedirectPhone && !validatePhoneNumber(formState.whatsappRedirectPhone)) {
      errors.whatsappRedirectPhone = "Please enter a valid phone number (7-15 digits)";
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setToastMessage("Please fix the validation errors before saving.");
      setShowToast(true);
      return false;
    }

    setValidationErrors({});
    return true;
  }, [formState]);

  const handleSubmit = () => {
    if (!validateForm()) return;

    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      const formValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
      formData.append(key, formValue);
    });
    submit(formData, { method: "post" });
  };

  const handleDiscard = () => {
    setFormState(loaderData);
    setValidationErrors({});
  };

  const handleReset = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    const formData = new FormData();
    formData.append("_action", "reset");
    submit(formData, { method: "post" });
    setShowResetConfirm(false);
  };

  useEffect(() => {
    const saveBar = document.getElementById('general-settings-save-bar') as any;
    if (saveBar) {
      if (hasUnsavedChanges && !isLoading) {
        try {
          saveBar.show();
        } catch (error) {
          console.warn("Save bar 'show' method not available:", error);
        }
      } else {
        try {
          saveBar.hide();
        } catch (error) {
          console.warn("Save bar 'hide' method not available:", error);
        }
      }
    }
    return () => {
      if (saveBar) {
        try {
          saveBar.hide();
        } catch (error) {
        }
      }
    };
  }, [hasUnsavedChanges, isLoading]);

  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        setToastMessage(actionData.message);
        if (navigation.state === 'idle' && actionData.message?.includes("reset")) {
          setFormState(DEFAULT_SETTINGS);
        }
      } else {
        setToastMessage(actionData.error);
      }
      setShowToast(true);
    }
  }, [actionData, navigation.state]);

  const toastMarkup = showToast ? <Toast content={toastMessage} error={!!(actionData && !actionData.success) || Object.keys(validationErrors).length > 0} onDismiss={() => setShowToast(false)} /> : null;

  return (
    <>
      <ui-save-bar id="general-settings-save-bar">
        <button variant="primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button onClick={handleDiscard} disabled={isLoading}>
          Discard
        </button>
      </ui-save-bar>
        <Form method="post">
          <Layout>
            <Layout.Section>
              <BlockStack gap="500">
                {actionData && !showToast && (
                  <Banner
                    tone={actionData.success ? "success" : "critical"}
                    title={actionData.success ? "Settings Updated" : "Error"}
                  >
                    <Text as="p">{actionData.success ? actionData.message : actionData.error}</Text>
                  </Banner>
                )}

                <SettingsSection title="Order Processing" description="Configure how orders are created and processed.">
                  <ChoiceList
                    title="Order Creation Method"
                    choices={[
                      { label: "Create confirmed orders (Cash on Delivery)", value: "cod", helpText: "Best for immediate fulfillment." },
                      { label: "Save as draft orders", value: "draft", helpText: "Requires manual review and confirmation." },
                    ]}
                    selected={[formState.orderCreationMode]}
                    onChange={(value) => handleFormChange(value[0], "orderCreationMode")}
                  />
                  <Divider />
                  <Checkbox
                    label="Save UTM tracking parameters in order notes"
                    checked={formState.saveUtmParameters}
                    onChange={(checked) => handleFormChange(checked, "saveUtmParameters")}
                    helpText="Capture marketing campaign data (e.g., utm_source)."
                  />
                  <Checkbox
                    label="Add 'releasit_cod_form' tag to new orders"
                    checked={formState.addOrderTag}
                    onChange={(checked) => handleFormChange(checked, "addOrderTag")}
                    helpText="Useful for filtering and automating workflows."
                  />
                </SettingsSection>

                <SettingsSection title="Form Behavior" description="Customize how the form appears to customers.">
                  <Checkbox
                    label="Disable Shopify automatic discounts on the form"
                    checked={formState.disableShopifyDiscounts}
                    onChange={(checked) => handleFormChange(checked, "disableShopifyDiscounts")}
                    helpText="Prevents automatic discounts from applying."
                  />
                  <Checkbox
                    label="Disable browser autofill and autocomplete"
                    checked={formState.disableAutofill}
                    onChange={(checked) => handleFormChange(checked, "disableAutofill")}
                    helpText="Can prevent incorrect information but adds friction."
                  />
                  <Checkbox
                    label="Remove leading zero from phone numbers"
                    checked={formState.trimLeadingZeroPhone}
                    onChange={(checked) => handleFormChange(checked, "trimLeadingZeroPhone")}
                    helpText="Standardizes phone numbers (e.g., 055... becomes 55...)."
                  />
                </SettingsSection>

                {/* Removed collapsible prop to make it always open */}
                <SettingsSection title="After-Purchase Experience" description="Define what happens after customers place an order.">
                  <ChoiceList
                    title="Post-purchase redirect"
                    choices={[
                      { label: "Shopify thank you page", value: "shopify", helpText: "Default order confirmation page." },
                      { label: "Custom redirect URL", value: "custom", helpText: "Redirect to your own upsell/thank you page." },
                      { label: "WhatsApp conversation", value: "whatsapp", helpText: "Start a WhatsApp chat with a pre-filled message." },
                      { label: "Custom message overlay", value: "message", helpText: "Display a message without leaving the page." },
                    ]}
                    selected={[formState.redirectMode]}
                    onChange={(value) => handleFormChange(value[0], "redirectMode")}
                  />
                  {formState.redirectMode === "custom" && (
                    <TextField
                      label="Custom Redirect URL"
                      value={formState.redirectUrl}
                      onChange={(value) => handleFormChange(value, "redirectUrl")}
                      placeholder="https://yourstore.com/pages/thank-you"
                      autoComplete="off"
                      helpText="Must be a valid URL starting with https://"
                      error={validationErrors.redirectUrl}
                    />
                  )}
                  {formState.redirectMode === "whatsapp" && (
                    <BlockStack gap="400">
                      <TextField
                        label="WhatsApp Phone Number"
                        value={formState.whatsappRedirectPhone}
                        onChange={(value) => handleFormChange(value, "whatsappRedirectPhone")}
                        placeholder="15551234567"
                        autoComplete="off"
                        helpText="Include country code without '+' (e.g., 213 for Algeria)."
                        error={validationErrors.whatsappRedirectPhone}
                      />
                      <TextField
                        label="WhatsApp Message"
                        value={formState.whatsappRedirectMessage}
                        onChange={(value) => handleFormChange(value, "whatsappRedirectMessage")}
                        multiline={3}
                        autoComplete="off"
                        helpText="Use {order_id} to include the order number."
                        error={validationErrors.whatsappRedirectMessage}
                      />
                    </BlockStack>
                  )}
                  {formState.redirectMode === "message" && (
                    <TextField
                      label="Custom Thank You Message"
                      value={formState.customThankYouMessage}
                      onChange={(value) => handleFormChange(value, "customThankYouMessage")}
                      multiline={4}
                      autoComplete="off"
                      helpText="This message is displayed to customers after they order."
                      error={validationErrors.customThankYouMessage}
                    />
                  )}
                </SettingsSection>

              </BlockStack>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <BlockStack gap="500">
                <Card>
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center" align="start">
                      <Icon source={AlertTriangleIcon} tone="critical" />
                      <Text as="h3" variant="headingMd">Reset All App Data</Text>
                    </InlineStack>
                    <Text as="p" tone="subdued">
                      This will completely reset your entire application database - all orders, customers, settings, and configurations will be permanently deleted. This is equivalent to a fresh installation.
                    </Text>
                    {showResetConfirm ? (
                      <BlockStack gap="300">
                        <Banner tone="critical">
                          <Text as="p" variant="bodyMd" fontWeight="bold">
                            WARNING: This will delete ALL your app data permanently!
                          </Text>
                          <Text as="p" variant="bodyMd">
                            This includes: orders, customers, logs, webhooks, and all settings. This action cannot be undone.
                          </Text>
                        </Banner>
                        <InlineStack gap="300" align="end">
                          <Button onClick={() => setShowResetConfirm(false)} disabled={isLoading}>Cancel</Button>
                          <Button onClick={handleReset} loading={isLoading} tone="critical">Yes, Delete Everything</Button>
                        </InlineStack>
                      </BlockStack>
                    ) : (
                      <Button fullWidth onClick={handleReset} loading={isLoading} tone="critical" icon={ReplayIcon}>
                        Reset All App Data
                      </Button>
                    )}
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">Current Configuration</Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" tone="subdued">Order Mode:</Text>
                      <Badge tone={formState.orderCreationMode === "cod" ? "success" : "attention"}>
                        {formState.orderCreationMode === "cod" ? "COD Orders" : "Draft Orders"}
                      </Badge>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" tone="subdued">Redirect:</Text>
                      <Badge tone="info">
                        {{
                          shopify: "Shopify Page",
                          custom: "Custom URL",
                          whatsapp: "WhatsApp",
                          message: "Custom Message",
                        }[formState.redirectMode]}
                      </Badge>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>
        </Form>
        {toastMarkup}
    </>
  );
}
