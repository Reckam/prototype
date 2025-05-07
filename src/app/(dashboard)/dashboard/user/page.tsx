"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PiggyBank, Landmark, TrendingUp, History, PlusCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/authService";
import type { User, SavingTransaction, ProfitEntry, LoanRequest } from "@/types";
import { getSavingsByUserId, getProfitsByUserId, getLoansByUserId } from "@/lib/dataService";
import { format } from "date-fns";

export default function UserDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [totalSavings, setTotalSavings] = useState<number>(0);
  const [totalProfits, setTotalProfits] = useState<number>(0);
  const [recentSavings, setRecentSavings] = useState<SavingTransaction[]>([]);
  const [recentProfits, setRecentProfits] = useState<ProfitEntry[]>([]);
  const [recentLoans, setRecentLoans] = useState<LoanRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      fetchDashboardData(currentUser.id);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchDashboardData = async (userId: string) => {
    setIsLoading(true);
    try {
      const [savings, profits, loans] = await Promise.all([
        getSavingsByUserId(userId),
        getProfitsByUserId(userId),
        getLoansByUserId(userId),
      ]);

      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1).toISOString();

      const yearSavings = savings.filter(s => s.date >= yearStart && s.type === 'deposit').reduce((acc, curr) => acc + curr.amount, 0);
      const yearWithdrawals = savings.filter(s => s.date >= yearStart && s.type === 'withdrawal').reduce((acc, curr) => acc + curr.amount, 0);
      setTotalSavings(yearSavings - yearWithdrawals);
      
      const yearProfits = profits.filter(p => p.date >= yearStart).reduce((acc, curr) => acc + curr.amount, 0);
      setTotalProfits(yearProfits);

      setRecentSavings(savings.slice(0, 3));
      setRecentProfits(profits.slice(0, 3));
      setRecentLoans(loans.slice(0, 3));

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      // Handle error (e.g., show toast)
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };


  if (isLoading) {
    return (
      <DashboardLayout role="user">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}!</h1>
        <Button asChild>
          <Link href="/dashboard/user/loans/request">
            <PlusCircle className="mr-2 h-4 w-4" /> Request Loan
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings (This Year)</CardTitle>
            <PiggyBank className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSavings)}</div>
            <p className="text-xs text-muted-foreground">Accumulated since Jan 1, {new Date().getFullYear()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profits Earned</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalProfits)}</div>
            <p className="text-xs text-muted-foreground">Profits this year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Landmark className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentLoans.filter(l => l.status === 'approved' || l.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Pending or Approved</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest savings, profits, and loan updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-md font-semibold text-primary">Recent Savings</h3>
            {recentSavings.length > 0 ? (
              recentSavings.map(s => (
                <div key={s.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                  <div>
                    <p className={`font-medium ${s.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>{s.type === 'deposit' ? 'Deposit' : 'Withdrawal'}: {formatCurrency(s.amount)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(s.date), "PP")}</p>
                  </div>
                </div>
              ))
            ) : <p className="text-sm text-muted-foreground">No recent savings transactions.</p>}
            
            <h3 className="text-md font-semibold text-primary mt-4">Recent Profits</h3>
             {recentProfits.length > 0 ? (
              recentProfits.map(p => (
                <div key={p.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                  <div>
                    <p className="font-medium text-green-600">Profit: {formatCurrency(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{p.description} - {format(new Date(p.date), "PP")}</p>
                  </div>
                </div>
              ))
            ) : <p className="text-sm text-muted-foreground">No recent profit entries.</p>}

            <Link href="/dashboard/user/history" className="text-sm text-primary hover:underline flex items-center mt-4">
              View All History <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Requests</CardTitle>
            <CardDescription>Status of your recent loan applications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLoans.length > 0 ? (
              recentLoans.map(loan => (
                <div key={loan.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-semibold">{formatCurrency(loan.amount)}</p>
                    <p className="text-sm text-muted-foreground">Reason: {loan.reason}</p>
                     <p className="text-xs text-muted-foreground">Requested: {format(new Date(loan.requestedAt), "PPp")}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    loan.status === 'approved' ? 'bg-green-100 text-green-700' :
                    loan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">You have no recent loan requests.</p>
            )}
            <Button variant="outline" asChild className="w-full mt-4">
              <Link href="/dashboard/user/loans">
                View All Loans <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
