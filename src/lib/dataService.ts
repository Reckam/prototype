
'use client';

import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, LoanStatus, AppData } from '@/types';

const APP_DATA_KEY = 'savings_central_app_data';

const getInitialData = (): AppData => ({
  users: [
    { id: 'mock-user-1', name: 'Default User', username: 'user@example.com', password: 'password', contact: '0770123456', profilePhotoUrl: undefined, createdAt: new Date().toISOString(), forcePasswordChange: false }
  ],
  admins: [
    { id: 'mock-admin-1', name: 'Super Admin', email: 'admin' }
  ],
  savings: [],
  profits: [],
  loans: [],
  auditLogs: [],
});

const getMockData = (): AppData => {
  if (typeof window === 'undefined') {
    return getInitialData();
  }
  try {
    const data = localStorage.getItem(APP_DATA_KEY);
    if (data) {
      return JSON.parse(data);
    } else {
      const initialData = getInitialData();
      localStorage.setItem(APP_DATA_KEY, JSON.stringify(initialData));
      return initialData;
    }
  } catch (error) {
    console.error("Error accessing localStorage:", error);
    return getInitialData();
  }
};

const setMockData = (data: AppData): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  }
};

// --- Admin Operations ---
export const getAdmins = async (): Promise<Admin[]> => {
  const data = getMockData();
  return data.admins;
};

// --- User Operations ---
export const getUsers = async (): Promise<User[]> => {
  const data = getMockData();
  return data.users;
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  const data = getMockData();
  return data.users.find(u => u.id === id);
};

export const addUser = async (userStub: Pick<User, 'name' | 'username' | 'contact' | 'profilePhotoUrl'>): Promise<User> => {
  const data = getMockData();
  if (data.users.some(u => u.username === userStub.username)) {
    throw new Error("User with this username already exists.");
  }
  const newUser: User = {
    id: `user-${Date.now()}`,
    createdAt: new Date().toISOString(),
    password: "1234",
    forcePasswordChange: true,
    ...userStub,
  };
  data.users.push(newUser);
  
  const admin = data.admins[0];
  if(admin) {
      const newLog: Omit<AuditLogEntry, 'id'> = {
        adminId: admin.id,
        adminName: admin.name,
        action: `Created user: ${userStub.name}`,
        timestamp: new Date().toISOString(),
        details: { userId: newUser.id, username: newUser.username },
      };
      data.auditLogs.unshift({ ...newLog, id: `log-${Date.now()}` });
  }

  setMockData(data);
  return newUser;
};

export const createUserFromRegistration = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const data = getMockData();
    if (data.users.some(u => u.username === userData.username)) {
        throw new Error("User with this username already exists.");
    }
    const newUser: User = {
        id: `user-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...userData,
    };
    data.users.push(newUser);
    setMockData(data);
    return newUser;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  const data = getMockData();
  const userIndex = data.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    throw new Error("User not found for update.");
  }
  data.users[userIndex] = { ...data.users[userIndex], ...updates };
  setMockData(data);
  return data.users[userIndex];
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const data = getMockData();
  const initialLength = data.users.length;
  data.users = data.users.filter(u => u.id !== id);
  data.savings = data.savings.filter(s => s.userId !== id);
  data.profits = data.profits.filter(p => p.userId !== id);
  data.loans = data.loans.filter(l => l.userId !== id);

  setMockData(data);
  return data.users.length < initialLength;
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const data = getMockData();
  return !data.users.some(u => u.username === username);
};

// --- Savings Operations ---
export const getSavingsByUserId = async (userId: string): Promise<SavingTransaction[]> => {
  const data = getMockData();
  return data.savings.filter(s => s.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  const data = getMockData();
  const newTransaction: SavingTransaction = {
    id: `saving-${Date.now()}`,
    ...transaction,
  };
  data.savings.push(newTransaction);
  setMockData(data);
  return newTransaction;
};

export const updateUserSavings = async (userId: string, newTotalSavingsAmount: number, date: string, adminId: string, adminName: string): Promise<SavingTransaction | undefined> => {
    const data = getMockData();
    const userSavings = data.savings.filter(s => s.userId === userId);
    const currentTotal = userSavings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);
    const adjustmentAmount = newTotalSavingsAmount - currentTotal;

    if (Math.abs(adjustmentAmount) < 0.01) return undefined;

    const newTransaction: SavingTransaction = {
        id: `saving-${Date.now()}`,
        userId,
        amount: Math.abs(adjustmentAmount),
        date,
        type: adjustmentAmount > 0 ? 'deposit' : 'withdrawal',
    };
    data.savings.push(newTransaction);
    
    const user = data.users.find(u => u.id === userId);
    const newLog: Omit<AuditLogEntry, 'id'> = {
        adminId,
        adminName,
        action: `Adjusted savings for ${user?.name || userId}`,
        timestamp: new Date().toISOString(),
        details: { userId, adjustment: adjustmentAmount },
    };
    data.auditLogs.unshift({ ...newLog, id: `log-${Date.now() + 1}` });

    setMockData(data);
    return newTransaction;
}

// --- Profits Operations ---
export const getProfitsByUserId = async (userId: string): Promise<ProfitEntry[]> => {
    const data = getMockData();
    return data.profits.filter(p => p.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addProfitEntry = async (profitEntry: Omit<ProfitEntry, 'id'>): Promise<ProfitEntry> => {
    const data = getMockData();
    const newEntry: ProfitEntry = {
        id: `profit-${Date.now()}`,
        ...profitEntry,
    };
    data.profits.push(newEntry);
    setMockData(data);
    return newEntry;
};

// --- Loan Operations ---
export const getLoansByUserId = async (userId: string): Promise<LoanRequest[]> => {
    const data = getMockData();
    return data.loans.filter(l => l.userId === userId).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
};

export const getAllLoans = async (): Promise<LoanRequest[]> => {
    const data = getMockData();
    return data.loans.map(loan => {
        const user = data.users.find(u => u.id === loan.userId);
        return {
            ...loan,
            userName: user?.name || 'Unknown User',
        };
    }).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
};

export const addLoanRequest = async (request: Omit<LoanRequest, 'id' | 'status' | 'requestedAt' | 'userName' | 'reviewedAt'>): Promise<LoanRequest> => {
    const data = getMockData();
    const newRequest: LoanRequest = {
        id: `loan-${Date.now()}`,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        ...request,
    };
    data.loans.push(newRequest);
    setMockData(data);
    return newRequest;
};

export const updateLoanStatus = async (loanId: string, status: LoanStatus, adminId: string): Promise<LoanRequest | undefined> => {
    const data = getMockData();
    const loanIndex = data.loans.findIndex(l => l.id === loanId);
    if (loanIndex === -1) {
        throw new Error("Loan not found for update.");
    }
    data.loans[loanIndex].status = status;
    data.loans[loanIndex].reviewedAt = new Date().toISOString();
    
    const admin = data.admins.find(a => a.id === adminId);
    const user = data.users.find(u => u.id === data.loans[loanIndex].userId);
    const newLog: Omit<AuditLogEntry, 'id'> = {
        adminId,
        adminName: admin?.name,
        action: `Updated loan for ${user?.name || 'Unknown'} to ${status}`,
        timestamp: new Date().toISOString(),
        details: { loanId, newStatus: status },
    };
    data.auditLogs.unshift({ ...newLog, id: `log-${Date.now() + 2}` });

    setMockData(data);
    return data.loans[loanIndex];
};

// --- Audit Log Operations ---
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
    const data = getMockData();
    return data.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> => {
    const data = getMockData();
    const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        ...logEntry,
    };
    data.auditLogs.unshift(newLog); // Add to the top
    setMockData(data);
    return newLog;
};

// Real-time subscriptions are not applicable in a local-only setup.
// Components should re-fetch data after performing actions.
export const subscribeToTable = (tableName: string, callback: (payload: any) => void) => {
    console.log(`Mock subscription to ${tableName}. This does nothing in local mode.`);
    return { unsubscribe: () => {} };
};
export const subscribeToSavings = (callback: (change: any) => void) => subscribeToTable('savings', callback);
export const subscribeToProfits = (callback: (change: any) => void) => subscribeToTable('profits', callback);
export const subscribeToLoans = (callback: (change: any) => void) => subscribeToTable('loans', callback);
export const subscribeToAuditLogs = (callback: (change: any) => void) => subscribeToTable('audit_logs', callback);
export const subscribeToUsers = (callback: (change: any) => void) => subscribeToTable('users', callback);
