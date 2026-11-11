import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$')({
  component: CatchallRoute,
})

function CatchallRoute() {
  const { _splat } = Route.useParams()

  return (
    <div>{_splat}</div>
  )
}
