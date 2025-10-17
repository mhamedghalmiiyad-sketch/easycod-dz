// app/routes/auth.google.tsx

import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { OAuth2Client } from "google-auth-library";
import { getAuthenticate } from "\.\.\/lib\/shopify\.lazy\.server";
import { db } from "../db.server";

// This action handles both starting the auth flow and the callback
export const action = async ({ request }: ActionFunctionArgs) => {
  const authenticate = await getAuthenticate();
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("_action");

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  if (action === "disconnect") {
    await db.shopSettings.update({
      where: { shopId: session.shop },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleUserEmail: null,
      },
    });
    return redirect("/app/google-sheets");
  }

  // Generate the authentication URL and redirect the user
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent", // Important to get a refresh token every time
  });

  return redirect(authUrl);
};

// This loader handles the callback from Google after the user grants permission
export const loader = async ({ request }: ActionFunctionArgs) => {
  const authenticate = await getAuthenticate();
  const { session } = await authenticate.admin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    throw new Error("Missing authorization code from Google.");
  }

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's email to display in the UI
    const userInfo = await oauth2Client.request({
        url: "https://www.googleapis.com/oauth2/v2/userinfo",
    });
    const email = (userInfo.data as any).email;

    // Securely save the tokens to the database
    await db.shopSettings.update({
      where: { shopId: session.shop },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleUserEmail: email,
      },
    });

    return redirect("/app/google-sheets");
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    return redirect("/app/google-sheets?error=auth_failed");
  }
};
