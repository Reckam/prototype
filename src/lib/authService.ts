"use client";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { getAdmins, addAuditLog } from "./dataService";

// Register User
export const registerUser = async (
  name: string,
  email: string,
  password: string,
  contact?: string,
  profilePhotoUrl?: string
): Promise<{ user?: User; error?: string }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          contact,
          profilePhotoUrl,
          role: "user",
        },
      },
    });

    if (error) return { error: error.message };

    const admins = await getAdmins();
    if (admins.length > 0) {
      const admin = admins[0];
      await addAuditLog({
        adminId: admin.id,
        adminName: admin.name,
        action: `New user registered: ${email}`,
        timestamp: new Date().toISOString(),
        details: { email, name, contact },
      });
    }

    return { user: data.user as User };
  } catch (e: any) {
    return { error: e.message || "Registration failed." };
  }
};

// Login User
export const loginUser = async (
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user as User };
};

// Logout User
export const logoutUser = async (): Promise<void> => {
  await supabase.auth.signOut();
};

// Get Current User
export const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
};

// Request Password Reset
export const requestPasswordReset = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  const msg = `If an account with ${email} exists, a reset link was sent.`;
  return { success: !error, message: msg };
};

// Change User Password
export const changeUserPassword = async (
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Password updated successfully." };
};

// Admin Login
export const loginAdmin = async (
  email: string,
  password: string
): Promise<{ admin?: User; error?: string }> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const user = data.user;
  if (user.user_metadata.role !== "admin") {
    return { error: "Not an admin account" };
  }

  return { admin: user };
};
