"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuditLogs } from "@/lib/dataService";
import type { AuditLogEntry } from "@/types";
import { FileClock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

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
