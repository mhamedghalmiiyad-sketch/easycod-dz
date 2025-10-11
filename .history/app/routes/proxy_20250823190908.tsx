import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import db from "../db.server";
import { calculateRiskScore } from "./riskScoring";

// Type definitions for GraphQL response
interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
}

interface UserError {
  field: string[];
  message: string;
}

interface DraftOrder {
  id: string;
  name: string;
  invoiceUrl: string;
  status: string;
}

interface DraftOrderCreateResponse {
  data?: {
    draftOrderCreate: {
      draftOrder: DraftOrder | null;
      userErrors: UserError[];
    };
  };
  errors?: GraphQLError[];
}

// Type definition for pixel settings
interface PixelSettings {
  disableAllEvents?: boolean;
  facebookPixelId?: string;
  googlePixelId?: string;
  tiktokPixelId?: string;
  pinterestPixelId?: string;
  snapchatPixelId?: string;
  taboolaPixelId?: string;
  sharechatPixelId?: string;
  kwaiPixelId?: string;
}

// Type definition for shop settings
interface ShopSettings {
  id: number;
  shopId: string;
  formFields: string | null;
  formStyle: string | null;
  shippingRates: string | null;
  pixelSettings: string | null;
  visibilityMode: string | null;
  visibleProducts: string | null;
  hiddenProducts: string | null;
  enableSpecificProducts: boolean | null;
  disableSpecificProducts: boolean | null;
  enableSpecificCountries: boolean | null;
  allowedCountries: string | null;
  disableOnHome: boolean | null;
  disableOnCollections: boolean | null;
  hideAddToCart: boolean | null;
  hideBuyNow: boolean | null;
  minimumAmount: string | null;
  maximumAmount: string | null;
  userBlocking: string | null;
  redirectUrl?: string | null;
}

// User Blocking Settings Definition
interface UserBlockingSettings {
  limitSameCustomerOrders: boolean;
  limitSameCustomerHours: string;
  blockByQuantity: boolean;
  blockQuantityAmount: string;
  blockedEmails: string;
  blockedPhoneNumbers: string;
  blockedIps: string;
  allowedIps: string;
  blockedMessage: string;
  postalCodeMode: "none" | "exclude" | "allow";
  postalCodeList: string;
  enableRiskScoring?: boolean;
  autoRejectHighRisk?: boolean;
}

// Helper function to calculate HMAC signature
async function calculateHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper function for HMAC validation
async function validateAppProxyRequest(request: Request): Promise<boolean> {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  const signature = params.get("signature");
  if (!signature) return false;

  params.delete("signature");
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) {
    console.error("SHOPIFY_API_SECRET is not defined");
    return false;
  }

  const calculatedHmac = await calculateHmac(sortedParams, apiSecret);
  return calculatedHmac === signature;
}

// Helper function to get logged-in customer data
async function getLoggedInCustomerData(request: Request, shop: string) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("logged_in_customer_id");
    
    if (!customerId) return null;

    const { admin } = await unauthenticated.admin(shop);
    
    const response = await admin.graphql(`
      query getCustomer($id: ID!) {
        customer(id: $id) {
          id
          firstName
          lastName
          email
          phone
          defaultAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            zip
            country
            phone
          }
        }
      }
    `, {
      variables: { id: `gid://shopify/Customer/${customerId}` }
    });

    const data = await response.json();
    return data.data?.customer || null;
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return null;
  }
}

// Helper function to generate pixel tracking scripts
function generatePixelScripts(pixelSettings: PixelSettings, userEmail: string = ''): string {
  if (!pixelSettings || pixelSettings.disableAllEvents) {
    return '';
  }

  let scripts = '';

  // Facebook Pixel
  if (pixelSettings.facebookPixelId) {
    scripts += `
      <script>
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelSettings.facebookPixelId}');
        fbq('track', 'PageView');
      </script>
      <noscript><img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${pixelSettings.facebookPixelId}&ev=PageView&noscript=1"
      /></noscript>
    `;
  }

  // Google Analytics
  if (pixelSettings.googlePixelId) {
    scripts += `
      <script async src="https://www.googletagmanager.com/gtag/js?id=${pixelSettings.googlePixelId}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${pixelSettings.googlePixelId}');
      </script>
    `;
  }

  // TikTok Pixel
  if (pixelSettings.tiktokPixelId) {
    scripts += `
      <script>
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
          ttq.load('${pixelSettings.tiktokPixelId}');
          ttq.page();
        }(window, document, 'ttq');
      </script>
    `;
  }

  // Pinterest Pixel
  if (pixelSettings.pinterestPixelId) {
    scripts += `
      <script>
        !function(e){if(!window.pintrk){window.pintrk = function () {
        window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
        n=window.pintrk;n.queue=[],n.version="3.0";var
        t=document.createElement("script");t.async=!0,t.src=e;var
        r=document.getElementsByTagName("script")[0];
        r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
        pintrk('load', '${pixelSettings.pinterestPixelId}', {em: '${userEmail || '<user_email_address>'}'});
        pintrk('page');
      </script>
      <noscript>
        <img height="1" width="1" style="display:none" alt=""
        src="https://ct.pinterest.com/v3/?event=init&tid=${pixelSettings.pinterestPixelId}&noscript=1" />
      </noscript>
    `;
  }

  // Snapchat Pixel
  if (pixelSettings.snapchatPixelId) {
    scripts += `
      <script>
        (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
        {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
        a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
        r.src=n;var u=t.getElementsByTagName(s)[0];
        u.parentNode.insertBefore(r,u);})(window,document,
        'https://sc-static.net/scevent.min.js');
        snaptr('init', '${pixelSettings.snapchatPixelId}', {
        'user_email': '${userEmail || '__INSERT_USER_EMAIL__'}'
        });
        snaptr('track', 'PAGE_VIEW');
      </script>
    `;
  }

  // Taboola Pixel
  if (pixelSettings.taboolaPixelId) {
    scripts += `
      <script>
        window._tfa = window._tfa || [];
        window._tfa.push({notify: 'event', name: 'page_view', id: '${pixelSettings.taboolaPixelId}'});
        !function (t, f, a, x) {
          if (!document.getElementById(x)) {
            t.async = 1;
            t.src = a;
            t.id=x;
            f.parentNode.insertBefore(t, f);
          }
        }(document.createElement('script'), document.getElementsByTagName('script')[0], '//cdn.taboola.com/libtrc/unip/${pixelSettings.taboolaPixelId}/tfa.js', 'tb_tfa_script');
      </script>
    `;
  }

  // ShareChat Pixel (Placeholder implementation)
  if (pixelSettings.sharechatPixelId) {
    scripts += `
      <script>
        !function(w, d, t) {
          w.ShareChatPixelObject=t;
          var scp=w[t]=w[t]||[];
          scp.methods=["track","init","page"];
          scp.load=function(e){var s=d.createElement("script");s.async=!0;s.src="https://analytics.sharechat.com/pixel.js?id="+e;var x=d.getElementsByTagName("script")[0];x.parentNode.insertBefore(s,x)};
          scp.init=function(e){scp.push(["init",e])};
          scp.track=function(e){scp.push(["track",e])};
          scp.page=function(){scp.push(["page"])};
          scp.load('${pixelSettings.sharechatPixelId}');
          scp.init('${pixelSettings.sharechatPixelId}');
          scp.page();
        }(window, document, 'scp');
      </script>
    `;
  }

  // Kwai Pixel (Placeholder implementation)
  if (pixelSettings.kwaiPixelId) {
    scripts += `
      <script>
        !function(w, d, t) {
          w.KwaiAnalyticsObject=t;
          var kwp=w[t]=w[t]||[];
          kwp.methods=["init","track","page"];
          kwp.load=function(e){var s=d.createElement("script");s.async=!0;s.src="https://analytics.kwai.com/pixel.js?id="+e;var x=d.getElementsByTagName("script")[0];x.parentNode.insertBefore(s,x)};
          kwp.init=function(e){kwp.push(["init",e])};
          kwp.track=function(e){kwp.push(["track",e])};
          kwp.page=function(){kwp.push(["page"])};
          kwp.load('${pixelSettings.kwaiPixelId}');
          kwp.init('${pixelSettings.kwaiPixelId}');
          kwp.page();
        }(window, document, 'kwp');
      </script>
    `;
  }

  return scripts;
}

// Enhanced visibility checking function
async function checkVisibility(settings: any, productId: string | null, userAgent: string = '', request: Request): Promise<boolean> {
  const visibilityMode = settings.visibilityMode || "both_cart_product";

  // 1. Check if form is disabled globally
  if (visibilityMode === "disabled") {
    return false;
  }

  // 2. Check page-specific visibility
  const url = new URL(request.url);
  const template = url.searchParams.get("template");
  const isCartPage = userAgent.includes('cart') || productId === null;
  const isProductPage = productId !== null;

  if (visibilityMode === "only_cart_page" && !isCartPage) {
    return false;
  }

  if (visibilityMode === "only_product_pages" && !isProductPage) {
    return false;
  }

  // 3. Check home/collection page restrictions
  const isHomePage = template === 'index';
  const isCollectionPage = template === 'collection';

  if (settings.disableOnHome && isHomePage) {
    return false;
  }

  if (settings.disableOnCollections && isCollectionPage) {
    return false;
  }

  // 4. Check specific products restrictions
  if (productId) {
    const simpleProductId = productId.split('/').pop();

    // If enableSpecificProducts is true, only show for selected products
    if (settings.enableSpecificProducts) {
      const visibleProducts = settings.visibleProducts ? JSON.parse(settings.visibleProducts) : [];
      const isInVisibleList = visibleProducts.some((p: any) => p.id.endsWith(simpleProductId));
      if (!isInVisibleList) {
        return false;
      }
    }

    // If disableSpecificProducts is true, hide for selected products
    if (settings.disableSpecificProducts) {
      const hiddenProducts = settings.hiddenProducts ? JSON.parse(settings.hiddenProducts) : [];
      const isInHiddenList = hiddenProducts.some((p: any) => p.id.endsWith(simpleProductId));
      if (isInHiddenList) {
        return false;
      }
    }
  }

  // 5. Check country restrictions
  if (settings.enableSpecificCountries) {
    const allowedCountries = settings.allowedCountries ? JSON.parse(settings.allowedCountries) : [];
    if (allowedCountries.length > 0) {
      const userCountry = url.searchParams.get("country_code");
      if (!userCountry) return false;
      const isCountryAllowed = allowedCountries.some((country: any) => country.code === userCountry);
      if (!isCountryAllowed) {
        return false;
      }
    }
  }

  return true;
}

// Add cart total validation function
async function validateCartAmount(settings: any, request: Request): Promise<boolean> {
  const minimumAmount = parseFloat(settings.minimumAmount || '0');
  const maximumAmount = parseFloat(settings.maximumAmount || '0');

  if (minimumAmount === 0 && maximumAmount === 0) {
    return true; // No limits set
  }

  try {
    // Get cart total from request parameters or headers
    const url = new URL(request.url);
    const cartTotal = parseFloat(url.searchParams.get("cart_total") || "0");

    if (minimumAmount > 0 && cartTotal < minimumAmount) {
      return false;
    }

    if (maximumAmount > 0 && cartTotal > maximumAmount) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating cart amount:', error);
    return true; // Allow if validation fails
  }
}

// Helper function to generate visibility styles
function generateVisibilityStyles(settings: any): string {
  let styles = '<style>';

  // Hide Add to Cart button if setting is enabled
  if (settings.hideAddToCart) {
    styles += `
      form[action="/cart/add"]:not(.easycod-form),
      .product-form__cart-submit,
      .btn.add-to-cart,
      [name="add"]:not(.easycod-form input),
      .shopify-payment-button,
      .product-form__buttons .btn:not(.easycod-btn) {
        display: none !important;
      }
    `;
  }

  // Hide Buy Now button if setting is enabled
  if (settings.hideBuyNow) {
    styles += `
      .shopify-payment-button,
      .dynamic-checkout__content,
      .buy-now-button,
      [data-shopify-buttontext="Buy now"],
      .product-form__buttons .shopify-payment-button {
        display: none !important;
      }
    `;
  }

  styles += '</style>';
  return styles;
}

// Function to mark cart as recovered
async function markCartAsRecovered(sessionId: string, draftOrderId: string): Promise<void> {
  try {
    // Update AbandonedCart to mark it as recovered
    await db.abandonedCart.update({
      where: { sessionId: sessionId },
      data: {
        isRecovered: true,
        recoveryOrderId: draftOrderId,
        recoveredAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error marking cart as recovered:', error);
  }
}

/**
 * LOADER: This runs when a customer visits /apps/codform/proxy.
 * It validates the request, fetches settings, and renders the form with pixel scripts.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const isValid = await validateAppProxyRequest(request);
  if (!isValid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("product_id");

  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }

  const settings = (await db.shopSettings.findUnique({
    where: { shopId: shop },
  })) as ShopSettings | null;

  if (!settings) {
    return new Response(null, { status: 204 });
  }

  // Enhanced visibility check
  const userAgent = request.headers.get('user-agent') || '';
  const isVisible = await checkVisibility(settings, productId, userAgent, request);
  if (!isVisible) {
    return new Response(null, { status: 204 });
  }

  // Validate cart amount
  const isAmountValid = await validateCartAmount(settings, request);
  if (!isAmountValid) {
    return new Response(null, { status: 204 });
  }

  // Get logged-in customer data
  const customerData = await getLoggedInCustomerData(request, shop);

  // Parse pixel settings from the database
  let pixelSettings: PixelSettings = {};
  if (settings.pixelSettings) {
    try {
      pixelSettings = JSON.parse(settings.pixelSettings as string);
    } catch (error) {
      console.error('Failed to parse pixel settings:', error);
    }
  }

  const { formFields, formStyle } = settings;

  // THIS IS THE CORRECTED HTML SHELL
  const proxyHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Complete Your Order</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
      ${generatePixelScripts(pixelSettings)}
      ${generateVisibilityStyles(settings)}
    </head>
    <body>
      <div id="cod-form-root"></div>
      <script id="cod-form-config" type="application/json">
        ${JSON.stringify({
          formFields: JSON.parse(formFields || '[]'),
          formStyle: JSON.parse(formStyle || '{}'),
          submitUrl: `https://${shop}/apps/proxy`, // CORRECTED LINE
          redirectUrl: settings.redirectUrl || '/pages/thank-you',
          pixelSettings,
          visibilitySettings: {
            hideAddToCart: settings.hideAddToCart,
            hideBuyNow: settings.hideBuyNow,
            minimumAmount: settings.minimumAmount,
            maximumAmount: settings.maximumAmount
          },
          customerData
        })}
      </script>
      <script src="/build/entry.client.js"></script>
    </body>
  </html>
`;


  return new Response(proxyHtml, {
    headers: { "Content-Type": "text/html" },
  });
}

// GraphQL Mutations
const CREATE_DRAFT_ORDER_MUTATION = `#graphql
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        invoiceUrl
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const COMPLETE_DRAFT_ORDER_MUTATION = `#graphql
  mutation draftOrderComplete($id: ID!) {
    draftOrderComplete(id: $id) {
      draftOrder {
        status
        order {
          id
          name
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * ACTION: This runs when the customer SUBMITS the form.
 * It validates the request, checks blocking rules, creates a Draft Order,
 * completes it, and redirects the customer to the thank you page.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const isValid = await validateAppProxyRequest(request);
  if (!isValid) {
    return json({ success: false, error: "Authentication failed." }, { status: 401 });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    return json({ success: false, error: "Shop parameter is missing." }, { status: 400 });
  }

  const settings = (await db.shopSettings.findUnique({
    where: { shopId: shop },
  })) as ShopSettings | null;

  if (!settings) {
    return json({ success: false, error: "App configuration not found." }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const customerIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "not-found";
    
    // Combine first and last name if they exist
    const firstName = formData.get("firstName") as string || '';
    const lastName = formData.get("lastName") as string || '';
    const fullName = formData.get("full-name") as string || `${firstName} ${lastName}`.trim();

    
const shippingAddress = {
  firstName: firstName || fullName.split(' ')[0] || 'Customer',
  lastName: lastName || fullName.split(' ').slice(1).join(' ') || 'Name',
  address1: formData.get("address") as string || 'No Address Provided',
  address2: formData.get("address2") as string,
  city: communeLabel || (formData.get("city") as string) || 'Unknown',
  province: wilayaLabel || (formData.get("province") as string),
  zip: formData.get("zip-code") as string,
  country: url.searchParams.get("country_code") || 'DZ',
  phone: formData.get("phone") as string,
};

    // USER BLOCKING ENFORCEMENT LOGIC
    const userBlocking: UserBlockingSettings = settings.userBlocking
      ? JSON.parse(settings.userBlocking as string)
      : {
          limitSameCustomerOrders: false,
          limitSameCustomerHours: "24",
          blockByQuantity: false,
          blockQuantityAmount: "5",
          blockedEmails: "",
          blockedPhoneNumbers: "",
          blockedIps: "",
          allowedIps: "",
          blockedMessage: "Your order could not be processed at this time.",
          postalCodeMode: "none",
          postalCodeList: "",
          enableRiskScoring: false,
          autoRejectHighRisk: false,
        };

    const blockedMessage = userBlocking.blockedMessage || "Your order could not be processed.";

    const allowedIps = userBlocking.allowedIps.split('\n').map(ip => ip.trim()).filter(Boolean);
    const isIpWhitelisted = allowedIps.length > 0 && allowedIps.includes(customerIp);

    // Only run the blocking checks if the IP is NOT whitelisted
    if (!isIpWhitelisted) {
      const lineItemsString = formData.get("lineItems") as string;
      const lineItems = JSON.parse(lineItemsString || '[]');
      const customerEmail = (formData.get("email") as string || "").toLowerCase().trim();
      const customerPhone = (formData.get("phone") as string || "").replace(/\D/g, "");
      const customerPostalCode = (formData.get("zip-code") as string || "").toUpperCase().trim();

      // Risk scoring
      if (userBlocking.enableRiskScoring) {
        const cartDataString = formData.get("cartData") as string;
        const cartData = JSON.parse(cartDataString);
        const riskFactors = {
          customerIp,
          customerEmail: customerEmail || '',
          customerPhone: customerPhone || '',
          shippingAddress: {
            address1: shippingAddress.address1 || '',
            city: shippingAddress.city || '',
            province: shippingAddress.province || '',
            zip: shippingAddress.zip || '',
            country: shippingAddress.country || '',
          },
          orderValue: cartData.total_price / 100,
          itemCount: cartData.item_count,
        };

        const riskScore = await calculateRiskScore(riskFactors, shop);

        console.log(`🎯 Risk Score: ${riskScore.score}/100 - ${riskScore.recommendation}`);
        console.log(`📊 Risk Factors:`, riskScore.factors);

        if (userBlocking.autoRejectHighRisk && riskScore.recommendation === 'reject') {
          return json({
            success: false,
            error: blockedMessage,
            riskScore: riskScore.score
          }, { status: 403 });
        }
      }

      // 1. Block by IP Address
      const blockedIps = userBlocking.blockedIps.split('\n').map(ip => ip.trim()).filter(Boolean);
      if (blockedIps.includes(customerIp)) {
        return json({ success: false, error: blockedMessage }, { status: 403 });
      }

      // 2. Block by Email Address
      const blockedEmails = userBlocking.blockedEmails.split('\n').map(e => e.toLowerCase().trim()).filter(Boolean);
      if (customerEmail && blockedEmails.includes(customerEmail)) {
        return json({ success: false, error: blockedMessage }, { status: 403 });
      }

      // 3. Block by Phone Number
      const blockedPhones = userBlocking.blockedPhoneNumbers.split('\n').map(p => p.replace(/\D/g, "")).filter(Boolean);
      if (customerPhone && blockedPhones.includes(customerPhone)) {
        return json({ success: false, error: blockedMessage }, { status: 403 });
      }

      // 4. Block by Order Quantity
      if (userBlocking.blockByQuantity) {
        const totalQuantity = lineItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        if (totalQuantity > parseInt(userBlocking.blockQuantityAmount, 10)) {
          return json({ success: false, error: blockedMessage }, { status: 403 });
        }
      }

      // 5. Geographic (Postal Code) Restrictions
      if (userBlocking.postalCodeMode !== 'none' && customerPostalCode) {
        const postalCodeList = userBlocking.postalCodeList.split('\n').map(pc => pc.toUpperCase().trim()).filter(Boolean);
        if (userBlocking.postalCodeMode === 'exclude' && postalCodeList.includes(customerPostalCode)) {
          return json({ success: false, error: blockedMessage }, { status: 403 });
        }
        if (userBlocking.postalCodeMode === 'allow' && !postalCodeList.includes(customerPostalCode)) {
          return json({ success: false, error: blockedMessage }, { status: 403 });
        }
      }

      // 6. Limit Repeat Orders from Same Customer
      if (userBlocking.limitSameCustomerOrders) {
        const hours = parseInt(userBlocking.limitSameCustomerHours, 10);
        const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000);

        const recentOrder = await db.orderTracking.findFirst({
          where: {
            shopId: shop,
            createdAt: { gte: timeLimit },
            OR: [
              { customerIp: customerIp },
              { customerEmail: customerEmail },
              { customerPhone: customerPhone },
            ].filter(condition => Object.values(condition)[0]),
          },
        });

        if (recentOrder) {
          return json({ success: false, error: blockedMessage }, { status: 403 });
        }
      }
    }

    const { admin } = await unauthenticated.admin(shop);
    if (!admin) {
      return json({ success: false, error: "Could not authenticate with Shopify." }, { status: 401 });
    }

    const lineItemsString = formData.get("lineItems") as string;
    if (!lineItemsString) {
      return json({ success: false, error: "Cart information is missing." }, { status: 400 });
    }
    const lineItems = JSON.parse(lineItemsString);
    const userEmail = (formData.get("email") as string) || '';

    // Step 1: Create the Draft Order
    const createResponse = await admin.graphql(
      CREATE_DRAFT_ORDER_MUTATION,
      {
        variables: {
          input: {
            lineItems: lineItems,
            shippingAddress: {
              ...shippingAddress,
              firstName: shippingAddress.firstName || 'Customer',
              lastName: shippingAddress.lastName || 'Name',
              address1: shippingAddress.address1 || 'No Address Provided',
              city: shippingAddress.city || 'Unknown',
              country: shippingAddress.country || 'DZ',
            },
            tags: ["EasyCOD", "Cash on Delivery"],
            note: formData.get("order-note") as string || '',
            email: userEmail || undefined,
            useCustomerDefaultAddress: false,
          },
        },
      }
    );

    const createData = await createResponse.json();
    if (createData.data.draftOrderCreate.userErrors.length > 0) {
      console.error("Error creating draft order:", createData.data.draftOrderCreate.userErrors);
      return json({ success: false, error: createData.data.draftOrderCreate.userErrors[0].message }, { status: 400 });
    }

    const draftOrderId = createData.data.draftOrderCreate.draftOrder.id;
    if (!draftOrderId) {
      throw new Error("Failed to get draft order ID after creation.");
    }
    
    console.log(`✅ Step 1: Draft Order created successfully: ${draftOrderId}`);

    // Step 2: COMPLETE the Draft Order
    const completeResponse = await admin.graphql(
      COMPLETE_DRAFT_ORDER_MUTATION,
      { variables: { id: draftOrderId } }
    );
    const completeData = await completeResponse.json();

    if (completeData.data.draftOrderComplete.userErrors.length > 0) {
      console.error("CRITICAL: Error completing draft order:", completeData.data.draftOrderComplete.userErrors);
      return json({ success: false, error: "Your order was received but could not be finalized. Please contact support." }, { status: 500 });
    }
    
    const finalOrder = completeData.data.draftOrderComplete.draftOrder.order;
    console.log(`✅ Step 2: Order completed successfully: ${finalOrder.name}`);
    
    const cartDataString = formData.get("cartData") as string;
    const cartData = JSON.parse(cartDataString);
    await db.orderTracking.create({
      data: {
        shopId: shop,
        draftOrderId: draftOrderId,
        customerIp: customerIp,
        customerEmail: userEmail.toLowerCase().trim(),
        customerPhone: (shippingAddress.phone || "").replace(/\D/g, ""),
        customerPostalCode: (shippingAddress.zip || "").toUpperCase().trim(),
        totalQuantity: cartData.item_count,
        orderTotal: cartData.total_price / 100,
        currency: cartData.currency,
      },
    });

    const sessionId = formData.get("sessionId") as string;
    if (sessionId) {
      await markCartAsRecovered(sessionId, draftOrderId);
    }

    // Step 3: REDIRECT to Thank You Page
    const redirectUrl = settings.redirectUrl || `/pages/thank-you`;
    return redirect(`https://${shop}${redirectUrl}`);

  } catch (error) {
    console.error("Server Error:", error);
    return json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}