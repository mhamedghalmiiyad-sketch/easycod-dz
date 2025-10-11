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
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Extend HTML elements to include ui-save-bar
declare global {
  interface HTMLElementTagNameMap {
    'ui-save-bar': HTMLElement & {
      show(): Promise<void>;
      hide(): Promise<void>;
      toggle(): Promise<void>;
      showing: boolean;
      discardConfirmation: boolean;
    };
  }
}

// LOADER: Fetches the current settings when the page loads
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const settings = await db.shopSettings.findUnique({
      where: { shopId: session.shop },
    });

    // If no settings are found, return default values.
    const defaults = {
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
      return json(defaults);
    }

    // Safely parse JSON fields with fallbacks
    const parseJson = (field: string | null, fallback: any[]) => {
      try {
        return field ? JSON.parse(field) : fallback;
      } catch {
        return fallback;
      }
    };

    return json({
      visibilityMode: settings.visibilityMode || defaults.visibilityMode,
      visibleProducts: parseJson(settings.visibleProducts, []),
      hiddenProducts: parseJson(settings.hiddenProducts, []),
      allowedCountries: parseJson(settings.allowedCountries, []),
      hideAddToCart: settings.hideAddToCart ?? defaults.hideAddToCart,
      hideBuyNow: settings.hideBuyNow ?? defaults.hideBuyNow,
      disableOnHome: settings.disableOnHome ?? defaults.disableOnHome,
      disableOnCollections: settings.disableOnCollections ?? defaults.disableOnCollections,
      enableSpecificProducts: settings.enableSpecificProducts ?? defaults.enableSpecificProducts,
      disableSpecificProducts: settings.disableSpecificProducts ?? defaults.disableSpecificProducts,
      enableSpecificCountries: settings.enableSpecificCountries ?? defaults.enableSpecificCountries,
      minimumAmount: settings.minimumAmount || defaults.minimumAmount,
      maximumAmount: settings.maximumAmount || defaults.maximumAmount,
    });
  } catch (error) {
    console.error("Error loading visibility settings:", error);
    // Return default values in case of a database error
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

// ACTION: Saves the form data when you click "Save"
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const dataToSave = {
      visibilityMode: formData.get("visibilityMode") as string,
      visibleProducts: formData.get("visibleProducts") as string,
      hiddenProducts: formData.get("hiddenProducts") as string,
      allowedCountries: formData.get("allowedCountries") as string,
      minimumAmount: formData.get("minimumAmount") as string,
      maximumAmount: formData.get("maximumAmount") as string,
      hideAddToCart: formData.get("hideAddToCart") === "true",
      hideBuyNow: formData.get("hideBuyNow") === "true",
      disableOnHome: formData.get("disableOnHome") === "true",
      disableOnCollections: formData.get("disableOnCollections") === "true",
      enableSpecificProducts: formData.get("enableSpecificProducts") === "true",
      disableSpecificProducts: formData.get("disableSpecificProducts") === "true",
      enableSpecificCountries: formData.get("enableSpecificCountries") === "true",
    };

    await db.shopSettings.upsert({
      where: { shopId: session.shop },
      update: { ...dataToSave, updatedAt: new Date() },
      create: { shopId: session.shop, ...dataToSave },
    });

    return json({
      success: true,
      message: "Settings saved successfully!"
    });
  } catch (error) {
    console.error("Error saving visibility settings:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return json({
      success: false,
      error: `Database error: ${message}`,
      message: "Failed to save settings"
    }, { status: 500 });
  }
};

// Define the form state type based on loader return
type FormState = Awaited<ReturnType<typeof loader>>['json'];

// UI COMPONENT: The enhanced page
export default function VisibilityPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  // State for all form fields, initialized from loader data
  const [formState, setFormState] = useState<FormState>(loaderData);
  const [initialFormState, setInitialFormState] = useState<FormState>(loaderData);
  const [showToast, setShowToast] = useState(false);

  const saveBarRef = useRef<HTMLElementTagNameMap['ui-save-bar']>(null);

  // Check for unsaved changes by comparing current state to initial state
  const hasUnsavedChanges = JSON.stringify(formState) !== JSON.stringify(initialFormState);
  const isSaving = navigation.state === 'submitting';

  // Generic handler for most state changes
  const handleStateChange = useCallback((field: keyof FormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handler for mutually exclusive product checkboxes
  const handleEnableSpecificProductsChange = useCallback((checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      enableSpecificProducts: checked,
      ...(checked && { disableSpecificProducts: false }), // If enabling, disable the other option
    }));
  }, []);

  const handleDisableSpecificProductsChange = useCallback((checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      disableSpecificProducts: checked,
      ...(checked && { enableSpecificProducts: false }), // If disabling, disable the other option
    }));
  }, []);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    // Append all formState properties to formData
    Object.entries(formState).forEach(([key, value]) => {
      const formValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      formData.append(key, formValue);
    });
    submit(formData, { method: "post" });
  }, [formState, submit]);

  const handleDiscard = useCallback(() => {
    setFormState(initialFormState);
  }, [initialFormState]);

  // Show/hide save bar based on changes
  useEffect(() => {
    const saveBar = saveBarRef.current;
    if (!saveBar) return;

    if (hasUnsavedChanges && !isSaving) {
      saveBar.show().catch(console.error);
    } else {
      saveBar.hide().catch(console.error);
    }
  }, [hasUnsavedChanges, isSaving]);

  // Handle successful save: show toast and reset initial state to the new saved state
  useEffect(() => {
    if (actionData?.success && !isSaving) {
      setShowToast(true);
      setInitialFormState(formState); // This is key to making "hasUnsavedChanges" false after a save
    }
  }, [actionData, isSaving, formState]);


  // Mock handlers for product/country pickers
  const handleProductSelection = useCallback((type: 'visible' | 'hidden') => {
    // In a real Shopify app, you would use Shopify App Bridge Resource Picker
    console.log(`Simulating product selection for "${type}"...`);
    const mockProducts = [
      { id: `gid://shopify/Product/${Date.now()}`, title: "Sample Product A", handle: "sample-a" },
      { id: `gid://shopify/Product/${Date.now() + 1}`, title: "Sample Product B", handle: "sample-b" },
    ];
    if (type === 'visible') {
      handleStateChange('visibleProducts', mockProducts);
    } else {
      handleStateChange('hiddenProducts', mockProducts);
    }
  }, [handleStateChange]);

  const handleCountrySelection = useCallback(() => {
    // In a real app, you might use a modal with a country list
    console.log("Simulating country selection...");
    const mockCountries = [
      { code: "US", name: "United States" },
      { code: "CA", name: "Canada" },
    ];
    handleStateChange('allowedCountries', mockCountries);
  }, [handleStateChange]);

  const clearSelection = useCallback((type: 'visible' | 'hidden' | 'countries') => {
    if (type === 'visible') {
      handleStateChange('visibleProducts', []);
    } else if (type === 'hidden') {
      handleStateChange('hiddenProducts', []);
    } else {
      handleStateChange('allowedCountries', []);
    }
  }, [handleStateChange]);


  const toastMarkup = showToast ? (
    <Toast content={actionData?.message || "Success!"} onDismiss={() => setShowToast(false)} />
  ) : null;

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
      <ui-save-bar ref={saveBarRef} discardConfirmation={true}>
        <button className="Polaris-Button Polaris-Button--primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button className="Polaris-Button" onClick={handleDiscard} disabled={isSaving}>
          Discard
        </button>
      </ui-save-bar>

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
                    <Text as="h2" variant="headingMd">
                      Enable or disable your form
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      You can choose to disable your form or enable it only on product pages, only on the cart page or on both cart and product pages.
                    </Text>
                  </BlockStack>

                  <ButtonGroup>
                    <Button pressed={formState.visibilityMode === "disabled"} onClick={() => handleStateChange("visibilityMode", "disabled")}>
                      Disabled
                    </Button>
                    <Button pressed={formState.visibilityMode === "only_cart_page"} onClick={() => handleStateChange("visibilityMode", "only_cart_page")}>
                      Only cart page
                    </Button>
                    <Button pressed={formState.visibilityMode === "only_product_pages"} onClick={() => handleStateChange("visibilityMode", "only_product_pages")}>
                      Only product pages
                    </Button>
                    <Button pressed={formState.visibilityMode === "both_cart_product"} onClick={() => handleStateChange("visibilityMode", "both_cart_product")}>
                      Both cart and product pages
                    </Button>
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
                          <Checkbox label="Hide the Add to Cart button on product pages" checked={formState.hideAddToCart} onChange={(checked) => handleStateChange('hideAddToCart', checked)} />
                          <Checkbox label="Hide the Buy Now button on product pages" checked={formState.hideBuyNow} onChange={(checked) => handleStateChange('hideBuyNow', checked)} />
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
                      <Text as="p" variant="bodyMd" tone="subdued">Here you can choose to show your COD order form only for customers from specific countries or for specific products.</Text>
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
                                {formState.visibleProducts.length > 0 && (
                                  <Badge tone="success">{`${formState.visibleProducts.length} selected`}</Badge>
                                )}
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
                                {formState.hiddenProducts.length > 0 && (
                                  <Badge tone="critical">{`${formState.hiddenProducts.length} disabled`}</Badge>
                                )}
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
                      <Checkbox label="Enable your form only for specific countries" checked={formState.enableSpecificCountries} onChange={(checked) => handleStateChange('enableSpecificCountries', checked)} />
                      {formState.enableSpecificCountries && (
                        <Box paddingBlockStart="200">
                          <Card>
                            <BlockStack gap="300">
                              <InlineStack gap="200" align="space-between">
                                <Text as="h4" variant="headingXs">Allowed Countries</Text>
                                {formState.allowedCountries.length > 0 && (
                                  <Badge tone="success">{`${formState.allowedCountries.length} selected`}</Badge>
                                )}
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