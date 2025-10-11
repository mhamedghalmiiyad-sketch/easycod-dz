import { useState, useCallback, useEffect } from "react";
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
import { getShopSettings, upsertShopSettings } from "~/utils/shopSettings";

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

// ACTION: Saves the form data when you click "Save"
export const action = async ({ request }: ActionFunctionArgs) => {
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

    const dataToSave = {
      visibilityMode,
      visibleProducts,
      hiddenProducts,
      allowedCountries,
      minimumAmount,
      maximumAmount,
      hideAddToCart,
      hideBuyNow,
      disableOnHome,
      disableOnCollections,
      enableSpecificProducts,
      disableSpecificProducts,
      enableSpecificCountries,
    };

    // Use the utility function to save settings
    await upsertShopSettings(session.shop, {
      visibilityMode: dataToSave.visibilityMode,
      visibleProducts: JSON.parse(dataToSave.visibleProducts || "[]"),
      // Add other fields that need to be stored in the database
      // Note: You may need to extend the upsertShopSettings function to handle these additional fields
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

// UI COMPONENT: The enhanced page
export default function VisibilityPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  // State to manage form changes
  const [selectedMode, setSelectedMode] = useState(loaderData.visibilityMode);
  const [hideAddToCartState, setHideAddToCartState] = useState(loaderData.hideAddToCart);
  const [hideBuyNowState, setHideBuyNowState] = useState(loaderData.hideBuyNow);
  const [disableOnHomeState, setDisableOnHomeState] = useState(loaderData.disableOnHome);
  const [disableOnCollectionsState, setDisableOnCollectionsState] = useState(loaderData.disableOnCollections);
  const [enableSpecificProductsState, setEnableSpecificProductsState] = useState(loaderData.enableSpecificProducts);
  const [disableSpecificProductsState, setDisableSpecificProductsState] = useState(loaderData.disableSpecificProducts);
  const [enableSpecificCountriesState, setEnableSpecificCountriesState] = useState(loaderData.enableSpecificCountries);
  const [selectedProducts, setSelectedProducts] = useState(loaderData.visibleProducts);
  const [selectedHiddenProducts, setSelectedHiddenProducts] = useState(loaderData.hiddenProducts);
  const [selectedCountries, setSelectedCountries] = useState(loaderData.allowedCountries);
  const [minAmountState, setMinAmountState] = useState(loaderData.minimumAmount);
  const [maxAmountState, setMaxAmountState] = useState(loaderData.maximumAmount);

  const [showToast, setShowToast] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("visibilityMode", selectedMode);
    formData.append("hideAddToCart", String(hideAddToCartState));
    formData.append("hideBuyNow", String(hideBuyNowState));
    formData.append("disableOnHome", String(disableOnHomeState));
    formData.append("disableOnCollections", String(disableOnCollectionsState));
    formData.append("enableSpecificProducts", String(enableSpecificProductsState));
    formData.append("disableSpecificProducts", String(disableSpecificProductsState));
    formData.append("enableSpecificCountries", String(enableSpecificCountriesState));
    formData.append("visibleProducts", JSON.stringify(selectedProducts));
    formData.append("hiddenProducts", JSON.stringify(selectedHiddenProducts));
    formData.append("allowedCountries", JSON.stringify(selectedCountries));
    formData.append("minimumAmount", minAmountState);
    formData.append("maximumAmount", maxAmountState);

    submit(formData, { method: "post" });
  }, [
    submit, selectedMode, hideAddToCartState, hideBuyNowState, disableOnHomeState,
    disableOnCollectionsState, enableSpecificProductsState, disableSpecificProductsState,
    enableSpecificCountriesState, selectedProducts, selectedHiddenProducts,
    selectedCountries, minAmountState, maxAmountState
  ]);

  const handleDiscard = useCallback(() => {
    setSelectedMode(loaderData.visibilityMode);
    setSelectedProducts(loaderData.visibleProducts);
    setSelectedHiddenProducts(loaderData.hiddenProducts);
    setSelectedCountries(loaderData.allowedCountries);
    setHideAddToCartState(loaderData.hideAddToCart);
    setHideBuyNowState(loaderData.hideBuyNow);
    setDisableOnHomeState(loaderData.disableOnHome);
    setDisableOnCollectionsState(loaderData.disableOnCollections);
    setEnableSpecificProductsState(loaderData.enableSpecificProducts);
    setDisableSpecificProductsState(loaderData.disableSpecificProducts);
    setEnableSpecificCountriesState(loaderData.enableSpecificCountries);
    setMinAmountState(loaderData.minimumAmount);
    setMaxAmountState(loaderData.maximumAmount);
    setHasUnsavedChanges(false);
  }, [loaderData]);

  // Add and remove event listeners for the save bar.
  useEffect(() => {
    const saveBar = document.getElementById('visibility-save-bar');
    if (!saveBar) return;

    const onSave = () => handleSave();
    const onDiscard = () => handleDiscard();

    saveBar.addEventListener('save', onSave);
    saveBar.addEventListener('discard', onDiscard);

    return () => {
      saveBar.removeEventListener('save', onSave);
      saveBar.removeEventListener('discard', onDiscard);
    };
  }, [handleSave, handleDiscard]);

  // Effect to set hasUnsavedChanges when any relevant state changes
  useEffect(() => {
    const initialData = loaderData;
    const currentData = {
      visibilityMode: selectedMode,
      hideAddToCart: hideAddToCartState,
      hideBuyNow: hideBuyNowState,
      disableOnHome: disableOnHomeState,
      disableOnCollections: disableOnCollectionsState,
      enableSpecificProducts: enableSpecificProductsState,
      disableSpecificProducts: disableSpecificProductsState,
      enableSpecificCountries: enableSpecificCountriesState,
      visibleProducts: selectedProducts,
      hiddenProducts: selectedHiddenProducts,
      allowedCountries: selectedCountries,
      minimumAmount: minAmountState,
      maximumAmount: maxAmountState,
    };

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

    setHasUnsavedChanges(productsChanged || hiddenProductsChanged || countriesChanged || otherSettingsChanged);
  }, [
    selectedMode, hideAddToCartState, hideBuyNowState, disableOnHomeState,
    disableOnCollectionsState, enableSpecificProductsState, disableSpecificProductsState,
    enableSpecificCountriesState, selectedProducts, selectedHiddenProducts,
    selectedCountries, minAmountState, maxAmountState, loaderData,
  ]);

  // Effect to show/hide save bar based on unsaved changes and navigation state
  useEffect(() => {
    const saveBar = document.getElementById('visibility-save-bar') as HTMLElementTagNameMap['ui-save-bar'];
    if (!saveBar) return;

    if (hasUnsavedChanges && navigation.state === 'idle') {
      saveBar.show().catch(console.error);
    } else {
      saveBar.hide().catch(console.error);
    }
  }, [hasUnsavedChanges, navigation.state]);

  // Handle successful save - show toast and reset unsaved state
  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);
      setHasUnsavedChanges(false);
    }
  }, [actionData]);

  const handleModeButtonClick = (mode: string) => {
    setSelectedMode(mode);
  };

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
            setSelectedProducts(products);
          } else {
            setSelectedHiddenProducts(products);
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
        setSelectedProducts(mockProducts);
      } else {
        setSelectedHiddenProducts(mockProducts);
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
    setSelectedCountries(mockCountries);
  }, []);

  const clearSelection = useCallback((type: 'visible' | 'hidden' | 'countries') => {
    if (type === 'visible') {
      setSelectedProducts([]);
    } else if (type === 'hidden') {
      setSelectedHiddenProducts([]);
    } else {
      setSelectedCountries([]);
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
    <>
      <ui-save-bar id="visibility-save-bar" discardConfirmation={true}></ui-save-bar>

      <Frame>
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
                      <Button
                        pressed={selectedMode === "disabled"}
                        onClick={() => handleModeButtonClick("disabled")}
                      >
                        Disabled
                      </Button>
                      <Button
                        pressed={selectedMode === "only_cart_page"}
                        onClick={() => handleModeButtonClick("only_cart_page")}
                      >
                        Only cart page
                      </Button>
                      <Button
                        pressed={selectedMode === "only_product_pages"}
                        onClick={() => handleModeButtonClick("only_product_pages")}
                      >
                        Only product pages
                      </Button>
                      <Button
                        pressed={selectedMode === "both_cart_product"}
                        onClick={() => handleModeButtonClick("both_cart_product")}
                      >
                        Both cart and product pages
                      </Button>
                    </ButtonGroup>

                    {selectedMode === "disabled" && (
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

                    {(selectedMode === "only_product_pages" || selectedMode === "both_cart_product") && (
                      <BlockStack gap="400">
                        <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                          <BlockStack gap="300">
                            <Text as="h3" variant="headingMd">Product pages settings</Text>
                            <Checkbox
                              label="Hide the Add to Cart button on product pages"
                              checked={hideAddToCartState}
                              onChange={(checked) => setHideAddToCartState(checked)}
                            />
                            <Checkbox
                              label="Hide the Buy Now button on product pages"
                              checked={hideBuyNowState}
                              onChange={(checked) => setHideBuyNowState(checked)}
                            />
                          </BlockStack>
                        </Box>
                        <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                          <BlockStack gap="300">
                            <Text as="h3" variant="headingMd">Other pages settings</Text>
                            <Checkbox
                              label="Disable Releasit on your home page"
                              checked={disableOnHomeState}
                              onChange={(checked) => setDisableOnHomeState(checked)}
                            />
                            <Checkbox
                              label="Disable Releasit on your collections pages"
                              checked={disableOnCollectionsState}
                              onChange={(checked) => setDisableOnCollectionsState(checked)}
                            />
                          </BlockStack>
                        </Box>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>

                {/* === LIMITS CARD (shown unless form is disabled) === */}
                {selectedMode !== "disabled" && (
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
                          checked={enableSpecificProductsState}
                          onChange={(checked) => {
                            setEnableSpecificProductsState(checked);
                            if (checked) {
                              setDisableSpecificProductsState(false); // Mutual exclusivity
                            }
                          }}
                        />
                        {enableSpecificProductsState && (
                          <Box paddingBlockStart="200">
                            <Card>
                              <BlockStack gap="300">
                                <InlineStack gap="200" align="space-between">
                                  <Text as="h4" variant="headingXs">
                                    Allowed Products & Collections
                                  </Text>
                                  {selectedProducts.length > 0 && (
                                    <Badge tone="success">
                                      {`${selectedProducts.length} selected`}
                                    </Badge>
                                  )}
                                </InlineStack>
                                {renderSelectedItems(selectedProducts, 'products')}
                                <InlineStack gap="200">
                                  <Button onClick={() => handleProductSelection('visible')}>
                                    Change Selection
                                  </Button>
                                  <Button
                                    variant="plain"
                                    tone="critical"
                                    onClick={() => clearSelection('visible')}
                                    disabled={selectedProducts.length === 0}
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
                          checked={disableSpecificProductsState}
                          onChange={(checked) => {
                            setDisableSpecificProductsState(checked);
                            if (checked) {
                              setEnableSpecificProductsState(false); // Mutual exclusivity
                            }
                          }}
                        />
                        {disableSpecificProductsState && (
                          <Box paddingBlockStart="200">
                            <Card>
                              <BlockStack gap="300">
                                <InlineStack gap="200" align="space-between">
                                  <Text as="h4" variant="headingXs">
                                    Disabled Products & Collections
                                  </Text>
                                  {selectedHiddenProducts.length > 0 && (
                                    <Badge tone="critical">
                                      {`${selectedHiddenProducts.length} disabled`}
                                    </Badge>
                                  )}
                                </InlineStack>
                                {renderSelectedItems(selectedHiddenProducts, 'products')}
                                <InlineStack gap="200">
                                  <Button onClick={() => handleProductSelection('hidden')}>
                                    Change Selection
                                  </Button>
                                  <Button
                                    variant="plain"
                                    tone="critical"
                                    onClick={() => clearSelection('hidden')}
                                    disabled={selectedHiddenProducts.length === 0}
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
                          checked={enableSpecificCountriesState}
                          onChange={(checked) => setEnableSpecificCountriesState(checked)}
                        />
                        {enableSpecificCountriesState && (
                          <Box paddingBlockStart="200">
                            <Card>
                              <BlockStack gap="300">
                                <InlineStack gap="200" align="space-between">
                                  <Text as="h4" variant="headingXs">
                                    Allowed Countries
                                  </Text>
                                  {selectedCountries.length > 0 && (
                                    <Badge tone="success">
                                      {`${selectedCountries.length} selected`}
                                    </Badge>
                                  )}
                                </InlineStack>
                                {renderSelectedItems(selectedCountries, 'countries')}
                                <InlineStack gap="200">
                                  <Button onClick={handleCountrySelection}>
                                    Change Selection
                                  </Button>
                                  <Button
                                    variant="plain"
                                    tone="critical"
                                    onClick={() => clearSelection('countries')}
                                    disabled={selectedCountries.length === 0}
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
                            value={minAmountState}
                            onChange={setMinAmountState}
                            placeholder="0.00"
                            autoComplete="off"
                          />
                          <TextField
                            label="Maximum Amount"
                            type="number"
                            value={maxAmountState}
                            onChange={setMaxAmountState}
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
          {toastMarkup}
        </Page>
      </Frame>
    </>
  );
}