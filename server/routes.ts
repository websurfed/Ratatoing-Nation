import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { storage } from "./storage";
import { upload, getFilePath } from "./multer";
import path from "path";
import fs from "fs";
import { 
  insertMediaSchema, 
  insertShopItemSchema, 
  insertEmailSchema,
  transactions,
  users,
  tasks,  // Add this
  payouts // Add this
} from "@shared/schema";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { desc, and } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { PgColumn } from "drizzle-orm/pg-core";
import { isNull, or } from "drizzle-orm";

// Helper to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

// Helper to check if user is an admin (Banson rank)
function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user.rank === 'Banson') {
    return next();
  }
  res.status(403).json({ message: "Not authorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ===== User Routes =====
  // Get pending users (admin only)
  app.get("/api/users/pending", isAdmin, async (req, res) => {
    const pendingUsers = await storage.getPendingUsers();
    res.json(pendingUsers.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }));
  });

  // Get all users (admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }));
  });

  // Approve user (admin only)
  app.post("/api/users/:id/approve", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const approvedById = req.user.id;
    
    const user = await storage.approveUser(userId, approvedById);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Ban user (admin only)
  app.post("/api/users/:id/ban", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    
    const user = await storage.banUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
  // Unban user (admin only)
  app.post("/api/users/:id/unban", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    
    const user = await storage.unbanUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
  // Delete user (admin only)
  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    
    // Check if trying to delete yourself
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    
    // Check if user is also a Banson admin (prevent deleting other admins)
    const userToDelete = await storage.getUser(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (userToDelete.rank === 'Banson') {
      return res.status(403).json({ message: "Cannot delete another administrator" });
    }
    
    const success = await storage.deleteUser(userId);
    
    if (!success) {
      return res.status(500).json({ message: "Failed to delete user" });
    }
    
    res.json({ message: "User deleted successfully" });
  });

  // Update user (admin only or self)
  app.patch("/api/users/:id", isAuthenticated, async (req, res) => {
    const userId = parseInt(req.params.id);
    
    // Only allow admins to update other users
    if (userId !== req.user.id && req.user.rank !== 'Banson') {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      // Don't allow updating certain fields
      const { password, status, ...updateData } = req.body;
      
      const user = await storage.updateUser(userId, updateData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      throw error;
    }
  });

  // Upload profile picture
  app.post("/api/users/profile-picture", isAuthenticated, upload.single('profilePicture'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Get the user to check if they already have a profile picture
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.profilePicture) {
        // Delete the old profile picture
        try {
          const oldFilePath = path.join(process.cwd(), user.profilePicture);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (error) {
          console.error("Error deleting old profile picture:", error);
        }
      }
      
      const filePath = getFilePath('profile', req.file.filename);
      
      const updatedUser = await storage.updateUser(req.user.id, {
        profilePicture: filePath
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile picture" });
      }
      
      res.json({ path: filePath });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ message: "An error occurred while uploading profile picture" });
    }
  });
  
  // Delete profile picture
  app.delete("/api/users/profile-picture", isAuthenticated, async (req, res) => {
    try {
      // Get the user to check if they have a profile picture
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.profilePicture) {
        return res.status(404).json({ message: "No profile picture found" });
      }
      
      // Delete the profile picture file
      try {
        const filePath = path.join(process.cwd(), user.profilePicture);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error("Error deleting profile picture:", error);
      }
      
      // Update the user to remove the profile picture reference
      const updatedUser = await storage.updateUser(req.user.id, {
        profilePicture: null
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile" });
      }
      
      res.json({ message: "Profile picture deleted successfully" });
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      res.status(500).json({ message: "An error occurred while deleting profile picture" });
    }
  });

  // ===== Media Routes =====
  // Upload media to gallery
  app.post("/api/gallery", isAuthenticated, upload.single('media'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    try {
      const { title, description } = req.body;
      const type = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
      const filePath = getFilePath('gallery', req.file.filename);
      
      const mediaData = insertMediaSchema.parse({
        userId: req.user.id,
        type,
        path: filePath,
        title,
        description
      });
      
      const media = await storage.createMedia(mediaData);
      res.status(201).json(media);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      throw error;
    }
  });

  // Get all media
  app.get("/api/gallery", isAuthenticated, async (req, res) => {
    const media = await storage.getAllMedia();
    res.json(media);
  });

  // Get user's media
  app.get("/api/gallery/user/:id", isAuthenticated, async (req, res) => {
    const userId = parseInt(req.params.id);
    const media = await storage.getUserMedia(userId);
    res.json(media);
  });

  // Delete media (admin or owner)
  app.delete("/api/gallery/:id", isAuthenticated, async (req, res) => {
    const mediaId = parseInt(req.params.id);
    const media = await storage.getMediaById(mediaId);
    
    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }
    
    // Check if user is admin or owner
    if (media.userId !== req.user.id && req.user.rank !== 'Banson') {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), media.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
    
    await storage.deleteMedia(mediaId);
    res.json({ message: "Media deleted successfully" });
  });

  // ===== Shop Routes =====
  // Create shop item
  app.post("/api/shop", isAuthenticated, upload.single('image'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    
    try {
      const { title, description, price } = req.body;
      const filePath = getFilePath('shop', req.file.filename);
      
      const itemData = insertShopItemSchema.parse({
        sellerId: req.user.id,
        title,
        description,
        price: parseInt(price),
        imagePath: filePath
      });
      
      const item = await storage.createShopItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      throw error;
    }
  });

  // Get all shop items
  app.get("/api/shop", isAuthenticated, async (req, res) => {
    const items = await storage.getAllShopItems();
    res.json(items);
  });

  // Get user's shop items
  app.get("/api/shop/user/:id", isAuthenticated, async (req, res) => {
    const userId = parseInt(req.params.id);
    const items = await storage.getUserShopItems(userId);
    res.json(items);
  });

  // Purchase shop item
  app.post("/api/shop/:id/purchase", isAuthenticated, async (req, res) => {
    const itemId = parseInt(req.params.id);
    const buyerId = req.user.id;
    
    const item = await storage.getShopItemById(itemId);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    if (item.status !== 'available') {
      return res.status(400).json({ message: "Item is not available for purchase" });
    }
    
    if (item.sellerId === buyerId) {
      return res.status(400).json({ message: "You cannot purchase your own item" });
    }
    
    const buyer = await storage.getUser(buyerId);
    
    if (!buyer) {
      return res.status(404).json({ message: "Buyer not found" });
    }
    
    if (buyer.pocketSniffles < item.price) {
      return res.status(400).json({ message: "Insufficient funds" });
    }
    
    const purchasedItem = await storage.purchaseShopItem(itemId, buyerId);
    
    if (!purchasedItem) {
      return res.status(400).json({ message: "Purchase failed" });
    }
    
    res.json(purchasedItem);
  });

  // Delete shop item (admin or owner)
  app.delete("/api/shop/:id", isAuthenticated, async (req, res) => {
    const itemId = parseInt(req.params.id);
    const item = await storage.getShopItemById(itemId);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Check if user is admin or owner
    if (item.sellerId !== req.user.id && req.user.rank !== 'Banson') {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    // Delete image from disk
    try {
      const filePath = path.join(process.cwd(), item.imagePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
    
    await storage.deleteShopItem(itemId);
    res.json({ message: "Item deleted successfully" });
  });

  // ===== Inventory Routes =====
  // Get user's inventory
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const inventory = await storage.getUserInventory(userId);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Error fetching inventory" });
    }
  });
  
  // Resell item from inventory
  app.post("/api/inventory/:id/resell", isAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const { price } = req.body;
      
      if (!price || isNaN(parseInt(price)) || parseInt(price) <= 0) {
        return res.status(400).json({ message: "Invalid price" });
      }
      
      // Get the item to verify ownership
      const item = await storage.getShopItemById(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (item.buyerId !== req.user.id) {
        return res.status(403).json({ message: "You don't own this item" });
      }
      
      if (item.status !== 'sold') {
        return res.status(400).json({ message: "Item is not available for resale" });
      }
      
      const resellingItem = await storage.resellShopItem(itemId, parseInt(price));
      
      if (!resellingItem) {
        return res.status(400).json({ 
          message: "Unable to resell item. Make sure the price is at least the original purchase price."
        });
      }
      
      res.json(resellingItem);
    } catch (error) {
      res.status(500).json({ message: "Error reselling item" });
    }
  });
  
  // ===== Email Routes =====
  // Send email
  app.post("/api/emails", isAuthenticated, async (req, res) => {
    try {
      const { recipientUsername, subject, body } = req.body;
      
      if (!recipientUsername || !subject || !body) {
        return res.status(400).json({ message: "Recipient username, subject, and body are required" });
      }
      
      // Find recipient by username
      const recipient = await storage.getUserByUsername(recipientUsername);
      
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      const emailData = insertEmailSchema.parse({
        senderId: req.user.id,
        recipientId: recipient.id,
        subject,
        body
      });
      
      const email = await storage.sendEmail(emailData);
      res.status(201).json(email);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      throw error;
    }
  });

  // Get user's received emails
  app.get("/api/emails/inbox", isAuthenticated, async (req, res) => {
    const emails = await storage.getUserEmails(req.user.id);
    res.json(emails);
  });

  // Get user's sent emails
  app.get("/api/emails/sent", isAuthenticated, async (req, res) => {
    const emails = await storage.getUserSentEmails(req.user.id);
    res.json(emails);
  });

  // Get email by ID
  app.get("/api/emails/:id", isAuthenticated, async (req, res) => {
    const emailId = parseInt(req.params.id);
    const email = await storage.getEmailById(emailId);
    
    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }
    
    // Only allow recipient or sender to view the email
    if (email.recipientId !== req.user.id && email.senderId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    // Mark as read if the user is the recipient
    if (email.recipientId === req.user.id && !email.read) {
      await storage.markEmailAsRead(emailId);
    }
    
    res.json(email);
  });

  // Delete email
  app.delete("/api/emails/:id", isAuthenticated, async (req, res) => {
    const emailId = parseInt(req.params.id);
    const email = await storage.getEmailById(emailId);
    
    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }
    
    // Only allow recipient or sender to delete the email
    if (email.recipientId !== req.user.id && email.senderId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    await storage.deleteEmail(emailId);
    res.json({ message: "Email deleted successfully" });
  });
  
  // Mark email as read
  app.patch("/api/emails/:id/read", isAuthenticated, async (req, res) => {
    const emailId = parseInt(req.params.id);
    const email = await storage.getEmailById(emailId);
    
    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }
    
    // Only the recipient can mark an email as read
    if (email.recipientId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    const updatedEmail = await storage.markEmailAsRead(emailId);
    res.json(updatedEmail);
  });

  // ===== Profile Routes =====
  // Update profile
  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const updateData = req.body;
      
      // Verify user exists
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Ensure email cannot be updated (only name is allowed)
      const { name } = updateData;
      const safeUpdateData = { name };
      
      // Update user profile
      const updatedUser = await storage.updateUser(req.user.id, safeUpdateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update profile" });
      }
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      throw error;
    }
  });
  
  // Change password
  app.post("/api/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Verify current password
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // comparePasswords and hashPassword are already imported at the top of the file
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(req.user.id, { password: hashedPassword });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update password" });
      }
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      throw error;
    }
  });
  
  // Change PIN
  app.post("/api/change-pin", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPin } = req.body;
      
      if (!currentPassword || !newPin) {
        return res.status(400).json({ message: "Current password and new PIN are required" });
      }
      
      // Validate PIN format
      if (!/^\d{4}$/.test(newPin)) {
        return res.status(400).json({ message: "PIN must be exactly 4 digits" });
      }
      
      // Verify current password
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // comparePasswords is already imported at the top of the file
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Update PIN
      const updatedUser = await storage.updateUser(req.user.id, { pin: newPin });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update PIN" });
      }
      
      res.json({ message: "PIN changed successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      throw error;
    }
  });

  // ===== Bank Routes =====
  // Get all transactions (admin only) or user's transactions (regular users)
  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    if (req.user.rank === 'Banson') {
      // For admin users, fetch all transactions
      const allTransactions = await db.select().from(transactions)
        .orderBy(desc(transactions.createdAt))
        .limit(20);

      // Fetch payouts separately
      const allPayouts = await db.select().from(payouts)
        .orderBy(desc(payouts.createdAt))
        .limit(20);

      // Combine both transaction types
      const combined = [
        ...allTransactions.map(t => ({ ...t, recordType: 'transaction' })),
        ...allPayouts.map(p => ({
          id: p.id,
          senderId: p.paidBy,
          amount: p.amount * -1, // Negative amount to show as outgoing
          type: 'salary_payout',
          description: p.description || `Salary payout for ${p.job}`,
          createdAt: p.createdAt,
          recordType: 'payout',
          job: p.job
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
       .slice(0, 20);

      // Fetch all usernames for the transactions
      const userIds = new Set<number>();
      combined.forEach(t => {
        if (t.senderId) userIds.add(t.senderId);
        if (t.recipientId) userIds.add(t.recipientId);
      });

      const userIdsArray = Array.from(userIds);
      const allUsers = userIdsArray.length > 0 ? 
        await Promise.all(userIdsArray.map(async (id) => {
          const [user] = await db.select({
            id: users.id,
            username: users.username, 
            name: users.name
          })
          .from(users)
          .where(eq(users.id, id));
          return user;
        })) :
        [];

      // Add user info to transactions
      const transactionsWithUsers = combined.map(t => {
        const sender = allUsers.find(u => u.id === t.senderId);
        const recipient = allUsers.find(u => u.id === t.recipientId);
        return {
          ...t,
          senderUsername: sender?.username || null,
          senderName: sender?.name || null,
          recipientUsername: recipient?.username || null,
          recipientName: recipient?.name || null
        };
      });

      return res.json(transactionsWithUsers);
    } else {
      // For regular users, only fetch their own transactions
      const userTransactions = await storage.getUserTransactions(req.user.id);

      // Also get salary payments they received
      const salaryPayments = await db.select()
        .from(transactions)
        .where(and(
          eq(transactions.recipientId, req.user.id),
          eq(transactions.type, 'salary')
        ))
        .orderBy(desc(transactions.createdAt));

      const combined = [...userTransactions, ...salaryPayments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Get unique user IDs from transactions
      const userIds = new Set<number>();
      combined.forEach(t => {
        if (t.senderId && t.senderId !== req.user.id) userIds.add(t.senderId);
        if (t.recipientId && t.recipientId !== req.user.id) userIds.add(t.recipientId);
      });

      const userIdsArray = Array.from(userIds);
      const relatedUsers = userIdsArray.length > 0 
        ? await Promise.all(userIdsArray.map(async (id) => {
            const [user] = await db.select({
              id: users.id,
              username: users.username, 
              name: users.name
            })
            .from(users)
            .where(eq(users.id, id));
            return user;
          }))
        : [];

      // Add user info to transactions
      const transactionsWithUsers = combined.map(t => {
        const sender = t.senderId === req.user.id 
          ? { username: req.user.username, name: req.user.name } 
          : relatedUsers.find(u => u.id === t.senderId);

        const recipient = t.recipientId === req.user.id 
          ? { username: req.user.username, name: req.user.name } 
          : relatedUsers.find(u => u.id === t.recipientId);

        return {
          ...t,
          senderUsername: sender?.username || null,
          senderName: sender?.name || null,
          recipientUsername: recipient?.username || null,
          recipientName: recipient?.name || null
        };
      });

      res.json(transactionsWithUsers);
    }
  });

  // Transfer pocketSniffles
  app.post("/api/transfer", isAuthenticated, async (req, res) => {
    const { recipientUsername, amount, description } = req.body;
    
    if (!recipientUsername || !amount) {
      return res.status(400).json({ message: "Recipient username and amount are required" });
    }
    
    const amountNum = parseInt(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }
    
    // Find recipient by username
    const recipient = await storage.getUserByUsername(recipientUsername);
    
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }
    
    if (recipient.id === req.user.id) {
      return res.status(400).json({ message: "You cannot transfer to yourself" });
    }
    
    const success = await storage.transferPocketSniffles(
      req.user.id, 
      recipient.id, 
      amountNum, 
      description
    );
    
    if (!success) {
      return res.status(400).json({ message: "Transfer failed, insufficient funds" });
    }
    
    res.json({ message: "Transfer successful" });
  });

  // Admin: add pocketSniffles to user
  app.post("/api/admin/addPocketSniffles", isAdmin, async (req, res) => {
    const { username, amount, description } = req.body;
    
    if (!username || !amount) {
      return res.status(400).json({ message: "Username and amount are required" });
    }
    
    const amountNum = parseInt(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }
    
    // Find user by username
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const success = await storage.addPocketSniffles(
      user.id, 
      amountNum, 
      description || `Admin deposit by ${req.user.username}`
    );
    
    if (!success) {
      return res.status(400).json({ message: "Operation failed" });
    }
    
    res.json({ message: "Pocket Sniffles added successfully" });
  });

  // ===== Job Routes =====
  // Apply for a job
  app.post("/api/jobs/apply", isAuthenticated, async (req, res) => {
    try {
      const { job, description } = req.body;

      // Check if user already has a job
      const user = await storage.getUser(req.user.id);
      if (user?.job) {
        return res.status(400).json({ message: "You already have a job" });
      }

      const application = await storage.createJobApplication({
        userId: req.user.id,
        job,
        description
      });

      res.status(201).json(application);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Employee quits their job
  app.post("/api/jobs/quit", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);

      if (!user?.job) {
        return res.status(400).json({ message: "You don't have a job to quit" });
      }

      // Update user to remove job
      const updatedUser = await storage.updateUser(req.user.id, { job: null });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to quit job" });
      }

      // Return the updated user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ 
        success: true,
        message: "Successfully quit your job",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error quitting job:", error);
      res.status(500).json({ 
        success: false,
        message: "Error quitting job" 
      });
    }
  });
  
  // Get user's job applications
  app.get("/api/jobs/my-applications", isAuthenticated, async (req, res) => {
    const applications = await storage.getUserApplications(req.user.id);
    res.json(applications);
  });

  // Get current job status
  app.get("/api/jobs/status", isAuthenticated, async (req, res) => {
    const user = await storage.getUser(req.user.id);
    res.json({ 
      job: user?.job || null,
      isEmployed: user?.job !== null
    });
  });

  // Admin: Get pending applications
  app.get("/api/jobs/pending", isAdmin, async (req, res) => {
    const applications = await storage.getPendingApplications();
    res.json(applications);
  });

  // Admin: Approve application
  app.post("/api/jobs/:id/approve", isAdmin, async (req, res) => {
    const appId = parseInt(req.params.id);
    const application = await storage.approveJobApplication(appId, req.user.id);

    if (!application) {
      return res.status(404).json({ message: "Application not found or already processed" });
    }

    res.json(application);
  });

  // Admin: Reject application
  app.post("/api/jobs/:id/reject", isAdmin, async (req, res) => {
    const appId = parseInt(req.params.id);
    const application = await storage.rejectJobApplication(appId, req.user.id);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(application);
  });

  // Assign task to employees (admin only)
  app.post("/api/tasks/:id/assign", isAdmin, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ message: "User IDs array is required" });
      }

      // Verify the task exists and is a template
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.id, taskId),
          eq(tasks.status, 'template')
        ))

      if (!task) {
        return res.status(404).json({ message: "Task template not found" });
      }

      // Assign to users
      const success = await storage.assignTaskToUsers(taskId, userIds);

      if (!success) {
        return res.status(400).json({ message: "Failed to assign task" });
      }

      res.json({ message: "Task assigned successfully" });
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ message: "Failed to assign task" });
    }
  });

  // Task routes
  app.post("/api/tasks", isAdmin, async (req, res) => {
    try {
      const { title, description, assignedJob, dueDate } = req.body;

      if (!title || !description || !assignedJob) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // First create a template task (not assigned to anyone yet)
      const [task] = await db.insert(tasks).values({
        title,
        description,
        assignedJob,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: req.user.id,
        status: 'template' // New status for unassigned tasks
      }).returning();

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // In the GET /api/tasks route, modify it to:
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      // Get both assigned tasks and job-wide tasks
      const tasks = await storage.getUserTasks(req.user.id);

      // Get the user's job to include any job-wide tasks
      const [user] = await db.select({ job: users.job })
        .from(users)
        .where(eq(users.id, req.user.id));

      if (user?.job) {
        const jobTasks = await db.select()
          .from(tasks)
          .where(and(
            eq(tasks.assignedJob, user.job),
            isNull(tasks.assignedTo), // Job-wide tasks
            or(
              eq(tasks.status, 'pending'),
              eq(tasks.status, 'completed')
            )
          ));

        // Combine and deduplicate
        const allTasks = [...tasks, ...jobTasks]
          .filter((task, index, self) => 
            index === self.findIndex(t => t.id === task.id)
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return res.json(allTasks);
      }

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Add this new route for getting job-wide tasks
  app.get("/api/tasks/job-wide", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.job) {
        return res.json([]);
      }

      const tasks = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.assignedJob, user.job),
          isNull(tasks.assignedTo), // Only job-wide tasks
          or(
            eq(tasks.status, 'pending'),
            eq(tasks.status, 'completed')
          )
        ))
        .orderBy(desc(tasks.createdAt));

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching job-wide tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Payout routes
  app.get("/api/payouts", isAdmin, async (req, res) => {
    try {
      const results = await db.select()
        .from(payouts)
        .orderBy(desc(payouts.createdAt));
      res.json(results);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ message: "Failed to fetch payout history" });
    }
  });
  
  app.post("/api/payouts", isAdmin, async (req, res) => {
    try {
      const { job, amount, description, taskId } = req.body;

      // Validate input
      if (!job || !amount || isNaN(amount)) {
        return res.status(400).json({ message: "Invalid payout data" });
      }

      // Get admin balance
      const [admin] = await db.select()
        .from(users)
        .where(eq(users.id, req.user.id));

      // Get employees for this job
      const employees = await db.select()
        .from(users)
        .where(and(
          eq(users.job, job),
          eq(users.status, 'active')
        ));

      if (employees.length === 0) {
        return res.status(400).json({ message: "No active employees found for this job" });
      }

      const totalPayout = amount * employees.length;
      if (admin.pocketSniffles < totalPayout) {
        return res.status(400).json({ 
          message: `Insufficient funds. Needed: ${totalPayout}, Available: ${admin.pocketSniffles}`
        });
      }

      // Create payout record
      const [payout] = await db.insert(payouts).values({
        job,
        amount,
        description,
        paidBy: req.user.id,
        taskId
      }).returning();

      // Process payments
      await db.transaction(async (tx) => {
        // Deduct from admin
        await tx.update(users)
          .set({ pocketSniffles: admin.pocketSniffles - totalPayout })
          .where(eq(users.id, req.user.id));

        // Add to each employee
        for (const employee of employees) {
          await tx.update(users)
            .set({ pocketSniffles: employee.pocketSniffles + amount })
            .where(eq(users.id, employee.id));

          // Record transaction - Modified to include more details
          await tx.insert(transactions).values({
            senderId: req.user.id,
            recipientId: employee.id,
            amount,
            type: 'salary',
            description: description || `Salary for ${job}`,
            createdAt: new Date(),
            payoutId: payout.id, 
            status: 'completed'
          });
        }
      });

      res.status(201).json(payout);
    } catch (error) {
      console.error("Error processing payout:", error);
      res.status(500).json({ message: "Failed to process payout" });
    }
  });

  // Delete a task (user can delete their own, admin can delete any)
  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);

      // Get the task first to verify permissions
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check permissions:
      // - Admin can delete any task
      // - Regular users can only delete their own tasks
      // - Task creator can delete template tasks
      const canDelete = req.user.rank === 'Banson' || 
                       task.assignedTo === req.user.id || 
                       (task.status === 'template' && task.createdBy === req.user.id);

      if (!canDelete) {
        return res.status(403).json({ message: "Not authorized to delete this task" });
      }

      const success = await storage.deleteTask(taskId);

      if (!success) {
        return res.status(404).json({ message: "Task not found or already deleted" });
      }

      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Admin endpoint to delete a template task and all its assignments
  app.delete("/api/tasks/template/:id", isAdmin, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);

      // Verify it's a template task
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.id, taskId),
          eq(tasks.status, 'template')
        ));

      if (!task) {
        return res.status(404).json({ message: "Template task not found" });
      }

      const success = await storage.deleteTaskAndAssignments(taskId);

      if (!success) {
        return res.status(404).json({ message: "Failed to delete template and assignments" });
      }

      res.json({ 
        message: "Template task and all assignments deleted successfully",
        deletedTemplateId: taskId
      });
    } catch (error) {
      console.error("Error deleting template task:", error);
      res.status(500).json({ message: "Failed to delete template task" });
    }
  });

  // Complete a task
  app.patch("/api/tasks/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.completeUserTask(taskId, req.user.id);

      if (!task) {
        return res.status(404).json({ message: "Task not found or already completed" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });


  // Get single task
  app.get("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Authorization check
      if (task.assignedJob !== req.user.job && req.user.rank !== 'Banson') {
        return res.status(403).json({ message: "Not authorized" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}

import express from "express";
