
// Mock authentication service
"use client"; // Required for localStorage access

import type { User, Admin } from '@/types';
import { USER_STORAGE_KEY, ADMIN_STORAGE_KEY } from '@/lib/constants';
import { getUsers, getAdmins, addUser as addDataUser, updateUser as updateUserDataService } from './dataService'; 

// User Authentication
export const registerUser = async (name: string, username: string, passwordPlain: string, profilePhotoUrl?: string): Promise<{ user?: User, error?: string }> => {
  // In a real app, hash the password before storing
  const existingUser = (await getUsers()).find(u => u.username === username);
  if (existingUser) {
    return { error: "User already exists with this username." };
  }
  const newUser: User = { 
    id: Date.now().toString(), 
    name, 
    username, 
    createdAt: new Date().toISOString(),
    profilePhotoUrl
  };
  await addDataUser(newUser); 
  return { user: newUser };
};

export const loginUser = async (loginUsername: string, passwordPlain: string): Promise<{ user?: User, error?: string }> => {
  // In a real app, verify hashed password
  const users = await getUsers();
  const user = users.find(u => u.username === loginUsername); // Password check is omitted for mock
  if (user) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
    return { user };
  }
  return { error: "Invalid credentials" };
};

export const logoutUser = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userJson = localStorage.getItem(USER_STORAGE_KEY);
    return userJson ? JSON.parse(userJson) as User : null;
  }
  return null;
};

export const updateUserInSession = (updatedUser: User): void => {
  if (typeof window !== 'undefined') {
    // Ensure current user in session is fully updated
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === updatedUser.id) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } else { // If for some reason current user is not the one being updated (e.g. admin action reflected in user session)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  }
};


export const requestPasswordReset = async (username: string): Promise<{ success: boolean, message: string }> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  const users = await getUsers();
  const userExists = users.some(u => u.username === username);
  
  // For security reasons, always return a generic message whether the user exists or not.
  // In a real app, you'd only send an email if the user exists.
  const message = `If an account with the username "${username}" exists, a password reset link has been sent (simulated).`;
  
  if (userExists) {
    // Simulate sending email
    console.log(`Simulating password reset email for ${username}`);
    return { success: true, message };
  } else {
    // Even if user doesn't exist, present a similar message to avoid username enumeration
    console.log(`Password reset attempted for non-existent username: ${username}`);
    return { success: true, message }; // Reporting success: true to UI but action might differ
  }
};

export const changeUserPassword = async (userId: string, currentPasswordPlain: string, newPasswordPlain: string): Promise<{ success: boolean, message: string }> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  const user = await getUserById(userId);

  if (!user) {
    return { success: false, message: "User not found." };
  }

  // Mock password change: In a real app, currentPasswordPlain would be verified against a stored hash.
  // For this mock, we'll assume any non-empty current password "works" for demonstration, or skip check.
  // Let's simulate a successful password change if currentPassword is provided (even if not truly checked)
  if (currentPasswordPlain) { 
    console.log(`Simulating password change for user ${user.username}. New password (plain): ${newPasswordPlain}`);
    // In a real app, you would update the stored password hash here.
    // For the mock, no actual data change related to password hash occurs.
    return { success: true, message: "Password updated successfully. (Mock)" };
  } else {
     // If we wanted a mock failure for empty current password for demo purposes
    // return { success: false, message: "Current password is required to change your password. (Mock)" };
    // For simplicity for users, let's just let it pass.
    console.log(`Simulating password change for user ${user.username} without current password check. New password (plain): ${newPasswordPlain}`);
    return { success: true, message: "Password updated successfully. (Mock - current password check skipped)" };
  }
};


// Admin Authentication
export const loginAdmin = async (username: string, passwordPlain: string): Promise<{ admin?: Admin, error?: string }> => {
  const admins = await getAdmins();
  // Admin login uses 'username' which maps to their 'email' field for lookup.
  const admin = admins.find(a => a.email === username); 
  
  if (admin) {
    // Specific check for the admin with email 'admin' and password '0000'
    if (admin.email === "admin" && passwordPlain === "0000") {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
      }
      return { admin };
    } 
    // For other admin accounts (if any), the mock doesn't check passwords.
    // This block allows other admins to log in without a password check for testing purposes if their email isn't 'admin'.
    else if (admin.email !== "admin") {
        if (typeof window !== 'undefined') {
            localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
        }
        return { admin };
    }
  }
  return { error: "Invalid admin credentials" };
};

export const logoutAdmin = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
};

export const getCurrentAdmin = (): Admin | null => {
  if (typeof window !== 'undefined') {
    const adminJson = localStorage.getItem(ADMIN_STORAGE_KEY);
    return adminJson ? JSON.parse(adminJson) as Admin : null;
  }
  return null;
};
