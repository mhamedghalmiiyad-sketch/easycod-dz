import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { getAuthenticate } from "\.\.\/lib\/shopify\.lazy\.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return redirect("/app");
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    
    // Get current settings from database
    const settings = await db.shopSettings.findUnique({
      where: { shopId: session.shop },
    });

    if (!settings) {
      return json({ success: false, error: "No settings found" }, { status: 404 });
    }

    // Get shop GID
    const shopIdQueryResponse = await admin.graphql("query { shop { id } }");
    const shopIdQueryResult = await shopIdQueryResponse.json();
    const shopGid = shopIdQueryResult.data?.shop?.id;

    if (!shopGid) {
      return json({ success: false, error: "Could not retrieve shop GID" }, { status: 500 });
    }

    // Create updated configuration with correct URLs
    const fullConfigForStorefront = {
      formFields: JSON.parse(settings.formFields || '[]'),
      formStyle: JSON.parse(settings.formStyle || '{}'),
      shippingRates: JSON.parse(settings.shippingRates || '[]'),
      lastUpdated: new Date().toISOString(),
      // ✅ FIXED: Correct URLs
      submitUrl: `https://${session.shop}/apps/proxy/submit`,
      appUrl: `https://${session.shop}/apps/proxy`,
    };

    console.log('🔧 Updating form configuration with correct URLs:', {
      submitUrl: fullConfigForStorefront.submitUrl,
      appUrl: fullConfigForStorefront.appUrl,
    });

    // Update metafield
    const metafieldResponse = await admin.graphql(
      "mutation SetShopMetafield($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { metafields { id key namespace } userErrors { field message } } }",
      {
        variables: {
          metafields: [
            {
              ownerId: shopGid,
              namespace: "easycod_dz",
              key: "form_config",
              type: "json",
              value: JSON.stringify(fullConfigForStorefront),
            },
          ],
        },
      }
    );

    const result = await metafieldResponse.json();
    const userErrors = result.data?.metafieldsSet?.userErrors;

    if (userErrors && userErrors.length > 0) {
      console.error("❌ METAFIELD UPDATE FAILED:", userErrors);
      return json({ success: false, error: userErrors.map((e: any) => e.message).join(", ") }, { status: 400 });
    }

    console.log("✅ Form configuration updated successfully");
    return json({ success: true, message: "Form configuration updated with correct URLs" });

  } catch (error) {
    console.error("❌ UPDATE FAILED:", error);
    return json({ success: false, error: String(error) }, { status: 500 });
  }
};

export default function UpdateConfigPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Update Form Configuration</h1>
      <p>This page will update the form configuration with the correct URLs.</p>
      <form method="post">
        <button type="submit" style={{ 
          padding: '10px 20px', 
          backgroundColor: '#0070f3', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Update Configuration
        </button>
      </form>
    </div>
  );
}
