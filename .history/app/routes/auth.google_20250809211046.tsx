// app/services/google.server.ts

// Note: The static import `import { OAuth2Client } from "google-auth-library";` is removed from the top level.

export async function createGoogleOAuth2Client() {
  // The library is now imported dynamically when the function is called.
  const { OAuth2Client } = await import("google-auth-library");
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function generateGoogleAuthUrl() {
  // This function is now async and awaits the client creation.
  const oauth2Client = await createGoogleOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(code: string) {
  // Awaits the async client creation.
  const oauth2Client = await createGoogleOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Get user's email
  const userInfo = await oauth2Client.request({
    url: "https://www.googleapis.com/oauth2/v2/userinfo",
  });

  const email = (userInfo.data as any).email;

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    email,
  };
}