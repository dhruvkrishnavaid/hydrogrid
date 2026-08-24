import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { deleteSession } from "@/server/db";

export const APIRoute = createAPIFileRoute("/api/auth/logout")({
  POST: async ({ request }) => {
    try {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/hg_session=([^;]+)/);
      const sessionId = match ? match[1] : "";

      if (sessionId) {
        deleteSession(sessionId);
      }

      return json(
        { success: true, message: "Logged out successfully." },
        {
          headers: {
            "Set-Cookie": "hg_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
          },
        }
      );
    } catch {
      return json({ success: true });
    }
  },
});
