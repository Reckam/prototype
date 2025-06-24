
"use client";
import { supabase } from "@/supabaseClient"; // Corrected import path
import type { User as SupabaseUserType } from "@supabase/supabase-js"; // Renamed to avoid conflict with local User type
import { getAdmins, addAuditLog, createUserFromRegistration as createDataUser, getUserById as getDataUserById, updateUser as updateDataUser } from "./dataService";
import type { User, Admin } from "@/types"; // Local User type
import { USER_STORAGE_KEY, ADMIN_STORAGE_KEY } from "./constants";


// Register User (Custom Logic)
export const registerUser = async (
  name: string,
  username: string, // App-facing, but will be stored in 'email' column
  password: string,
  contact?: string,
  profilePhotoDataUrl?: string // Changed from profilePhotoUrl to accept data URL
): Promise<{ user?: User; error?: string }> => {
  try {
    // Check if email (acting as username) already exists
    const existingUser = await supabase.from('users').select('email').eq('email', username).maybeSingle();
    if (existingUser.data) {
      return { error: "An account with this email/username already exists." };
    }

    // In a real app, password would be hashed here before storing
    const newUser: Omit<User, 'id' | 'createdAt'> = {
      name,
      username, // Pass username to data service, which will map it to email column
      password: password, // Storing plain text password (MOCK ONLY)
      contact,
      profilePhotoUrl: profilePhotoDataUrl, // Store data URL directly for now
      forcePasswordChange: false, // Or true if you want them to change it after this "registration"
    };

    const createdUser = await createDataUser(newUser);

    // Audit Log
    const admins = await getAdmins();
    if (admins.length > 0) {
      const admin = admins[0]; // Assuming first admin for logging
      await addAuditLog({
        adminId: admin.id,
        adminName: admin.name,
        action: `New user registered: ${username}`,
        timestamp: new Date().toISOString(),
        details: { username, name, contact },
      });
    }

    return { user: createdUser };
  } catch (e: any) {
    console.error("Registration error:", e);
    return { error: e.message || "Registration failed." };
  }
};

// Login User (Custom Logic)
export const loginUser = async (
  username: string, // User enters their email in the username field
  password: string
): Promise<{ user?: User; error?: string }> => {
  try {
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', username); // Query against the 'email' column

    if (fetchError) {
      console.error("Login fetch error:", fetchError);
      return { error: "Error fetching user data." };
    }
    if (!users || users.length === 0) {
      return { error: "Invalid username or password." };
    }

    const user = users[0];

    // MOCK: Plain text password comparison
    if (user.password !== password) {
      return { error: "Invalid username or password." };
    }

    const userToStore: User = {
        id: user.id,
        name: user.name,
        username: user.email, // Map 'email' from DB to 'username' for the app
        contact: user.contact,
        profilePhotoUrl: user.profile_photo_url,
        createdAt: user.created_at,
        forcePasswordChange: user.force_password_change,
        // Do NOT store password in localStorage
    };


    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
    }
    return { user: userToStore };
  } catch (e: any) {
    console.error("Login error:", e);
    return { error: e.message || "Login failed." };
  }
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
    // Ensure password is not stored in session
    if ('password' in userToStore) {
        delete (userToStore as any).password;
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
  }
};


// Request Password Reset (Custom Logic - Mock)
export const requestPasswordReset = async (
  username: string // User enters their email here
): Promise<{ success: boolean; message: string }> => {
  // This is a MOCK. In a real app with Supabase Auth, you'd use supabase.auth.resetPasswordForEmail().
  // With custom auth, you'd implement your own token generation and email sending.
  console.log(`Password reset requested for username/email: ${username}. (Mock function)`);
  const msg = `If an account with email ${username} exists, a (mock) reset link would be sent.`;
  // Simulate checking if user exists by querying the email column
  const { data: users, error } = await supabase.from('users').select('id').eq('email', username);
  if (error) {
    console.error("Error checking user for password reset:", error);
    // Don't reveal if user exists for security, generic message is better
  }
  return { success: true, message: msg }; // Always return generic success for security
};

// Change User Password (Custom Logic)
export const changeUserPassword = async (
  userId: string,
  currentPasswordAttempt: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const user = await getDataUserById(userId);
    if (!user || !user.password) { // Check if user and password exist
      return { success: false, message: "User not found or password not set." };
    }

    // MOCK: Plain text password comparison
    if (user.password !== currentPasswordAttempt) {
      return { success: false, message: "Current password incorrect." };
    }

    // In a real app, hash newPassword before storing
    const updatedUser = await updateDataUser(userId, { password: newPassword });
    if (updatedUser) {
        // Update user in session if password change affects session (e.g. forcePasswordChange flag)
        const sessionUser = getCurrentUser();
        if (sessionUser && sessionUser.id === userId) {
            updateUserInSession({...sessionUser, password: newPassword }); // Update mock password in session if needed, usually not
        }
      return { success: true, message: "Password updated successfully." };
    } else {
      return { success: false, message: "Failed to update password in database." };
    }
  } catch (e: any) {
    console.error("Change password error:", e);
    return { success: false, message: e.message || "Failed to change password." };
  }
};

// Admin Login (Custom Logic)
export const loginAdmin = async (
  adminUsername: string, // This is an email for admins
  password: string
): Promise<{ admin?: Admin; error?: string }> => {
  try {
    // For this mock, we assume 'admin' is the username and '0000' is the password for the first admin
    // This would typically query an 'admins' table or check a role on a 'users' table
    const admins = await getAdmins(); // Assuming getAdmins can fetch admin records
    const admin = admins.find(a => a.email === adminUsername); // Using email as username for admin

    if (admin && adminUsername === "admin" && password === "0000") { // Hardcoded for mock
      const adminToStore = { id: admin.id, name: admin.name, email: admin.email };
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminToStore));
      }
      return { admin: adminToStore };
    } else {
      return { error: "Invalid admin credentials." };
    }
  } catch (e: any) {
    console.error("Admin login error:", e);
    return { error: e.message || "Admin login failed." };
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
        localStorage.removeItem(ADMIN_STORAGE_KEY); // Clear corrupted data
        return null;
      }
    }
  }
  return null;
};

// Complete Initial Setup (Username and Password Change)
export const completeInitialSetup = async (
  userId: string,
  newUsername: string, // This is an email
  newPassword: string
): Promise<{ user?: User; error?: string }> => {
  try {
    const currentUser = await getDataUserById(userId);
    if (!currentUser) {
      return { error: "User not found." };
    }

    const updates: Partial<User> = {
      password: newPassword, // In real app, hash this
      forcePasswordChange: false,
    };

    if (newUsername !== currentUser.username) {
        // Check if new username (email) is taken
        const { data: existingUserWithNewUsername, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', newUsername) // Query 'email' column
            .neq('id', userId) // Important: Exclude current user from check
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116: no rows found
             console.error("Error checking username availability:", checkError);
             return { error: "Failed to check username availability." };
        }
        if (existingUserWithNewUsername) {
            return { error: "Username is already taken. Please choose another." };
        }
        updates.username = newUsername;
    }


    const updatedUser = await updateDataUser(userId, updates);

    if (updatedUser) {
      // Update the user details in localStorage/session
      updateUserInSession(updatedUser);
      return { user: updatedUser };
    } else {
      return { error: "Failed to update credentials." };
    }
  } catch (e: any) {
    console.error("Complete initial setup error:", e);
    return { error: e.message || "Failed to complete setup." };
  }
};

    