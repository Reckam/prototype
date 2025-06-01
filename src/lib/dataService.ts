
// Mock data service using localStorage for persistence
import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, AppData, LoanStatus } from '@/types';

const APP_DATA_STORAGE_KEY = "savings_central_app_data";

let data: AppData;

const loadData = (): AppData => {
  if (typeof window !== 'undefined') {
    const storedData = localStorage.getItem(APP_DATA_STORAGE_KEY);
    if (storedData) {
      try {
        // Basic validation to ensure critical arrays exist
        const parsedData = JSON.parse(storedData) as AppData;
        return {
          users: parsedData.users || [],
          admins: parsedData.admins || [{ id: 'admin1', name: 'Super Admin', email: 'admin' }],
          savings: parsedData.savings || [],
          profits: parsedData.profits || [],
          loans: parsedData.loans || [],
          auditLogs: parsedData.auditLogs || [],
        };
      } catch (e) {
        console.error("Error parsing app data from localStorage, resetting to default.", e);
      }
    }
  }
  // Default initial data if nothing in localStorage, if server-side rendering, or if parsing fails
  return {
    users: [],
    admins: [
      { id: 'admin1', name: 'Super Admin', email: 'admin' },
    ],
    savings: [],
    profits: [],
    loans: [],
    auditLogs: [
       { id: 'log_init_localstorage', adminId: 'admin1', adminName: 'Super Admin', action: 'System Initialized/Data Loaded', timestamp: new Date().toISOString(), details: { status: 'LocalStorage initialized or data loaded' } },
    ],
  };
};

data = loadData(); // Initialize data

const persistData = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
  }
  // No need for delay here, localStorage is synchronous
};


// Simulate async operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// User operations
export const getUsers = async (): Promise<User[]> => { await delay(50); return [...data.users]; };
export const getUserById = async (id: string): Promise<User | undefined> => { await delay(50); return data.users.find(u => u.id === id); };

// For admin creating a user
export const addUser = async (userStub: Pick<User, 'name' | 'username' | 'profilePhotoUrl' | 'contact'>): Promise<User> => {
  await delay(100);
  if (data.users.some(u => u.username === userStub.username)) {
    throw new Error("User with this username already exists.");
  }
  const newUser: User = {
    id: `user_admin_${Date.now()}`,
    name: userStub.name,
    username: userStub.username,
    contact: userStub.contact,
    createdAt: new Date().toISOString(),
    password: "1234", // Default password for admin-created users
    forcePasswordChange: true, // Force change on first login
    profilePhotoUrl: userStub.profilePhotoUrl,
  };
  data.users.push(newUser);
  await persistData();

  const admin = data.admins[0]; // Assuming first admin for audit log
   if (admin) {
    await addAuditLog({
      adminId: admin.id,
      adminName: admin.name,
      action: `Admin created new user: ${newUser.username}`,
      timestamp: new Date().toISOString(),
      details: { userId: newUser.id, username: newUser.username, name: newUser.name }
    });
    // Persist data again after audit log
    // await persistData(); // Covered by addAuditLog's own persist
  }
  return newUser;
};

// For user self-registration
export const createUserFromRegistration = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
  await delay(100);
  if (data.users.some(u => u.username === userData.username)) {
    throw new Error("User with this username already exists.");
  }
  const newUser: User = {
    id: `user_self_${Date.now()}`,
    name: userData.name,
    username: userData.username,
    contact: userData.contact,
    password: userData.password, // User-defined password
    profilePhotoUrl: userData.profilePhotoUrl,
    forcePasswordChange: false, // No forced change for self-registered users
    createdAt: new Date().toISOString(),
  };
  data.users.push(newUser);
  await persistData();

  const admins = await getAdmins();
  if (admins.length > 0) {
    const reportingAdmin = admins[0];
    await addAuditLog({
      adminId: reportingAdmin.id,
      adminName: reportingAdmin.name,
      action: `New user self-registered: ${newUser.username}`,
      timestamp: new Date().toISOString(),
      details: { userId: newUser.id, username: newUser.username, name: newUser.name, contact: newUser.contact }
    });
    // await persistData(); // Covered by addAuditLog's own persist
  }
  return newUser;
};


export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  await delay(100);
  const userIndex = data.users.findIndex(u => u.id === id);
  if (userIndex === -1) return undefined;

  if (updates.username && data.users.some(u => u.username === updates.username && u.id !== id)) {
    throw new Error("Username already taken.");
  }

  data.users[userIndex] = { ...data.users[userIndex], ...updates };
  await persistData();
  return data.users[userIndex];
};

export const deleteUser = async (id: string): Promise<boolean> => {
  await delay(100);
  const initialLength = data.users.length;
  data.users = data.users.filter(u => u.id !== id);
  data.savings = data.savings.filter(s => s.userId !== id);
  data.profits = data.profits.filter(p => p.userId !== id);
  data.loans = data.loans.filter(l => l.userId !== id);
  
  const deleted = data.users.length < initialLength;
  if (deleted) {
    await persistData();
  }
  return deleted;
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  await delay(50);
  return !data.users.some(u => u.username === username);
};


// Admin operations
export const getAdmins = async (): Promise<Admin[]> => { await delay(50); return [...data.admins]; };


// Savings operations
export const getSavingsByUserId = async (userId: string): Promise<SavingTransaction[]> => {
  await delay(50);
  return data.savings.filter(s => s.userId === userId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  await delay(100);
  const newTransaction = { ...transaction, id: `s${Date.now()}` };
  data.savings.push(newTransaction);
  await persistData();

  const admin = data.admins[0];
  const user = data.users.find(u => u.id === transaction.userId);
  if (admin && user) {
    await addAuditLog({
        adminId: admin.id,
        adminName: admin.name,
        action: `Added ${transaction.type} of ${transaction.amount} for user ${user.name}`,
        timestamp: new Date().toISOString(),
        details: { transactionId: newTransaction.id, userId: transaction.userId, amount: transaction.amount, type: transaction.type, date: transaction.date }
    });
    // await persistData(); // Covered by addAuditLog's own persist
  }
  return newTransaction;
};
export const updateUserSavings = async (userId: string, amount: number, date: string, adminId: string, adminName: string): Promise<SavingTransaction | undefined> => {
  await delay(100);

  const userSavings = data.savings.filter(s => s.userId === userId);
  const currentTotalSavings = userSavings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);

  const adjustmentAmount = amount - currentTotalSavings;
  const transactionType = adjustmentAmount >= 0 ? 'deposit' : 'withdrawal';
  const absAdjustmentAmount = Math.abs(adjustmentAmount);

  const user = await getUserById(userId); // Get user details for logging

  if (absAdjustmentAmount === 0) {
     await addAuditLog({
      adminId: adminId,
      adminName: adminName,
      action: `Attempted savings adjustment for user ${user?.name || `ID ${userId}`}, but no change in amount.`,
      timestamp: new Date().toISOString(),
      details: { userId: userId, userName: user?.name, newTotalSavings: amount, currentTotalSavings: currentTotalSavings, date: date }
    });
    // await persistData(); // Covered by addAuditLog's own persist
    return undefined;
  }

  const newTransaction: SavingTransaction = {
    id: `s_adj_${Date.now()}`,
    userId,
    amount: absAdjustmentAmount,
    date,
    type: transactionType,
  };
  data.savings.push(newTransaction);
  await persistData();

  await addAuditLog({
      adminId: adminId,
      adminName: adminName,
      action: `Adjusted savings for user ${user?.name} (ID: ${userId}). New total: ${amount}. Adjustment: ${transactionType} of ${absAdjustmentAmount}`,
      timestamp: new Date().toISOString(),
      details: { transactionId: newTransaction.id, userId: userId, userName: user?.name, newTotalSavings: amount, adjustmentAmount: absAdjustmentAmount, adjustmentType: transactionType, date: date }
  });
  // await persistData(); // Covered by addAuditLog's own persist

  return newTransaction;
};


// Profits operations
export const getProfitsByUserId = async (userId: string): Promise<ProfitEntry[]> => {
  await delay(50);
  return data.profits.filter(p => p.userId === userId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Loan operations
export const getLoansByUserId = async (userId: string): Promise<LoanRequest[]> => {
  await delay(50);
  return data.loans.filter(l => l.userId === userId).sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
};
export const getAllLoans = async (): Promise<LoanRequest[]> => {
  await delay(50);
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
  await persistData();
  return newRequest;
};
export const updateLoanStatus = async (loanId: string, status: LoanStatus, adminId: string): Promise<LoanRequest | undefined> => {
  await delay(100);
  const loanIndex = data.loans.findIndex(l => l.id === loanId);
  if (loanIndex === -1) return undefined;

  data.loans[loanIndex].status = status;
  data.loans[loanIndex].reviewedAt = new Date().toISOString();
  await persistData();

  const admin = data.admins.find(a => a.id === adminId);
  const loan = data.loans[loanIndex];
  if (admin && loan) {
      await addAuditLog({
          adminId: admin.id,
          adminName: admin.name,
          action: `${status === 'approved' ? 'Approved' : 'Rejected'} loan #${loan.id} for ${loan.userName || `user ID ${loan.userId}`}`,
          timestamp: new Date().toISOString(),
          details: { loanId: loan.id, newStatus: status, userId: loan.userId }
      });
      // await persistData(); // Covered by addAuditLog's own persist
  }
  return data.loans[loanIndex];
};

// Audit Log operations
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  await delay(50);
  return [...data.auditLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> => {
  await delay(50); // Shorten delay as it's an internal call mostly
  const newLog: AuditLogEntry = { ...logEntry, id: `log${Date.now()}` };
  data.auditLogs.push(newLog);
  await persistData();
  return newLog;
};

export const subscribeToSavings = (callback: (change: any) => void) => {
  return supabase
    .channel('savings-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'savings' }, callback)
    .subscribe();
};

export const subscribeToProfits = (callback: (change: any) => void) => {
  return supabase
    .channel('profits-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profits' }, callback)
    .subscribe();
};

export const subscribeToLoans = (callback: (change: any) => void) => {
  return supabase
    .channel('loans-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, callback)
    .subscribe();
};

export const subscribeToAuditLogs = (callback: (change: any) => void) => {
  return supabase
    .channel('audit_logs-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, callback)
    .subscribe();
};
