"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TicketList } from "@/components/tickets/ticket-list"
import { TicketService } from "@/lib/ticket-service"
import type { Ticket } from "@/lib/types"

export default function AllTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAllTickets = async () => {
      try {
        // For Head Office and Technical users, this will return all tickets
        const allTickets = await TicketService.getTickets()
        setTickets(allTickets)
      } catch (error) {
        console.error("Failed to load tickets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAllTickets()
  }, [])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <TicketList tickets={tickets} title="All System Tickets" />
    </DashboardLayout>
  )
}
