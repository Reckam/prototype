
// Mock data service
import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, AppData, LoanStatus } from '@/types';

// Initialize with minimal mock data (only admin)
let data: AppData = {
  users: [], // Start with no users
  admins: [
    { id: 'admin1', name: 'Super Admin', email: 'admin' }, 
  ],
  savings: [], // Start with no savings transactions
  profits: [], // Start with no profit entries
  loans: [],   // Start with no loan requests
  auditLogs: [ // Optionally, keep a very first log or clear this too
     { id: 'log_init', adminId: 'admin1', adminName: 'Super Admin', action: 'System Initialized', timestamp: new Date().toISOString(), details: { status: 'Brand new state' } },
  ],
};

// Simulate async operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// User operations
export const getUsers = async (): Promise<User[]> => { await delay(100); return [...data.users]; };
export const getUserById = async (id: string): Promise<User | undefined> => { await delay(100); return data.users.find(u => u.id === id); };

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
  
  const admin = data.admins[0]; // Assuming first admin for audit log
   if (admin) {
    await addAuditLog({
      adminId: admin.id,
      adminName: admin.name,
      action: `Admin created new user: ${newUser.username}`,
      timestamp: new Date().toISOString(),
      details: { userId: newUser.id, username: newUser.username, name: newUser.name }
    });
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

  // Add audit log for admin notification
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
  }
  return newUser;
};


export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  await delay(100);
  const userIndex = data.users.findIndex(u => u.id === id);
  if (userIndex === -1) return undefined;

  // If username is being updated, check for uniqueness
  if (updates.username && data.users.some(u => u.username === updates.username && u.id !== id)) {
    throw new Error("Username already taken.");
  }
  
  const oldUserData = { ...data.users[userIndex] };
  data.users[userIndex] = { ...data.users[userIndex], ...updates };
  
  // Log sensitive changes like password or username update by admin (if possible to detect context)
  // For now, this is a general update. Specific audit logs for password changes are in authService.
  // If an admin performed this, it should be logged by the calling function with admin context.

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

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  await delay(50);
  return !data.users.some(u => u.username === username);
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

  // Add to audit log
  const admin = data.admins[0]; // Assuming first admin is performing the action for this mock
  const user = data.users.find(u => u.id === transaction.userId);
  if (admin && user) {
    addAuditLog({
        adminId: admin.id,
        adminName: admin.name,
        action: `Added ${transaction.type} of ${transaction.amount} for user ${user.name}`,
        timestamp: new Date().toISOString(),
        details: { transactionId: newTransaction.id, userId: transaction.userId, amount: transaction.amount, type: transaction.type, date: transaction.date }
    });
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

  if (absAdjustmentAmount === 0) { // No actual change
    const user = await getUserById(userId);
     addAuditLog({
      adminId: adminId,
      adminName: adminName,
      action: `Attempted savings adjustment for user ID ${userId} (${user?.name}), but no change in amount.`,
      timestamp: new Date().toISOString(),
      details: { userId: userId, newTotalSavings: amount, currentTotalSavings: currentTotalSavings, date: date }
    });
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
  
  const user = await getUserById(userId);
  addAuditLog({
      adminId: adminId,
      adminName: adminName,
      action: `Adjusted savings for user ${user?.name} (ID: ${userId}). New total: ${amount}. Adjustment: ${transactionType} of ${absAdjustmentAmount}`,
      timestamp: new Date().toISOString(),
      details: { transactionId: newTransaction.id, userId: userId, userName: user?.name, newTotalSavings: amount, adjustmentAmount: absAdjustmentAmount, adjustmentType: transactionType, date: date }
  });
  
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

