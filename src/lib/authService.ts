
// Mock authentication service
"use client"; // Required for localStorage access

import type { User, Admin } from '@/types';
import { USER_STORAGE_KEY, ADMIN_STORAGE_KEY } from '@/lib/constants';
import { getUsers, getAdmins, addUser as addDataUserForAdmin, updateUser as updateUserDataService, getUserById as getDataUserById } from './dataService'; 

// User Authentication
export const registerUser = async (name: string, username: string, passwordPlain: string, profilePhotoUrl?: string): Promise<{ user?: User, error?: string }> => {
  const existingUser = (await getUsers()).find(u => u.username === username);
  if (existingUser) {
    return { error: "User already exists with this username." };
  }

  // Create the full user object for self-registration
  const newUser: User = { 
    id: `user_self_${Date.now()}`, 
    name, 
    username, 
    createdAt: new Date().toISOString(),
    profilePhotoUrl,
    password: passwordPlain, // User sets their own password
    forcePasswordChange: false, // No forced change for self-registered users
  };

  // In a real app, dataService.addUser would handle this insertion.
  // For this mock, we directly manipulate the "database" or use updateUser if addUser is too specific.
  // Let's assume updateUser can create if ID doesn't exist, or add a specific "create user" function in dataService.
  // For now, we'll use updateUser which can also set all fields.
  // To ensure it's "added" if not existing, we can check or rely on dataService logic.
  // A cleaner approach would be a dedicated createUser in dataService.
  // Let's simulate by pushing to the array for this mock.
  // This is a simplified mock, direct push into the "data.users" array isn't ideal.
  // A better approach:
  try {
    // data.users.push(newUser); // This would be direct manipulation if dataService was not async
    // We'll use updateUser, assuming it can create if not found or we adapt dataService.addUser.
    // For this example, we will assume we can just create the user and "update" it with all details.
    // This part is tricky due to the mock nature. A real API call would be cleaner.

    // A more direct way to handle this with the current dataService.ts:
    const users = await getUsers(); // Get current users
    const dataUsers = (data as any).users as User[]; // Access internal data for mock
    dataUsers.push(newUser); // Simulate adding to the 'database'

    // And then ensure it's retrievable by dataService
    const savedUser = await getDataUserById(newUser.id);
    if (!savedUser) throw new Error("Mock user creation failed during registration process.");

    return { user: savedUser };

  } catch (e: any) {
    return { error: "Failed to register user: " + e.message };
  }
};

export const loginUser = async (loginUsername: string, passwordPlain: string): Promise<{ user?: User, error?: string }> => {
  const users = await getUsers();
  const user = users.find(u => u.username === loginUsername);
  
  if (user) {
    // Check password
    if (user.password !== passwordPlain) {
      return { error: "Invalid username or password." };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
    // The `forcePasswordChange` flag is returned with the user object
    // and will be checked by the calling page to determine redirection.
    return { user };
  }
  return { error: "Invalid username or password." };
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
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  }
};


export const requestPasswordReset = async (username: string): Promise<{ success: boolean, message: string }> => {
  await new Promise(resolve => setTimeout(resolve, 500)); 
  const users = await getUsers();
  const userExists = users.some(u => u.username === username);
  
  const message = `If an account with the username "${username}" exists, a password reset link has been sent (simulated).`;
  
  if (userExists) {
    console.log(`Simulating password reset email for ${username}`);
    return { success: true, message };
  } else {
    console.log(`Password reset attempted for non-existent username: ${username}`);
    return { success: true, message }; 
  }
};

export const changeUserPassword = async (userId: string, currentPasswordPlain: string, newPasswordPlain: string): Promise<{ success: boolean, message: string }> => {
  await new Promise(resolve => setTimeout(resolve, 500)); 
  const user = await getDataUserById(userId);

  if (!user) {
    return { success: false, message: "User not found." };
  }

  if (user.password !== currentPasswordPlain) {
    return { success: false, message: "Current password incorrect." };
  }

  const updatedUser = await updateUserDataService(userId, { password: newPasswordPlain });
  if (updatedUser) {
    updateUserInSession(updatedUser);
    return { success: true, message: "Password updated successfully." };
  } else {
    return { success: false, message: "Failed to update password in data service." };
  }
};

export const completeInitialSetup = async (userId: string, newUsername: string, newPasswordPlain: string): Promise<{user?: User, error?: string}> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const user = await getDataUserById(userId);
  if (!user) {
    return { error: "User not found." };
  }

  const updates: Partial<User> = {
    username: newUsername,
    password: newPasswordPlain,
    forcePasswordChange: false,
  };

  try {
    const updatedUser = await updateUserDataService(userId, updates);
    if (updatedUser) {
      updateUserInSession(updatedUser);
      return { user: updatedUser };
    } else {
      return { error: "Failed to update user credentials." };
    }
  } catch (e: any) {
    return { error: e.message || "An error occurred during setup." };
  }
};


// Admin Authentication
export const loginAdmin = async (username: string, passwordPlain: string): Promise<{ admin?: Admin, error?: string }> => {
  const admins = await getAdmins();
  const admin = admins.find(a => a.email === username); 
  
  if (admin) {
    if (admin.email === "admin" && passwordPlain === "0000") {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
      }
      return { admin };
    } 
    else if (admin.email !== "admin") {
        // Mock: allow other admins if they exist, without password check for now
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
