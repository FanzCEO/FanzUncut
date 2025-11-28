#!/usr/bin/env node

/**
 * Create Admin User Script for BoyFanz Platform
 * Creates a test admin user for accessing the admin dashboard
 */

const { scrypt, randomBytes } = require("crypto");
const { promisify } = require("util");

// Load environment variables first
require("dotenv").config();

// Import database connection and storage after env loading
const { storage } = require("./server/storage.ts");
const { db } = require("./server/db.ts");

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUser() {
  try {
    console.log("🚀 Creating admin user for BoyFanz platform...");

    // Check if admin user already exists
    const existingUser = await storage.getUserByUsername("admin");
    if (existingUser) {
      console.log("⚠️  Admin user already exists. Updating role to admin...");
      await storage.updateUserRole(existingUser.id, "admin");
      console.log("✅ Admin role updated successfully!");
      console.log(`📧 Email: ${existingUser.email}`);
      console.log(`👤 Username: ${existingUser.username}`);
      return;
    }

    // Create new admin user
    const adminPassword = "admin123"; // Simple password for testing
    const hashedPassword = await hashPassword(adminPassword);

    const adminUserData = {
      username: "admin",
      email: "admin@boyfanz.com",
      password: hashedPassword,
      role: "admin",
      firstName: "Admin",
      lastName: "User",
      authProvider: "local",
      status: "active",
      profileImageUrl: null,
      onlineStatus: false,
      lastSeenAt: new Date(),
    };

    const user = await storage.createUser(adminUserData);
    console.log("✅ Admin user created successfully!");
    console.log("📋 Login credentials:");
    console.log(`👤 Username: ${user.username}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`🛡️  Role: ${user.role}`);
    console.log("");
    console.log("🌐 You can now login at: http://localhost:5001/admin");

  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log("🎉 Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });