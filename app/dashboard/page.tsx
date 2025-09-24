"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentTickets } from "@/components/dashboard/recent-tickets"
import { TechnicalQueue } from "@/components/technical/technical-queue"
import { SystemHealth } from "@/components/technical/system-health"
import { AssignmentQueue } from "@/components/assignee/assignment-queue"
import { WorkloadOverview } from "@/components/assignee/workload-overview"
import { TicketService } from "@/lib/ticket-service"
import { AuthService } from "@/lib/auth"
import type { Ticket, DashboardStats, UserRole } from "@/lib/types"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadDashboardData = async () => {
    try {
      const [dashboardStats, tickets] = await Promise.all([
        TicketService.getDashboardStats(),
        TicketService.getTickets(),
      ])

      setStats(dashboardStats)
      setRecentTickets(tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const user = AuthService.getCurrentUser()
  const canCreateTickets = user && AuthService.canCreateTickets()

  const getDashboardTitle = (role: UserRole) => {
    switch (role) {
      case "channel_partner":
        return "Channel Partner Dashboard"
      case "assignee":
        return "Assignee Dashboard"
      case "head_office":
        return "Head Office Dashboard"
      case "technical":
        return "Technical Support Dashboard"
      default:
        return "Dashboard"
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-6"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">{user ? getDashboardTitle(user.role) : "Dashboard"}</h1>
          <p className="text-muted-foreground">
            {user?.role === "technical"
              ? "Monitor system health and manage technical issues."
              : user?.role === "assignee"
                ? "Manage your ticket assignments and track your workload progress."
                : "Welcome back! Here's what's happening with your tickets."}
          </p>
        </div>

        {user?.role !== "assignee" && stats && <StatsCards stats={stats} />}

        {user?.role === "assignee" ? (
          <>
            <WorkloadOverview tickets={recentTickets.filter((ticket) => ticket.assignedTo === user.id)} />
            <AssignmentQueue tickets={recentTickets} onUpdate={loadDashboardData} />
          </>
        ) : user?.role === "technical" ? (
          <>
            <SystemHealth tickets={recentTickets} />
            <TechnicalQueue tickets={recentTickets} onUpdate={loadDashboardData} />
          </>
        ) : (
          <RecentTickets tickets={recentTickets} showCreateButton={canCreateTickets} />
        )}
      </div>
    </DashboardLayout>
  )
}
