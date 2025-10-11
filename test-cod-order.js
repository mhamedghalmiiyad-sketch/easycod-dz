// Test script to verify COD order creation
// Run this to test your COD order implementation

const testOrderData = {
  shop: "your-shop.myshopify.com", // Replace with your test shop
  cartData: {
    item_count: 1,
    total_price: 5000, // $50.00 in cents
    currency: "USD"
  },
  lineItems: [
    {
      variantId: "gid://shopify/ProductVariant/YOUR_VARIANT_ID", // Replace with actual variant ID
      quantity: 1
    }
  ],
  email: "test@example.com",
  firstName: "Test",
  lastName: "Customer",
  phone: "+1234567890",
  address: "123 Test Street",
  city: "Test City",
  province: "Test Province",
  zip: "12345",
  country: "US",
  "order-note": "Test COD order"
};

async function testCODOrder() {
  try {
    const formData = new FormData();
    formData.append("cartData", JSON.stringify(testOrderData.cartData));
    formData.append("lineItems", JSON.stringify(testOrderData.lineItems));
    formData.append("email", testOrderData.email);
    formData.append("firstName", testOrderData.firstName);
    formData.append("lastName", testOrderData.lastName);
    formData.append("phone", testOrderData.phone);
    formData.append("address", testOrderData.address);
    formData.append("city", testOrderData.city);
    formData.append("province", testOrderData.province);
    formData.append("zip-code", testOrderData.zip);
    formData.append("order-note", testOrderData["order-note"]);

    const response = await fetch(`/apps/proxy/submit?shop=${testOrderData.shop}&country_code=${testOrderData.country}`, {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    
    console.log("Test Result:", result);
    
    if (result.success) {
      console.log("✅ COD Order Test Successful!");
      console.log(`Order ID: ${result.orderId}`);
      console.log(`Order Name: ${result.orderName}`);
      console.log(`Financial Status: ${result.financialStatus}`);
      console.log(`Fulfillment Status: ${result.fulfillmentStatus}`);
    } else {
      console.log("❌ COD Order Test Failed:", result.error);
      if (result.details) {
        console.log("Details:", result.details);
      }
    }
  } catch (error) {
    console.error("❌ Test Error:", error);
  }
}

// Uncomment to run the test
// testCODOrder();

console.log("COD Order Test Script Ready");
console.log("1. Update the testOrderData with your shop and variant ID");
console.log("2. Uncomment the testCODOrder() call");
console.log("3. Run the test and check the results");
