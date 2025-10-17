// app/routes/app.google-sheets.tsx

import { useState, useCallback, useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Banner,
  Text,
  Spinner,
  Frame,
  Toast,
  Link,
  Checkbox,
  Select,
  Box,
  InlineStack,
  Icon,
  Divider,
  Badge,
  CalloutCard,
  EmptyState,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
// Custom Google Icon SVG that matches Shopify's design
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

import { 
  CheckCircleIcon, 
  AlertCircleIcon, 
  ExternalIcon,
  SettingsIcon,
  ImportIcon,
  ConnectIcon,
  XCircleIcon
} from '@shopify/polaris-icons';
import { getAuthenticate } from "\.\.\/lib\/shopify\.lazy\.server";
import { db } from "../db.server";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// LOADER: Fetches settings and determines login state
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const authenticate = await getAuthenticate();$n  const { session } = await authenticate.admin(request);

  const settings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
  });

  if (!settings?.googleRefreshToken) {
    return json({ isLoggedIn: false, settings: null, spreadsheets: [] });
  }

  // User is logged in, fetch their spreadsheets
  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({ refresh_token: settings.googleRefreshToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: "files(id, name)",
      pageSize: 100,
    });

    return json({
      isLoggedIn: true,
      settings,
      spreadsheets: response.data.files || [],
    });
  } catch (error) {
    console.error("Failed to fetch spreadsheets", error);
    // If token fails, treat as logged out
    return json({ isLoggedIn: false, settings: null, spreadsheets: [] });
  }
};

// ACTION: Saves the Google Sheet settings
export const action = async ({ request }: ActionFunctionArgs) => {
  const authenticate = await getAuthenticate();$n  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const updates = {
    googleSheetId: formData.get("sheetId") as string,
    googleSheetName: formData.get("sheetName") as string,
    googleSheetTabName: formData.get("tabName") as string,
    googleSheetImportOrders: formData.get("importOrders") === "on",
    googleSheetImportLines: formData.get("importLines") === "on",
  };

  await db.shopSettings.update({ where: { shopId: session.shop }, data: updates });
  return json({ success: true, message: "Settings saved successfully!" });
};

export default function GoogleSheetsPage() {
  const { isLoggedIn, settings, spreadsheets } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);
      setIsLoading(false);
    }
  }, [actionData]);

  const toastMarkup = showToast ? (
    <Toast 
      content={actionData?.message || ""} 
      onDismiss={() => setShowToast(false)}
      duration={4500}
    />
  ) : null;

  if (!isLoggedIn) {
    return <GoogleLoginView />;
  }

  return (
    <Frame>
      {/* Save Bar Component */}
      <ui-save-bar id="google-sheets-save-bar">
        <button variant="primary" id="save-button"></button>
        <button id="discard-button"></button>
      </ui-save-bar>
        <Form method="post">
          <Layout>
          <Layout.Section variant="oneHalf">
            <GoogleSettingsView 
              settings={settings} 
              spreadsheets={spreadsheets}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              submit={submit}
            />
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <IntegrationInfoCard settings={settings} />
          </Layout.Section>
          </Layout>
        </Form>
        {toastMarkup}
    </Frame>
  );
}

// ---- Sub-components for each state ----

function GoogleLoginView() {
  const [isConnecting, setIsConnecting] = useState(false);

  return (
    <Frame>
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="500">
              <InlineStack align="center" gap="300">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <GoogleIcon />
                </div>
                <Text as="h2" variant="headingLg">
                  Connect Google Sheets
                </Text>
              </InlineStack>
              
              <Text as="p" variant="bodyMd" tone="subdued">
                Automatically import your COD form orders to Google Sheets. Keep your data organized and accessible from anywhere.
              </Text>
              
              <Divider />
              
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  What you'll get:
                </Text>
                <BlockStack gap="200">
                  <InlineStack gap="200" align="start" blockAlign="start">
                    <Box minWidth="20px">
                      <Icon source={CheckCircleIcon} tone="success" />
                    </Box>
                    <Text as="p" variant="bodySm">
                      Automatic order synchronization
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" align="start" blockAlign="start">
                    <Box minWidth="20px">
                      <Icon source={CheckCircleIcon} tone="success" />
                    </Box>
                    <Text as="p" variant="bodySm">
                      Real-time data updates
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" align="start" blockAlign="start">
                    <Box minWidth="20px">
                      <Icon source={CheckCircleIcon} tone="success" />
                    </Box>
                    <Text as="p" variant="bodySm">
                      Customizable import options
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
              
              <Form method="post" action="/auth/google">
                <Button 
                  submit 
                  variant="primary" 
                  size="large"
                  loading={isConnecting}
                  onClick={() => setIsConnecting(true)}
                >
                  {isConnecting ? "Connecting..." : "Connect with Google"}
                </Button>
              </Form>
            </BlockStack>
          </Card>
          
          <Box paddingBlockStart="500">
            <Banner tone="info">
              <Text as="p" variant="bodySm">
                <strong>Important:</strong> When signing in, please grant permissions to access and modify your Google Sheets to enable automatic order imports.
              </Text>
            </Banner>
          </Box>
        </Layout.Section>
        
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                How it works
              </Text>
              <BlockStack gap="300">
                <InlineStack gap="300" align="start">
                  <Badge tone="info">1</Badge>
                  <Text as="p" variant="bodySm">
                    Connect your Google account securely
                  </Text>
                </InlineStack>
                <InlineStack gap="300" align="start">
                  <Badge tone="info">2</Badge>
                  <Text as="p" variant="bodySm">
                    Select your spreadsheet and configure import settings
                  </Text>
                </InlineStack>
                <InlineStack gap="300" align="start">
                  <Badge tone="info">3</Badge>
                  <Text as="p" variant="bodySm">
                    New orders are automatically added to your sheet
                  </Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Frame>
  );
}

function GoogleSettingsView({ settings, spreadsheets, isLoading, setIsLoading, submit }: any) {
  const [selectedSheetId, setSelectedSheetId] = useState(settings?.googleSheetId || "");
  const [importOrders, setImportOrders] = useState(settings?.googleSheetImportOrders ?? true);
  const [importLines, setImportLines] = useState(settings?.googleSheetImportLines ?? false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveBarRef = useRef<any>(null);

  // Track changes and control save bar
  useEffect(() => {
    const hasChanges = 
      selectedSheetId !== (settings?.googleSheetId || "") ||
      importOrders !== (settings?.googleSheetImportOrders ?? true) ||
      importLines !== (settings?.googleSheetImportLines ?? false);
    
    setHasUnsavedChanges(hasChanges);
    
    // Control the save bar based on changes
    const saveBar = document.getElementById('google-sheets-save-bar') as any;
    if (saveBar) {
      if (hasChanges && importOrders && selectedSheetId) {
        saveBar.show();
      } else {
        saveBar.hide();
      }
    }
  }, [selectedSheetId, importOrders, importLines, settings]);

  // Set up save bar event handlers
  useEffect(() => {
    const saveButton = document.getElementById('save-button');
    const discardButton = document.getElementById('discard-button');

    const handleSave = () => {
      setIsLoading(true);
      const selectedSheet = spreadsheets.find((s: any) => s.id === selectedSheetId);
      const formData = new FormData();
      formData.append("sheetId", selectedSheetId);
      formData.append("sheetName", selectedSheet?.name || "");
      formData.append("tabName", "Orders");
      formData.append("importOrders", importOrders ? "on" : "");
      formData.append("importLines", importLines ? "on" : "");
      submit(formData, { method: "post" });
      
      // Hide save bar after saving
      const saveBar = document.getElementById('google-sheets-save-bar') as any;
      if (saveBar) {
        saveBar.hide();
      }
    };

    const handleDiscard = () => {
      // Reset to original values
      setSelectedSheetId(settings?.googleSheetId || "");
      setImportOrders(settings?.googleSheetImportOrders ?? true);
      setImportLines(settings?.googleSheetImportLines ?? false);
      
      // Hide save bar after discarding
      const saveBar = document.getElementById('google-sheets-save-bar') as any;
      if (saveBar) {
        saveBar.hide();
      }
    };

    if (saveButton && discardButton) {
      saveButton.addEventListener('click', handleSave);
      discardButton.addEventListener('click', handleDiscard);
    }

    // Cleanup event listeners
    return () => {
      if (saveButton && discardButton) {
        saveButton.removeEventListener('click', handleSave);
        discardButton.removeEventListener('click', handleDiscard);
      }
    };
  }, [selectedSheetId, importOrders, importLines, settings, spreadsheets, submit, setIsLoading]);
  
  const handleDisconnect = () => {
    const formData = new FormData();
    formData.append("_action", "disconnect");
    submit(formData, { method: "post", action: "/auth/google" });
  };

  const isConfigured = selectedSheetId && importOrders;
  const selectedSheet = spreadsheets.find((s: any) => s.id === selectedSheetId);

  return (
    <BlockStack gap="500">
      {/* Connection Status Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <InlineStack gap="200">
              <Icon source={GoogleIcon} tone="base" />
              <Text as="h3" variant="headingMd">
                Google Account
              </Text>
              <Badge tone="success">Connected</Badge>
            </InlineStack>
            <Button 
              onClick={handleDisconnect} 
              variant="plain"
              tone="critical"
              icon={ConnectIcon}
              size="slim"
            >
              Disconnect
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Configuration Card */}
      <Card>
        <BlockStack gap="500">
          <InlineStack gap="200">
            <Icon source={SettingsIcon} tone="base" />
            <Text as="h3" variant="headingMd">
              Import Settings
            </Text>
          </InlineStack>
          
          <BlockStack gap="400">
            <Checkbox
              label="Enable automatic order import"
              helpText="New orders will be automatically added to your selected Google Sheet"
              checked={importOrders}
              onChange={(checked) => {
                setImportOrders(checked);
              }}
            />
            
            {importOrders && (
              <>
                <Select
                  label="Select spreadsheet"
                  placeholder="Choose a spreadsheet"
                  options={[
                    { label: "Select a spreadsheet", value: "", disabled: true },
                    ...spreadsheets.map((s: any) => ({ 
                      label: s.name, 
                      value: s.id 
                    })),
                  ]}
                  value={selectedSheetId}
                  onChange={setSelectedSheetId}
                  helpText={`${spreadsheets.length} spreadsheet${spreadsheets.length !== 1 ? 's' : ''} available`}
                />

                {selectedSheetId && (
                  <Select
                    label="Sheet tab"
                    options={[{ label: "Orders", value: "Orders" }]}
                    value="Orders"
                    disabled={true}
                    helpText="Orders will be imported to the 'Orders' tab"
                  />
                )}

                <Checkbox
                  label="Multi-line import"
                  helpText="Import orders with multiple products as separate rows"
                  checked={importLines}
                  onChange={setImportLines}
                />
              </>
            )}
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Status Banner */}
      {importOrders && !selectedSheetId && (
        <Banner tone="warning">
          <Text as="p" variant="bodySm">
            Please select a spreadsheet to complete the setup.
          </Text>
        </Banner>
      )}
      
      {isConfigured && !hasUnsavedChanges && (
        <Banner tone="success">
          <Text as="p" variant="bodySm">
            <strong>Integration active!</strong> New orders will be automatically imported to your Google Sheet.
          </Text>
        </Banner>
      )}
    </BlockStack>
  );
}

function IntegrationInfoCard({ settings }: any) {
  const isConfigured = settings?.googleSheetId && settings?.googleSheetImportOrders;
  
  return (
    <BlockStack gap="500">
      {/* Current Status */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200">
            <Icon source={ImportIcon} tone="base" />
            <Text as="h3" variant="headingMd">
              Integration Status
            </Text>
          </InlineStack>
          
          {isConfigured ? (
            <BlockStack gap="300">
              <InlineStack gap="200">
                <Badge tone="success">Active</Badge>
                <Text as="p" variant="bodySm">
                  Orders are being imported automatically
                </Text>
              </InlineStack>
              
              <Divider />
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" fontWeight="medium">
                  Current Configuration:
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  <strong>Spreadsheet:</strong> {settings.googleSheetName}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  <strong>Sheet tab:</strong> {settings.googleSheetTabName || 'Orders'}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  <strong>Multi-line import:</strong> {settings.googleSheetImportLines ? 'Enabled' : 'Disabled'}
                </Text>
              </BlockStack>
              
              {settings.googleSheetId && (
                <Button
                  variant="plain"
                  icon={ExternalIcon}
                  url={`https://docs.google.com/spreadsheets/d/${settings.googleSheetId}`}
                  external
                  size="slim"
                >
                  Open in Google Sheets
                </Button>
              )}
            </BlockStack>
          ) : (
            <InlineStack gap="200">
              <Badge tone="attention">Not configured</Badge>
              <Text as="p" variant="bodySm">
                Complete the setup to start importing orders
              </Text>
            </InlineStack>
          )}
        </BlockStack>
      </Card>

      {/* Help & Tips */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Tips & Information
          </Text>
          
          <BlockStack gap="300">
            <InlineStack gap="200" align="start">
              <Icon source={AlertCircleIcon} tone="base" />
              <Text as="p" variant="bodySm">
                Only new orders will be imported to prevent duplicates
              </Text>
            </InlineStack>
            
            <InlineStack gap="200" align="start">
              <Icon source={CheckCircleIcon} tone="success" />
              <Text as="p" variant="bodySm">
                Orders are imported in real-time as they're received
              </Text>
            </InlineStack>
            
            <InlineStack gap="200" align="start">
              <Icon source={SettingsIcon} tone="base" />
              <Text as="p" variant="bodySm">
                You can change your spreadsheet selection at any time
              </Text>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Support */}
      <CalloutCard
        title="Need help?"
        illustration="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
        primaryAction={{
          content: 'Contact Support',
          url: 'mailto:support@example.com'
        }}
      >
        <Text as="p" variant="bodySm">
          If you're experiencing issues with the Google Sheets integration, our support team is here to help.
        </Text>
      </CalloutCard>
    </BlockStack>
  );
}
