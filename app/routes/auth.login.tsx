import type { LoaderFunctionArgs } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { login } from "../shopify.server";
import styles from "./styles/login.css";

// Add a simple stylesheet for the login form
export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw login(request);
  }

  return new Response(null, { status: 200 });
}

export default function Auth() {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Log in to Your App</h1>
        <p>Enter your shop domain to get started.</p>
        <Form method="post" action="/auth/login">
          <div className="input-group">
            <label htmlFor="shop">Shop domain</label>
            <div className="input-with-suffix">
              <input
                type="text"
                name="shop"
                id="shop"
                placeholder="example"
                required
              />
              <span>.myshopify.com</span>
            </div>
          </div>
          <button type="submit" className="login-button">
            Log in
          </button>
        </Form>
      </div>
    </div>
  );
}

// Simple action to handle the form submission and trigger the loader redirect
export async function action({ request }: LoaderFunctionArgs) {
  return login(request);
}
