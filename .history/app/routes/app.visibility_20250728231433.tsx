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
// Import the TYPE for the SaveBar element
import type { UISaveBarElement } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// NOTE: The conflicting `declare global` block has been removed.
// The types from @shopify/app-bridge-react will be used instead.

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

// ... (loader and action functions remain the same)
export const loader = async ({ request }: LoaderFunctionArgs) => { /* ... */ };
export const action = async ({ request }: ActionFunctionArgs) => { /* ... */ };


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
  const [formState, setFormState] = useState<VisibilityFormState>(loaderData as VisibilityFormState);
  const [initialFormState, setInitialFormState] = useState<VisibilityFormState>(loaderData as VisibilityFormState);

  const [showToast, setShowToast] = useState(false);
  // Correctly typed ref for the ui-save-bar element
  const saveBarRef = useRef<UISaveBarElement>(null);


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


  const handleEnableSpecificProductsChange = useCallback(/* ... */);
  const handleDisableSpecificProductsChange = useCallback(/* ... */);


  // SAVE HANDLER: Submits the form data to the action function.
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


  // DISCARD HANDLER: Resets the form state back to its initial state.
  const handleDiscard = useCallback(() => {
    setFormState(initialFormState);
  }, [initialFormState]);


  // Effect to show/hide the save bar based on unsaved changes.
  useEffect(() => {
    // No `as any` cast needed now that the ref is correctly typed.
    if (!saveBarRef.current) return;

    if (hasUnsavedChanges && navigation.state === 'idle') {
      saveBarRef.current.show?.();
    } else {
      saveBarRef.current.hide?.();
    }
  }, [hasUnsavedChanges, navigation.state]);


  // Effect to handle post-save actions, like showing a toast and resetting state.
  useEffect(() => {
    if (actionData?.success && !isLoading) {
      setShowToast(true);
      setInitialFormState(formState);
    }
  }, [actionData, isLoading, formState]);


  const toastMarkup = showToast ? (
    <Toast content={actionData?.message || "Success!"} onDismiss={() => setShowToast(false)} />
  ) : null;

  // ... (handleProductSelection, handleCountrySelection, clearSelection, renderSelectedItems functions remain the same)
  const handleProductSelection = useCallback(/* ... */);
  const handleCountrySelection = useCallback(/* ... */);
  const clearSelection = useCallback(/* ... */);
  const renderSelectedItems = (items: any[], type: 'products' | 'countries') => { /* ... */ };


  return (
    <Frame>
      {/* Reverted to using the ui-save-bar web component */}
      <ui-save-bar ref={saveBarRef}>
        <button
          type="button"
          className="Polaris-Button Polaris-Button--primary"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          className="Polaris-Button"
          onClick={handleDiscard}
          disabled={isLoading}
        >
          Discard
        </button>
      </ui-save-bar>

      <Page
        title="Visibility"
        subtitle="Enable or disable your form and control where it appears"
      >
        {/* ... The rest of your page layout remains the same ... */}
        <Layout>
          {/* ... */}
        </Layout>
      </Page>
    </Frame>
  );
}