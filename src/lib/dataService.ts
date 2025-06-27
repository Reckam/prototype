
'use client';

import type { User, Admin, SavingTransaction, ProfitEntry, LoanRequest, AuditLogEntry, LoanStatus } from '@/types';
import { db } from './firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

// Helper to convert Firestore doc to our type, handling Timestamps
const fromDoc = <T extends { id: string }>(doc: any): T => {
  const data = doc.data();
  // Firestore timestamps need to be converted to ISO strings for date-fns compatibility
  const convertedData = Object.keys(data).reduce((acc, key) => {
    if (data[key] instanceof Timestamp) {
      acc[key] = data[key].toDate().toISOString();
    } else {
      acc[key] = data[key];
    }
    return acc;
  }, {} as any);

  return { id: doc.id, ...convertedData } as T;
};


// --- User Operations ---
export const getUsers = async (): Promise<User[]> => {
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  // Exclude password when getting all users
  return userSnapshot.docs.map(doc => {
    const { password, ...userWithoutPassword } = fromDoc<User>(doc);
    return userWithoutPassword;
  });
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  const userDocRef = doc(db, 'users', id);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) {
    return undefined;
  }
  return fromDoc<User>(userSnap);
};

// This function is for authService to get user with password
export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return undefined;
  }
  return fromDoc<User>(querySnapshot.docs[0]);
}

export const addUser = async (userStub: Pick<User, 'name' | 'username' | 'contact' | 'profilePhotoUrl'>): Promise<User> => {
  if (!(await checkUsernameAvailability(userStub.username))) {
    throw new Error("User with this username already exists.");
  }

  const newUserPayload = {
    ...userStub,
    password: "1234",
    forcePasswordChange: true,
    createdAt: new Date(),
  };

  // Firestore doesn't accept `undefined` values.
  if (newUserPayload.profilePhotoUrl === undefined) {
    delete (newUserPayload as { profilePhotoUrl?: string }).profilePhotoUrl;
  }

  const userCol = collection(db, 'users');
  const docRef = await addDoc(userCol, newUserPayload);
  
  return { ...userStub, id: docRef.id, createdAt: newUserPayload.createdAt.toISOString(), forcePasswordChange: true, password: "1234" };
};

export const createUserFromRegistration = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    if (!(await checkUsernameAvailability(userData.username))) {
        throw new Error("User with this username already exists.");
    }
    const newUserPayload = {
      ...userData,
      createdAt: new Date(),
    };

    // Firestore doesn't accept `undefined` values.
    if (newUserPayload.profilePhotoUrl === undefined) {
        delete (newUserPayload as { profilePhotoUrl?: string }).profilePhotoUrl;
    }
    
    const docRef = await addDoc(collection(db, 'users'), newUserPayload);
    return { ...userData, id: docRef.id, createdAt: newUserPayload.createdAt.toISOString() };
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User | undefined> => {
  const userDocRef = doc(db, 'users', id);
  await updateDoc(userDocRef, updates);
  const updatedUser = await getUserById(id);
  // Ensure we don't return password
  if (updatedUser) {
    const { password, ...userToReturn } = updatedUser;
    return userToReturn;
  }
  return undefined;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const batch = writeBatch(db);
  
  const userDocRef = doc(db, 'users', id);
  batch.delete(userDocRef);
  
  const savingsQuery = query(collection(db, 'savings'), where('userId', '==', id));
  const savingsSnapshot = await getDocs(savingsQuery);
  savingsSnapshot.forEach(doc => batch.delete(doc.ref));

  const profitsQuery = query(collection(db, 'profits'), where('userId', '==', id));
  const profitsSnapshot = await getDocs(profitsQuery);
  profitsSnapshot.forEach(doc => batch.delete(doc.ref));

  const loansQuery = query(collection(db, 'loans'), where('userId', '==', id));
  const loansSnapshot = await getDocs(loansQuery);
  loansSnapshot.forEach(doc => batch.delete(doc.ref));

  await batch.commit();
  return true;
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};

// --- Savings Operations ---
export const getSavingsByUserId = async (userId: string): Promise<SavingTransaction[]> => {
  const q = query(collection(db, 'savings'), where('userId', '==', userId), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => fromDoc<SavingTransaction>(doc));
};

export const addSavingTransaction = async (transaction: Omit<SavingTransaction, 'id'>): Promise<SavingTransaction> => {
  const payload = { ...transaction, date: new Date(transaction.date) };
  const docRef = await addDoc(collection(db, 'savings'), payload);
  return { ...transaction, id: docRef.id };
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
export const getProfitsByUserId = async (userId: string): Promise<ProfitEntry[]> => {
    const q = query(collection(db, 'profits'), where('userId', '==', userId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => fromDoc<ProfitEntry>(doc));
};

export const addProfitEntry = async (profitEntry: Omit<ProfitEntry, 'id'>): Promise<ProfitEntry> => {
    const payload = { ...profitEntry, date: new Date(profitEntry.date) };
    const docRef = await addDoc(collection(db, 'profits'), payload);
    return { ...profitEntry, id: docRef.id };
};


// --- Loan Operations ---
export const getLoansByUserId = async (userId: string): Promise<LoanRequest[]> => {
    const q = query(collection(db, 'loans'), where('userId', '==', userId), orderBy('requestedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => fromDoc<LoanRequest>(doc));
};

export const getAllLoans = async (): Promise<LoanRequest[]> => {
    const loansCol = collection(db, 'loans');
    const q = query(loansCol, orderBy('requestedAt', 'desc'));
    const loansSnapshot = await getDocs(q);
    
    const loansWithUserNames = await Promise.all(
        loansSnapshot.docs.map(async (loanDoc) => {
            const loan = fromDoc<LoanRequest>(loanDoc);
            // Fetch user, but only necessary fields to avoid sending password to client
            const userSnap = await getDoc(doc(db, 'users', loan.userId));
            const userName = userSnap.exists() ? userSnap.data().name : 'Unknown User';
            return {
                ...loan,
                userName,
            };
        })
    );
    return loansWithUserNames;
};

export const addLoanRequest = async (request: Omit<LoanRequest, 'id' | 'status' | 'requestedAt' | 'userName' | 'reviewedAt'>): Promise<LoanRequest> => {
    const newRequestPayload = {
      ...request,
      status: 'pending' as LoanStatus,
      requestedAt: new Date(),
      reviewedAt: null,
    };
    const docRef = await addDoc(collection(db, 'loans'), newRequestPayload);
    return { ...request, status: 'pending', id: docRef.id, requestedAt: newRequestPayload.requestedAt.toISOString() };
};

export const updateLoanStatus = async (loanId: string, status: LoanStatus, adminId: string): Promise<LoanRequest | undefined> => {
    const loanDocRef = doc(db, 'loans', loanId);
    const reviewedAtDate = new Date();
    await updateDoc(loanDocRef, {
        status: status,
        reviewedAt: reviewedAtDate,
    });
    
    const updatedLoanSnap = await getDoc(loanDocRef);
    if (!updatedLoanSnap.exists()) return undefined;
    
    return fromDoc<LoanRequest>(updatedLoanSnap);
};


// --- Audit Log Operations ---
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => fromDoc<AuditLogEntry>(doc));
};

export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> => {
    const payload = { ...logEntry, timestamp: new Date(logEntry.timestamp) };
    const docRef = await addDoc(collection(db, 'auditLogs'), payload);
    return { ...logEntry, id: docRef.id };
};
