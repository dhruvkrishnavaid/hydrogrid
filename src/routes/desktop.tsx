import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/desktop')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/desktop"!</div>
}
