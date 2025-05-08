
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/authService";
import { APP_NAME } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null); // Clear previous message
    const result = await requestPasswordReset(username);
    setIsLoading(false);

    // Display the message from the auth service, which is designed to be generic
    // for security (doesn't reveal if an account exists or not).
    toast({
      title: "Password Reset Request",
      description: result.message,
    });
    setMessage(result.message); // Display message on page as well
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <KeyRound className="mx-auto h-10 w-10 text-primary" />
        <CardTitle className="text-2xl">Forgot Password?</CardTitle>
        <CardDescription>
          No problem! Enter your username below and we&apos;ll simulate sending a password reset link.
        </CardDescription>
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Reset Link"}
            {!isLoading && <Send className="ml-2 h-4 w-4" />}
          </Button>
        </form>
        {message && (
          <p className="mt-4 text-sm text-center text-muted-foreground bg-secondary p-3 rounded-md">
            {message}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 text-sm">
        <p>
          Remember your password?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Login here
          </Link>
        </p>
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
          Back to Home
        </Link>
      </CardFooter>
    </Card>
  );
}
