import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$param')({
  component: ParamRoute,
})

function ParamRoute() {
  const { param } = Route.useParams()

  return (
    <div>{param}</div>
  )
}
