// app/services/google.server.ts

import { OAuth2Client } from "google-auth-library";

export function createGoogleOAuth2Client() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function generateGoogleAuthUrl() {
  const oauth2Client = createGoogleOAuth2Client();
  
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
  const oauth2Client = createGoogleOAuth2Client();
  
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
    email
  };
}