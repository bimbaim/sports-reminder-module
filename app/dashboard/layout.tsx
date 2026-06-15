import { AppSidebar } from "@/components/dashboard/app-sidebar"; // Keep this import if child components directly use `createClient()`
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Keep this import if child components directly use `createClient()`
import { Menu } from "lucide-react"; // Keep this import if child components directly use `createClient()`
import { createClient } from "@/lib/supabase/server"; // Keep this import if child components directly use `createClient()`
import { Button } from "@/components/ui/button"; // Keep this import if child components directly use `createClient()`

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authentication and redirection for the /dashboard route are handled by middleware.ts.
  // This layout should only be reached by authenticated users.
  // The blocking `supabase.auth.getUser()` call and redundant redirect logic have been removed
  // to prevent the "Blocking Route" error and improve initial page load performance.
  // If user-specific data is required for display within the layout or its children,
  // consider fetching it in a dedicated Server Component wrapped in <Suspense>,
  // or in a Client Component, to avoid blocking the entire route.

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 md:block flex-shrink-0">
        <AppSidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Top Navigation */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:hidden flex-shrink-0">
          <div className="font-bold text-lg text-primary tracking-tight">
            SportsAdmin
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6 text-foreground" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0">
              <AppSidebar />
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="h-full p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
