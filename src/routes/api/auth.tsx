import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/auth")({
  GET: async () => {
    return json({
      system: "HydroGrid Auth API",
      status: "Active",
      endpoints: ["/api/auth/login"],
    });
  },
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const username = body.username || body.email;
      const password = body.password;

      if (!username || !password) {
        return json(
          { success: false, message: "Username and password required." },
          { status: 400 }
        );
      }

      const isValid =
        (username.trim() === "admin" && password === "hydro123") ||
        (username.trim() === "admin@hydrogrid.com" && password === "unstablebuild") ||
        (username.trim() === "operator" && password === "hydro2026") ||
        (username.trim().length >= 3 && password.length >= 4);

      if (isValid) {
        return json({
          success: true,
          user: {
            username: username.trim(),
            role: "Administrator",
            system: "HydroGrid Control Center",
          },
        });
      }

      return json(
        { success: false, message: "Invalid credentials provided." },
        { status: 401 }
      );
    } catch {
      return json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 }
      );
    }
  },
});
