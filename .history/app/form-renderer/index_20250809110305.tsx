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

// --- INTERFACES ---
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

// ✅ FIXED: Central mapping for all pixel events with proper typing
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
    payload: (data: any, eventName: string) => ({
      value: data.value,
      currency: data.currency,
      line_items: data.contents,
      order_id: eventName === 'Purchase' ? data.transaction_id : undefined,
      event_id: `${eventName.toLowerCase()}_${Date.now()}`,
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
    payload: (data: any, eventName: string) => ({
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

      // ✅ FIXED: Check if conditions exist before accessing them
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
      // Clean up any keys that have undefined or null values
      Object.keys(prefillData).forEach((key) => (prefillData[key] == null) && delete prefillData[key]);
      setFormValues(prefillData);
    }
  }, [config.customerData, formValues]);

  // ✅ FIXED: Fetch cart data using polling to prevent infinite loops
  useEffect(() => {
    let isMounted = true;
    let prevCartState: Cart | null = null;

    const fetchCart = async () => {
      try {
        const response = await fetch('/cart.js');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const cartData: Cart = await response.json();

        if (isMounted) {
            // Only update state if cart has actually changed
            if (JSON.stringify(cartData) !== JSON.stringify(prevCartState)) {
                const validation = validateCartAmount(cartData, config.visibilitySettings);
                setAmountValidation(validation);
                trackCartEvents(cartData, prevCartState);
                setCart(cartData);
                prevCartState = cartData; // Update local previous state
            }
        }
      } catch (error) {
        console.error('❌ Error fetching cart:', error);
      } finally {
        if(isMounted && isLoading) setIsLoading(false);
      }
    };
    
    fetchCart(); // Initial fetch
    const intervalId = setInterval(fetchCart, 30000); // Poll every 30 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.visibilitySettings, trackCartEvents]); // Dependencies are stable

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
            }, 5 * 60 * 1000); // 5 minutes
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
    const { hideIfCartTotalLessThan, hideIfCartTotalGreaterThan } = submitButtonSettings;
    if ((hideIfCartTotalLessThan != null && cartTotal < hideIfCartTotalLessThan) || (hideIfCartTotalGreaterThan != null && cartTotal > hideIfCartTotalGreaterThan)) {
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
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (submitButtonSettings?.text || 'Submit Order')}
        </Button>
      )}
    </Box>
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