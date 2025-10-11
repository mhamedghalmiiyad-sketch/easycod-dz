import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";

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
    // ✅ Server-only import moved inside the function
    const { unauthenticated } = await import("../shopify.server");
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
    // ✅ Server-only import moved inside the function
    const { default: db } = await import("../db.server");
    // Update AbandonedCart to mark it as recovered
    await db.abandonedCart.update({
      where: { sessionId: sessionId }, // Use sessionId as the unique identifier
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
 * LOADER: This runs when a customer visits /apps/proxy.
 * It validates the request, fetches settings, and renders the form with pixel scripts.
 * Now includes preview functionality.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // ✅ Server-only imports moved inside the loader
  const { default: db } = await import("../db.server");
  const { unauthenticated } = await import("../shopify.server");

  const url = new URL(request.url);
  const isPreview = url.searchParams.get("preview") === "true";
  const shop = url.searchParams.get("shop");

  // For previews, we don't need HMAC validation
  if (!isPreview) {
    const isValid = await validateAppProxyRequest(request);
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }

  const settings = await db.shopSettings.findUnique({
    where: { shopId: shop },
  });

  if (!settings) {
    if (isPreview) {
      return new Response("App not configured.", { status: 204 });
    }
    return new Response(null, { status: 204 });
  }

  // --- PREVIEW LOGIC ---
  if (isPreview) {
    const { admin } = await unauthenticated.admin(shop);
const productResponse = await admin.graphql(
    `#graphql
      query GetFirstProduct {
        products(first: 1, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              title
              handle
              featuredMedia {
                ...on MediaImage {
                  image {
                    url
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                  }
                }
              }
            }
          }
        }
      }`
);
    
    const productData = await productResponse.json();
    const firstProduct = productData.data.products.edges[0]?.node;

    if (!firstProduct) {
      return new Response("No products found to generate a preview.", { status: 404 });
    }

    const formConfig = {
      shop: shop,
      product: {
        id: firstProduct.id,
        title: firstProduct.title,
        handle: firstProduct.handle,
        variantId: firstProduct.variants.edges[0]?.node.id,
        price: firstProduct.variants.edges[0]?.node.price,
        imageUrl: firstProduct.featuredMedia?.image?.url,
      },
      formFields: settings.formFields ? JSON.parse(settings.formFields) : [],
      formStyle: settings.formStyle ? JSON.parse(settings.formStyle) : {},
      pixelSettings: settings.pixelSettings ? JSON.parse(settings.pixelSettings) : {},
      visibilitySettings: {
        hideAddToCart: settings.hideAddToCart,
        hideBuyNow: settings.hideBuyNow,
        minimumAmount: settings.minimumAmount,
        maximumAmount: settings.maximumAmount
      },
      submitUrl: `/apps/codform/submit`, // Use your subpath
      isPreview: true,
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>EasyCOD Form Preview</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <div id="easycod-form-root"></div>
          <script id="__EASYCOD_FORM_CONFIG__" type="application/json">
            ${JSON.stringify(formConfig)}
          </script>
          <script src="/form-renderer.js" defer></script>
        </body>
      </html>`;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  // --- REGULAR (LIVE) FORM LOGIC ---
  const productId = url.searchParams.get("product_id");

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

  // Add settings to the configuration passed to frontend
  const proxyHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Complete Your Order</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${generatePixelScripts(pixelSettings)}
        ${generateVisibilityStyles(settings)}
      </head>
      <body>
        <div id="easycod-form-root"></div>
        <script id="__EASYCOD_FORM_CONFIG__" type="application/json">
          ${JSON.stringify({
            formFields,
            formStyle,
            submitUrl: url.pathname + url.search,
            redirectUrl: '/pages/thank-you',
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
        <script src="/form-renderer.js" defer></script>
      </body>
    </html>
  `;

  return new Response(proxyHtml, {
    headers: { "Content-Type": "application/liquid" },
  });
};

/**
 * ACTION: This runs when the customer SUBMITS the form.
 * It validates the request, CHECKS BLOCKING RULES, creates a Draft Order,
 * and returns purchase data for pixel tracking.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  // ✅ Server-only imports moved inside the action
  const { default: db } = await import("../db.server");
  const { unauthenticated } = await import("../shopify.server");
  const { calculateRiskScore } = await import("./riskScoring.server");

  const isValid = await validateAppProxyRequest(request);
  if (!isValid) {
    return json({ success: false, error: "Authentication failed." }, { status: 401 });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    return json({ success: false, error: "Shop parameter is missing." }, { status: 400 });
  }

  // Fetch all settings at once
  const settings = await db.shopSettings.findUnique({ where: { shopId: shop } });
  if (!settings) {
    return json({ success: false, error: "App configuration not found." }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const customerIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "not-found";
    const shippingAddress = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      address1: formData.get("address") as string,
      address2: formData.get("address2") as string,
      city: formData.get("city") as string,
      province: formData.get("province") as string,
      zip: formData.get("zip-code") as string,
      country: url.searchParams.get("country_code") || "DZ",
      phone: formData.get("phone") as string,
    };
    
    // =================================================================
    // START: USER BLOCKING ENFORCEMENT LOGIC
    // =================================================================
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

    // 1. Check for Allowed IPs (Whitelist) - This bypasses all other rules
    const allowedIps = userBlocking.allowedIps.split('\n').map(ip => ip.trim()).filter(Boolean);
    if (allowedIps.length > 0 && allowedIps.includes(customerIp)) {
      // This IP is whitelisted, so we skip all other checks
    } else {
      // If not whitelisted, proceed with blocking checks
      const lineItemsString = formData.get("lineItems") as string;
      const lineItems = JSON.parse(lineItemsString || '[]');
      const customerEmail = (formData.get("email") as string || "").toLowerCase().trim();
      const customerPhone = (formData.get("phone") as string || "").replace(/\D/g, "");
      const customerPostalCode = (formData.get("zip-code") as string || "").toUpperCase().trim();

      // NEW: Risk scoring
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
        
        // Log the risk assessment
        console.log(`🎯 Risk Score: ${riskScore.score}/100 - ${riskScore.recommendation}`);
        console.log(`📊 Risk Factors:`, riskScore.factors);

        // Auto-reject high risk orders if enabled
        if (userBlocking.autoRejectHighRisk && riskScore.recommendation === 'reject') {
          return json({ 
            success: false, 
            error: blockedMessage,
            riskScore: riskScore.score
          }, { status: 403 });
        }
      }

      // 2. Block by IP Address
      const blockedIps = userBlocking.blockedIps.split('\n').map(ip => ip.trim()).filter(Boolean);
      if (blockedIps.length > 0 && blockedIps.includes(customerIp)) {
        return json({ success: false, error: blockedMessage }, { status: 403 });
      }

      // 3. Block by Email Address
      const blockedEmails = userBlocking.blockedEmails.split('\n').map(e => e.toLowerCase().trim()).filter(Boolean);
      if (customerEmail && blockedEmails.length > 0 && blockedEmails.includes(customerEmail)) {
        return json({ success: false, error: blockedMessage }, { status: 403 });
      }

      // 4. Block by Phone Number
      const blockedPhones = userBlocking.blockedPhoneNumbers.split('\n').map(p => p.replace(/\D/g, "")).filter(Boolean);
      if (customerPhone && blockedPhones.length > 0 && blockedPhones.includes(customerPhone)) {
        return json({ success: false, error: blockedMessage }, { status: 403 });
      }

      // 5. Block by Order Quantity
      if (userBlocking.blockByQuantity) {
        const totalQuantity = lineItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        if (totalQuantity > parseInt(userBlocking.blockQuantityAmount, 10)) {
          return json({ success: false, error: blockedMessage }, { status: 403 });
        }
      }

      // 6. Geographic (Postal Code) Restrictions
      if (userBlocking.postalCodeMode !== 'none' && customerPostalCode) {
        const postalCodeList = userBlocking.postalCodeList.split('\n').map(pc => pc.toUpperCase().trim()).filter(Boolean);
        if (userBlocking.postalCodeMode === 'exclude' && postalCodeList.includes(customerPostalCode)) {
          return json({ success: false, error: blockedMessage }, { status: 403 });
        }
        if (userBlocking.postalCodeMode === 'allow' && !postalCodeList.includes(customerPostalCode)) {
          return json({ success: false, error: blockedMessage }, { status: 403 });
        }
      }

      // 7. Limit Repeat Orders from Same Customer
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
    // =================================================================
    // END: USER BLOCKING ENFORCEMENT LOGIC
    // =================================================================

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

    const response = await admin.graphql(
      `#graphql
        mutation draftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder { id invoiceUrl status }
            userErrors { field message }
          }
        }`,
      {
        variables: {
          input: {
            lineItems: lineItems,
            shippingAddress: shippingAddress,
            tags: ["EasyCOD", "Cash on Delivery"],
            note: formData.get("order-note") as string,
            email: userEmail,
          },
        },
      }
    );

    const data = await response.json() as DraftOrderCreateResponse;

    if (data.errors || (data.data && data.data.draftOrderCreate.userErrors.length > 0)) {
      console.error("GraphQL Error:", data.errors || data.data?.draftOrderCreate.userErrors);
      return json({ success: false, error: "Could not create your order. Please check your information." }, { status: 500 });
    }

    const draftOrder = data.data?.draftOrderCreate.draftOrder;
    if (!draftOrder) {
      return json({ success: false, error: "Failed to create draft order." }, { status: 500 });
    }

    // START: NEW - Save data for future time-based checks
    const cartDataString = formData.get("cartData") as string;
    const cartData = JSON.parse(cartDataString);
    const orderTracking = await db.orderTracking.create({
      data: {
        shopId: shop,
        draftOrderId: draftOrder.id,
        customerIp: customerIp,
        customerEmail: userEmail.toLowerCase().trim(),
        customerPhone: (shippingAddress.phone || "").replace(/\D/g, ""),
        customerPostalCode: (shippingAddress.zip || "").toUpperCase().trim(),
        totalQuantity: cartData.item_count,
        orderTotal: cartData.total_price / 100,
        currency: cartData.currency,
      },
    });

    let pixelSettings: PixelSettings = {};
    if (settings?.pixelSettings) {
      try {
        pixelSettings = JSON.parse(settings.pixelSettings as string);
      } catch (error) {
        console.error('Failed to parse pixel settings:', error);
      }
    }

    const result = {
      success: true,
      orderId: draftOrder.id,
      purchaseData: {
        value: cartData.total_price / 100,
        currency: cartData.currency,
        items: lineItems,
        pixelSettings
      }
    };

    // NEW: Mark cart as recovered if sessionId is provided
    if (result.success && result.orderId) {
      const sessionId = formData.get("sessionId") as string;
      if (sessionId) {
        await markCartAsRecovered(sessionId, result.orderId);
      }
    }

    return json(result);

  } catch (error) {
    console.error("Server Error:", error);
    return json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
};