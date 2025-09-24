"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AssignmentQueue } from "@/components/assignee/assignment-queue"
import { WorkloadOverview } from "@/components/assignee/workload-overview"
import { TicketService } from "@/lib/ticket-service"
import { AuthService } from "@/lib/auth"
import type { Ticket } from "@/lib/types"

export default function AssignmentsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTickets = async () => {
    try {
      const allTickets = await TicketService.getTickets()
      setTickets(allTickets)
    } catch (error) {
      console.error("Failed to load tickets:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const user = AuthService.getCurrentUser()
  const myTickets = tickets.filter((ticket) => ticket.assignedTo === user?.id)

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">Assignment Management</h1>
          <p className="text-muted-foreground">Manage your ticket assignments and track your workload progress.</p>
        </div>

        <WorkloadOverview tickets={myTickets} />
        <AssignmentQueue tickets={tickets} onUpdate={loadTickets} />
      </div>
    </DashboardLayout>
  )
}
