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
  Radio,
} from '@mui/material';

// Enhanced PixelSettings interface
interface PixelSettings {
  facebookPixelId?: string;
  googlePixelId?: string;
  tiktokPixelId?: string;
  snapchatPixelId?: string;
  pinterestPixelId?: string;
  sharechatPixelId?: string;
  taboolaPixelId?: string;
  kwaiPixelId?: string;
  sendFbAddToCart?: boolean;
  sendFbAddPaymentInfo?: boolean;
  fbPurchaseEvent?: string; // 'Purchase' or 'Custom'
  sendPinterestAddToCart?: boolean;
  disableAllEvents?: boolean;
  trackViewContent?: boolean;
  trackSearch?: boolean;
  trackLead?: boolean;
  customEventNames?: {
    addToCart?: string;
    initiateCheckout?: string;
    addPaymentInfo?: string;
    purchase?: string;
  };
}

// Add visibility settings interface
interface VisibilitySettings {
  hideAddToCart?: boolean;
  hideBuyNow?: boolean;
  minimumAmount?: string;
  maximumAmount?: string;
}

// Add type declarations for window pixel functions
declare global {
  interface Window {
    fbq: any;
    gtag: any;
    ttq: any;
    pintrk: any;
    snaptr: any; // For Snapchat
    _tfa: any; // For Taboola
    scp: any; // For ShareChat
    kwp: any; // For Kwai
  }
}

// Types for better type safety
interface CartItem {
  variant_id: number;
  quantity: number;
  price: number;
  product_title: string;
  variant_title: string;
  image?: string; // Optional image property for cart items
}

interface Cart {
  items: CartItem[];
  total_price: number;
  item_count: number;
  currency: string;
}

// Rich styling interfaces
interface FormStyle {
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  shadow: string;
  padding: number;
  maxWidth: number;
}

interface ButtonSettings {
  text?: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
  fontWeight: string;
  padding: string;
  hoverBackgroundColor: string;
  animation: string;
  hideIfCartTotalLessThan?: number;
  hideIfCartTotalGreaterThan?: number;
}

interface CustomTextSettings {
  text: string;
  fontSize: number;
  fontWeight: string;
  textColor: string;
  alignment: 'left' | 'center' | 'right';
  marginTop: number;
  marginBottom: number;
}

interface InputFieldSettings {
  label: string;
  placeholder: string;
  required: boolean;
  validation: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  fontSize: number;
  options?: string[]; // For select/custom-dropdown
}

interface CustomImageSettings {
  imageUrl: string;
  altText: string;
  width: number;
  height: number;
  borderRadius: number;
  alignment: 'left' | 'center' | 'right';
  marginTop: number;
  marginBottom: number;
}

interface WhatsAppSettings {
  phoneNumber: string;
  message: string;
  buttonText: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
}

interface SummarySettings {
  title: string;
  showItemDetails: boolean;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
}

// Union type for all possible settings
type AllFieldSettings =
  | InputFieldSettings
  | CustomTextSettings
  | CustomImageSettings
  | WhatsAppSettings
  | SummarySettings
  | ButtonSettings;

interface FormField {
  id: string;
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'textarea'
    | 'checkbox'
    | 'select'
    | 'header'
    | 'section-header'
    | 'summary'
    | 'totals-summary'
    | 'shipping-rates'
    | 'custom-dropdown'
    | 'custom-image'
    | 'custom-whatsapp-button'
    | 'submit';
  settings: AllFieldSettings;
}

// NEW: Interface for customer data pre-filling
interface CustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  defaultAddress?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
  };
}

interface Config {
  formFields: FormField[];
  formStyle: FormStyle;
  submitUrl: string;
  redirectUrl?: string;
  pixelSettings?: PixelSettings;
  visibilitySettings?: VisibilitySettings;
  customerData?: CustomerData; // NEW: Added customer data to config
}

// Read the configuration from the page
const configElement = document.getElementById('__EASYCOD_FORM_CONFIG__');
if (!configElement) {
  throw new Error('Configuration element not found');
}
const config: Config = JSON.parse(configElement.textContent || '{}');

// Enhanced pixel tracking with better error handling and logging
const trackEvent = (eventName: string, eventData: any = {}) => {
  if (!config.pixelSettings || config.pixelSettings.disableAllEvents) {
    console.log('🚫 Pixel tracking disabled globally');
    return;
  }

  const { pixelSettings } = config;
  console.log(`🎯 Tracking Event: ${eventName}`, eventData);

  try {
    // Facebook Pixel Events
    if (pixelSettings.facebookPixelId && typeof window.fbq !== 'undefined') {
      try {
        switch (eventName) {
          case 'InitiateCheckout':
            window.fbq('track', 'InitiateCheckout', {
              content_ids: eventData.content_ids,
              contents: eventData.contents,
              currency: eventData.currency,
              value: eventData.value,
              num_items: eventData.num_items,
            });
            console.log('✅ Facebook InitiateCheckout sent');
            break;

          case 'AddPaymentInfo':
            if (pixelSettings.sendFbAddPaymentInfo) {
              window.fbq('track', 'AddPaymentInfo', {
                content_ids: eventData.content_ids,
                contents: eventData.contents,
                currency: eventData.currency,
                value: eventData.value,
              });
              console.log('✅ Facebook AddPaymentInfo sent');
            }
            break;

          case 'Purchase':
            const fbEvent = pixelSettings.fbPurchaseEvent === 'Custom' ? 'CustomPurchase' : 'Purchase';
            window.fbq('track', fbEvent, {
              content_ids: eventData.content_ids,
              contents: eventData.contents,
              currency: eventData.currency,
              value: eventData.value,
              num_items: eventData.num_items,
            });
            console.log(`✅ Facebook ${fbEvent} sent`);
            break;

          case 'AddToCart':
            if (pixelSettings.sendFbAddToCart) {
              window.fbq('track', 'AddToCart', {
                content_ids: eventData.content_ids,
                contents: eventData.contents,
                currency: eventData.currency,
                value: eventData.value,
              });
              console.log('✅ Facebook AddToCart sent');
            }
            break;
        }
      } catch (fbError) {
        console.error('❌ Facebook Pixel Error:', fbError);
      }
    }

    // Google Analytics Events
    if (pixelSettings.googlePixelId && typeof window.gtag !== 'undefined') {
      try {
        const gaItems = eventData.contents?.map((item: any) => ({
          item_id: item.id,
          item_name: item.name || `Product ${item.id}`,
          quantity: item.quantity,
          price: item.item_price,
        }));

        switch (eventName) {
          case 'InitiateCheckout':
            window.gtag('event', 'begin_checkout', {
              transaction_id: eventData.transaction_id,
              value: eventData.value,
              currency: eventData.currency,
              items: gaItems,
            });
            console.log('✅ Google Analytics begin_checkout sent');
            break;

          case 'AddPaymentInfo':
            window.gtag('event', 'add_payment_info', {
              currency: eventData.currency,
              value: eventData.value,
              items: gaItems,
            });
            console.log('✅ Google Analytics add_payment_info sent');
            break;

          case 'Purchase':
            window.gtag('event', 'purchase', {
              transaction_id: eventData.transaction_id,
              value: eventData.value,
              currency: eventData.currency,
              items: gaItems,
            });
            console.log('✅ Google Analytics purchase sent');
            break;

          case 'AddToCart':
            window.gtag('event', 'add_to_cart', {
              currency: eventData.currency,
              value: eventData.value,
              items: gaItems,
            });
            console.log('✅ Google Analytics add_to_cart sent');
            break;
        }
      } catch (gaError) {
        console.error('❌ Google Analytics Error:', gaError);
      }
    }

    // TikTok Pixel Events
    if (pixelSettings.tiktokPixelId && typeof window.ttq !== 'undefined') {
      try {
        switch (eventName) {
          case 'InitiateCheckout':
            window.ttq.track('InitiateCheckout', {
              contents: eventData.contents,
              currency: eventData.currency,
              value: eventData.value,
            });
            console.log('✅ TikTok InitiateCheckout sent');
            break;
          case 'AddPaymentInfo':
            window.ttq.track('AddPaymentInfo', {
              contents: eventData.contents,
              currency: eventData.currency,
              value: eventData.value,
            });
            console.log('✅ TikTok AddPaymentInfo sent');
            break;
          case 'Purchase':
            window.ttq.track('PlaceAnOrder', {
              contents: eventData.contents,
              currency: eventData.currency,
              value: eventData.value,
            });
            console.log('✅ TikTok PlaceAnOrder sent');
            break;
          case 'AddToCart':
            window.ttq.track('AddToCart', {
              contents: eventData.contents,
              currency: eventData.currency,
              value: eventData.value,
            });
            console.log('✅ TikTok AddToCart sent');
            break;
        }
      } catch (ttError) {
        console.error('❌ TikTok Pixel Error:', ttError);
      }
    }

    // Pinterest Events
    if (pixelSettings.pinterestPixelId && typeof window.pintrk !== 'undefined') {
      try {
        switch (eventName) {
          case 'InitiateCheckout':
            window.pintrk('track', 'checkout', {
              value: eventData.value,
              currency: eventData.currency,
              line_items: eventData.contents,
              event_id: `checkout_${Date.now()}`,
            });
            console.log('✅ Pinterest checkout sent');
            break;
          case 'AddPaymentInfo':
            window.pintrk('track', 'checkout', {
              value: eventData.value,
              currency: eventData.currency,
              line_items: eventData.contents,
              event_id: `payment_info_${Date.now()}`,
            });
            console.log('✅ Pinterest payment_info sent');
            break;
          case 'Purchase':
            window.pintrk('track', 'checkout', {
              value: eventData.value,
              currency: eventData.currency,
              order_id: eventData.transaction_id,
              line_items: eventData.contents,
              event_id: `purchase_${Date.now()}`,
            });
            console.log('✅ Pinterest purchase sent');
            break;
          case 'AddToCart':
            if (pixelSettings.sendPinterestAddToCart) {
              window.pintrk('track', 'addtocart', {
                value: eventData.value,
                currency: eventData.currency,
                line_items: eventData.contents,
                event_id: `addtocart_${Date.now()}`,
              });
              console.log('✅ Pinterest addtocart sent');
            }
            break;
        }
      } catch (pinterestError) {
        console.error('❌ Pinterest Pixel Error:', pinterestError);
      }
    }

    // Snapchat Events
    if (pixelSettings.snapchatPixelId && typeof window.snaptr !== 'undefined') {
      try {
        switch (eventName) {
          case 'InitiateCheckout':
            window.snaptr('track', 'START_CHECKOUT', {
              currency: eventData.currency,
              price: eventData.value,
            });
            console.log('✅ Snapchat START_CHECKOUT sent');
            break;
          case 'AddPaymentInfo':
            window.snaptr('track', 'ADD_BILLING', {
              currency: eventData.currency,
              price: eventData.value,
            });
            console.log('✅ Snapchat ADD_BILLING sent');
            break;
          case 'Purchase':
            window.snaptr('track', 'PURCHASE', {
              currency: eventData.currency,
              price: eventData.value,
              transaction_id: eventData.transaction_id,
            });
            console.log('✅ Snapchat PURCHASE sent');
            break;
          case 'AddToCart':
            window.snaptr('track', 'ADD_CART', {
              currency: eventData.currency,
              price: eventData.value,
            });
            console.log('✅ Snapchat ADD_CART sent');
            break;
        }
      } catch (snapchatError) {
        console.error('❌ Snapchat Pixel Error:', snapchatError);
      }
    }

    // Taboola Events
    if (pixelSettings.taboolaPixelId && typeof window._tfa !== 'undefined') {
      try {
        switch (eventName) {
          case 'InitiateCheckout':
            window._tfa.push({ notify: 'event', name: 'start_checkout', id: pixelSettings.taboolaPixelId, revenue: eventData.value, currency: eventData.currency });
            console.log('✅ Taboola start_checkout sent');
            break;
          case 'AddPaymentInfo':
            window._tfa.push({ notify: 'event', name: 'add_payment_info', id: pixelSettings.taboolaPixelId, revenue: eventData.value, currency: eventData.currency });
            console.log('✅ Taboola add_payment_info sent');
            break;
          case 'Purchase':
            window._tfa.push({ notify: 'event', name: 'make_purchase', id: pixelSettings.taboolaPixelId, revenue: eventData.value, currency: eventData.currency, order_id: eventData.transaction_id });
            console.log('✅ Taboola make_purchase sent');
            break;
          case 'AddToCart':
            window._tfa.push({ notify: 'event', name: 'add_to_cart', id: pixelSettings.taboolaPixelId, revenue: eventData.value, currency: eventData.currency });
            console.log('✅ Taboola add_to_cart sent');
            break;
        }
      } catch (taboolaError) {
        console.error('❌ Taboola Pixel Error:', taboolaError);
      }
    }

    // ShareChat Events
    if (pixelSettings.sharechatPixelId && typeof window.scp !== 'undefined') {
      try {
        switch (eventName) {
          case 'InitiateCheckout':
            window.scp.track('initiate_checkout', { value: eventData.value, currency: eventData.currency, content_ids: eventData.content_ids });
            console.log('✅ ShareChat initiate_checkout sent');
            break;
          case 'AddPaymentInfo':
            window.scp.track('add_payment_info', { value: eventData.value, currency: eventData.currency, content_ids: eventData.content_ids });
            console.log('✅ ShareChat add_payment_info sent');
            break;
          case 'Purchase':
            window.scp.track('purchase', { value: eventData.value, currency: eventData.currency, content_ids: eventData.content_ids, transaction_id: eventData.transaction_id });
            console.log('✅ ShareChat purchase sent');
            break;
          case 'AddToCart':
            window.scp.track('add_to_cart', { value: eventData.value, currency: eventData.currency, content_ids: eventData.content_ids });
            console.log('✅ ShareChat add_to_cart sent');
            break;
        }
      } catch (sharechatError) {
        console.error('❌ ShareChat Pixel Error:', sharechatError);
      }
    }

    // Kwai Events
    if (pixelSettings.kwaiPixelId && typeof window.kwp !== 'undefined') {
      try {
        switch (eventName) {
          case 'InitiateCheckout':
            window.kwp.track('initiate_checkout', { value: eventData.value, currency: eventData.currency, content_ids: eventData.content_ids });
            console.log('✅ Kwai initiate_checkout sent');
            break;
          case 'AddPaymentInfo':
            window.kwp.track('add_payment_info', { value: eventData.value, currency: eventData.currency, content_ids: eventData.content_ids });
            console.log('✅ Kwai add_payment_info sent');
            break;
          case 'Purchase':
            window.kwp.track('purchase', { value: eventData.value, currency: eventData.currency, content_ids: eventData.content_ids, transaction_id: eventData.transaction_id });
            console.log('✅ Kwai purchase sent');
            break;
          case 'AddToCart':
            window.kwp.track('add_to_cart', { value: eventData.value, currency: eventData.currency, content_ids: eventData.content_ids });
            console.log('✅ Kwai add_to_cart sent');
            break;
        }
      } catch (kwaiError) {
        console.error('❌ Kwai Pixel Error:', kwaiError);
      }
    }
  } catch (error) {
    console.error('❌ Pixel Tracking Error:', error);
  }
};

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
}, []);

const useCartTracking = () => {
  const [hasTrackedInitialCheckout, setHasTrackedInitialCheckout] = useState(false);

  const trackCartEvents = useCallback((cart: Cart, prevCart: Cart | null) => {
    if (!cart || cart.item_count === 0) return;

    const eventData = {
      content_ids: cart.items.map((item) => item.variant_id.toString()),
      contents: cart.items.map((item) => ({
        id: item.variant_id.toString(),
        quantity: item.quantity,
        item_price: item.price / 100,
        name: item.product_title,
      })),
      currency: cart.currency,
      value: cart.total_price / 100,
      num_items: cart.item_count,
    };

    if (!hasTrackedInitialCheckout) {
      trackEvent('InitiateCheckout', eventData);
      setHasTrackedInitialCheckout(true);
      console.log('🎯 InitiateCheckout tracked');
      return;
    }

    if (prevCart && prevCart.item_count > 0) {
      const prevTotal = prevCart.total_price;
      const currentTotal = cart.total_price;
      const prevItemCount = prevCart.item_count;
      const currentItemCount = cart.item_count;

      if (currentTotal > prevTotal || currentItemCount > prevItemCount) {
        trackEvent('AddToCart', eventData);
        console.log('🎯 AddToCart tracked due to cart change');
      }
    }
  }, [hasTrackedInitialCheckout]);

  return trackCartEvents;
};

// Add amount validation function
const validateCartAmount = (cart: Cart | null, visibilitySettings?: VisibilitySettings) => {
  if (!cart || !visibilitySettings) return { isValid: true, message: '' };

  const minimumAmount = parseFloat(visibilitySettings.minimumAmount || '0');
  const maximumAmount = parseFloat(visibilitySettings.maximumAmount || 'Infinity');
  const cartTotal = cart.total_price / 100;
  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: cart.currency,
  });

  if (minimumAmount > 0 && cartTotal < minimumAmount) {
    return {
      isValid: false,
      message: `Minimum order amount is ${currencyFormatter.format(minimumAmount)}. Your cart total is ${currencyFormatter.format(cartTotal)}.`,
    };
  }

  if (maximumAmount > 0 && cartTotal > maximumAmount) {
    return {
      isValid: false,
      message: `Maximum order amount is ${currencyFormatter.format(maximumAmount)}. Your cart total is ${currencyFormatter.format(cartTotal)}.`,
    };
  }

  return { isValid: true, message: '' };
};


function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}


// Main App Component with optimizations
const FormApp = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [prevCart, setPrevCart] = useState<Cart | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [amountValidation, setAmountValidation] = useState({ isValid: true, message: '' });

  const trackCartEvents = useCartTracking();

  // NEW: Initialize form with customer data if available
  useEffect(() => {
    if (config.customerData && config.customerData.defaultAddress) {
      const address = config.customerData.defaultAddress;
      const prefillData: Record<string, any> = {
        firstName: config.customerData.firstName || address.firstName,
        lastName: config.customerData.lastName || address.lastName,
        email: config.customerData.email,
        phone: config.customerData.phone || address.phone,
        address: address.address1,
        address2: address.address2,
        city: address.city,
        province: address.province,
        'zip-code': address.zip,
      };

      // Clean up any keys that might have undefined values
      Object.keys(prefillData).forEach(
        (key) => (prefillData[key] === undefined || prefillData[key] === null) && delete prefillData[key],
      );

      // Only prefill if user hasn't started typing
      if (Object.keys(formValues).length === 0) {
        setFormValues(prefillData);
      }
    }
  }, [config.customerData]); // Dependency on customerData


  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await fetch('/cart.js');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const cartData: Cart = await response.json();

        // Validate cart amount
        const validation = validateCartAmount(cartData, config.visibilitySettings);
        setAmountValidation(validation);

        // Track cart events
        trackCartEvents(cartData, prevCart);

        setPrevCart(cart); // Update previous cart
        setCart(cartData);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Error fetching cart:', error);
        setIsLoading(false);
      }
    };

    fetchCart();
  }, [config.visibilitySettings, prevCart, cart, trackCartEvents]); // Dependencies updated for correctness

  // Add Tracking to Form Interactions
  useEffect(() => {
    let abandonmentTimer: ReturnType<typeof setTimeout>;

    const trackAbandonment = () => {
      if (cart && cart.item_count > 0) {
        const sessionId = sessionStorage.getItem('session_id') || generateSessionId();
        sessionStorage.setItem('session_id', sessionId);

        // Track abandoned cart after 5 minutes of inactivity
        abandonmentTimer = setTimeout(() => {
          fetch('/apps/proxy/track-abandonment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              cartData: cart,
              formData: formValues,
              customerEmail: formValues.email,
              customerPhone: formValues.phone,
              customerName: `${formValues.firstName || ''} ${formValues.lastName || ''}`.trim(),
            })
          }).catch(console.error);
        }, 5 * 60 * 1000); // 5 minutes
      }
    };

    const resetTimer = () => {
      if (abandonmentTimer) {
        clearTimeout(abandonmentTimer);
      }
      trackAbandonment();
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    trackAbandonment();

    return () => {
      if (abandonmentTimer) {
        clearTimeout(abandonmentTimer);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [cart, formValues]);


  const handleInputChange = useCallback(
    (fieldId: string, value: any) => {
      setFormValues((prev) => ({ ...prev, [fieldId]: value }));
      if (errors[fieldId]) {
        setErrors((prev) => ({ ...prev, [fieldId]: '' }));
      }

      if (cart && cart.item_count > 0 && value && String(value).length > 2) {
        const eventData = {
          content_ids: cart.items.map((item) => item.variant_id.toString()),
          contents: cart.items.map((item) => ({
            id: item.variant_id.toString(),
            quantity: item.quantity,
            item_price: item.price / 100,
            name: item.product_title,
          })),
          currency: cart.currency,
          value: cart.total_price / 100,
          fieldName: fieldId,
        };
        trackFormInteraction('text', eventData);
      }
    },
    [cart, errors, trackFormInteraction],
  );

  const validateField = (field: FormField, value: any): string => {
    const settings = field.settings as InputFieldSettings;
    if (settings.required && (!value || value === '')) {
      return `${settings.label} is required`;
    }

    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (field.type === 'tel' && value) {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      if (!phoneRegex.test(value)) {
        return 'Please enter a valid phone number';
      }
    }
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    config.formFields.forEach((field) => {
      if (['header', 'section-header', 'summary', 'totals-summary', 'shipping-rates', 'custom-image', 'custom-whatsapp-button', 'submit'].includes(field.type)) {
        return;
      }
      const error = validateField(field, formValues[field.id]);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    // Check amount validation before submitting
    if (!amountValidation.isValid) {
      setSubmitError(amountValidation.message);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      Object.entries(formValues).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      if (cart) {
        const lineItems = cart.items.map((item) => ({
          variantId: `gid://shopify/ProductVariant/${item.variant_id}`,
          quantity: item.quantity,
        }));
        formData.append('lineItems', JSON.stringify(lineItems));
        formData.append('cartData', JSON.stringify(cart));
      }

      const response = await fetch(config.submitUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.purchaseData && cart) {
          const purchaseEventData = {
            transaction_id: result.orderId,
            content_ids: cart.items.map((item) => item.variant_id.toString()),
            contents: cart.items.map((item) => ({
              id: item.variant_id.toString(),
              quantity: item.quantity,
              item_price: item.price / 100,
              name: item.product_title,
            })),
            currency: result.purchaseData.currency,
            value: result.purchaseData.value,
            num_items: cart.item_count,
          };
          trackEvent('Purchase', purchaseEventData);
          console.log('🎉 Purchase event tracked successfully');
        }

        setTimeout(() => {
          if (config.redirectUrl) {
            window.top!.location.href = config.redirectUrl;
          }
        }, 1000);
      } else {
        setSubmitError(result.error || 'An error occurred while submitting the form');
      }
    } catch (error) {
      console.error('❌ Submission error:', error);
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      key: field.id,
      error: !!errors[field.id],
      helperText: errors[field.id],
      fullWidth: true,
      margin: 'normal' as const,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel': {
        const inputSettings = field.settings as InputFieldSettings;
        return (
          <TextField
            {...commonProps}
            id={field.id}
            name={field.id}
            type={field.type}
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
                '&:hover fieldset': { borderColor: inputSettings.borderColor },
                '&.Mui-focused fieldset': { borderColor: inputSettings.borderColor },
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
      case 'textarea': {
        const inputSettings = field.settings as InputFieldSettings;
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
        const inputSettings = field.settings as InputFieldSettings;
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
        const inputSettings = field.settings as InputFieldSettings;
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
              {inputSettings.options?.map((option, index) => (
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
              marginTop: `${headerSettings.marginTop}px`,
              marginBottom: `${headerSettings.marginBottom}px`,
            }}
          >
            {headerSettings.text}
          </Typography>
        );
      }
      case 'custom-whatsapp-button': {
        const whatsAppSettings = field.settings as WhatsAppSettings;
        const whatsappUrl = `https://wa.me/${whatsAppSettings.phoneNumber}?text=${encodeURIComponent(whatsAppSettings.message || 'Hello!')}`;
        return (
          <Box key={field.id} sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                backgroundColor: whatsAppSettings.backgroundColor,
                color: whatsAppSettings.textColor,
                borderRadius: `${whatsAppSettings.borderRadius}px`,
                fontSize: `${whatsAppSettings.fontSize}px`,
                '&:hover': {
                  backgroundColor: whatsAppSettings.backgroundColor,
                  filter: 'brightness(0.9)',
                },
              }}
            >
              💬 {whatsAppSettings.buttonText}
            </Button>
          </Box>
        );
      }
      case 'summary': {
        const summarySettings = field.settings as SummarySettings;
        if (!cart || cart.item_count === 0) {
          return <Typography key={field.id}>Your cart is empty.</Typography>;
        }
        return (
          <Card
            key={field.id}
            sx={{
              mb: 2,
              backgroundColor: summarySettings.backgroundColor,
              color: summarySettings.textColor,
              borderRadius: `${summarySettings.borderRadius}px`,
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontSize: `${summarySettings.fontSize}px`, mb: 2 }}>
                {summarySettings.title}
              </Typography>
              {summarySettings.showItemDetails &&
                cart.items.map((item, index) => (
                  <React.Fragment key={item.variant_id}>
                    <Box display="flex" alignItems="center" my={1.5}>
                      {item.image && (
                        <CardMedia
                          component="img"
                          sx={{ width: 64, height: 64, borderRadius: 1, mr: 2 }}
                          image={item.image}
                          alt={item.product_title}
                        />
                      )}
                      <Box flexGrow={1}>
                        <Typography fontWeight="bold">{item.product_title}</Typography>
                        <Typography variant="body2" sx={{ color: summarySettings.textColor, opacity: 0.8 }}>
                          {item.variant_title}
                        </Typography>
                        <Typography variant="body2">Quantity: {item.quantity}</Typography>
                      </Box>
                      <Typography fontWeight="bold">
                        {new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: cart.currency,
                        }).format(item.price / 100)}
                      </Typography>
                    </Box>
                    {index < cart.items.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
            </CardContent>
          </Card>
        );
      }
      case 'totals-summary': {
        const summarySettings = field.settings as SummarySettings;
        if (!cart) return null;
        return (
          <Box
            key={field.id}
            sx={{
              p: 2,
              my: 2,
              backgroundColor: summarySettings.backgroundColor,
              color: summarySettings.textColor,
              borderRadius: `${summarySettings.borderRadius}px`,
            }}
          >
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Subtotal</Typography>
              <Typography>
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: cart.currency,
                }).format(cart.total_price / 100)}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Shipping</Typography>
              <Typography>Free</Typography>
            </Box>
            <Divider sx={{ my: 1, borderColor: summarySettings.textColor }} />
            <Box display="flex" justifyContent="space-between" fontWeight="bold">
              <Typography fontWeight="bold">Total</Typography>
              <Typography fontWeight="bold">
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: cart.currency,
                }).format(cart.total_price / 100)}
              </Typography>
            </Box>
          </Box>
        );
      }
      case 'shipping-rates': {
        return (
          <FormControl component="fieldset" key={field.id} sx={{ my: 2, width: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Shipping Method
            </Typography>
            <RadioGroup name="shipping-rate" defaultValue="free-shipping">
              <Box sx={{ border: '1px solid #ccc', borderRadius: '4px', p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControlLabel value="free-shipping" control={<Radio />} label="Standard Shipping" />
                <Typography fontWeight="bold">Free</Typography>
              </Box>
            </RadioGroup>
          </FormControl>
        );
      }
      case 'custom-image': {
        const imageSettings = field.settings as CustomImageSettings;
        const alignStyle = {
          display: 'flex',
          justifyContent: imageSettings.alignment || 'center',
        };
        return (
          <Box key={field.id} sx={{ marginTop: `${imageSettings.marginTop}px`, marginBottom: `${imageSettings.marginBottom}px`, ...alignStyle }}>
            <Box
              component="img"
              src={imageSettings.imageUrl}
              alt={imageSettings.altText}
              sx={{
                width: imageSettings.width ? `${imageSettings.width}%` : 'auto',
                height: imageSettings.height > 0 ? `${imageSettings.height}px` : 'auto',
                borderRadius: `${imageSettings.borderRadius}px`,
                objectFit: 'cover',
              }}
            />
          </Box>
        );
      }
      default:
        return null;
    }
  };

  const submitButtonField = config.formFields.find((f) => f.type === 'submit');
  const submitButtonSettings = submitButtonField?.settings as ButtonSettings | undefined;

  let isSubmitButtonHidden = false;
  if (submitButtonSettings && cart) {
    const cartTotal = cart.total_price / 100;
    const hideLessThan = submitButtonSettings.hideIfCartTotalLessThan;
    const hideGreaterThan = submitButtonSettings.hideIfCartTotalGreaterThan;

    if (hideLessThan !== undefined && cartTotal < hideLessThan) {
      isSubmitButtonHidden = true;
    }
    if (hideGreaterThan !== undefined && cartTotal > hideGreaterThan) {
      isSubmitButtonHidden = true;
    }
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{
        maxWidth: config.formStyle.maxWidth || 600,
        mx: 'auto',
        p: `${config.formStyle.padding}px`,
        backgroundColor: config.formStyle.backgroundColor,
        borderRadius: `${config.formStyle.borderRadius}px`,
        border: `${config.formStyle.borderWidth}px solid ${config.formStyle.borderColor}`,
        boxShadow: config.formStyle.shadow,
        color: config.formStyle.textColor,
      }}
    >

      {config.formFields.filter((f) => f.type !== 'submit').map(renderField)}

      {!amountValidation.isValid && (
        <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
          {amountValidation.message}
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {submitError}
        </Alert>
      )}

      {!isSubmitButtonHidden && submitButtonSettings && amountValidation.isValid && (
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
            fontWeight: submitButtonSettings?.fontWeight || '500',
            padding: submitButtonSettings?.padding || '10px 20px',
            '&:hover': {
              backgroundColor:
                submitButtonSettings?.hoverBackgroundColor || submitButtonSettings?.backgroundColor,
              filter: 'brightness(0.9)',
            },
          }}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            submitButtonSettings?.text || 'Submit Order'
          )}
        </Button>
      )}
    </Box>
  );
};

// Mount the React app to the DOM
const rootElement = document.getElementById('easycod-form-root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <FormApp />
    </React.StrictMode>,
  );
} else {
  console.error('❌ Root element #easycod-form-root not found');
}