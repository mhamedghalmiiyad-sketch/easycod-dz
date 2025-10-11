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

// --- INTERFACES (PASTE THIS ENTIRE BLOCK) ---
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
type AllFieldSettings = BaseFieldSettings | CommonTextFieldSettings | TotalsSummarySettings | ShippingRatesSettings | CustomTextSettings | CustomIconFeatureSettings | ButtonSettings;

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
    primaryColor?: string;
    enableDinarConverter?: boolean;
    currencySymbol?: 'DA' | 'دج';
}
interface Config {
  formFields: FormField[];
  formStyle: FormStyle;
  submitUrl: string;
  redirectUrl?: string;
  pixelSettings?: any;
  visibilitySettings?: any;
  customerData?: any;
}
// --- END OF INTERFACES ---

// --- Global Interfaces (Kept from original for pixel tracking) ---
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
  }, [config.pixelSettings, pixelEventMap]);

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
    }, [hasTrackedInitialCheckout, trackEvent]);

    return trackCartEvents;
  };

  const validateCartAmount = (cart: Cart | null) => {
    const visibilitySettings = config.visibilitySettings;
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

  // --- COMPONENT STATE AND LOGIC ---
  const [cart, setCart] = useState<Cart | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [amountValidation, setAmountValidation] = useState({ isValid: true, message: '' });

  // State for dynamic Algerian location dropdowns
  const [wilayas, setWilayas] = useState<{ id: string; name: string }[]>([]);
  const [communes, setCommunes] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

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

  // Fetch cart data using polling
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
            const validation = validateCartAmount(cartData);
            setAmountValidation(validation);
            trackCartEvents(cartData, prevCartState);
            setCart(cartData);
            prevCartState = cartData;
          }
        }
      } catch (error) {
        console.error('❌ Error fetching cart:', error);
      } finally {
        if (isMounted && isLoading) setIsLoading(false);
      }
    };

    fetchCart();
    const intervalId = setInterval(fetchCart, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isLoading, trackCartEvents, config.visibilitySettings]);

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

  // Fetch Wilayas when component mounts
  useEffect(() => {
    const hasWilayaField = config.formFields.some(f => f.type === 'wilaya');
    if (hasWilayaField) {
      setIsLoadingLocations(true);
      fetch('/apps/codform/api/algeria-locations')
        .then(res => res.json())
        .then(data => {
            const logisticsSettings = config.formFields.find(f => f.type === 'logistics-delivery')?.settings as any;
            const lang = logisticsSettings?.algeriaWilayaMode === 'arabic' ? 'wilaya_name' : 'wilaya_name_ascii';
            const showNumbers = logisticsSettings?.showWilayaNumbers !== false;
            const uniqueWilayas = Array.from(new Map(data.map((item: any) => [item[lang], item])).values());
            setWilayas(
              (uniqueWilayas as any[]).map((w: any) => ({
                id: w.wilaya_code,
                name: showNumbers ? `${w.wilaya_code} - ${w[lang]}` : w[lang],
              }))
            );
        })
        .catch(err => console.error("Failed to fetch wilayas:", err))
        .finally(() => setIsLoadingLocations(false));
    }
  }, [config.formFields]);

  // Fetch Communes when Wilaya changes
  useEffect(() => {
    const selectedWilayaId = formValues['wilaya'];
    const hasCommuneField = config.formFields.some(f => f.type === 'commune');

    if (hasCommuneField && selectedWilayaId) {
        setIsLoadingLocations(true);
        fetch(`/apps/codform/api/algeria-locations?wilaya_id=${selectedWilayaId}`)
            .then(res => res.json())
            .then(data => {
                const logisticsSettings = config.formFields.find(f => f.type === 'logistics-delivery')?.settings as any;
                const lang = logisticsSettings?.algeriaCommuneMode === 'arabic' ? 'commune_name' : 'commune_name_ascii';
                setCommunes(data.map((c: any) => ({ id: c.id, name: c[lang] })));
            })
            .catch(err => console.error("Failed to fetch communes:", err))
            .finally(() => setIsLoadingLocations(false));
    } else if (hasCommuneField) {
        setCommunes([]); // Clear communes if no wilaya is selected
    }
  }, [formValues, config.formFields]);

  const handleInputChange = useCallback((fieldId: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: '' }));
    }

    // If wilaya is changed, reset commune
    if (fieldId === 'wilaya') {
        setFormValues((prev) => ({ ...prev, commune: '' }));
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
  }, [cart, errors, trackFormInteraction]);

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    config.formFields.forEach((field) => {
      if ([
        'text', 'email', 'tel', 'textarea', 'checkbox', 'select', 'custom-dropdown', 'phone', 'custom-text-input',
        'full-name', 'first-name', 'last-name', 'address', 'address2', 'province', 'zip-code', 'order-note', 'wilaya', 'commune'
      ].includes(field.type)) {
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
    if (!field.enabled) {
      return null;
    }
    const s = field.settings as any;
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
        const htmlType =
          field.type === 'phone' || field.type === 'tel' ? 'tel'
          : field.type === 'email' ? 'email'
          : 'text';
        return (
          <TextField
            {...commonProps}
            id={field.id}
            name={field.id}
            type={htmlType}
            multiline={field.type === 'order-note'}
            rows={field.type === 'order-note' ? 4 : 1}
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
      case 'wilaya':
      case 'commune': {
        const options = field.type === 'wilaya' ? wilayas : communes;
        const isDisabled = isLoadingLocations || (field.type === 'commune' && !formValues['wilaya']);
        
        return (
            <FormControl {...commonProps} key={field.id} disabled={isDisabled}>
                <InputLabel sx={{ color: inputSettings.textColor }}>{inputSettings.label}</InputLabel>
                <Select
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
                    {isLoadingLocations && <MenuItem value=""><em>Loading...</em></MenuItem>}
                    {!isLoadingLocations && options.length === 0 && (
                        <MenuItem value="" disabled>
                            <em>{field.type === 'commune' ? 'Select a Wilaya first' : 'No options found'}</em>
                        </MenuItem>
                    )}
                    {options.map((option) => (
                        <MenuItem key={option.id} value={option.name}>
                            {option.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
      }
      case 'custom-icon-feature': {
          const enabledFeatures = s.features?.filter((f: IconFeature) => f.enabled) || [];
          if (enabledFeatures.length === 0) return null;

          return (
              <Box key={field.id} sx={{ my: 4, py: 3, borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
                  {s.title && s.titlePosition === 'top' && (
                      <Typography variant="h6" component="h3" textAlign="center" sx={{ mb: 2, fontWeight: 600 }}>
                          {s.title}
                      </Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                      {enabledFeatures.map((feature: IconFeature, index: number) => (
                          <Box key={index} sx={{ textAlign: 'center', flex: '1 1 80px', minWidth: '80px' }}>
                              <img src={feature.imageUrl} alt={feature.caption} style={{ width: '48px', height: '48px', marginBottom: '8px' }} />
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                  {feature.caption}
                              </Typography>
                          </Box>
                      ))}
                  </Box>
                    {s.title && s.titlePosition === 'bottom' && (
                      <Typography variant="h6" component="h3" textAlign="center" sx={{ mt: 2, fontWeight: 600 }}>
                          {s.title}
                      </Typography>
                  )}
              </Box>
          );
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
        const summarySettings = field.settings as any;
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
        const summarySettings = field.settings as TotalsSummarySettings;
        if (!cart) return null;
        return (
          <Box
            key={field.id}
            sx={{
                p: 2,
                my: 2,
                backgroundColor: summarySettings.backgroundColor,
                color: (config.formStyle as any).textColor,
                borderRadius: `${config.formStyle.borderRadius}px`,
            }}
          >
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>{summarySettings.subtotalTitle}</Typography>
              <Typography>
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: cart.currency,
                }).format(cart.total_price / 100)}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>{summarySettings.shippingTitle}</Typography>
              <Typography>Free</Typography>
            </Box>
            <Divider sx={{ my: 1, borderColor: (config.formStyle as any).textColor }} />
            <Box display="flex" justifyContent="space-between" fontWeight="bold">
              <Typography fontWeight="bold">{summarySettings.totalTitle}</Typography>
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
      default:
        if (field.type === 'logistics-delivery') {
            return null; // This field is for settings only, not for rendering a visible component.
        }
        console.warn(`Unsupported field type encountered: "${field.type}". This field will not be rendered.`);
        return null;
    }
  };


  const submitButtonField = config.formFields.find((f) => f.type === 'submit');
  const submitButtonSettings = submitButtonField?.settings as ButtonSettings | undefined;

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
        maxWidth: (config.formStyle as any).maxWidth || 600,
        mx: 'auto',
        p: `${(config.formStyle as any).padding || 24}px`,
        backgroundColor: config.formStyle.backgroundColor,
        borderRadius: `${config.formStyle.borderRadius}px`,
        border: `${config.formStyle.borderWidth}px solid ${config.formStyle.borderColor}`,
        boxShadow: config.formStyle.shadow,
        color: config.formStyle.textColor,
        direction: config.formStyle.enableRTL ? 'rtl' : 'ltr',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: config.formStyle.layout === 'double' ? 'repeat(2, 1fr)' : '1fr',
          gap: '0 16px'
        }}
      >
        {config.formFields.filter((f) => f.type !== 'submit').map(field => {
          const s = field.settings as any;
          const isFullWidth = [
            'summary', 'totals-summary', 'shipping-rates', 'section-header', 'header',
            'custom-icon-feature', 'textarea', 'order-note'
          ].includes(field.type) || s.layoutOverride === 'single';
          
          return (
            <Box
              key={field.id}
              sx={{ gridColumn: (config.formStyle.layout === 'double' && !isFullWidth) ? 'span 1' : '1 / -1' }}
            >
              {renderField(field)}
            </Box>
          );
        })}
      </Box>

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
            },
          }}
        >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (submitButtonSettings?.buttonText || 'Submit Order')}
        </Button>
      )}
    </Box>
  );
};

// --- DYNAMIC INITIALIZER (Kept from original) ---
function initializeForm(container: HTMLElement) {
  const sectionId = container.dataset.sectionId;
  if (!sectionId) {
    console.error('❌ Form container is missing data-section-id.', container);
    return;
  }

  const configElement = document.getElementById(`easycod-form-config-${sectionId}`);
  const sectionSettingsJSON = container.dataset.sectionSettings;

  if (!configElement) {
    console.error(`❌ Config script for section ${sectionId} not found.`);
    container.innerHTML = '<p>Error: Form configuration is missing.</p>';
    return;
  }

  try {
    const configText = configElement.textContent;
    if (!configText || configText.trim() === 'null' || configText.trim() === '') {
      console.warn(`Configuration for section ${sectionId} is empty.`);
      container.innerHTML = '<p>Form configuration is missing. Please save the form design.</p>';
      return;
    }

    const mainConfig: Config = JSON.parse(configText);
    if (!mainConfig || !mainConfig.formFields) {
      console.error(`❌ Parsed configuration is invalid for section ${sectionId}.`, mainConfig);
      container.innerHTML = '<p>Error: Invalid form configuration loaded.</p>';
      return;
    }

    let sectionSettings = {};
    if (sectionSettingsJSON && sectionSettingsJSON !== 'null') {
      sectionSettings = JSON.parse(sectionSettingsJSON);
    }

    if ((sectionSettings as any).heading_override?.trim()) {
      const headerField = mainConfig.formFields.find(f => f.type === 'header' || f.type === 'section-header');
      if (headerField) {
        (headerField.settings as CustomTextSettings).text = (sectionSettings as any).heading_override;
      }
    }
    if ((sectionSettings as any).button_text_override?.trim()) {
      const submitField = mainConfig.formFields.find(f => f.type === 'submit');
      if (submitField) {
        (submitField.settings as ButtonSettings).buttonText = (sectionSettings as any).button_text_override;
      }
    }

    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <FormApp config={mainConfig} />
      </React.StrictMode>
    );
  } catch (error) {
    console.error(`❌ Failed to initialize form for section ${sectionId}.`, error);
    container.innerHTML = '<p>Error loading form. Check console for details.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll<HTMLElement>('.easycod-form-container').forEach(initializeForm);
});

document.addEventListener('shopify:section:load', (event) => {
  const section = (event.target as HTMLElement)?.closest('.shopify-section');
  const formContainer = section?.querySelector<HTMLElement>('.easycod-form-container');
  if (formContainer) {
    initializeForm(formContainer);
  }
});