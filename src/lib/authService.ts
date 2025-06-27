
"use client";
import type { User, Admin } from "@/types";
import { USER_STORAGE_KEY, ADMIN_STORAGE_KEY } from "./constants";
import { 
    createUserFromRegistration, 
    updateUser as updateUserDataService, 
    checkUsernameAvailability as checkUsernameAvailabilityDataService, 
    getUserById, 
    getUserByUsername 
} from "./dataService";

export const registerUser = async (
  name: string,
  username: string,
  password: string,
  contact?: string,
  profilePhotoDataUrl?: string
): Promise<{ user?: User; error?: string }> => {
  try {
    const newUser = await createUserFromRegistration({
      name,
      username,
      password,
      contact,
      profilePhotoUrl: profilePhotoDataUrl,
      forcePasswordChange: false,
    });
    const { password: _, ...userToReturn } = newUser;
    return { user: userToReturn as User };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const loginUser = async (
  username: string,
  password: string
): Promise<{ user?: User; error?:string }> => {
  try {
    const user = await getUserByUsername(username);

    if (!user || user.password !== password) {
      return { error: "Invalid username or password." };
    }

    const { password: _, ...userToStore } = user;

    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
    }
    return { user: userToStore as User };
  } catch (error: any) {
      console.error("Login error:", error);
      return { error: "An error occurred during login." };
  }
};

export const logoutUser = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as User;
      } catch (e) {
        console.error("Error parsing stored user:", e);
        localStorage.removeItem(USER_STORAGE_KEY);
        return null;
      }
    }
  }
  return null;
};

export const updateUserInSession = (updatedUser: User): void => {
  if (typeof window !== 'undefined') {
    const userToStore = { ...updatedUser };
    if ('password' in userToStore) {
        delete (userToStore as any).password;
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
  }
};

export const requestPasswordReset = async (
  username: string
): Promise<{ success: boolean; message: string }> => {
  console.log(`Password reset requested for username: ${username}. This is a mock function.`);
  const msg = `If an account with username ${username} exists, a (mock) reset link would be sent.`;
  return { success: true, message: msg };
};

export const changeUserPassword = async (
  userId: string,
  currentPasswordAttempt: string,
  newPassword: string
): Promise<{ success: boolean; message:string }> => {
  const user = await getUserById(userId);
  
  if (!user) {
      return { success: false, message: "User not found." };
  }
  
  if (user.password !== currentPasswordAttempt) {
      return { success: false, message: "Current password incorrect." };
  }
  
  await updateUserDataService(userId, { password: newPassword });

  return { success: true, message: "Password updated successfully." };
};

// Admin auth is still local/mock and doesn't hit the DB, so it's unchanged.
export const loginAdmin = async (
  adminUsername: string,
  password: string
): Promise<{ admin?: Admin; error?: string }> => {
  if (adminUsername === "admin" && password === "0000") {
      const adminToStore = { id: 'mock-admin-1', name: 'Super Admin', username: 'admin' };
      if (typeof window !== 'undefined') {
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminToStore));
      }
      return { admin: adminToStore };
  } else {
      return { error: "Invalid admin credentials." };
  }
};

export const logoutAdmin = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
};

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

export const completeInitialSetup = async (
  userId: string,
  newUsername: string,
  newPassword: string
): Promise<{ user?: User; error?: string }> => {
  const user = await getUserById(userId);
  if (!user) {
      return { error: "User not found." };
  }

  const updates: Partial<User> = {
      password: newPassword,
      forcePasswordChange: false,
  };

  if (newUsername !== user.username) {
      const isAvailable = await checkUsernameAvailabilityDataService(newUsername);
      if (!isAvailable) {
          return { error: "Username is already taken." };
      }
      updates.username = newUsername;
  }
  
  const updatedUser = await updateUserDataService(userId, updates);

  if (updatedUser) {
      const { password: _, ...userToReturn } = updatedUser;
      updateUserInSession(userToReturn as User);
      return { user: userToReturn as User };
  } else {
      return { error: "Failed to update user." };
  }
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    return checkUsernameAvailabilityDataService(username);
};
