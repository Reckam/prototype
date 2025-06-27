
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Edit, Save, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentAdmin, loginAdmin } from "@/lib/authService"; // Assuming loginAdmin can re-auth or update session
import { useToast } from "@/hooks/use-toast";
import type { Admin } from "@/types";
// Admin profile updates (name/email) would typically go to a secure admin management endpoint.
// For this mock, we'll assume there's no direct update mechanism for admin name/username via UI for simplicity.

export default function AdminProfilePage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  // const [isEditing, setIsEditing] = useState(false); // Name/Username editing kept disabled as per original logic.
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const currentAdmin = getCurrentAdmin();
    if (currentAdmin) {
      setAdmin(currentAdmin);
      setName(currentAdmin.name);
      setUsername(currentAdmin.username);
    }
    setIsLoading(false);
  }, []);

  // const handleSaveProfile = async () => {
  //   // Admin profile updates are typically more restricted and handled differently.
  //   // For this mock, we'll just show a toast message.
  //   toast({ title: "Profile Update (Mock)", description: "Admin name/username updates would be handled by a super-admin or system process." });
  //   setIsEditing(false);
  // };

  const handleUpdatePassword = async () => {
    if (!admin) {
      toast({ variant: "destructive", title: "Error", description: "Admin not found." });
      return;
    }
    if (admin.username === "admin" && currentPassword !== "0000") {
      toast({ variant: "destructive", title: "Password Update Failed", description: "Current password incorrect." });
      return;
    }
    if (!newPassword || newPassword.length < 4) { // Basic length check for new password
        toast({ variant: "destructive", title: "Password Update Failed", description: "New password must be at least 4 characters long." });
        return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Password Update Failed", description: "New passwords do not match." });
      return;
    }

    setIsPasswordLoading(true);
    // Mock password update
    // In a real app, this would involve an API call to securely update the password.
    // For admin 'admin', we might update the mock password if we were to persist it, but here we just simulate.
    // For this example, we'll just show a success toast.
    // If we wanted to update the mock password for the 'admin' user for subsequent logins in this session,
    // we would need to modify how '0000' is handled in loginAdmin or store the new mock password.
    // For simplicity, we're not changing the "0000" master password for the 'admin' user in this mock.
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({ title: "Password Updated", description: "Your password has been successfully updated. (Mock)" });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setIsPasswordLoading(false);

    // If loginAdmin was designed to re-authenticate and update localStorage with new details (including a hypothetical new password hash)
    // you might call it here. For this mock, logout/login is a simpler way to "refresh" session if needed.
    // For now, we assume the password is "changed" but the 'admin' user's login password remains "0000" for the mock.
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
        {/* Name/Username editing button remains commented out as per original logic (not part of this request)
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
              disabled // Keep name editing disabled as per original
              className="text-base bg-muted" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              disabled // Keep username editing disabled
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
          
          <Card className="mt-6 bg-secondary/10 border-border shadow-inner">
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary"/> Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                    id="current-password" 
                    type="password" 
                    disabled={isPasswordLoading} 
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                    id="new-password" 
                    type="password" 
                    disabled={isPasswordLoading} 
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input 
                    id="confirm-new-password" 
                    type="password" 
                    disabled={isPasswordLoading} 
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
              <Button variant="outline" disabled={isPasswordLoading} onClick={handleUpdatePassword}>
                {isPasswordLoading ? (
                    <> <Save className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                ) : (
                    <> <Save className="mr-2 h-4 w-4" /> Update Password </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {admin.username === "admin" 
                  ? "For the default 'admin' user, the current password is '0000'. " 
                  : "Enter your current password to set a new one. "}
                Password change functionality is for demonstration.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
