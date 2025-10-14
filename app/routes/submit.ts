// 📁 app/routes/submit.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import crypto from "crypto";
import { unauthenticated, default as shopify } from "../shopify.server";
import db from "../db.server";
import { calculateRiskScore } from "../utils/riskScoring.server"; // Server-only risk scoring logic
import { shopifyEnv } from "../utils/env.server";
import { initializeShopSettings } from "../utils/shopSettings";

// =================================================================
// PASTE ALL YOUR HELPER FUNCTIONS & TYPE DEFINITIONS HERE
// (calculateHmac, validateAppProxyRequest, ShopSettings, etc.)
// from your original big proxy file. I've added them for you below.
// =================================================================

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
    redirectUrl: string | null;
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
function calculateHmac(data: string, secret: string): string {
    return crypto
        .createHmac("sha256", secret)
        .update(data, 'utf8')
        .digest("hex");
}

// Helper function for HMAC validation
async function validateAppProxyRequest(request: Request): Promise<boolean> {
    console.log("🔍 Validating app proxy request");
    console.log("🔍 Request URL:", request.url);
    
    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);

    const signature = params.get("signature");
    console.log("🔍 Signature from URL:", signature);
    if (!signature) {
        console.log("❌ No signature found in URL");
        return false;
    }

    const apiSecret = shopifyEnv.apiSecret;
    console.log("🔍 API Secret available:", !!apiSecret);
    if (!apiSecret) {
        console.error("❌ SHOPIFY_API_SECRET is not defined");
        return false;
    }

    // Build the string to sign according to Shopify's specification
    // 1. Remove the signature parameter
    params.delete("signature");
    
    // 2. Get all remaining parameters and sort them lexicographically by key
    const paramEntries: Array<[string, string]> = [];
    for (const [key, value] of params.entries()) {
        paramEntries.push([key, value || '']); // Handle empty values
    }
    
    // 3. Sort by key name (lexicographically) - this is crucial for Shopify validation
    paramEntries.sort(([a], [b]) => a.localeCompare(b));
    
    // 4. Build the canonical query string - Shopify app proxy uses concatenated key=value pairs WITHOUT separators
    const stringToSign = paramEntries
        .map(([key, value]) => `${key}=${value}`)
        .join("");

    // Debug: Log all parameters to understand the structure
    console.log("🔍 All parameters:");
    paramEntries.forEach(([key, value]) => {
        console.log(`  ${key}=${value}`);
    });

    const calculatedHmac = calculateHmac(stringToSign, apiSecret);
    
    console.log("🔍 String to sign:", stringToSign);
    console.log("🔍 String to sign (bytes):", Buffer.from(stringToSign, 'utf8').toString('hex'));
    console.log("🔍 API Secret (first 8 chars):", apiSecret.substring(0, 8) + "...");
    console.log("🔍 Calculated HMAC:", calculatedHmac);
    console.log("🔍 Received signature:", signature);
    console.log("🔍 HMAC match:", calculatedHmac.toLowerCase() === signature.toLowerCase());
    
    // Try alternative HMAC calculation methods for debugging
    const altHmac1 = crypto.createHmac("sha256", apiSecret).update(stringToSign, 'utf8').digest("hex");
    const altHmac2 = crypto.createHmac("sha256", Buffer.from(apiSecret, 'utf8')).update(stringToSign, 'utf8').digest("hex");
    console.log("🔍 Alternative HMAC 1:", altHmac1);
    console.log("🔍 Alternative HMAC 2:", altHmac2);
    
    // Compare signatures case-insensitively
    return calculatedHmac.toLowerCase() === signature.toLowerCase();
}

// Function to mark cart as recovered
async function markCartAsRecovered(sessionId: string, draftOrderId: string): Promise<void> {
    try {
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

// GraphQL Mutations
const CREATE_DRAFT_ORDER_MUTATION = `#graphql
    mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
            draftOrder { id name invoiceUrl status }
            userErrors { field message }
        }
    }`;

const COMPLETE_DRAFT_ORDER_MUTATION = `#graphql
    mutation draftOrderComplete($id: ID!) {
        draftOrderComplete(id: $id) {
            draftOrder { status order { id name } }
            userErrors { field message }
        }
    }`;


// --- LOADER ---
// This route is only for POST requests. If someone tries to visit it directly (GET),
// we tell them the method is not allowed. This is a good practice.
export const loader = async ({ request }: LoaderFunctionArgs) => {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
};


// --- ACTION ---
// This is your original action function, moved here from the old file.
// It will now handle POST requests to /apps/proxy/submit directly.
export const action = async ({ request }: ActionFunctionArgs) => {
    console.log("🎯 submit.ts ACTION handler called");
    console.log("🔍 Request URL:", request.url);
    console.log("🔍 Request method:", request.method);
    
    try {
        const isValid = await validateAppProxyRequest(request);
        console.log("🔍 HMAC validation result:", isValid);
        if (!isValid) {
            console.log("❌ HMAC validation failed");
            return json({ success: false, error: "Authentication failed." }, { status: 401 });
        }
        console.log("✅ HMAC validation passed");
    } catch (error) {
        console.error("❌ Error during HMAC validation:", error);
        return json({ success: false, error: "Authentication validation failed." }, { status: 401 });
    }

    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    console.log("🔍 Shop parameter:", shop);
    if (!shop) {
        console.log("❌ Shop parameter is missing");
        return json({ success: false, error: "Shop parameter is missing." }, { status: 400 });
    }

    console.log("🔍 Initializing shop settings for:", shop);
    await initializeShopSettings(shop);
    
    console.log("🔍 Looking up shop settings for:", shop);
    const settings = (await db.shopSettings.findUnique({
        where: { shopId: shop },
    })) as ShopSettings | null;

    console.log("🔍 Shop settings found:", !!settings);
    if (!settings) {
        console.log("❌ App configuration not found for shop:", shop);
        console.log("🔍 This usually means the app hasn't been installed yet.");
        console.log("🔍 Redirecting to app installation...");
        
        // Return a proper error response that can be handled by the frontend
        return json({ 
            success: false, 
            error: "App not installed. Please install the app first.",
            redirectToInstall: true,
            installUrl: `https://admin.shopify.com/store/${shop.split('.')[0]}/oauth/install?client_id=${process.env.SHOPIFY_API_KEY}`
        }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const customerIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "not-found";

        const firstName = formData.get("firstName") as string || '';
        const lastName = formData.get("lastName") as string || '';
        const fullName = formData.get("full-name") as string || `${firstName} ${lastName}`.trim();

        const wilayaLabel = formData.get('wilaya_label') as string;
        const communeLabel = formData.get('commune_label') as string;
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

        if (!isIpWhitelisted) {
            const lineItemsString = formData.get("lineItems") as string;
            const lineItems = JSON.parse(lineItemsString || '[]');
            const customerEmail = (formData.get("email") as string || "").toLowerCase().trim();
            const customerPhone = (formData.get("phone") as string || "").replace(/\D/g, "");
            const customerPostalCode = (formData.get("zip-code") as string || "").toUpperCase().trim();

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
                if (userBlocking.autoRejectHighRisk && riskScore.recommendation === 'reject') {
                    return json({ success: false, error: blockedMessage, riskScore: riskScore.score }, { status: 403 });
                }
            }
            const blockedIps = userBlocking.blockedIps.split('\n').map(ip => ip.trim()).filter(Boolean);
            if (blockedIps.includes(customerIp)) {
                return json({ success: false, error: blockedMessage }, { status: 403 });
            }
            const blockedEmails = userBlocking.blockedEmails.split('\n').map(e => e.toLowerCase().trim()).filter(Boolean);
            if (customerEmail && blockedEmails.includes(customerEmail)) {
                return json({ success: false, error: blockedMessage }, { status: 403 });
            }
            const blockedPhones = userBlocking.blockedPhoneNumbers.split('\n').map(p => p.replace(/\D/g, "")).filter(Boolean);
            if (customerPhone && blockedPhones.includes(customerPhone)) {
                return json({ success: false, error: blockedMessage }, { status: 403 });
            }
            if (userBlocking.blockByQuantity) {
                const totalQuantity = lineItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
                if (totalQuantity > parseInt(userBlocking.blockQuantityAmount, 10)) {
                    return json({ success: false, error: blockedMessage }, { status: 403 });
                }
            }
            if (userBlocking.postalCodeMode !== 'none' && customerPostalCode) {
                const postalCodeList = userBlocking.postalCodeList.split('\n').map(pc => pc.toUpperCase().trim()).filter(Boolean);
                if (userBlocking.postalCodeMode === 'exclude' && postalCodeList.includes(customerPostalCode)) {
                    return json({ success: false, error: blockedMessage }, { status: 403 });
                }
                if (userBlocking.postalCodeMode === 'allow' && !postalCodeList.includes(customerPostalCode)) {
                    return json({ success: false, error: blockedMessage }, { status: 403 });
                }
            }
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

        // Use unauthenticated admin with proper error handling
        console.log("🔍 Creating admin context for shop:", shop);
        let admin;
        try {
            const adminResult = await unauthenticated.admin(shop);
            admin = adminResult.admin;
            if (!admin) {
                console.error(`❌ Could not create admin context for ${shop}. App may need to be reinstalled.`);
                return json({ success: false, error: "Could not authenticate with Shopify. Please reinstall the app." }, { status: 401 });
            }
            console.log("✅ Admin API client created successfully");
        } catch (error) {
            console.error(`❌ Error creating admin context for ${shop}:`, error);
            if (error instanceof Error && error.message.includes('SessionNotFoundError')) {
                return json({ 
                    success: false, 
                    error: "App session not found. Please reinstall the app in your Shopify admin to continue.",
                    action: "reinstall_app"
                }, { status: 401 });
            }
            return json({ success: false, error: "Could not authenticate with Shopify. Please reinstall the app." }, { status: 401 });
        }

        // Check for lineItems (old format) or product_variant_id (new format)
        const lineItemsString = formData.get("lineItems") as string;
        const productVariantId = formData.get("product_variant_id") as string;
        const productQuantity = formData.get("product_quantity") as string;
        
        console.log("🔍 Form data received:");
        console.log("  lineItemsString:", lineItemsString);
        console.log("  productVariantId:", productVariantId);
        console.log("  productQuantity:", productQuantity);
        
        let lineItems = [];
        
        if (lineItemsString) {
            // Old format - parse lineItems JSON
            console.log("📦 Using old format - parsing lineItems JSON");
            lineItems = JSON.parse(lineItemsString);
        } else if (productVariantId) {
            // New format - create line item from product variant
            console.log("📦 Using new format - creating line item from product variant");
            lineItems = [{
                variantId: productVariantId,
                quantity: parseInt(productQuantity || "1", 10),
                requiresShipping: true
            }];
        }
        
        // Handle empty cart - create a custom line item for inquiry/order
        if (!lineItems || lineItems.length === 0) {
            console.log("🛒 Empty cart detected, creating custom inquiry line item");
            lineItems = [{
                title: "Custom Inquiry/Order",
                quantity: 1,
                price: "0.00",
                requiresShipping: true,
                taxable: false,
                variantId: null,
                customAttributes: [
                    { key: "Order Type", value: "Custom Inquiry" },
                    { key: "Customer Request", value: formData.get("order-note") as string || "Custom order inquiry" }
                ]
            }];
        }
        
        const userEmail = (formData.get("email") as string) || '';

        console.log("🛒 Creating draft order with lineItems:", JSON.stringify(lineItems, null, 2));
        console.log("📦 Shipping address:", JSON.stringify(shippingAddress, null, 2));
        console.log("📧 User email:", userEmail);
        console.log("📝 Order note:", formData.get("order-note"));
        
        const mutationInput = {
            lineItems: lineItems,
            shippingAddress: { ...shippingAddress },
            tags: ["EasyCOD", "Cash on Delivery", "Custom Inquiry"],
            note: formData.get("order-note") as string || '',
            email: userEmail || undefined,
            useCustomerDefaultAddress: false,
        };
        
        console.log("🔍 GraphQL mutation input:", JSON.stringify(mutationInput, null, 2));
        
        let createResponse;
        try {
            createResponse = await admin.graphql(CREATE_DRAFT_ORDER_MUTATION, {
                variables: {
                    input: mutationInput,
                },
            });
            console.log("✅ GraphQL mutation completed successfully");
        } catch (error: unknown) {
            console.error("❌ GraphQL mutation failed:", error);
            if (error instanceof Error) {
                return json({ success: false, error: "Failed to create draft order: " + error.message }, { status: 500 });
            }
            return json({ success: false, error: "Failed to create draft order" }, { status: 500 });
        }

        const createData = await createResponse.json();
        console.log("📋 Draft order creation response:", JSON.stringify(createData, null, 2));
        
        if (createData.data?.draftOrderCreate?.userErrors?.length > 0) {
            console.error("Error creating draft order:", createData.data.draftOrderCreate.userErrors);
            return json({ success: false, error: createData.data.draftOrderCreate.userErrors[0].message }, { status: 400 });
        }
        
        if (!createData.data?.draftOrderCreate?.draftOrder) {
            console.error("No draft order returned:", createData);
            return json({ success: false, error: "Failed to create draft order." }, { status: 500 });
        }

        const draftOrderId = createData.data.draftOrderCreate.draftOrder.id;
        if (!draftOrderId) {
            throw new Error("Failed to get draft order ID after creation.");
        }

        const completeResponse = await admin.graphql(COMPLETE_DRAFT_ORDER_MUTATION, { variables: { id: draftOrderId } });
        const completeData = await completeResponse.json();
        if (completeData.data.draftOrderComplete.userErrors.length > 0) {
            console.error("CRITICAL: Error completing draft order:", completeData.data.draftOrderComplete.userErrors);
            return json({ success: false, error: "Your order was received but could not be finalized. Please contact support." }, { status: 500 });
        }

        const finalOrder = completeData.data.draftOrderComplete.draftOrder.order;
        console.log(`✅ Order completed successfully: ${finalOrder.name}`);

        const cartDataString = formData.get("cartData") as string;
        let cartData = { item_count: 0, total_price: 0, currency: 'DZD' };
        
        if (cartDataString) {
            try {
                cartData = JSON.parse(cartDataString);
            } catch (error) {
                console.log("⚠️ Could not parse cart data, using defaults for empty cart");
            }
        }
        
        // For empty carts or when using product_variant_id format, calculate from lineItems
        if (cartData.item_count === 0 || productVariantId) {
            cartData.item_count = lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
            cartData.total_price = 0; // Will be calculated by Shopify for product variants
            cartData.currency = 'DZD';
        }
        
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

        const redirectUrl = settings.redirectUrl || `/pages/thank-you`;
        return redirect(`https://${shop}${redirectUrl}`);

    } catch (error) {
        console.error("Server Error:", error);
        return json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
    }
};