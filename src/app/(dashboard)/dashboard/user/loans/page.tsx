
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/authService";
// Import subscribeToLoans
import { getLoansByUserId, subscribeToLoans } from "@/lib/dataService";
import type { User, LoanRequest } from "@/types";
import { Landmark, PlusCircle, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react"; // Import useRef
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast"; // Import useToast

export default function UserLoansPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast(); // Initialize useToast

  // Create a ref to hold the unsubscribe function
  const loansSubscriptionRef = useRef<() => void | null>(null);


  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      fetchLoansData(currentUser.id); // Fetch initial loans

      // Set up the real-time subscription after initial fetch
      const loansChannel = subscribeToLoans((payload) => {
        console.log('Real-time loans change:', payload);

        // Since loans are specific to the user, we filter by user_id
        if (payload.new?.user_id === currentUser.id || payload.old?.user_id === currentUser.id) {
          console.log("Relevant loans change for current user, refetching...");
          // Re-fetch loans when a change occurs for the current user
          fetchLoansData(currentUser.id);
          // Optional: Show a toast notification for the user about the loan status change
          if (payload.eventType === 'UPDATE' && payload.new?.status !== payload.old?.status) {
              toast({
                  title: "Loan Status Updated",
                  description: `Your loan request status has changed to ${payload.new.status}.`,
              });
          } else if (payload.eventType === 'INSERT') {
               toast({
                  title: "New Loan Request Created",
                  description: `Your loan request for ${formatCurrency(payload.new.amount)} was submitted.`,
              });
          }
          // You might not need specific toasts for DELETE on the user's page

        }
      });

      // Store the unsubscribe function in the ref
      loansSubscriptionRef.current = () => loansChannel.unsubscribe();


      // Cleanup function: unsubscribe when the component unmounts
      return () => {
        console.log('Unsubscribing from loans channel');
        if (loansSubscriptionRef.current) {
          loansSubscriptionRef.current();
        }
      };

    } else {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "User not logged in.",
      });
      // Redirect to login or handle authentication error
    }
  }, []); // Empty dependency array ensures this effect runs only once on mount


  const fetchLoansData = async (userId: string) => {
    setIsLoading(true);
    try {
      const userLoans = await getLoansByUserId(userId);
      setLoans(userLoans);
    } catch (error) {
      console.error("Failed to fetch loans data:", error);
      // Consider showing a user-friendly error message with toast
      toast({ variant: "destructive", title: "Error", description: "Could not load loan data." });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
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
      <DashboardLayout role="user">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

    if (!user) {
      return (
         <DashboardLayout role="user">
            <div className="text-center py-8 text-red-500">
               Authentication required. Please log in.
            </div>
         </DashboardLayout>
      );
  }

  return (
    <DashboardLayout role="user">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center">
          <Landmark className="mr-3 h-6 w-6 text-primary" /> My Loan Requests
        </h1>
        <Button asChild>
          <Link href="/dashboard/user/loans/request">
            <PlusCircle className="mr-2 h-4 w-4" /> New Loan Request
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Application History</CardTitle>
          <CardDescription>Track the status of all your loan applications.</CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested On</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed On</TableHead>
                  {/* <TableHead className="text-right">Actions</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{format(new Date(loan.requestedAt), "PPp")}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(loan.amount)}</TableCell>
                    <TableCell>{loan.reason}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(loan.status)}`}>
                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{loan.reviewedAt ? format(new Date(loan.reviewedAt), "PPp") : "N/A"}</TableCell>
                    {/* <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/user/loans/${loan.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Link>
                      </Button>
                    </TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Landmark className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You haven&apos;t made any loan requests yet.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/user/loans/request">Request a Loan</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
