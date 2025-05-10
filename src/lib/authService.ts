
// Mock authentication service
"use client"; // Required for localStorage access

import type { User, Admin } from '@/types';
import { USER_STORAGE_KEY, ADMIN_STORAGE_KEY } from '@/lib/constants';
import { getUsers, getAdmins, createUserFromRegistration, addAuditLog, updateUser as updateUserDataService, getUserById as getDataUserById } from './dataService'; 

// User Authentication
export const registerUser = async (name: string, username: string, passwordPlain: string, contact?: string, profilePhotoUrl?: string): Promise<{ user?: User, error?: string }> => {
  try {
    const createdUser = await createUserFromRegistration({
      name,
      username,
      password: passwordPlain,
      contact,
      profilePhotoUrl,
      forcePasswordChange: false, // Self-registered users set their own password
    });

    if (createdUser) {
      // Add audit log for admin notification
      const admins = await getAdmins();
      if (admins.length > 0) {
        const reportingAdmin = admins[0]; // Use first admin as a placeholder for system/auto-logged events
        await addAuditLog({
          adminId: reportingAdmin.id,
          adminName: reportingAdmin.name,
          action: `New user self-registered: ${username}`,
          timestamp: new Date().toISOString(),
          details: { userId: createdUser.id, username: createdUser.username, name: createdUser.name, contact: createdUser.contact }
        });
      }
      return { user: createdUser };
    } else {
      // This case should ideally not be reached if createUserFromRegistration throws errors for failures
      return { error: "Failed to create user account." };
    }
  } catch (e: any) {
    return { error: e.message || "Failed to register user." };
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
    updateUserInSession(updatedUser); // Update session with new user details (including potentially changed password if stored - though usually not directly)
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
    // For the specific admin with email "admin", password must be "0000"
    if (admin.email === "admin" && passwordPlain === "0000") {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
      }
      return { admin };
    } 
    // For any other admin, in this mock, we are not checking password for simplicity.
    // A real app would check a hashed password.
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
