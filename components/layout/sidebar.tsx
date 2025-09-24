"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  TicketIcon,
  HomeIcon,
  PlusIcon,
  UsersIcon,
  SettingsIcon,
  LogOutIcon,
  BarChart3Icon,
  ClipboardListIcon,
  UserCheckIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { AuthService } from "@/lib/auth"
import type { User, UserRole } from "@/lib/types"

interface SidebarProps {
  user: User
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: HomeIcon,
    roles: ["channel_partner", "assignee", "head_office", "technical"],
  },
  {
    title: "My Tickets",
    href: "/dashboard/tickets",
    icon: TicketIcon,
    roles: ["channel_partner", "assignee", "head_office", "technical"],
  },
  {
    title: "Create Ticket",
    href: "/dashboard/tickets/create",
    icon: PlusIcon,
    roles: ["channel_partner", "assignee", "head_office"],
  },
  {
    title: "All Tickets",
    href: "/dashboard/all-tickets",
    icon: ClipboardListIcon,
    roles: ["head_office", "technical"],
  },
  {
    title: "Assignments",
    href: "/dashboard/assignments",
    icon: UserCheckIcon,
    roles: ["assignee", "head_office"],
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: UsersIcon,
    roles: ["head_office"],
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3Icon,
    roles: ["head_office", "technical"],
  },
  {
    title: "Admin Panel",
    href: "/dashboard/admin",
    icon: ShieldCheckIcon,
    roles: ["head_office"],
  },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = () => {
    AuthService.logout()
    router.push("/")
  }

  const filteredNavItems = navItems.filter((item) => item.roles.includes(user.role))

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
      default:
        return role
    }
  }

  return (
    <div
      className={cn("flex flex-col h-screen bg-sidebar border-r border-sidebar-border", isCollapsed ? "w-16" : "w-64")}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
          <TicketIcon className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!isCollapsed && (
          <div className="flex-1">
            <h1 className="font-semibold text-sidebar-foreground">SMILe Ticket System</h1>
          </div>
        )}
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                    isCollapsed && "px-2",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>{item.title}</span>}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{getRoleDisplayName(user.role)}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className={cn("flex-1", isCollapsed && "px-2")}>
            <SettingsIcon className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">Settings</span>}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className={cn("flex-1", isCollapsed && "px-2")}>
            <LogOutIcon className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}
