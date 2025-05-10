
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Edit, Save, KeyRound, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUser, updateUserInSession, changeUserPassword } from "@/lib/authService";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";
import { updateUser as updateUserDataService, checkUsernameAvailability } from "@/lib/dataService";


export default function UserProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [initialUsername, setInitialUsername] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [contact, setContact] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | undefined>(undefined);
  const [newProfilePhotoPreview, setNewProfilePhotoPreview] = useState<string | null>(null);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingSaveProfile, setIsLoadingSaveProfile] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);


  const { toast } = useToast();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setName(currentUser.name);
      setUsername(currentUser.username);
      setContact(currentUser.contact || "");
      setInitialUsername(currentUser.username);
      setProfilePhotoUrl(currentUser.profilePhotoUrl);
      setNewProfilePhotoPreview(currentUser.profilePhotoUrl || null);
    }
    setPageLoading(false);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
        if (username && username !== initialUsername) {
            setUsernameCheckLoading(true);
            const isAvailable = await checkUsernameAvailability(username);
            setUsernameAvailable(isAvailable);
            setUsernameCheckLoading(false);
        } else if (username === initialUsername) {
             setUsernameAvailable(null); // Reset if back to original or same
        } else {
            setUsernameAvailable(null);
        }
    };
    if(isEditing){
        const debounce = setTimeout(checkUser, 500);
        return () => clearTimeout(debounce);
    }
  }, [username, initialUsername, isEditing]);


  const handleEditToggle = () => {
      if(isEditing){ // If was editing, now cancelling
        if(user){
            setName(user.name);
            setUsername(user.username);
            setContact(user.contact || "");
            setNewProfilePhotoPreview(user.profilePhotoUrl || null);
            setUsernameAvailable(null); 
        }
      }
      setIsEditing(!isEditing);
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewProfilePhotoPreview(profilePhotoUrl || null); 
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (username !== initialUsername && usernameAvailable === false) {
        toast({ variant: "destructive", title: "Username Taken", description: "Please choose a different username." });
        return;
    }

    setIsLoadingSaveProfile(true);
    try {
      const updatedUserData: Partial<User> = { name, username, contact, profilePhotoUrl: newProfilePhotoPreview || undefined };
      
      const updatedUserResponse = await updateUserDataService(user.id, updatedUserData);
      if (updatedUserResponse) {
        updateUserInSession(updatedUserResponse); 
        setUser(updatedUserResponse);
        setInitialUsername(updatedUserResponse.username); 
        setProfilePhotoUrl(updatedUserResponse.profilePhotoUrl); 
        setContact(updatedUserResponse.contact || "");
        toast({ title: "Profile Updated", description: "Your profile details have been saved." });
        setIsEditing(false);
        setUsernameAvailable(null); 
      } else {
        throw new Error("Failed to update user data.");
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast({ variant: "destructive", title: "Profile Update Failed", description: error.message || "Could not save your profile." });
    } finally {
      setIsLoadingSaveProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "User not found." });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast({ variant: "destructive", title: "Password Update Failed", description: "New password must be at least 4 characters long." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Password Update Failed", description: "New passwords do not match." });
      return;
    }
    if (!currentPassword) {
      toast({ variant: "destructive", title: "Current Password Required", description: "Please enter your current password." });
      return;
    }

    setIsPasswordUpdating(true);
    const result = await changeUserPassword(user.id, currentPassword, newPassword);
    setIsPasswordUpdating(false);

    if (result.success) {
      toast({ title: "Password Updated", description: result.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      toast({ variant: "destructive", title: "Password Update Failed", description: result.message });
    }
  };
  
  if (pageLoading || !user) {
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
        <Button 
          onClick={isEditing ? handleSaveProfile : handleEditToggle} 
          disabled={ (isEditing && isLoadingSaveProfile) || (isEditing && username !== initialUsername && usernameAvailable === false) || (isEditing && usernameCheckLoading) }
        >
          {isEditing ? (
            isLoadingSaveProfile ? <><Save className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Profile</>
          ) : (
            <><Edit className="mr-2 h-4 w-4" /> Edit Profile</>
          )}
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>View and update your personal details. Password changes are handled separately below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32 border-4 border-primary shadow-lg">
              <AvatarImage src={newProfilePhotoPreview || profilePhotoUrl} alt={user.name} data-ai-hint="user avatar" />
              <AvatarFallback className="text-4xl">
                {user.name ? user.name.charAt(0).toUpperCase() : <UserCircle />}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <div className="w-full max-w-xs">
                <Label htmlFor="profile-photo-edit" className="text-sm font-medium text-muted-foreground">Change Profile Photo</Label>
                <Input
                  id="profile-photo-edit"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  disabled={isLoadingSaveProfile}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing || isLoadingSaveProfile}
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!isEditing || isLoadingSaveProfile}
              className="text-base"
            />
            {isEditing && usernameCheckLoading && <p className="text-xs text-muted-foreground">Checking availability...</p>}
            {isEditing && usernameAvailable === true && username !== initialUsername && <p className="text-xs text-green-600">Username available!</p>}
            {isEditing && usernameAvailable === false && username !== initialUsername && <p className="text-xs text-red-600">Username taken.</p>}
          </div>
           <div className="space-y-2">
            <Label htmlFor="contact">Contact (Phone Number)</Label>
            <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                id="contact"
                type="tel"
                placeholder="07XX XXX XXX"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                disabled={!isEditing || isLoadingSaveProfile}
                className="text-base pl-10"
                />
            </div>
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
            <Button variant="outline" onClick={() => {setIsEditing(false); setName(user.name); setUsername(user.username); setContact(user.contact || ""); setNewProfilePhotoPreview(user.profilePhotoUrl || null); setUsernameAvailable(null);}}>
                Cancel Edit
            </Button>
          )}

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
                  disabled={isPasswordUpdating} 
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
                  disabled={isPasswordUpdating} 
                  placeholder="Enter new password (min. 4 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input 
                  id="confirm-new-password" 
                  type="password" 
                  disabled={isPasswordUpdating} 
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
              <Button variant="outline" disabled={isPasswordUpdating} onClick={handleUpdatePassword}>
                {isPasswordUpdating ? (
                    <> <Save className="mr-2 h-4 w-4 animate-spin" /> Updating Password...</>
                ) : (
                    <> <Save className="mr-2 h-4 w-4" /> Update Password </>
                )}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
