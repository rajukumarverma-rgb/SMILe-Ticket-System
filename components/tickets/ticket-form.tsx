"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketService } from "@/lib/ticket-service"
import { AuthService } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Upload, X } from "lucide-react"
import type { User } from "@/lib/types"

export function TicketForm() {
  console.log("[v0] TicketForm component rendering")

  const [name, setName] = useState("")
  const [mobile, setMobile] = useState("")
  const [email, setEmail] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [description, setDescription] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assigneeUsers, setAssigneeUsers] = useState<User[]>([])
  const [loadingAssignees, setLoadingAssignees] = useState(true)
  const [isRoleBased, setIsRoleBased] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

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
          setAssigneeUsers(data.assignees || [])
          setIsRoleBased(data.isRoleBased || false)
          console.log("[v0] Assignee users loaded:", data.assignees, "isRoleBased:", data.isRoleBased)
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

    fetchAssignees()
  }, [toast])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setAttachments((prev) => [...prev, ...newFiles])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = AuthService.getCurrentUser()
    if (!user) return

    setIsSubmitting(true)
    try {
      const ticket = await TicketService.createTicket({
        title: `Support Request from ${name}`,
        description: `Customer Details:
Name: ${name}
Mobile: ${mobile}
Email: ${email}

Complaint Description:
${description}`,
        category: "general",
        priority: "medium",
        status: "open",
        createdBy: user.id,
        assignedTo: assigneeId || undefined,
      })

      toast({
        title: "Ticket created successfully",
        description: `Ticket #${ticket.id} has been created and assigned.`,
      })

      router.push("/dashboard/tickets")
    } catch (error) {
      toast({
        title: "Error creating ticket",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Raise Ticket</CardTitle>
        <CardDescription>Submit a new support request with customer details and complaint information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer's full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number *</Label>
            <Input
              id="mobile"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Customer's mobile number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email ID *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Customer's email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Select Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId} disabled={loadingAssignees}>
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingAssignees 
                    ? "Loading assignees..." 
                    : assigneeUsers.length === 0 
                      ? "No assignees available" 
                      : "Choose an assignee (optional)"
                } />
              </SelectTrigger>
              <SelectContent>
                {assigneeUsers.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    <div className="flex flex-col">
                      <span>{assignee.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {isRoleBased ? assignee.department : `${assignee.department} • ${assignee.role}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assigneeUsers.length === 0 && !loadingAssignees && (
              <p className="text-sm text-muted-foreground">
                No assignees available. Only users with 'assignee' or 'technical' roles can be assigned tickets.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Attachment(s)</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <div className="mt-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-sm font-medium text-primary hover:text-primary/80">
                      Click to upload files
                    </span>
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, PNG, TXT up to 10MB each</p>
                </div>
              </div>
            </div>

            {/* Display selected attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files:</Label>
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Complaint Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the customer's complaint or issue..."
              rows={6}
              required
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Raise Ticket"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
