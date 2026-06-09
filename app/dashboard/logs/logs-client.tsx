"use client";

import { useState } from "react";
import { Activity, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export function LogsClient({ logs }: { logs: any[] }) {
  const [search, setSearch] = useState("");

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const s = search.toLowerCase();
    
    // Safely extract subscriber info since it's a joined record
    const subscriber = log.subscribers as any;
    const email = subscriber?.email?.toLowerCase() || "";
    const phone = subscriber?.whatsapp_number?.toLowerCase() || "";
    const pubName = subscriber?.tenants?.name?.toLowerCase() || "";

    return email.includes(s) || phone.includes(s) || pubName.includes(s);
  });

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
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Notification Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Audit trail of all dispatched reminders across all tenants.
          </p>
        </div>
        
        <div className="relative w-full md:w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email, phone, or pub..."
            className="pl-8 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex-1">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Target Match</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const subscriber = log.subscribers as any;
                const match = log.matches as any;
                const tenant = subscriber?.tenants as any;
                const recipient = log.channel === "whatsapp" 
                  ? subscriber?.whatsapp_number 
                  : subscriber?.email;

                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {tenant?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {recipient || "Unknown"}
                    </TableCell>
                    <TableCell className="uppercase text-xs tracking-wider font-semibold text-muted-foreground">
                      {log.channel}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {match?.home_team} vs {match?.away_team}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(log.status)}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No logs found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
