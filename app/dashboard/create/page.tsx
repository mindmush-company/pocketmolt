import { CreateBotForm } from "@/components/dashboard/create-bot-form"

export const dynamic = 'force-dynamic'

export default function CreateBotPage() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Create Bot</h2>
      </div>
      <div className="pt-6">
        <CreateBotForm />
      </div>
    </div>
  )
}
