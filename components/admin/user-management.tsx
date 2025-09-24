"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SearchIcon, UserPlusIcon, MoreHorizontalIcon, EditIcon, TrashIcon, UserCheckIcon, UserXIcon } from "lucide-react"
import type { User, UserRole } from "@/lib/types"
import { AuthService } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"


const roleColors: Record<UserRole, string> = {
  channel_partner: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  assignee: "bg-green-500/10 text-green-500 border-green-500/20",
  head_office: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  technical: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  developer_support: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
}

const getRoleDisplayName = (role: UserRole) => {
  switch (role) {
    case "channel_partner":
      return "Channel Partner"
    case "assignee":
      return "Assignee"
    case "head_office":
      return "Head Office"
    case "technical":
      return "Technical Support"
    case "developer_support":
      return "Developer Support"
    default:
      return role
  }
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { toast } = useToast()

  // Form state for adding new user
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "channel_partner" as UserRole,
    department: "",
    location: ""
  })

  // Form state for editing user
  const [editUser, setEditUser] = useState({
    id: "",
    name: "",
    email: "",
    role: "channel_partner" as UserRole,
    department: "",
    location: "",
    isActive: true
  })

  const loadUsers = async () => {
    try {
      setLoading(true)
      const allUsers = await AuthService.getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      console.error("Failed to load users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [toast])

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again",
          variant: "destructive",
        })
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "User Created",
          description: `User ${data.user.name} has been created successfully`,
        })
        setNewUser({
          name: "",
          email: "",
          password: "",
          role: "channel_partner",
          department: "",
          location: ""
        })
        setIsAddUserOpen(false)
        loadUsers() // Reload users
      } else {
        toast({
          title: "Error Creating User",
          description: data.error || "Failed to create user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
      location: user.location || "",
      isActive: user.isActive ?? true
    })
    setIsEditUserOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!editUser.name || !editUser.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editUser),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message || "User updated successfully",
        })
        setIsEditUserOpen(false)
        setSelectedUser(null)
        loadUsers() // Reload users
      } else {
        toast({
          title: "Error Updating User",
          description: data.error || "Failed to update user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/users?id=${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message || "User deleted successfully",
        })
        loadUsers() // Reload users
      } else {
        toast({
          title: "Error Deleting User",
          description: data.error || "Failed to delete user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = !user.isActive
    const action = newStatus ? "enable" : "disable"
    
    if (!confirm(`Are you sure you want to ${action} user "${user.name}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: user.id,
          isActive: newStatus
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${action}d successfully`,
        })
        loadUsers() // Reload users
      } else {
        toast({
          title: `Error ${action === "enable" ? "Enabling" : "Disabling"} User`,
          description: data.error || `Failed to ${action} user`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} user`,
        variant: "destructive",
      })
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const roleStats = users.reduce(
    (acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    },
    {} as Record<UserRole, number>,
  )

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(roleStats).map(([role, count]) => (
          <Card key={role}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {getRoleDisplayName(role as UserRole)}
              </CardTitle>
              <Badge className={roleColors[role as UserRole]}>{count}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
              <p className="text-xs text-muted-foreground">Active users</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and their roles</CardDescription>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlusIcon className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with appropriate role and permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Password *
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role *
                    </Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="channel_partner">Channel Partner</SelectItem>
                        <SelectItem value="assignee">Assignee</SelectItem>
                        <SelectItem value="technical">Technical Support</SelectItem>
                        <SelectItem value="developer_support">Developer Support</SelectItem>
                        <SelectItem value="head_office">Head Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="department" className="text-right">
                      Department
                    </Label>
                    <Input
                      id="department"
                      value={newUser.department}
                      onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter department"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="location" className="text-right">
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={newUser.location}
                      onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter location"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Update user information and permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">
                      Name *
                    </Label>
                    <Input
                      id="edit-name"
                      value={editUser.name}
                      onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-email" className="text-right">
                      Email *
                    </Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editUser.email}
                      onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-role" className="text-right">
                      Role *
                    </Label>
                    <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value as UserRole })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="channel_partner">Channel Partner</SelectItem>
                        <SelectItem value="assignee">Assignee</SelectItem>
                        <SelectItem value="technical">Technical Support</SelectItem>
                        <SelectItem value="developer_support">Developer Support</SelectItem>
                        <SelectItem value="head_office">Head Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-department" className="text-right">
                      Department
                    </Label>
                    <Input
                      id="edit-department"
                      value={editUser.department}
                      onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter department"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-location" className="text-right">
                      Location
                    </Label>
                    <Input
                      id="edit-location"
                      value={editUser.location}
                      onChange={(e) => setEditUser({ ...editUser, location: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter location"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-status" className="text-right">
                      Status
                    </Label>
                    <Select value={editUser.isActive ? "active" : "inactive"} onValueChange={(value) => setEditUser({ ...editUser, isActive: value === "active" })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateUser} disabled={isUpdating}>
                    {isUpdating ? "Updating..." : "Update User"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="channel_partner">Channel Partner</SelectItem>
                <SelectItem value="assignee">Assignee</SelectItem>
                <SelectItem value="head_office">Head Office</SelectItem>
                <SelectItem value="technical">Technical Support</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Loading users...</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback>
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{user.name}</h4>
                      <Badge className={roleColors[user.role]}>{getRoleDisplayName(user.role)}</Badge>
                      <Badge variant={user.isActive ? "default" : "secondary"} className={user.isActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      {user.department && <span>{user.department}</span>}
                      {user.location && <span>{user.location}</span>}
                      <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Edit Action */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                    title="Edit User"
                  >
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  
                  {/* Active/Inactive Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleUserStatus(user)}
                    className={`h-8 w-8 p-0 ${
                      user.isActive 
                        ? 'hover:bg-red-50 hover:text-red-600' 
                        : 'hover:bg-green-50 hover:text-green-600'
                    }`}
                    title={user.isActive ? "Disable User" : "Enable User"}
                  >
                    {user.isActive ? (
                      <UserXIcon className="w-4 h-4" />
                    ) : (
                      <UserCheckIcon className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {/* Delete Action */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                    title="Delete User"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              ))
            )}
          </div>

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
