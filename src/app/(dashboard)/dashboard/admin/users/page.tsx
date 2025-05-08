
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // Added for editing
import { Label } from "@/components/ui/label"; // Added for editing
import { getUsers, deleteUser as deleteDataUser, updateUserSavings, getSavingsByUserId, getProfitsByUserId, getLoansByUserId } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import type { User, SavingTransaction, ProfitEntry, LoanRequest } from "@/types";
import { Users, PlusCircle, Edit, Trash2, Eye, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getCurrentAdmin } from "@/lib/authService";


interface UserWithDetails extends User {
  totalSavings: number;
  totalProfits: number;
  activeLoans: number;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserWithDetails | null>(null);
  const [newSavingsAmount, setNewSavingsAmount] = useState<string>("");
  const [adminId, setAdminId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const admin = getCurrentAdmin();
    if (admin) setAdminId(admin.id);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const basicUsers = await getUsers();
      const usersWithDetails = await Promise.all(
        basicUsers.map(async (user) => {
          const [savings, profits, loans] = await Promise.all([
            getSavingsByUserId(user.id),
            getProfitsByUserId(user.id),
            getLoansByUserId(user.id),
          ]);
          const totalSavings = savings.filter(s => s.type === 'deposit').reduce((acc, s) => acc + s.amount, 0) - savings.filter(s => s.type === 'withdrawal').reduce((acc, s) => acc + s.amount, 0);
          const totalProfits = profits.reduce((acc, p) => acc + p.amount, 0);
          const activeLoans = loans.filter(l => l.status === 'pending' || l.status === 'approved').length;
          return { ...user, totalSavings, totalProfits, activeLoans };
        })
      );
      setUsers(usersWithDetails);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load user data." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!adminId) {
        toast({ variant: "destructive", title: "Error", description: "Admin not authenticated." });
        return;
    }
    const confirmed = window.confirm("Are you sure you want to delete this user and all their data? This action cannot be undone.");
    if (confirmed) {
      try {
        await deleteDataUser(userId); // Ensure deleteDataUser logs the audit
        toast({ title: "User Deleted", description: "The user has been successfully deleted." });
        fetchUsers(); // Refresh user list
      } catch (error) {
        console.error("Failed to delete user:", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the user." });
      }
    }
  };
  
  const handleEditSavings = (user: UserWithDetails) => {
    setSelectedUserForEdit(user);
    setNewSavingsAmount(user.totalSavings.toString()); // Pre-fill with current savings or an empty string
  };

  const handleSaveSavingsUpdate = async () => {
    if (!selectedUserForEdit || !adminId) {
      toast({ variant: "destructive", title: "Error", description: "No user selected or admin not authenticated." });
      return;
    }
    const amount = parseFloat(newSavingsAmount);
    if (isNaN(amount)) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid number for savings." });
      return;
    }
    
    // For this mock, we add a new transaction to represent the update.
    // In a real app, this would be a specific "adjustment" transaction type.
    // Or you'd edit specific existing transactions, which is more complex.
    try {
      await updateUserSavings(selectedUserForEdit.id, amount, new Date().toISOString()); //This function will also add an audit log entry
      toast({ title: "Savings Updated", description: `Savings for ${selectedUserForEdit.name} updated.` });
      setSelectedUserForEdit(null);
      setNewSavingsAmount("");
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Failed to update savings:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update savings." });
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
        <h1 className="text-2xl font-semibold flex items-center">
          <Users className="mr-3 h-6 w-6 text-primary" /> Manage Users
        </h1>
        <div>
          <Button variant="outline" size="icon" onClick={fetchUsers} className="mr-2">
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Refresh Users</span>
          </Button>
          <Button asChild>
            <Link href="/dashboard/admin/users/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New User
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Registered Users</CardTitle>
          <CardDescription>View, edit, and manage all users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Total Savings</TableHead>
                  <TableHead className="text-right">Total Profits</TableHead>
                  <TableHead className="text-center">Active Loans</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{format(new Date(user.createdAt), "PP")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(user.totalSavings)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(user.totalProfits)}</TableCell>
                    <TableCell className="text-center">{user.activeLoans}</TableCell>
                    <TableCell className="text-right space-x-1">
                       <Dialog>
                        <DialogTrigger asChild>
                           <Button variant="outline" size="icon" onClick={() => handleEditSavings(user)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Savings</span>
                          </Button>
                        </DialogTrigger>
                        {selectedUserForEdit && selectedUserForEdit.id === user.id && (
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Savings for {selectedUserForEdit.name}</DialogTitle>
                              <DialogDescription>
                                Enter the new total savings amount. This will create an adjustment transaction.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="savings-amount" className="text-right col-span-1">
                                  Savings
                                </Label>
                                <Input
                                  id="savings-amount"
                                  type="number"
                                  value={newSavingsAmount}
                                  onChange={(e) => setNewSavingsAmount(e.target.value)}
                                  className="col-span-3"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                               <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button onClick={handleSaveSavingsUpdate}>Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        )}
                      </Dialog>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete User</span>
                      </Button>
                      {/* <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/admin/users/${user.id}/details`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Link>
                      </Button> */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found in the system.</p>
               <Button asChild className="mt-4">
                <Link href="/dashboard/admin/users/add">Add First User</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
