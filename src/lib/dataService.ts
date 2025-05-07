// Mock data service
import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, AppData, LoanStatus } from '@/types';

// Initialize with some mock data
let data: AppData = {
  users: [
    { id: 'user1', name: 'Alice Wonderland', email: 'alice@example.com', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString() },
    { id: 'user2', name: 'Bob The Builder', email: 'bob@example.com', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString() },
  ],
  admins: [
    { id: 'admin1', name: 'Super Admin', email: 'admin' }, // Changed email to 'admin'
  ],
  savings: [
    { id: 's1', userId: 'user1', amount: 1000, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(), type: 'deposit' },
    { id: 's2', userId: 'user1', amount: 500, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), type: 'deposit' },
    { id: 's3', userId: 'user2', amount: 2000, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 50).toISOString(), type: 'deposit' },
  ],
  profits: [
    { id: 'p1', userId: 'user1', amount: 50, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), description: 'Monthly interest' },
    { id: 'p2', userId: 'user2', amount: 100, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), description: 'Quarterly bonus' },
  ],
  loans: [
    { id: 'l1', userId: 'user1', userName: 'Alice Wonderland', amount: 500, reason: 'Emergency', status: 'pending', requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },
    { id: 'l2', userId: 'user2', userName: 'Bob The Builder', amount: 1000, reason: 'Home improvement', status: 'approved', requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(), reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString() },
  ],
  auditLogs: [
    { id: 'log1', adminId: 'admin1', adminName: 'Super Admin', action: 'Approved loan #l2 for Bob The Builder', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString() },
  ],
};

// Simulate async operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// User operations
export const getUsers = async (): Promise<User[]> => { await delay(100); return [...data.users]; };
export const getUserById = async (id: string): Promise<User | undefined> => { await delay(100); return data.users.find(u => u.id === id); };
export const addUser = async (user: User): Promise<User> => { await delay(100); data.users.push(user); return user; };
export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  await delay(100);
  const userIndex = data.users.findIndex(u => u.id === id);
  if (userIndex === -1) return undefined;
  data.users[userIndex] = { ...data.users[userIndex], ...updates };
  return data.users[userIndex];
};
export const deleteUser = async (id: string): Promise<boolean> => {
  await delay(100);
  const initialLength = data.users.length;
  data.users = data.users.filter(u => u.id !== id);
  // Also remove associated data
  data.savings = data.savings.filter(s => s.userId !== id);
  data.profits = data.profits.filter(p => p.userId !== id);
  data.loans = data.loans.filter(l => l.userId !== id);
  return data.users.length < initialLength;
};

// Admin operations
export const getAdmins = async (): Promise<Admin[]> => { await delay(100); return [...data.admins]; };


// Savings operations
export const getSavingsByUserId = async (userId: string): Promise<SavingTransaction[]> => {
  await delay(100);
  return data.savings.filter(s => s.userId === userId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  await delay(100);
  const newTransaction = { ...transaction, id: `s${Date.now()}` };
  data.savings.push(newTransaction);
  return newTransaction;
};
export const updateUserSavings = async (userId: string, amount: number, date: string): Promise<SavingTransaction | undefined> => {
  // This is a simplified example; real scenarios would be more complex (e.g., editing specific transactions)
  // For this mock, let's just add a new savings transaction as an "update"
  await delay(100);
  const newTransaction: SavingTransaction = {
    id: `s_update_${Date.now()}`,
    userId,
    amount,
    date,
    type: 'deposit', // Assuming updates are deposits for simplicity
  };
  data.savings.push(newTransaction);
  // In a real app, you might also log this action in audit logs
  const admin = data.admins[0]; // Assuming first admin did this
  if (admin) {
    addAuditLog({
        adminId: admin.id,
        adminName: admin.name,
        action: `Updated savings for user ID ${userId} with amount ${amount}`,
        timestamp: new Date().toISOString(),
    });
  }
  return newTransaction;
};


// Profits operations
export const getProfitsByUserId = async (userId: string): Promise<ProfitEntry[]> => {
  await delay(100);
  return data.profits.filter(p => p.userId === userId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Loan operations
export const getLoansByUserId = async (userId: string): Promise<LoanRequest[]> => {
  await delay(100);
  return data.loans.filter(l => l.userId === userId).sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
};
export const getAllLoans = async (): Promise<LoanRequest[]> => {
  await delay(100);
  return [...data.loans].sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
};
export const addLoanRequest = async (request: Omit<LoanRequest, 'id' | 'status' | 'requestedAt' | 'userName'>): Promise<LoanRequest> => {
  await delay(100);
  const user = await getUserById(request.userId);
  const newRequest: LoanRequest = {
    ...request,
    id: `l${Date.now()}`,
    userName: user?.name,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
  data.loans.push(newRequest);
  return newRequest;
};
export const updateLoanStatus = async (loanId: string, status: LoanStatus, adminId: string): Promise<LoanRequest | undefined> => {
  await delay(100);
  const loanIndex = data.loans.findIndex(l => l.id === loanId);
  if (loanIndex === -1) return undefined;
  data.loans[loanIndex].status = status;
  data.loans[loanIndex].reviewedAt = new Date().toISOString();
  
  // Add to audit log
  const admin = data.admins.find(a => a.id === adminId);
  const loan = data.loans[loanIndex];
  if (admin && loan) {
      addAuditLog({
          adminId: admin.id,
          adminName: admin.name,
          action: `${status === 'approved' ? 'Approved' : 'Rejected'} loan #${loan.id} for ${loan.userName || `user ID ${loan.userId}`}`,
          timestamp: new Date().toISOString(),
          details: { loanId: loan.id, newStatus: status, userId: loan.userId }
      });
  }
  return data.loans[loanIndex];
};

// Audit Log operations
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  await delay(100);
  return [...data.auditLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> => {
  await delay(100);
  const newLog: AuditLogEntry = { ...logEntry, id: `log${Date.now()}` };
  data.auditLogs.push(newLog);
  return newLog;
};
