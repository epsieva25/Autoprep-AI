"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function signIn(prevState, formData) {
  return { success: true }
}

export async function signUp(prevState, formData) {
  return { success: "Account created successfully (Mock mode)" }
}

export async function signOut() {
  // Clear any auth cookies if we were using them
  // for now just redirect to login
  redirect("/auth/login")
}
