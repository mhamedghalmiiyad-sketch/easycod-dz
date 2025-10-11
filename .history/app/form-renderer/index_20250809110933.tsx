import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// ⚠️ REMOVED: All MUI imports to avoid Node.js dependencies
// Instead, we'll use basic HTML elements with inline styles

// --- INTERFACES (Same as before) ---
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
  fbPurchaseEvent?: 'Purchase' | 'Custom';
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

interface VisibilitySettings {
  hideAddToCart?: boolean;
  hideBuyNow?: boolean;
  minimumAmount?: string;
  maximumAmount?: string;
}

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

interface CartItem {
  variant_id: number;
  quantity: number;
  price: number;
  product_title: string;
  variant_title: string;
  image?: string;
}

interface Cart {
  items: CartItem[];
  total_price: number;
  item_count: number;
  currency: string;
}

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
  options?: string[];
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
  customerData?: CustomerData;
}

// ✅ FIXED: Proper TypeScript interface for pixel platforms
interface PixelPlatform {
  tracker: (eventName: string, data: any) => void;
  events: {
    InitiateCheckout: string;
    AddPaymentInfo: string;
    Purchase: string;
    AddToCart: string;
  };
  payload: (data: any, eventName?: string) => any;
  conditions?: {
    [key: string]: () => boolean | undefined;
  };
}

// --- END INTERFACES ---

const configElement = document.getElementById('__EASYCOD_FORM_CONFIG__');
if (!configElement) {
  throw new Error('Configuration element not found');
}
const config: Config = JSON.parse(configElement.textContent || '{}');

// ✅ BROWSER-SAFE: Central mapping for all pixel events
const pixelEventMap: Record<string, PixelPlatform> = {
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
      event_id: `${(eventName || 'checkout').toLowerCase()}_${Date.now()}`,
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
      name: eventName || 'unknown',
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

const trackEvent = (eventName: 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase' | 'AddToCart', eventData: any = {}) => {
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
      const platform = pixelEventMap[pixel as keyof typeof pixelEventMap];
      const platformEventName = platform.events[eventName];

      if (!platformEventName) continue;

      // Check if conditions exist before accessing them
      if (platform.conditions) {
        const condition = platform.conditions[eventName];
        if (condition && !condition()) {
          continue;
        }
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
};

// ✅ BROWSER-SAFE: Utility functions
const trackFormInteraction = (fieldType: string, eventData: any) => {
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
};

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
    
    if (prevCart && (cart.total_price > prevCart.total_price || cart.item_count > prevCart.item_count)) {
      trackEvent('AddToCart', eventData);
      console.log('🎯 AddToCart tracked due to cart change');
    }

  }, [hasTrackedInitialCheckout]);

  return trackCartEvents;
};

const validateCartAmount = (cart: Cart | null, visibilitySettings?: VisibilitySettings) => {
  if (!cart || !visibilitySettings) return { isValid: true, message: '' };

  const minimumAmount = parseFloat(visibilitySettings.minimumAmount || '0');
  const maximumAmount = parseFloat(visibilitySettings.maximumAmount || 'Infinity');
  const cartTotal = cart.total_price / 100;
  const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: cart.currency });

  if (minimumAmount > 0 && cartTotal < minimumAmount) {
    return { isValid: false, message: `Minimum order amount is ${currencyFormatter.format(minimumAmount)}. Your cart total is ${currencyFormatter.format(cartTotal)}.` };
  }

  if (maximumAmount > 0 && cartTotal > maximumAmount) {
    return { isValid: false, message: `Maximum order amount is ${currencyFormatter.format(maximumAmount)}. Your cart total is ${currencyFormatter.format(cartTotal)}.` };
  }

  return { isValid: true, message: '' };
};

function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// ✅ BROWSER-SAFE: CSS-in-JS styles
const styles = {
  container: (formStyle: FormStyle) => ({
    maxWidth: `${formStyle.maxWidth || 600}px`,
    margin: '0 auto',
    padding: `${formStyle.padding}px`,
    backgroundColor: formStyle.backgroundColor,
    borderRadius: `${formStyle.borderRadius}px`,
    border: `${formStyle.borderWidth}px solid ${formStyle.borderColor}`,
    boxShadow: formStyle.shadow,
    color: formStyle.textColor,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }),
  input: (inputSettings: InputFieldSettings) => ({
    width: '100%',
    padding: '12px',
    margin: '8px 0',
    backgroundColor: inputSettings.backgroundColor,
    color: inputSettings.textColor,
    border: `1px solid ${inputSettings.borderColor}`,
    borderRadius: `${inputSettings.borderRadius}px`,
    fontSize: `${inputSettings.fontSize}px`,
    boxSizing: 'border-box' as const,
  }),
  button: (buttonSettings: ButtonSettings) => ({
    width: '100%',
    padding: buttonSettings.padding || '12px 24px',
    backgroundColor: buttonSettings.backgroundColor,
    color: buttonSettings.textColor,
    border: 'none',
    borderRadius: `${buttonSettings.borderRadius}px`,
    fontSize: `${buttonSettings.fontSize}px`,
    fontWeight: buttonSettings.fontWeight,
    cursor: 'pointer',
    marginTop: '16px',
  }),
  alert: (type: 'error' | 'warning') => ({
    padding: '12px',
    margin: '8px 0',
    borderRadius: '4px',
    backgroundColor: type === 'error' ? '#fee' : '#fff3cd',
    color: type === 'error' ? '#721c24' : '#856404',
    border: `1px solid ${type === 'error' ? '#f5c6cb' : '#ffeaa7'}`,
  }),
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    fontSize: '16px',
  },
};

const FormApp = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [amountValidation, setAmountValidation] = useState({ isValid: true, message: '' });

  const trackCartEvents = useCartTracking();

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

  // Fetch cart data
  useEffect(() => {
    let isMounted = true;
    let prevCartState: Cart | null = null;

    const fetchCart = async () => {
      try {
        const response = await fetch('/cart.js');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const cartData: Cart = await response.json();

        if (isMounted) {
            if (JSON.stringify(cartData) !== JSON.stringify(prevCartState)) {
                const validation = validateCartAmount(cartData, config.visibilitySettings);
                setAmountValidation(validation);
                trackCartEvents(cartData, prevCartState);
                setCart(cartData);
                prevCartState = cartData;
            }
        }
      } catch (error) {
        console.error('❌ Error fetching cart:', error);
      } finally {
        if(isMounted && isLoading) setIsLoading(false);
      }
    };
    
    fetchCart();
    const intervalId = setInterval(fetchCart, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [config.visibilitySettings, trackCartEvents, isLoading]);

  // Abandonment tracking
  useEffect(() => {
    let abandonmentTimer: ReturnType<typeof setTimeout>;
    const trackAbandonment = () => {
        if (cart && cart.item_count > 0) {
            abandonmentTimer = setTimeout(() => {
                const sessionId = sessionStorage.getItem('session_id') || generateSessionId();
                sessionStorage.setItem('session_id', sessionId);
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
            }, 5 * 60 * 1000);
        }
    };
    const resetTimer = () => {
      clearTimeout(abandonmentTimer);
      trackAbandonment();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer, true));
    trackAbandonment();

    return () => {
      clearTimeout(abandonmentTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer, true));
    };
  }, [cart, formValues]);

  const handleInputChange = useCallback((fieldId: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: '' }));
    }

    if (cart?.item_count && value && String(value).length > 2) {
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
  }, [cart, errors]);

  const validateField = (field: FormField, value: any): string => {
    const settings = field.settings as InputFieldSettings;
    if (settings.required && !value) {
      return `${settings.label} is required`;
    }
    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }
    if (field.type === 'tel' && value && !/^[\d\s\+\-\(\)]+$/.test(value)) {
      return 'Please enter a valid phone number';
    }
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    config.formFields.forEach((field) => {
      if (['text', 'email', 'tel', 'textarea', 'checkbox', 'select', 'custom-dropdown'].includes(field.type)) {
        const error = validateField(field, formValues[field.id]);
        if (error) {
          newErrors[field.id] = error;
          isValid = false;
        }
      }
    });
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    if (!amountValidation.isValid) {
      setSubmitError(amountValidation.message);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      Object.entries(formValues).forEach(([key, value]) => formData.append(key, String(value)));

      if (cart) {
        const lineItems = cart.items.map((item) => ({
          variantId: `gid://shopify/ProductVariant/${item.variant_id}`,
          quantity: item.quantity,
        }));
        formData.append('lineItems', JSON.stringify(lineItems));
        formData.append('cartData', JSON.stringify(cart));
      }

      const response = await fetch(config.submitUrl, { method: 'POST', body: formData });
      const result = await response.json();

      if (response.ok && result.success) {
        if (result.purchaseData && cart) {
          trackEvent('Purchase', {
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
          });
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
  
  // ✅ BROWSER-SAFE: Simplified field renderer without MUI
  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel': {
        const inputSettings = field.settings as InputFieldSettings;
        return (
          <div key={field.id} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: inputSettings.textColor }}>
              {inputSettings.label} {inputSettings.required && '*'}
            </label>
            <input
              type={field.type}
              id={field.id}
              name={field.id}
              placeholder={inputSettings.placeholder}
              required={inputSettings.required}
              value={formValues[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={styles.input(inputSettings)}
            />
            {errors[field.id] && (
              <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>
                {errors[field.id]}
              </div>
            )}
          </div>
        );
      }
      case 'textarea': {
        const inputSettings = field.settings as InputFieldSettings;
        return (
          <div key={field.id} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: inputSettings.textColor }}>
              {inputSettings.label} {inputSettings.required && '*'}
            </label>
            <textarea
              id={field.id}
              name={field.id}
              rows={4}
              placeholder={inputSettings.placeholder}
              required={inputSettings.required}
              value={formValues[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={{ ...styles.input(inputSettings), resize: 'vertical' as const }}
            />
            {errors[field.id] && (
              <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>
                {errors[field.id]}
              </div>
            )}
          </div>
        );
      }
      case 'select':
      case 'custom-dropdown': {
        const inputSettings = field.settings as InputFieldSettings;
        return (
          <div key={field.id} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: inputSettings.textColor }}>
              {inputSettings.label} {inputSettings.required && '*'}
            </label>
            <select
              id={field.id}
              name={field.id}
              required={inputSettings.required}
              value={formValues[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={styles.input(inputSettings)}
            >
              <option value="">Select an option</option>
              {inputSettings.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors[field.id] && (
              <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>
                {errors[field.id]}
              </div>
            )}
          </div>
        );
      }
      case 'checkbox': {
        const inputSettings = field.settings as InputFieldSettings;
        return (
          <div key={field.id} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', color: inputSettings.textColor }}>
              <input
                type="checkbox"
                id={field.id}
                name={field.id}
                checked={formValues[field.id] || false}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              {inputSettings.label} {inputSettings.required && '*'}
            </label>
            {errors[field.id] && (
              <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>
                {errors[field.id]}
              </div>
            )}
          </div>
        );
      }
      case 'header':
      case 'section-header': {
        const headerSettings = field.settings as CustomTextSettings;
        const HeaderTag = field.type === 'header' ? 'h1' : 'h2';
        return (
          <HeaderTag
            key={field.id}
            style={{
              textAlign: headerSettings.alignment,
              color: headerSettings.textColor,
              fontSize: `${headerSettings.fontSize}px`,
              fontWeight: headerSettings.fontWeight,
              marginTop: `${headerSettings.marginTop}px`,
              marginBottom: `${headerSettings.marginBottom}px`,
            }}
          >
            {headerSettings.text}
          </HeaderTag>
        );
      }
      case 'custom-whatsapp-button': {
        const whatsAppSettings = field.settings as WhatsAppSettings;
        const whatsappUrl = `https://wa.me/${whatsAppSettings.phoneNumber}?text=${encodeURIComponent(whatsAppSettings.message || 'Hello!')}`;
        return (
          <div key={field.id} style={{ textAlign: 'center', margin: '16px 0' }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: whatsAppSettings.backgroundColor,
                color: whatsAppSettings.textColor,
                borderRadius: `${whatsAppSettings.borderRadius}px`,
                fontSize: `${whatsAppSettings.fontSize}px`,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              💬 {whatsAppSettings.buttonText}
            </a>
          </div>
        );
      }
      case 'summary': {
        const summarySettings = field.settings as SummarySettings;
        if (!cart || cart.item_count === 0) {
          return <div key={field.id}>Your cart is empty.</div>;
        }
        return (
          <div
            key={field.id}
            style={{
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: summarySettings.backgroundColor,
              color: summarySettings.textColor,
              borderRadius: `${summarySettings.borderRadius}px`,
              border: '1px solid #ddd',
            }}
          >
            <h3 style={{ fontSize: `${summarySettings.fontSize}px`, marginBottom: '16px' }}>
              {summarySettings.title}
            </h3>
            {summarySettings.showItemDetails &&
              cart.items.map((item, index) => (
                <div key={item.variant_id}>
                  <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.product_title}
                        style={{ width: '64px', height: '64px', borderRadius: '4px', marginRight: '16px', objectFit: 'cover' }}
                      />
                    )}
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{item.product_title}</div>
                      <div style={{ opacity: 0.8, fontSize: '14px' }}>{item.variant_title}</div>
                      <div style={{ fontSize: '14px' }}>Quantity: {item.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 'bold' }}>
                      {new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: cart.currency,
                      }).format(item.price / 100)}
                    </div>
                  </div>
                  {index < cart.items.length - 1 && (
                    <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '12px 0' }} />
                  )}
                </div>
              ))}
          </div>
        );
      }
      case 'totals-summary': {
        const summarySettings = field.settings as SummarySettings;
        if (!cart) return null;
        return (
          <div
            key={field.id}
            style={{
              padding: '16px',
              margin: '16px 0',
              backgroundColor: summarySettings.backgroundColor,
              color: summarySettings.textColor,
              borderRadius: `${summarySettings.borderRadius}px`,
              border: '1px solid #ddd',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Subtotal</span>
              <span>
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: cart.currency,
                }).format(cart.total_price / 100)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Total</span>
              <span>
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: cart.currency,
                }).format(cart.total_price / 100)}
              </span>
            </div>
          </div>
        );
      }
      case 'shipping-rates': {
        return (
          <div key={field.id} style={{ margin: '16px 0' }}>
            <h3 style={{ marginBottom: '12px' }}>Shipping Method</h3>
            <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input type="radio" name="shipping-rate" value="free-shipping" defaultChecked style={{ marginRight: '8px' }} />
                Standard Shipping
              </label>
              <span style={{ fontWeight: 'bold' }}>Free</span>
            </div>
          </div>
        );
      }
      case 'custom-image': {
        const imageSettings = field.settings as CustomImageSettings;
        return (
          <div key={field.id} style={{ 
            marginTop: `${imageSettings.marginTop}px`, 
            marginBottom: `${imageSettings.marginBottom}px`,
            textAlign: imageSettings.alignment,
          }}>
            <img
              src={imageSettings.imageUrl}
              alt={imageSettings.altText}
              style={{
                width: imageSettings.width ? `${imageSettings.width}%` : 'auto',
                height: imageSettings.height > 0 ? `${imageSettings.height}px` : 'auto',
                borderRadius: `${imageSettings.borderRadius}px`,
                objectFit: 'cover',
              }}
            />
          </div>
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
    const { hideIfCartTotalLessThan, hideIfCartTotalGreaterThan } = submitButtonSettings;
    if ((hideIfCartTotalLessThan != null && cartTotal < hideIfCartTotalLessThan) || (hideIfCartTotalGreaterThan != null && cartTotal > hideIfCartTotalGreaterThan)) {
      isSubmitButtonHidden = true;
    }
  }

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.container(config.formStyle)}>
      {config.formFields.filter((f) => f.type !== 'submit').map(renderField)}

      {!amountValidation.isValid && (
        <div style={styles.alert('warning')}>
          {amountValidation.message}
        </div>
      )}

      {submitError && (
        <div style={styles.alert('error')}>
          {submitError}
        </div>
      )}

      {!isSubmitButtonHidden && submitButtonSettings && amountValidation.isValid && (
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...styles.button(submitButtonSettings),
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.backgroundColor = submitButtonSettings.hoverBackgroundColor || submitButtonSettings.backgroundColor;
              e.currentTarget.style.filter = 'brightness(0.9)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.backgroundColor = submitButtonSettings.backgroundColor;
              e.currentTarget.style.filter = 'none';
            }
          }}
        >
          {isSubmitting ? 'Processing...' : (submitButtonSettings?.text || 'Submit Order')}
        </button>
      )}
    </form>
  );
};

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