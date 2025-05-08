"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, completeInitialSetup } from "@/lib/authService";
import { checkUsernameAvailability } from "@/lib/dataService";
import { APP_NAME } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import type { User } from "@/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout"; // Assuming a simple layout or none if it's a modal-like flow

export default function ForceChangeCredentialsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [initialUsername, setInitialUsername] = useState("");


  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/auth/login");
    } else if (!user.forcePasswordChange) {
      // If somehow user lands here but doesn't need to change, redirect
      router.push("/dashboard/user");
    } else {
      setCurrentUser(user);
      setNewUsername(user.username); // Pre-fill with current username
      setInitialUsername(user.username);
    }
  }, [router]);

  useEffect(() => {
    const checkUser = async () => {
        if (newUsername && newUsername !== initialUsername) {
            setUsernameCheckLoading(true);
            const isAvailable = await checkUsernameAvailability(newUsername);
            setUsernameAvailable(isAvailable);
            setUsernameCheckLoading(false);
        } else if (newUsername === initialUsername) {
            setUsernameAvailable(null); // Reset if back to original
        } else {
            setUsernameAvailable(null);
        }
    };
    const debounce = setTimeout(checkUser, 500);
    return () => clearTimeout(debounce);
  }, [newUsername, initialUsername]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newUsername !== initialUsername && usernameAvailable === false) {
        toast({ variant: "destructive", title: "Username Taken", description: "Please choose a different username." });
        return;
    }
    if (newPassword.length < 4) {
      toast({ variant: "destructive", title: "Password Too Short", description: "New password must be at least 4 characters." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Passwords Don't Match", description: "New passwords do not match." });
      return;
    }

    setIsLoading(true);
    const result = await completeInitialSetup(currentUser.id, newUsername, newPassword);
    setIsLoading(false);

    if (result.user) {
      toast({
        title: "Credentials Updated",
        description: "Your username and password have been successfully updated. Welcome!",
      });
      router.push("/dashboard/user");
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: result.error || "Could not update your credentials. Please try again.",
      });
    }
  };
  
  // Render a loading state or a simple div if currentUser is not yet available to prevent layout shift
  // or errors if DashboardLayout depends on currentUser.
  if (!currentUser) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
    // This page should ideally not use the full DashboardLayout if it's a preliminary step.
    // Using a simpler layout for this specific purpose might be better.
    // For now, to ensure consistency if DashboardLayout expects a role:
    <DashboardLayout role="user"> 
        <div className="flex flex-col items-center justify-center py-12 px-4"> {/* Added px-4 for small screens */}
            <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="space-y-1 text-center">
                <UserCog className="mx-auto h-12 w-12 text-primary" />
                <CardTitle className="text-2xl">Secure Your Account</CardTitle>
                <CardDescription>
                Welcome to {APP_NAME}! For your security, please set a new username (optional) and password.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="new-username">New Username</Label>
                    <Input
                    id="new-username"
                    type="text"
                    placeholder="Choose your username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    />
                    {usernameCheckLoading && <p className="text-xs text-muted-foreground">Checking availability...</p>}
                    {usernameAvailable === true && newUsername !== initialUsername && <p className="text-xs text-green-600">Username available!</p>}
                    {usernameAvailable === false && newUsername !== initialUsername && <p className="text-xs text-red-600">Username taken.</p>}

                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password (min. 4 characters)"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || (newUsername !== initialUsername && usernameAvailable === false) || usernameCheckLoading}>
                    {isLoading ? "Saving..." : "Save Credentials"}
                    {!isLoading && <Save className="ml-2 h-4 w-4" />}
                </Button>
                </form>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground text-center block"> {/* Ensure text wraps */}
                Your current username is <span className="font-semibold">{initialUsername}</span>. You may keep it or choose a new one.
            </CardFooter>
            </Card>
        </div>
    </DashboardLayout>
  );
}
