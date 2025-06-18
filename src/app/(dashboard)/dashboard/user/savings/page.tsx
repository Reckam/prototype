
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added CardDescription
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
// Import necessary functions from dataService and authService
import { getSavingsByUserId, subscribeToSavings } from "@/lib/dataService";
import { getCurrentUser } from "@/lib/authService";
import type { SavingTransaction, User } from "@/types";
import { useEffect, useState, useRef } from "react"; // Import useRef
import { format } from "date-fns";
import { DollarSign } from "lucide-react";

export default function UserSavingsPage() {
  const [savings, setSavings] = useState<SavingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Create a ref to hold the unsubscribe function
  const savingsSubscriptionRef = useRef<() => void | null>(null);


  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      fetchSavings(currentUser.id); // Fetch initial savings

      // Set up the real-time subscription after initial fetch
      const savingsChannel = subscribeToSavings((payload) => {
        console.log('Real-time savings change:', payload);

        // Since savings are specific to the user, we filter by user_id
        if (payload.new?.user_id === currentUser.id || payload.old?.user_id === currentUser.id) {
          console.log("Relevant savings change for current user, refetching...");
          // Re-fetch savings when a change occurs for the current user
          fetchSavings(currentUser.id);
        }
      });

      // Store the unsubscribe function in the ref
      savingsSubscriptionRef.current = () => savingsChannel.unsubscribe();

      // Cleanup function: unsubscribe when the component unmounts
      return () => {
        console.log('Unsubscribing from savings channel');
        if (savingsSubscriptionRef.current) {
          savingsSubscriptionRef.current();
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


  const fetchSavings = async (userId: string) => {
    setIsLoading(true);
    try {
      const userSavings = await getSavingsByUserId(userId);
      setSavings(userSavings);
    } catch (error) {
      console.error("Failed to fetch savings:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load savings data." });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(amount);
  };

  const calculateTotalSavings = () => {
      return savings.reduce((total, transaction) => {
          if (transaction.type === 'deposit') {
              return total + transaction.amount;
          } else if (transaction.type === 'withdrawal') {
              return total - transaction.amount;
          }
          return total;
      }, 0);
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
          <DollarSign className="mr-3 h-6 w-6 text-primary" /> My Savings
        </h1>
        {/* Optional: Add a button to trigger adding a new saving transaction if applicable */}
      </div>

       <div className="mb-6">
           <Card>
               <CardHeader>
                   <CardTitle>Current Total Savings</CardTitle>
               </CardHeader>
               <CardContent>
                   <p className="text-3xl font-bold text-primary">{formatCurrency(calculateTotalSavings())}</p>
               </CardContent>
           </Card>
       </div>


      <Card>
        <CardHeader>
          <CardTitle>Savings Transaction History</CardTitle>
          <CardDescription>View all your savings deposits and withdrawals.</CardDescription>
        </CardHeader>
        <CardContent>
          {savings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savings.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(new Date(transaction.date), "PP")}</TableCell>
                    <TableCell className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>{transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(transaction.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center py-8">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" /> {/* Added icon for empty state */}
                <p className="text-muted-foreground">No savings transactions found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
