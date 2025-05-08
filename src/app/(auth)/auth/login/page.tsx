
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/lib/authService";
import { APP_NAME } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function UserLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // The 'username' here will be treated as the user's email by the authService for lookup
    const { user, error } = await loginUser(username, password);
    setIsLoading(false);

    if (user) {
      toast({
        title: "Login Successful",
        description: `Welcome back to ${APP_NAME}!`,
      });
      router.push("/dashboard/user");
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error || "Invalid username or password.",
      });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">User Login</CardTitle>
        <CardDescription>Enter your credentials to access your {APP_NAME} account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
            {!isLoading && <LogIn className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 text-sm">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-medium text-primary hover:underline">
            Register here
          </Link>
        </p>
        <p>
          Are you an admin?{" "}
          <Link href="/auth/admin-login" className="font-medium text-primary hover:underline">
            Admin Login
          </Link>
        </p>
         <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            Back to Home
          </Link>
      </CardFooter>
    </Card>
  );
}

