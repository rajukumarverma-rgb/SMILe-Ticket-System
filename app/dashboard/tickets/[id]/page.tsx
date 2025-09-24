"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TicketDetail } from "@/components/tickets/ticket-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"
import { TicketService } from "@/lib/ticket-service"
import type { Ticket } from "@/lib/types"

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const ticketId = params.id as string

  useEffect(() => {
    // If someone tries to access /tickets/create through dynamic route, redirect properly
    if (ticketId === "create") {
      router.replace("/dashboard/tickets/create")
      return
    }

    loadTicket()
  }, [ticketId, router])

  const loadTicket = async () => {
    if (ticketId === "create") {
      return
    }

    try {
      const ticketData = await TicketService.getTicketById(ticketId)
      setTicket(ticketData)
    } catch (error) {
      console.error("Failed to load ticket:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (ticketId === "create") {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-64 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!ticket) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Ticket Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The ticket you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => router.push("/dashboard/tickets")}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Tickets
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </Button>
        <TicketDetail ticket={ticket} onUpdate={loadTicket} />
      </div>
    </DashboardLayout>
  )
}
