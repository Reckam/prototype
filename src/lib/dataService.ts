
// Data service using Supabase for persistence
import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, LoanStatus } from '@/types';
import { supabase } from '@/supabaseClient';

console.log("dataService.ts: Supabase client initialized:", supabase !== null);

// --- Admin Operations ---
export const getAdmins = async (): Promise<Admin[]> => {
  console.log("dataService: getAdmins called");
  // For now, returning the mock admin.
  await Promise.resolve();
  const mockAdmins = [{ id: 'admin1', name: 'Super Admin', email: 'admin' }];
  console.log("dataService: getAdmins returning mock admins:", mockAdmins);
  return mockAdmins;
};

// --- User Operations ---
export const getUsers = async (): Promise<User[]> => {
  console.log("dataService: getUsers called");
  const { data: supabaseUsers, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('dataService: Error fetching users from Supabase:', error.message);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  const users = (supabaseUsers || []).map(u => ({ ...u, createdAt: u.created_at, profilePhotoUrl: u.profile_photo_url, forcePasswordChange: u.force_password_change })) as User[];
  console.log("dataService: getUsers successfully fetched:", users.length, "users");
  return users;
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  console.log(`dataService: getUserById called for ID: ${id}`);
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`dataService: Error fetching user by ID ${id} from Supabase:`, error.message);
    if (error.code === 'PGRST116') { // "No results" error code
        console.warn(`dataService: User with ID ${id} not found.`);
        return undefined;
    }
    throw new Error(`Failed to fetch user ${id}: ${error.message}`);
  }
  if (!user) {
    console.warn(`dataService: User with ID ${id} not found (no error, but no data).`);
    return undefined;
  }
  const mappedUser = { ...user, createdAt: user.created_at, profilePhotoUrl: u.profile_photo_url, forcePasswordChange: u.force_password_change } as User;
  console.log("dataService: getUserById successfully fetched user:", mappedUser);
  return mappedUser;
};

export const addUser = async (userStub: Pick<User, 'name' | 'username' | 'profilePhotoUrl' | 'contact'>): Promise<User> => {
  console.log("dataService: addUser called with userStub:", userStub);
  const { data: existingUser, error: checkError } = await supabase.from('users').select('id').eq('username', userStub.username).maybeSingle();
  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found, which is good here.
    console.error('dataService: Error checking for existing username during addUser:', checkError.message);
    throw new Error(`Failed to check username: ${checkError.message}`);
  }
  if (existingUser) {
    console.warn("dataService: User with this username already exists:", userStub.username);
    throw new Error("User with this username already exists.");
  }

  const newUserPayload = {
    name: userStub.name,
    username: userStub.username,
    contact: userStub.contact,
    password: "1234", // Default password
    force_password_change: true,
    profile_photo_url: userStub.profilePhotoUrl,
    created_at: new Date().toISOString(),
  };

  const { data: createdUser, error: insertError } = await supabase
    .from('users')
    .insert(newUserPayload)
    .select()
    .single();

  if (insertError || !createdUser) {
    console.error('dataService: Error adding user to Supabase:', insertError?.message);
    throw new Error(insertError?.message || "Failed to create user account in Supabase.");
  }
  
  console.log("dataService: addUser successfully created user:", createdUser);
  const admins = await getAdmins();
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
    } catch (auditError: any) {
        console.error("dataService: Failed to add audit log for user creation:", auditError.message);
    }
  }
  return { ...createdUser, createdAt: createdUser.created_at, profilePhotoUrl: createdUser.profile_photo_url, forcePasswordChange: createdUser.force_password_change } as User;
};

export const createUserFromRegistration = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
  console.log("dataService: createUserFromRegistration called with userData:", userData.username);
  const { data: existingUser, error: checkError } = await supabase.from('users').select('id').eq('username', userData.username).maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('dataService: Error checking for existing username during registration:', checkError.message);
    throw new Error(`Failed to check username: ${checkError.message}`);
  }
  if (existingUser) {
    console.warn("dataService: User with this username already exists (registration):", userData.username);
    throw new Error("User with this username already exists.");
  }
  
  const newUserPayload = {
    ...userData,
    force_password_change: userData.forcePasswordChange !== undefined ? userData.forcePasswordChange : false,
    created_at: new Date().toISOString(),
    profile_photo_url: userData.profilePhotoUrl,
  };

  const { data: createdUser, error: insertError } = await supabase
    .from('users')
    .insert(newUserPayload)
    .select()
    .single();
  
  if (insertError || !createdUser) {
    console.error('dataService: Error creating user from registration in Supabase:', insertError?.message);
    throw new Error(insertError?.message || "Failed to create user account in Supabase.");
  }
  console.log("dataService: createUserFromRegistration successfully created user:", createdUser);
  // Audit log for self-registration
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
    } catch (auditError: any) {
        console.error("dataService: Failed to add audit log for self-registration:", auditError.message);
    }
  }
  return { ...createdUser, createdAt: createdUser.created_at, profilePhotoUrl: createdUser.profile_photo_url, forcePasswordChange: createdUser.force_password_change } as User;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  console.log(`dataService: updateUser called for ID: ${id} with updates:`, updates);
  if (updates.username) {
      const currentUser = await getUserById(id); // This already logs
      if (currentUser && updates.username !== currentUser.username) {
        const { data: existingUser, error: checkError } = await supabase.from('users').select('id').eq('username', updates.username).neq('id', id).maybeSingle();
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('dataService: Error checking username availability during update:', checkError.message);
            throw new Error(`Username check failed: ${checkError.message}`);
        }
        if (existingUser) {
            console.warn("dataService: Username already taken (update):", updates.username);
            throw new Error("Username already taken.");
        }
      }
  }

  const { createdAt, ...restOfUpdates } = updates; // Exclude createdAt from client-side updates
  const updatePayload: Record<string, any> = { ...restOfUpdates };
  if (updates.profilePhotoUrl) updatePayload.profile_photo_url = updates.profilePhotoUrl;
  if (updates.forcePasswordChange !== undefined) updatePayload.force_password_change = updates.forcePasswordChange;


  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedUser) {
    console.error(`dataService: Error updating user ${id} in Supabase:`, error?.message);
    throw new Error(error?.message || "Failed to update user.");
  }
  console.log("dataService: updateUser successfully updated user:", updatedUser);
  return { ...updatedUser, createdAt: updatedUser.created_at, profilePhotoUrl: updatedUser.profile_photo_url, forcePasswordChange: updatedUser.force_password_change } as User;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  console.log(`dataService: deleteUser called for ID: ${id}`);
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`dataService: Error deleting user ${id} from Supabase:`, error.message);
    throw new Error(`Failed to delete user ${id}: ${error.message}`);
  }
  console.log(`dataService: deleteUser successfully deleted user ID: ${id}`);
  return true;
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  console.log(`dataService: checkUsernameAvailability called for username: ${username}`);
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('username', username);

  if (error) {
    console.error('dataService: Error checking username availability:', error.message);
    return false; // Fail safe
  }
  const isAvailable = count === 0;
  console.log(`dataService: Username "${username}" availability: ${isAvailable}`);
  return isAvailable;
};


// --- Savings Operations ---
export const getSavingsByUserId = async (userId: string): Promise<SavingTransaction[]> => {
  console.log(`dataService: getSavingsByUserId called for user ID: ${userId}`);
  const { data: savings, error } = await supabase
    .from('savings')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error(`dataService: Error fetching savings for user ${userId}:`, error.message);
    throw new Error(`Failed to fetch savings for user ${userId}: ${error.message}`);
  }
  const mappedSavings = (savings || []).map(s => ({...s, userId: s.user_id })) as SavingTransaction[];
  console.log(`dataService: getSavingsByUserId successfully fetched ${mappedSavings.length} records for user ${userId}`);
  return mappedSavings;
};

export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  console.log("dataService: addSavingTransaction called with transaction:", transaction);
  const payload = { 
    user_id: transaction.userId,
    amount: transaction.amount,
    date: transaction.date,
    type: transaction.type
  };

  const { data: newTransaction, error } = await supabase
    .from('savings')
    .insert(payload)
    .select()
    .single();

  if (error || !newTransaction) {
    console.error('dataService: Error adding saving transaction:', error?.message);
    throw new Error(error?.message || "Failed to add saving transaction.");
  }
  console.log("dataService: addSavingTransaction successfully added transaction:", newTransaction);
  // Audit Log for admin adding transaction
  const admins = await getAdmins();
  const user = await getUserById(transaction.userId);
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
    } catch (auditError: any) {
        console.error("dataService: Failed to add audit log for saving transaction:", auditError.message);
    }
  }
  return { ...newTransaction, userId: newTransaction.user_id } as SavingTransaction;
};

export const updateUserSavings = async (userId: string, newTotalSavingsAmount: number, date: string, adminId: string, adminName: string): Promise<SavingTransaction | undefined> => {
  console.log(`dataService: updateUserSavings called for user ID: ${userId}, newTotal: ${newTotalSavingsAmount}`);
  const userSavings = await getSavingsByUserId(userId);
  const currentTotalSavings = userSavings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);
  const adjustmentAmount = newTotalSavingsAmount - currentTotalSavings;

  if (Math.abs(adjustmentAmount) < 0.01) { 
    console.log("dataService: updateUserSavings - no significant adjustment needed.");
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
  
  const newTransaction = await addSavingTransaction(transactionPayload); // This already logs.
  console.log("dataService: updateUserSavings created adjustment transaction:", newTransaction);

  const user = await getUserById(userId);
   try {
    await addAuditLog({
        adminId: adminId,
        adminName: adminName,
        action: `Admin adjusted savings for ${user?.name || `ID ${userId}`}. New total: ${newTotalSavingsAmount}. Adjustment: ${transactionType} of ${absAdjustmentAmount}`,
        timestamp: new Date().toISOString(),
        details: { transactionId: newTransaction.id, userId: userId, userName: user?.name, newTotalSavings: newTotalSavingsAmount, adjustmentAmount: absAdjustmentAmount, adjustmentType: transactionType, date: date }
    });
  } catch (auditError: any) {
      console.error("dataService: Failed to add audit log for savings adjustment:", auditError.message);
  }
  return newTransaction;
};

// --- Profits Operations ---
export const getProfitsByUserId = async (userId: string): Promise<ProfitEntry[]> => {
  console.log(`dataService: getProfitsByUserId called for user ID: ${userId}`);
  const { data: profits, error } = await supabase
    .from('profits')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error(`dataService: Error fetching profits for user ${userId}:`, error.message);
    throw new Error(`Failed to fetch profits for user ${userId}: ${error.message}`);
  }
  const mappedProfits = (profits || []).map(p => ({...p, userId: p.user_id })) as ProfitEntry[];
  console.log(`dataService: getProfitsByUserId successfully fetched ${mappedProfits.length} records for user ${userId}`);
  return mappedProfits;
};

export const addProfitEntry = async (profitEntry: Omit<ProfitEntry, 'id'>): Promise<ProfitEntry> => {
  console.log("dataService: addProfitEntry called with profitEntry:", profitEntry);
  const payload = { 
    user_id: profitEntry.userId,
    amount: profitEntry.amount,
    date: profitEntry.date,
    description: profitEntry.description
  };

  const { data: newEntry, error } = await supabase
    .from('profits')
    .insert(payload)
    .select()
    .single();

  if (error || !newEntry) {
    console.error('dataService: Error adding profit entry:', error?.message);
    throw new Error(error?.message || "Failed to add profit entry.");
  }
  console.log("dataService: addProfitEntry successfully added entry:", newEntry);
  return { ...newEntry, userId: newEntry.user_id } as ProfitEntry;
};

// --- Loan Operations ---
export const getLoansByUserId = async (userId: string): Promise<LoanRequest[]> => {
  console.log(`dataService: getLoansByUserId called for user ID: ${userId}`);
  const { data: loans, error } = await supabase
    .from('loans')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error(`dataService: Error fetching loans for user ${userId}:`, error.message);
    throw new Error(`Failed to fetch loans for user ${userId}: ${error.message}`);
  }
  const mappedLoans = (loans || []).map(l => ({
    ...l, 
    userId: l.user_id, 
    requestedAt: l.requested_at,
    reviewedAt: l.reviewed_at
  })) as LoanRequest[];
  console.log(`dataService: getLoansByUserId successfully fetched ${mappedLoans.length} records for user ${userId}`);
  return mappedLoans;
};

export const getAllLoans = async (): Promise<LoanRequest[]> => {
  console.log("dataService: getAllLoans called");
  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      *,
      users ( name ) 
    `) 
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('dataService: Error fetching all loans:', error.message);
    throw new Error(`Failed to fetch all loans: ${error.message}`);
  }
  const mappedLoans = (loans || []).map(loan => ({
    ...loan,
    userId: loan.user_id,
    userName: (loan as any).users?.name || `User ID: ${loan.user_id}`,
    requestedAt: loan.requested_at,
    reviewedAt: loan.reviewed_at
  })) as LoanRequest[];
  console.log(`dataService: getAllLoans successfully fetched ${mappedLoans.length} loans`);
  return mappedLoans;
};

export const addLoanRequest = async (request: Omit<LoanRequest, 'id' | 'status' | 'requestedAt' | 'userName' | 'reviewedAt'>): Promise<LoanRequest> => {
  console.log("dataService: addLoanRequest called with request for user ID:", request.userId);
  const user = await getUserById(request.userId); 
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
    console.error('dataService: Error adding loan request:', error?.message);
    throw new Error(error?.message || "Failed to add loan request.");
  }
  console.log("dataService: addLoanRequest successfully added request:", newRequest);
  return { 
    ...newRequest, 
    userId: newRequest.user_id, 
    userName: user?.name,
    requestedAt: newRequest.requested_at,
    reviewedAt: newRequest.reviewed_at
  } as LoanRequest;
};

export const updateLoanStatus = async (loanId: string, status: LoanStatus, adminId: string): Promise<LoanRequest | undefined> => {
  console.log(`dataService: updateLoanStatus called for loan ID: ${loanId}, new status: ${status}`);
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
    console.error(`dataService: Error updating loan status for ${loanId}:`, error?.message);
    throw new Error(`Failed to update loan ${loanId} status: ${error?.message}`);
  }
  
  const updatedLoan = {
      ...updatedLoanData,
      userId: updatedLoanData.user_id,
      userName: (updatedLoanData as any).users?.name || `User ID: ${updatedLoanData.user_id}`,
      requestedAt: updatedLoanData.requested_at,
      reviewedAt: updatedLoanData.reviewed_at
  } as LoanRequest;
  console.log("dataService: updateLoanStatus successfully updated loan:", updatedLoan);

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
    } catch (auditError: any) {
        console.error("dataService: Failed to add audit log for loan status update:", auditError.message);
    }
  }
  return updatedLoan;
};

// --- Audit Log Operations ---
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  console.log("dataService: getAuditLogs called");
  const { data: logs, error } = await supabase
    .from('audit_logs') 
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('dataService: Error fetching audit logs:', error.message);
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }
  const mappedLogs = (logs || []).map(log => ({...log, adminId: log.admin_id })) as AuditLogEntry[];
  console.log(`dataService: getAuditLogs successfully fetched ${mappedLogs.length} logs`);
  return mappedLogs;
};

export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> => {
  console.log("dataService: addAuditLog called with action:", logEntry.action);
  const payload = {
      admin_id: logEntry.adminId,
      admin_name: logEntry.adminName,
      action: logEntry.action,
      timestamp: logEntry.timestamp,
      details: logEntry.details,
  };

  const { data: newLog, error } = await supabase
    .from('audit_logs')
    .insert(payload)
    .select()
    .single();

  if (error || !newLog) {
    console.error('dataService: Error adding audit log:', error?.message);
    // Do not throw error here as audit logging is secondary to primary operation
    // But do log it prominently.
    console.error(`Failed to add audit log for action "${logEntry.action}": ${error?.message}`);
    // Return a constructed log entry or a specific error object if needed by caller,
    // but for now, let's assume it's okay if audit log fails occasionally without stopping main flow.
    // For critical audit, throwing an error might be preferred.
    // Reconstruct what would have been returned to avoid breaking caller if it expects an AuditLogEntry.
    return {
        id: 'AUDIT_LOG_FAILED', // Special ID to indicate failure
        ...logEntry
    } as AuditLogEntry; 
  }
  console.log("dataService: addAuditLog successfully added log:", newLog);
  return { ...newLog, adminId: newLog.admin_id } as AuditLogEntry;
};

// --- Real-time Subscription Functions (Placeholder - actual setup might vary) ---
export const subscribeToTable = (tableName: string, callback: (payload: any) => void) => {
  console.log(`dataService: Subscribing to changes on table: ${tableName}`);
  const channel = supabase
    .channel(`public:${tableName}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
        console.log(`dataService: Change received on ${tableName}:`, payload);
        callback(payload);
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`dataService: Successfully subscribed to ${tableName}!`);
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
        console.error(`dataService: Error subscribing to ${tableName}:`, err || status);
      }
    });
  return channel;
};

// Example specific subscriptions if needed, or use the generic one.
export const subscribeToSavings = (callback: (change: any) => void) => subscribeToTable('savings', callback);
export const subscribeToProfits = (callback: (change: any) => void) => subscribeToTable('profits', callback);
export const subscribeToLoans = (callback: (change: any) => void) => subscribeToTable('loans', callback);
export const subscribeToAuditLogs = (callback: (change: any) => void) => subscribeToTable('audit_logs', callback);
export const subscribeToUsers = (callback: (change: any) => void) => subscribeToTable('users', callback);
