import { useState, useCallback, useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
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
} from "@shopify/polaris";
import {
  ProductIcon,
  LocationIcon,
  WandIcon,
} from "@shopify/polaris-icons";
// Import the SaveBar component from Shopify App Bridge React
import { SaveBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Define the shape of the form state
interface VisibilityFormState {
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

// LOADER: Fetches the current settings from the database when the page loads.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const settings = await db.shopSettings.findUnique({
      where: { shopId: session.shop },
    });

    const defaultSettings: VisibilityFormState = {
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

    if (!settings) {
      return json(defaultSettings);
    }

    return json({
      visibilityMode: settings.visibilityMode || defaultSettings.visibilityMode,
      visibleProducts: settings.visibleProducts ? JSON.parse(settings.visibleProducts) : defaultSettings.visibleProducts,
      hiddenProducts: settings.hiddenProducts ? JSON.parse(settings.hiddenProducts) : defaultSettings.hiddenProducts,
      allowedCountries: settings.allowedCountries ? JSON.parse(settings.allowedCountries) : defaultSettings.allowedCountries,
      hideAddToCart: settings.hideAddToCart ?? defaultSettings.hideAddToCart,
      hideBuyNow: settings.hideBuyNow ?? defaultSettings.hideBuyNow,
      disableOnHome: settings.disableOnHome ?? defaultSettings.disableOnHome,
      disableOnCollections: settings.disableOnCollections ?? defaultSettings.disableOnCollections,
      enableSpecificProducts: settings.enableSpecificProducts ?? defaultSettings.enableSpecificProducts,
      disableSpecificProducts: settings.disableSpecificProducts ?? defaultSettings.disableSpecificProducts,
      enableSpecificCountries: settings.enableSpecificCountries ?? defaultSettings.enableSpecificCountries,
      minimumAmount: settings.minimumAmount || defaultSettings.minimumAmount,
      maximumAmount: settings.maximumAmount || defaultSettings.maximumAmount,
    });
  } catch (error) {
    console.error("Error loading visibility settings:", error);
    return json({
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
    });
  }
};

// ACTION: Handles form submissions to save the settings to the database.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const dataToSave = {
      visibilityMode: formData.get("visibilityMode") as string,
      hideAddToCart: formData.get("hideAddToCart") === "true",
      hideBuyNow: formData.get("hideBuyNow") === "true",
      disableOnHome: formData.get("disableOnHome") === "true",
      disableOnCollections: formData.get("disableOnCollections") === "true",
      enableSpecificProducts: formData.get("enableSpecificProducts") === "true",
      disableSpecificProducts: formData.get("disableSpecificProducts") === "true",
      enableSpecificCountries: formData.get("enableSpecificCountries") === "true",
      visibleProducts: formData.get("visibleProducts") as string,
      hiddenProducts: formData.get("hiddenProducts") as string,
      allowedCountries: formData.get("allowedCountries") as string,
      minimumAmount: formData.get("minimumAmount") as string,
      maximumAmount: formData.get("maximumAmount") as string,
    };

    const result = await db.shopSettings.upsert({
      where: { shopId: session.shop },
      update: { ...dataToSave, updatedAt: new Date() },
      create: { shopId: session.shop, ...dataToSave },
    });

    return json({ success: true, data: result, message: "Settings saved successfully!" });
  } catch (error) {
    console.error("Error saving visibility settings:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return json({ success: false, error: `Database error: ${message}`, message: "Failed to save settings" }, { status: 500 });
  }
};

// Helper function to sort arrays of objects by a unique key before comparison.
const sortByKey = (array: any[], key: string) => {
  if (!Array.isArray(array)) return [];
  return [...array].sort((a, b) => (a[key] || "").localeCompare(b[key] || ""));
};


// UI COMPONENT: The main page component for visibility settings.
export default function VisibilityPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';

  // State for the form, initialized with data from the loader.
  // We use `as VisibilityFormState` to resolve the type mismatch.
  const [formState, setFormState] = useState<VisibilityFormState>(loaderData as VisibilityFormState);
  const [initialFormState, setInitialFormState] = useState<VisibilityFormState>(loaderData as VisibilityFormState);

  const [showToast, setShowToast] = useState(false);

  const hasUnsavedChanges = JSON.stringify({
    ...initialFormState,
    visibleProducts: sortByKey(initialFormState.visibleProducts, 'id'),
    hiddenProducts: sortByKey(initialFormState.hiddenProducts, 'id'),
    allowedCountries: sortByKey(initialFormState.allowedCountries, 'code'),
  }) !== JSON.stringify({
    ...formState,
    visibleProducts: sortByKey(formState.visibleProducts, 'id'),
    hiddenProducts: sortByKey(formState.hiddenProducts, 'id'),
    allowedCountries: sortByKey(formState.allowedCountries, 'code'),
  });

  const handleStateChange = useCallback((field: keyof VisibilityFormState, value: any) => {
    setFormState(prevState => ({ ...prevState, [field]: value }));
  }, []);

  const handleEnableSpecificProductsChange = useCallback((checked: boolean) => {
    setFormState(prevState => ({
      ...prevState,
      enableSpecificProducts: checked,
      disableSpecificProducts: checked ? false : prevState.disableSpecificProducts,
    }));
  }, []);

  const handleDisableSpecificProductsChange = useCallback((checked: boolean) => {
    setFormState(prevState => ({
      ...prevState,
      disableSpecificProducts: checked,
      enableSpecificProducts: checked ? false : prevState.enableSpecificProducts,
    }));
  }, []);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });

    submit(formData, { method: "post" });
  }, [formState, submit]);

  const handleDiscard = useCallback(() => {
    setFormState(initialFormState);
  }, [initialFormState]);

  useEffect(() => {
    if (actionData?.success && !isLoading) {
      setShowToast(true);
      setInitialFormState(formState);
    }
  }, [actionData, isLoading, formState]);

  const toastMarkup = showToast ? (
    <Toast content={actionData?.message || "Success!"} onDismiss={() => setShowToast(false)} />
  ) : null;

  const handleProductSelection = useCallback((type: 'visible' | 'hidden') => {
    console.log(`Simulating product selection for "${type}"...`);
    const mockProducts = [
      { id: "gid://shopify/Product/1", title: "Mock Product Alpha", handle: "mock-a", image: "https://placehold.co/50x50/000000/FFFFFF?text=A" },
      { id: "gid://shopify/Product/2", title: "Mock Product Bravo", handle: "mock-b", image: "https://placehold.co/50x50/000000/FFFFFF?text=B" },
    ];
    handleStateChange(type === 'visible' ? 'visibleProducts' : 'hiddenProducts', mockProducts);
  }, [handleStateChange]);

  const handleCountrySelection = useCallback(() => {
    console.log("Simulating country selection...");
    const mockCountries = [
      { code: "US", name: "United States" },
      { code: "CA", name: "Canada" },
    ];
    handleStateChange('allowedCountries', mockCountries);
  }, [handleStateChange]);

  const clearSelection = useCallback((type: 'visible' | 'hidden' | 'countries') => {
    if (type === 'visible') handleStateChange('visibleProducts', []);
    else if (type === 'hidden') handleStateChange('hiddenProducts', []);
    else handleStateChange('allowedCountries', []);
  }, [handleStateChange]);

  const renderSelectedItems = (items: any[], type: 'products' | 'countries') => {
    if (!items || items.length === 0) {
      return (
        <Text as="p" variant="bodySm" tone="subdued">
          No {type === 'products' ? 'products' : 'countries'} selected.
        </Text>
      );
    }

    const displayItems = items.slice(0, 3);
    const remainingCount = items.length - displayItems.length;

    return (
      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
        <BlockStack gap="200">
          {displayItems.map((item: any) => (
            <InlineStack key={item.id || item.code} gap="200" blockAlign="center">
              <Icon source={type === 'products' ? ProductIcon : LocationIcon} tone="base" />
              <Text as="span" variant="bodySm">
                {type === 'products' ? item.title : `${item.name} (${item.code})`}
              </Text>
            </InlineStack>
          ))}
          {remainingCount > 0 && (
            <Text as="span" variant="bodySm" tone="subdued">
              +{remainingCount} more {type}
            </Text>
          )}
        </BlockStack>
      </Box>
    );
  };

  return (
    <Frame>
        {/* Conditionally render the SaveBar component when there are unsaved changes */}
      {hasUnsavedChanges && (
        <SaveBar
          saveAction={{
            content: 'Save',
            loading: isLoading,
            disabled: isLoading,
            onAction: handleSave, // Correct: Pass handler here
          }}
          discardAction={{
            content: 'Discard',
            disabled: isLoading,
            onAction: handleDiscard, // Correct: Pass handler here
          }}
        />
      )}

      <Page
        title="Visibility"
        subtitle="Enable or disable your form and control where it appears"
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* === VISIBILITY CONTROL CARD === */}
              <Card>
                <BlockStack gap="500">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">Enable or disable your form</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Choose to disable your form or enable it on product pages, the cart page, or both.
                    </Text>
                  </BlockStack>

                  <ButtonGroup>
                    <Button pressed={formState.visibilityMode === "disabled"} onClick={() => handleStateChange('visibilityMode', 'disabled')}>Disabled</Button>
                    <Button pressed={formState.visibilityMode === "only_cart_page"} onClick={() => handleStateChange('visibilityMode', 'only_cart_page')}>Only cart page</Button>
                    <Button pressed={formState.visibilityMode === "only_product_pages"} onClick={() => handleStateChange('visibilityMode', 'only_product_pages')}>Only product pages</Button>
                    <Button pressed={formState.visibilityMode === "both_cart_product"} onClick={() => handleStateChange('visibilityMode', 'both_cart_product')}>Both pages</Button>
                  </ButtonGroup>

                  {formState.visibilityMode === "disabled" && (
                    <Banner tone="warning">
                      <BlockStack gap="300">
                        <Text as="p" variant="bodyMd">The COD form is <strong>disabled</strong> on your store.</Text>
                        <InlineStack gap="300">
                          <Button icon={WandIcon} onClick={() => handleStateChange('visibilityMode', 'both_cart_product')}>Enable the app</Button>
                        </InlineStack>
                      </BlockStack>
                    </Banner>
                  )}

                  {(formState.visibilityMode === "only_product_pages" || formState.visibilityMode === "both_cart_product") && (
                    <BlockStack gap="400">
                      <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                        <BlockStack gap="300">
                          <Text as="h3" variant="headingMd">Product pages settings</Text>
                          <Checkbox label="Hide the Add to Cart button" checked={formState.hideAddToCart} onChange={(checked) => handleStateChange('hideAddToCart', checked)} />
                          <Checkbox label="Hide the Buy Now button" checked={formState.hideBuyNow} onChange={(checked) => handleStateChange('hideBuyNow', checked)} />
                        </BlockStack>
                      </Box>
                      <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                        <BlockStack gap="300">
                          <Text as="h3" variant="headingMd">Other pages settings</Text>
                          <Checkbox label="Disable Releasit on your home page" checked={formState.disableOnHome} onChange={(checked) => handleStateChange('disableOnHome', checked)} />
                          <Checkbox label="Disable Releasit on your collections pages" checked={formState.disableOnCollections} onChange={(checked) => handleStateChange('disableOnCollections', checked)} />
                        </BlockStack>
                      </Box>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* === LIMITS CARD (shown unless form is disabled) === */}
              {formState.visibilityMode !== "disabled" && (
                <Card>
                  <BlockStack gap="500">
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingMd">Limit your order form</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Show your COD form only for specific countries, products, or order totals.
                      </Text>
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="300">
                      <Checkbox
                        label="Enable your form only for specific products and collections"
                        checked={formState.enableSpecificProducts}
                        onChange={handleEnableSpecificProductsChange}
                      />
                      {formState.enableSpecificProducts && (
                        <Box paddingBlockStart="200">
                          <Card>
                            <BlockStack gap="300">
                              <InlineStack gap="200" align="space-between">
                                <Text as="h4" variant="headingXs">Allowed Products & Collections</Text>
                                {formState.visibleProducts.length > 0 && <Badge tone="success">{`${formState.visibleProducts.length} selected`}</Badge>}
                              </InlineStack>
                              {renderSelectedItems(formState.visibleProducts, 'products')}
                              <InlineStack gap="200">
                                <Button onClick={() => handleProductSelection('visible')}>Change Selection</Button>
                                <Button variant="plain" tone="critical" onClick={() => clearSelection('visible')} disabled={formState.visibleProducts.length === 0}>Clear All</Button>
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Box>
                      )}
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="300">
                      <Checkbox
                        label="Disable your form for one or more products and collections"
                        checked={formState.disableSpecificProducts}
                        onChange={handleDisableSpecificProductsChange}
                      />
                      {formState.disableSpecificProducts && (
                        <Box paddingBlockStart="200">
                          <Card>
                            <BlockStack gap="300">
                              <InlineStack gap="200" align="space-between">
                                <Text as="h4" variant="headingXs">Disabled Products & Collections</Text>
                                {formState.hiddenProducts.length > 0 && <Badge tone="critical">{`${formState.hiddenProducts.length} disabled`}</Badge>}
                              </InlineStack>
                              {renderSelectedItems(formState.hiddenProducts, 'products')}
                              <InlineStack gap="200">
                                <Button onClick={() => handleProductSelection('hidden')}>Change Selection</Button>
                                <Button variant="plain" tone="critical" onClick={() => clearSelection('hidden')} disabled={formState.hiddenProducts.length === 0}>Clear All</Button>
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Box>
                      )}
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="300">
                      <Checkbox
                        label="Enable your form only for specific countries"
                        checked={formState.enableSpecificCountries}
                        onChange={(checked) => handleStateChange('enableSpecificCountries', checked)}
                      />
                      {formState.enableSpecificCountries && (
                        <Box paddingBlockStart="200">
                          <Card>
                            <BlockStack gap="300">
                              <InlineStack gap="200" align="space-between">
                                <Text as="h4" variant="headingXs">Allowed Countries</Text>
                                {formState.allowedCountries.length > 0 && <Badge tone="success">{`${formState.allowedCountries.length} selected`}</Badge>}
                              </InlineStack>
                              {renderSelectedItems(formState.allowedCountries, 'countries')}
                              <InlineStack gap="200">
                                <Button onClick={handleCountrySelection}>Change Selection</Button>
                                <Button variant="plain" tone="critical" onClick={() => clearSelection('countries')} disabled={formState.allowedCountries.length === 0}>Clear All</Button>
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Box>
                      )}
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="300">
                      <Text as="h4" variant="headingXs">Order Total Limits</Text>
                      <Text as="p" variant="bodySm" tone="subdued">Set minimum and maximum order amounts for COD availability.</Text>
                      <InlineStack gap="400" wrap={false} blockAlign="end">
                        <TextField label="Minimum Amount" type="number" value={formState.minimumAmount} onChange={(value) => handleStateChange('minimumAmount', value)} placeholder="0.00" autoComplete="off" />
                        <TextField label="Maximum Amount" type="number" value={formState.maximumAmount} onChange={(value) => handleStateChange('maximumAmount', value)} placeholder="No limit" autoComplete="off" />
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>
        </Layout>
        {toastMarkup}
      </Page>
    </Frame>
  );
}