import { json } from "@remix-run/node";

export const loader = async () => {
  // This log will appear in your `npm run dev` terminal
  console.log("✅ Ping route was hit at:", new Date().toLocaleTimeString());

  try {
    const data = {
      status: "ok",
      message: "Your App Proxy is working!",
      timestamp: new Date().toISOString(),
    };

    // Return a JSON response with the correct headers
    return json(data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("❌ Error in ping route:", error);

    // If there's an error, return it as JSON so you can see it
    return json(
      { status: "error", message: error.message },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};