
// Mock authentication service
"use client"; // Required for localStorage access

import type { User, Admin } from '@/types';
import { USER_STORAGE_KEY, ADMIN_STORAGE_KEY } from '@/lib/constants';
import { getUsers, getAdmins, addUser as addDataUser } from './dataService'; // Assuming dataService is compatible with server/client as needed

// User Authentication
export const registerUser = async (name: string, email: string, passwordPlain: string, profilePhotoUrl?: string): Promise<{ user?: User, error?: string }> => {
  // In a real app, hash the password before storing
  const existingUser = (await getUsers()).find(u => u.email === email);
  if (existingUser) {
    return { error: "User already exists with this email." };
  }
  const newUser: User = { 
    id: Date.now().toString(), 
    name, 
    email, 
    createdAt: new Date().toISOString(),
    profilePhotoUrl // Add profile photo URL
  };
  await addDataUser(newUser); // Add to mock DB
  return { user: newUser };
};

export const loginUser = async (username: string, passwordPlain: string): Promise<{ user?: User, error?: string }> => {
  // In a real app, verify hashed password
  // For this mock, 'username' input from login form is checked against the user's 'email' field.
  const users = await getUsers();
  const user = users.find(u => u.email === username); // Password check is omitted for mock
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

