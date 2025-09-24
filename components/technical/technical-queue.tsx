"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  BugIcon,
  CodeIcon,
  DatabaseIcon,
  ServerIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "lucide-react"
import type { Ticket, TicketStatus } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { TicketService } from "@/lib/ticket-service"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface TechnicalQueueProps {
  tickets: Ticket[]
  onUpdate?: () => void
}

const statusColors = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  pending_approval: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

const priorityColors = {
  low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "technical":
      return CodeIcon
    case "bug_report":
      return BugIcon
    case "feature_request":
      return ServerIcon
    default:
      return DatabaseIcon
  }
}

export function TechnicalQueue({ tickets, onUpdate }: TechnicalQueueProps) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [resolution, setResolution] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  // Filter tickets relevant to technical team
  const technicalTickets = tickets.filter(
    (ticket) =>
      ticket.category === "technical" ||
      ticket.category === "bug_report" ||
      ticket.category === "feature_request" ||
      ticket.priority === "urgent",
  )

  const criticalTickets = technicalTickets.filter(
    (ticket) => ticket.priority === "urgent" && ticket.status !== "resolved" && ticket.status !== "closed",
  )

  const pendingApproval = technicalTickets.filter((ticket) => ticket.status === "pending_approval")

  const handleStatusUpdate = async (ticketId: string, newStatus: TicketStatus) => {
    setIsUpdating(true)
    try {
      await TicketService.updateTicketStatus(ticketId, newStatus)

      // Add resolution comment if resolving
      if (newStatus === "resolved" && resolution.trim()) {
        await TicketService.addComment(ticketId, `Resolution: ${resolution.trim()}`, true)
        setResolution("")
        setSelectedTicket(null)
      }

      toast({
        title: "Status updated",
        description: `Ticket status changed to ${newStatus.replace("_", " ")}.`,
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: "Error updating status",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleApprove = async (ticketId: string) => {
    await handleStatusUpdate(ticketId, "resolved")
  }

  const handleReject = async (ticketId: string) => {
    await handleStatusUpdate(ticketId, "in_progress")
  }

  return (
    <div className="space-y-6">
      {/* Critical Issues Alert */}
      {criticalTickets.length > 0 && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangleIcon className="w-5 h-5" />
              Critical Issues ({criticalTickets.length})
            </CardTitle>
            <CardDescription>Urgent technical issues requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalTickets.map((ticket) => {
                const CategoryIcon = getCategoryIcon(ticket.category)
                return (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon className="w-4 h-4 text-red-500" />
                      <div>
                        <h4 className="font-medium text-sm">{ticket.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          #{ticket.id} • {formatDistanceToNow(ticket.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={statusColors[ticket.status]}>{ticket.status.replace("_", " ")}</Badge>
                      <Link href={`/dashboard/tickets/${ticket.id}`}>
                        <Button size="sm" variant="outline">
                          Investigate
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Approval */}
      {pendingApproval.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
              Pending Technical Approval ({pendingApproval.length})
            </CardTitle>
            <CardDescription>Solutions awaiting technical review and approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApproval.map((ticket) => {
                const CategoryIcon = getCategoryIcon(ticket.category)
                return (
                  <div key={ticket.id} className="flex items-start justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-start gap-3 flex-1">
                      <CategoryIcon className="w-4 h-4 text-muted-foreground mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm">{ticket.title}</h4>
                          <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.description}</p>
                        <div className="text-xs text-muted-foreground">
                          #{ticket.id} • Assigned to: {ticket.assignedTo === "2" ? "Sarah Assignee" : "Unknown"}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleReject(ticket.id)} disabled={isUpdating}>
                        Needs Work
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(ticket.id)} disabled={isUpdating}>
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Tickets Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CodeIcon className="w-5 h-5" />
            Technical Tickets ({technicalTickets.length})
          </CardTitle>
          <CardDescription>All technical issues, bug reports, and feature requests</CardDescription>
        </CardHeader>
        <CardContent>
          {technicalTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No technical tickets at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {technicalTickets.map((ticket) => {
                const CategoryIcon = getCategoryIcon(ticket.category)
                const isSelected = selectedTicket === ticket.id

                return (
                  <div key={ticket.id} className="space-y-4">
                    <div className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-start gap-3 flex-1">
                        <CategoryIcon className="w-4 h-4 text-muted-foreground mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-sm">{ticket.title}</h4>
                            <Badge className={statusColors[ticket.status]}>{ticket.status.replace("_", " ")}</Badge>
                            <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {ticket.category.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>#{ticket.id}</span>
                            <span>{formatDistanceToNow(ticket.createdAt, { addSuffix: true })}</span>
                            {ticket.assignedTo && (
                              <span>Assigned to: {ticket.assignedTo === "2" ? "Sarah Assignee" : "Unknown"}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/tickets/${ticket.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                        {ticket.status === "in_progress" && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedTicket(isSelected ? null : ticket.id)}
                            variant={isSelected ? "secondary" : "default"}
                          >
                            {isSelected ? "Cancel" : "Resolve"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Resolution Form */}
                    {isSelected && (
                      <div className="ml-7 p-4 bg-muted rounded-lg space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="resolution">Technical Resolution</Label>
                          <Textarea
                            id="resolution"
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            placeholder="Describe the technical solution implemented..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleStatusUpdate(ticket.id, "resolved")}
                            disabled={isUpdating || !resolution.trim()}
                          >
                            {isUpdating ? "Resolving..." : "Mark as Resolved"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedTicket(null)
                              setResolution("")
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
