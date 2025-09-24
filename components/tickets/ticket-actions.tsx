"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserIcon, ClockIcon, CheckCircleIcon, ArrowRightIcon } from "lucide-react"
import type { Ticket, TicketStatus, User } from "@/lib/types"
import { TicketService } from "@/lib/ticket-service"
import { AuthService } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

interface TicketActionsProps {
  ticket: Ticket
  onUpdate?: () => void
}

const statusOptions: {
  value: TicketStatus
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: "open",
    label: "Open",
    description: "Ticket is unassigned",
    icon: ClockIcon,
  },
  {
    value: "in_progress",
    label: "In Progress",
    description: "Currently being worked on",
    icon: UserIcon,
  },
  {
    value: "pending_approval",
    label: "Pending Approval",
    description: "Awaiting review",
    icon: ClockIcon,
  },
  {
    value: "resolved",
    label: "Resolved",
    description: "Issue has been fixed",
    icon: CheckCircleIcon,
  },
  {
    value: "closed",
    label: "Closed",
    description: "Ticket is complete",
    icon: CheckCircleIcon,
  },
]

export function TicketActions({ ticket, onUpdate }: TicketActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedTransferAssignee, setSelectedTransferAssignee] = useState<string>("")
  const [assigneeUsers, setAssigneeUsers] = useState<User[]>([])
  const [loadingAssignees, setLoadingAssignees] = useState(true)
  const [isRoleBased, setIsRoleBased] = useState(false)
  const { toast } = useToast()

  const user = AuthService.getCurrentUser()
  const canAssignTickets = AuthService.canAssignTickets()
  const canTakeTicket = user && ticket.status === "open" && user.role === "assignee"
  const canUpdateStatus = user && (ticket.assignedTo === user.id || canAssignTickets)
  // Allow transfer if user is the assignee OR can assign tickets (more permissive)
  const canTransferTicket = user && (
    (ticket.assignedTo === user.id && user.role === "assignee") ||
    (canAssignTickets && (ticket.status === "open" || ticket.status === "in_progress"))
  )


  useEffect(() => {
    const fetchAssignees = async () => {
      try {
        const response = await fetch('/api/assignees', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("authToken")}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setIsRoleBased(data.isRoleBased || false)
          
          // Filter out current user from assignee list (unless they can assign tickets or it's role-based)
          const filteredUsers = (canAssignTickets || data.isRoleBased)
            ? data.assignees  // Show all users if current user can assign tickets or it's role-based
            : data.assignees.filter((assignee: User) => assignee.id !== user?.id)
          setAssigneeUsers(filteredUsers)
        } else {
          throw new Error('Failed to fetch assignees')
        }
      } catch (error) {
        console.error("Error loading assignee users:", error)
        toast({
          title: "Error",
          description: "Failed to load assignee users",
          variant: "destructive",
        })
      } finally {
        setLoadingAssignees(false)
      }
    }

    if (user) {
      fetchAssignees()
    }
  }, [user, toast])

  const handleTakeTicket = async () => {
    if (!user) return

    setIsUpdating(true)
    try {
      await TicketService.assignTicket(ticket.id, user.id)
      await TicketService.updateTicketStatus(ticket.id, "in_progress")
      toast({
        title: "Ticket assigned",
        description: "You have successfully taken this ticket.",
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: "Error assigning ticket",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStatusUpdate = async (newStatus: TicketStatus) => {
    setIsUpdating(true)
    try {
      await TicketService.updateTicketStatus(ticket.id, newStatus)
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

  const handleTransferTicket = async () => {
    if (!selectedTransferAssignee) {
      toast({
        title: "No assignee selected",
        description: "Please select an assignee to transfer the ticket to.",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    try {
      const result = await TicketService.transferTicket(ticket.id, selectedTransferAssignee)
      
      if (result.success) {
        toast({
          title: "Ticket assigned successfully",
          description: result.message || "Ticket has been assigned to the selected assignee.",
        })
        setSelectedTransferAssignee("")
        onUpdate?.()
      } else {
        toast({
          title: "Error assigning ticket",
          description: result.message || "Please try again later.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error assigning ticket",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Actions</CardTitle>
        <CardDescription>Manage ticket status and assignments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Current Status:</span>
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">{ticket.status.replace("_", " ")}</Badge>
        </div>

        {/* Assignment Info */}
        {ticket.assignedTo && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Assigned to:</span>
            <span className="text-sm">
              {ticket.assignedTo === "1"
                ? "John Partner"
                : ticket.assignedTo === "2"
                  ? "Sarah Assignee"
                  : ticket.assignedTo === "3"
                    ? "Mike Admin"
                    : ticket.assignedTo === "4"
                      ? "Lisa Tech"
                      : ticket.assignedTo === "5"
                        ? "David Wilson"
                        : ticket.assignedTo === "6"
                          ? "Emma Johnson"
                          : ticket.assignedTo === "7"
                            ? "Robert Brown"
                            : ticket.assignedTo === "8"
                              ? "Jennifer Davis"
                              : "Unknown User"}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {canTakeTicket && (
            <Button onClick={handleTakeTicket} disabled={isUpdating} className="w-full">
              {isUpdating ? "Taking..." : "Take This Ticket"}
            </Button>
          )}

          {canUpdateStatus && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Update Status:</label>
              <Select value={ticket.status} onValueChange={handleStatusUpdate} disabled={isUpdating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {canTransferTicket && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign/Transfer Ticket:</label>
              <div className="space-y-2">
                <Select
                  value={selectedTransferAssignee}
                  onValueChange={setSelectedTransferAssignee}
                  disabled={isUpdating || loadingAssignees}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingAssignees 
                        ? "Loading assignees..." 
                        : assigneeUsers.length === 0 
                          ? "No assignees available" 
                          : "Select assignee..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {assigneeUsers.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{assignee.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {isRoleBased ? assignee.department : assignee.department}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleTransferTicket}
                  disabled={isUpdating || !selectedTransferAssignee || loadingAssignees}
                  className="w-full bg-transparent"
                  variant="outline"
                >
                  <ArrowRightIcon className="w-4 h-4 mr-2" />
                  {isUpdating ? "Assigning..." : "Assign Ticket"}
                </Button>
              </div>
              {assigneeUsers.length === 0 && !loadingAssignees && (
                <p className="text-sm text-muted-foreground">
                  No assignees available. Only users with 'assignee' or 'technical' roles can be assigned.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
