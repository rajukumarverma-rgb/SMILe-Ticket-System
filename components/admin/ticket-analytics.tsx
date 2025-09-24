"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUpIcon, TrendingDownIcon, ClockIcon, UserIcon } from "lucide-react"
import type { Ticket } from "@/lib/types"
import { formatDistanceToNow, subDays, isAfter } from "date-fns"

interface TicketAnalyticsProps {
  tickets: Ticket[]
}

export function TicketAnalytics({ tickets }: TicketAnalyticsProps) {
  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)
  const thirtyDaysAgo = subDays(now, 30)

  // Recent tickets (last 7 days)
  const recentTickets = tickets.filter((ticket) => isAfter(ticket.createdAt, sevenDaysAgo))
  const monthlyTickets = tickets.filter((ticket) => isAfter(ticket.createdAt, thirtyDaysAgo))

  // Resolution metrics
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed")
  const avgResolutionTime = resolvedTickets.length > 0 ? 2.5 : 0 // Mock average in days

  // Performance by assignee
  const assigneePerformance = tickets.reduce(
    (acc, ticket) => {
      if (ticket.assignedTo) {
        if (!acc[ticket.assignedTo]) {
          acc[ticket.assignedTo] = {
            name: ticket.assignedTo === "2" ? "Sarah Assignee" : ticket.assignedTo === "4" ? "Lisa Tech" : "Unknown",
            total: 0,
            resolved: 0,
          }
        }
        acc[ticket.assignedTo].total++
        if (ticket.status === "resolved" || ticket.status === "closed") {
          acc[ticket.assignedTo].resolved++
        }
      }
      return acc
    },
    {} as Record<string, { name: string; total: number; resolved: number }>,
  )

  // Trend analysis
  const weeklyGrowth = recentTickets.length
  const monthlyGrowth = monthlyTickets.length
  const resolutionRate = tickets.length > 0 ? Math.round((resolvedTickets.length / tickets.length) * 100) : 0

  // Priority distribution
  const priorityStats = tickets.reduce(
    (acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const analyticsCards = [
    {
      title: "Weekly New Tickets",
      value: weeklyGrowth,
      icon: TrendingUpIcon,
      description: "Last 7 days",
      trend: "+12%",
      color: "text-blue-500",
    },
    {
      title: "Monthly Volume",
      value: monthlyGrowth,
      icon: TrendingUpIcon,
      description: "Last 30 days",
      trend: "+8%",
      color: "text-green-500",
    },
    {
      title: "Avg Resolution Time",
      value: `${avgResolutionTime} days`,
      icon: ClockIcon,
      description: "Time to resolve",
      trend: "-15%",
      color: "text-orange-500",
    },
    {
      title: "Resolution Rate",
      value: `${resolutionRate}%`,
      icon: TrendingUpIcon,
      description: "Successfully resolved",
      trend: "+5%",
      color: "text-purple-500",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {analyticsCards.map((card) => {
          const Icon = card.icon
          const isPositive = card.trend.startsWith("+")
          const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon

          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="flex items-center gap-1 text-xs">
                  <TrendIcon className={`w-3 h-3 ${isPositive ? "text-green-500" : "text-red-500"}`} />
                  <span className={isPositive ? "text-green-500" : "text-red-500"}>{card.trend}</span>
                  <span className="text-muted-foreground">{card.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Priority Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Breakdown of tickets by priority level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(priorityStats).map(([priority, count]) => {
              const percentage = Math.round((count / tickets.length) * 100)
              const priorityColors = {
                urgent: "bg-red-500/10 text-red-500 border-red-500/20",
                high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
                medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
              }

              return (
                <div key={priority} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[priority as keyof typeof priorityColors]}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{count} tickets</span>
                    </div>
                    <span className="text-sm font-medium">{percentage}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Assignee Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Assignee Performance</CardTitle>
            <CardDescription>Resolution rates by team member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(assigneePerformance).map(([assigneeId, performance]) => {
              const resolutionRate =
                performance.total > 0 ? Math.round((performance.resolved / performance.total) * 100) : 0

              return (
                <div key={assigneeId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{performance.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {performance.resolved}/{performance.total} ({resolutionRate}%)
                    </div>
                  </div>
                  <Progress value={resolutionRate} className="h-2" />
                </div>
              )
            })}
            {Object.keys(assigneePerformance).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No assigned tickets yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest ticket updates and system activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tickets
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 5)
              .map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">#{ticket.id}</Badge>
                    <div>
                      <p className="font-medium text-sm">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: {ticket.status.replace("_", " ")} •{" "}
                        {formatDistanceToNow(ticket.updatedAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">{ticket.priority}</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
