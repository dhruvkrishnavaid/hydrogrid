import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/test")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/api/test"!</div>;
}
