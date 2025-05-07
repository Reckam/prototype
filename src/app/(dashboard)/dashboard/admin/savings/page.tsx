"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { getUsers, getSavingsByUserId, updateUserSavings as dataUpdateUserSavings, addSavingTransaction } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import type { User, SavingTransaction } from "@/types";
import { Edit3, PiggyBank, PlusCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getCurrentAdmin } from "@/lib/authService";

interface UserWithSavings extends User {
  totalSavings: number;
  recentTransactions: SavingTransaction[];
}

export default function ManageSavingsRecordsPage() {
  const [usersWithSavings, setUsersWithSavings] = useState<UserWithSavings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithSavings | null>(null);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [transactionAmount, setTransactionAmount] = useState<string>("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");


  const { toast } = useToast();

  useEffect(() => {
    const admin = getCurrentAdmin();
    if(admin) setAdminId(admin.id);
    fetchUserSavingsData();
  }, []);

  const fetchUserSavingsData = async () => {
    setIsLoading(true);
    try {
      const users = await getUsers();
      const populatedUsers = await Promise.all(
        users.map(async (user) => {
          const savings = await getSavingsByUserId(user.id);
          const totalSavings = savings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);
          return { ...user, totalSavings, recentTransactions: savings.slice(0,3) };
        })
      );
      setUsersWithSavings(populatedUsers);
    } catch (error) {
      console.error("Failed to fetch user savings data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load user savings." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTransactionDialog = (user: UserWithSavings) => {
    setSelectedUser(user);
    setTransactionAmount("");
    setTransactionType("deposit");
  };

  const handleAddTransaction = async () => {
    if (!selectedUser || !adminId) {
      toast({ variant: "destructive", title: "Error", description: "User or admin not identified." });
      return;
    }
    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid positive amount." });
      return;
    }

    try {
      // This will also add an audit log entry.
      // For mock, the updateUserSavings function in dataService.ts handles audit logging for this type of "update".
      // If we want a specific 'add transaction' audit log, we'd call addAuditLog here or ensure addSavingTransaction does it.
      await addSavingTransaction({
          userId: selectedUser.id,
          amount: amount,
          date: new Date().toISOString(),
          type: transactionType
      });

      toast({ title: "Transaction Added", description: `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} of ${formatCurrency(amount)} for ${selectedUser.name} recorded.` });
      setSelectedUser(null);
      fetchUserSavingsData(); // Refresh data
    } catch (error) {
      console.error("Failed to add transaction:", error);
      toast({ variant: "destructive", title: "Transaction Failed", description: "Could not record the transaction." });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const filteredUsers = usersWithSavings.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
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
          <Edit3 className="mr-3 h-6 w-6 text-primary" /> User Savings Records
        </h1>
         <div className="flex gap-2 w-full sm:w-auto">
          <Input 
            type="search"
            placeholder="Search users..."
            className="max-w-xs w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="outline" size="icon" onClick={fetchUserSavingsData} aria-label="Refresh savings records">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Savings Overview</CardTitle>
          <CardDescription>View and manage savings records for all users. You can add deposits or withdrawals.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Total Savings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-right">{formatCurrency(user.totalSavings)}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleOpenTransactionDialog(user)}>
                            <PlusCircle className="mr-1 h-3 w-3" /> Add Transaction
                          </Button>
                        </DialogTrigger>
                        {selectedUser && selectedUser.id === user.id && (
                           <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Transaction for {selectedUser.name}</DialogTitle>
                              <DialogDescription>
                                Current Savings: {formatCurrency(selectedUser.totalSavings)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="transaction-type" className="text-right">Type</Label>
                                <Select value={transactionType} onValueChange={(value: 'deposit' | 'withdrawal') => setTransactionType(value)}>
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="deposit">Deposit</SelectItem>
                                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="transaction-amount" className="text-right">Amount</Label>
                                <Input
                                  id="transaction-amount"
                                  type="number"
                                  value={transactionAmount}
                                  onChange={(e) => setTransactionAmount(e.target.value)}
                                  className="col-span-3"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                               <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                              <Button onClick={handleAddTransaction}>Record Transaction</Button>
                            </DialogFooter>
                          </DialogContent>
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No users match your search." : "No user savings data found."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
