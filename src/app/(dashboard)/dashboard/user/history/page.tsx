"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/authService";
import { getSavingsByUserId, getProfitsByUserId } from "@/lib/dataService";
import type { User, SavingTransaction, ProfitEntry } from "@/types";
import { History as HistoryIcon, ListFilter } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CombinedHistoryItem = (SavingTransaction & { itemType: 'saving' }) | (ProfitEntry & { itemType: 'profit' });

export default function UserHistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [combinedHistory, setCombinedHistory] = useState<CombinedHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'savings' | 'profits'>('all');

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      fetchHistoryData(currentUser.id);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchHistoryData = async (userId: string) => {
    setIsLoading(true);
    try {
      const [userSavings, userProfits] = await Promise.all([
        getSavingsByUserId(userId),
        getProfitsByUserId(userId),
      ]);
      
      const savingsWithType: CombinedHistoryItem[] = userSavings.map(s => ({ ...s, itemType: 'saving' }));
      const profitsWithType: CombinedHistoryItem[] = userProfits.map(p => ({ ...p, itemType: 'profit' }));
      
      const combined = [...savingsWithType, ...profitsWithType].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setCombinedHistory(combined);

    } catch (error) {
      console.error("Failed to fetch history data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (filter === 'all') return combinedHistory;
    if (filter === 'savings') return combinedHistory.filter(item => item.itemType === 'saving');
    if (filter === 'profits') return combinedHistory.filter(item => item.itemType === 'profit');
    return [];
  }, [combinedHistory, filter]);

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
        <h1 className="text-2xl font-semibold flex items-center">
          <HistoryIcon className="mr-3 h-6 w-6 text-primary" /> Transaction History
        </h1>
        <div className="w-48">
          <Select value={filter} onValueChange={(value: 'all' | 'savings' | 'profits') => setFilter(value)}>
            <SelectTrigger>
              <ListFilter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="savings">Savings Only</SelectItem>
              <SelectItem value="profits">Profits Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Activity Log</CardTitle>
          <CardDescription>A comprehensive record of all your savings and profit transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.date), "PPp")}</TableCell>
                    <TableCell className="capitalize">
                      {item.itemType === 'saving' ? (item as SavingTransaction).type : 'Profit'}
                    </TableCell>
                    <TableCell>
                      {item.itemType === 'saving' 
                        ? `Saving ${ (item as SavingTransaction).type}`
                        : (item as ProfitEntry).description}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      item.itemType === 'profit' || (item.itemType === 'saving' && (item as SavingTransaction).type === 'deposit')
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {item.itemType === 'profit' || (item.itemType === 'saving' && (item as SavingTransaction).type === 'deposit') ? '+' : '-'}
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center py-8">
              <HistoryIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transaction history found for the selected filter.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
