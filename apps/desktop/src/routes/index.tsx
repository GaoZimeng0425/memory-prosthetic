import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

function IndexPage() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({ to: '/all', replace: true })
  }, [navigate])
  return null
}

export const Route = createFileRoute('/')({
  component: IndexPage,
})
