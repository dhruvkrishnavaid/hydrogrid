import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated, isAdmin } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    } else if (isAdmin()) {
      throw redirect({ to: "/admin/dashboard" });
    } else {
      throw redirect({ to: "/desktop" });
    }
  },
});
