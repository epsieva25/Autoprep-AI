import ProjectDetailsClient from "@/components/project-details-client"

export default function ProjectDetailsPage({ params }) {
  // Mock user for local development
  const mockUser = {
    id: "local-user",
    email: "local@example.com",
    user_metadata: {
      full_name: "Local User",
    },
  }

  return <ProjectDetailsClient projectId={params.id} user={mockUser} />
}
