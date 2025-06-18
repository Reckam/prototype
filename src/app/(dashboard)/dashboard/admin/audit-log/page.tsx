
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Import subscribeToAuditLogs
import { getAuditLogs, subscribeToAuditLogs } from "@/lib/dataService";
import type { AuditLogEntry } from "@/types";
import { FileClock, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef } from "react"; // Import useRef
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create a ref to hold the unsubscribe function
  const auditLogsSubscriptionRef = useRef<() => void | null>(null);


  useEffect(() => {
    fetchLogs();

    // Set up the real-time subscription after initial fetch
    const auditLogsChannel = subscribeToAuditLogs((payload) => {
      console.log('Real-time audit log change:', payload);

      if (payload.eventType === 'INSERT') {
        // Add the new log entry to the top of the list
        setLogs((prevLogs) => [payload.new, ...prevLogs]);
      } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        // For updates or deletes, re-fetch the entire list to maintain order and consistency
         fetchLogs();
      }
    });

    // Store the unsubscribe function in the ref
    auditLogsSubscriptionRef.current = () => auditLogsChannel.unsubscribe();


    // Cleanup function: unsubscribe when the component unmounts
    return () => {
      console.log('Unsubscribing from audit logs channel');
      if (auditLogsSubscriptionRef.current) {
        auditLogsSubscriptionRef.current();
      }
    };

  }, []); // Empty dependency array ensures this effect runs only once on mount


  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const auditLogs = await getAuditLogs();
      setLogs(auditLogs);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      // Consider adding a toast message for the user
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.adminName && log.adminName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    log.adminId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-semibold flex items-center">
          <FileClock className="mr-3 h-6 w-6 text-primary" /> Audit Log
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            type="search"
            placeholder="Search logs..."
            className="max-w-xs w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Keep refresh button for manual refresh if needed */}
          <Button variant="outline" size="icon" onClick={fetchLogs} aria-label="Refresh logs">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administrator Activity</CardTitle>
          <CardDescription>Tracks important actions performed by administrators in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.timestamp), "PPpp")}</TableCell>
                    <TableCell>{log.adminName || `ID: ${log.adminId}`}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                      {log.details ? JSON.stringify(log.details) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileClock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No logs match your search criteria." : "No audit log entries found."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
