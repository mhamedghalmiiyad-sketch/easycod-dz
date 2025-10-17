// app/routes/app.user-blocking.tsx

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form, useNavigation, useActionData } from "@remix-run/react";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getLanguageFromRequest, getTranslations, isRTL } from "../utils/i18n.server";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Checkbox,
  TextField,
  Button,
  Frame,
  Toast,
  Banner,
  ChoiceList,
  InlineStack,
  Box,
  Divider,
  Icon,
  Badge,
  Tooltip,
  Collapsible,
  Grid, // Added for the new section
} from "@shopify/polaris";
import {
  LockIcon,
  ClockIcon,
  HideIcon,
  EmailIcon,
  PhoneIcon,
  GlobeIcon,
  LocationIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertDiamondIcon, // Added for the new section
} from "@shopify/polaris-icons";
import { getAuthenticate } from "\.\.\/lib\/shopify\.lazy\.server";
import { db } from "../db.server";

// Define the shape of user blocking settings
interface UserBlockingSettings {
  limitSameCustomerOrders: boolean;
  limitSameCustomerHours: string;
  blockByQuantity: boolean;
  blockQuantityAmount: string;
  blockedEmails: string;
  blockedPhoneNumbers: string;
  blockedIps: string;
  allowedIps: string;
  blockedMessage: string;
  postalCodeMode: "none" | "exclude" | "allow";
  postalCodeList: string;
  // NEW: Risk scoring settings
  enableRiskScoring: boolean;
  autoRejectHighRisk: boolean;
  highRiskThreshold: string;
  reviewRiskThreshold: string;
  riskScoringBlacklist: string;
}

// LOADER: Fetches existing settings from the database
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const authenticate = await getAuthenticate();
  const { session } = await authenticate.admin(request);
  const language = await getLanguageFromRequest(request);
  const translations = await getTranslations(language);
  const rtl = isRTL(language);
  
  const settings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
  });

  const defaults: UserBlockingSettings = {
    limitSameCustomerOrders: false,
    limitSameCustomerHours: "24",
    blockByQuantity: false,
    blockQuantityAmount: "5",
    blockedEmails: "",
    blockedPhoneNumbers: "",
    blockedIps: "",
    allowedIps: "",
    blockedMessage: "Your order could not be processed at this time.",
    postalCodeMode: "none",
    postalCodeList: "",
    // NEW DEFAULTS
    enableRiskScoring: false,
    autoRejectHighRisk: false,
    highRiskThreshold: "80",
    reviewRiskThreshold: "50",
    riskScoringBlacklist: "",
  };

  // Safely parse settings and merge with defaults to handle migrations
  const userBlocking: UserBlockingSettings = settings?.userBlocking
    ? { ...defaults, ...JSON.parse(settings.userBlocking as string) }
    : defaults;

  return json({
    ...userBlocking,
    language,
    translations,
    rtl,
  });
};

// Server-side validation function
function validateServerSideSettings(settings: UserBlockingSettings): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate hours
  const hours = parseInt(settings.limitSameCustomerHours, 10);
  if (settings.limitSameCustomerOrders && (isNaN(hours) || hours < 1 || hours > 168)) {
    errors.push('Order limit hours must be between 1 and 168');
  }

  // Validate quantity
  const quantity = parseInt(settings.blockQuantityAmount, 10);
  if (settings.blockByQuantity && (isNaN(quantity) || quantity < 1)) {
    errors.push('Block quantity must be a positive number');
  }

  // Validate emails
  if (settings.blockedEmails.trim()) {
    const emails = settings.blockedEmails.split('\n').map(e => e.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      errors.push(`Invalid email addresses found: ${invalidEmails.slice(0, 3).join(', ')}`);
    }
  }

  // Validate IP addresses
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

  if (settings.blockedIps.trim()) {
    const ips = settings.blockedIps.split('\n').map(ip => ip.trim()).filter(Boolean);
    const invalidIps = ips.filter(ip => {
      if (!ipRegex.test(ip)) return true;
      const parts = ip.split('.').map(Number);
      return parts.some(part => part > 255);
    });
    if (invalidIps.length > 0) {
      errors.push('Invalid blocked IP addresses found');
    }
  }

  if (settings.allowedIps.trim()) {
    const ips = settings.allowedIps.split('\n').map(ip => ip.trim()).filter(Boolean);
    const invalidIps = ips.filter(ip => {
      if (!ipRegex.test(ip)) return true;
      const parts = ip.split('.').map(Number);
      return parts.some(part => part > 255);
    });
    if (invalidIps.length > 0) {
      errors.push('Invalid allowed IP addresses found');
    }
  }

  // Validate postal codes if geographic restrictions are enabled
  if (settings.postalCodeMode !== 'none' && !settings.postalCodeList.trim()) {
    errors.push('Postal code list cannot be empty when geographic restrictions are enabled');
  }

  // NEW: Validate Risk Scoring Settings
  if (settings.enableRiskScoring) {
    const highRisk = parseInt(settings.highRiskThreshold, 10);
    if (isNaN(highRisk) || highRisk < 50 || highRisk > 100) {
      errors.push('High risk threshold must be between 50 and 100');
    }

    const reviewRisk = parseInt(settings.reviewRiskThreshold, 10);
    if (isNaN(reviewRisk) || reviewRisk < 20 || reviewRisk > 80) {
      errors.push('Review risk threshold must be between 20 and 80');
    }

    if (!isNaN(highRisk) && !isNaN(reviewRisk) && reviewRisk >= highRisk) {
      errors.push('Review threshold must be lower than the high risk threshold.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ACTION: Saves the settings to the database
export const action = async ({ request }: ActionFunctionArgs) => {
  const authenticate = await getAuthenticate();
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const settings: UserBlockingSettings = {
    limitSameCustomerOrders: formData.get("limitSameCustomerOrders") === "true",
    limitSameCustomerHours: formData.get("limitSameCustomerHours") as string,
    blockByQuantity: formData.get("blockByQuantity") === "true",
    blockQuantityAmount: formData.get("blockQuantityAmount") as string,
    blockedEmails: formData.get("blockedEmails") as string,
    blockedPhoneNumbers: formData.get("blockedPhoneNumbers") as string,
    blockedIps: formData.get("blockedIps") as string,
    allowedIps: formData.get("allowedIps") as string,
    blockedMessage: formData.get("blockedMessage") as string,
    postalCodeMode: formData.get("postalCodeMode") as "none" | "exclude" | "allow",
    postalCodeList: formData.get("postalCodeList") as string,
    // NEW FIELDS
    enableRiskScoring: formData.get("enableRiskScoring") === "true",
    autoRejectHighRisk: formData.get("autoRejectHighRisk") === "true",
    highRiskThreshold: formData.get("highRiskThreshold") as string,
    reviewRiskThreshold: formData.get("reviewRiskThreshold") as string,
    riskScoringBlacklist: formData.get("riskScoringBlacklist") as string,
  };

  // Validate the settings on the server
  const validation = validateServerSideSettings(settings);
  if (!validation.isValid) {
    return json({
      success: false,
      message: `Validation failed: ${validation.errors.join(', ')}`
    }, { status: 400 });
  }

  try {
    await db.shopSettings.upsert({
      where: { shopId: session.shop },
      update: {
        updatedAt: new Date(),
        userBlocking: JSON.stringify(settings),
      },
      create: {
        shopId: session.shop,
        userBlocking: JSON.stringify(settings),
      },
    });

    return json({ success: true, message: "User blocking settings saved successfully!" });
  } catch (error) {
    console.error('Database error:', error);
    return json({
      success: false,
      message: "Failed to save settings. Please try again."
    }, { status: 500 });
  }
};


export default function UserBlockingPage() {
  const loaderData = useLoaderData<typeof loader>();
  const { t } = useTranslation('protection');
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [formState, setFormState] = useState(loaderData);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState({
    orderLimits: true,
    blockLists: true,
    blockedMessage: true,
    riskScoring: false, // New section, start collapsed
    postalCodes: true,
  });

  const isLoading = navigation.state === "submitting";
  const hasUnsavedChanges = JSON.stringify(formState) !== JSON.stringify(loaderData);

  const handleFormChange = useCallback((value: string | boolean | string[], name: keyof UserBlockingSettings) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePostalCodeChoiceChange = useCallback((value: string[]) => {
    const mode = value[0] as "none" | "exclude" | "allow";
    handleFormChange(mode, 'postalCodeMode');
  }, [handleFormChange]);

  const validateFormData = useCallback(() => {
    const errors: Record<string, string> = {};

    if (formState.limitSameCustomerOrders) {
      const hours = parseInt(formState.limitSameCustomerHours, 10);
      if (isNaN(hours) || hours < 1 || hours > 168) {
        errors.limitSameCustomerHours = 'Hours must be between 1 and 168.';
      }
    }

    if (formState.blockByQuantity) {
      const quantity = parseInt(formState.blockQuantityAmount, 10);
      if (isNaN(quantity) || quantity < 1) {
        errors.blockQuantityAmount = 'Quantity must be a positive number.';
      }
    }

    if (formState.blockedEmails.trim()) {
      const emails = formState.blockedEmails.split('\n').map(e => e.trim()).filter(Boolean);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emails.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        errors.blockedEmails = `Invalid email format: ${invalidEmails.slice(0, 3).join(', ')}${invalidEmails.length > 3 ? '...' : ''}`;
      }
    }

    if (formState.blockedPhoneNumbers.trim()) {
      const phones = formState.blockedPhoneNumbers.split('\n').map(p => p.trim()).filter(Boolean);
      const invalidPhones = phones.filter(phone => !/^\d+$/.test(phone.replace(/\D/g, '')));
      if (invalidPhones.length > 0) {
        errors.blockedPhoneNumbers = 'Phone numbers should only contain digits.';
      }
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (formState.blockedIps.trim()) {
      const ips = formState.blockedIps.split('\n').map(ip => ip.trim()).filter(Boolean);
      const invalidIps = ips.filter(ip => !ipRegex.test(ip));
      if (invalidIps.length > 0) {
        errors.blockedIps = 'Invalid IP address format.';
      }
    }

    if (formState.allowedIps.trim()) {
      const ips = formState.allowedIps.split('\n').map(ip => ip.trim()).filter(Boolean);
      const invalidIps = ips.filter(ip => !ipRegex.test(ip));
      if (invalidIps.length > 0) {
        errors.allowedIps = 'Invalid IP address format.';
      }
    }

    // NEW: Risk Scoring Validation
    if (formState.enableRiskScoring) {
      const highRisk = parseInt(formState.highRiskThreshold, 10);
      if (isNaN(highRisk) || highRisk < 50 || highRisk > 100) {
        errors.highRiskThreshold = 'Must be between 50 and 100.';
      }

      const reviewRisk = parseInt(formState.reviewRiskThreshold, 10);
      if (isNaN(reviewRisk) || reviewRisk < 20 || reviewRisk > 80) {
        errors.reviewRiskThreshold = 'Must be between 20 and 80.';
      }

      if (!isNaN(highRisk) && !isNaN(reviewRisk) && reviewRisk >= highRisk) {
        errors.reviewRiskThreshold = 'Review threshold must be less than high risk.';
        errors.highRiskThreshold = 'High risk must be greater than review.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formState]);

  const handleSubmit = useCallback(() => {
    if (isLoading) return;

    if (!validateFormData()) {
      setToastMessage("Please fix the validation errors before saving.");
      setShowToast(true);
      return;
    }

    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    submit(formData, {
      method: "post",
      replace: true // Prevents duplicate entries in browser history
    });
  }, [formState, isLoading, submit, validateFormData]);

  const handleReset = () => {
    setFormState(loaderData);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Show/hide save bar based on unsaved changes
  useEffect(() => {
    const saveBar = document.getElementById('user-blocking-save-bar') as any;
    if (saveBar) {
      if (hasUnsavedChanges && !isLoading) {
        saveBar.show();
      } else {
        saveBar.hide();
      }
    }
  }, [hasUnsavedChanges, isLoading]);

  const handleDiscard = () => {
    setFormState(loaderData);
  };

  // Handle toast messages for success or failure from action
  useEffect(() => {
    if (actionData) {
      setToastMessage(actionData.message);
      setShowToast(true);
    }
  }, [actionData]);

  // Count active blocking rules
  const getActiveRulesCount = () => {
    let count = 0;
    if (formState.limitSameCustomerOrders) count++;
    if (formState.blockByQuantity) count++;
    if (formState.blockedEmails.trim()) count++;
    if (formState.blockedPhoneNumbers.trim()) count++;
    if (formState.blockedIps.trim()) count++;
    if (formState.postalCodeMode !== "none" && formState.postalCodeList.trim()) count++;
    if (formState.enableRiskScoring) count++; // NEW
    return count;
  };

  // Handle keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (hasUnsavedChanges && !isLoading) {
          handleSubmit();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, isLoading, handleSubmit]);

  // Cleanup effect for save bar on unmount
  useEffect(() => {
    return () => {
      const saveBar = document.getElementById('user-blocking-save-bar') as any;
      if (saveBar) {
        saveBar.hide();
      }
    };
  }, []);

  const activeRulesCount = getActiveRulesCount();

  const getPostalCodeValidationText = () => {
    if (formState.postalCodeMode === 'none') return null;
    const count = formState.postalCodeList.split('\n').filter(code => code.trim()).length;
    if (count === 0) return null;

    const action = formState.postalCodeMode === 'exclude' ? 'blocked' : 'allowed';
    return `${count} postal code${count !== 1 ? 's' : ''} ${action}`;
  };

  const toastMarkup = showToast ? (
    <Toast content={toastMessage} onDismiss={() => setShowToast(false)} error={actionData?.success === false} />
  ) : null;

  return (
    <Frame>
      {/* Shopify Save Bar */}
      <ui-save-bar id="user-blocking-save-bar">
        <button
          variant="primary"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? t('common:saving') : t('common:save')}
        </button>
        <button
          onClick={handleDiscard}
          disabled={isLoading}
        >
          {t('common:discard')}
        </button>
      </ui-save-bar>
        <Form method="post">
          <Layout>
            <Layout.Section>
              <BlockStack gap="600">


                {/* Order Limits Section */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={ClockIcon} tone="base" />
                        <Text as="h2" variant="headingMd">Order Limits</Text>
                        <Tooltip content="Prevent customers from placing multiple orders in a short time period">
                          <Icon source={InfoIcon} tone="subdued" />
                        </Tooltip>
                      </InlineStack>
                      <Button
                        variant="plain"
                        icon={expandedSections.orderLimits ? ChevronUpIcon : ChevronDownIcon}
                        onClick={() => toggleSection('orderLimits')}
                        accessibilityLabel="Toggle order limits section"
                      />
                    </InlineStack>

                    <Collapsible id="order-limits-section" open={expandedSections.orderLimits}>
                      <BlockStack gap="400">
                        <Divider />
                        <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                          <Checkbox
                            label={
                              <InlineStack gap="200" blockAlign="center" wrap={false}>
                                <Text as="span">Limit repeat orders from the same customer within</Text>
                                <Box minWidth="80px">
                                  <TextField
                                    label={t('orderLimits.hours')}
                                    labelHidden
                                    type="number"
                                    value={formState.limitSameCustomerHours}
                                    onChange={(value) => handleFormChange(value, 'limitSameCustomerHours')}
                                    autoComplete="off"
                                    min="1"
                                    max="168"
                                    error={validationErrors.limitSameCustomerHours}
                                  />
                                </Box>
                                <Text as="span">hours</Text>
                              </InlineStack>
                            }
                            helpText="Customers are identified by IP address, email, or phone number combination"
                            checked={formState.limitSameCustomerOrders}
                            onChange={(checked) => handleFormChange(checked, 'limitSameCustomerOrders')}
                          />
                        </Box>

                        <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                          <Checkbox
                            label={
                              <InlineStack gap="200" blockAlign="center" wrap={false}>
                                <Text as="span">Block orders with more than</Text>
                                <Box minWidth="80px">
                                  <TextField
                                    label={t('orderLimits.quantity')}
                                    labelHidden
                                    type="number"
                                    value={formState.blockQuantityAmount}
                                    onChange={(value) => handleFormChange(value, 'blockQuantityAmount')}
                                    autoComplete="off"
                                    min="1"
                                    error={validationErrors.blockQuantityAmount}
                                  />
                                </Box>
                                <Text as="span">total items</Text>
                              </InlineStack>
                            }
                            helpText="Useful for preventing bulk orders or inventory hoarding"
                            checked={formState.blockByQuantity}
                            onChange={(checked) => handleFormChange(checked, 'blockByQuantity')}
                          />
                        </Box>
                      </BlockStack>
                    </Collapsible>
                  </BlockStack>
                </Card>

                {/* Block Lists Section */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={LockIcon} tone="base" />
                        <Text as="h2" variant="headingMd">Block Lists</Text>
                        <Tooltip content="Block specific customers by email, phone, or IP address">
                          <Icon source={InfoIcon} tone="subdued" />
                        </Tooltip>
                      </InlineStack>
                      <Button
                        variant="plain"
                        icon={expandedSections.blockLists ? ChevronUpIcon : ChevronDownIcon}
                        onClick={() => toggleSection('blockLists')}
                        accessibilityLabel="Toggle block lists section"
                      />
                    </InlineStack>

                    <Collapsible id="block-lists-section" open={expandedSections.blockLists}>
                      <BlockStack gap="500">
                        <Divider />
                        <Layout>
                          <Layout.Section variant="oneHalf">
                            <BlockStack gap="200">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon source={EmailIcon} tone="subdued" />
                                <Text as="h3" variant="headingSm">Email Addresses</Text>
                              </div>
                              <TextField
                                label={t('blockLists.blockedEmails')}
                                labelHidden
                                multiline={4}
                                value={formState.blockedEmails}
                                onChange={(value) => handleFormChange(value, 'blockedEmails')}
                                placeholder="user@example.com&#10;spam@domain.com&#10;..."
                                helpText="Enter one email per line"
                                autoComplete="off"
                                error={validationErrors.blockedEmails}
                              />
                            </BlockStack>
                          </Layout.Section>

                          <Layout.Section variant="oneHalf">
                            <BlockStack gap="200">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon source={PhoneIcon} tone="subdued" />
                                <Text as="h3" variant="headingSm">Phone Numbers</Text>
                              </div>
                              <TextField
                                label={t('blockLists.blockedPhones')}
                                labelHidden
                                multiline={4}
                                value={formState.blockedPhoneNumbers}
                                onChange={(value) => handleFormChange(value, 'blockedPhoneNumbers')}
                                placeholder="1234567890&#10;9876543210&#10;..."
                                helpText="Enter one number per line"
                                autoComplete="off"
                                error={validationErrors.blockedPhoneNumbers}
                              />
                            </BlockStack>
                          </Layout.Section>

                          <Layout.Section variant="oneHalf">
                            <BlockStack gap="200">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon source={GlobeIcon} tone="critical" />
                                <Text as="h3" variant="headingSm">Blocked IP Addresses</Text>
                              </div>
                              <TextField
                                label={t('blockLists.blockedIPs')}
                                labelHidden
                                multiline={4}
                                value={formState.blockedIps}
                                onChange={(value) => handleFormChange(value, 'blockedIps')}
                                placeholder="192.168.1.1&#10;10.0.0.1&#10;..."
                                helpText="One IP per line."
                                autoComplete="off"
                                error={validationErrors.blockedIps}
                              />
                            </BlockStack>
                          </Layout.Section>

                          <Layout.Section variant="oneHalf">
                            <BlockStack gap="200">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon source={GlobeIcon} tone="success" />
                                <Text as="h3" variant="headingSm">Allowed IP Addresses</Text>
                              </div>
                              <TextField
                                label={t('blockLists.allowedIPs')}
                                labelHidden
                                multiline={4}
                                value={formState.allowedIps}
                                onChange={(value) => handleFormChange(value, 'allowedIps')}
                                placeholder="192.168.1.100&#10;10.0.0.100&#10;..."
                                helpText="These IPs bypass all blocking rules."
                                autoComplete="off"
                                error={validationErrors.allowedIps}
                              />
                            </BlockStack>
                          </Layout.Section>
                        </Layout>
                      </BlockStack>
                    </Collapsible>
                  </BlockStack>
                </Card>

                {/* Blocked Message Section */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={HideIcon} tone="base" />
                        <Text as="h2" variant="headingMd">Customer Message</Text>
                        <Tooltip content="Message shown to blocked customers">
                          <Icon source={InfoIcon} tone="subdued" />
                        </Tooltip>
                      </InlineStack>
                      <Button
                        variant="plain"
                        icon={expandedSections.blockedMessage ? ChevronUpIcon : ChevronDownIcon}
                        onClick={() => toggleSection('blockedMessage')}
                        accessibilityLabel="Toggle blocked message section"
                      />
                    </InlineStack>

                    <Collapsible id="blocked-message-section" open={expandedSections.blockedMessage}>
                      <BlockStack gap="400">
                        <Divider />
                        <Text as="p" tone="subdued">
                          This message appears in your checkout when a customer is blocked.
                        </Text>
                        <TextField
                          label="Blocked customer message"
                          labelHidden
                          multiline={3}
                          value={formState.blockedMessage}
                          onChange={(value) => handleFormChange(value, 'blockedMessage')}
                          placeholder="We're unable to process your order at this time. Please contact our support team for assistance."
                          helpText="Keep the message professional and avoid revealing specific blocking reasons."
                          autoComplete="off"
                        />
                        <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            <strong>Preview:</strong> {formState.blockedMessage}
                          </Text>
                        </Box>
                      </BlockStack>
                    </Collapsible>
                  </BlockStack>
                </Card>

                {/* NEW: Risk Scoring Section */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={AlertDiamondIcon} tone="base" />
                        <Text as="h2" variant="headingMd">Automated Risk Scoring</Text>
                        <Tooltip content="Automatically assess order risk based on multiple factors to prevent RTO and fraud.">
                          <Icon source={InfoIcon} tone="subdued" />
                        </Tooltip>
                      </InlineStack>
                      <Button
                        variant="plain"
                        icon={expandedSections.riskScoring ? ChevronUpIcon : ChevronDownIcon}
                        onClick={() => toggleSection('riskScoring')}
                        accessibilityLabel="Toggle risk scoring section"
                      />
                    </InlineStack>
                    <Collapsible id="risk-scoring-section" open={expandedSections.riskScoring}>
                      <BlockStack gap="400">
                        <Divider />
                        <Text as="p" tone="subdued">
                          Automatically assess order risk based on multiple factors to prevent Return-to-Origin (RTO) and fraud.
                        </Text>
                        <Checkbox
                          label={t('riskScoring.enableRiskScoring')}
                          checked={formState.enableRiskScoring}
                          onChange={(checked) => handleFormChange(checked, 'enableRiskScoring')}
                          helpText="Automatically calculate risk scores for orders based on various factors"
                        />

                        {formState.enableRiskScoring && (
                          <BlockStack gap="400">
                            <Grid>
                              <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}>
                                <TextField
                                  type="number"
                                  label={t('riskScoring.highRiskThreshold')}
                                  value={formState.highRiskThreshold}
                                  onChange={(value) => handleFormChange(value, 'highRiskThreshold')}
                                  min={50}
                                  max={100}
                                  autoComplete="off"
                                  helpText="Orders scoring above this will be high risk"
                                  suffix="points"
                                  error={validationErrors.highRiskThreshold}
                                />
                              </Grid.Cell>
                              <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}>
                                <TextField
                                  type="number"
                                  label="Review threshold"
                                  value={formState.reviewRiskThreshold}
                                  onChange={(value) => handleFormChange(value, 'reviewRiskThreshold')}
                                  min={20}
                                  max={80}
                                  autoComplete="off"
                                  helpText="Orders scoring above this need review"
                                  suffix="points"
                                  error={validationErrors.reviewRiskThreshold}
                                />
                              </Grid.Cell>
                            </Grid>

                            <Checkbox
                              label="Automatically reject high-risk orders"
                              checked={formState.autoRejectHighRisk}
                              onChange={(checked) => handleFormChange(checked, 'autoRejectHighRisk')}
                              helpText="Automatically block orders that exceed the high risk threshold"
                            />

                            <TextField
                              label="Suspicious email domains"
                              value={formState.riskScoringBlacklist}
                              onChange={(value) => handleFormChange(value, 'riskScoringBlacklist')}
                              multiline={3}
                              autoComplete="off"
                              helpText="One domain per line (e.g., tempmail.org)"
                              placeholder="10minutemail.com&#10;tempmail.org&#10;guerrillamail.com"
                            />
                          </BlockStack>
                        )}
                      </BlockStack>
                    </Collapsible>
                  </BlockStack>
                </Card>

                {/* Postal Code Section */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={LocationIcon} tone="base" />
                        <Text as="h2" variant="headingMd">Geographic Restrictions</Text>
                        <Tooltip content="Control access based on postal codes">
                          <Icon source={InfoIcon} tone="subdued" />
                        </Tooltip>
                      </InlineStack>
                      <Button
                        variant="plain"
                        icon={expandedSections.postalCodes ? ChevronUpIcon : ChevronDownIcon}
                        onClick={() => toggleSection('postalCodes')}
                        accessibilityLabel="Toggle postal codes section"
                      />
                    </InlineStack>

                    <Collapsible id="postal-codes-section" open={expandedSections.postalCodes}>
                      <BlockStack gap="400">
                        <Divider />
                        <Text as="p" tone="subdued">
                          Restrict or allow orders based on customer postal codes.
                          Useful for limiting delivery areas.
                        </Text>

                        <ChoiceList
                          title="Geographic restriction mode"
                          titleHidden
                          choices={[
                            {
                              label: "No geographic restrictions",
                              value: "none",
                              helpText: "Accept orders from any postal code"
                            },
                            {
                              label: "Block specific postal codes",
                              value: "exclude",
                              helpText: "Prevent orders from listed postal codes"
                            },
                            {
                              label: "Allow only specific postal codes",
                              value: "allow",
                              helpText: "Only accept orders from listed postal codes"
                            },
                          ]}
                          selected={[formState.postalCodeMode]}
                          onChange={handlePostalCodeChoiceChange}
                        />

                        {formState.postalCodeMode !== "none" && (
                          <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                            <BlockStack gap="300">
                              <Text as="h3" variant="headingSm">
                                {formState.postalCodeMode === "exclude" ? "Blocked" : "Allowed"} Postal Codes
                              </Text>
                              <TextField
                                label="Postal codes list"
                                labelHidden
                                multiline={4}
                                value={formState.postalCodeList}
                                onChange={(value) => {
                                  const cleanedValue = value.split('\n')
                                    .map(line => line.trim().toUpperCase())
                                    .join('\n');
                                  handleFormChange(cleanedValue, 'postalCodeList');
                                }}
                                placeholder="12345&#10;90210&#10;M5V 3L9&#10;..."
                                helpText={`Enter one postal code per line. ${getPostalCodeValidationText() || ''}`}
                                autoComplete="off"
                              />
                            </BlockStack>
                          </Box>
                        )}
                      </BlockStack>
                    </Collapsible>
                  </BlockStack>
                </Card>

                {/* Summary Card */}
                {activeRulesCount > 0 && (
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={HideIcon} tone="success" />
                        <Text as="h3" variant="headingMd">Protection Summary</Text>
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        Your store is protected by <strong>{activeRulesCount}</strong> active blocking rule{activeRulesCount !== 1 ? 's' : ''}:
                      </Text>
                      <InlineStack gap="200" wrap>
                        {formState.limitSameCustomerOrders && (
                          <Badge tone="info">Order time limits</Badge>
                        )}
                        {formState.blockByQuantity && (
                          <Badge tone="info">Quantity limits</Badge>
                        )}
                        {formState.blockedEmails.trim() && (
                          <Badge tone="warning">Email blocks</Badge>
                        )}
                        {formState.blockedPhoneNumbers.trim() && (
                          <Badge tone="warning">Phone blocks</Badge>
                        )}
                        {formState.blockedIps.trim() && (
                          <Badge tone="critical">IP blocks</Badge>
                        )}
                        {formState.enableRiskScoring && (
                          <Badge tone="attention">Risk Scoring</Badge>
                        )}
                        {formState.postalCodeMode !== "none" && formState.postalCodeList.trim() && (
                          <Badge tone="attention">Geographic restrictions</Badge>
                        )}
                      </InlineStack>
                    </BlockStack>
                  </Card>
                )}

              </BlockStack>
            </Layout.Section>
          </Layout>
        </Form>
        {toastMarkup}
    </Frame>
  );
}
