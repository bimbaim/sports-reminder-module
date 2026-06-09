import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Circle, Server, Users, CalendarDays, CheckCircle2 } from "lucide-react";
import { Suspense } from "react";

async function DashboardData() {
  const supabase = createAdminClient();

  // Fetch counts
  const { count: tenantCount } = await supabase
    .from("tenants")
    .select("*", { count: "exact", head: true });
  const { count: subscriberCount } = await supabase
    .from("subscribers")
    .select("*", { count: "exact", head: true });
  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  // Fetch recent notification logs
  const { data: logs } = await supabase
    .from("notification_logs")
    .select(
      `
      id, 
      channel, 
      status, 
      created_at, 
      subscribers(whatsapp_number, email)
    `
    )
    .order("created_at", { ascending: false })
    .limit(8);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case "success":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Success</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">Monitor your SaaS infrastructure and pipelines.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tenantCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active pubs in the network</p>
          </CardContent>
        </Card>
        
        {/* Metric 2 */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Subscribers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{subscriberCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all workspaces</p>
          </CardContent>
        </Card>
        
        {/* Metric 3 */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cached Fixtures</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{matchCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Synched from upstream API</p>
          </CardContent>
        </Card>

        {/* API Health Status */}
        <Card className="shadow-sm bg-zinc-900 text-zinc-50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">API Health</CardTitle>
            <Server className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              <span className="font-bold text-green-400">Operational</span>
            </div>
            <p className="text-xs text-zinc-400">All systems processing normally</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-[400px]">
        {/* Bento Box 1: Live Activity Feed */}
        <Card className="col-span-1 shadow-sm flex flex-col">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Circle className="h-2 w-2 fill-primary text-primary animate-pulse" />
              Live Activity Feed
            </CardTitle>
            <CardDescription>Latest system transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[400px] w-full">
              <div className="flex flex-col">
                {logs && logs.length > 0 ? (
                  logs.map((log) => {
                    const subscriber = log.subscribers as any;
                    const identifier =
                      log.channel === "whatsapp"
                        ? subscriber?.whatsapp_number
                        : subscriber?.email;

                    return (
                      <div
                        key={log.id}
                        className="p-4 border-b last:border-0 hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          {getStatusBadge(log.status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {identifier || "Unknown Recipient"}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                          Via {log.channel}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No recent activity in the queue.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Bento Box 2: Setup Guide / Empty State area */}
        <Card className="col-span-1 md:col-span-2 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="h-full flex flex-col items-center justify-center p-10 text-center">
            <div className="h-16 w-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Platform Ready</h2>
            <p className="text-muted-foreground max-w-md">
              Your SaaS infrastructure is properly configured. Use the Tenant Manager to onboard your first pubs or head to the Widget Studio to customize their embeds.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center animate-pulse text-muted-foreground">Loading Dashboard...</div>}>
      <DashboardData />
    </Suspense>
  );
}