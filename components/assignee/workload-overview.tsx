"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ClockIcon, CheckCircleIcon, AlertCircleIcon, TrendingUpIcon } from "lucide-react"
import type { Ticket } from "@/lib/types"

interface WorkloadOverviewProps {
  tickets: Ticket[]
}

export function WorkloadOverview({ tickets }: WorkloadOverviewProps) {
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length
  const pendingApprovalCount = tickets.filter((t) => t.status === "pending_approval").length
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length
  const totalAssigned = tickets.length

  const urgentCount = tickets.filter(
    (t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed",
  ).length
  const highCount = tickets.filter(
    (t) => t.priority === "high" && t.status !== "resolved" && t.status !== "closed",
  ).length

  const completionRate = totalAssigned > 0 ? Math.round((resolvedCount / totalAssigned) * 100) : 0

  const workloadCards = [
    {
      title: "Active Tickets",
      value: inProgressCount,
      icon: ClockIcon,
      description: "Currently working on",
      color: "text-yellow-500",
    },
    {
      title: "Pending Approval",
      value: pendingApprovalCount,
      icon: AlertCircleIcon,
      description: "Awaiting review",
      color: "text-purple-500",
    },
    {
      title: "Resolved",
      value: resolvedCount,
      icon: CheckCircleIcon,
      description: "Successfully completed",
      color: "text-green-500",
    },
    {
      title: "Completion Rate",
      value: `${completionRate}%`,
      icon: TrendingUpIcon,
      description: "Overall success rate",
      color: "text-blue-500",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Workload Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {workloadCards.map((card) => {
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

      {/* Priority Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Priority Breakdown</CardTitle>
            <CardDescription>Active tickets by priority level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {urgentCount > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Urgent</Badge>
                  <span className="text-sm text-muted-foreground">Requires immediate attention</span>
                </div>
                <span className="font-medium">{urgentCount}</span>
              </div>
            )}
            {highCount > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">High</Badge>
                  <span className="text-sm text-muted-foreground">Important issues</span>
                </div>
                <span className="font-medium">{highCount}</span>
              </div>
            )}
            {urgentCount === 0 && highCount === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No high-priority tickets at the moment</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
            <CardDescription>Your ticket resolution progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span>{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-yellow-500">{inProgressCount}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-purple-500">{pendingApprovalCount}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-500">{resolvedCount}</div>
                <div className="text-xs text-muted-foreground">Resolved</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
