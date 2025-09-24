"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { SystemOverview } from "@/components/admin/system-overview"
import { UserManagement } from "@/components/admin/user-management"
import { TicketService } from "@/lib/ticket-service"
import type { Ticket } from "@/lib/types"

export default function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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

    loadTickets()
  }, [])

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
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">Admin Panel</h1>
          <p className="text-muted-foreground">Complete system administration and oversight dashboard.</p>
        </div>
        <SystemOverview tickets={tickets} />
        <UserManagement />
      </div>
    </DashboardLayout>
  )
}
