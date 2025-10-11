import { json } from "@remix-run/node";

// This is a simple loader that just returns a success message.
// It doesn't use Shopify authentication, so it's a direct test of the proxy.
export const loader = async () => {
  return json({ status: "ok", message: "Your App Proxy is working!" });
};