"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Palette, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function UserSettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false); // Default to off as it needs more setup
  const [darkMode, setDarkMode] = useState(false); // Assume system preference or saved setting
  const { toast } = useToast();

  useEffect(() => {
    // Load saved settings from localStorage or API in a real app
    const savedDarkMode = localStorage.getItem('savings_central_dark_mode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);


  const handleSettingChange = (setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean, settingName: string) => {
    setter(value);
    toast({ title: "Setting Updated", description: `${settingName} preference saved.` });
     // In a real app, save this to backend or localStorage
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
    <DashboardLayout role="user">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center">
          <Settings className="mr-3 h-6 w-6 text-primary" /> Account Settings
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary"/> Notification Preferences</CardTitle>
            <CardDescription>Manage how you receive notifications from Savings Central.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates and alerts via email.</p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={(checked) => handleSettingChange(setEmailNotifications, checked, "Email Notifications")}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="push-notifications" className="font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Get real-time alerts on your device (requires app setup).</p>
              </div>
              <Switch
                id="push-notifications"
                checked={pushNotifications}
                onCheckedChange={(checked) => handleSettingChange(setPushNotifications, checked, "Push Notifications")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary"/> Theme Preferences</CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Enable dark theme for a different visual experience.</p>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={handleThemeChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-primary"/> Security & Privacy</CardTitle>
            <CardDescription>Manage your account security and privacy settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Button variant="outline">Manage Connected Devices</Button>
             <Button variant="outline">View Login History</Button>
             <Button variant="destructive">Deactivate Account</Button>
             <p className="text-xs text-muted-foreground">These are placeholder actions for security settings.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
