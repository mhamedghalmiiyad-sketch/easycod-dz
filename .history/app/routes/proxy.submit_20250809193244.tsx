import { type ActionFunctionArgs, redirect } from "@remix-run/node";

// This action function runs when a customer submits the form
export const action = async ({ request }: ActionFunctionArgs) => {
  // ✅ Server-only imports are moved inside the action
  const { authenticate } = await import("../shopify.server");

  // 1. Authenticate the request to get the shop domain
  const { session } = await authenticate.public.appProxy(request);

  // Handle the case where session might be undefined
  if (!session) {
    throw new Error("Authentication failed - no session found");
  }

  // 2. Get the data that the customer typed into the form
  const formData = await request.formData();
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const phone = formData.get("phone");

  // --- For now, we will just log the data to the terminal ---
  // This proves that we are receiving the submission correctly.
  console.log("✅ Form submitted!");
  console.log("   First Name:", firstName);
  console.log("   Last Name:", lastName);
  console.log("   Phone:", phone);
  console.log("   Shop:", session.shop);
  console.log("--------------------");

  // In a real app, you would now:
  // - Get the product ID from the form submission
  // - Use the Shopify Admin API to create a new draft order
  //   const draftOrder = await admin.graphql(...)

  // 3. Redirect the customer to the store's "Thank You" page
  // This is important to give the customer feedback that the order was placed.
  return redirect(`https://${session.shop}/pages/thank-you`);
};
