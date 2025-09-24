import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TicketForm } from "@/components/tickets/ticket-form"

export default function CreateTicketPage() {
  console.log("[v0] Create ticket page rendering")

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">Create New Ticket</h1>
          <p className="text-muted-foreground">Submit a support request and our team will get back to you soon.</p>
        </div>
        <TicketForm />
      </div>
    </DashboardLayout>
  )
}
