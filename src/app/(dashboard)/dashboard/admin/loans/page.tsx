"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllLoans, updateLoanStatus as updateDataLoanStatus, getUserById } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import type { LoanRequest, User, LoanStatus } from "@/types";
import { Landmark, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getCurrentAdmin } from "@/lib/authService";

export default function ManageLoansPage() {
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
  const [newStatus, setNewStatus] = useState<LoanStatus | "">("");
  const [adminId, setAdminId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const admin = getCurrentAdmin();
    if (admin) setAdminId(admin.id);
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const allLoans = await getAllLoans();
      const loansWithUserDetails = await Promise.all(
        allLoans.map(async (loan) => {
          if (!loan.userName) { // Fetch user name if not present
            const user = await getUserById(loan.userId);
            return { ...loan, userName: user?.name || 'Unknown User' };
          }
          return loan;
        })
      );
      setLoans(loansWithUserDetails);
    } catch (error) {
      console.error("Failed to fetch loans:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load loan requests." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReviewDialog = (loan: LoanRequest) => {
    setSelectedLoan(loan);
    setNewStatus(loan.status);
  };

  const handleUpdateStatus = async () => {
    if (!selectedLoan || !newStatus || !adminId) {
      toast({ variant: "destructive", title: "Error", description: "Missing loan data, status or admin not authenticated." });
      return;
    }
    try {
      await updateDataLoanStatus(selectedLoan.id, newStatus as LoanStatus, adminId);
      toast({ title: "Loan Status Updated", description: `Loan for ${selectedLoan.userName} is now ${newStatus}.` });
      setSelectedLoan(null);
      setNewStatus("");
      fetchLoans(); // Refresh
    } catch (error) {
      console.error("Failed to update loan status:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update loan status." });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusBadgeClass = (status: LoanRequest['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
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
          <Landmark className="mr-3 h-6 w-6 text-primary" /> Manage Loan Requests
        </h1>
        <Button variant="outline" size="icon" onClick={fetchLoans}>
          <RefreshCw className="h-4 w-4" />
           <span className="sr-only">Refresh Loans</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Loan Applications</CardTitle>
          <CardDescription>Review, approve, or reject loan applications from users.</CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Requested On</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.userName || `User ID: ${loan.userId}`}</TableCell>
                    <TableCell>{format(new Date(loan.requestedAt), "PPp")}</TableCell>
                    <TableCell>{formatCurrency(loan.amount)}</TableCell>
                    <TableCell className="max-w-xs truncate">{loan.reason}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(loan.status)}`}>
                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleOpenReviewDialog(loan)}>
                            Review
                          </Button>
                        </DialogTrigger>
                        {selectedLoan && selectedLoan.id === loan.id && (
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Review Loan for {selectedLoan.userName}</DialogTitle>
                              <DialogDescription>
                                Amount: {formatCurrency(selectedLoan.amount)} <br/>
                                Reason: {selectedLoan.reason} <br/>
                                Requested On: {format(new Date(selectedLoan.requestedAt), "PPp")}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as LoanStatus)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select new status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button onClick={handleUpdateStatus} disabled={!newStatus || newStatus === selectedLoan.status}>
                                {newStatus === "approved" && <CheckCircle className="mr-2 h-4 w-4" />}
                                {newStatus === "rejected" && <XCircle className="mr-2 h-4 w-4" />}
                                Update Status
                              </Button>
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
              <Landmark className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No loan requests found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
