"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ServerIcon,
  DatabaseIcon,
  WifiIcon,
  ShieldIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "lucide-react"
import type { Ticket } from "@/lib/types"

interface SystemHealthProps {
  tickets: Ticket[]
}

// Mock system health data - in real app this would come from monitoring systems
const systemMetrics = {
  uptime: 99.9,
  responseTime: 145,
  errorRate: 0.02,
  activeUsers: 1247,
  serverLoad: 68,
  databaseConnections: 45,
  securityAlerts: 0,
  lastBackup: "2 hours ago",
}

export function SystemHealth({ tickets }: SystemHealthProps) {
  const technicalIssues = tickets.filter(
    (ticket) =>
      (ticket.category === "technical" || ticket.category === "bug_report") &&
      ticket.status !== "resolved" &&
      ticket.status !== "closed",
  )

  const criticalIssues = technicalIssues.filter((ticket) => ticket.priority === "urgent")
  const highPriorityIssues = technicalIssues.filter((ticket) => ticket.priority === "high")

  const healthCards = [
    {
      title: "System Uptime",
      value: `${systemMetrics.uptime}%`,
      icon: ServerIcon,
      description: "Last 30 days",
      status: systemMetrics.uptime >= 99.5 ? "healthy" : "warning",
      color: systemMetrics.uptime >= 99.5 ? "text-green-500" : "text-yellow-500",
    },
    {
      title: "Response Time",
      value: `${systemMetrics.responseTime}ms`,
      icon: WifiIcon,
      description: "Average response",
      status: systemMetrics.responseTime <= 200 ? "healthy" : "warning",
      color: systemMetrics.responseTime <= 200 ? "text-green-500" : "text-yellow-500",
    },
    {
      title: "Error Rate",
      value: `${systemMetrics.errorRate}%`,
      icon: AlertTriangleIcon,
      description: "System errors",
      status: systemMetrics.errorRate <= 0.1 ? "healthy" : "critical",
      color: systemMetrics.errorRate <= 0.1 ? "text-green-500" : "text-red-500",
    },
    {
      title: "Security Status",
      value: systemMetrics.securityAlerts === 0 ? "Secure" : `${systemMetrics.securityAlerts} Alerts`,
      icon: ShieldIcon,
      description: "Security monitoring",
      status: systemMetrics.securityAlerts === 0 ? "healthy" : "critical",
      color: systemMetrics.securityAlerts === 0 ? "text-green-500" : "text-red-500",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Healthy</Badge>
      case "warning":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>
      case "critical":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* System Health Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {healthCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                  {getStatusBadge(card.status)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* System Performance */}
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>Current system resource utilization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Server Load</span>
                <span>{systemMetrics.serverLoad}%</span>
              </div>
              <Progress value={systemMetrics.serverLoad} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Database Connections</span>
                <span>{systemMetrics.databaseConnections}/100</span>
              </div>
              <Progress value={systemMetrics.databaseConnections} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-500">{systemMetrics.activeUsers}</div>
                <div className="text-xs text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-500">{systemMetrics.lastBackup}</div>
                <div className="text-xs text-muted-foreground">Last Backup</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Issues Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Issues</CardTitle>
            <CardDescription>Current technical problems and their priority</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {technicalIssues.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">All Systems Operational</p>
                  <p className="text-xs text-muted-foreground">No technical issues reported</p>
                </div>
              </div>
            ) : (
              <>
                {criticalIssues.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangleIcon className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">Critical Issues</span>
                    </div>
                    <Badge className="bg-red-500/20 text-red-500 border-red-500/30">{criticalIssues.length}</Badge>
                  </div>
                )}
                {highPriorityIssues.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUpIcon className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">High Priority</span>
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
                      {highPriorityIssues.length}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <DatabaseIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total Technical Issues</span>
                  </div>
                  <Badge variant="secondary">{technicalIssues.length}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Technical Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Technical Activity</CardTitle>
          <CardDescription>Latest technical tickets and system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickets
              .filter((ticket) => ticket.category === "technical" || ticket.category === "bug_report")
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 5)
              .map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">#{ticket.id}</Badge>
                    <div>
                      <p className="font-medium text-sm">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.category.replace("_", " ")} • {ticket.status.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      ticket.priority === "urgent"
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : ticket.priority === "high"
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                    }
                  >
                    {ticket.priority}
                  </Badge>
                </div>
              ))}
            {tickets.filter((ticket) => ticket.category === "technical" || ticket.category === "bug_report").length ===
              0 && <p className="text-sm text-muted-foreground text-center py-4">No recent technical activity</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
