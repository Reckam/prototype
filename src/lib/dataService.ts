
// Mock data service using localStorage for persistence
import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, AppData, LoanStatus } from '@/types';
import { supabase } from '@/supabaseClient'; 

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
    // Only persist data that is not primarily managed by Supabase directly in this service.
    // For instance, if users are now fully managed via Supabase calls, data.users might not be relevant to persist to localStorage.
    // This will need to be adjusted as more functions are migrated to Supabase.
    const dataToPersist = { ...data };
    // If users are fully fetched from Supabase by all relevant functions,
    // you might exclude users from localStorage persistence:
    // delete dataToPersist.users; 
    localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(dataToPersist));
  }
};


// Simulate async operations for localStorage based functions
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// User operations
export const getUsers = async (): Promise<User[]> => { 
  // Fetches users from Supabase
  const { data: supabaseUsers, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users from Supabase:', error);
    // Depending on requirements, you might throw the error or return an empty array
    // or even try to fall back to localStorage data if appropriate for your app's logic.
    // For now, returning an empty array on error.
    return []; 
  }
  // Ensure the returned data conforms to the User[] type.
  // Supabase client often handles snake_case to camelCase conversion.
  // If not, manual mapping would be needed here.
  return supabaseUsers as User[] || []; 
};

export const getUserById = async (id: string): Promise<User | undefined> => { 
  // TODO: Refactor to use Supabase: await supabase.from('users').select('*').eq('id', id).single();
  await delay(50); 
  return data.users.find(u => u.id === id); 
};

// For admin creating a user
export const addUser = async (userStub: Pick<User, 'name' | 'username' | 'profilePhotoUrl' | 'contact'>): Promise<User> => {
  // TODO: Refactor to use Supabase: await supabase.from('users').insert({...});
  await delay(100);
  if (data.users.some(u => u.username === userStub.username)) {
    throw new Error("User with this username already exists (localStorage check).");
  }
  const newUser: User = {
    id: `user_admin_${Date.now()}`,
    name: userStub.name,
    username: userStub.username,
    contact: userStub.contact,
    createdAt: new Date().toISOString(),
    password: "1234", 
    forcePasswordChange: true, 
    profilePhotoUrl: userStub.profilePhotoUrl,
  };
  data.users.push(newUser);
  await persistData();

  const admin = data.admins[0]; 
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
  // TODO: Refactor to use Supabase: await supabase.from('users').insert({...});
  await delay(100);
  if (data.users.some(u => u.username === userData.username)) {
    throw new Error("User with this username already exists (localStorage check).");
  }
  const newUser: User = {
    id: `user_self_${Date.now()}`,
    name: userData.name,
    username: userData.username,
    contact: userData.contact,
    password: userData.password, 
    profilePhotoUrl: userData.profilePhotoUrl,
    forcePasswordChange: false, 
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
  }
  return newUser;
};


export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  // TODO: Refactor to use Supabase: await supabase.from('users').update({...}).eq('id', id);
  await delay(100);
  const userIndex = data.users.findIndex(u => u.id === id);
  if (userIndex === -1) return undefined;

  if (updates.username && data.users.some(u => u.username === updates.username && u.id !== id)) {
    throw new Error("Username already taken (localStorage check).");
  }

  data.users[userIndex] = { ...data.users[userIndex], ...updates };
  await persistData();
  return data.users[userIndex];
};

export const deleteUser = async (id: string): Promise<boolean> => {
  // TODO: Refactor to use Supabase: await supabase.from('users').delete().eq('id', id);
  // Also ensure related data (savings, profits, loans for this user) is handled or deleted according to your app's logic.
  await delay(100);
  const initialLength = data.users.length;
  data.users = data.users.filter(u => u.id !== id);
  // These should also be handled via Supabase if user deletion cascades or requires separate deletes
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
  // TODO: Refactor to use Supabase: const { data, error } = await supabase.from('users').select('id').eq('username', username); return !data || data.length === 0;
  await delay(50);
  return !data.users.some(u => u.username === username);
};


// Admin operations
export const getAdmins = async (): Promise<Admin[]> => { 
  // TODO: Consider if admins should also be in Supabase or if they are static/managed differently.
  // For now, keeps using local mock data.
  await delay(50); 
  return [...data.admins]; 
};


// Savings operations
export const getSavingsByUserId = async (userId: string): Promise<SavingTransaction[]> => {
  // TODO: Refactor to use Supabase
  await delay(50);
  return data.savings.filter(s => s.userId === userId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  // TODO: Refactor to use Supabase
  await delay(100);
  const newTransaction = { ...transaction, id: `s${Date.now()}` };
  data.savings.push(newTransaction);
  await persistData();

  const admin = data.admins[0];
  const user = data.users.find(u => u.id === transaction.userId); // This will check localStorage users
  if (admin && user) {
    await addAuditLog({
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
  // TODO: Refactor to use Supabase. This logic will be more complex with DB.
  await delay(100);

  const userSavings = data.savings.filter(s => s.userId === userId);
  const currentTotalSavings = userSavings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);

  const adjustmentAmount = amount - currentTotalSavings;
  const transactionType = adjustmentAmount >= 0 ? 'deposit' : 'withdrawal';
  const absAdjustmentAmount = Math.abs(adjustmentAmount);

  const user = await getUserById(userId); 

  if (absAdjustmentAmount === 0) {
     await addAuditLog({
      adminId: adminId,
      adminName: adminName,
      action: `Attempted savings adjustment for user ${user?.name || `ID ${userId}`}, but no change in amount.`,
      timestamp: new Date().toISOString(),
      details: { userId: userId, userName: user?.name, newTotalSavings: amount, currentTotalSavings: currentTotalSavings, date: date }
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
  await persistData();

  await addAuditLog({
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
  // TODO: Refactor to use Supabase
  await delay(50);
  return data.profits.filter(p => p.userId === userId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Loan operations
export const getLoansByUserId = async (userId: string): Promise<LoanRequest[]> => {
  // TODO: Refactor to use Supabase
  await delay(50);
  return data.loans.filter(l => l.userId === userId).sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
};
export const getAllLoans = async (): Promise<LoanRequest[]> => {
  // TODO: Refactor to use Supabase
  await delay(50);
  return [...data.loans].sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
};
export const addLoanRequest = async (request: Omit<LoanRequest, 'id' | 'status' | 'requestedAt' | 'userName'>): Promise<LoanRequest> => {
  // TODO: Refactor to use Supabase
  await delay(100);
  const user = await getUserById(request.userId); // This will check localStorage users
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
  // TODO: Refactor to use Supabase
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
  }
  return data.loans[loanIndex];
};

// Audit Log operations
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  // TODO: Refactor to use Supabase
  await delay(50);
  return [...data.auditLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> => {
  // TODO: Refactor to use Supabase
  // This function should ideally write to Supabase first, then if successful, update local state if you're maintaining a cache.
  // For now, it continues to use localStorage.
  await delay(50); 
  const newLog: AuditLogEntry = { ...logEntry, id: `log${Date.now()}` };
  data.auditLogs.push(newLog);
  await persistData(); // Persist after adding the log.
  return newLog;
};

// Real-time subscription functions
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
