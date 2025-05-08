
"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, SlidersHorizontal, Palette, Shield, PercentSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const PROFIT_RATE_STORAGE_KEY = "savings_central_profit_rate";
const LOAN_INTEREST_RATE_STORAGE_KEY = "savings_central_loan_interest_rate";
const NEW_USER_APPROVAL_STORAGE_KEY = "savings_central_new_user_approval";


export default function AdminSettingsPage() {
  const [newUserApprovalRequired, setNewUserApprovalRequired] = useState(false);
  const [loanInterestRate, setLoanInterestRate] = useState(5.0); // Example percentage
  const [profitDistributionRate, setProfitDistributionRate] = useState(2.5); // Example percentage for profits
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

    const savedLoanInterestRate = localStorage.getItem(LOAN_INTEREST_RATE_STORAGE_KEY);
    if (savedLoanInterestRate) setLoanInterestRate(parseFloat(savedLoanInterestRate));
    
    const savedProfitRate = localStorage.getItem(PROFIT_RATE_STORAGE_KEY);
    if (savedProfitRate) setProfitDistributionRate(parseFloat(savedProfitRate));

    const savedNewUserApproval = localStorage.getItem(NEW_USER_APPROVAL_STORAGE_KEY);
    if (savedNewUserApproval) setNewUserApprovalRequired(savedNewUserApproval === 'true');


  }, []);

  const handleSettingChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any, settingName: string, storageKey?: string) => {
    setter(value);
    toast({ title: "Setting Updated", description: `${settingName} preference saved.` });
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(value));
    }
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

  const saveAllSettings = () => {
    // This function would typically send all settings to a backend API
    // For localStorage, changes are already saved individually by handleSettingChange
    toast({title: "Settings Saved (Mock)", description: "All current settings would be saved to the server."});
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center">
          <Settings className="mr-3 h-6 w-6 text-primary" /> System Settings
        </h1>
        <Button onClick={saveAllSettings}>
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
                onCheckedChange={(checked) => handleSettingChange(setNewUserApprovalRequired, checked, "New User Approval", NEW_USER_APPROVAL_STORAGE_KEY)}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="loan-interest-rate" className="font-medium">Default Loan Interest Rate (%)</Label>
                <p className="text-sm text-muted-foreground">Set the base interest rate for new loans.</p>
              </div>
              <Input 
                type="number" 
                id="loan-interest-rate" 
                value={loanInterestRate} 
                onChange={(e) => handleSettingChange(setLoanInterestRate, parseFloat(e.target.value), "Loan Interest Rate", LOAN_INTEREST_RATE_STORAGE_KEY)}
                className="w-20 p-2 border rounded-md text-sm bg-background"
                step="0.1"
              />
            </div>
             <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="profit-distribution-rate" className="font-medium">Profit Distribution Rate (%)</Label>
                <p className="text-sm text-muted-foreground">Set the rate at which profits are distributed to users.</p>
              </div>
              <Input 
                type="number" 
                id="profit-distribution-rate" 
                value={profitDistributionRate} 
                onChange={(e) => handleSettingChange(setProfitDistributionRate, parseFloat(e.target.value), "Profit Distribution Rate", PROFIT_RATE_STORAGE_KEY)}
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
