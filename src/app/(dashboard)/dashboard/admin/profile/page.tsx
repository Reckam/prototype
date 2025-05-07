"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Edit, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentAdmin } from "@/lib/authService";
import { useToast } from "@/hooks/use-toast";
import type { Admin } from "@/types";
// Admin profile updates would typically go to a secure admin management endpoint.
// For this mock, we'll assume there's no direct update mechanism for admin profiles via UI for simplicity.

export default function AdminProfilePage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false); // Admin profile editing disabled for mock
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const currentAdmin = getCurrentAdmin();
    if (currentAdmin) {
      setAdmin(currentAdmin);
      setName(currentAdmin.name);
      setEmail(currentAdmin.email);
    }
    setIsLoading(false);
  }, []);

  const handleSaveProfile = async () => {
    // Admin profile updates are typically more restricted and handled differently.
    // For this mock, we'll just show a toast message.
    toast({ title: "Profile Update (Mock)", description: "Admin profile updates would be handled by a super-admin or system process." });
    setIsEditing(false);
  };
  
  if (isLoading || !admin) {
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
          <ShieldCheck className="mr-3 h-6 w-6 text-primary" /> Admin Profile
        </h1>
        {/* Admin editing is disabled for this mock
        <Button onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)} disabled={isLoading && isEditing}>
          {isEditing ? (
            isLoading ? <><Save className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>
          ) : (
            <><Edit className="mr-2 h-4 w-4" /> Edit Profile</>
          )}
        </Button>
        */}
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Administrator Information</CardTitle>
          <CardDescription>View your administrator account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              disabled={!isEditing || isLoading}
              className="text-base bg-muted" // Use bg-muted for disabled inputs
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled={!isEditing || isLoading}
              className="text-base bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value="Administrator" // Hardcoded for admin
              disabled
              className="text-base bg-muted"
            />
          </div>
          
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
              <p className="text-xs text-muted-foreground">Password change functionality is illustrative for this mock. Admin password changes often have stricter security protocols.</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
