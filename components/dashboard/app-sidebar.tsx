"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  LayoutTemplate,
  CalendarDays,
  Activity,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tenant Manager",
    href: "/dashboard/tenants",
    icon: Users,
  },
  {
    title: "Widget Studio",
    href: "/dashboard/widgets",
    icon: LayoutTemplate,
  },
  {
    title: "Match Fixtures",
    href: "/dashboard/matches",
    icon: CalendarDays,
  },
  {
    title: "Notification Logs",
    href: "/dashboard/logs",
    icon: Activity,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-foreground tracking-tight">SportsAdmin</span>
        </Link>
      </div>

      <div className="flex-1 py-6 px-4">
        <nav className="flex flex-col gap-1">
          <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <nav className="flex flex-col gap-1">
          <Link href="/dashboard/settings">
            <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <Settings className="h-4 w-4" />
              Settings
            </span>
          </Link>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}
