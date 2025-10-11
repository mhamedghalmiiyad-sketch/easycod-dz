import { useState, useCallback, useEffect } from "react";
import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  Banner,
  Box,
  InlineStack,
  Badge,
  Divider,
  Icon,
  Toast,
  Frame,
  Checkbox,
  ButtonGroup,
  TextField,
  Tabs,
} from "@shopify/polaris";
import {
  ProductIcon,
  LocationIcon,
  WandIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SettingsIcon,
  ViewIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Augment JSX types for the ui-save-bar web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ui-save-bar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        show?: boolean;
      };
    }
  }
}

// Define the shape of the visibility settings object
interface VisibilitySettings {
  visibilityMode: string;
  visibleProducts: any[];
  hiddenProducts: any[];
  allowedCountries: any[];
  hideAddToCart: boolean;
  hideBuyNow: boolean;
  disableOnHome: boolean;
  disableOnCollections: boolean;
  enableSpecificProducts: boolean;
  disableSpecificProducts: boolean;
  enableSpecificCountries: boolean;
  minimumAmount: string;
  maximumAmount: string;
}

// LOADER: Fetches settings, parsing the visibilitySettings JSON field
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
  });

  const defaultSettings: VisibilitySettings = {
    visibilityMode: "both_cart_product",
    visibleProducts: [],
    hiddenProducts: [],
    allowedCountries: [],
    hideAddToCart: false,
    hideBuyNow: false,
    disableOnHome: false,
    disableOnCollections: false,
    enableSpecificProducts: false,
    disableSpecificProducts: false,
    enableSpecificCountries: false,
    minimumAmount: "",
    maximumAmount: "",
  };

  let visibilitySettings = defaultSettings;
  if (settings?.visibilitySettings) {
    try {
      // Safely parse and merge with defaults to prevent missing fields
      const dbSettings = JSON.parse(settings.visibilitySettings);
      visibilitySettings = { ...defaultSettings, ...dbSettings };
    } catch (error) {
      console.error("Failed to parse visibilitySettings JSON:", error);
    }
  }

  return json(visibilitySettings);
};

// ACTION: Saves the entire visibility settings object as a single JSON string
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const settingsToSave: VisibilitySettings = {
    visibilityMode: formData.get("visibilityMode") as string,
    hideAddToCart: formData.get("hideAddToCart") === "true",
    hideBuyNow: formData.get("hideBuyNow") === "true",
    disableOnHome: formData.get("disableOnHome") === "true",
    disableOnCollections: formData.get("disableOnCollections") === "true",
    enableSpecificProducts: formData.get("enableSpecificProducts") === "true",
    disableSpecificProducts: formData.get("disableSpecificProducts") === "true",
    enableSpecificCountries: formData.get("enableSpecificCountries") === "true",
    minimumAmount: formData.get("minimumAmount") as string,
    maximumAmount: formData.get("maximumAmount") as string,
    // Safely parse array data
    visibleProducts: JSON.parse(formData.get("visibleProducts") as string || '[]'),
    hiddenProducts: JSON.parse(formData.get("hiddenProducts") as string || '[]'),
    allowedCountries: JSON.parse(formData.get("allowedCountries") as string || '[]'),
  };

  await db.shopSettings.upsert({
    where: { shopId: session.shop },
    update: { visibilitySettings: JSON.stringify(settingsToSave), updatedAt: new Date() },
    create: { shopId: session.shop, visibilitySettings: JSON.stringify(settingsToSave) },
  });

  return json({ success: true, message: "Visibility settings saved!" });
};

// --- React Component ---
export default function VisibilityPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const isLoading = useSubmit().state === "submitting";

  const [formState, setFormState] = useState(loaderData);
  const [initialFormState, setInitialFormState] = useState(loaderData);
  const [showToast, setShowToast] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  // Sort arrays before comparison to ensure consistent order
  const sortState = (state: VisibilitySettings) => ({
    ...state,
    visibleProducts: [...state.visibleProducts].sort((a, b) => a.id.localeCompare(b.id)),
    hiddenProducts: [...state.hiddenProducts].sort((a, b) => a.id.localeCompare(b.id)),
    allowedCountries: [...state.allowedCountries].sort((a, b) => a.code.localeCompare(b.code)),
  });

  const hasUnsavedChanges = JSON.stringify(sortState(initialFormState)) !== JSON.stringify(sortState(formState));

  // --- Handlers ---
  const handleStateChange = useCallback((field: keyof VisibilitySettings, value: any) => {
    setFormState(prevState => ({ ...prevState, [field]: value }));
  }, []);

  const handleEnableSpecificProductsChange = useCallback((checked: boolean) => {
    handleStateChange('enableSpecificProducts', checked);
    if (checked) handleStateChange('disableSpecificProducts', false);
  }, [handleStateChange]);

  const handleDisableSpecificProductsChange = useCallback((checked: boolean) => {
    handleStateChange('disableSpecificProducts', checked);
    if (checked) handleStateChange('enableSpecificProducts', false);
  }, [handleStateChange]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      const formValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
      formData.append(key, formValue);
    });
    submit(formData, { method: "post" });
  }, [formState, submit]);

  const handleDiscard = useCallback(() => setFormState(initialFormState), [initialFormState]);

  // --- Effects ---
  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);
      setInitialFormState(formState); // Lock in the new state after saving
    }
  }, [actionData, formState]);

  // --- Mock Data Handlers (for demonstration) ---
  const handleProductSelection = useCallback((type: 'visible' | 'hidden') => {
    const mockProducts = [
      { id: "gid://shopify/Product/1", title: "Mock Product Alpha" },
      { id: "gid://shopify/Product/2", title: "Mock Product Bravo" },
    ];
    handleStateChange(type === 'visible' ? 'visibleProducts' : 'hiddenProducts', mockProducts);
  }, [handleStateChange]);

  const handleCountrySelection = useCallback(() => {
    const mockCountries = [{ code: "US", name: "United States" }, { code: "CA", name: "Canada" }];
    handleStateChange('allowedCountries', mockCountries);
  }, [handleStateChange]);

  const clearSelection = useCallback((type: 'visible' | 'hidden' | 'countries') => {
    const key = type === 'visible' ? 'visibleProducts' : type === 'hidden' ? 'hiddenProducts' : 'allowedCountries';
    handleStateChange(key, []);
  }, [handleStateChange]);

  // --- UI Renderers ---
  const renderSelectedItems = (items: any[], type: 'products' | 'countries') => {
    if (!items || items.length === 0) {
      return <Text as="p" variant="bodySm" tone="subdued">No {type} selected.</Text>;
    }
    return (
      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
        <BlockStack gap="200">
          {items.slice(0, 3).map((item: any) => (
            <InlineStack key={item.id || item.code} gap="200" blockAlign="center">
              <Icon source={type === 'products' ? ProductIcon : LocationIcon} tone="base" />
              <Text as="span" variant="bodySm">{type === 'products' ? item.title : `${item.name} (${item.code})`}</Text>
            </InlineStack>
          ))}
          {items.length > 3 && <Text as="span" variant="bodySm" tone="subdued">+{items.length - 3} more</Text>}
        </BlockStack>
      </Box>
    );
  };

  const tabs = [
    { id: "visibility", content: "Visibility & Pages" },
    { id: "rules", content: "Rules & Limits" },
  ];

  return (
    <Frame>
      {showToast && <Toast content={actionData?.message || "Settings saved!"} onDismiss={() => setShowToast(false)} />}
      <ui-save-bar show={hasUnsavedChanges}>
        <button data-save-button onClick={handleSave} disabled={isLoading} className="Polaris-Button Polaris-Button--primary">
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button data-discard-button onClick={handleDiscard} disabled={isLoading} className="Polaris-Button">
          Discard
        </button>
      </ui-save-bar>

      <Page
        title="Form Visibility"
        subtitle="Control where and how your form appears on your storefront"
        titleMetadata={
          <Badge tone={formState.visibilityMode !== 'disabled' ? 'success' : 'critical'}>
            {formState.visibilityMode !== 'disabled' ? 'Active' : 'Disabled'}
          </Badge>
        }
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              <Card>
                <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                  <Box padding="500">
                    {selectedTab === 0 && (
                      <BlockStack gap="500">
                        {/* --- Visibility Mode --- */}
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">Form Status</Text>
                          <Text as="p" variant="bodyMd" tone="subdued">Enable your form on product pages, the cart page, or both.</Text>
                        </BlockStack>
                        <ButtonGroup>
                          <Button pressed={formState.visibilityMode === "disabled"} onClick={() => handleStateChange('visibilityMode', 'disabled')}>Disabled</Button>
                          <Button pressed={formState.visibilityMode === "only_cart_page"} onClick={() => handleStateChange('visibilityMode', 'only_cart_page')}>Cart Only</Button>
                          <Button pressed={formState.visibilityMode === "only_product_pages"} onClick={() => handleStateChange('visibilityMode', 'only_product_pages')}>Product Pages Only</Button>
                          <Button pressed={formState.visibilityMode === "both_cart_product"} onClick={() => handleStateChange('visibilityMode', 'both_cart_product')}>Both Pages</Button>
                        </ButtonGroup>
                        {formState.visibilityMode === "disabled" && <Banner tone="warning" title="The form is disabled on your store." />}

                        {/* --- Page Settings --- */}
                        {(formState.visibilityMode === "only_product_pages" || formState.visibilityMode === "both_cart_product") && (
                          <BlockStack gap="400">
                            <Divider />
                            <Text as="h3" variant="headingMd">Page Settings</Text>
                            <Checkbox label="Hide the 'Add to Cart' button" checked={formState.hideAddToCart} onChange={(c) => handleStateChange('hideAddToCart', c)} />
                            <Checkbox label="Hide the dynamic 'Buy Now' button" checked={formState.hideBuyNow} onChange={(c) => handleStateChange('hideBuyNow', c)} />
                            <Checkbox label="Disable on home page" checked={formState.disableOnHome} onChange={(c) => handleStateChange('disableOnHome', c)} />
                            <Checkbox label="Disable on collection pages" checked={formState.disableOnCollections} onChange={(c) => handleStateChange('disableOnCollections', c)} />
                          </BlockStack>
                        )}
                      </BlockStack>
                    )}

                    {selectedTab === 1 && (
                      <BlockStack gap="500">
                        {/* --- Product Rules --- */}
                        <Text as="h2" variant="headingMd">Product Rules</Text>
                        <Checkbox label="Show form only for specific products" checked={formState.enableSpecificProducts} onChange={handleEnableSpecificProductsChange} />
                        {formState.enableSpecificProducts && (
                          <Card background="bg-surface-secondary"><BlockStack gap="300">
                            {renderSelectedItems(formState.visibleProducts, 'products')}
                            <InlineStack gap="200"><Button onClick={() => handleProductSelection('visible')}>Select Products</Button><Button variant="plain" onClick={() => clearSelection('visible')}>Clear</Button></InlineStack>
                          </BlockStack></Card>
                        )}
                        <Checkbox label="Hide form for specific products" checked={formState.disableSpecificProducts} onChange={handleDisableSpecificProductsChange} />
                        {formState.disableSpecificProducts && (
                          <Card background="bg-surface-secondary"><BlockStack gap="300">
                            {renderSelectedItems(formState.hiddenProducts, 'products')}
                            <InlineStack gap="200"><Button onClick={() => handleProductSelection('hidden')}>Select Products</Button><Button variant="plain" onClick={() => clearSelection('hidden')}>Clear</Button></InlineStack>
                          </BlockStack></Card>
                        )}

                        <Divider />

                        {/* --- Country Rules --- */}
                        <Text as="h2" variant="headingMd">Location Rules</Text>
                        <Checkbox label="Show form only for specific countries" checked={formState.enableSpecificCountries} onChange={(c) => handleStateChange('enableSpecificCountries', c)} />
                        {formState.enableSpecificCountries && (
                          <Card background="bg-surface-secondary"><BlockStack gap="300">
                            {renderSelectedItems(formState.allowedCountries, 'countries')}
                            <InlineStack gap="200"><Button onClick={handleCountrySelection}>Select Countries</Button><Button variant="plain" onClick={() => clearSelection('countries')}>Clear</Button></InlineStack>
                          </BlockStack></Card>
                        )}
                        
                        <Divider />

                        {/* --- Order Limits --- */}
                        <Text as="h2" variant="headingMd">Order Total Limits</Text>
                        <InlineStack gap="400" blockAlign="end">
                          <TextField label="Minimum Amount" type="number" value={formState.minimumAmount} onChange={(v) => handleStateChange('minimumAmount', v)} placeholder="0.00" autoComplete="off" />
                          <TextField label="Maximum Amount" type="number" value={formState.maximumAmount} onChange={(v) => handleStateChange('maximumAmount', v)} placeholder="No limit" autoComplete="off" />
                        </InlineStack>
                      </BlockStack>
                    )}
                  </Box>
                </Tabs>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={formState.visibilityMode !== 'disabled' ? CheckCircleIcon : AlertCircleIcon} tone={formState.visibilityMode !== 'disabled' ? 'success' : 'critical'} />
                    <Text as="h3" variant="headingMd">Configuration Status</Text>
                  </InlineStack>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd"><strong>Status:</strong> {formState.visibilityMode === 'disabled' ? 'Disabled' : 'Enabled'}</Text>
                    {formState.visibilityMode !== 'disabled' && <Text as="p" variant="bodyMd"><strong>Visible on:</strong> {formState.visibilityMode.replace(/_/g, ' ').replace('both cart product', 'Cart & Product Pages')}</Text>}
                    {formState.enableSpecificProducts && <Text as="p" variant="bodyMd"><strong>Product Rules:</strong> {formState.visibleProducts.length} allowed</Text>}
                    {formState.disableSpecificProducts && <Text as="p" variant="bodyMd"><strong>Product Rules:</strong> {formState.hiddenProducts.length} hidden</Text>}
                    {formState.enableSpecificCountries && <Text as="p" variant="bodyMd"><strong>Location Rules:</strong> {formState.allowedCountries.length} countries</Text>}
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}