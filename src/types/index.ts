
export interface User {
  id: string;
  username: string; 
  name: string;
  contact?: string; 
  createdAt: string;
  profilePhotoUrl?: string; 
  password?: string; 
  forcePasswordChange?: boolean; 
}

export interface Admin {
  id: string;
  username:string; 
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
  reason?: string; 
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
