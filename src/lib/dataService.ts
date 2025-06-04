
// Data service using Supabase for persistence
import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, LoanStatus } from '@/types';
import { supabase } from '@/supabaseClient';

// --- Admin Operations (Kept simple, assuming admins are managed separately or are static for now) ---
export const getAdmins = async (): Promise<Admin[]> => {
  // For now, returning the mock admin as per previous setup.
  // In a real app, admins might also be fetched from Supabase or an auth provider.
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
    .single(); // .single() expects exactly one row or throws error if not found/multiple. Use .maybeSingle() if 0 or 1 is ok.

  if (error) {
    console.error(`Error fetching user by ID ${id} from Supabase:`, error.message);
    if (error.code === 'PGRST116') return undefined; // Standard Supabase code for "머리글 또는 본문에 결과가 없음" (No results in header or body)
    // For other errors, you might want to throw or handle differently
  }
  return user as User || undefined;
};

// For admin creating a user
export const addUser = async (userStub: Pick<User, 'name' | 'username' | 'profilePhotoUrl' | 'contact'>): Promise<User> => {
  const existingUserCheck = await supabase.from('users').select('id').eq('username', userStub.username).maybeSingle();
  if (existingUserCheck.data) {
    throw new Error("User with this username already exists.");
  }

  const newUserPayload: Omit<User, 'id' | 'createdAt'> & { created_at?: string } = {
    name: userStub.name,
    username: userStub.username,
    contact: userStub.contact,
    password: "1234", // Default password
    forcePasswordChange: true,
    profilePhotoUrl: userStub.profilePhotoUrl,
    // created_at will be set by Supabase default
  };

  const { data: createdUser, error } = await supabase
    .from('users')
    .insert(newUserPayload)
    .select()
    .single();

  if (error || !createdUser) {
    console.error('Error adding user to Supabase:', error);
    throw new Error(error?.message || "Failed to create user account in Supabase.");
  }
  
  const admins = await getAdmins(); // Assuming getCurrentAdmin() is not available here or want system log
  if (admins.length > 0) {
    const admin = admins[0];
    try {
      await addAuditLog({
        adminId: admin.id,
        adminName: admin.name,
        action: `Admin created new user: ${createdUser.username}`,
        timestamp: new Date().toISOString(),
        details: { userId: createdUser.id, username: createdUser.username, name: createdUser.name }
      });
    } catch (auditError) {
        console.error("Failed to add audit log for user creation:", auditError);
    }
  }
  return createdUser as User;
};

// For user self-registration
export const createUserFromRegistration = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
  const existingUserCheck = await supabase.from('users').select('id').eq('username', userData.username).maybeSingle();
  if (existingUserCheck.data) {
    throw new Error("User with this username already exists.");
  }
  
  const newUserPayload: Omit<User, 'id' | 'createdAt'> & { created_at?: string } = {
    ...userData,
    forcePasswordChange: userData.forcePasswordChange !== undefined ? userData.forcePasswordChange : false,
    // created_at will be set by Supabase default
  };

  const { data: createdUser, error } = await supabase
    .from('users')
    .insert(newUserPayload)
    .select()
    .single();
  
  if (error || !createdUser) {
    console.error('Error creating user from registration in Supabase:', error);
    throw new Error(error?.message || "Failed to create user account in Supabase.");
  }

  const admins = await getAdmins();
  if (admins.length > 0) {
    const reportingAdmin = admins[0];
     try {
        await addAuditLog({
            adminId: reportingAdmin.id,
            adminName: reportingAdmin.name,
            action: `New user self-registered: ${createdUser.username}`,
            timestamp: new Date().toISOString(),
            details: { userId: createdUser.id, username: createdUser.username, name: createdUser.name, contact: createdUser.contact }
        });
    } catch (auditError) {
        console.error("Failed to add audit log for self-registration:", auditError);
    }
  }
  return createdUser as User;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  if (updates.username) {
      const currentUser = await getUserById(id);
      if (currentUser && updates.username !== currentUser.username) {
        const existingUserCheck = await supabase.from('users').select('id').eq('username', updates.username).neq('id', id).maybeSingle();
        if (existingUserCheck.data) {
            throw new Error("Username already taken.");
        }
      }
  }

  // Remove createdAt if present in updates, as it should not be client-modifiable
  const { createdAt, ...restUpdates } = updates;

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(restUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedUser) {
    console.error(`Error updating user ${id} in Supabase:`, error);
    throw new Error(error?.message || "Failed to update user.");
  }
  return updatedUser as User;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting user ${id} from Supabase:`, error);
    return false;
  }
  // Audit logging for deletion should be handled by the caller (e.g., admin page) with current admin context
  return true;
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true }) // More efficient check
    .eq('username', username);

  if (error) {
    console.error('Error checking username availability:', error);
    return false; // Fail safe, assume not available on error
  }
  return data === null || (Array.isArray(data) && data.length === 0) || (data && (data as any).count === 0);
};


// --- Savings Operations ---
export const getSavingsByUserId = async (userId: string): Promise<SavingTransaction[]> => {
  const { data: savings, error } = await supabase
    .from('savings')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error(`Error fetching savings for user ${userId}:`, error);
    return [];
  }
  return (savings?.map(s => ({...s, userId: s.user_id })) as SavingTransaction[]) || [];
};

export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  const payload = { ...transaction, user_id: transaction.userId };
  delete (payload as any).userId; 

  const { data: newTransaction, error } = await supabase
    .from('savings')
    .insert(payload)
    .select()
    .single();

  if (error || !newTransaction) {
    console.error('Error adding saving transaction:', error);
    throw new Error(error?.message || "Failed to add saving transaction.");
  }
  
  // Audit Log for admin adding transaction
  // This assumes an admin context might be available or a system log is desired
  // If called from user flow, audit might be different or not needed here
  const admins = await getAdmins();
  const user = await getUserById(transaction.user_id);
  if (admins.length > 0 && user) {
      try {
        const admin = admins[0]; 
        await addAuditLog({
            adminId: admin.id,
            adminName: admin.name,
            action: `Admin recorded ${newTransaction.type} of ${newTransaction.amount} for user ${user.name}`,
            timestamp: new Date().toISOString(),
            details: { transactionId: newTransaction.id, userId: newTransaction.user_id, amount: newTransaction.amount, type: newTransaction.type, date: newTransaction.date }
        });
    } catch (auditError) {
        console.error("Failed to add audit log for saving transaction:", auditError);
    }
  }
  return { ...newTransaction, userId: newTransaction.user_id } as SavingTransaction;
};

export const updateUserSavings = async (userId: string, newTotalSavingsAmount: number, date: string, adminId: string, adminName: string): Promise<SavingTransaction | undefined> => {
  const userSavings = await getSavingsByUserId(userId);
  const currentTotalSavings = userSavings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);
  const adjustmentAmount = newTotalSavingsAmount - currentTotalSavings;

  if (Math.abs(adjustmentAmount) < 0.01) { 
    // Log attempt if needed, but no transaction
    return undefined;
  }

  const transactionType = adjustmentAmount >= 0 ? 'deposit' : 'withdrawal';
  const absAdjustmentAmount = Math.abs(adjustmentAmount);

  const transactionPayload: Omit<SavingTransaction, 'id'> = {
    userId: userId,
    amount: absAdjustmentAmount,
    date: date,
    type: transactionType,
  };
  
  const newTransaction = await addSavingTransaction(transactionPayload); // This already logs a generic "Admin recorded..."

  // Add a more specific audit log for the *adjustment action*
  const user = await getUserById(userId);
   try {
    await addAuditLog({
        adminId: adminId,
        adminName: adminName,
        action: `Admin adjusted savings for ${user?.name || `ID ${userId}`}. New total: ${newTotalSavingsAmount}. Adjustment: ${transactionType} of ${absAdjustmentAmount}`,
        timestamp: new Date().toISOString(),
        details: { transactionId: newTransaction.id, userId: userId, userName: user?.name, newTotalSavings: newTotalSavingsAmount, adjustmentAmount: absAdjustmentAmount, adjustmentType: transactionType, date: date }
    });
  } catch (auditError) {
      console.error("Failed to add audit log for savings adjustment:", auditError);
  }

  return newTransaction;
};


// --- Profits Operations ---
export const getProfitsByUserId = async (userId: string): Promise<ProfitEntry[]> => {
  const { data: profits, error } = await supabase
    .from('profits')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error(`Error fetching profits for user ${userId}:`, error);
    return [];
  }
  return (profits?.map(p => ({...p, userId: p.user_id })) as ProfitEntry[]) || [];
};

export const addProfitEntry = async (profitEntry: Omit<ProfitEntry, 'id'>): Promise<ProfitEntry> => {
  const payload = { ...profitEntry, user_id: profitEntry.userId };
  delete (payload as any).userId;

  const { data: newEntry, error } = await supabase
    .from('profits')
    .insert(payload)
    .select()
    .single();

  if (error || !newEntry) {
    console.error('Error adding profit entry:', error);
    throw new Error(error?.message || "Failed to add profit entry.");
  }
  return { ...newEntry, userId: newEntry.user_id } as ProfitEntry;
};


// --- Loan Operations ---
export const getLoansByUserId = async (userId: string): Promise<LoanRequest[]> => {
  const { data: loans, error } = await supabase
    .from('loans')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error(`Error fetching loans for user ${userId}:`, error);
    return [];
  }
  // Map user_id back to userId and requested_at if needed
  return (loans?.map(l => ({
    ...l, 
    userId: l.user_id, 
    requestedAt: l.requested_at,
    reviewedAt: l.reviewed_at
  })) as LoanRequest[]) || [];
};

export const getAllLoans = async (): Promise<LoanRequest[]> => {
  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      *,
      users ( name ) 
    `) 
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Error fetching all loans:', error);
    return [];
  }
  return (loans?.map(loan => ({
    ...loan,
    userId: loan.user_id,
    userName: (loan as any).users?.name || `User ID: ${loan.user_id}`,
    requestedAt: loan.requested_at,
    reviewedAt: loan.reviewed_at
  })) as LoanRequest[]) || [];
};

export const addLoanRequest = async (request: Omit<LoanRequest, 'id' | 'status' | 'requestedAt' | 'userName' | 'reviewedAt'>): Promise<LoanRequest> => {
  const user = await getUserById(request.userId); // To potentially get userName, though not stored directly
  const payload = {
    user_id: request.userId,
    amount: request.amount,
    reason: request.reason,
    status: 'pending' as LoanStatus,
    requested_at: new Date().toISOString(),
  };

  const { data: newRequest, error } = await supabase
    .from('loans')
    .insert(payload)
    .select()
    .single();

  if (error || !newRequest) {
    console.error('Error adding loan request:', error);
    throw new Error(error?.message || "Failed to add loan request.");
  }
  return { 
    ...newRequest, 
    userId: newRequest.user_id, 
    userName: user?.name, // Add for immediate use if needed
    requestedAt: newRequest.requested_at,
    reviewedAt: newRequest.reviewed_at
  } as LoanRequest;
};

export const updateLoanStatus = async (loanId: string, status: LoanStatus, adminId: string): Promise<LoanRequest | undefined> => {
  const payload = {
    status: status,
    reviewed_at: new Date().toISOString(),
  };

  const { data: updatedLoanData, error } = await supabase
    .from('loans')
    .update(payload)
    .eq('id', loanId)
    .select(`
        *,
        users ( name )
    `)
    .single();

  if (error || !updatedLoanData) {
    console.error(`Error updating loan status for ${loanId}:`, error);
    return undefined;
  }
  
  const updatedLoan = {
      ...updatedLoanData,
      userId: updatedLoanData.user_id,
      userName: (updatedLoanData as any).users?.name || `User ID: ${updatedLoanData.user_id}`,
      requestedAt: updatedLoanData.requested_at,
      reviewedAt: updatedLoanData.reviewed_at
  } as LoanRequest;

  const admins = await getAdmins();
  const admin = admins.find(a => a.id === adminId) || admins[0];
  
  if (admin && updatedLoan) {
    try {
        await addAuditLog({
            adminId: admin.id,
            adminName: admin.name,
            action: `${status.charAt(0).toUpperCase() + status.slice(1)} loan #${updatedLoan.id} for ${updatedLoan.userName || `user ID ${updatedLoan.userId}`}`,
            timestamp: new Date().toISOString(),
            details: { loanId: updatedLoan.id, newStatus: status, userId: updatedLoan.userId }
        });
    } catch (auditError) {
        console.error("Failed to add audit log for loan status update:", auditError);
    }
  }
  return updatedLoan;
};


// --- Audit Log Operations ---
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  const { data: logs, error } = await supabase
    .from('audit_logs') 
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
  // Map admin_id back to adminId if needed
  return (logs?.map(log => ({...log, adminId: log.admin_id })) as AuditLogEntry[]) || [];
};

export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> => {
  const payload = {
      ...logEntry,
      admin_id: logEntry.adminId,
      // admin_name is passed directly
  };
  delete (payload as any).adminId;

  const { data: newLog, error } = await supabase
    .from('audit_logs')
    .insert(payload)
    .select()
    .single();

  if (error || !newLog) {
    console.error('Error adding audit log:', error);
    throw new Error(error?.message || "Failed to add audit log.");
  }
  return { ...newLog, adminId: newLog.admin_id } as AuditLogEntry;
};


// --- Real-time Subscription Functions ---
export const subscribeToSavings = (callback: (change: any) => void) => {
  return supabase
    .channel('public:savings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'savings' }, (payload) => {
        // You might want to transform the payload here if casing is an issue (e.g. user_id to userId)
        callback(payload);
    })
    .subscribe();
};

export const subscribeToProfits = (callback: (change: any) => void) => {
  return supabase
    .channel('public:profits')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profits' }, callback)
    .subscribe();
};

export const subscribeToLoans = (callback: (change: any) => void) => {
  return supabase
    .channel('public:loans')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, callback)
    .subscribe();
};

export const subscribeToAuditLogs = (callback: (change: any) => void) => {
  return supabase
    .channel('public:audit_logs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, callback)
    .subscribe();
};
    
    
