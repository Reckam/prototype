
// Data service using Supabase for persistence
import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, LoanStatus } from '@/types';
import { supabase } from '@/supabaseClient'; 

console.log("dataService.ts: Supabase client initialized:", supabase !== null);

// --- Admin Operations ---
export const getAdmins = async (): Promise<Admin[]> => {
  console.log("dataService: getAdmins called");
  // For now, returning the mock admin.
  // In a real scenario, this would fetch from an 'admins' table or check roles.
  await Promise.resolve(); // Simulates async operation
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
  // Map Supabase snake_case to application camelCase
  const users = (supabaseUsers || []).map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    contact: u.contact,
    password: u.password, // Be cautious with password handling
    profilePhotoUrl: u.profile_photo_url,
    createdAt: u.created_at,
    forcePasswordChange: u.force_password_change,
  })) as User[];
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
  const mappedUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    contact: user.contact,
    password: user.password,
    profilePhotoUrl: user.profile_photo_url,
    createdAt: user.created_at,
    forcePasswordChange: user.force_password_change,
  } as User;
  console.log("dataService: getUserById successfully fetched user:", mappedUser);
  return mappedUser;
};

export const addUser = async (userStub: Pick<User, 'name' | 'username' | 'profilePhotoUrl' | 'contact'>): Promise<User> => {
  console.log("dataService: addUser (admin action) called with userStub:", userStub);
  
  const { data: existingUser, error: checkError } = await supabase.from('users').select('id').eq('username', userStub.username).maybeSingle();
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('dataService: Error checking for existing username during addUser:', checkError);
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
    password: "1234", 
    force_password_change: true,
    profile_photo_url: userStub.profilePhotoUrl,
  };
  console.log("dataService: addUser - inserting payload:", newUserPayload);

  const { data: createdSupabaseUser, error: insertError } = await supabase
    .from('users')
    .insert(newUserPayload)
    .select()
    .single();

  if (insertError) {
    console.error('dataService: Supabase insert error during addUser:', insertError);
    throw new Error(`Supabase insert error: ${insertError.message}`);
  }
  if (!createdSupabaseUser) {
    console.error('dataService: Supabase returned no data for createdUser during addUser, though no explicit error was thrown.');
    throw new Error("Failed to create user account in Supabase: No data returned after insert.");
  }
  
  console.log("dataService: addUser - Supabase insert successful, raw data:", createdSupabaseUser);

  const admins = await getAdmins(); 
  if (admins.length > 0) {
    const admin = admins[0]; 
    try {
      await addAuditLog({
        adminId: admin.id,
        adminName: admin.name,
        action: `Admin created new user: ${createdSupabaseUser.username}`,
        timestamp: new Date().toISOString(),
        details: { userId: createdSupabaseUser.id, username: createdSupabaseUser.username, name: createdSupabaseUser.name }
      });
    } catch (auditError: any) {
        console.error("dataService: Failed to add audit log for user creation:", auditError.message);
    }
  }

  const appUser: User = {
    id: createdSupabaseUser.id,
    name: createdSupabaseUser.name,
    username: createdSupabaseUser.username,
    contact: createdSupabaseUser.contact,
    password: createdSupabaseUser.password, 
    profilePhotoUrl: createdSupabaseUser.profile_photo_url,
    createdAt: createdSupabaseUser.created_at,
    forcePasswordChange: createdSupabaseUser.force_password_change,
  };
  console.log("dataService: addUser successfully created and mapped appUser:", appUser);
  return appUser;
};

export const createUserFromRegistration = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
  console.log("dataService: createUserFromRegistration (self-registration) called with username:", userData.username);
  
  const { data: existingUser, error: checkError } = await supabase.from('users').select('id').eq('username', userData.username).maybeSingle();
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('dataService: Error checking for existing username during registration:', checkError);
    throw new Error(`Failed to check username: ${checkError.message}`);
  }
  if (existingUser) {
    console.warn("dataService: User with this username already exists (registration):", userData.username);
    throw new Error("User with this username already exists.");
  }
  
  const newUserPayload = {
    name: userData.name,
    username: userData.username,
    contact: userData.contact,
    password: userData.password, 
    force_password_change: userData.forcePasswordChange !== undefined ? userData.forcePasswordChange : false,
    profile_photo_url: userData.profilePhotoUrl,
  };
  console.log("dataService: createUserFromRegistration - inserting payload:", newUserPayload);

  const { data: createdSupabaseUser, error: insertError } = await supabase
    .from('users')
    .insert(newUserPayload)
    .select()
    .single();
  
  if (insertError) {
    console.error('dataService: Supabase insert error during createUserFromRegistration:', insertError);
    throw new Error(`Supabase insert error: ${insertError.message}`);
  }
  if (!createdSupabaseUser) {
    console.error('dataService: Supabase returned no data for createdUser during createUserFromRegistration.');
    throw new Error("Failed to create user account from registration: No data returned after insert.");
  }
  console.log("dataService: createUserFromRegistration - Supabase insert successful, raw data:", createdSupabaseUser);

  const admins = await getAdmins();
  if (admins.length > 0) {
    const reportingAdmin = admins[0]; 
     try {
        await addAuditLog({
            adminId: reportingAdmin.id, 
            adminName: reportingAdmin.name, 
            action: `New user self-registered: ${createdSupabaseUser.username}`,
            timestamp: new Date().toISOString(),
            details: { userId: createdSupabaseUser.id, username: createdSupabaseUser.username, name: createdSupabaseUser.name, contact: createdSupabaseUser.contact }
        });
    } catch (auditError: any) {
        console.error("dataService: Failed to add audit log for self-registration:", auditError.message);
    }
  }

  const appUser: User = {
    id: createdSupabaseUser.id,
    name: createdSupabaseUser.name,
    username: createdSupabaseUser.username,
    contact: createdSupabaseUser.contact,
    password: createdSupabaseUser.password, 
    profilePhotoUrl: createdSupabaseUser.profile_photo_url,
    createdAt: createdSupabaseUser.created_at,
    forcePasswordChange: createdSupabaseUser.force_password_change,
  };
  console.log("dataService: createUserFromRegistration successfully created and mapped appUser:", appUser);
  return appUser;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  console.log(`dataService: updateUser called for ID: ${id} with updates:`, JSON.stringify(updates));
  
  if (updates.username) {
      const { data: userBeforeUpdate, error: fetchError } = await supabase.from('users').select('username').eq('id', id).single();
      if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('dataService: Error fetching current username during update:', fetchError);
          throw new Error(`Failed to fetch current user details: ${fetchError.message}`);
      }
      if (userBeforeUpdate && updates.username !== userBeforeUpdate.username) {
        const { data: existingUserWithNewUsername, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('username', updates.username)
            .neq('id', id) 
            .maybeSingle();
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('dataService: Error checking username availability during update:', checkError);
            throw new Error(`Username check failed: ${checkError.message}`);
        }
        if (existingUserWithNewUsername) {
            console.warn("dataService: Username already taken (update):", updates.username);
            throw new Error("Username already taken.");
        }
      }
  }

  const updatePayload: Record<string, any> = {};
  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.username !== undefined) updatePayload.username = updates.username;
  if (updates.contact !== undefined) updatePayload.contact = updates.contact;
  if (updates.password !== undefined) updatePayload.password = updates.password; 
  if (updates.profilePhotoUrl !== undefined) updatePayload.profile_photo_url = updates.profilePhotoUrl;
  if (updates.forcePasswordChange !== undefined) updatePayload.force_password_change = updates.forcePasswordChange;
  
  if (Object.keys(updatePayload).length === 0) {
    console.warn("dataService: updateUser called with no actual changes to update.");
    return getUserById(id); 
  }
  console.log("dataService: updateUser - updating with payload:", updatePayload);

  const { data: updatedSupabaseUser, error: updateError } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error(`dataService: Supabase error updating user ${id}:`, updateError);
    throw new Error(`Supabase update error: ${updateError.message}`);
  }
  if (!updatedSupabaseUser) {
     console.error(`dataService: Supabase returned no data for updatedUser ${id}, though no explicit error.`);
    throw new Error("Failed to update user: No data returned after update.");
  }
  console.log("dataService: updateUser - Supabase update successful, raw data:", updatedSupabaseUser);
  
  const appUser: User = {
    id: updatedSupabaseUser.id,
    name: updatedSupabaseUser.name,
    username: updatedSupabaseUser.username,
    contact: updatedSupabaseUser.contact,
    password: updatedSupabaseUser.password, 
    profilePhotoUrl: updatedSupabaseUser.profile_photo_url,
    createdAt: updatedSupabaseUser.created_at,
    forcePasswordChange: updatedSupabaseUser.force_password_change,
  };
  console.log("dataService: updateUser successfully updated and mapped appUser:", appUser);
  return appUser;
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
    return false; 
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
  const mappedSavings = (savings || []).map(s => ({
    id: s.id,
    userId: s.user_id,
    amount: s.amount,
    date: s.date,
    type: s.type,
   })) as SavingTransaction[];
  console.log(`dataService: getSavingsByUserId successfully fetched ${mappedSavings.length} records for user ${userId}`);
  return mappedSavings;
};

export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  console.log("dataService: addSavingTransaction called with transaction:", JSON.stringify(transaction));
  const payload = { 
    user_id: transaction.userId,
    amount: transaction.amount,
    date: transaction.date,
    type: transaction.type
  };
  console.log("dataService: addSavingTransaction - inserting payload:", payload);

  const { data: newTransactionData, error } = await supabase
    .from('savings')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('dataService: Error adding saving transaction:', error);
    throw new Error(error.message || "Failed to add saving transaction.");
  }
  if (!newTransactionData) {
     console.error('dataService: No data returned after adding saving transaction.');
    throw new Error("Failed to add saving transaction: No data returned.");
  }
  console.log("dataService: addSavingTransaction successfully added transaction, raw data:", newTransactionData);
  
  const admins = await getAdmins();
  const user = await getUserById(transaction.userId);
  if (admins.length > 0 && user) { 
      try {
        const admin = admins[0]; 
        await addAuditLog({
            adminId: admin.id,
            adminName: admin.name,
            action: `Admin recorded ${newTransactionData.type} of ${newTransactionData.amount} for user ${user.name}`,
            timestamp: new Date().toISOString(),
            details: { transactionId: newTransactionData.id, userId: newTransactionData.user_id, amount: newTransactionData.amount, type: newTransactionData.type, date: newTransactionData.date }
        });
    } catch (auditError: any) {
        console.error("dataService: Failed to add audit log for saving transaction:", auditError.message);
    }
  }

  const appTransaction: SavingTransaction = {
    id: newTransactionData.id,
    userId: newTransactionData.user_id,
    amount: newTransactionData.amount,
    date: newTransactionData.date,
    type: newTransactionData.type,
  };
  return appTransaction;
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
  
  const newTransaction = await addSavingTransaction(transactionPayload); 
  console.log("dataService: updateUserSavings created adjustment transaction:", newTransaction);

  const user = await getUserById(userId);
   try {
    await addAuditLog({
        adminId: adminId,
        adminName: adminName,
        action: `Admin adjusted savings for ${user?.name || `user ID ${userId}`}. New total: ${newTotalSavingsAmount}. Adjustment: ${transactionType} of ${absAdjustmentAmount}`,
        timestamp: new Date().toISOString(), 
        details: { 
            transactionId: newTransaction.id, 
            userId: userId, 
            userName: user?.name, 
            newTotalSavings: newTotalSavingsAmount, 
            adjustmentAmount: absAdjustmentAmount, 
            adjustmentType: transactionType, 
            adjustmentDate: date 
        }
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
  const mappedProfits = (profits || []).map(p => ({
    id: p.id,
    userId: p.user_id,
    amount: p.amount,
    date: p.date,
    description: p.description,
  })) as ProfitEntry[];
  console.log(`dataService: getProfitsByUserId successfully fetched ${mappedProfits.length} records for user ${userId}`);
  return mappedProfits;
};

export const addProfitEntry = async (profitEntry: Omit<ProfitEntry, 'id'>): Promise<ProfitEntry> => {
  console.log("dataService: addProfitEntry called with profitEntry:", JSON.stringify(profitEntry));
  const payload = { 
    user_id: profitEntry.userId,
    amount: profitEntry.amount,
    date: profitEntry.date,
    description: profitEntry.description
  };
  console.log("dataService: addProfitEntry - inserting payload:", payload);


  const { data: newEntryData, error } = await supabase
    .from('profits')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('dataService: Error adding profit entry:', error);
    throw new Error(error.message || "Failed to add profit entry.");
  }
  if(!newEntryData) {
    console.error('dataService: No data returned after adding profit entry.');
    throw new Error("Failed to add profit entry: No data returned.");
  }
  console.log("dataService: addProfitEntry successfully added entry, raw data:", newEntryData);

  const appEntry: ProfitEntry = {
    id: newEntryData.id,
    userId: newEntryData.user_id,
    amount: newEntryData.amount,
    date: newEntryData.date,
    description: newEntryData.description,
  };
  return appEntry;
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
    id: l.id,
    userId: l.user_id,
    amount: l.amount,
    reason: l.reason,
    status: l.status,
    requestedAt: l.requested_at,
    reviewedAt: l.reviewed_at,
  })) as LoanRequest[];
  console.log(`dataService: getLoansByUserId successfully fetched ${mappedLoans.length} records for user ${userId}`);
  return mappedLoans;
};

export const getAllLoans = async (): Promise<LoanRequest[]> => {
  console.log("dataService: getAllLoans called");
  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      id,
      user_id,
      amount,
      status,
      requested_at,
      reviewed_at,
      reason,
      users ( name ) 
    `) 
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('dataService: Error fetching all loans:', error.message);
    throw new Error(`Failed to fetch all loans: ${error.message}`);
  }
  const mappedLoans = (loans || []).map(loan => ({
    id: loan.id,
    userId: loan.user_id,
    userName: (loan as any).users?.name || `User ID: ${loan.user_id}`, 
    amount: loan.amount,
    reason: (loan as any).reason, 
    status: loan.status,
    requestedAt: loan.requested_at,
    reviewedAt: loan.reviewed_at,
  })) as LoanRequest[];
  console.log(`dataService: getAllLoans successfully fetched ${mappedLoans.length} loans`);
  return mappedLoans;
};

export const addLoanRequest = async (request: Omit<LoanRequest, 'id' | 'status' | 'requestedAt' | 'userName' | 'reviewedAt'>): Promise<LoanRequest> => {
  console.log("dataService: addLoanRequest called for user ID:", request.userId, "Amount:", request.amount);
  const user = await getUserById(request.userId); 
  
  const payload: any = { 
    user_id: request.userId,
    amount: request.amount,
    status: 'pending' as LoanStatus,
    requested_at: new Date().toISOString(),
  };

  if (request.reason) {
    payload.reason = request.reason;
  }
  console.log("dataService: addLoanRequest - inserting payload:", payload);

  const { data: newRequestData, error } = await supabase
    .from('loans')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('dataService: Error adding loan request:', error);
    if (error.message.includes("column") && error.message.includes("does not exist") && payload.reason) {
        console.error("dataService: It seems the 'reason' column does not exist in the 'loans' table. Loan reason was not saved.");
        throw new Error(`Failed to add loan request: ${error.message}. The 'reason' field might be missing in your database 'loans' table.`);
    }
    throw new Error(error.message || "Failed to add loan request.");
  }
  if (!newRequestData) {
    console.error('dataService: No data returned after adding loan request.');
    throw new Error("Failed to add loan request: No data returned.");
  }
  console.log("dataService: addLoanRequest successfully added request, raw data:", newRequestData);
  
  const appRequest: LoanRequest = { 
    id: newRequestData.id,
    userId: newRequestData.user_id, 
    userName: user?.name, 
    amount: newRequestData.amount,
    reason: newRequestData.reason,
    status: newRequestData.status,
    requestedAt: newRequestData.requested_at,
    reviewedAt: newRequestData.reviewed_at, 
  };
  return appRequest;
};

export const updateLoanStatus = async (loanId: string, status: LoanStatus, adminId: string): Promise<LoanRequest | undefined> => {
  console.log(`dataService: updateLoanStatus called for loan ID: ${loanId}, new status: ${status}, by admin: ${adminId}`);
  const payload = {
    status: status,
    reviewed_at: new Date().toISOString(),
  };
  console.log("dataService: updateLoanStatus - updating with payload:", payload);

  const { data: updatedLoanData, error } = await supabase
    .from('loans')
    .update(payload)
    .eq('id', loanId)
    .select(`
        id, user_id, amount, reason, status, requested_at, reviewed_at,
        users ( name )
    `)
    .single();

  if (error) {
    console.error(`dataService: Error updating loan status for ${loanId}:`, error);
    throw new Error(`Failed to update loan ${loanId} status: ${error.message}`);
  }
  if (!updatedLoanData) {
    console.error(`dataService: No data returned after updating loan ${loanId}.`);
    throw new Error(`Failed to update loan ${loanId} status: No data returned.`);
  }
  console.log("dataService: updateLoanStatus successfully updated loan, raw data:", updatedLoanData);

  const admins = await getAdmins();
  const admin = admins.find(a => a.id === adminId) || admins[0]; 
  
  const appLoan: LoanRequest = {
      id: updatedLoanData.id,
      userId: updatedLoanData.user_id,
      userName: (updatedLoanData as any).users?.name || `User ID: ${updatedLoanData.user_id}`,
      amount: updatedLoanData.amount,
      reason: updatedLoanData.reason,
      status: updatedLoanData.status,
      requestedAt: updatedLoanData.requested_at,
      reviewedAt: updatedLoanData.reviewed_at,
  };

  if (admin && appLoan) {
    try {
        await addAuditLog({
            adminId: admin.id,
            adminName: admin.name,
            action: `${status.charAt(0).toUpperCase() + status.slice(1)} loan #${appLoan.id} for ${appLoan.userName || `user ID ${appLoan.userId}`}`,
            timestamp: new Date().toISOString(),
            details: { loanId: appLoan.id, newStatus: status, userId: appLoan.userId, amount: appLoan.amount }
        });
    } catch (auditError: any) {
        console.error("dataService: Failed to add audit log for loan status update:", auditError.message);
    }
  }
  return appLoan;
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
  const mappedLogs = (logs || []).map(log => ({
    id: log.id,
    adminId: log.admin_id,
    adminName: log.admin_name,
    action: log.action,
    timestamp: log.timestamp,
    details: log.details,
   })) as AuditLogEntry[];
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
  console.log("dataService: addAuditLog - inserting payload:", payload);

  const { data: newLogData, error } = await supabase
    .from('audit_logs')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('dataService: Error adding audit log:', error);
    console.error(`CRITICAL: Failed to add audit log for action "${logEntry.action}": ${error.message}`);
    return {
        id: 'AUDIT_LOG_FAILED_' + new Date().getTime(), 
        ...logEntry
    } as AuditLogEntry; 
  }
   if (!newLogData) {
    console.error('dataService: No data returned after adding audit log.');
    return {
        id: 'AUDIT_LOG_FAILED_NO_DATA_' + new Date().getTime(),
        ...logEntry
    } as AuditLogEntry;
  }
  console.log("dataService: addAuditLog successfully added log, raw data:", newLogData);
  
  const appLog: AuditLogEntry = { 
    id: newLogData.id,
    adminId: newLogData.admin_id,
    adminName: newLogData.admin_name,
    action: newLogData.action,
    timestamp: newLogData.timestamp,
    details: newLogData.details,
   };
  return appLog;
};

// --- Real-time Subscription Functions ---
export const subscribeToTable = (tableName: string, callback: (payload: any) => void) => {
  console.log(`dataService: Attempting to subscribe to changes on table: ${tableName}`);
  const channel = supabase
    .channel(`public:${tableName}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
        console.log(`dataService: Change received on ${tableName}:`, payload);
        callback(payload);
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`dataService: Successfully SUBSCRIBED to ${tableName}!`);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`dataService: Error subscribing to ${tableName}. Status: ${status}`, err || '');
      } else {
        console.log(`dataService: Subscription status for ${tableName}: ${status}`);
      }
    });
  
  return {
    unsubscribe: () => {
      console.log(`dataService: Unsubscribing from ${tableName}`);
      return supabase.removeChannel(channel);
    }
  };
};

export const subscribeToSavings = (callback: (change: any) => void) => subscribeToTable('savings', callback);
export const subscribeToProfits = (callback: (change: any) => void) => subscribeToTable('profits', callback);
export const subscribeToLoans = (callback: (change: any) => void) => subscribeToTable('loans', callback);
export const subscribeToAuditLogs = (callback: (change: any) => void) => subscribeToTable('audit_logs', callback);
export const subscribeToUsers = (callback: (change: any) => void) => subscribeToTable('users', callback);
