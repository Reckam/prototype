"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, SlidersHorizontal, Palette, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettingsPage() {
  // Mock settings - in a real app, these would be fetched and saved
  const [newUserApprovalRequired, setNewUserApprovalRequired] = useState(false);
  const [loanInterestRate, setLoanInterestRate] = useState(5.0); // Example percentage
  const [darkMode, setDarkMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved settings
    const savedDarkMode = localStorage.getItem('savings_central_dark_mode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Load other admin settings from a config service or API
  }, []);

  const handleSettingChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any, settingName: string) => {
    setter(value);
    toast({ title: "Setting Updated", description: `${settingName} preference saved.` });
    // API call to save setting
  };
  
  const handleThemeChange = (isDark: boolean) => {
    setDarkMode(isDark);
    if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('savings_central_dark_mode', 'true');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('savings_central_dark_mode', 'false');
    }
    toast({ title: "Theme Updated", description: `Theme set to ${isDark ? 'Dark' : 'Light'} Mode.`});
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center">
          <Settings className="mr-3 h-6 w-6 text-primary" /> System Settings
        </h1>
        <Button onClick={() => toast({title: "Settings Saved (Mock)", description: "All current settings would be saved to the server."})}>
            Save All Settings
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><SlidersHorizontal className="mr-2 h-5 w-5 text-primary"/> General Configuration</CardTitle>
            <CardDescription>Manage core system parameters and functionalities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="new-user-approval" className="font-medium">New User Registration Approval</Label>
                <p className="text-sm text-muted-foreground">Require admin approval for new user registrations.</p>
              </div>
              <Switch
                id="new-user-approval"
                checked={newUserApprovalRequired}
                onCheckedChange={(checked) => handleSettingChange(setNewUserApprovalRequired, checked, "New User Approval")}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="loan-interest-rate" className="font-medium">Default Loan Interest Rate (%)</Label>
                <p className="text-sm text-muted-foreground">Set the base interest rate for new loans.</p>
              </div>
              <input 
                type="number" 
                id="loan-interest-rate" 
                value={loanInterestRate} 
                onChange={(e) => handleSettingChange(setLoanInterestRate, parseFloat(e.target.value), "Loan Interest Rate")}
                className="w-20 p-2 border rounded-md text-sm bg-background"
                step="0.1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary"/> Theme Preferences</CardTitle>
            <CardDescription>Customize the look and feel of the admin panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="admin-dark-mode" className="font-medium">Dark Mode (Admin Panel)</Label>
                <p className="text-sm text-muted-foreground">Enable dark theme for the admin interface.</p>
              </div>
              <Switch
                id="admin-dark-mode"
                checked={darkMode}
                onCheckedChange={handleThemeChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-primary"/> Security Settings</CardTitle>
            <CardDescription>Configure security parameters for the admin panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Button variant="outline">Manage Admin Roles & Permissions</Button>
             <Button variant="outline">Configure 2FA for Admins</Button>
             <Button variant="outline">IP Whitelisting</Button>
             <p className="text-xs text-muted-foreground">These are placeholder actions for advanced security settings.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
