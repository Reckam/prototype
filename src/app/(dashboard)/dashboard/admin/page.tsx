
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Landmark, FileClock, PlusCircle, ArrowRight, PiggyBank, TrendingUp, CalendarClock, CalendarRange } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentAdmin } from "@/lib/authService";
import type { Admin, AuditLogEntry, SavingTransaction } from "@/types";
import { getAllLoans, getAuditLogs, getUsers, getSavingsByUserId, getProfitsByUserId } from "@/lib/dataService"; 
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

export default function AdminDashboardPage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [pendingLoansCount, setPendingLoansCount] = useState<number>(0);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [totalSystemSavings, setTotalSystemSavings] = useState<number>(0);
  const [totalWeeklySavings, setTotalWeeklySavings] = useState<number>(0);
  const [totalMonthlySavings, setTotalMonthlySavings] = useState<number>(0);
  const [totalSystemProfits, setTotalSystemProfits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentAdmin = getCurrentAdmin();
    setAdmin(currentAdmin);
    if (currentAdmin) {
      fetchAdminDashboardData();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchAdminDashboardData = async () => {
    setIsLoading(true);
    try {
      const [users, loans, logs] = await Promise.all([
        getUsers(),
        getAllLoans(),
        getAuditLogs(),
      ]);

      setTotalUsers(users.length);
      setPendingLoansCount(loans.filter(loan => loan.status === 'pending').length);
      setRecentLogs(logs.slice(0, 5));

      let systemSavings = 0;
      let weeklySavings = 0;
      let monthlySavings = 0;
      let systemProfits = 0;

      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      for (const user of users) {
        const userSavingsTransactions = await getSavingsByUserId(user.id);
        const userProfits = await getProfitsByUserId(user.id);
        
        for (const s of userSavingsTransactions) {
          const transactionDate = parseISO(s.date);
          const amount = s.type === 'deposit' ? s.amount : -s.amount;
          systemSavings += amount;

          if (isWithinInterval(transactionDate, { start: weekStart, end: weekEnd })) {
            weeklySavings += amount;
          }
          if (isWithinInterval(transactionDate, { start: monthStart, end: monthEnd })) {
            monthlySavings += amount;
          }
        }
        
        systemProfits += userProfits
          .reduce((acc, curr) => acc + curr.amount, 0);
      }
      setTotalSystemSavings(systemSavings);
      setTotalWeeklySavings(weeklySavings);
      setTotalMonthlySavings(monthlySavings);
      setTotalSystemProfits(systemProfits);

    } catch (error) {
      console.error("Failed to fetch admin dashboard data:", error);
      // Handle error (e.g., show toast)
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
  };

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Button asChild>
          <Link href="/dashboard/admin/users/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New User
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users in the system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Loans</CardTitle>
            <Landmark className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLoansCount}</div>
            <p className="text-xs text-muted-foreground">Loan requests awaiting review</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total System Savings</CardTitle>
            <PiggyBank className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSystemSavings)}</div>
            <p className="text-xs text-muted-foreground">Current total savings across all users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total System Profits</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSystemProfits)}</div>
            <p className="text-xs text-muted-foreground">Total profits generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Savings</CardTitle>
            <CalendarClock className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalWeeklySavings)}</div>
            <p className="text-xs text-muted-foreground">Savings this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
            <CalendarRange className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlySavings)}</div>
            <p className="text-xs text-muted-foreground">Savings this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Recent Admin Actions (Audit Log)</CardTitle>
            <CardDescription>Latest activities performed by administrators.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLogs.length > 0 ? (
              recentLogs.map(log => (
                <div key={log.id} className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted">
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-sm text-muted-foreground">
                      By: {log.adminName || `Admin ID ${log.adminId}`} on {format(new Date(log.timestamp), "PPp")}
                    </p>
                  </div>
                  <FileClock className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent admin actions found.</p>
            )}
            <Button variant="outline" asChild className="w-full mt-4">
              <Link href="/dashboard/admin/audit-log">
                View Full Audit Log <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
