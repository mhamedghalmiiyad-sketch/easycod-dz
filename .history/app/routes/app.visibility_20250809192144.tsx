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

// Type definition for ui-save-bar element (using any to bypass type conflicts)
interface UISaveBarElement extends HTMLElement {
  show(): Promise<void>;
  hide(): Promise<void>;
  toggle(): Promise<void>;
  showing: boolean;
  discardConfirmation: boolean;
}

// Define the visibility settings interface
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

// LOADER: Fetches the current settings when the page loads
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // ✅ Server-only imports are moved inside the loader
  const { authenticate } = await import("../shopify.server");
  const { getShopSettings } = await import("~/utils/shopSettings.server");

  const { session } = await authenticate.admin(request);

  try {
    const settings = await getShopSettings(session.shop);

    // If no settings are found, return default values.
    if (!settings) {
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

    const typedSettings = settings as any;

    return json({
      visibilityMode: typedSettings?.visibilityMode || "both_cart_product",
      visibleProducts: typedSettings?.visibleProducts ? JSON.parse(typedSettings.visibleProducts) : [],
      hiddenProducts: typedSettings?.hiddenProducts ? JSON.parse(typedSettings.hiddenProducts) : [],
      allowedCountries: typedSettings?.allowedCountries ? JSON.parse(typedSettings.allowedCountries) : [],
      hideAddToCart: typedSettings?.hideAddToCart || false,
      hideBuyNow: typedSettings?.hideBuyNow || false,
      disableOnHome: typedSettings?.disableOnHome || false,
      disableOnCollections: typedSettings?.disableOnCollections || false,
      enableSpecificProducts: typedSettings?.enableSpecificProducts || false,
      disableSpecificProducts: typedSettings?.disableSpecificProducts || false,
      enableSpecificCountries: typedSettings?.enableSpecificCountries || false,
      minimumAmount: typedSettings?.minimumAmount || "",
      maximumAmount: typedSettings?.maximumAmount || "",
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

// ✅ ACTION: Updated to handle the hasConfiguredVisibility flag
export const action = async ({ request }: ActionFunctionArgs) => {
  // ✅ Server-only imports are moved inside the action
  const { authenticate } = await import("../shopify.server");
  const { getGeneralSettings, upsertShopSettings } = await import("~/utils/shopSettings.server");

  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    // Extract form data
    const visibilityMode = formData.get("visibilityMode") as string;
    const hideAddToCart = formData.get("hideAddToCart") === "true";
    const hideBuyNow = formData.get("hideBuyNow") === "true";
    const disableOnHome = formData.get("disableOnHome") === "true";
    const disableOnCollections = formData.get("disableOnCollections") === "true";
    const enableSpecificProducts = formData.get("enableSpecificProducts") === "true";
    const disableSpecificProducts = formData.get("disableSpecificProducts") === "true";
    const enableSpecificCountries = formData.get("enableSpecificCountries") === "true";
    const visibleProducts = formData.get("visibleProducts") as string;
    const hiddenProducts = formData.get("hiddenProducts") as string;
    const allowedCountries = formData.get("allowedCountries") as string;
    const minimumAmount = formData.get("minimumAmount") as string;
    const maximumAmount = formData.get("maximumAmount") as string;

    // Get the current general settings to preserve them and set the visibility flag
    const currentGeneralSettings = await getGeneralSettings(session.shop);
    const updatedGeneralSettings = {
      ...currentGeneralSettings,
      hasConfiguredVisibility: true, // Set the flag to true
    };

    // Use the utility function to save settings, including the general settings
    await upsertShopSettings(session.shop, {
      visibilityMode: visibilityMode,
      visibleProducts: JSON.parse(visibleProducts || "[]"),
      hiddenProducts: JSON.parse(hiddenProducts || "[]"),
      allowedCountries: JSON.parse(allowedCountries || "[]"),
      hideAddToCart: hideAddToCart,
      hideBuyNow: hideBuyNow,
      disableOnHome: disableOnHome,
      disableOnCollections: disableOnCollections,
      enableSpecificProducts: enableSpecificProducts,
      disableSpecificProducts: disableSpecificProducts,
      enableSpecificCountries: enableSpecificCountries,
      minimumAmount: minimumAmount,
      maximumAmount: maximumAmount,
      generalSettings: updatedGeneralSettings, // Pass the updated object
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

// Helper function to sort arrays of objects by a unique key before comparison
const sortByKey = (array: any[], key: string) => {
  if (!Array.isArray(array)) return [];
  return [...array].sort((a, b) => (a[key] || "").localeCompare(b[key] || ""));
};

// Define the form state type based on loader return
type FormState = {
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
};

// Custom hook to detect form changes
function useFormChanges(initialData: FormState, currentData: FormState) {
  const productsChanged = JSON.stringify(sortByKey(initialData.visibleProducts, 'id')) !== JSON.stringify(sortByKey(currentData.visibleProducts, 'id'));
  const hiddenProductsChanged = JSON.stringify(sortByKey(initialData.hiddenProducts, 'id')) !== JSON.stringify(sortByKey(currentData.hiddenProducts, 'id'));
  const countriesChanged = JSON.stringify(sortByKey(initialData.allowedCountries, 'code')) !== JSON.stringify(sortByKey(currentData.allowedCountries, 'code'));

  const otherSettingsChanged =
    initialData.visibilityMode !== currentData.visibilityMode ||
    initialData.hideAddToCart !== currentData.hideAddToCart ||
    initialData.hideBuyNow !== currentData.hideBuyNow ||
    initialData.disableOnHome !== currentData.disableOnHome ||
    initialData.disableOnCollections !== currentData.disableOnCollections ||
    initialData.enableSpecificProducts !== currentData.enableSpecificProducts ||
    initialData.disableSpecificProducts !== currentData.disableSpecificProducts ||
    initialData.enableSpecificCountries !== currentData.enableSpecificCountries ||
    initialData.minimumAmount !== currentData.minimumAmount ||
    initialData.maximumAmount !== currentData.maximumAmount;

  return productsChanged || hiddenProductsChanged || countriesChanged || otherSettingsChanged;
}

// UI COMPONENT: The enhanced page
export default function VisibilityPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  // State to manage form changes - initialized from loader data
  const [formState, setFormState] = useState<FormState>({
    visibilityMode: loaderData.visibilityMode,
    visibleProducts: loaderData.visibleProducts,
    hiddenProducts: loaderData.hiddenProducts,
    allowedCountries: loaderData.allowedCountries,
    hideAddToCart: loaderData.hideAddToCart,
    hideBuyNow: loaderData.hideBuyNow,
    disableOnHome: loaderData.disableOnHome,
    disableOnCollections: loaderData.disableOnCollections,
    enableSpecificProducts: loaderData.enableSpecificProducts,
    disableSpecificProducts: loaderData.disableSpecificProducts,
    enableSpecificCountries: loaderData.enableSpecificCountries,
    minimumAmount: loaderData.minimumAmount,
    maximumAmount: loaderData.maximumAmount,
  });
  const [initialFormState, setInitialFormState] = useState<FormState>({
    visibilityMode: loaderData.visibilityMode,
    visibleProducts: loaderData.visibleProducts,
    hiddenProducts: loaderData.hiddenProducts,
    allowedCountries: loaderData.allowedCountries,
    hideAddToCart: loaderData.hideAddToCart,
    hideBuyNow: loaderData.hideBuyNow,
    disableOnHome: loaderData.disableOnHome,
    disableOnCollections: loaderData.disableOnCollections,
    enableSpecificProducts: loaderData.enableSpecificProducts,
    disableSpecificProducts: loaderData.disableSpecificProducts,
    enableSpecificCountries: loaderData.enableSpecificCountries,
    minimumAmount: loaderData.minimumAmount,
    maximumAmount: loaderData.maximumAmount,
  }); // Keep initial state for comparison

  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Save bar ref (using any to bypass Shopify's type conflicts)
  const saveBarRef = useRef<any>(null);

  // Check for unsaved changes
  const hasUnsavedChanges = useFormChanges(initialFormState, formState);

  const handleSave = useCallback(() => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("visibilityMode", formState.visibilityMode);
    formData.append("hideAddToCart", String(formState.hideAddToCart));
    formData.append("hideBuyNow", String(formState.hideBuyNow));
    formData.append("disableOnHome", String(formState.disableOnHome));
    formData.append("disableOnCollections", String(formState.disableOnCollections));
    formData.append("enableSpecificProducts", String(formState.enableSpecificProducts));
    formData.append("disableSpecificProducts", String(formState.disableSpecificProducts));
    formData.append("enableSpecificCountries", String(formState.enableSpecificCountries));
    formData.append("visibleProducts", JSON.stringify(formState.visibleProducts));
    formData.append("hiddenProducts", JSON.stringify(formState.hiddenProducts));
    formData.append("allowedCountries", JSON.stringify(formState.allowedCountries));
    formData.append("minimumAmount", formState.minimumAmount);
    formData.append("maximumAmount", formState.maximumAmount);

    submit(formData, { method: "post", replace: true });
  }, [submit, formState]);

  const handleDiscard = useCallback(() => {
    setFormState(initialFormState);
  }, [initialFormState]);

  // Show/hide save bar based on changes
  useEffect(() => {
    const saveBarElement = saveBarRef.current;
    if (!saveBarElement) return;

    if (hasUnsavedChanges && navigation.state === 'idle') {
      saveBarElement.show();
    } else {
      saveBarElement.hide();
    }
  }, [hasUnsavedChanges, navigation.state]);

  // Show toast on successful save and update initial state
  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);
      setIsLoading(false);
      // Update initial state to current state after successful save
      setInitialFormState(formState);
    }
  }, [actionData, formState]);

  const handleModeButtonClick = (mode: string) => {
    setFormState(prev => ({ ...prev, visibilityMode: mode }));
  };

  const handleCheckboxChange = useCallback((checked: boolean, name: keyof FormState) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  }, []);

  const handleTextFieldChange = useCallback((value: string, name: keyof FormState) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  }, []);

  const toastMarkup = showToast ? (
    <Toast content={actionData?.message || "Success!"} onDismiss={() => setShowToast(false)} />
  ) : null;

  // Mock handlers for product/country pickers
  const handleProductSelection = useCallback((type: 'visible' | 'hidden') => {
    // In a real Shopify app, you would use Shopify App Bridge Resource Picker
    // @ts-ignore
    if (typeof window !== 'undefined' && window.shopify && window.shopify.resourcePicker) {
      // @ts-ignore
      window.shopify.resourcePicker({
        type: 'product',
        multiple: true,
        action: 'select'
      }).then((selection: any) => {
        if (selection && selection.length > 0) {
          const products = selection.map((product: any) => ({
            id: product.id,
            title: product.title,
            handle: product.handle,
            image: product.images?.[0]?.originalSrc || null
          }));
          if (type === 'visible') {
            setFormState(prev => ({ ...prev, visibleProducts: products }));
          } else {
            setFormState(prev => ({ ...prev, hiddenProducts: products }));
          }
        }
      }).catch((error: any) => {
        console.error('Product selection error:', error);
      });
    } else {
      // Fallback for development/testing
      console.log(`Simulating product selection for "${type}"...`)
      const mockProducts = [
        { id: "gid://shopify/Product/1", title: "Sample Product A", handle: "sample-a" },
        { id: "gid://shopify/Product/2", title: "Sample Product B", handle: "sample-b" },
      ];
      if (type === 'visible') {
        setFormState(prev => ({ ...prev, visibleProducts: mockProducts }));
      } else {
        setFormState(prev => ({ ...prev, hiddenProducts: mockProducts }));
      }
    }
  }, []);

  const handleCountrySelection = useCallback(() => {
    // In a real app, you might use a modal with a country list
    console.log("Simulating country selection...")
    const mockCountries = [
      { code: "US", name: "United States" },
      { code: "CA", name: "Canada" },
    ];
    setFormState(prev => ({ ...prev, allowedCountries: mockCountries }));
  }, []);

  const clearSelection = useCallback((type: 'visible' | 'hidden' | 'countries') => {
    if (type === 'visible') {
      setFormState(prev => ({ ...prev, visibleProducts: [] }));
    } else if (type === 'hidden') {
      setFormState(prev => ({ ...prev, hiddenProducts: [] }));
    } else {
      setFormState(prev => ({ ...prev, allowedCountries: [] }));
    }
  }, []);

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
      <Box
        padding="300"
        background="bg-surface-secondary"
        borderRadius="200"
      >
        <BlockStack gap="200">
          {displayItems.map((item: any) => (
            <InlineStack key={item.id || item.code} gap="200" blockAlign="center">
              <Icon
                source={type === 'products' ? ProductIcon : LocationIcon}
                tone="base"
              />
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
      {toastMarkup}
      
      {/* Save Bar Component */}
      <ui-save-bar 
        ref={saveBarRef} 
        id="visibility-save-bar" 
        discardConfirmation={hasUnsavedChanges}
      >
        <button variant="primary" onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button onClick={handleDiscard}>
          Discard
        </button>
      </ui-save-bar>

   <Page
  title="Visibility"
  subtitle="Enable or disable your form and control where it appears"
  backAction={{
    content: "Back",
    onAction: () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/app";
      }
    },
  }}
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
                  <Button
                    pressed={formState.visibilityMode === "disabled"}
                    onClick={() => handleModeButtonClick("disabled")}
                  >
                    Disabled
                  </Button>
                  <Button
                    pressed={formState.visibilityMode === "only_cart_page"}
                    onClick={() => handleModeButtonClick("only_cart_page")}
                  >
                    Only cart page
                  </Button>
                  <Button
                    pressed={formState.visibilityMode === "only_product_pages"}
                    onClick={() => handleModeButtonClick("only_product_pages")}
                  >
                    Only product pages
                  </Button>
                  <Button
                    pressed={formState.visibilityMode === "both_cart_product"}
                    onClick={() => handleModeButtonClick("both_cart_product")}
                  >
                    Both cart and product pages
                  </Button>
                </ButtonGroup>

                {formState.visibilityMode === "disabled" && (
                  <Banner tone="warning">
                    <BlockStack gap="300">
                      <Text as="p" variant="bodyMd">
                        The COD form is <strong>disabled</strong> on your store.
                      </Text>
                      <InlineStack gap="300">
                        <Button icon={WandIcon} onClick={() => handleModeButtonClick('both_cart_product')}>
                          Enable the app
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Banner>
                )}

                {(formState.visibilityMode === "only_product_pages" || formState.visibilityMode === "both_cart_product") && (
                  <BlockStack gap="400">
                    <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingMd">Product pages settings</Text>
                        <Checkbox
                          label="Hide the Add to Cart button on product pages"
                          checked={formState.hideAddToCart}
                          onChange={(checked) => handleCheckboxChange(checked, 'hideAddToCart')}
                        />
                        <Checkbox
                          label="Hide the Buy Now button on product pages"
                          checked={formState.hideBuyNow}
                          onChange={(checked) => handleCheckboxChange(checked, 'hideBuyNow')}
                        />
                      </BlockStack>
                    </Box>
                    <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingMd">Other pages settings</Text>
                        <Checkbox
                          label="Disable Releasit on your home page"
                          checked={formState.disableOnHome}
                          onChange={(checked) => handleCheckboxChange(checked, 'disableOnHome')}
                        />
                        <Checkbox
                          label="Disable Releasit on your collections pages"
                          checked={formState.disableOnCollections}
                          onChange={(checked) => handleCheckboxChange(checked, 'disableOnCollections')}
                        />
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
                    <Text as="h2" variant="headingMd">
                      Limit your order form
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Here you can choose to show your COD order form only for customers from specific countries or for specific products.
                    </Text>
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="300">
                    <Checkbox
                      label="Enable your form only for specific products and collections"
                      checked={formState.enableSpecificProducts}
                      onChange={(checked) => {
                        handleCheckboxChange(checked, 'enableSpecificProducts');
                        if (checked) {
                          handleCheckboxChange(false, 'disableSpecificProducts'); // Mutual exclusivity
                        }
                      }}
                    />
                    {formState.enableSpecificProducts && (
                      <Box paddingBlockStart="200">
                        <Card>
                          <BlockStack gap="300">
                            <InlineStack gap="200" align="space-between">
                              <Text as="h4" variant="headingXs">
                                Allowed Products & Collections
                              </Text>
                              {formState.visibleProducts.length > 0 && (
                                <Badge tone="success">
                                  {`${formState.visibleProducts.length} selected`}
                                </Badge>
                              )}
                            </InlineStack>
                            {renderSelectedItems(formState.visibleProducts, 'products')}
                            <InlineStack gap="200">
                              <Button onClick={() => handleProductSelection('visible')}>
                                Change Selection
                              </Button>
                              <Button
                                variant="plain"
                                tone="critical"
                                onClick={() => clearSelection('visible')}
                                disabled={formState.visibleProducts.length === 0}
                              >
                                Clear All
                              </Button>
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
                      onChange={(checked) => {
                        handleCheckboxChange(checked, 'disableSpecificProducts');
                        if (checked) {
                          handleCheckboxChange(false, 'enableSpecificProducts'); // Mutual exclusivity
                        }
                      }}
                    />
                    {formState.disableSpecificProducts && (
                      <Box paddingBlockStart="200">
                        <Card>
                          <BlockStack gap="300">
                            <InlineStack gap="200" align="space-between">
                              <Text as="h4" variant="headingXs">
                                Disabled Products & Collections
                              </Text>
                              {formState.hiddenProducts.length > 0 && (
                                <Badge tone="critical">
                                  {`${formState.hiddenProducts.length} disabled`}
                                </Badge>
                              )}
                            </InlineStack>
                            {renderSelectedItems(formState.hiddenProducts, 'products')}
                            <InlineStack gap="200">
                              <Button onClick={() => handleProductSelection('hidden')}>
                                Change Selection
                              </Button>
                              <Button
                                variant="plain"
                                tone="critical"
                                onClick={() => clearSelection('hidden')}
                                disabled={formState.hiddenProducts.length === 0}
                              >
                                Clear All
                              </Button>
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
                      onChange={(checked) => handleCheckboxChange(checked, 'enableSpecificCountries')}
                    />
                    {formState.enableSpecificCountries && (
                      <Box paddingBlockStart="200">
                        <Card>
                          <BlockStack gap="300">
                            <InlineStack gap="200" align="space-between">
                              <Text as="h4" variant="headingXs">
                                Allowed Countries
                              </Text>
                              {formState.allowedCountries.length > 0 && (
                                <Badge tone="success">
                                  {`${formState.allowedCountries.length} selected`}
                                </Badge>
                              )}
                            </InlineStack>
                            {renderSelectedItems(formState.allowedCountries, 'countries')}
                            <InlineStack gap="200">
                              <Button onClick={handleCountrySelection}>
                                Change Selection
                              </Button>
                              <Button
                                variant="plain"
                                tone="critical"
                                onClick={() => clearSelection('countries')}
                                disabled={formState.allowedCountries.length === 0}
                              >
                                Clear All
                              </Button>
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      </Box>
                    )}
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="300">
                    <Text as="h4" variant="headingXs">
                      Order Total Limits
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Set minimum and maximum order amounts for COD availability.
                    </Text>
                    <InlineStack gap="400" wrap={false} blockAlign="end">
                      <TextField
                        label="Minimum Amount"
                        type="number"
                        value={formState.minimumAmount}
                        onChange={(value) => handleTextFieldChange(value, 'minimumAmount')}
                        placeholder="0.00"
                        autoComplete="off"
                      />
                      <TextField
                        label="Maximum Amount"
                        type="number"
                        value={formState.maximumAmount}
                        onChange={(value) => handleTextFieldChange(value, 'maximumAmount')}
                        placeholder="No limit"
                        autoComplete="off"
                      />
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
    </Frame>
  );
}
