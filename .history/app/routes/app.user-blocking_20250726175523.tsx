// app/routes/app.user-blocking.tsx

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form, useNavigation } from "@remix-run/react";
import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Checkbox,
  TextField,
  Button,
  Link,
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
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

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
}

// LOADER: Fetches existing settings from the database
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
  });

  // Safely parse settings or return defaults
  const userBlocking: UserBlockingSettings = settings?.userBlocking
    ? JSON.parse(settings.userBlocking as string)
    : {
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
      };

  return json(userBlocking);
};

// ACTION: Saves the settings to the database
export const action = async ({ request }: ActionFunctionArgs) => {
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
  };

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
};

export default function UserBlockingPage() {
  const loaderData = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [formState, setFormState] = useState(loaderData);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    orderLimits: true,
    blockLists: true,
    blockedMessage: true,
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

  const handleSubmit = () => {
    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    submit(formData, { method: "post" });
  };

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

  // Handle success message
  useEffect(() => {
    if (navigation.state === "idle" && hasUnsavedChanges && navigation.formData) {
      setToastMessage("Settings saved successfully!");
      setShowToast(true);
      // Update loader data to match form state
      setFormState(formState);
    }
  }, [navigation.state, hasUnsavedChanges, navigation.formData, formState]);

  // Count active blocking rules
  const getActiveRulesCount = () => {
    let count = 0;
    if (formState.limitSameCustomerOrders) count++;
    if (formState.blockByQuantity) count++;
    if (formState.blockedEmails.trim()) count++;
    if (formState.blockedPhoneNumbers.trim()) count++;
    if (formState.blockedIps.trim()) count++;
    if (formState.postalCodeMode !== "none") count++;
    return count;
  };

  const activeRulesCount = getActiveRulesCount();

  const toastMarkup = showToast ? (
    <Toast content={toastMessage} onDismiss={() => setShowToast(false)} />
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
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button 
          onClick={handleDiscard}
          disabled={isLoading}
        >
          Discard
        </button>
      </ui-save-bar>

      <Page
        title="User Blocking & Protection"
        subtitle="Protect your store from unwanted orders and manage customer access controls."
        titleMetadata={
          <Badge tone={activeRulesCount > 0 ? "success" : "info"}>
            {`${activeRulesCount} active rule${activeRulesCount !== 1 ? 's' : ''}`}
          </Badge>
        }
      >
        <Form method="post">
          <Layout>
            <Layout.Section>
              <BlockStack gap="600">
                
                {activeRulesCount === 0 && (
                  <Banner tone="info" title="No blocking rules active">
                    <Text as="p">
                      Configure blocking rules below to protect your store from unwanted orders, 
                      spam, or abusive customers. All rules work together to provide comprehensive protection.
                    </Text>
                  </Banner>
                )}

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
                                    label="Hours"
                                    labelHidden
                                    type="number"
                                    value={formState.limitSameCustomerHours}
                                    onChange={(value) => handleFormChange(value, 'limitSameCustomerHours')}
                                    autoComplete="off"
                                    min="1"
                                    max="168"
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
                                    label="Quantity"
                                    labelHidden
                                    type="number"
                                    value={formState.blockQuantityAmount}
                                    onChange={(value) => handleFormChange(value, 'blockQuantityAmount')}
                                    autoComplete="off"
                                    min="1"
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
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ marginRight: '2px' }}>
                                  <Icon source={EmailIcon} tone="subdued" />
                                </div>
                                <Text as="h3" variant="headingMd">Email Addresses</Text>
                              </div>
                              <TextField
                                label="Blocked email addresses"
                                labelHidden
                                multiline={4}
                                value={formState.blockedEmails}
                                onChange={(value) => handleFormChange(value, 'blockedEmails')}
                                placeholder="user@example.com&#10;spam@domain.com&#10;..."
                                helpText="Enter one email per line"
                                autoComplete="off"
                              />
                            </BlockStack>
                          </Layout.Section>
                          
                          <Layout.Section variant="oneHalf">
                            <BlockStack gap="200">
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ marginRight: '2px' }}>
                                  <Icon source={PhoneIcon} tone="subdued" />
                                </div>
                                <Text as="h3" variant="headingSm">Phone Numbers</Text>
                              </div>
                              <TextField
                                label="Blocked phone numbers"
                                labelHidden
                                multiline={4}
                                value={formState.blockedPhoneNumbers}
                                placeholder="1234567890&#10;9876543210&#10;..."
                                onChange={(value) => handleFormChange(value, 'blockedPhoneNumbers')}
                                helpText="Enter numbers without country code, one per line"
                                autoComplete="off"
                              />
                            </BlockStack>
                          </Layout.Section>
                          
                          <Layout.Section variant="oneHalf">
                            <BlockStack gap="200">
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ marginRight: '2px' }}>
                                  <Icon source={GlobeIcon} tone="critical" />
                                </div>
                                <Text as="h3" variant="headingSm">Blocked IP Addresses</Text>
                              </div>
                              <TextField
                                label="Blocked IP addresses"
                                labelHidden
                                multiline={4}
                                value={formState.blockedIps}
                                placeholder="192.168.1.1&#10;10.0.0.1&#10;..."
                                onChange={(value) => handleFormChange(value, 'blockedIps')}
                                helpText="One IP per line."
                                autoComplete="off"
                              />
                            </BlockStack>
                          </Layout.Section>
                          
                          <Layout.Section variant="oneHalf">
                            <BlockStack gap="200">
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ marginRight: '2px' }}>
                                  <Icon source={GlobeIcon} tone="success" />
                                </div>
                                <Text as="h3" variant="headingSm">Allowed IP Addresses</Text>
                              </div>
                              <TextField
                                label="Always allowed IP addresses"
                                labelHidden
                                multiline={4}
                                value={formState.allowedIps}
                                placeholder="192.168.1.100&#10;10.0.0.100&#10;..."
                                onChange={(value) => handleFormChange(value, 'allowedIps')}
                                helpText="These IPs bypass all blocking rules."
                                autoComplete="off"
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
                          This message appears in your order form when a customer is blocked. 
                          Keep it professional and helpful.
                        </Text>
                        <TextField
                          label="Blocked customer message"
                          labelHidden
                          multiline={3}
                          value={formState.blockedMessage}
                          onChange={(value) => handleFormChange(value, 'blockedMessage')}
                          placeholder="We're unable to process your order at this time. Please contact our support team for assistance."
                          helpText="Keep the message professional and avoid revealing specific blocking reasons"
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
                          Useful for limiting delivery areas or compliance requirements.
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
                                onChange={(value) => handleFormChange(value, 'postalCodeList')}
                                placeholder="12345&#10;90210&#10;M5V 3L9&#10;..."
                                helpText="Enter one postal code per line. Supports various formats (ZIP, postal codes, etc.)"
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
                        {formState.postalCodeMode !== "none" && (
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
      </Page>
    </Frame>
  );
}