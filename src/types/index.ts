export interface User {
  id: string;
  username: string; // Changed from email to username
  name: string;
  contact?: string; // Added for contact number
  createdAt: string;
  profilePhotoUrl?: string; // Added for profile photo
  password?: string; // Added for storing mock password
  forcePasswordChange?: boolean; // Added for first login flow
}

export interface Admin {
  id: string;
  email:string; // Admin still uses email
  name: string;
}

export interface SavingTransaction {
  id: string;
  userId: string;
  amount: number;
  date: string;
  type: 'deposit' | 'withdrawal'; // Could be expanded
}

export interface ProfitEntry {
  id: string;
  userId: string;
  amount: number;
  date: string;
  description: string;
}

export type LoanStatus = 'pending' | 'approved' | 'rejected';

export interface LoanRequest {
  id: string;
  userId: string;
  userName?: string; // For admin view
  amount: number;
  reason?: string; // Made optional as it might not exist in the DB
  status: LoanStatus;
  requestedAt: string;
  reviewedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName?: string;
  action: string; // e.g., "Approved loan #123", "Deleted user test@example.com"
  timestamp: string;
  details?: Record<string, any>;
}

// Data structure for mock database
export interface AppData {
  users: User[];
  admins: Admin[];
  savings: SavingTransaction[];
  profits: ProfitEntry[];
  loans: LoanRequest[];
  auditLogs: AuditLogEntry[];
}
