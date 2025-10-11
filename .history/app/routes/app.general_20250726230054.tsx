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
  enableTaxes: boolean;
  taxRate: string;
  taxCountries: string[];
  taxName: string;
  taxIsIncluded: boolean;
}

// FIX: Removed `.optional()` from string fields. This ensures the inferred type from Zod is `string`, not `string | undefined`,
// which matches the `GeneralSettings` interface and prevents type assignment errors. The `.or(z.literal(''))`
// correctly handles empty fields by allowing an empty string.
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
  enableTaxes: z.boolean(),
  taxRate: z.string().regex(/^\d+(\.\d{1,4})?$/, "Invalid rate. Use a number like 20 or 8.5.").or(z.literal('')),
  taxCountries: z.array(z.string()),
  taxName: z.string().max(50, "Tax name is too long (max 50 characters)."),
  taxIsIncluded: z.boolean(),
});

// FIX: Define a discriminated union type for the action response.
// This allows TypeScript to correctly narrow the type of `actionData`
// when you check the `success` property.
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
  enableTaxes: false,
  taxRate: "0",
  taxCountries: [],
  taxName: "VAT",
  taxIsIncluded: false,
};

const validateUrl = (url: string): boolean => {
  if (!url) return true; // Empty URL is valid in this context
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const settingsCache = new Map<string, { data: GeneralSettings; timestamp: number }>();

// Update your getCachedSettings function
const getCachedSettings = async (sessionId: string): Promise<GeneralSettings> => {
  const cacheKey = `settings:${sessionId}`;
  const cached = settingsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const settings = await db.shopSettings.findUnique({ where: { shopId: sessionId } });
  const parsedSettings =
    settings && settings.generalSettings
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings.generalSettings as string) }
      : DEFAULT_SETTINGS;

  settingsCache.set(cacheKey, { data: parsedSettings, timestamp: Date.now() });
  return parsedSettings;
};

// Update your loader
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  console.log("🔍 Session ID:", session.id);
  console.log("🏪 Shop domain:", session.shop);
  
  const generalSettings = await getCachedSettings(session.id); // Use session.id instead of session.shop
  return json(generalSettings);
};

// Update your action
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    console.log("🔍 Session ID:", session.id);
    console.log("🏪 Shop domain:", session.shop);

    let settingsToSave: GeneralSettings;

    if (actionType === "reset") {
      settingsToSave = DEFAULT_SETTINGS;
    } else {
      const rawSettings = {
        orderCreationMode: formData.get("orderCreationMode"),
        saveUtmParameters: formData.get("saveUtmParameters") === "true",
        disableShopifyDiscounts: formData.get("disableShopifyDiscounts") === "true",
        disableAutofill: formData.get("disableAutofill") === "true",
        trimLeadingZeroPhone: formData.get("trimLeadingZeroPhone") === "true",
        addOrderTag: formData.get("addOrderTag") === "true",
        redirectMode: formData.get("redirectMode"),
        redirectUrl: formData.get("redirectUrl") as string,
        whatsappRedirectPhone: formData.get("whatsappRedirectPhone") as string,
        whatsappRedirectMessage: formData.get("whatsappRedirectMessage") as string,
        customThankYouMessage: formData.get("customThankYouMessage") as string,
        enableTaxes: formData.get("enableTaxes") === "true",
        taxRate: formData.get("taxRate") as string,
        taxCountries: JSON.parse((formData.get("taxCountries") as string) || "[]"),
        taxName: formData.get("taxName") as string,
        taxIsIncluded: formData.get("taxIsIncluded") === "true",
      };

      const validationResult = generalSettingsSchema.safeParse(rawSettings);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return json({ success: false, error: `Validation failed: ${errorMessage}` }, { status: 400 });
      }

      settingsToSave = validationResult.data;

      if (settingsToSave.redirectMode === "custom" && !validateUrl(settingsToSave.redirectUrl)) {
        return json({ success: false, error: "Invalid redirect URL. Must be a valid http/https URL." }, { status: 400 });
      }

      settingsToSave.whatsappRedirectMessage = DOMPurify.sanitize(settingsToSave.whatsappRedirectMessage);
      settingsToSave.customThankYouMessage = DOMPurify.sanitize(settingsToSave.customThankYouMessage);
      settingsToSave.taxName = DOMPurify.sanitize(settingsToSave.taxName);
    }

    const previousSettings = await db.shopSettings.findUnique({ where: { shopId: session.id } }); // Use session.id

    await db.shopSettings.upsert({
      where: { shopId: session.id }, // Use session.id instead of session.shop
      update: { generalSettings: JSON.stringify(settingsToSave) },
      create: {
        shopId: session.id, // Use session.id instead of session.shop
        generalSettings: JSON.stringify(settingsToSave),
      },
    });

    settingsCache.delete(`settings:${session.id}`); // Use session.id
    await logSettingsChange(session.shop, {
      from: previousSettings?.generalSettings || "{}",
      to: JSON.stringify(settingsToSave)
    }, session.id);

    const message = actionType === "reset" ? "Settings have been reset to default." : "General settings saved successfully!";
    return json({ success: true, message });

  } catch (error) {
    console.error('General settings action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return json({ success: false, error: `Failed to save settings: ${errorMessage}` }, { status: 500 });
  }
};

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

export default function GeneralSettingsPage() {
  const loaderData = useLoaderData<typeof loader>();
  // FIX: Use the explicit `ActionResponse` type with `useActionData`.
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
    if (!result.success) {
      const errors: Record<string, string> = {};
      // FIX: The `ZodError` object has an `issues` property, not `errors`.
      result.error.issues.forEach((err: ZodIssue) => {
        const field = err.path[0] as string;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
      setValidationErrors(errors);
      setToastMessage("Please fix the errors before saving.");
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
        saveBar.show();
      } else {
        saveBar.hide();
      }
    }
  }, [hasUnsavedChanges, isLoading]);

  // FIX: With `actionData` correctly typed as a discriminated union, these `if/else`
  // statements now safely narrow the type, allowing access to `message` and `error`.
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
        subtitle="Configure order processing, form behavior, redirects, and tax calculations"
        backAction={{ content: "Dashboard", url: "/app" }}
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
                    {/* FIX: The ternary now works because `actionData` is a discriminated union. */}
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
                
                <SettingsSection title="Tax Settings" description="Configure automatic tax calculations for orders." collapsible defaultOpen={false}>
                    <Checkbox
                      label="Enable taxes on orders"
                      checked={formState.enableTaxes}
                      onChange={(checked) => handleFormChange(checked, "enableTaxes")}
                      helpText="If enabled, taxes will be added to the order total."
                    />
                    {formState.enableTaxes && (
                      <BlockStack gap="400">
                        <TextField
                          label="Tax Rate (%)"
                          value={formState.taxRate}
                          onChange={(value) => handleFormChange(value, "taxRate")}
                          placeholder="e.g., 19"
                          autoComplete="off"
                            error={validationErrors.taxRate}
                        />
                        <TextField
                          label="Tax Name"
                          value={formState.taxName}
                          onChange={(value) => handleFormChange(value, "taxName")}
                          placeholder="e.g., VAT, GST"
                          autoComplete="off"
                            error={validationErrors.taxName}
                        />
                        <Checkbox
                          label="My prices already include taxes"
                          checked={formState.taxIsIncluded}
                          onChange={(checked) => handleFormChange(checked, "taxIsIncluded")}
                          helpText="Select if your product prices are tax-inclusive."
                        />
                      </BlockStack>
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
                      <Text as="h3" variant="headingMd">Reset Settings</Text>
                    </InlineStack>
                    <Text as="p" tone="subdued">
                      Reset all settings to their original defaults. This action cannot be undone.
                    </Text>
                    {showResetConfirm ? (
                      <BlockStack gap="300">
                        <Banner tone="critical">Are you sure? This is permanent.</Banner>
                        <InlineStack gap="300" align="end">
                          <Button onClick={() => setShowResetConfirm(false)} disabled={isLoading}>Cancel</Button>
                          <Button onClick={handleReset} loading={isLoading} tone="critical">Yes, Reset</Button>
                        </InlineStack>
                      </BlockStack>
                    ) : (
                      <Button fullWidth onClick={handleReset} loading={isLoading} tone="critical" icon={ReplayIcon}>
                        Reset to Defaults
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
                     <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" tone="subdued">Taxes:</Text>
                      <Badge tone={loaderData.enableTaxes ? "success" : undefined}>
                        {loaderData.enableTaxes ? "Enabled" : "Disabled"}
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

function logSettingsChange(shop: string, arg1: { from: string; to: string; }, id: string) {
  throw new Error("Function not implemented.");
}
