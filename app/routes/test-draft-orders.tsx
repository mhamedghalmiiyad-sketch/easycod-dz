import { json, type LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  if (!shop) {
    return json({ error: "Shop parameter required" }, { status: 400 });
  }

  try {
    const { admin } = await authenticate.admin(shop);
    
    // Test query to check if we can access draft orders
    const testQuery = `#graphql
      query {
        draftOrders(first: 1) {
          edges {
            node {
              id
              name
              status
            }
          }
        }
      }
    `;

    console.log("🧪 Testing draft orders access...");
    const response = await admin.graphql(testQuery);
    const data = await response.json();
    
    console.log("🧪 Draft orders test response:", JSON.stringify(data, null, 2));
    
    if (data.errors && data.errors.length > 0) {
      console.error("❌ Draft orders access denied:", data.errors);
      return json({ 
        success: false, 
        error: "Draft orders access denied",
        details: data.errors 
      }, { status: 403 });
    }
    
    return json({ 
      success: true, 
      message: "Draft orders access confirmed",
      data: data.data 
    });
    
  } catch (error) {
    console.error("❌ Error testing draft orders access:", error);
    return json({ 
      success: false, 
      error: "Failed to test draft orders access",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};
