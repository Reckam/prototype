
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/lib/authService";
import { APP_NAME } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function UserRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [contact, setContact] = useState("");
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePhotoDataUrl(undefined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: "Passwords do not match.",
      });
      return;
    }
    setIsLoading(true);
    const { user, error } = await registerUser(name, username, password, contact, profilePhotoDataUrl);
    setIsLoading(false);

    if (user) {
      toast({
        title: "Registration Successful",
        description: `Welcome to ${APP_NAME}! Please log in.`,
      });
      router.push("/auth/login");
    } else {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error || "Could not create your account.",
      });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>Join {APP_NAME} to manage your savings and loans.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="e.g., johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="contact">Contact Number (Optional)</Label>
            <Input
              id="contact"
              type="tel"
              placeholder="e.g., 0771234567"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
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
              placeholder="Create a password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-photo">Profile Photo (Optional)</Label>
            <Input
              id="profile-photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Registering..." : "Register"}
            {!isLoading && <UserPlus className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 text-sm">
        <p>
          Already have an account?{" "}
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
