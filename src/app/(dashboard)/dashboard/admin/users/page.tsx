
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUsers, deleteUser as deleteDataUser, updateUserSavings, addAuditLog, getAllSavings, getAllProfits, getAllLoans } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import type { User, Admin } from "@/types";
import { Users, PlusCircle, Edit, Trash2, RefreshCw } from "lucide-react";
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
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    const currentAdmin = getCurrentAdmin();
    setAdmin(currentAdmin);
    fetchUsers();
  }, []);


  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const [basicUsers, allSavings, allProfits, allLoans] = await Promise.all([
          getUsers(),
          getAllSavings(),
          getAllProfits(),
          getAllLoans(),
      ]);

      const savingsByUser = allSavings.reduce((acc, s) => {
          if (!acc[s.userId]) acc[s.userId] = 0;
          acc[s.userId] += (s.type === 'deposit' ? s.amount : -s.amount);
          return acc;
      }, {} as Record<string, number>);

      const profitsByUser = allProfits.reduce((acc, p) => {
          if (!acc[p.userId]) acc[p.userId] = 0;
          acc[p.userId] += p.amount;
          return acc;
      }, {} as Record<string, number>);

      const activeLoansByUser = allLoans.reduce((acc, l) => {
          if (l.status === 'pending' || l.status === 'approved') {
              if (!acc[l.userId]) acc[l.userId] = 0;
              acc[l.userId]++;
          }
          return acc;
      }, {} as Record<string, number>);

      const usersWithDetails = basicUsers.map(user => ({
          ...user,
          totalSavings: savingsByUser[user.id] || 0,
          totalProfits: profitsByUser[user.id] || 0,
          activeLoans: activeLoansByUser[user.id] || 0,
      }));
      
      setUsers(usersWithDetails);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load user data." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!admin) {
        toast({ variant: "destructive", title: "Error", description: "Admin not authenticated." });
        return;
    }
    const confirmed = window.confirm("Are you sure you want to delete this user and all their data? This action cannot be undone.");
    if (confirmed) {
      try {
        await deleteDataUser(userId);
        await addAuditLog({
            adminId: admin.id,
            adminName: admin.name,
            action: `Deleted user: ${userName} (ID: ${userId})`,
            timestamp: new Date().toISOString(),
            details: { userId, userName }
        });
        toast({ title: "User Deleted", description: `User ${userName} has been deleted.` });
        fetchUsers();
      } catch (error) {
        console.error("Failed to delete user:", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the user." });
      }
    }
  };

  const handleEditSavings = (user: UserWithDetails) => {
    setSelectedUserForEdit(user);
    setNewSavingsAmount(user.totalSavings.toString());
  };

  const handleSaveSavingsUpdate = async () => {
    if (!selectedUserForEdit || !admin) {
      toast({ variant: "destructive", title: "Error", description: "No user selected or admin not authenticated." });
      return;
    }
    const amount = parseFloat(newSavingsAmount);
    if (isNaN(amount)) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid number for savings." });
      return;
    }

    try {
      await updateUserSavings(selectedUserForEdit.id, amount, new Date().toISOString(), admin.id, admin.name);
      toast({ title: "Savings Updated", description: `Savings for ${selectedUserForEdit.name} have been updated.` });
      setSelectedUserForEdit(null);
      setNewSavingsAmount("");
      fetchUsers();
    } catch (error) {
      console.error("Failed to update savings:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update savings." });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-semibold flex items-center">
          <Users className="mr-3 h-6 w-6 text-primary" /> Manage Users
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
           <Input
            type="search"
            placeholder="Search users..."
            className="max-w-xs w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="outline" size="icon" onClick={fetchUsers} className="mr-2 shrink-0">
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Refresh Users</span>
          </Button>
          <Button asChild className="shrink-0">
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
          {filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Total Savings</TableHead>
                  <TableHead className="text-right">Total Profits</TableHead>
                  <TableHead className="text-center">Active Loans</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.contact || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(user.createdAt), "PP")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(user.totalSavings)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(user.totalProfits)}</TableCell>
                    <TableCell className="text-center">{user.activeLoans}</TableCell>
                    <TableCell className="text-right space-x-1">
                       <Dialog>
                        <DialogTrigger asChild>
                           <Button variant="outline" size="sm" onClick={() => handleEditSavings(user)}>
                            <Edit className="mr-1 h-3 w-3" /> Edit Savings
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
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id, user.name)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete User</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No users match your search criteria." : "No users found in the system."}
              </p>
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
