import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import {
  findUserByUsernameOrEmail,
  createSession,
  checkPersistentRateLimit,
  getDummyHash,
} from "@/server/db";

export const APIRoute = createAPIFileRoute("/api/auth/login")({
  POST: async ({ request }) => {
    try {
      const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
      const body = await request.json();
      const username = (body.username || body.email || "").trim();
      const password = body.password || "";

      // Rate limit by IP + identifier (5 attempts per 15-minute window)
      const rateLimitKey = `login_${clientIp}_${username.toLowerCase()}`;
      if (!checkPersistentRateLimit(rateLimitKey, 5, 900000)) {
        return json(
          { success: false, message: "Too many failed attempts. Please wait 15 minutes before trying again." },
          { status: 429 }
        );
      }

      if (!username || !password) {
        return json(
          { success: false, message: "Invalid username/email or password." },
          { status: 400 }
        );
      }

      // Look up user record in SQLite database
      const user = findUserByUsernameOrEmail(username);

      if (!user || !user.passwordHash) {
        // Run dummy hash check to mitigate timing-based user enumeration attacks
        await Bun.password.verify(password, getDummyHash());
        return json(
          { success: false, message: "Invalid username/email or password." },
          { status: 401 }
        );
      }

      // Verify Argon2id hashed password
      const isPasswordValid = await Bun.password.verify(password, user.passwordHash);

      if (!isPasswordValid) {
        return json(
          { success: false, message: "Invalid username/email or password." },
          { status: 401 }
        );
      }

      // Create server-side session in database
      const sessionId = createSession(user.id);
      const isProd = process.env.NODE_ENV === "production";
      const cookieHeader = `hg_session=${sessionId}; Path=/; HttpOnly; ${isProd ? "Secure; " : ""}SameSite=Lax; Max-Age=2592000`;

      return json(
        {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          },
        },
        {
          headers: {
            "Set-Cookie": cookieHeader,
          },
        }
      );
    } catch {
      return json(
        { success: false, message: "Invalid username/email or password." },
        { status: 400 }
      );
    }
  },
});
