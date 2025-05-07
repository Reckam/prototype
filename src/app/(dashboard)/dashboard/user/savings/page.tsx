"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/authService";
import { getSavingsByUserId, getProfitsByUserId } from "@/lib/dataService";
import type { User, SavingTransaction, ProfitEntry } from "@/types";
import { PiggyBank, TrendingUp, History as HistoryIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function UserSavingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [savings, setSavings] = useState<SavingTransaction[]>([]);
  const [profits, setProfits] = useState<ProfitEntry[]>([]);
  const [totalSavings, setTotalSavings] = useState<number>(0);
  const [totalProfitsEarned, setTotalProfitsEarned] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      fetchSavingsData(currentUser.id);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchSavingsData = async (userId: string) => {
    setIsLoading(true);
    try {
      const [userSavings, userProfits] = await Promise.all([
        getSavingsByUserId(userId),
        getProfitsByUserId(userId),
      ]);
      setSavings(userSavings);
      setProfits(userProfits);

      const currentYearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      
      const yearDeposits = userSavings
        .filter(s => s.date >= currentYearStart && s.type === 'deposit')
        .reduce((sum, s) => sum + s.amount, 0);
      const yearWithdrawals = userSavings
        .filter(s => s.date >= currentYearStart && s.type === 'withdrawal')
        .reduce((sum, s) => sum + s.amount, 0);
      setTotalSavings(yearDeposits - yearWithdrawals);

      const yearProfits = userProfits
        .filter(p => p.date >= currentYearStart)
        .reduce((sum, p) => sum + p.amount, 0);
      setTotalProfitsEarned(yearProfits);

    } catch (error) {
      console.error("Failed to fetch savings data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
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
        <h1 className="text-2xl font-semibold">My Savings</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings (This Year)</CardTitle>
            <PiggyBank className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSavings)}</div>
            <p className="text-xs text-muted-foreground">Since Jan 1, {new Date().getFullYear()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profits Earned (This Year)</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalProfitsEarned)}</div>
             <p className="text-xs text-muted-foreground">Profits gained this year</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Savings & Profits History</CardTitle>
          <CardDescription>Detailed record of your savings transactions and profits earned.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="savings">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="savings"><PiggyBank className="mr-2 h-4 w-4 inline-block" />Savings History</TabsTrigger>
              <TabsTrigger value="profits"><TrendingUp className="mr-2 h-4 w-4 inline-block" />Profits History</TabsTrigger>
            </TabsList>
            <TabsContent value="savings">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savings.length > 0 ? savings.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.date), "PP")}</TableCell>
                      <TableCell className={`capitalize ${item.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>{item.type}</TableCell>
                      <TableCell className={`text-right font-medium ${item.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  )) : (
                     <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No savings transactions found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="profits">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profits.length > 0 ? profits.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.date), "PP")}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">+{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No profit entries found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
