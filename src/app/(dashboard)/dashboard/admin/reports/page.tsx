
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Download, Users, Landmark, TrendingUp, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell } from "recharts";
import { useEffect, useState } from "react";
import { getUsers, getAllLoans, getSavingsByUserId, getProfitsByUserId } from "@/lib/dataService";
import type { User as AppUser, LoanRequest, SavingTransaction, ProfitEntry } from "@/types";
import { cn } from "@/lib/utils";


interface ReportData {
  totalUsers: number;
  totalLoansIssued: number;
  totalLoanAmount: number;
  totalSavings: number;
  totalProfits: number;
  loanStatusCounts: { pending: number; approved: number; rejected: number };
  savingsOverTime: { month: string; amount: number }[]; // Simplified
}

const COLORS = ['#4CAF50', '#FFC107', '#F44336']; // Green, Yellow, Red for loan status

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const users = await getUsers();
      const loans = await getAllLoans();
      
      let totalSavings = 0;
      let totalProfits = 0;
      // Mock savings over time (last 6 months)
      const savingsOverTimeMock = Array(6).fill(0).map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          return { month: d.toLocaleString('default', { month: 'short' }), amount: Math.floor(Math.random() * 15000000) + 3000000 }; // UGX amounts
      }).reverse();


      for (const user of users) {
        const userSavings = await getSavingsByUserId(user.id);
        const userProfits = await getProfitsByUserId(user.id);
        totalSavings += userSavings.filter(s=>s.type === 'deposit').reduce((sum, s) => sum + s.amount, 0);
        totalSavings -= userSavings.filter(s=>s.type === 'withdrawal').reduce((sum, s) => sum + s.amount, 0);
        totalProfits += userProfits.reduce((sum, p) => sum + p.amount, 0);
      }

      setReportData({
        totalUsers: users.length,
        totalLoansIssued: loans.filter(l => l.status === 'approved').length,
        totalLoanAmount: loans.filter(l => l.status === 'approved').reduce((sum, l) => sum + l.amount, 0),
        totalSavings,
        totalProfits,
        loanStatusCounts: {
          pending: loans.filter(l => l.status === 'pending').length,
          approved: loans.filter(l => l.status === 'approved').length,
          rejected: loans.filter(l => l.status === 'rejected').length,
        },
        savingsOverTime: savingsOverTimeMock,
      });

    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
  };

  const loanStatusChartData = reportData ? [
    { name: 'Approved', value: reportData.loanStatusCounts.approved },
    { name: 'Pending', value: reportData.loanStatusCounts.pending },
    { name: 'Rejected', value: reportData.loanStatusCounts.rejected },
  ] : [];


  if (isLoading || !reportData) {
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
        <h1 className="text-2xl font-semibold flex items-center">
          <BarChart3 className="mr-3 h-6 w-6 text-primary" /> System Reports
        </h1>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export Reports (CSV)
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{reportData.totalUsers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings (System-wide)</CardTitle>
             <PiggyBank className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(reportData.totalSavings)}</div></CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profits (System-wide)</CardTitle>
             <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(reportData.totalProfits)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loans Issued</CardTitle>
            <Landmark className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{reportData.totalLoansIssued}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loan Amount Issued</CardTitle>
            <Landmark className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(reportData.totalLoanAmount)}</div></CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loan Status Distribution</CardTitle>
            <CardDescription>Breakdown of loan application statuses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={loanStatusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {loanStatusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} loans`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings Trend (Mock Data)</CardTitle>
            <CardDescription>Monthly total savings accumulation.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.savingsOverTime}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `UGX ${value/1000000}M`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}} />
                <Legend wrapperStyle={{fontSize: '12px'}} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total Savings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
            <CardTitle>More Reports Coming Soon</CardTitle>
            <CardDescription>Detailed user activity, profit generation sources, and more advanced analytics are under development.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">We are continuously working to provide you with comprehensive insights into your SACCO's performance.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
