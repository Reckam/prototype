
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/authService";
import { addLoanRequest } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import { Send, Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import type { User } from "@/types";

export default function RequestLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login'); // Redirect if not logged in
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "User not found. Please log in again." });
      return;
    }
    if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid loan amount." });
      return;
    }
    if (!reason.trim()) {
      toast({ variant: "destructive", title: "Reason Required", description: "Please provide a reason for your loan request." });
      return;
    }

    setIsLoading(true);
    try {
      await addLoanRequest({
        userId: user.id,
        amount: parseFloat(amount),
        reason,
      });
      toast({
        title: "Loan Request Submitted",
        description: "Your loan request has been successfully submitted for review.",
      });
      router.push("/dashboard/user/loans");
    } catch (error) {
      console.error("Failed to submit loan request:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "There was an error submitting your loan request. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!user) {
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
          <Landmark className="mr-3 h-6 w-6 text-primary" /> Request a New Loan
        </h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Loan Application Form</CardTitle>
          <CardDescription>Please fill out the details below to apply for a loan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Loan Amount (UGX)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g., 1000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="0.01"
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Loan</Label>
              <Textarea
                id="reason"
                placeholder="Briefly explain why you need this loan..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                required
                className="text-base"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Loan Request"}
              {!isLoading && <Send className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Loan requests are subject to approval based on SACCO policies. You will be notified of the status.
          </p>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
}
