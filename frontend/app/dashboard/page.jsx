import DashboardClient from "@/components/dashboard-client"

export default function DashboardPage() {
  // Mock user for local development
  const mockUser = {
    id: "local-user",
    email: "local@example.com",
    user_metadata: {
      full_name: "Local User",
    },
  }

  return <DashboardClient user={mockUser} />
}
