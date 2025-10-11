// 📁 app/routes/submit.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import db from "../db.server";
import { calculateRiskScore } from "./riskScoring"; // Make sure this path is correct!

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
// It will now handle POST requests to /apps/proxy/submit.
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

        const createResponse = await admin.graphql(CREATE_DRAFT_ORDER_MUTATION, {
            variables: {
                input: {
                    lineItems: lineItems,
                    shippingAddress: { ...shippingAddress },
                    tags: ["EasyCOD", "Cash on Delivery"],
                    note: formData.get("order-note") as string || '',
                    email: userEmail || undefined,
                    useCustomerDefaultAddress: false,
                },
            },
        });

        const createData = await createResponse.json();
        if (createData.data.draftOrderCreate.userErrors.length > 0) {
            console.error("Error creating draft order:", createData.data.draftOrderCreate.userErrors);
            return json({ success: false, error: createData.data.draftOrderCreate.userErrors[0].message }, { status: 400 });
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

        const redirectUrl = settings.redirectUrl || `/pages/thank-you`;
        return redirect(`https://${shop}${redirectUrl}`);

    } catch (error) {
        console.error("Server Error:", error);
        return json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
    }
};