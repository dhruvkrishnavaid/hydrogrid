import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { findUserByEmail, createUser, createSession } from "@/server/db";

export const APIRoute = createAPIFileRoute("/api/auth/google")({
  GET: async ({ request }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return json({
        success: false,
        configured: false,
        message: "Google Sign-In is not configured yet.",
      });
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      const redirectUri = `${url.origin}/api/auth/google`;
      const googleAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=openid%20email%20profile&` +
        `prompt=select_account`;

      return json({
        success: true,
        configured: true,
        authUrl: googleAuthUrl,
      });
    }

    // Process OAuth Authorization Code Callback
    try {
      const redirectUri = `${url.origin}/api/auth/google`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return json(
          { success: false, message: "Failed to authenticate with Google." },
          { status: 400 }
        );
      }

      // Fetch Google user profile
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const profile = await profileRes.json();

      // Only trust email if verified by Google
      if (!profile.email || !profile.verified_email) {
        return json(
          { success: false, message: "Google email is unverified." },
          { status: 400 }
        );
      }

      const existingUser = findUserByEmail(profile.email);

      // Account-linking policy check
      if (existingUser) {
        if (existingUser.provider === "password") {
          return json(
            {
              success: false,
              message: "An account already exists for this email. Sign in with your password.",
            },
            { status: 400 }
          );
        }
        // Return existing Google OAuth session
        const sessionId = createSession(existingUser.id);
        const cookieHeader = `hg_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
        return json(
          {
            success: true,
            user: {
              id: existingUser.id,
              username: existingUser.username,
              fullName: existingUser.fullName,
              email: existingUser.email,
              role: existingUser.role,
            },
          },
          { headers: { "Set-Cookie": cookieHeader } }
        );
      }

      // Create new Google OAuth user record
      const newUser = createUser({
        fullName: profile.name || profile.email.split("@")[0],
        username: profile.email.split("@")[0] + "_" + Math.random().toString(36).substring(2, 6),
        email: profile.email,
        passwordHash: null,
        role: "user",
        provider: "google",
      });

      const sessionId = createSession(newUser.id);
      const cookieHeader = `hg_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;

      return json(
        {
          success: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            fullName: newUser.fullName,
            email: newUser.email,
            role: newUser.role,
          },
        },
        { headers: { "Set-Cookie": cookieHeader } }
      );
    } catch {
      return json(
        { success: false, message: "Failed to process Google OAuth callback." },
        { status: 400 }
      );
    }
  },
});
