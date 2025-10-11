import { json } from "@remix-run/node";

export const loader = async () => {
  console.log("✅ Ping route was hit at:", new Date().toLocaleTimeString());

  try {
    const data = {
      status: "ok",
      message: "Your App Proxy is working!",
      timestamp: new Date().toISOString(),
    };

    return json(data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("❌ Error in ping route:", error);

    return json(
      { status: "error", message: error.message },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};