"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addUser as addDataUser } from "@/lib/dataService"; // Using alias to avoid conflict with authService version
import { useToast } from "@/hooks/use-toast";
import { UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type { User } from "@/types";
import { getCurrentAdmin } from "@/lib/authService";


export default function AddUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // In real app, admin might not set this or it's temporary
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const admin = getCurrentAdmin();
    if (!admin) {
      toast({ variant: "destructive", title: "Error", description: "Admin not authenticated."});
      return;
    }

    setIsLoading(true);
    try {
      const newUser: Omit<User, 'id' | 'createdAt'> & { passwordPlain: string } = { name, email, passwordPlain: password };
      // In a real app, the backend would handle password hashing and full user creation.
      // For mock, we add directly. The password is not actually stored or used beyond this example.
      const createdUser = await addDataUser({
        id: `user_${Date.now()}`,
        name,
        email,
        createdAt: new Date().toISOString(),
      });
      // Log this action
      // await addAuditLog({ adminId: admin.id, adminName: admin.name, action: `Added new user: ${email}`, timestamp: new Date().toISOString() });


      toast({
        title: "User Added",
        description: `User ${createdUser.name} has been successfully created.`,
      });
      router.push("/dashboard/admin/users");
    } catch (error: any) {
      console.error("Failed to add user:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add User",
        description: error.message || "Could not create the user. Email might be taken.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" className="mr-4" asChild>
          <Link href="/dashboard/admin/users">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Users</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold flex items-center">
          <UserPlus className="mr-3 h-6 w-6 text-primary" /> Add New User
        </h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New User Details</CardTitle>
          <CardDescription>Fill in the information to create a new user account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Set a temporary password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6} // Basic validation
              />
              <p className="text-xs text-muted-foreground">User will be prompted to change this on first login (simulated).</p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Adding User..." : "Add User"}
              {!isLoading && <UserPlus className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            Ensure all information is correct. The user will receive an email (simulated) with login details.
          </p>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
}
