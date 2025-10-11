// 📁 app/routes/apps.proxy.submit.tsx

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import db from "../db.server";
// Make sure this path is correct, it might be `../riskScoring`
import { calculateRiskScore } from "~/riskScoring";

// --- Paste all your helper functions & type definitions here ---
// (validateAppProxyRequest, UserBlockingSettings, etc.)
// I've included the essentials below.

async function validateAppProxyRequest(request: Request): Promise<boolean> { /* ...your existing validation logic... */ }
async function markCartAsRecovered(sessionId: string, draftOrderId: string): Promise<void> { /* ...your existing logic... */ }
// ... any other helpers your action needs

// This loader prevents anyone from visiting this URL directly in a browser.
export const loader = async () => {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
};

// This is your complete, original action logic for creating the order.
export const action = async ({ request }: ActionFunctionArgs) => {
  // --- PASTE YOUR ENTIRE `action` FUNCTION LOGIC HERE ---
  // (The big one from your very first code block that starts with
  // `const isValid = await validateAppProxyRequest(request);`
  // and ends with creating the draft order and redirecting).
};