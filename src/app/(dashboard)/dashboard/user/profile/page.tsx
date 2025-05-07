"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Edit, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUser, loginUser } from "@/lib/authService";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";
import { updateUser as updateUserData } from "@/lib/dataService";


export default function UserProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setName(currentUser.name);
      setEmail(currentUser.email);
    }
    setIsLoading(false);
  }, []);

  const handleEditToggle = () => setIsEditing(!isEditing);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const updatedUser = await updateUserData(user.id, { name, email });
      if (updatedUser) {
        // Re-login to update localStorage, in a real app this would be a session update
        await loginUser(updatedUser.email, "mockPassword"); // Mock password, real app would handle session
        setUser(updatedUser);
        toast({ title: "Profile Updated", description: "Your profile details have been saved." });
        setIsEditing(false);
      } else {
        throw new Error("Failed to update user data.");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not save your profile." });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading || !user) {
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
          <UserCircle className="mr-3 h-6 w-6 text-primary" /> My Profile
        </h1>
        <Button onClick={isEditing ? handleSaveProfile : handleEditToggle} disabled={isLoading && isEditing}>
          {isEditing ? (
            isLoading ? <><Save className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>
          ) : (
            <><Edit className="mr-2 h-4 w-4" /> Edit Profile</>
          )}
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>View and update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing || isLoading}
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isEditing || isLoading}
              className="text-base"
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="joined">Joined On</Label>
            <Input
              id="joined"
              value={new Date(user.createdAt).toLocaleDateString()}
              disabled
              className="text-base bg-muted"
            />
          </div>
          {isEditing && (
            <Card className="mt-6 bg-secondary/50">
              <CardHeader>
                <CardTitle className="text-lg">Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" disabled={isLoading} placeholder="Enter current password"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" disabled={isLoading} placeholder="Enter new password"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input id="confirm-new-password" type="password" disabled={isLoading} placeholder="Confirm new password"/>
                </div>
                <Button variant="outline" disabled={isLoading}>Update Password</Button>
                 <p className="text-xs text-muted-foreground">Password change functionality is illustrative for this mock.</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
