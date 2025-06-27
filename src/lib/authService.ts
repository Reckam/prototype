
"use client";
import type { User, Admin } from "@/types"; // Local User type
import { USER_STORAGE_KEY, ADMIN_STORAGE_KEY } from "./constants";

// --- MOCK IN-MEMORY DATABASE ---
// This will reset every time the server restarts or the file is reloaded.
const mockUsers: User[] = [
  {
    id: 'mock-user-1',
    name: 'Default User',
    username: 'user@example.com',
    password: 'password', // Storing plain text password (MOCK ONLY)
    contact: '123-456-7890',
    profilePhotoUrl: undefined,
    createdAt: new Date().toISOString(),
    forcePasswordChange: false,
  }
];

const mockAdmins: Admin[] = [
  { id: 'mock-admin-1', name: 'Super Admin', email: 'admin' }
];

// --- Mocked Auth Functions ---

// Register User (Mock Logic)
export const registerUser = async (
  name: string,
  username: string,
  password: string,
  contact?: string,
  profilePhotoDataUrl?: string
): Promise<{ user?: User; error?: string }> => {
  console.log("MOCK AUTH: registerUser called");
  if (mockUsers.find(u => u.username === username)) {
    return { error: "An account with this username already exists." };
  }
  
  const newUser: User = {
    id: `mock-user-${Date.now()}`,
    name,
    username,
    password, // Storing plain text password (MOCK ONLY)
    contact,
    profilePhotoUrl: profilePhotoDataUrl,
    createdAt: new Date().toISOString(),
    forcePasswordChange: false,
  };
  
  mockUsers.push(newUser);
  console.log("MOCK AUTH: New user added to mock database:", newUser);
  console.log("MOCK AUTH: Current mock users:", mockUsers);
  
  // Returning the user object but without password
  const { password: _, ...userToReturn } = newUser;
  return { user: userToReturn as User };
};

// Login User (Mock Logic)
export const loginUser = async (
  username: string,
  password: string
): Promise<{ user?: User; error?:string }> => {
  console.log("MOCK AUTH: loginUser called for username:", username);
  const user = mockUsers.find(u => u.username === username);

  if (!user || user.password !== password) {
    return { error: "Invalid username or password." };
  }

  const { password: _, ...userToStore } = user;

  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
  }
  return { user: userToStore as User };
};

// Logout User
export const logoutUser = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

// Get Current User (from localStorage)
export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as User;
      } catch (e) {
        console.error("Error parsing stored user:", e);
        localStorage.removeItem(USER_STORAGE_KEY); // Clear corrupted data
        return null;
      }
    }
  }
  return null;
};

// Update user in session (localStorage)
export const updateUserInSession = (updatedUser: User): void => {
  if (typeof window !== 'undefined') {
    const userToStore = { ...updatedUser };
    if ('password' in userToStore) {
        delete (userToStore as any).password;
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
  }
};

// Request Password Reset (Mock Logic)
export const requestPasswordReset = async (
  username: string
): Promise<{ success: boolean; message: string }> => {
  console.log(`MOCK AUTH: Password reset requested for username: ${username}.`);
  const msg = `If a mock account with username ${username} exists, a (mock) reset link would be sent.`;
  return { success: true, message: msg };
};

// Change User Password (Mock Logic)
export const changeUserPassword = async (
  userId: string,
  currentPasswordAttempt: string,
  newPassword: string
): Promise<{ success: boolean; message:string }> => {
  console.log(`MOCK AUTH: changeUserPassword called for userId: ${userId}`);
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return { success: false, message: "User not found." };
  }
  
  const user = mockUsers[userIndex];
  if (user.password !== currentPasswordAttempt) {
    return { success: false, message: "Current password incorrect." };
  }
  
  mockUsers[userIndex].password = newPassword;
  console.log(`MOCK AUTH: Password for ${user.username} updated.`);
  
  return { success: true, message: "Password updated successfully." };
};

// Admin Login (Mock Logic)
export const loginAdmin = async (
  adminUsername: string,
  password: string
): Promise<{ admin?: Admin; error?: string }> => {
  console.log(`MOCK AUTH: loginAdmin called for username: ${adminUsername}`);
  const admin = mockAdmins.find(a => a.email === adminUsername);
  
  // Using a simple check for the mock admin
  if (admin && password === "0000") {
    const adminToStore = { id: admin.id, name: admin.name, email: admin.email };
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminToStore));
    }
    return { admin: adminToStore };
  } else {
    return { error: "Invalid admin credentials." };
  }
};

// Logout Admin
export const logoutAdmin = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
};

// Get Current Admin (from localStorage)
export const getCurrentAdmin = (): Admin | null => {
  if (typeof window !== 'undefined') {
    const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (storedAdmin) {
      try {
        return JSON.parse(storedAdmin) as Admin;
      } catch (e) {
        console.error("Error parsing stored admin:", e);
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        return null;
      }
    }
  }
  return null;
};

// Complete Initial Setup (Mock Logic)
export const completeInitialSetup = async (
  userId: string,
  newUsername: string,
  newPassword: string
): Promise<{ user?: User; error?: string }> => {
  console.log(`MOCK AUTH: completeInitialSetup for userId: ${userId}`);
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return { error: "User not found." };
  }
  
  if (newUsername !== mockUsers[userIndex].username) {
    if (mockUsers.some(u => u.username === newUsername)) {
      return { error: "Username is already taken." };
    }
    mockUsers[userIndex].username = newUsername;
  }
  
  mockUsers[userIndex].password = newPassword;
  mockUsers[userIndex].forcePasswordChange = false;

  const { password: _, ...updatedUser } = mockUsers[userIndex];
  updateUserInSession(updatedUser as User);

  return { user: updatedUser as User };
};

// Check Username Availability (Mock Logic)
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  console.log(`MOCK AUTH: Checking availability for username: ${username}`);
  const isAvailable = !mockUsers.some(u => u.username === username);
  console.log(`MOCK AUTH: Username "${username}" is available: ${isAvailable}`);
  return isAvailable;
};
