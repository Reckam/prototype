"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Info } from "lucide-react";
import { useEffect, useState } from "react";
import type { LoanRequest } from "@/types";
import { getCurrentUser } from "@/lib/authService";
import { getLoansByUserId } from "@/lib/dataService";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'loan_status' | 'general';
}

export default function UserNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      fetchNotifications(currentUser.id);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchNotifications = async (userId: string) => {
    setIsLoading(true);
    try {
      const userLoans = await getLoansByUserId(userId);
      const loanNotifications: Notification[] = userLoans
        .filter(loan => loan.reviewedAt) // Only show notifications for reviewed loans
        .map(loan => ({
          id: `loan_${loan.id}`,
          title: `Loan ${loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}`,
          message: `Your loan request for KES ${loan.amount.toFixed(2)} has been ${loan.status}.`,
          timestamp: loan.reviewedAt!,
          read: false, // Mock: in a real app, track read status
          type: 'loan_status',
        }));
      
      // Add some mock general notifications
      const generalNotifications: Notification[] = [
        {
          id: 'general_1',
          title: 'System Maintenance Scheduled',
          message: 'There will be a scheduled system maintenance on July 30th, 2024, from 2 AM to 4 AM.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
          read: false,
          type: 'general',
        },
      ];

      const allNotifications = [...loanNotifications, ...generalNotifications]
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(allNotifications);

    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? {...n, read: true} : n));
    // In a real app, you'd send this update to the backend.
  };


  if (isLoading) {
    return (
      <DashboardLayout role="user">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DashboardLayout role="user">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center">
          <Bell className="mr-3 h-6 w-6 text-primary" /> Notifications 
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts & Updates</CardTitle>
          <CardDescription>Stay informed about your account activity and important announcements.</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg border flex items-start gap-4 ${notification.read ? 'bg-muted/50 opacity-70' : 'bg-card hover:shadow-md transition-shadow'}`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !notification.read && markAsRead(notification.id)}
                >
                  <div className={`p-2 rounded-full ${notification.type === 'loan_status' ? (notification.title.includes('Approved') ? 'bg-green-100' : notification.title.includes('Rejected') ? 'bg-red-100' : 'bg-yellow-100') : 'bg-blue-100'}`}>
                    {notification.type === 'loan_status' ? (
                       notification.title.includes('Approved') ? <Bell className="h-5 w-5 text-green-600" /> : notification.title.includes('Rejected') ? <Bell className="h-5 w-5 text-red-600" /> : <Bell className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>{notification.title}</h3>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You have no new notifications at this time.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
