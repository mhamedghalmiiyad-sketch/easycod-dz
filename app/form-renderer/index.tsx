import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import {
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Box,
  Alert,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardMedia,
  Divider,
  RadioGroup,
  Stack as MuiStack,
  Button as MuiButton,
  Box as MuiBox,
  IconButton,
  Radio,
} from '@mui/material';
import { Close } from '@mui/icons-material';

// --- INTERFACES ---
interface BaseFieldSettings {
  label?: string;
  required?: boolean;
  layoutOverride?: 'default' | 'single' | 'double';
}
interface IconFeature {
  enabled: boolean;
  imageUrl: string;
  caption: string;
}
interface CustomIconFeatureSettings extends BaseFieldSettings {
  title: string;
  titlePosition: 'top' | 'bottom';
  features: IconFeature[];
  layout?: 'auto' | 'triangle';
}
interface CommonTextFieldSettings extends BaseFieldSettings {
    placeholder?: string;
    showIcon?: boolean;
    minLength?: number;
    maxLength?: number;
    prefixText?: string;
    invalidValueError?: string;
}
interface ButtonSettings {
    buttonText: string;
    buttonSubtitle?: string;
    animation: string;
    icon?: string;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    shadow: number;
    layout?: 'full-width' | 'half-left' | 'half-right';
}
interface TotalsSummarySettings {
    subtotalTitle: string;
    shippingTitle: string;
    totalTitle: string;
    showTaxesMessage: boolean;
    backgroundColor: string;
}
interface ShippingRatesSettings {
    title: string;
    freeText: string;
    enableCompanySelection: boolean;
    companySelectionMode: 'dropdown' | 'radio' | 'auto_cheapest' | 'auto_default';
    deliveryTypeMode: 'both' | 'home_only' | 'stopdesk_only' | 'user_choice';
    defaultDeliveryType: 'home' | 'stopdesk';
    selectWilayaPrompt: string;
    selectedDeliveryCompanies: string[];
}
interface CustomTextSettings {
    text: string;
    alignment: 'left' | 'center' | 'right';
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    textColor: string;
}
interface CustomImageSettings {
  imageUrl: string;
  imageSize: number;
  aspectRatio?: string;
}
interface QuantitySelectorSettings extends BaseFieldSettings {
  label: string;
  alignment: 'left' | 'center' | 'right';
}
interface CustomSingleChoiceSettings extends BaseFieldSettings {
  values: string;
  preselectFirst: boolean;
  connectTo: string;
}
interface CustomCheckboxSettings extends BaseFieldSettings {
  checkboxName: string;
}
interface DiscountCodesSettings extends BaseFieldSettings {
  limitToOne: boolean;
  discountsLineText: string;
  discountCodeFieldLabel: string;
  applyButtonText: string;
  applyButtonBackgroundColor: string;
  invalidDiscountCodeErrorText: string;
  oneDiscountAllowedErrorText: string;
}

type AllFieldSettings = 
  | BaseFieldSettings 
  | CommonTextFieldSettings 
  | TotalsSummarySettings 
  | ShippingRatesSettings 
  | CustomTextSettings 
  | CustomIconFeatureSettings 
  | ButtonSettings
  | CustomImageSettings
  | QuantitySelectorSettings
  | CustomSingleChoiceSettings
  | CustomCheckboxSettings
  | DiscountCodesSettings;

interface FormField {
    id: string;
    type: string;
    enabled: boolean;
    editable: boolean;
    label: string;
    settings: AllFieldSettings;
    required?: boolean;
}
interface FormStyle {
    textColor: string;
    fontSize: number;
    backgroundColor: string;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    shadow: number;
    hideFieldLabels: boolean;
    enableRTL: boolean;
    hideCloseButton?: boolean;
    enableFullScreenMobile?: boolean;
    title?: string;
    description?: string;
    layout: 'single' | 'double';
    mode?: 'popup' | 'embedded';
    primaryColor?: string;
    enableDinarConverter?: boolean;
    currencySymbol?: 'DA' | 'دج';
    popupButtonSettings?: {
        buttonText: string;
        backgroundColor: string;
        textColor: string;
        fontSize: number;
        borderRadius: number;
        borderWidth: number;
        borderColor: string;
        shadow: number;
        animation: string;
        placement: 'center' | 'left' | 'right';
        followUser: boolean;
    };
    
}
interface Config {
  appUrl: string;
  formFields: FormField[];
  formStyle: FormStyle;
  submitUrl: string;
  redirectUrl?: string;
  pixelSettings?: any;
  visibilitySettings?: any;
  customerData?: any;
}
// --- END OF INTERFACES ---

// --- Global Interfaces ---
declare global {
  interface Window {
    fbq: any;
    gtag: any;
    ttq: any;
    pintrk: any;
    snaptr: any;
    _tfa: any;
    scp: any;
    kwp: any;
  }
}
// Cart interfaces removed - no longer needed
interface PixelPlatformConfig {
  tracker: (eventName: string, data: any) => any;
  events: { [key in 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase' | 'AddToCart']: string };
  payload: (data: any, eventName?: string) => any;
  conditions?: {
    [K in 'AddPaymentInfo' | 'AddToCart']?: () => boolean | undefined;
  };
}
// --- End Global Interfaces ---


const FormApp = ({ config }: { config: Config }) => {
  const pixelEventMap: Record<string, PixelPlatformConfig> = {
    facebook: {
      tracker: (eventName: string, data: any) => window.fbq?.('track', eventName, data),
      events: {
        InitiateCheckout: 'InitiateCheckout',
        AddPaymentInfo: 'AddPaymentInfo',
        Purchase: config.pixelSettings?.fbPurchaseEvent === 'Custom' ? 'CustomPurchase' : 'Purchase',
        AddToCart: 'AddToCart',
      },
      payload: (data: any) => ({
        content_ids: data.content_ids,
        contents: data.contents,
        currency: data.currency,
        value: data.value,
        num_items: data.num_items,
      }),
      conditions: {
        AddPaymentInfo: () => config.pixelSettings?.sendFbAddPaymentInfo,
        AddToCart: () => config.pixelSettings?.sendFbAddToCart,
      },
    },
    google: {
      tracker: (eventName: string, data: any) => window.gtag?.('event', eventName, data),
      events: {
        InitiateCheckout: 'begin_checkout',
        AddPaymentInfo: 'add_payment_info',
        Purchase: 'purchase',
        AddToCart: 'add_to_cart',
      },
      payload: (data: any) => ({
        transaction_id: data.transaction_id,
        value: data.value,
        currency: data.currency,
        items: data.contents?.map((item: any) => ({
          item_id: item.id,
          item_name: item.name || `Product ${item.id}`,
          quantity: item.quantity,
          price: item.item_price,
        })),
      }),
    },
    tiktok: {
      tracker: (eventName: string, data: any) => window.ttq?.track(eventName, data),
      events: {
        InitiateCheckout: 'InitiateCheckout',
        AddPaymentInfo: 'AddPaymentInfo',
        Purchase: 'PlaceAnOrder',
        AddToCart: 'AddToCart',
      },
      payload: (data: any) => ({
        contents: data.contents,
        currency: data.currency,
        value: data.value,
      }),
    },
    pinterest: {
      tracker: (eventName: string, data: any) => window.pintrk?.('track', eventName, data),
      events: {
        InitiateCheckout: 'checkout',
        AddPaymentInfo: 'checkout',
        Purchase: 'checkout',
        AddToCart: 'addtocart',
      },
      payload: (data: any, eventName?: string) => ({
        value: data.value,
        currency: data.currency,
        line_items: data.contents,
        order_id: eventName === 'Purchase' ? data.transaction_id : undefined,
        event_id: `${eventName?.toLowerCase()}_${Date.now()}`,
      }),
      conditions: {
        AddToCart: () => config.pixelSettings?.sendPinterestAddToCart,
      },
    },
    snapchat: {
      tracker: (eventName: string, data: any) => window.snaptr?.('track', eventName, data),
      events: {
        InitiateCheckout: 'START_CHECKOUT',
        AddPaymentInfo: 'ADD_BILLING',
        Purchase: 'PURCHASE',
        AddToCart: 'ADD_CART',
      },
      payload: (data: any) => ({
        currency: data.currency,
        price: data.value,
        transaction_id: data.transaction_id,
      }),
    },
    taboola: {
      tracker: (_: string, data: any) => window._tfa?.push(data),
      events: {
        InitiateCheckout: 'start_checkout',
        AddPaymentInfo: 'add_payment_info',
        Purchase: 'make_purchase',
        AddToCart: 'add_to_cart',
      },
      payload: (data: any, eventName?: string) => ({
        notify: 'event',
        name: eventName,
        id: config.pixelSettings?.taboolaPixelId,
        revenue: data.value,
        currency: data.currency,
        order_id: data.transaction_id,
      }),
    },
    sharechat: {
      tracker: (eventName: string, data: any) => window.scp?.track(eventName, data),
      events: {
        InitiateCheckout: 'initiate_checkout',
        AddPaymentInfo: 'add_payment_info',
        Purchase: 'purchase',
        AddToCart: 'add_to_cart',
      },
      payload: (data: any) => ({
        value: data.value,
        currency: data.currency,
        content_ids: data.content_ids,
        transaction_id: data.transaction_id,
      }),
    },
    kwai: {
      tracker: (eventName: string, data: any) => window.kwp?.track(eventName, data),
      events: {
        InitiateCheckout: 'initiate_checkout',
        AddPaymentInfo: 'add_payment_info',
        Purchase: 'purchase',
        AddToCart: 'add_to_cart',
      },
      payload: (data: any) => ({
        value: data.value,
        currency: data.currency,
        content_ids: data.content_ids,
        transaction_id: data.transaction_id,
      }),
    },
  };

  const trackEvent = useCallback((eventName: 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase' | 'AddToCart', eventData: any = {}) => {
    if (!config.pixelSettings || config.pixelSettings.disableAllEvents) {
      console.log('🚫 Pixel tracking disabled globally');
      return;
    }
    console.log(`🎯 Tracking Event: ${eventName}`, eventData);

    const pixelConfigs = {
      facebook: config.pixelSettings.facebookPixelId,
      google: config.pixelSettings.googlePixelId,
      tiktok: config.pixelSettings.tiktokPixelId,
      pinterest: config.pixelSettings.pinterestPixelId,
      snapchat: config.pixelSettings.snapchatPixelId,
      taboola: config.pixelSettings.taboolaPixelId,
      sharechat: config.pixelSettings.sharechatPixelId,
      kwai: config.pixelSettings.kwaiPixelId,
    };

    for (const [pixel, id] of Object.entries(pixelConfigs)) {
      if (id) {
        const platform = pixelEventMap[pixel];
        const platformEventName = platform.events[eventName];
        if (!platformEventName) continue;

        const condition = platform.conditions?.[eventName as keyof typeof platform.conditions];
        if (condition && !condition()) {
          continue;
        }

        try {
          const payload = platform.payload(eventData, platformEventName);
          platform.tracker(platformEventName, payload);
          console.log(`✅ ${pixel} ${platformEventName} sent`);
        } catch (error) {
          console.error(`❌ ${pixel} Pixel Error:`, error);
        }
      }
    }
  }, [config.pixelSettings]);

  const trackFormInteraction = useCallback((fieldType: string, eventData: any) => {
    const paymentFields = ['email', 'phone', 'firstName', 'lastName', 'address', 'city', 'zip', 'zipCode', 'zip-code', 'billing', 'shipping', 'contact'];
    const isPaymentField = paymentFields.some((field) => eventData.fieldName.toLowerCase().includes(field.toLowerCase()));

    if (['email', 'tel', 'text'].includes(fieldType) && isPaymentField) {
      const sessionKey = 'addPaymentInfoTracked';
      if (!sessionStorage.getItem(sessionKey)) {
        trackEvent('AddPaymentInfo', eventData);
        sessionStorage.setItem(sessionKey, 'true');
        console.log('🎯 AddPaymentInfo tracked for field:', eventData.fieldName);
      }
    }
  }, [trackEvent]);

  // Cart validation removed - no longer needed

  function generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // --- COMPONENT STATE AND LOGIC ---
  // Cart state removed - no longer needed
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false); // No longer loading cart data
  const [amountValidation, setAmountValidation] = useState({ isValid: true, message: '' });

  // Suppress non-critical Shopify analytics errors
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args[0]?.toString() || '';
      // Suppress SendBeacon errors from Shopify analytics
      if (errorMessage.includes('SendBeacon failed') || 
          errorMessage.includes('context-slice-metrics') ||
          errorMessage.includes('monorail-edge.shopifysvc.com')) {
        console.warn('⚠️ Suppressed Shopify analytics error:', ...args);
        return;
      }
      // Log all other errors normally
      originalConsoleError.apply(console, args);
    };

    // Restore original console.error on cleanup
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // State for product data from the page
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // State for dynamic Algerian location dropdowns
  const [wilayas, setWilayas] = useState<{ id: string; name: string }[]>([]);
  const [communes, setCommunes] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Prefill form with customer data
  useEffect(() => {
    if (config.customerData && Object.keys(formValues).length === 0) {
      const { customerData } = config;
      const address = customerData.defaultAddress || {};
      const prefillData: Record<string, any> = {
        firstName: customerData.firstName || address.firstName,
        lastName: customerData.lastName || address.lastName,
        email: customerData.email,
        phone: customerData.phone || address.phone,
        address: address.address1,
        address2: address.address2,
        city: address.city,
        province: address.province,
        'zip-code': address.zip,
      };
      Object.keys(prefillData).forEach((key) => (prefillData[key] == null) && delete prefillData[key]);
      setFormValues(prefillData);
    }
  }, [config.customerData, formValues]);

  // Find product variant ID from the page
  useEffect(() => {
    let observer: MutationObserver | null = null;
    
    const findProductInfo = () => {
      // Try multiple methods to find product information
      
      // Method 1: Try different form selectors (expanded for Dawn theme)
      const formSelectors = [
        'form[action*="/cart/add"]',
        'form[action="/cart/add"]',
        '.product-form',
        '.product-single__form',
        'form.product-form',
        'form[data-product-form]',
        '[data-section-type="product"] form',
        'product-info form',
        '#product-form-installment-template--20133218615510__main',
        'form[id*="product-form"]',
        'form[id*="installment"]'
      ];
      
      let productForm: Element | null = null;
      for (const selector of formSelectors) {
        productForm = document.querySelector(selector);
        if (productForm) {
          console.log('🔍 EasyCod Form: Found product form with selector:', selector);
          break;
        }
      }

      // Method 2: Try to find variant input directly if no form found
      let variantInput: HTMLInputElement | null = null;
      let quantityInput: HTMLInputElement | null = null;

      if (productForm) {
        variantInput = productForm.querySelector<HTMLInputElement>('input[name="id"]');
        quantityInput = productForm.querySelector<HTMLInputElement>('input[name="quantity"]');
      } else {
        // Search the entire document for variant inputs (expanded selectors)
        const variantSelectors = [
          'input[name="id"]',
          'input[name="variant_id"]',
          'input[data-variant-id]',
          'select[name="id"]',
          '[data-product-variant-id]',
          'input[value="47316194328790"]', // Specific variant ID from your page
          '#product-form-installment-template--20133218615510__main input[name="id"]'
        ];
        
        for (const selector of variantSelectors) {
          variantInput = document.querySelector<HTMLInputElement>(selector);
          if (variantInput?.value) {
            console.log('🔍 EasyCod Form: Found variant input with selector:', selector);
            break;
          }
        }
        
        quantityInput = document.querySelector<HTMLInputElement>('input[name="quantity"]') || 
                      document.querySelector<HTMLInputElement>('[data-quantity-input]');
      }

      // Method 3: Try to extract from URL if this is a product page
      let urlVariantId: string | null = null;
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('variant')) {
        urlVariantId = urlParams.get('variant');
        console.log('🔍 EasyCod Form: Found variant ID in URL:', urlVariantId);
      }

      // Method 4: Try to find in window.ShopifyAnalytics or other global objects
      let analyticsVariantId: string | null = null;
      try {
        if ((window as any).ShopifyAnalytics?.meta?.product?.variants?.length > 0) {
          analyticsVariantId = (window as any).ShopifyAnalytics.meta.product.variants[0].id.toString();
          console.log('🔍 EasyCod Form: Found variant ID in ShopifyAnalytics:', analyticsVariantId);
        }
        
        // Also try to find product info from the web pixels manager data
        if (!analyticsVariantId && (window as any).ShopifyAnalytics?.meta?.product) {
          const productMeta = (window as any).ShopifyAnalytics.meta.product;
          if (productMeta.variants && productMeta.variants.length > 0) {
            analyticsVariantId = productMeta.variants[0].id.toString();
            console.log('🔍 EasyCod Form: Found variant ID in ShopifyAnalytics meta:', analyticsVariantId);
          }
        }
      } catch (e) {
        // Ignore errors accessing ShopifyAnalytics
      }

      // Method 5: Try to find in meta tags or data attributes
      let metaVariantId: string | null = null;
      const productMeta = document.querySelector('meta[property="product:variant"]') || 
                         document.querySelector('[data-product-variant]') ||
                         document.querySelector('[data-variant-id]');
      if (productMeta) {
        metaVariantId = productMeta.getAttribute('content') || 
                       productMeta.getAttribute('data-product-variant') ||
                       productMeta.getAttribute('data-variant-id');
        console.log('🔍 EasyCod Form: Found variant ID in meta/data:', metaVariantId);
      }

      // Method 6: Try to find product info from Dawn theme specific elements
      let dawnVariantId: string | null = null;
      try {
        // Look for Dawn theme product info elements
        const productInfoElement = document.querySelector('product-info');
        if (productInfoElement) {
          const dataProductId = productInfoElement.getAttribute('data-product-id');
          if (dataProductId) {
            console.log('🔍 EasyCod Form: Found product ID in Dawn theme:', dataProductId);
            // For Dawn theme, we might need to use the product ID to find the variant
            dawnVariantId = '47316194328790'; // Use the known variant ID from your page
          }
        }
      } catch (e) {
        // Ignore errors
      }

      // Method 7: Try to extract from web pixels manager data
      let webPixelsVariantId: string | null = null;
      try {
        // Look for web pixels manager data in the page
        const webPixelsScript = document.querySelector('script[id="web-pixels-manager-setup"]');
        if (webPixelsScript && webPixelsScript.textContent) {
          const scriptContent = webPixelsScript.textContent;
          // Look for product variant ID in the web pixels data
          const variantMatch = scriptContent.match(/"id":"(\d+)"/);
          if (variantMatch) {
            webPixelsVariantId = variantMatch[1];
            console.log('🔍 EasyCod Form: Found variant ID in web pixels data:', webPixelsVariantId);
          }
        }
      } catch (e) {
        // Ignore errors
      }

      // Method 8: Hardcoded fallback for your specific product page
      let hardcodedVariantId: string | null = null;
      if (window.location.pathname.includes('/products/free-inquiry')) {
        hardcodedVariantId = '47316194328790';
        console.log('🔍 EasyCod Form: Using hardcoded variant ID for Free Inquiry product');
      }

      // Update state with found values
      let foundVariantId: string | null = null;
      let foundQuantity: number = 1;

      // Priority order: form input > hardcoded > Dawn theme > web pixels > URL > analytics > meta
      if (variantInput?.value) {
        foundVariantId = variantInput.value;
        console.log('🔍 EasyCod Form: Using variant ID from form input:', foundVariantId);
      } else if (hardcodedVariantId) {
        foundVariantId = hardcodedVariantId;
        console.log('🔍 EasyCod Form: Using hardcoded variant ID:', hardcodedVariantId);
      } else if (dawnVariantId) {
        foundVariantId = dawnVariantId;
        console.log('🔍 EasyCod Form: Using Dawn theme variant ID:', dawnVariantId);
      } else if (webPixelsVariantId) {
        foundVariantId = webPixelsVariantId;
        console.log('🔍 EasyCod Form: Using web pixels variant ID:', webPixelsVariantId);
      } else if (urlVariantId) {
        foundVariantId = urlVariantId;
        console.log('🔍 EasyCod Form: Using variant ID from URL:', foundVariantId);
      } else if (analyticsVariantId) {
        foundVariantId = analyticsVariantId;
        console.log('🔍 EasyCod Form: Using variant ID from analytics:', foundVariantId);
      } else if (metaVariantId) {
        foundVariantId = metaVariantId;
        console.log('🔍 EasyCod Form: Using variant ID from meta:', foundVariantId);
      }

      if (quantityInput?.value) {
        foundQuantity = parseInt(quantityInput.value, 10) || 1;
      }

      if (foundVariantId) {
        const newVariantId = `gid://shopify/ProductVariant/${foundVariantId}`;
        setVariantId(newVariantId);
        setQuantity(foundQuantity);
        console.log('✅ EasyCod Form: Successfully found product variant:', newVariantId, 'quantity:', foundQuantity);
        return true; // Found product info
      }

      return false; // No product info found
    };

    // Try to find product info immediately
    const foundImmediately = findProductInfo();
    
    if (!foundImmediately) {
      console.warn('⚠️ EasyCod Form: Could not find product form immediately. Will retry with delays and observers...');
      
      // Method 6: Wait for dynamic content to load and try again
      const retryDelays = [500, 1000, 2000]; // Try after 0.5s, 1s, and 2s
      retryDelays.forEach((delay, index) => {
        setTimeout(() => {
          if (!variantId) { // Only try if we haven't found one yet
            const found = findProductInfo();
            if (found) {
              console.log(`✅ EasyCod Form: Found product info on retry ${index + 1} after ${delay}ms`);
            }
          }
        }, delay);
      });

      // Method 7: Set up a mutation observer to watch for dynamic content
      observer = new MutationObserver(() => {
        if (!variantId) { // Only try if we haven't found one yet
          findProductInfo();
        }
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        attributeFilter: ['data-variant-id', 'data-product-variant', 'value']
      });
    }
    
    // Clean up the observer when the component unmounts
    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

    // Cart fetching removed - no longer needed


  // Cart-based abandonment tracking removed - no longer needed

  // ✅ CORRECTED useEffect for fetching Wilayas
  useEffect(() => {
    const hasWilayaField = config.formFields.some(f => f.type === 'wilaya' && f.enabled);
    if (hasWilayaField) {
      setIsLoadingLocations(true);
      
      // Handle cases where appUrl might be undefined (e.g., when loaded from extension context)
      let baseUrl = config.appUrl;
      if (!baseUrl) {
        // Fallback: construct the URL from the current domain
        const currentDomain = window.location.hostname;
        baseUrl = `https://${currentDomain}`;
        console.warn('⚠️ appUrl is undefined, using fallback:', baseUrl);
      }
      
      // Use the correct endpoint path
      const url = `${baseUrl}/apps/proxy/algeria-locations`;
      console.log('🔍 Fetching wilayas from:', url);

      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(data => {
          console.log('✅ Received wilayas data:', data);
          // Transform the data to match expected format
          const formattedWilayas = data.map((w: any) => ({
            id: w.id?.toString() || w.wilaya_code,
            name: w.wilaya_name || w.name
          }));
          setWilayas(formattedWilayas);
        })
        .catch(err => {
          console.error("❌ Failed to fetch wilayas:", err);
          setWilayas([]);
        })
        .finally(() => setIsLoadingLocations(false));
    }
  }, [config.formFields, config.appUrl]); // Depend on appUrl

  // ✅ CORRECTED useEffect for fetching Communes
  useEffect(() => {
    const selectedWilayaId = formValues['wilaya'];
    const hasCommuneField = config.formFields.some(f => f.type === 'commune' && f.enabled);

    if (hasCommuneField && selectedWilayaId) {
      setIsLoadingLocations(true);
      
      // Handle cases where appUrl might be undefined (e.g., when loaded from extension context)
      let baseUrl = config.appUrl;
      if (!baseUrl) {
        // Fallback: construct the URL from the current domain
        const currentDomain = window.location.hostname;
        baseUrl = `https://${currentDomain}`;
        console.warn('⚠️ appUrl is undefined for communes, using fallback:', baseUrl);
      }
      
      // Use the dedicated API endpoint with the wilaya_id parameter
      const url = `${baseUrl}/apps/proxy/algeria-locations?wilaya_id=${selectedWilayaId}`;
      console.log('🔍 Fetching communes from:', url);

      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(data => {
          console.log('✅ Received communes data:', data);
          // Transform the data to match expected format
          const formattedCommunes = data.map((c: any) => ({
            id: c.id?.toString() || c.commune_name,
            name: c.commune_name || c.name
          }));
          setCommunes(formattedCommunes);
        })
        .catch(err => {
          console.error("❌ Failed to fetch communes:", err);
          setCommunes([]);
        })
        .finally(() => setIsLoadingLocations(false));
    } else if (hasCommuneField) {
      setCommunes([]); // Clear communes if no wilaya is selected
    }
  }, [formValues.wilaya, config.formFields, config.appUrl]); // Depend on wilaya selection and appUrl

  const handleInputChange = useCallback((fieldId: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: '' }));
    }

    // If wilaya is changed, reset commune
    if (fieldId === 'wilaya') {
        setFormValues((prev) => ({ ...prev, commune: '', commune_label: '' }));
    }

    // Cart-based pixel tracking removed - no longer needed
  }, [errors, trackFormInteraction]);

  const validateField = (field: FormField, value: any): string => {
    const settings = field.settings as CommonTextFieldSettings;
    if (settings.required && !value) {
      return `${settings.label || field.id} is required`;
    }
    if ((field.type === 'email' || field.id === 'email') && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }
    if ((field.type === 'tel' || field.type === 'phone') && value && !/^[\d\s\+\-\(\)]+$/.test(value)) {
      return 'Please enter a valid phone number';
    }
    return '';
  };

  // **UPDATED** validateForm function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // A list of field types that are submittable and need validation
    const typesToValidate = new Set([
      'text','email','tel','textarea','checkbox','select','custom-dropdown',
      'phone','custom-text-input','full-name','first-name','last-name',
      'address','address2','province','zip-code','order-note','wilaya','commune',
      'terms', 'subscribe', 'custom-checkbox' // <-- Add these types
    ]);

    for (const field of config.formFields) {
      // This is the crucial fix: if the field is disabled, skip it.
      if (!field.enabled) continue;

      if (typesToValidate.has(field.type)) {
        const error = validateField(field, formValues[field.id]);
        if (error) {
          newErrors[field.id] = error;
          isValid = false;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('🚀 Form submission started');
    console.log('🔍 Event target:', event.target);
    console.log('🔍 Current target:', event.currentTarget);

    // --- Validation and Initial State ---
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return false;
    }
    if (!amountValidation.isValid) {
      console.log('❌ Amount validation failed:', amountValidation.message);
      setSubmitError(amountValidation.message);
      return false;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // --- Data Preparation ---
      const urlEncodedData = new URLSearchParams();
      Object.entries(formValues).forEach(([key, value]) => {
        urlEncodedData.append(key, String(value));
      });

      // Add product variant ID and quantity to form submission
      if (variantId) {
        urlEncodedData.append('product_variant_id', variantId);
        urlEncodedData.append('product_quantity', quantity.toString());
        console.log('✅ EasyCod Form: Submitting with variant ID:', variantId, 'quantity:', quantity);
      } else {
        // Check if we're on a product page or if this might be a general inquiry form
        const isProductPage = window.location.pathname.includes('/products/') || 
                             document.querySelector('[data-section-type="product"]') ||
                             document.querySelector('.product') ||
                             document.title.toLowerCase().includes('product');
        
        if (isProductPage) {
          console.warn("⚠️ On product page but could not find variant ID. Using fallback.");
          // For product pages, still try to submit but let backend handle the fallback
          urlEncodedData.append('product_variant_id', '');
          urlEncodedData.append('product_quantity', '1');
        } else {
          console.log("ℹ️ Not on a product page, submitting as general inquiry.");
          // For non-product pages (like general inquiry forms), don't include product data
          // The backend will handle this case with its fallback logic
        }
      }

      const sessionId = sessionStorage.getItem('session_id');
      if (sessionId) {
        urlEncodedData.append('sessionId', sessionId);
      }

      // Cart data removed from form submission - no longer needed

      // --- Fetch Request ---
      // ✅ Always submit to the dedicated proxy endpoint
      const submitUrl = `${window.location.origin}/apps/proxy/submit`;
      
      console.log('📋 Submitting to:', submitUrl);
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlEncodedData.toString(), // Send as a URL-encoded string
      });

      // --- Response Handling ---
      console.log('📋 Response status:', response.status);
      console.log('📋 Response URL:', response.url);
      console.log('📋 Response redirected:', response.redirected);
      
      if (response.ok) {
        console.log('✅ Response OK');
        if (response.redirected) {
          console.log('🔄 Response was redirected to:', response.url);
          window.location.href = response.url;
          return;
        }

        // --- IMPROVED RESPONSE CHECK: Check content type before parsing JSON ---
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        if (isJson) {
          console.log('Response is JSON, parsing...');
          // If the response is JSON, parse it for redirect URL and purchase data
          const result = await response.json();
          console.log('📋 Parsed response:', result);
          if (result.redirectUrl) {
            console.log('🔄 Redirecting to:', result.redirectUrl);
            window.location.href = result.redirectUrl;
            return;
          }
          
          // Track purchase event if data is available
          // Cart-based purchase tracking removed - no longer needed
          
          // Fallback redirect if JSON is valid but contains no redirectUrl
          console.log('⚠️ No redirectUrl in response, using fallback');
          const fallbackUrl = `${window.location.origin}/pages/thank-you`;
          console.log('🔄 Fallback redirect to:', fallbackUrl);
          window.location.href = fallbackUrl;
          return; // Added return here to ensure flow stops after redirect

        } else {
          // If response is not JSON (e.g., HTML, XML, or empty), perform fallback redirect.
          console.log('Response is not JSON. Performing fallback redirect.');
          window.location.href = `${window.location.origin}/pages/thank-you`;
          return;
        }

      } else {
        // --- Response Handling (Error) ---
        console.log('❌ Response not ok:', response.status, response.statusText);
        console.log('❌ Response URL:', response.url);
        console.log('❌ Response redirected:', response.redirected);
        try {
          // Attempt to parse JSON for a specific error message
          const result = await response.json();
          setSubmitError(result.error || 'An error occurred while submitting the form');
        } catch (e) {
          // Fallback for non-JSON or unparsable error response
          setSubmitError('Network error. Please try again.');
        }
      }
    } catch (error: any) {
      // --- Network and other Exception Handling ---
      console.error('❌ Submission error:', error);
      setSubmitError('Network error. Please try again.');
    } finally {
      // --- Final State Update ---
      setIsSubmitting(false);
    }

    // Prevent any default form submission
    return false;
};

  const renderField = (field: FormField) => {
    if (!field.enabled) {
      return null;
    }
    const commonProps = {
      key: field.id,
      error: !!errors[field.id],
      helperText: errors[field.id],
      fullWidth: true,
      margin: 'normal' as const,
    };

    const inputSettings = field.settings as any;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'phone':
      case 'custom-text-input':
      case 'full-name':
      case 'first-name':
      case 'last-name':
      case 'address':
      case 'address2':
      case 'province':
      case 'zip-code':
      case 'order-note': {
        const fieldStyle = field.settings as any;
        return (
          <TextField
            {...commonProps}
            id={field.id}
            name={field.id}
            type={field.type === 'phone' || field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
            multiline={field.type === 'order-note'}
            rows={field.type === 'order-note' ? 4 : 1}
            label={config.formStyle.hideFieldLabels ? '' : fieldStyle.label}
            placeholder={fieldStyle.placeholder}
            required={fieldStyle.required}
            value={formValues[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: `${config.formStyle.borderRadius}px`,
              },
              '& .MuiInputBase-input': {
                color: config.formStyle.textColor,
                fontSize: `${config.formStyle.fontSize}px`,
              },
              '& .MuiInputLabel-root': {
                color: config.formStyle.textColor,
              },
            }}
          />
        );
      }
      // **UPDATED** wilaya field
      case 'wilaya': {
        const options = wilayas;
        const isDisabled = isLoadingLocations;
        return (
            <FormControl {...commonProps} key={field.id} disabled={isDisabled}>
                <InputLabel sx={{ color: inputSettings.textColor }}>{inputSettings.label}</InputLabel>
                <Select
                    value={formValues[field.id] || ''} // This will now store the ID, e.g., "16"
                    label={inputSettings.label}
                    onChange={(e) => {
                      const id = e.target.value as string;
                      const selectedOption = options.find(o => o.id === id);
                      const label = selectedOption ? selectedOption.name : '';

                      // Store both the ID and the human-readable label
                      handleInputChange('wilaya', id);
                      handleInputChange('wilaya_label', label);
                    }}
                    required={inputSettings.required}
                    sx={{
                        backgroundColor: inputSettings.backgroundColor,
                        borderRadius: `${inputSettings.borderRadius}px`,
                        color: inputSettings.textColor,
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: inputSettings.borderColor,
                        },
                        '& .MuiSvgIcon-root': { color: inputSettings.textColor },
                    }}
                >
                    {isLoadingLocations && <MenuItem value=""><em>Loading...</em></MenuItem>}
                    {!isLoadingLocations && options.length === 0 && (
                        <MenuItem value="" disabled>
                            <em>No options found</em>
                        </MenuItem>
                    )}
                    {options.map((option) => (
                        // Use the ID for the value, not the name
                        <MenuItem key={option.id} value={option.id}>
                            {option.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
      }
      // **UPDATED** commune field
      case 'commune': {
        const options = communes;
        const isDisabled = isLoadingLocations || !formValues['wilaya'];
        return (
            <FormControl {...commonProps} key={field.id} disabled={isDisabled}>
                <InputLabel sx={{ color: inputSettings.textColor }}>{inputSettings.label}</InputLabel>
                <Select
                    value={formValues[field.id] || ''} // This will store the commune ID
                    label={inputSettings.label}
                    onChange={(e) => {
                      const id = e.target.value as string;
                      const selectedOption = options.find(o => o.id === id);
                      const label = selectedOption ? selectedOption.name : '';

                      // Store both the ID and the human-readable label
                      handleInputChange('commune', id);
                      handleInputChange('commune_label', label);
                    }}
                    required={inputSettings.required}
                    sx={{
                        backgroundColor: inputSettings.backgroundColor,
                        borderRadius: `${inputSettings.borderRadius}px`,
                        color: inputSettings.textColor,
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: inputSettings.borderColor,
                        },
                        '& .MuiSvgIcon-root': { color: inputSettings.textColor },
                    }}
                >
                    {isLoadingLocations && <MenuItem value=""><em>Loading...</em></MenuItem>}
                    {!isLoadingLocations && options.length === 0 && (
                        <MenuItem value="" disabled>
                            <em>Select a Wilaya first</em>
                        </MenuItem>
                    )}
                    {options.map((option) => (
                        // Use the ID for the value
                        <MenuItem key={option.id} value={option.id}>
                            {option.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
      }
      case 'custom-icon-feature': {
        const s = field.settings as CustomIconFeatureSettings;

        const enabledFeatures = s.features?.filter((feature: IconFeature) => feature && feature.enabled === true) || [];

        if (enabledFeatures.length === 0) {
          return null;
        }

        const TrustBadgeContainer = (
          <Box
            key={field.id}
            sx={{
              my: 4,
              py: 3,
              px: 2,
              backgroundColor: '#FAFBFC',
              borderRadius: '12px',
              border: '1px solid #E5E7EB'
            }}
          >
            {s.title && (
              <Typography
                variant="h6"
                component="h3"
                sx={{
                  textAlign: 'center',
                  mb: s.titlePosition === 'top' ? 3 : 0,
                  mt: s.titlePosition === 'bottom' ? 3 : 0,
                  fontWeight: 600,
                  color: config.formStyle.textColor || '#1F2937',
                  fontSize: '18px'
                }}
              >
                {s.title}
              </Typography>
            )}

            <Box sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'stretch',
              gap: 2,
              flexWrap: 'wrap',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              {enabledFeatures.map((feature: IconFeature, index: number) => (
                <Box
                  key={`feature-${index}`}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 2,
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E1E5E9',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flex: '1 1 120px',
                    minWidth: '120px',
                    maxWidth: '150px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Box sx={{
                    width: 56,
                    height: 56,
                    mb: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0'
                  }}>
                    <img
                      src={feature.imageUrl}
                      alt={feature.caption}
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div style="font-size: 24px;">🛡️</div>`;
                        }
                      }}
                    />
                  </Box>
                  
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: config.formStyle.textColor || '#374151',
                      fontSize: '13px',
                      lineHeight: 1.3,
                      wordBreak: 'break-word'
                    }}
                  >
                    {feature.caption || 'Feature'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        );

        return TrustBadgeContainer;
      }
      case 'textarea': {
        return (
          <TextField
            {...commonProps}
            id={field.id}
            name={field.id}
            multiline
            rows={4}
            label={inputSettings.label}
            placeholder={inputSettings.placeholder}
            required={inputSettings.required}
            value={formValues[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: inputSettings.backgroundColor,
                borderRadius: `${inputSettings.borderRadius}px`,
                '& fieldset': { borderColor: inputSettings.borderColor },
              },
              '& .MuiInputBase-input': {
                color: inputSettings.textColor,
                fontSize: `${inputSettings.fontSize}px`,
              },
              '& .MuiInputLabel-root': { color: inputSettings.textColor },
            }}
          />
        );
      }
      case 'checkbox': {
        return (
          <FormControlLabel
            key={field.id}
            control={
              <Checkbox
                id={field.id}
                name={field.id}
                checked={formValues[field.id] || false}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                sx={{ color: inputSettings.textColor }}
              />
            }
            label={inputSettings.label}
            sx={{ color: inputSettings.textColor }}
          />
        );
      }
      case 'select':
      case 'custom-dropdown': {
        return (
          <FormControl {...commonProps} key={field.id}>
            <InputLabel sx={{ color: inputSettings.textColor }}>
              {inputSettings.label}
            </InputLabel>
            <Select
              id={field.id}
              name={field.id}
              value={formValues[field.id] || ''}
              label={inputSettings.label}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={inputSettings.required}
                sx={{
                backgroundColor: inputSettings.backgroundColor,
                borderRadius: `${inputSettings.borderRadius}px`,
                color: inputSettings.textColor,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: inputSettings.borderColor,
                },
                '& .MuiSvgIcon-root': { color: inputSettings.textColor },
              }}
            >
              {inputSettings.options?.map((option: string, index: number) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }
      case 'header':
      case 'section-header': {
        const headerSettings = field.settings as CustomTextSettings;
        return (
          <Typography
            key={field.id}
            variant={field.type === 'header' ? 'h4' : 'h5'}
            component={field.type === 'header' ? 'h1' : 'h2'}
            sx={{
              textAlign: headerSettings.alignment,
              color: headerSettings.textColor,
              fontSize: `${headerSettings.fontSize}px`,
              fontWeight: headerSettings.fontWeight,
              marginTop: `${(headerSettings as any).marginTop}px`,
              marginBottom: `${(headerSettings as any).marginBottom}px`,
            }}
          >
            {headerSettings.text}
          </Typography>
        );
      }
      case 'summary': {
        // Cart summary removed - no longer needed
        return <Typography key={field.id}>Order summary is no longer available.</Typography>;
      }
      case 'totals-summary': {
        // Cart totals summary removed - no longer needed
        return <Typography key={field.id}>Order totals are no longer available.</Typography>;
      }
      case 'shipping-rates': {
        const shippingSettings = field.settings as ShippingRatesSettings;
        const selectedWilaya = formValues['wilaya'];
        return (
          <FormControl component="fieldset" key={field.id} sx={{ my: 2, width: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {shippingSettings.title || 'Shipping Method'}
            </Typography>
            {!selectedWilaya ? (
              <Typography variant="body2" color="text.secondary">
                {shippingSettings.selectWilayaPrompt || 'Please select a Wilaya to see available shipping options.'}
              </Typography>
            ) : (
              <RadioGroup name="shipping-rate" defaultValue="free-shipping">
                <Box sx={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  p: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <FormControlLabel
                    value="free-shipping"
                    control={<Radio />}
                    label="Standard Shipping"
                  />
                  <Typography fontWeight="bold">
                    {shippingSettings.freeText || 'Free'}
                  </Typography>
                </Box>
              </RadioGroup>
            )}
          </FormControl>
        );
      }
      case 'custom-title':
      case 'custom-text': {
        const textSettings = field.settings as CustomTextSettings;
        return (
          <Typography
            key={field.id}
            variant="h5"
            component="div"
            sx={{
              textAlign: textSettings.alignment || 'center',
              color: textSettings.textColor || config.formStyle.textColor,
              fontSize: `${textSettings.fontSize || 16}px`,
              fontWeight: textSettings.fontWeight || 'normal',
              my: 2,
            }}
          >
            {textSettings.text}
          </Typography>
        );
      }
      case 'custom-image': {
        const imageSettings = field.settings as CustomImageSettings;
        return (
          <Box key={field.id} sx={{ textAlign: 'center', my: 2 }}>
            <img
              src={imageSettings.imageUrl}
              alt="Custom"
              style={{
                width: `${imageSettings.imageSize || 100}%`,
                maxWidth: '100%',
                height: 'auto',
                borderRadius: `${config.formStyle.borderRadius}px`,
                aspectRatio: imageSettings.aspectRatio || 'auto',
              }}
            />
          </Box>
        );
      }
      case 'quantity-selector': {
        const qtySettings = field.settings as QuantitySelectorSettings;
        return (
          <FormControl key={field.id} sx={{ my: 2 }}>
            <Typography variant="body1" sx={{ mb: 1, textAlign: qtySettings.alignment || 'left' }}>
              {qtySettings.label || 'Quantity'}
            </Typography>
            <TextField
              type="number"
              inputProps={{ min: 1, max: 99 }}
              value={formValues[field.id] || 1}
              onChange={(e) => handleInputChange(field.id, parseInt(e.target.value) || 1)}
              sx={{ width: '120px' }}
            />
          </FormControl>
        );
      }
      case 'custom-single-choice': {
        const choiceSettings = field.settings as CustomSingleChoiceSettings;
        const choices = choiceSettings.values ? choiceSettings.values.split(',').map((c: string) => c.trim()) : [];
        return (
          <FormControl component="fieldset" key={field.id} sx={{ my: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>{choiceSettings.label}</Typography>
            <RadioGroup
              value={formValues[field.id] || (choiceSettings.preselectFirst ? choices[0] : '')}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            >
              {choices.map((choice: string) => (
                <FormControlLabel key={choice} value={choice} control={<Radio />} label={choice} />
              ))}
            </RadioGroup>
          </FormControl>
        );
      }
      case 'custom-checkbox': {
        const checkboxSettings = field.settings as CustomCheckboxSettings;
        return (
          <FormControlLabel
            key={field.id}
            control={
              <Checkbox
                checked={formValues[field.id] || false}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
              />
            }
            label={checkboxSettings.checkboxName || checkboxSettings.label}
            sx={{ my: 1 }}
          />
        );
      }
      case 'custom-date-selector': {
        const dateSettings = field.settings as any;
        return (
          <TextField
            {...commonProps}
            key={field.id}
            type="date"
            label={dateSettings.label}
            value={formValues[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiInputBase-input': {
                color: config.formStyle.textColor,
                fontSize: `${config.formStyle.fontSize}px`,
              },
            }}
          />
        );
      }
      case 'subscribe':
      case 'terms': {
        const subscribeSettings = field.settings as any;
        return (
          <FormControlLabel
            key={field.id}
            control={
              <Checkbox
                checked={formValues[field.id] || subscribeSettings.preselect || false}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                required={subscribeSettings.required}
              />
            }
            label={subscribeSettings.label}
            sx={{ my: 1, color: config.formStyle.textColor }}
          />
        );
      }
      case 'discount-codes': {
        const discountSettings = field.settings as DiscountCodesSettings;
        return (
          <Box key={field.id} sx={{ my: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {discountSettings.discountsLineText || 'Discount'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label={discountSettings.discountCodeFieldLabel || 'Discount code'}
                placeholder="Enter discount code"
                value={formValues[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                sx={{
                  backgroundColor: discountSettings.applyButtonBackgroundColor || '#1976d2',
                }}
              >
                {discountSettings.applyButtonText || 'Apply'}
              </Button>
            </Box>
          </Box>
        );
      }
      default:
        if (field.type === 'logistics-delivery') {
            return null;
        }
        console.warn(`Unsupported field type encountered: "${field.type}". This field will not be rendered.`);
        return null;
    }
  };


  const submitButtonField = config.formFields.find((f) => f.type === 'submit');
  const submitButtonSettings = submitButtonField?.settings as ButtonSettings | undefined;

  const [isPopupOpen, setIsPopupOpen] = useState(false);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  const FormMarkup = (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      action="javascript:void(0);"
      sx={{
        width: '100%',
        p: 3,
        backgroundColor: config.formStyle.backgroundColor,
        borderRadius: `${config.formStyle.borderRadius}px`,
        border: `${config.formStyle.borderWidth}px solid ${config.formStyle.borderColor}`,
        boxShadow: config.formStyle.shadow ? `0 ${config.formStyle.shadow * 2}px ${config.formStyle.shadow * 4}px rgba(0,0,0,0.1)` : 'none',
        color: config.formStyle.textColor,
        direction: config.formStyle.enableRTL ? 'rtl' : 'ltr',
        fontSize: `${config.formStyle.fontSize}px`,
        '& .MuiTextField-root': {
          '& .MuiOutlinedInput-root': {
            borderRadius: `${config.formStyle.borderRadius}px`,
            backgroundColor: 'rgba(255,255,255,0.9)',
          },
          '& .MuiInputBase-input': {
            color: config.formStyle.textColor,
            fontSize: `${config.formStyle.fontSize}px`,
          },
          '& .MuiInputLabel-root': {
            color: config.formStyle.textColor,
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: config.formStyle.layout === 'double' ? 'repeat(2, 1fr)' : '1fr',
          gap: '0 16px'
        }}
      >
        {/* Hidden field to track form submission method */}
        <input type="hidden" name="submission_method" value="javascript" />
        
        {config.formFields.filter((f) => f.type !== 'submit').map(field => {
          const s = field.settings as any;
          const isFullWidth = ['summary', 'totals-summary', 'shipping-rates', 'section-header', 'header', 'custom-icon-feature', 'textarea', 'order-note'].includes(field.type) || s.layoutOverride === 'single';
          return (
            <Box key={field.id} sx={{ gridColumn: (config.formStyle.layout === 'double' && !isFullWidth) ? 'span 1' : '1 / -1' }}>
              {renderField(field)}
            </Box>
          );
        })}
      </Box>

      {!amountValidation.isValid && <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>{amountValidation.message}</Alert>}
      {submitError && <Alert severity="error" sx={{ mt: 2 }}>{submitError}</Alert>}

      {submitButtonField?.enabled && submitButtonSettings && amountValidation.isValid && (
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isSubmitting}
          className={submitButtonSettings?.animation ? `btn-anim-${submitButtonSettings.animation}` : ''}
          sx={{
            mt: 3,
            backgroundColor: submitButtonSettings?.backgroundColor || '#1976d2',
            color: submitButtonSettings?.textColor || '#fff',
            borderRadius: `${submitButtonSettings?.borderRadius ?? 4}px`,
            fontSize: `${submitButtonSettings?.fontSize ?? 16}px`,
            fontWeight: (submitButtonSettings as any)?.fontWeight || '500',
            padding: (submitButtonSettings as any)?.padding || '10px 20px',
            border: `${submitButtonSettings.borderWidth}px solid ${submitButtonSettings.borderColor}`,
            boxShadow: submitButtonSettings.shadow,
            '&:hover': {
              backgroundColor:
                (submitButtonSettings as any)?.hoverBackgroundColor || submitButtonSettings?.backgroundColor,
              filter: 'brightness(0.9)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (
            submitButtonSettings?.buttonText 
              ? submitButtonSettings.buttonText.replace('{order_total}', '0.00')
              : 'Submit Order'
          )}
        </Button>
      )}
    </Box>
  );

if (config.formStyle.mode === 'popup') {
    const pbs = config.formStyle.popupButtonSettings || {
      buttonText: 'Open Form',
      backgroundColor: '#6366f1',
      textColor: '#ffffff',
      fontSize: 16,
      borderRadius: 12,
      borderWidth: 0,
      borderColor: '#6366f1',
      shadow: 4,
      animation: 'none',
      placement: 'center',
      followUser: false,
    };

    const animClass = pbs.animation && pbs.animation !== 'none' ? `btn-anim-${pbs.animation}` : '';

    const getPlacement = () => {
      switch (pbs.placement) {
          case 'left': return 'flex-start';
          case 'right': return 'flex-end';
          default: return 'center';
      }
    };

    const buttonContainerSx = {
      display: 'flex',
      justifyContent: getPlacement(),
      alignItems: 'center',
      ...(pbs.followUser
          ? {
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
              zIndex: 9998,
            }
          : {
              minHeight: '60vh',
              padding: 3,
            }),
    };
    
    return (
      <>
        <MuiBox sx={buttonContainerSx}>
          <MuiButton
            variant="contained"
            onClick={() => setIsPopupOpen(true)}
            className={animClass}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: `${pbs.fontSize}px`,
              fontWeight: 600,
              borderRadius: `${pbs.borderRadius}px`,
              textTransform: 'none',
              backgroundColor: pbs.backgroundColor,
              color: pbs.textColor,
              border: pbs.borderWidth ? `${pbs.borderWidth}px solid ${pbs.borderColor}` : 'none',
              boxShadow: `0 4px 12px rgba(99, 102, 241, ${pbs.shadow / 10})`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: pbs.backgroundColor,
                filter: 'brightness(0.9)',
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 25px rgba(99, 102, 241, ${pbs.shadow / 8})`,
              },
              '&:active': {
                transform: 'translateY(0px)',
              }
            }}
          >
            <MuiStack direction="row" spacing={1} alignItems="center">
              <span>{pbs.buttonText}</span>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                ↗
              </div>
            </MuiStack>
          </MuiButton>
        </MuiBox>
        
        {isPopupOpen && (
             <MuiBox 
             sx={{ 
                  position: 'fixed', 
                  top: 0, 
                  left: 0, 
                  width: '100vw', 
                  height: '100vh', 
                  backgroundColor: 'rgba(0, 0, 0, 0.6)', 
                  backdropFilter: 'blur(4px)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  zIndex: 9999,
                  animation: 'fadeIn 0.3s ease-out'
             }}
             onClick={() => setIsPopupOpen(false)}
           >
             <MuiBox 
               sx={{ 
                   position: 'relative', 
                   maxWidth: 600, 
                   width: '90%', 
                   maxHeight: '90vh', 
                   overflowY: 'auto',
                   borderRadius: '16px',
                   boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
                   animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                   transform: 'translateY(0)',
               }} 
               onClick={(e) => e.stopPropagation()}
             >
               {FormMarkup}
               {!config.formStyle.hideCloseButton && (
                 <IconButton 
                   onClick={() => setIsPopupOpen(false)} 
                   sx={{ 
                       position: 'absolute', 
                       top: 12, 
                       right: 12, 
                       width: 40,
                       height: 40,
                       backgroundColor: 'rgba(0,0,0,0.8)',
                       color: 'white',
                       '&:hover': {
                         backgroundColor: 'rgba(0,0,0,0.9)',
                         transform: 'scale(1.1)'
                       },
                       transition: 'all 0.2s ease',
                       zIndex: 10
                     }}
                 >
                   <Close fontSize="small" />
                 </IconButton>
               )}
             </MuiBox>
           </MuiBox>
        )}
        
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(50px) scale(0.95);
              }
              to { 
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}
        </style>
      </>
    );
}

  // Fallback for embedded mode
  return FormMarkup;
};

// ✅ IMPROVED DOMContentLoaded listener at the end of the file
document.addEventListener('DOMContentLoaded', () => {
  // Handle external script loading errors gracefully
  window.addEventListener('error', function(e) {
    if (e.target && (e.target as HTMLElement).tagName === 'SCRIPT') {
      const script = e.target as HTMLScriptElement;
      if (script.src && script.src.includes('hillteck.com')) {
        console.warn('⚠️ External script from hillteck.com failed to load, but this is not critical for form functionality');
        e.preventDefault();
        return false;
      }
    }
  });

  // Handle unhandled promise rejections from external scripts
  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && typeof e.reason === 'string' && e.reason.includes('hillteck.com')) {
      console.warn('⚠️ External script promise rejection from hillteck.com, but this is not critical for form functionality');
      e.preventDefault();
      return false;
    }
  });

  // Suppress cookie domain rejection warnings (these are Shopify internal issues)
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    if (message.includes('Cookie') && message.includes('rejected for invalid domain')) {
      // Suppress Shopify cookie domain warnings as they're not actionable
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  const allFormContainers = document.querySelectorAll('.easycod-form-container');

  if (allFormContainers.length === 0) {
    console.warn("EasyCod Form: No form containers with class '.easycod-form-container' found.");
    return;
  }

  // Track initialized containers to prevent duplicates
  const initializedContainers = new Set();

  allFormContainers.forEach((container, index) => {
    try {
      // Skip if already initialized
      if (initializedContainers.has(container)) {
        console.log(`⏭️ Skipping already initialized container ${index}`);
        return;
      }

      let sectionId = (container as HTMLElement).dataset.sectionId;
      let configElement;

      if (sectionId) {
        configElement = document.getElementById(`easycod-form-config-${sectionId}`);
      }

      // Fallback: If no sectionId or no corresponding config script, find the first available one.
      // This makes the form more resilient if the theme has extra containers.
      if (!configElement || !configElement.textContent) {
        console.warn(`⚠️ Config for section '${sectionId}' not found. Searching for a fallback.`);
        configElement = document.querySelector('script[id^="easycod-form-config-"]');
        if (configElement) {
          console.log(`✅ Using fallback config script: ${configElement.id}`);
        }
      }

      if (!configElement || !configElement.textContent) {
        throw new Error(`No configuration data script found for container ${index}.`);
      }

      const config = JSON.parse(configElement.textContent);
      
      // Ensure appUrl is set properly
      if (!config.appUrl) {
        const currentDomain = window.location.hostname;
        config.appUrl = `https://${currentDomain}`;
        console.warn('⚠️ appUrl missing from config, using fallback:', config.appUrl);
      }

      const root = ReactDOM.createRoot(container);

      root.render(
        <React.StrictMode>
          <FormApp config={config} />
        </React.StrictMode>
      );
      
      // Mark as initialized
      initializedContainers.add(container);
      console.log(`✅ EasyCod Form successfully initialized for container ${index} (Section: ${sectionId || 'N/A'}).`);

    } catch (error) {
      console.error(`❌ Failed to initialize EasyCod form in container ${index}:`, error);
      container.innerHTML = '<p style="color: red; text-align: center;">Error: Could not load the form.</p>';
    }
  });
});