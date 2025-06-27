'use client';

/**
 * @fileoverview Data service for interacting with the Supabase database.
 * 
 * IMPORTANT: All functions in this file assume that you have configured
 * appropriate Row Level Security (RLS) policies in your Supabase project.
 * By default, all tables are protected and will deny requests from the browser.
 * 
 * For development, you can create a permissive policy that allows all actions:
 * 1. Go to Authentication > Policies in your Supabase dashboard.
 * 2. For each table, create a new policy.
 * 3. Set the "Allowed operation" to ALL.
 * 4. Use `true` for both the "USING expression" and "WITH CHECK expression".
 * 
 * For production, you should create more restrictive policies.
 */

import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, LoanStatus } from '@/types';
import { supabase } from '@/supabaseClient';

// --- User Operations ---
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*').order('createdAt', { ascending: false });
  if (error) {
    console.error('dataService: Error fetching users:', error.message);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  // Exclude password when getting all users
  return (data || []).map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  });
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') { // PGRST116: "The result contains 0 rows"
    console.error('dataService: Error fetching user by ID:', error.message);
    throw new Error(`Failed to fetch user by ID: ${error.message}`);
  }
  return data || undefined;
};

export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
  if (error && error.code !== 'PGRST116') {
    console.error('dataService: Error fetching user by username:', error.message);
    throw new Error(`Failed to fetch user by username: ${error.message}`);
  }
  return data || undefined;
}

export const addUser = async (userStub: Pick<User, 'name' | 'username' | 'contact' | 'profilePhotoUrl'>): Promise<User> => {
  if (!(await checkUsernameAvailability(userStub.username))) {
    throw new Error("User with this username already exists.");
  }
  
  // Supabase will handle createdAt with a default value
  const newUserPayload: Omit<User, 'id' | 'createdAt'> = {
    ...userStub,
    password: "1234",
    forcePasswordChange: true,
  };

  const { data, error } = await supabase.from('users').insert([newUserPayload]).select().single();

  if (error) {
    console.error('dataService: Error adding user:', error.message);
    throw new Error(`Failed to add user: ${error.message}`);
  }
  return data as User;
};

export const createUserFromRegistration = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    if (!(await checkUsernameAvailability(userData.username))) {
        throw new Error("User with this username already exists.");
    }
    
    // createdAt will be handled by Supabase default
    const { createdAt, ...payload } = userData;
    
    const { data, error } = await supabase.from('users').insert([payload]).select().single();
    
    if (error) {
      console.error('dataService: Error creating user from registration:', error.message);
      throw new Error(`Failed to create user: ${error.message}`);
    }
    return data as User;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
  if (error) {
    console.error('dataService: Error updating user:', error.message);
    throw new Error(`Failed to update user: ${error.message}`);
  }
  const { password, ...userToReturn } = data;
  return userToReturn as User;
};

export const deleteUser = async (id: string): Promise<boolean> => {
    // In a real app with proper foreign key constraints and cascades,
    // deleting the user would handle this. For this setup, we delete manually.
    const tables = ['savings', 'profits', 'loans'];
    for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('userId', id);
        if (error) {
            console.error(`Error deleting from ${table} for user ${id}:`, error.message);
            throw new Error(`Failed to delete user's related data in ${table}: ${error.message}`);
        }
    }

    const { error: userError } = await supabase.from('users').delete().eq('id', id);
    if (userError) {
        console.error(`Error deleting user ${id}:`, userError.message);
        throw new Error(`Failed to delete user: ${userError.message}`);
    }

    return true;
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const { data, error } = await supabase.from('users').select('id').eq('username', username).limit(1);
  if (error) {
    console.error('dataService: Error checking username:', error.message);
    throw new Error(`Failed to check username: ${error.message}`);
  }
  return data.length === 0;
};


// --- Savings Operations ---
export const getAllSavings = async (since?: Date): Promise<SavingTransaction[]> => {
  let query = supabase.from('savings').select('*').order('date', { ascending: false });
  if (since) {
    query = query.gte('date', since.toISOString());
  }
  const { data, error } = await query;

  if (error) {
    console.error('dataService: Error fetching all savings:', error.message);
    throw new Error(`Failed to fetch all savings: ${error.message}`);
  }
  return data || [];
};

export const getSavingsByUserId = async (userId: string): Promise<SavingTransaction[]> => {
  const { data, error } = await supabase.from('savings').select('*').eq('userId', userId).order('date', { ascending: false });
  if (error) {
    console.error(`dataService: Error fetching savings for user ${userId}:`, error.message);
    throw new Error(`Failed to fetch savings for user: ${error.message}`);
  }
  return data || [];
};

export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  const { data, error } = await supabase.from('savings').insert([transaction]).select().single();
  if (error) {
    console.error('dataService: Error adding saving transaction:', error.message);
    throw new Error(`Failed to add saving transaction: ${error.message}`);
  }
  return data as SavingTransaction;
};

export const updateUserSavings = async (userId: string, newTotalSavingsAmount: number, date: string, adminId: string, adminName?: string): Promise<SavingTransaction | undefined> => {
    const userSavings = await getSavingsByUserId(userId);
    const currentTotal = userSavings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);
    const adjustmentAmount = newTotalSavingsAmount - currentTotal;

    if (Math.abs(adjustmentAmount) < 0.01) return undefined;

    const newTransaction: Omit<SavingTransaction, 'id'> = {
        userId,
        amount: Math.abs(adjustmentAmount),
        date: new Date(date).toISOString(),
        type: adjustmentAmount > 0 ? 'deposit' : 'withdrawal',
    };
    const addedTransaction = await addSavingTransaction(newTransaction);
    
    await addAuditLog({
        adminId,
        adminName,
        action: `Adjusted savings for user ID ${userId}`,
        timestamp: new Date().toISOString(),
        details: { userId, adjustment: adjustmentAmount },
    });

    return addedTransaction;
}

// --- Profits Operations ---
export const getAllProfits = async (since?: Date): Promise<ProfitEntry[]> => {
  let query = supabase.from('profits').select('*').order('date', { ascending: false });
  if (since) {
    query = query.gte('date', since.toISOString());
  }
  const { data, error } = await query;
  if (error) {
    console.error('dataService: Error fetching all profits:', error.message);
    throw new Error(`Failed to fetch all profits: ${error.message}`);
  }
  return data || [];
};

export const getProfitsByUserId = async (userId: string): Promise<ProfitEntry[]> => {
    const { data, error } = await supabase.from('profits').select('*').eq('userId', userId).order('date', { ascending: false });
    if (error) {
      console.error(`dataService: Error fetching profits for user ${userId}:`, error.message);
      throw new Error(`Failed to fetch profits: ${error.message}`);
    }
    return data || [];
};

export const addProfitEntry = async (profitEntry: Omit<ProfitEntry, 'id'>): Promise<ProfitEntry> => {
    const { data, error } = await supabase.from('profits').insert([profitEntry]).select().single();
    if (error) {
      console.error('dataService: Error adding profit entry:', error.message);
      throw new Error(`Failed to add profit entry: ${error.message}`);
    }
    return data as ProfitEntry;
};

// --- Loan Operations ---
export const getLoansByUserId = async (userId: string): Promise<LoanRequest[]> => {
    const { data, error } = await supabase.from('loans').select('*').eq('userId', userId).order('requestedAt', { ascending: false });
    if (error) {
      console.error(`dataService: Error fetching loans for user ${userId}:`, error.message);
      throw new Error(`Failed to fetch loans for user: ${error.message}`);
    }
    return data || [];
};

export const getAllLoans = async (): Promise<LoanRequest[]> => {
    // Supabase can do joins, which is much more efficient than the Firestore version
    const { data, error } = await supabase
      .from('loans')
      .select(`
        id,
        userId,
        amount,
        reason,
        status,
        requestedAt,
        reviewedAt,
        user:users (
          name
        )
      `)
      .order('requestedAt', { ascending: false });
      
    if (error) {
      console.error('dataService: Error fetching all loans:', error.message);
      throw new Error(`Failed to fetch all loans: ${error.message}`);
    }

    const mappedLoans = (data || []).map(loan => ({
      ...loan,
      userName: (loan.user as any)?.name || 'Unknown User',
    }));

    return mappedLoans;
};

export const addLoanRequest = async (request: Omit<LoanRequest, 'id' | 'status' | 'requestedAt' | 'userName' | 'reviewedAt'>): Promise<LoanRequest> => {
    const newRequestPayload = {
      ...request,
      status: 'pending' as LoanStatus,
      // requestedAt will be set by the database default
    };

    const { data, error } = await supabase.from('loans').insert([newRequestPayload]).select().single();
    if (error) {
      console.error('dataService: Error adding loan request:', error.message);
      throw new Error(`Failed to add loan request: ${error.message}`);
    }
    return data as LoanRequest;
};

export const updateLoanStatus = async (loanId: string, status: LoanStatus, adminId: string): Promise<LoanRequest | undefined> => {
    const { data, error } = await supabase.from('loans').update({
        status: status,
        reviewedAt: new Date().toISOString(),
    }).eq('id', loanId).select().single();

    if (error) {
      console.error('dataService: Error updating loan status:', error.message);
      throw new Error(`Failed to update loan status: ${error.message}`);
    }
    return data as LoanRequest;
};

// --- Audit Log Operations ---
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
    const { data, error } = await supabase.from('auditLogs').select('*').order('timestamp', { ascending: false }).limit(100);
    if (error) {
      console.error('dataService: Error fetching audit logs:', error.message);
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }
    return data || [];
};

export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> => {
    const { data, error } = await supabase.from('auditLogs').insert([logEntry]).select().single();
    if (error) {
      console.error('dataService: Error adding audit log:', error.message);
      throw new Error(`Failed to add audit log: ${error.message}`);
    }
    return data as AuditLogEntry;
};
