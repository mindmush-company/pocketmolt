import { DashboardHeader } from "@/components/dashboard/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex-1 space-y-4">
          {children}
        </div>
      </main>
    </div>
  )
}
