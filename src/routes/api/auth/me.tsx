import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getSession } from "@/server/db";

export const APIRoute = createAPIFileRoute("/api/auth/me")({
  GET: async ({ request }) => {
    try {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/hg_session=([^;]+)/);
      const sessionId = match ? match[1] : "";

      if (!sessionId) {
        return json(
          { success: false, authenticated: false, message: "No active session token found." },
          { status: 401 }
        );
      }

      const result = getSession(sessionId);

      if (!result) {
        return json(
          { success: false, authenticated: false, message: "Invalid or expired session token." },
          {
            status: 401,
            headers: {
              "Set-Cookie": "hg_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
            },
          }
        );
      }

      const { user } = result;

      return json({
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    } catch {
      return json(
        { success: false, authenticated: false, message: "Malformed session query." },
        { status: 400 }
      );
    }
  },
});
