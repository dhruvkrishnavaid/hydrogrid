import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import {
  findUserByUsername,
  findUserByEmail,
  createUser,
  createSession,
  checkPersistentRateLimit,
} from "@/server/db";

export const APIRoute = createAPIFileRoute("/api/auth/signup")({
  POST: async ({ request }) => {
    try {
      const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
      if (!checkPersistentRateLimit(`signup_${clientIp}`, 5, 900000)) {
        return json(
          { success: false, message: "Too many signup attempts. Please wait 15 minutes before trying again." },
          { status: 429 }
        );
      }

      const body = await request.json();
      const fullName = (body.fullName || "").trim();
      const username = (body.username || "").trim();
      const email = (body.email || "").trim();
      const password = body.password || "";

      if (!fullName || !username || !email || !password) {
        return json(
          { success: false, message: "Please fill in all required fields." },
          { status: 400 }
        );
      }

      if (!email.includes("@") || !email.includes(".")) {
        return json(
          { success: false, message: "Please enter a valid email address." },
          { status: 400 }
        );
      }

      // Password policy: minimum 10 characters
      if (password.length < 10) {
        return json(
          { success: false, message: "Please choose a stronger password." },
          { status: 400 }
        );
      }

      // Check username uniqueness
      if (findUserByUsername(username)) {
        return json(
          { success: false, message: "Username is already in use." },
          { status: 400 }
        );
      }

      // Check email uniqueness
      if (findUserByEmail(email)) {
        return json(
          { success: false, message: "An account with this email already exists." },
          { status: 400 }
        );
      }

      // Hash password using Argon2id
      const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });

      // Store account in persistent SQLite database
      const newUser = createUser({
        fullName,
        username,
        email,
        passwordHash,
        role: "user",
        provider: "password",
      });

      // Create server-side session
      const sessionId = createSession(newUser.id);
      const isProd = process.env.NODE_ENV === "production";
      const cookieHeader = `hg_session=${sessionId}; Path=/; HttpOnly; ${isProd ? "Secure; " : ""}SameSite=Lax; Max-Age=2592000`;

      return json(
        {
          success: true,
          message: "Account created successfully.",
          user: {
            id: newUser.id,
            username: newUser.username,
            fullName: newUser.fullName,
            email: newUser.email,
            role: newUser.role,
          },
        },
        {
          headers: {
            "Set-Cookie": cookieHeader,
          },
        }
      );
    } catch (err: any) {
      return json(
        { success: false, message: err.message || "Failed to complete registration." },
        { status: 400 }
      );
    }
  },
});
