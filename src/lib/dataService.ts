
// Data service using Supabase for persistence
import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, LoanStatus } from '@/types';
import { supabase } from '@/supabaseClient';

// --- Admin Operations (Kept simple, assuming admins are managed separately or are static for now) ---
export const getAdmins = async (): Promise<Admin[]> => {
  // In a real app, admins might also be fetched from Supabase or an auth provider.
  // For now, returning the mock admin as per previous setup.
  await Promise.resolve(); // To make it async like other functions
  return [{ id: 'admin1', name: 'Super Admin', email: 'admin' }];
};

// --- User Operations ---
export const getUsers = async (): Promise<User[]> => {
  const { data: supabaseUsers, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users from Supabase:', error);
    return [];
  }
  return (supabaseUsers as User[]) || [];
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching user by ID ${id} from Supabase:`, error);
    return undefined;
  }
  return user as User || undefined;
};

// For admin creating a user
export const addUser = async (userStub: Pick<User, 'name' | 'username' | 'profilePhotoUrl' | 'contact'>): Promise<User> => {
  const existingUserCheck = await supabase.from('users').select('id').eq('username', userStub.username).maybeSingle();
  if (existingUserCheck.data) {
    throw new Error("User with this username already exists (Supabase check).");
  }

  const newUserPayload: Omit<User, 'id' | 'createdAt'> = {
    name: userStub.name,
    username: userStub.username,
    contact: userStub.contact,
    password: "1234", // Default password
    forcePasswordChange: true,
    profilePhotoUrl: userStub.profilePhotoUrl,
  };

  const { data: createdUsers, error } = await supabase
    .from('users')
    .insert(newUserPayload)
    .select()
    .single();

  if (error || !createdUsers) {
    console.error('Error adding user to Supabase:', error);
    throw new Error("Failed to create user account in Supabase.");
  }
  const newUser = createdUsers as User;

  const admins = await getAdmins();
  if (admins.length > 0) {
    const admin = admins[0];
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
  const existingUserCheck = await supabase.from('users').select('id').eq('username', userData.username).maybeSingle();
  if (existingUserCheck.data) {
    throw new Error("User with this username already exists (Supabase check).");
  }
  
  const newUserPayload = {
    ...userData,
    forcePasswordChange: userData.forcePasswordChange !== undefined ? userData.forcePasswordChange : false,
  };

  const { data: createdUsers, error } = await supabase
    .from('users')
    .insert(newUserPayload)
    .select()
    .single();
  
  if (error || !createdUsers) {
    console.error('Error creating user from registration in Supabase:', error);
    throw new Error("Failed to create user account in Supabase.");
  }
  const newUser = createdUsers as User;

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
  if (updates.username && updates.username !== (await getUserById(id))?.username) {
    const existingUserCheck = await supabase.from('users').select('id').eq('username', updates.username).neq('id', id).maybeSingle();
    if (existingUserCheck.data) {
        throw new Error("Username already taken (Supabase check).");
    }
  }

  const { data: updatedUsers, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedUsers) {
    console.error(`Error updating user ${id} in Supabase:`, error);
    // Optionally, re-throw the error or return undefined based on how the UI should handle this
    // throw new Error(error?.message || "Failed to update user.");
    return undefined;
  }
  return updatedUsers as User;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  // Consider related data (savings, profits, loans). 
  // If Supabase has CASCADE constraints, this might be enough. Otherwise, delete related data first.
  // For simplicity, this example only deletes the user. In a real app, handle related data.
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting user ${id} from Supabase:`, error);
    return false;
  }
  // Note: Audit logging for deletion should be handled carefully.
  // The `addAuditLog` below assumes an admin is performing this action,
  // and their details are available.
  return true;
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle(); // Use maybeSingle to get one or null, not an array

  if (error) {
    console.error('Error checking username availability:', error);
    return false; // Fail safe, assume not available on error
  }
  return !data; // True if data is null (username not found), false otherwise
};

// --- Savings Operations ---
export const getSavingsByUserId = async (userId: string): Promise<SavingTransaction[]> => {
  const { data: savings, error } = await supabase
    .from('savings')
    .select('*')
    .eq('user_id', userId) // Assuming 'user_id' is the foreign key column in 'savings' table
    .order('date', { ascending: false });

  if (error) {
    console.error(`Error fetching savings for user ${userId}:`, error);
    return [];
  }
  return (savings as SavingTransaction[]) || [];
};

export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  // Map userId to user_id if your Supabase table uses snake_case
  const payload = { ...transaction, user_id: transaction.userId };
  delete (payload as any).userId; 

  const { data: newTransactions, error } = await supabase
    .from('savings')
    .insert(payload)
    .select()
    .single();

  if (error || !newTransactions) {
    console.error('Error adding saving transaction:', error);
    throw new Error("Failed to add saving transaction.");
  }
  const newTransaction = newTransactions as SavingTransaction;

  // Audit Log
  const admins = await getAdmins();
  const user = await getUserById(transaction.userId);
  if (admins.length > 0 && user) {
    const admin = admins[0]; // Assuming first admin for system-like logging if not admin-initiated
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

export const updateUserSavings = async (userId: string, newTotalSavingsAmount: number, date: string, adminId: string, adminName: string): Promise<SavingTransaction | undefined> => {
  const userSavings = await getSavingsByUserId(userId);
  const currentTotalSavings = userSavings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);
  const adjustmentAmount = newTotalSavingsAmount - currentTotalSavings;

  if (Math.abs(adjustmentAmount) < 0.01) { // Check for negligible change
    await addAuditLog({
      adminId: adminId,
      adminName: adminName,
      action: `Attempted savings adjustment for user ID ${userId}, but no change in amount.`,
      timestamp: new Date().toISOString(),
      details: { userId: userId, newTotalSavings: newTotalSavingsAmount, currentTotalSavings: currentTotalSavings, date: date }
    });
    return undefined; // No transaction needed
  }

  const transactionType = adjustmentAmount >= 0 ? 'deposit' : 'withdrawal';
  const absAdjustmentAmount = Math.abs(adjustmentAmount);

  const transactionPayload: Omit<SavingTransaction, 'id'> = {
    userId: userId,
    amount: absAdjustmentAmount,
    date: date,
    type: transactionType,
  };
  
  const newTransaction = await addSavingTransaction(transactionPayload); // addSavingTransaction already handles its own audit for generic additions

  // Specific audit log for this adjustment action by an admin
  const user = await getUserById(userId);
  await addAuditLog({
    adminId: adminId,
    adminName: adminName,
    action: `Adjusted savings for user ${user?.name || `ID ${userId}`}. New total: ${newTotalSavingsAmount}. Adjustment: ${transactionType} of ${absAdjustmentAmount}`,
    timestamp: new Date().toISOString(),
    details: { transactionId: newTransaction.id, userId: userId, userName: user?.name, newTotalSavings: newTotalSavingsAmount, adjustmentAmount: absAdjustmentAmount, adjustmentType: transactionType, date: date }
  });

  return newTransaction;
};

// --- Profits Operations ---
export const getProfitsByUserId = async (userId: string): Promise<ProfitEntry[]> => {
  const { data: profits, error } = await supabase
    .from('profits')
    .select('*')
    .eq('user_id', userId) // Assuming 'user_id'
    .order('date', { ascending: false });

  if (error) {
    console.error(`Error fetching profits for user ${userId}:`, error);
    return [];
  }
  return (profits as ProfitEntry[]) || [];
};

export const addProfitEntry = async (profitEntry: Omit<ProfitEntry, 'id'>): Promise<ProfitEntry> => {
  const payload = { ...profitEntry, user_id: profitEntry.userId };
  delete (payload as any).userId;

  const { data: newEntries, error } = await supabase
    .from('profits')
    .insert(payload)
    .select()
    .single();

  if (error || !newEntries) {
    console.error('Error adding profit entry:', error);
    throw new Error("Failed to add profit entry.");
  }
  // Consider if audit logging is needed for profit entries
  return newEntries as ProfitEntry;
};

// --- Loan Operations ---
export const getLoansByUserId = async (userId: string): Promise<LoanRequest[]> => {
  const { data: loans, error } = await supabase
    .from('loans')
    .select('*')
    .eq('user_id', userId) // Assuming 'user_id'
    .order('requested_at', { ascending: false }); // Assuming 'requested_at'

  if (error) {
    console.error(`Error fetching loans for user ${userId}:`, error);
    return [];
  }
  return (loans as LoanRequest[]) || [];
};

export const getAllLoans = async (): Promise<LoanRequest[]> => {
  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      *,
      users ( name ) 
    `) // Example of joining to get user's name. Adjust 'users' table name and column if needed.
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Error fetching all loans:', error);
    return [];
  }
  // Map to include userName if users table was joined
  return (loans?.map(loan => ({
    ...loan,
    userName: (loan as any).users?.name || `User ID: ${loan.user_id}`
  })) as LoanRequest[]) || [];
};

export const addLoanRequest = async (request: Omit<LoanRequest, 'id' | 'status' | 'requestedAt' | 'userName' | 'reviewedAt'>): Promise<LoanRequest> => {
  const user = await getUserById(request.userId);
  const payload = {
    ...request,
    user_id: request.userId,
    status: 'pending' as LoanStatus,
    requested_at: new Date().toISOString(),
    // userName is not directly stored in the loans table usually, fetched via join or from user record
  };
  delete (payload as any).userId;


  const { data: newRequests, error } = await supabase
    .from('loans')
    .insert(payload)
    .select()
    .single();

  if (error || !newRequests) {
    console.error('Error adding loan request:', error);
    throw new Error("Failed to add loan request.");
  }
  const newRequest = newRequests as LoanRequest;
  // Add userName for immediate return if needed, though it's better practice to fetch this dynamically
  newRequest.userName = user?.name; 

  return newRequest;
};

export const updateLoanStatus = async (loanId: string, status: LoanStatus, adminId: string): Promise<LoanRequest | undefined> => {
  const payload = {
    status: status,
    reviewed_at: new Date().toISOString(),
  };

  const { data: updatedLoans, error } = await supabase
    .from('loans')
    .update(payload)
    .eq('id', loanId)
    .select(`
        *,
        users ( name )
    `)
    .single();

  if (error || !updatedLoans) {
    console.error(`Error updating loan status for ${loanId}:`, error);
    return undefined;
  }
  
  const updatedLoan = {
      ...updatedLoans,
      userName: (updatedLoans as any).users?.name || `User ID: ${updatedLoans.user_id}`
  } as LoanRequest;


  const admins = await getAdmins();
  const admin = admins.find(a => a.id === adminId) || admins[0]; // Fallback to first admin
  
  if (admin && updatedLoan) {
    await addAuditLog({
      adminId: admin.id,
      adminName: admin.name,
      action: `${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Updated'} loan #${updatedLoan.id} for ${updatedLoan.userName || `user ID ${updatedLoan.userId}`}`,
      timestamp: new Date().toISOString(),
      details: { loanId: updatedLoan.id, newStatus: status, userId: updatedLoan.userId }
    });
  }
  return updatedLoan;
};

// --- Audit Log Operations ---
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  const { data: logs, error } = await supabase
    .from('audit_logs') // Assuming table name 'audit_logs'
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
  return (logs as AuditLogEntry[]) || [];
};

export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> => {
  const payload = {
      ...logEntry,
      admin_id: logEntry.adminId, // map to snake_case if needed
      admin_name: logEntry.adminName,
  };
  delete (payload as any).adminId;
  // delete (payload as any).adminName; // admin_name might not be stored directly if fetched via admin_id

  const { data: newLogs, error } = await supabase
    .from('audit_logs')
    .insert(payload)
    .select()
    .single();

  if (error || !newLogs) {
    console.error('Error adding audit log:', error);
    throw new Error("Failed to add audit log.");
  }
  return newLogs as AuditLogEntry;
};


// --- Real-time Subscription Functions (Remain the same as they already use Supabase client) ---
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
    