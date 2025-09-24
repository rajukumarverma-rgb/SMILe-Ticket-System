"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUpIcon, TicketIcon, ClockIcon, AlertTriangleIcon } from "lucide-react"
import type { Ticket } from "@/lib/types"

interface SystemOverviewProps {
  tickets: Ticket[]
}

export function SystemOverview({ tickets }: SystemOverviewProps) {
  const totalTickets = tickets.length
  const openTickets = tickets.filter((t) => t.status === "open").length
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress").length
  const pendingApprovalTickets = tickets.filter((t) => t.status === "pending_approval").length
  const resolvedTickets = tickets.filter((t) => t.status === "resolved").length
  const closedTickets = tickets.filter((t) => t.status === "closed").length

  const urgentTickets = tickets.filter(
    (t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed",
  ).length
  const highPriorityTickets = tickets.filter(
    (t) => t.priority === "high" && t.status !== "resolved" && t.status !== "closed",
  ).length

  const resolutionRate = totalTickets > 0 ? Math.round(((resolvedTickets + closedTickets) / totalTickets) * 100) : 0
  const activeTickets = openTickets + inProgressTickets + pendingApprovalTickets

  // Category breakdown
  const categoryStats = tickets.reduce(
    (acc, ticket) => {
      acc[ticket.category] = (acc[ticket.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const systemCards = [
    {
      title: "Total Tickets",
      value: totalTickets,
      icon: TicketIcon,
      description: "All tickets in system",
      color: "text-blue-500",
    },
    {
      title: "Active Tickets",
      value: activeTickets,
      icon: ClockIcon,
      description: "Requiring attention",
      color: "text-yellow-500",
    },
    {
      title: "Resolution Rate",
      value: `${resolutionRate}%`,
      icon: TrendingUpIcon,
      description: "Successfully resolved",
      color: "text-green-500",
    },
    {
      title: "Critical Issues",
      value: urgentTickets + highPriorityTickets,
      icon: AlertTriangleIcon,
      description: "High/Urgent priority",
      color: "text-red-500",
    },
  ]

  return (
    <div className="space-y-6">
      {/* System Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {systemCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Status Distribution</CardTitle>
            <CardDescription>Current status of all tickets in the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Open</Badge>
                  <span className="text-sm text-muted-foreground">Unassigned tickets</span>
                </div>
                <span className="font-medium">{openTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">In Progress</Badge>
                  <span className="text-sm text-muted-foreground">Being worked on</span>
                </div>
                <span className="font-medium">{inProgressTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Pending Approval</Badge>
                  <span className="text-sm text-muted-foreground">Awaiting review</span>
                </div>
                <span className="font-medium">{pendingApprovalTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Resolved</Badge>
                  <span className="text-sm text-muted-foreground">Successfully completed</span>
                </div>
                <span className="font-medium">{resolvedTickets}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Tickets by category type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Object.entries(categoryStats).map(([category, count]) => {
                const percentage = Math.round((count / totalTickets) * 100)
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{category.replace("_", " ")}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Alert */}
      {(urgentTickets > 0 || highPriorityTickets > 0) && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangleIcon className="w-5 h-5" />
              Priority Alerts
            </CardTitle>
            <CardDescription>High-priority tickets requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {urgentTickets > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Urgent</Badge>
                    <span className="text-sm">Critical issues</span>
                  </div>
                  <span className="font-bold text-red-500">{urgentTickets}</span>
                </div>
              )}
              {highPriorityTickets > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">High</Badge>
                    <span className="text-sm">Important issues</span>
                  </div>
                  <span className="font-bold text-orange-500">{highPriorityTickets}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
