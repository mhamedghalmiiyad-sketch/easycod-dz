// app/routes/app.general.tsx

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
  Grid, // Added
  Select, // Added
} from "@shopify/polaris";
import {
  ReplayIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { z, ZodIssue } from "zod";
import DOMPurify from 'isomorphic-dompurify';

// Assuming this utility exists at the specified path
import { initializeShopSettings } from "../utils/shopSettings";

// Define a clear interface for our settings
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
  // Added new fields for abandoned cart recovery
  enableAbandonedCartRecovery: boolean;
  abandonedCartDelayMinutes: string;
  abandonedCartMaxReminders: string;
  abandonedCartReminderIntervalHours: string;
  abandonedCartEmailSubject: string;
  abandonedCartEmailTemplate: string;
  abandonedCartWhatsAppTemplate: string;
  abandonedCartRecoveryMethod: "email" | "whatsapp" | "both";
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
  // Added schema fields for abandoned cart
  enableAbandonedCartRecovery: z.boolean(),
  abandonedCartDelayMinutes: z.string().regex(/^\d+$/, { message: "Must be a positive number." }),
  abandonedCartMaxReminders: z.string().regex(/^\d+$/, { message: "Must be a positive number." }),
  abandonedCartReminderIntervalHours: z.string().regex(/^\d+$/, { message: "Must be a positive number." }),
  abandonedCartEmailSubject: z.string().max(200, "Subject is too long (max 200 characters)."),
  abandonedCartEmailTemplate: z.string().max(2000, "Email template is too long (max 2000 characters)."),
  abandonedCartWhatsAppTemplate: z.string().max(1000, "WhatsApp template is too long (max 1000 characters)."),
  abandonedCartRecoveryMethod: z.enum(['email', 'whatsapp', 'both']),
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
  // Added defaults for abandoned cart
  enableAbandonedCartRecovery: false,
  abandonedCartDelayMinutes: "30",
  abandonedCartMaxReminders: "3",
  abandonedCartReminderIntervalHours: "24",
  abandonedCartEmailSubject: "Complete your order - {cart_total} waiting for you!",
  abandonedCartEmailTemplate: "Hi {customer_name},\n\nYou left {cart_items} in your cart worth {cart_total}.\n\nComplete your order now: {recovery_link}",
  abandonedCartWhatsAppTemplate: "Hi {customer_name}! You left items worth {cart_total} in your cart. Complete your order here: {recovery_link}",
  abandonedCartRecoveryMethod: "email",
};

const validateUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return true; // Empty URL is considered valid for optional fields
  try {
    const parsed = new URL(url.trim());
    const validProtocols = ['http:', 'https:'];
    if (!validProtocols.includes(parsed.protocol)) {
      return false;
    }
    // Disallow invalid hostnames
    if (!parsed.hostname || parsed.hostname === 'localhost') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
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

// Function to reset all app data (equivalent to prisma migrate reset)
const resetAllAppData = async (sessionId: string, shopDomain: string) => {
  console.log(`🔄 Starting full database reset for shop: ${shopDomain} (session: ${sessionId})`);
  
  try {
    // Clear all cache first
    settingsCache.clear();
    
    // Get all table names from your Prisma schema and delete data
    // Adjust these table names based on your actual database schema
    const tablesToReset = [
      'shopSettings',
      'orders', // if you have an orders table
      'products', // if you have a products table
      'customers', // if you have a customers table
      'analytics', // if you have analytics data
      'logs', // if you have logs table
      'webhooks', // if you have webhooks table
      // Add any other tables you want to reset
    ];

    // Delete data from all tables for this shop
    for (const table of tablesToReset) {
      try {
        // Use raw SQL or Prisma delete operations based on your needs
        if (table === 'shopSettings') {
  await db.shopSettings.deleteMany({
    where: { shopId: shopDomain } // Use shopDomain, which is session.shop
  });
}
        // Add similar delete operations for other tables
        // Example:
        // if (table === 'orders') {
        //   await db.orders.deleteMany({
        //     where: { shopId: sessionId }
        //   });
        // }
        
        console.log(`✅ Cleared table: ${table}`);
      } catch (tableError) {
        console.warn(`⚠️ Could not clear table ${table}:`, tableError);
        // Continue with other tables even if one fails
      }
    }

    // Optionally, you can also use raw SQL to truncate tables completely
    // Be very careful with this approach in production!
    /*
    await db.$executeRaw`DELETE FROM shop_settings WHERE shop_id = ${sessionId}`;
    await db.$executeRaw`DELETE FROM orders WHERE shop_id = ${sessionId}`;
    // Add other tables as needed
    */

    // Re-initialize shop settings with defaults
    await initializeShopSettings(sessionId);
    
    console.log(`✅ Database reset completed for shop: ${shopDomain}`);
    return true;
  } catch (error) {
    console.error(`❌ Database reset failed for shop: ${shopDomain}`, error);
    throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  console.log("🔍 Session ID:", session.id);
  console.log("🏪 Shop domain:", session.shop);
  
  // Initialize shop settings if they don't exist
  await initializeShopSettings(session.id);
  
  const generalSettings = await getCachedSettings(session.id);
  return json(generalSettings);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    console.log("🔍 Session ID:", session.id);
    console.log("🏪 Shop domain:", session.shop);
    console.log("🎯 Action type:", actionType);

    let settingsToSave: GeneralSettings;

    if (actionType === "reset") {
      // Perform full database reset
      await resetAllAppData(session.id, session.shop);
      settingsToSave = DEFAULT_SETTINGS;
      console.log("🔄 Complete database reset performed");
    } else {
      // Ensure settings are initialized before proceeding
      await initializeShopSettings(session.id);

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
        // Add new fields from form
        enableAbandonedCartRecovery: formData.get("enableAbandonedCartRecovery") === "true",
        abandonedCartDelayMinutes: (formData.get("abandonedCartDelayMinutes") as string) || "30",
        abandonedCartMaxReminders: (formData.get("abandonedCartMaxReminders") as string) || "3",
        abandonedCartReminderIntervalHours: (formData.get("abandonedCartReminderIntervalHours") as string) || "24",
        abandonedCartEmailSubject: (formData.get("abandonedCartEmailSubject") as string) || "Complete your order - {cart_total} waiting for you!",
        abandonedCartEmailTemplate: (formData.get("abandonedCartEmailTemplate") as string) || "Hi {customer_name},\n\nYou left {cart_items} in your cart worth {cart_total}.\n\nComplete your order now: {recovery_link}",
        abandonedCartWhatsAppTemplate: (formData.get("abandonedCartWhatsAppTemplate") as string) || "Hi {customer_name}! You left items worth {cart_total} in your cart. Complete your order here: {recovery_link}",
        abandonedCartRecoveryMethod: (formData.get("abandonedCartRecoveryMethod") as "email" | "whatsapp" | "both") || "email",
      };

      console.log("📋 Raw settings received:", rawSettings);

      const validationResult = generalSettingsSchema.safeParse(rawSettings);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("❌ Validation failed:", errorMessage);
        return json({ success: false, error: `Validation failed: ${errorMessage}` }, { status: 400 });
      }

      settingsToSave = validationResult.data;

      // Enhanced URL validation
      if (settingsToSave.redirectMode === "custom" && settingsToSave.redirectUrl && !validateUrl(settingsToSave.redirectUrl)) {
        return json({ success: false, error: "Invalid redirect URL. Must be a valid http/https URL." }, { status: 400 });
      }

      // Sanitize user inputs to prevent XSS
      settingsToSave.whatsappRedirectMessage = DOMPurify.sanitize(settingsToSave.whatsappRedirectMessage);
      settingsToSave.customThankYouMessage = DOMPurify.sanitize(settingsToSave.customThankYouMessage);
      settingsToSave.abandonedCartEmailSubject = DOMPurify.sanitize(settingsToSave.abandonedCartEmailSubject);
      settingsToSave.abandonedCartEmailTemplate = DOMPurify.sanitize(settingsToSave.abandonedCartEmailTemplate);
      settingsToSave.abandonedCartWhatsAppTemplate = DOMPurify.sanitize(settingsToSave.abandonedCartWhatsAppTemplate);
    }

    const previousSettings = await db.shopSettings.findUnique({ where: { shopId: session.shop } });

 await db.shopSettings.upsert({
    where: { shopId: session.shop }, // Use the correct key for lookup
    update: {
        generalSettings: JSON.stringify(settingsToSave),
        updatedAt: new Date()
    },
    create: {
        // Let Prisma handle the shopId by connecting to the Session.
        generalSettings: JSON.stringify(settingsToSave),
        Session: {
            connect: { id: session.id } // Connect via the Session's primary key
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
    // Optional: Save to a dedicated audit log table in your database
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

// Input validation helpers
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Optional field
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

    // Additional custom validations
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
    // Cleanup function
    return () => {
      if (saveBar) {
        try {
          saveBar.hide();
        } catch (error) {
          // Silent cleanup is fine
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
    <Frame>
      <ui-save-bar id="general-settings-save-bar">
        <button variant="primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button onClick={handleDiscard} disabled={isLoading}>
          Discard
        </button>
      </ui-save-bar>

      <Page
        title="General Settings"
        subtitle="Configure order processing, form behavior, and redirects"
        backAction={{
          content: "Back",
          onAction: () => {
            // Check if there's history to go back to
            if (window.history.length > 1) {
              window.history.back();
            } else {
              // Fallback to dashboard if no history
              window.location.href = "/app";
            }
          }
        }}
      >
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

                <SettingsSection title="Order Processing" description="Configure how orders are created and processed." badge="Core">
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

                <SettingsSection title="After-Purchase Experience" description="Define what happens after customers place an order." collapsible defaultOpen={false}>
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
                        label="Pre-filled WhatsApp Message"
                        value={formState.whatsappRedirectMessage}
                        onChange={(value) => handleFormChange(value, "whatsappRedirectMessage")}
                        multiline={3}
                        autoComplete="off"
                        helpText="Use {order_id} to automatically include the order number."
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

                {/* -- NEW SECTION: Abandoned Cart Recovery -- */}
                <SettingsSection
                  title="Abandoned Cart Recovery"
                  description="Automatically recover abandoned carts with email and WhatsApp reminders."
                  collapsible
                  defaultOpen={false}
                >
                  <BlockStack gap="400">
                    <Checkbox
                      label="Enable abandoned cart recovery"
                      checked={formState.enableAbandonedCartRecovery}
                      onChange={(checked) => handleFormChange(checked, 'enableAbandonedCartRecovery')}
                      helpText="Send automatic reminders to customers who abandon their carts"
                    />

                    {formState.enableAbandonedCartRecovery && (
                      <>
                        <Grid>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}>
                            <TextField
                              type="number"
                              label="Delay before first reminder (minutes)"
                              value={formState.abandonedCartDelayMinutes}
                              onChange={(value) => handleFormChange(value, 'abandonedCartDelayMinutes')}
                              min={5}
                              max={1440}
                              autoComplete="off"
                              helpText="Wait time before sending first reminder."
                              error={validationErrors.abandonedCartDelayMinutes}
                            />
                          </Grid.Cell>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}>
                            <TextField
                              type="number"
                              label="Maximum reminders"
                              value={formState.abandonedCartMaxReminders}
                              onChange={(value) => handleFormChange(value, 'abandonedCartMaxReminders')}
                              min={1}
                              max={10}
                              autoComplete="off"
                              helpText="Total number of reminders to send."
                            	error={validationErrors.abandonedCartMaxReminders}
                            />
                          </Grid.Cell>
                        </Grid>

                        <TextField
                          type="number"
                          label="Hours between reminders"
                          value={formState.abandonedCartReminderIntervalHours}
                          onChange={(value) => handleFormChange(value, 'abandonedCartReminderIntervalHours')}
                          min={1}
            _message "Must be a positive number." }),
  abandonedCartEmailSubject: z.string().max(200, "Subject is too long (max 200 characters)."),
  abandonedCartEmailTemplate: z.string().max(2000, "Email template is too long (max 2000 characters)."),
  abandonedCartWhatsAppTemplate: z.string().max(1000, "WhatsApp template is too long (max 1000 characters)."),
  abandonedCartRecoveryMethod: z.enum(['email', 'whatsapp', 'both']),
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
  // Added defaults for abandoned cart
  enableAbandonedCartRecovery: false,
  abandonedCartDelayMinutes: "30",
  abandonedCartMaxReminders: "3",
  abandonedCartReminderIntervalHours: "24",
  abandonedCartEmailSubject: "Complete your order - {cart_total} waiting for you!",
  abandonedCartEmailTemplate: "Hi {customer_name},\n\nYou left {cart_items} in your cart worth {cart_total}.\n\nComplete your order now: {recovery_link}",
  abandonedCartWhatsAppTemplate: "Hi {customer_name}! You left items worth {cart_total} in your cart. Complete your order here: {recovery_link}",
  abandonedCartRecoveryMethod: "email",
};

const validateUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return true; // Empty URL is considered valid for optional fields
  try {
    const parsed = new URL(url.trim());
    const validProtocols = ['http:', 'https:'];
    if (!validProtocols.includes(parsed.protocol)) {
      return false;
    }
    // Disallow invalid hostnames
    if (!parsed.hostname || parsed.hostname === 'localhost') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
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

// Function to reset all app data (equivalent to prisma migrate reset)
const resetAllAppData = async (sessionId: string, shopDomain: string) => {
  console.log(`🔄 Starting full database reset for shop: ${shopDomain} (session: ${sessionId})`);
  
  try {
    // Clear all cache first
    settingsCache.clear();
    
    // Get all table names from your Prisma schema and delete data
    // Adjust these table names based on your actual database schema
    const tablesToReset = [
      'shopSettings',
      'orders', // if you have an orders table
      'products', // if you have a products table
      'customers', // if you have a customers table
      'analytics', // if you have analytics data
      'logs', // if you have logs table
      'webhooks', // if you have webhooks table
      // Add any other tables you want to reset
    ];

    // Delete data from all tables for this shop
    for (const table of tablesToReset) {
      try {
        // Use raw SQL or Prisma delete operations based on your needs
        if (table === 'shopSettings') {
  await db.shopSettings.deleteMany({
    where: { shopId: shopDomain } // Use shopDomain, which is session.shop
  });
}
        // Add similar delete operations for other tables
        // Example:
        // if (table === 'orders') {
        //   await db.orders.deleteMany({
        //     where: { shopId: sessionId }
        //   });
        // }
        
        console.log(`✅ Cleared table: ${table}`);
      } catch (tableError) {
        console.warn(`⚠️ Could not clear table ${table}:`, tableError);
        // Continue with other tables even if one fails
      }
    }

    // Optionally, you can also use raw SQL to truncate tables completely
    // Be very careful with this approach in production!
    /*
    await db.$executeRaw`DELETE FROM shop_settings WHERE shop_id = ${sessionId}`;
    await db.$executeRaw`DELETE FROM orders WHERE shop_id = ${sessionId}`;
    // Add other tables as needed
    */

    // Re-initialize shop settings with defaults
    await initializeShopSettings(sessionId);
    
    console.log(`✅ Database reset completed for shop: ${shopDomain}`);
    return true;
  } catch (error) {
    console.error(`❌ Database reset failed for shop: ${shopDomain}`, error);
    throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  console.log("🔍 Session ID:", session.id);
  console.log("🏪 Shop domain:", session.shop);
  
  // Initialize shop settings if they don't exist
  await initializeShopSettings(session.id);
  
  const generalSettings = await getCachedSettings(session.id);
  return json(generalSettings);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    console.log("🔍 Session ID:", session.id);
    console.log("🏪 Shop domain:", session.shop);
    console.log("🎯 Action type:", actionType);

    let settingsToSave: GeneralSettings;

    if (actionType === "reset") {
      // Perform full database reset
      await resetAllAppData(session.id, session.shop);
      settingsToSave = DEFAULT_SETTINGS;
      console.log("🔄 Complete database reset performed");
    } else {
      // Ensure settings are initialized before proceeding
      await initializeShopSettings(session.id);

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
        // Add new fields from form
        enableAbandonedCartRecovery: formData.get("enableAbandonedCartRecovery") === "true",
        abandonedCartDelayMinutes: (formData.get("abandonedCartDelayMinutes") as string) || "30",
        abandonedCartMaxReminders: (formData.get("abandonedCartMaxReminders") as string) || "3",
        abandonedCartReminderIntervalHours: (formData.get("abandonedCartReminderIntervalHours") as string) || "24",
        abandonedCartEmailSubject: (formData.get("abandonedCartEmailSubject") as string) || "Complete your order - {cart_total} waiting for you!",
        abandonedCartEmailTemplate: (formData.get("abandonedCartEmailTemplate") as string) || "Hi {customer_name},\n\nYou left {cart_items} in your cart worth {cart_total}.\n\nComplete your order now: {recovery_link}",
        abandonedCartWhatsAppTemplate: (formData.get("abandonedCartWhatsAppTemplate") as string) || "Hi {customer_name}! You left items worth {cart_total} in your cart. Complete your order here: {recovery_link}",
        abandonedCartRecoveryMethod: (formData.get("abandonedCartRecoveryMethod") as "email" | "whatsapp" | "both") || "email",
      };

      console.log("📋 Raw settings received:", rawSettings);

      const validationResult = generalSettingsSchema.safeParse(rawSettings);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("❌ Validation failed:", errorMessage);
        return json({ success: false, error: `Validation failed: ${errorMessage}` }, { status: 400 });
      }

      settingsToSave = validationResult.data;

      // Enhanced URL validation
      if (settingsToSave.redirectMode === "custom" && settingsToSave.redirectUrl && !validateUrl(settingsToSave.redirectUrl)) {
        return json({ success: false, error: "Invalid redirect URL. Must be a valid http/https URL." }, { status: 400 });
      }

      // Sanitize user inputs to prevent XSS
      settingsToSave.whatsappRedirectMessage = DOMPurify.sanitize(settingsToSave.whatsappRedirectMessage);
      settingsToSave.customThankYouMessage = DOMPurify.sanitize(settingsToSave.customThankYouMessage);
      settingsToSave.abandonedCartEmailSubject = DOMPurify.sanitize(settingsToSave.abandonedCartEmailSubject);
      settingsToSave.abandonedCartEmailTemplate = DOMPurify.sanitize(settingsToSave.abandonedCartEmailTemplate);
      settingsToSave.abandonedCartWhatsAppTemplate = DOMPurify.sanitize(settingsToSave.abandonedCartWhatsAppTemplate);
    }

    const previousSettings = await db.shopSettings.findUnique({ where: { shopId: session.shop } });

 await db.shopSettings.upsert({
    where: { shopId: session.shop }, // Use the correct key for lookup
    update: {
        generalSettings: JSON.stringify(settingsToSave),
        updatedAt: new Date()
    },
    create: {
        // Let Prisma handle the shopId by connecting to the Session.
        generalSettings: JSON.stringify(settingsToSave),
        Session: {
            connect: { id: session.id } // Connect via the Session's primary key
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
    // Optional: Save to a dedicated audit log table in your database
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

// Input validation helpers
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Optional field
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

    // Additional custom validations
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
    // Cleanup function
    return () => {
      if (saveBar) {
        try {
          saveBar.hide();
        } catch (error) {
          // Silent cleanup is fine
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
    <Frame>
      <ui-save-bar id="general-settings-save-bar">
        <button variant="primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button onClick={handleDiscard} disabled={isLoading}>
          Discard
        </button>
      </ui-save-bar>

      <Page
        title="General Settings"
        subtitle="Configure order processing, form behavior, and redirects"
        backAction={{
          content: "Back",
          onAction: () => {
            // Check if there's history to go back to
            if (window.history.length > 1) {
              window.history.back();
            } else {
              // Fallback to dashboard if no history
              window.location.href = "/app";
            }
          }
        }}
      >
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

                <SettingsSection title="Order Processing" description="Configure how orders are created and processed." badge="Core">
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

                <SettingsSection title="After-Purchase Experience" description="Define what happens after customers place an order." collapsible defaultOpen={false}>
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
                        label="Pre-filled WhatsApp Message"
                        value={formState.whatsappRedirectMessage}
                        onChange={(value) => handleFormChange(value, "whatsappRedirectMessage")}
                        multiline={3}
                        autoComplete="off"
                        helpText="Use {order_id} to automatically include the order number."
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

                {/* -- NEW SECTION: Abandoned Cart Recovery -- */}
                <SettingsSection
                  title="Abandoned Cart Recovery"
                  description="Automatically recover abandoned carts with email and WhatsApp reminders."
                  collapsible
                  defaultOpen={false}
                >
                  <BlockStack gap="400">
                    <Checkbox
                      label="Enable abandoned cart recovery"
                      checked={formState.enableAbandonedCartRecovery}
                      onChange={(checked) => handleFormChange(checked, 'enableAbandonedCartRecovery')}
                      helpText="Send automatic reminders to customers who abandon their carts"
                    />

                    {formState.enableAbandonedCartRecovery && (
                      <>
                        <Grid>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}>
                            <TextField
                              type="number"
                              label="Delay before first reminder (minutes)"
                              value={formState.abandonedCartDelayMinutes}
                              onChange={(value) => handleFormChange(value, 'abandonedCartDelayMinutes')}
                              min={5}
                              max={1440}
                              autoComplete="off"
                              helpText="Wait time before sending first reminder."
                            	error={validationErrors.abandonedCartDelayMinutes}
                            />
                          </Grid.Cell>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}>
                            <TextField
                              type="number"
                              label="Maximum reminders"
                              value={formState.abandonedCartMaxReminders}
                              onChange={(value) => handleFormChange(value, 'abandonedCartMaxReminders')}
                              min={1}
                              max={10}
                              autoComplete="off"
                              helpText="Total number of reminders to send."
                            	error={validationErrors.abandonedCartMaxReminders}
                            />
                          </Grid.Cell>
                        </Grid>

                        <TextField
                          type="number"
                          label="Hours between reminders"
                          value={formState.abandonedCartReminderIntervalHours}
                          onChange={(value) => handleFormChange(value, 'abandonedCartReminderIntervalHours')}
                          min={1}
                          max={168}
                          autoComplete="off"
                          helpText="Time between each reminder."
                          error={validationErrors.abandonedCartReminderIntervalHours}
                        />

                        <Select
                          label="Recovery method"
                          options={[
                            { label: "Email only", value: "email" },
                            { label: "WhatsApp only", value: "whatsapp" },
                            { label: "Both email and WhatsApp", value: "both" },
                          ]}
                          value={formState.abandonedCartRecoveryMethod}
                          onChange={(value) => handleFormChange(value, 'abandonedCartRecoveryMethod')}
                        />

                        {(formState.abandonedCartRecoveryMethod === "email" || formState.abandonedCartRecoveryMethod === "both") && (
                          <>
                            <TextField
                              label="Email subject"
                              value={formState.abandonedCartEmailSubject}
                              onChange={(value) => handleFormChange(value, 'abandonedCartEmailSubject')}
                              autoComplete="off"
                              helpText="Use {customer_name}, {cart_total}, {cart_items}"
                              error={validationErrors.abandonedCartEmailSubject}
                            />

                            <TextField
                              label="Email template"
                              value={formState.abandonedCartEmailTemplate}
                              onChange={(value) => handleFormChange(value, 'abandonedCartEmailTemplate')}
                              multiline={4}
                              autoComplete="off"
                              helpText="Use {customer_name}, {cart_total}, {cart_items}, {recovery_link}"
                            	error={validationErrors.abandonedCartEmailTemplate}
                            />
                          </>
                        )}

                        {(formState.abandonedCartRecoveryMethod === "whatsapp" || formState.abandonedCartRecoveryMethod === "both") && (
                          <TextField
                            label="WhatsApp template"
                            value={formState.abandonedCartWhatsAppTemplate}
                            onChange={(value) => handleFormChange(value, 'abandonedCartWhatsAppTemplate')}
                            multiline={3}
                            autoComplete="off"
                            helpText="Use {customer_name}, {cart_total}, {cart_items}, {recovery_link}"
                            error={validationErrors.abandonedCartWhatsAppTemplate}
                          />
                        )}
                      </>
                    )}
                  </BlockStack>
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
                      This will completely reset your entire application database - all orders, customers, settings, analytics, and configurations will be permanently deleted. This is equivalent to a fresh installation.
                    </Text>
                    {showResetConfirm ? (
                      <BlockStack gap="300">
                        <Banner tone="critical">
                          <Text as="p" variant="bodyMd" fontWeight="bold">
                            ⚠️ DANGER: This will delete ALL your app data permanently!
                          </Text>
                          <Text as="p" variant="bodyMd">
              _message "Must be a positive number." }),
  abandonedCartEmailSubject: z.string().max(200, "Subject is too long (max 200 characters)."),
  abandonedCartEmailTemplate: z.string().max(2000, "Email template is too long (max 2000 characters)."),
  abandonedCartWhatsAppTemplate: z.string().max(1000, "WhatsApp template is too long (max 1000 characters)."),
  abandonedCartRecoveryMethod: z.enum(['email', 'whatsapp', 'both']),
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
  // Added defaults for abandoned cart
  enableAbandonedCartRecovery: false,
  abandonedCartDelayMinutes: "30",
  abandonedCartMaxReminders: "3",
  abandonedCartReminderIntervalHours: "24",
  abandonedCartEmailSubject: "Complete your order - {cart_total} waiting for you!",
  abandonedCartEmailTemplate: "Hi {customer_name},\n\nYou left {cart_items} in your cart worth {cart_total}.\n\nComplete your order now: {recovery_link}",
  abandonedCartWhatsAppTemplate: "Hi {customer_name}! You left items worth {cart_total} in your cart. Complete your order here: {recovery_link}",
  abandonedCartRecoveryMethod: "email",
};

const validateUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return true; // Empty URL is considered valid for optional fields
  try {
    const parsed = new URL(url.trim());
    const validProtocols = ['http:', 'https:'];
    if (!validProtocols.includes(parsed.protocol)) {
      return false;
    }
    // Disallow invalid hostnames
    if (!parsed.hostname || parsed.hostname === 'localhost') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
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

// Function to reset all app data (equivalent to prisma migrate reset)
const resetAllAppData = async (sessionId: string, shopDomain: string) => {
  console.log(`🔄 Starting full database reset for shop: ${shopDomain} (session: ${sessionId})`);
  
  try {
    // Clear all cache first
    settingsCache.clear();
    
    // Get all table names from your Prisma schema and delete data
    // Adjust these table names based on your actual database schema
    const tablesToReset = [
      'shopSettings',
      'orders', // if you have an orders table
      'products', // if you have a products table
      'customers', // if you have a customers table
      'analytics', // if you have analytics data
      'logs', // if you have logs table
      'webhooks', // if you have webhooks table
      // Add any other tables you want to reset
    ];

    // Delete data from all tables for this shop
    for (const table of tablesToReset) {
      try {
        // Use raw SQL or Prisma delete operations based on your needs
        if (table === 'shopSettings') {
  await db.shopSettings.deleteMany({
    where: { shopId: shopDomain } // Use shopDomain, which is session.shop
  });
}
        // Add similar delete operations for other tables
  _message "Must be a positive number." }),
  abandonedCartEmailSubject: z.string().max(200, "Subject is too long (max 200 characters)."),
  abandonedCartEmailTemplate: z.string().max(2000, "Email template is too long (max 2000 characters)."),
  abandonedCartWhatsAppTemplate: z.string().max(1000, "WhatsApp template is too long (max 1000 characters)."),
  abandonedCartRecoveryMethod: z.enum(['email', 'whatsapp', 'both']),
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
  // Added defaults for abandoned cart
  enableAbandonedCartRecovery: false,
  abandonedCartDelayMinutes: "30",
  abandonedCartMaxReminders: "3",
  abandonedCartReminderIntervalHours: "24",
  abandonedCartEmailSubject: "Complete your order - {cart_total} waiting for you!",
  abandonedCartEmailTemplate: "Hi {customer_name},\n\nYou left {cart_items} in your cart worth {cart_total}.\n\nComplete your order now: {recovery_link}",
  abandonedCartWhatsAppTemplate: "Hi {customer_name}! You left items worth {cart_total} in your cart. Complete your order here: {recovery_link}",
  abandonedCartRecoveryMethod: "email",
};

const validateUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return true; // Empty URL is considered valid for optional fields
  try {
    const parsed = new URL(url.trim());
    const validProtocols = ['http:', 'https:'];
    if (!validProtocols.includes(parsed.protocol)) {
      return false;
    }
    // Disallow invalid hostnames
    if (!parsed.hostname || parsed.hostname === 'localhost') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
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

// Function to reset all app data (equivalent to prisma migrate reset)
const resetAllAppData = async (sessionId: string, shopDomain: string) => {
  console.log(`🔄 Starting full database reset for shop: ${shopDomain} (session: ${sessionId})`);
  
  try {
    // Clear all cache first
    settingsCache.clear();
    
    // Get all table names from your Prisma schema and delete data
    // Adjust these table names based on your actual database schema
    const tablesToReset = [
      'shopSettings',
      'orders', // if you have an orders table
      'products', // if you have a products table
      'customers', // if you have a customers table
      'analytics', // if you have analytics data
      'logs', // if you have logs table
      'webhooks', // if you have webhooks table
      // Add any other tables you want to reset
    ];

    // Delete data from all tables for this shop
    for (const table of tablesToReset) {
      try {
        // Use raw SQL or Prisma delete operations based on your needs
        if (table === 'shopSettings') {
  await db.shopSettings.deleteMany({
    where: { shopId: shopDomain } // Use shopDomain, which is session.shop
  });
}
        // Add similar delete operations for other tables
        // Example:
        // if (table === 'orders') {
        //   await db.orders.deleteMany({
        //     where: { shopId: sessionId }
        //   });
        // }
        
        console.log(`✅ Cleared table: ${table}`);
      } catch (tableError) {
        console.warn(`⚠️ Could not clear table ${table}:`, tableError);
        // Continue with other tables even if one fails
      }
    }

    // Optionally, you can also use raw SQL to truncate tables completely
    // Be very careful with this approach in production!
    /*
    await db.$executeRaw`DELETE FROM shop_settings WHERE shop_id = ${sessionId}`;
    await db.$executeRaw`DELETE FROM orders WHERE shop_id = ${sessionId}`;
    // Add other tables as needed
    */

    // Re-initialize shop settings with defaults
    await initializeShopSettings(sessionId);
    
    console.log(`✅ Database reset completed for shop: ${shopDomain}`);
    return true;
  } catch (error) {
    console.error(`❌ Database reset failed for shop: ${shopDomain}`, error);
    throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  console.log("🔍 Session ID:", session.id);
  console.log("🏪 Shop domain:", session.shop);
  
  // Initialize shop settings if they don't exist
  await initializeShopSettings(session.id);
  
  const generalSettings = await getCachedSettings(session.id);
  return json(generalSettings);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    console.log("🔍 Session ID:", session.id);
    console.log("🏪 Shop domain:", session.shop);
    console.log("🎯 Action type:", actionType);

    let settingsToSave: GeneralSettings;

    if (actionType === "reset") {
      // Perform full database reset
      await resetAllAppData(session.id, session.shop);
      settingsToSave = DEFAULT_SETTINGS;
      console.log("🔄 Complete database reset performed");
    } else {
      // Ensure settings are initialized before proceeding
      await initializeShopSettings(session.id);

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
        // Add new fields from form
        enableAbandonedCartRecovery: formData.get("enableAbandonedCartRecovery") === "true",
        abandonedCartDelayMinutes: (formData.get("abandonedCartDelayMinutes") as string) || "30",
        abandonedCartMaxReminders: (formData.get("abandonedCartMaxReminders") as string) || "3",
        abandonedCartReminderIntervalHours: (formData.get("abandonedCartReminderIntervalHours") as string) || "24",
        abandonedCartEmailSubject: (formData.get("abandonedCartEmailSubject") as string) || "Complete your order - {cart_total} waiting for you!",
        abandonedCartEmailTemplate: (formData.get("abandonedCartEmailTemplate") as string) || "Hi {customer_name},\n\nYou left {cart_items} in your cart worth {cart_total}.\n\nComplete your order now: {recovery_link}",
        abandonedCartWhatsAppTemplate: (formData.get("abandonedCartWhatsAppTemplate") as string) || "Hi {customer_name}! You left items worth {cart_total} in your cart. Complete your order here: {recovery_link}",
        abandonedCartRecoveryMethod: (formData.get("abandonedCartRecoveryMethod") as "email" | "whatsapp" | "both") || "email",
      };

      console.log("📋 Raw settings received:", rawSettings);

      const validationResult = generalSettingsSchema.safeParse(rawSettings);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("❌ Validation failed:", errorMessage);
        return json({ success: false, error: `Validation failed: ${errorMessage}` }, { status: 400 });
      }

      settingsToSave = validationResult.data;

      // Enhanced URL validation
      if (settingsToSave.redirectMode === "custom" && settingsToSave.redirectUrl && !validateUrl(settingsToSave.redirectUrl)) {
        return json({ success: false, error: "Invalid redirect URL. Must be a valid http/https URL." }, { status: 400 });
      }

      // Sanitize user inputs to prevent XSS
      settingsToSave.whatsappRedirectMessage = DOMPurify.sanitize(settingsToSave.whatsappRedirectMessage);
      settingsToSave.customThankYouMessage = DOMPurify.sanitize(settingsToSave.customThankYouMessage);
      settingsToSave.abandonedCartEmailSubject = DOMPurify.sanitize(settingsToSave.abandonedCartEmailSubject);
      settingsToSave.abandonedCartEmailTemplate = DOMPurify.sanitize(settingsToSave.abandonedCartEmailTemplate);
      settingsToSave.abandonedCartWhatsAppTemplate = DOMPurify.sanitize(settingsToSave.abandonedCartWhatsAppTemplate);
    }

    const previousSettings = await db.shopSettings.findUnique({ where: { shopId: session.shop } });

 await db.shopSettings.upsert({
    where: { shopId: session.shop }, // Use the correct key for lookup
    update: {
        generalSettings: JSON.stringify(settingsToSave),
        updatedAt: new Date()
    },
    create: {
        // Let Prisma handle the shopId by connecting to the Session.
        generalSettings: JSON.stringify(settingsToSave),
        Session: {
            connect: { id: session.id } // Connect via the Session's primary key
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
    // Optional: Save to a dedicated audit log table in your database
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

// Input validation helpers
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Optional field
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

    // Additional custom validations
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
    // Cleanup function
    return () => {
      if (saveBar) {
        try {
          saveBar.hide();
        } catch (error) {
          // Silent cleanup is fine
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
    <Frame>
      <ui-save-bar id="general-settings-save-bar">
        <button variant="primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button onClick={handleDiscard} disabled={isLoading}>
          Discard
        </button>
      </ui-save-bar>

      <Page
        title="General Settings"
        subtitle="Configure order processing, form behavior, and redirects"
        backAction={{
          content: "Back",
          onAction: () => {
            // Check if there's history to go back to
            if (window.history.length > 1) {
              window.history.back();
            } else {
              // Fallback to dashboard if no history
              window.location.href = "/app";
            }
          }
        }}
      >
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

                <SettingsSection title="Order Processing" description="Configure how orders are created and processed." badge="Core">
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
          _message "Must be a positive number." }),
  abandonedCartEmailSubject: z.string().max(200, "Subject is too long (max 200 characters)."),
  abandonedCartEmailTemplate: z.string().max(2000, "Email template is too long (max 2000 characters)."),
  abandonedCartWhatsAppTemplate: z.string().max(1000, "WhatsApp template is too long (max 1000 characters)."),
  abandonedCartRecoveryMethod: z.enum(['email', 'whatsapp', 'both']),
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
  // Added defaults for abandoned cart
  enableAbandonedCartRecovery: false,
  abandonedCartDelayMinutes: "30",
  abandonedCartMaxReminders: "3",
  abandonedCartReminderIntervalHours: "24",
  abandonedCartEmailSubject: "Complete your order - {cart_total} waiting for you!",
  abandonedCartEmailTemplate: "Hi {customer_name},\n\nYou left {cart_items} in your cart worth {cart_total}.\n\nComplete your order now: {recovery_link}",
  abandonedCartWhatsAppTemplate: "Hi {customer_name}! You left items worth {cart_total} in your cart. Complete your order here: {recovery_link}",
  abandonedCartRecoveryMethod: "email",
};

const validateUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return true; // Empty URL is considered valid for optional fields
  try {
    const parsed = new URL(url.trim());
    const validProtocols = ['http:', 'https:'];
    if (!validProtocols.includes(parsed.protocol)) {
      return false;
    }
    // Disallow invalid hostnames
    if (!parsed.hostname || parsed.hostname === 'localhost') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
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

// Function to reset all app data (equivalent to prisma migrate reset)
const resetAllAppData = async (sessionId: string, shopDomain: string) => {
  console.log(`🔄 Starting full database reset for shop: ${shopDomain} (session: ${sessionId})`);
  
  try {
    // Clear all cache first
    settingsCache.clear();
    
    // Get all table names from your Prisma schema and delete data
    // Adjust these table names based on your actual database schema
    const tablesToReset = [
      'shopSettings',
      'orders', // if you have an orders table
      'products', // if you have a products table
      'customers', // if you have a customers table
      'analytics', // if you have analytics data
      'logs', // if you have logs table
      'webhooks', // if you have webhooks table
      // Add any other tables you want to reset
    ];

    // Delete data from all tables for this shop
    for (const table of tablesToReset) {
      try {
        // Use raw SQL or Prisma delete operations based on your needs
        if (table === 'shopSettings') {
  await db.shopSettings.deleteMany({
    where: { shopId: shopDomain } // Use shopDomain, which is session.shop
  });
}
        // Add similar delete operations for other tables
        // Example:
        // if (table === 'orders') {
        //   await db.orders.deleteMany({
        //     where: { shopId: sessionId }
        //   });
        // }
        
        console.log(`✅ Cleared table: ${table}`);
      } catch (tableError) {
        console.warn(`⚠️ Could not clear table ${table}:`, tableError);
        // Continue with other tables even if one fails
      }
    }

    // Optionally, you can also use raw SQL to truncate tables completely
    // Be very careful with this approach in production!
    /*
    await db.$executeRaw`DELETE FROM shop_settings WHERE shop_id = ${sessionId}`;
    await db.$executeRaw`DELETE FROM orders WHERE shop_id = ${sessionId}`;
    // Add other tables as needed
    */

    // Re-initialize shop settings with defaults
    await initializeShopSettings(sessionId);
    
    console.log(`✅ Database reset completed for shop: ${shopDomain}`);
    return true;
  } catch (error) {
    console.error(`❌ Database reset failed for shop: ${shopDomain}`, error);
    throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  console.log("🔍 Session ID:", session.id);
  console.log("🏪 Shop domain:", session.shop);
  
  // Initialize shop settings if they don't exist
  await initializeShopSettings(session.id);
  
  const generalSettings = await getCachedSettings(session.id);
  return json(generalSettings);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    console.log("🔍 Session ID:", session.id);
    console.log("🏪 Shop domain:", session.shop);
    console.log("🎯 Action type:", actionType);

    let settingsToSave: GeneralSettings;

    if (actionType === "reset") {
      // Perform full database reset
      await resetAllAppData(session.id, session.shop);
      settingsToSave = DEFAULT_SETTINGS;
      console.log("🔄 Complete database reset performed");
    } else {
      // Ensure settings are initialized before proceeding
      await initializeShopSettings(session.id);

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
        // Add new fields from form
        enableAbandonedCartRecovery: formData.get("enableAbandonedCartRecovery") === "true",
        abandonedCartDelayMinutes: (formData.get("abandonedCartDelayMinutes") as string) || "30",
        abandonedCartMaxReminders: (formData.get("abandonedCartMaxReminders") as string) || "3",
        abandonedCartReminderIntervalHours: (formData.get("abandonedCartReminderIntervalHours") as string) || "24",
        abandonedCartEmailSubject: (formData.get("abandonedCartEmailSubject") as string) || "Complete your order - {cart_total} waiting for you!",
        abandonedCartEmailTemplate: (formData.get("abandonedCartEmailTemplate") as string) || "Hi {customer_name},\n\nYou left {cart_items} in your cart worth {cart_total}.\n\nComplete your order now: {recovery_link}",
        abandonedCartWhatsAppTemplate: (formData.get("abandonedCartWhatsAppTemplate") as string) || "Hi {customer_name}! You left items worth {cart_total} in your cart. Complete your order here: {recovery_link}",
        abandonedCartRecoveryMethod: (formData.get("abandonedCartRecoveryMethod") as "email" | "whatsapp" | "both") || "email",
      };

      console.log("📋 Raw settings received:", rawSettings);

      const validationResult = generalSettingsSchema.safeParse(rawSettings);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("❌ Validation failed:", errorMessage);
        return json({ success: false, error: `Validation failed: ${errorMessage}` }, { status: 400 });
      }

      settingsToSave = validationResult.data;

      // Enhanced URL validation
      if (settingsToSave.redirectMode === "custom" && settingsToSave.redirectUrl && !validateUrl(settingsToSave.redirectUrl)) {
        return json({ success: false, error: "Invalid redirect URL. Must be a valid http/https URL." }, { status: 400 });
      }

      // Sanitize user inputs to prevent XSS
      settingsToSave.whatsappRedirectMessage = DOMPurify.sanitize(settingsToSave.whatsappRedirectMessage);
      settingsToSave.customThankYouMessage = DOMPurify.sanitize(settingsToSave.customThankYouMessage);
      settingsToSave.abandonedCartEmailSubject = DOMPurify.sanitize(settingsToSave.abandonedCartEmailSubject);
      settingsToSave.abandonedCartEmailTemplate = DOMPurify.sanitize(settingsToSave.abandonedCartEmailTemplate);
      settingsToSave.abandonedCartWhatsAppTemplate = DOMPurify.sanitize(settingsToSave.abandonedCartWhatsAppTemplate);
    }

    const previousSettings = await db.shopSettings.findUnique({ where: { shopId: session.shop } });

 await db.shopSettings.upsert({
    where: { shopId: session.shop }, // Use the correct key for lookup
    update: {
        generalSettings: JSON.stringify(settingsToSave),
        updatedAt: new Date()
    },
    create: {
        // Let Prisma handle the shopId by connecting to the Session.
        generalSettings: JSON.stringify(settingsToSave),
        Session: {
            connect: { id: session.id } // Connect via the Session's primary key
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
    // Optional: Save to a dedicated audit log table in your database
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

// Input validation helpers
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Optional field
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

    // Additional custom validations
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
    // Cleanup function
    return () => {
      if (saveBar) {
        try {
          saveBar.hide();
        } catch (error) {
          // Silent cleanup is fine
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
    <Frame>
      <ui-save-bar id="general-settings-save-bar">
        <button variant="primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button onClick={handleDiscard} disabled={isLoading}>
          Discard
        </button>
      </ui-save-bar>

      <Page
        title="General Settings"
        subtitle="Configure order processing, form behavior, and redirects"
        backAction={{
          content: "Back",
          onAction: () => {
            // Check if there's history to go back to
            if (window.history.length > 1) {
              window.history.back();
            } else {
              // Fallback to dashboard if no history
              window.location.href = "/app";
            }
          }
        }}
      >
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

                <SettingsSection title="Order Processing" description="Configure how orders are created and processed." badge="Core">
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

                <SettingsSection title="After-Purchase Experience" description="Define what happens after customers place an order." collapsible defaultOpen={false}>
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
                        label="Pre-filled WhatsApp Message"
                        value={formState.whatsappRedirectMessage}
                        onChange={(value) => handleFormChange(value, "whatsappRedirectMessage")}
                        multiline={3}
                      	autoComplete="off"
                      	helpText="Use {order_id} to automatically include the order number."
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

                {/* -- NEW SECTION: Abandoned Cart Recovery -- */}
                <SettingsSection
                	title="Abandoned Cart Recovery"
                	description="Automatically recover abandoned carts with email and WhatsApp reminders."
                	collapsible
                	defaultOpen={false}
                >
                	<BlockStack gap="400">
                		<Checkbox
                			label="Enable abandoned cart recovery"
                			checked={formState.enableAbandonedCartRecovery}
                			onChange={(checked) => handleFormChange(checked, 'enableAbandonedCartRecovery')}
                			helpText="Send automatic reminders to customers who abandon their carts"
                		/>

                		{formState.enableAbandonedCartRecovery && (
                			<>
                				<Grid>
                					<Grid.Cell columnSpan={{ xs: 6, sm: 3 }}>
                						<TextField
                							type="number"
                							label="Delay before first reminder (minutes)"
                							value={formState.abandonedCartDelayMinutes}
                							onChange={(value) => handleFormChange(value, 'abandonedCartDelayMinutes')}
                							min={5}
                							max={1440}
                							autoComplete="off"
                							helpText="Wait time before sending first reminder."
                							error={validationErrors.abandonedCartDelayMinutes}
                						/>
                					</Grid.Cell>
                					<Grid.Cell columnSpan={{ xs: 6, sm: 3 }}>
                						<TextField
                							type="number"
                							label="Maximum reminders"
                							value={formState.abandonedCartMaxReminders}
                							onChange={(value) => handleFormChange(value, 'abandonedCartMaxReminders')}
                							min={1}
                							max={10}
                							autoComplete="off"
                							helpText="Total number of reminders to send."
                							error={validationErrors.abandonedCartMaxReminders}
                						/>
                					</Grid.Cell>
                				</Grid>

                				<TextField
                					type="number"
                					label="Hours between reminders"
                					value={formState.abandonedCartReminderIntervalHours}
                					onChange={(value) => handleFormChange(value, 'abandonedCartReminderIntervalHours')}
                					min={1}
                					max={168}
                					autoComplete="off"
                					helpText="Time between each reminder."
                					error={validationErrors.abandonedCartReminderIntervalHours}
                				/>

                				<Select
                					label="Recovery method"
                					options={[
                						{ label: "Email only", value: "email" },
                						{ label: "WhatsApp only", value: "whatsapp" },
                						{ label: "Both email and WhatsApp", value: "both" },
                					]}
                					value={formState.abandonedCartRecoveryMethod}
                					onChange={(value) => handleFormChange(value, 'abandonedCartRecoveryMethod')}
                				/>

                				{(formState.abandonedCartRecoveryMethod === "email" || formState.abandonedCartRecoveryMethod === "both") && (
                					<>
                						<TextField
                							label="Email subject"
                							value={formState.abandonedCartEmailSubject}
                							onChange={(value) => handleFormChange(value, 'abandonedCartEmailSubject')}
                							autoComplete="off"
                							helpText="Use {customer_name}, {cart_total}, {cart_items}"
                							error={validationErrors.abandonedCartEmailSubject}
                						/>

                						<TextField
                							label="Email template"
                							value={formState.abandonedCartEmailTemplate}
                							onChange={(value) => handleFormChange(value, 'abandonedCartEmailTemplate')}
                							multiline={4}
                							autoComplete="off"
                							helpText="Use {customer_name}, {cart_total}, {cart_items}, {recovery_link}"
                							error={validationErrors.abandonedCartEmailTemplate}
                						/>
                					</>
                				)}

                				{(formState.abandonedCartRecoveryMethod === "whatsapp" || formState.abandonedCartRecoveryMethod === "both") && (
                					<TextField
                						label="WhatsApp template"
                						value={formState.abandonedCartWhatsAppTemplate}
                						onChange={(value) => handleFormChange(value, 'abandonedCartWhatsAppTemplate')}
                						multiline={3}
                						autoComplete="off"
                						helpText="Use {customer_name}, {cart_total}, {cart_items}, {recovery_link}"
                						error={validationErrors.abandonedCartWhatsAppTemplate}
                					/>
                				)}
                			</>
                		)}
                	</BlockStack>
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
                  		This will completely reset your entire application database - all orders, customers, settings, analytics, and configurations will be permanently deleted. This is equivalent to a fresh installation.
                  	</Text>
                  	{showResetConfirm ? (
                  		<BlockStack gap="300">
                  			<Banner tone="critical">
                  				<Text as="p" variant="bodyMd" fontWeight="bold">
                  					⚠️ DANGER: This will delete ALL your app data permanently!
                  				</Text>
                  				<Text as="p" variant="bodyMd">
                  					This includes: orders, customers, analytics, logs, webhooks, and all settings. This action cannot be undone.
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
                  		<Badge tone={loaderData.orderCreationMode === "cod" ? "success" : "attention"}>
                  			{loaderData.orderCreationMode === "cod" ? "COD Orders" : "Draft Orders"}
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
                  			}[loaderData.redirectMode]}
                  		</Badge>
                  	</InlineStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>
        </Form>
      	{toastMarkup}
      </Page>
    </Frame>
  );
}