import { 
  users, User, InsertUser, UserRank, UpdateUser,
  media, Media, InsertMedia,
  shopItems, ShopItem, InsertShopItem,
  emails, Email, InsertEmail,
  transactions, Transaction, InsertTransaction,
  USER_RANKS
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Interface defining all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: UpdateUser): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getPendingUsers(): Promise<User[]>;
  getUsersByRank(rank: UserRank): Promise<User[]>;
  approveUser(userId: number, approvedById: number): Promise<User | undefined>;
  banUser(userId: number): Promise<User | undefined>;
  
  // Media operations
  createMedia(media: InsertMedia): Promise<Media>;
  getMediaById(id: number): Promise<Media | undefined>;
  getAllMedia(): Promise<Media[]>;
  getUserMedia(userId: number): Promise<Media[]>;
  deleteMedia(id: number): Promise<boolean>;
  
  // Shop operations
  createShopItem(item: InsertShopItem): Promise<ShopItem>;
  getShopItemById(id: number): Promise<ShopItem | undefined>;
  getAllShopItems(): Promise<ShopItem[]>;
  getUserShopItems(userId: number): Promise<ShopItem[]>;
  purchaseShopItem(itemId: number, buyerId: number): Promise<ShopItem | undefined>;
  deleteShopItem(id: number): Promise<boolean>;
  
  // Email operations
  sendEmail(email: InsertEmail): Promise<Email>;
  getEmailById(id: number): Promise<Email | undefined>;
  getUserEmails(userId: number): Promise<Email[]>;
  getUserSentEmails(userId: number): Promise<Email[]>;
  markEmailAsRead(id: number): Promise<Email | undefined>;
  deleteEmail(id: number): Promise<boolean>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  
  // Banking operations
  transferPocketSniffles(senderId: number, recipientId: number, amount: number, description?: string): Promise<boolean>;
  addPocketSniffles(userId: number, amount: number, description?: string): Promise<boolean>;
  removePocketSniffles(userId: number, amount: number, description?: string): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
}

// Database implementation of the storage interface
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    
    // Set up initial admin users (banson and banson2)
    this.seedAdminUsers();
  }

  // Seed admin users
  private async seedAdminUsers() {
    // Import hashPassword from auth
    const { hashPassword } = await import('./auth');
    
    // Only add if they don't exist
    if (!(await this.getUserByUsername("banson"))) {
      const hashedPassword = await hashPassword("password123");
      
      await this.createUser({
        username: "banson",
        password: hashedPassword,
        name: "Banson Admin",
        email: "banson@ratatoing",
        pin: "1234",
        rank: "Banson",
        status: "active",
        pocketSniffles: 10000
      });
    }
    
    if (!(await this.getUserByUsername("banson2"))) {
      const hashedPassword = await hashPassword("password123");
      
      await this.createUser({
        username: "banson2",
        password: hashedPassword,
        name: "Banson Admin 2",
        email: "banson2@ratatoing",
        pin: "1234",
        rank: "Banson",
        status: "active",
        pocketSniffles: 10000
      });
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const email = insertUser.email || `${insertUser.username}@ratatoing`;
    const userData = { ...insertUser, email };
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
      
    return user;
  }

  async updateUser(id: number, updateData: UpdateUser): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
      
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getPendingUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.status, 'pending'));
  }

  async getUsersByRank(rank: UserRank): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.rank, rank));
  }

  async approveUser(userId: number, approvedById: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        status: 'active', 
        approvedBy: approvedById 
      })
      .where(eq(users.id, userId))
      .returning();
      
    return updatedUser;
  }

  async banUser(userId: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ status: 'banned' })
      .where(eq(users.id, userId))
      .returning();
      
    return updatedUser;
  }

  // Media operations
  async createMedia(insertMedia: InsertMedia): Promise<Media> {
    const [createdMedia] = await db
      .insert(media)
      .values(insertMedia)
      .returning();
      
    return createdMedia;
  }

  async getMediaById(id: number): Promise<Media | undefined> {
    const [mediaItem] = await db
      .select()
      .from(media)
      .where(eq(media.id, id));
      
    return mediaItem;
  }

  async getAllMedia(): Promise<Media[]> {
    return await db.select().from(media);
  }

  async getUserMedia(userId: number): Promise<Media[]> {
    return await db
      .select()
      .from(media)
      .where(eq(media.userId, userId));
  }

  async deleteMedia(id: number): Promise<boolean> {
    const result = await db
      .delete(media)
      .where(eq(media.id, id));
      
    return result.rowCount > 0;
  }

  // Shop operations
  async createShopItem(insertItem: InsertShopItem): Promise<ShopItem> {
    const [item] = await db
      .insert(shopItems)
      .values(insertItem)
      .returning();
      
    return item;
  }

  async getShopItemById(id: number): Promise<ShopItem | undefined> {
    const [item] = await db
      .select()
      .from(shopItems)
      .where(eq(shopItems.id, id));
      
    return item;
  }

  async getAllShopItems(): Promise<ShopItem[]> {
    return await db.select().from(shopItems);
  }

  async getUserShopItems(userId: number): Promise<ShopItem[]> {
    return await db
      .select()
      .from(shopItems)
      .where(eq(shopItems.sellerId, userId));
  }

  async purchaseShopItem(itemId: number, buyerId: number): Promise<ShopItem | undefined> {
    // Get item and check if available
    const item = await this.getShopItemById(itemId);
    if (!item || item.status !== 'available') return undefined;
    
    // Get buyer and seller
    const buyer = await this.getUser(buyerId);
    const seller = await this.getUser(item.sellerId);
    
    if (!buyer || !seller) return undefined;
    if (buyer.pocketSniffles < item.price) return undefined;
    
    // Use a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Transfer money
      const success = await this.transferPocketSniffles(
        buyerId, 
        item.sellerId, 
        item.price, 
        `Purchase of ${item.title}`
      );
      
      if (!success) {
        throw new Error("Failed to transfer funds");
      }
      
      // Update item
      const [updatedItem] = await tx
        .update(shopItems)
        .set({
          buyerId,
          status: 'sold',
          soldAt: new Date()
        })
        .where(eq(shopItems.id, itemId))
        .returning();
        
      return updatedItem;
    });
  }

  async deleteShopItem(id: number): Promise<boolean> {
    const result = await db
      .delete(shopItems)
      .where(eq(shopItems.id, id));
      
    return result.rowCount > 0;
  }

  // Email operations
  async sendEmail(insertEmail: InsertEmail): Promise<Email> {
    const [email] = await db
      .insert(emails)
      .values(insertEmail)
      .returning();
      
    return email;
  }

  async getEmailById(id: number): Promise<Email | undefined> {
    const [email] = await db
      .select()
      .from(emails)
      .where(eq(emails.id, id));
      
    return email;
  }

  async getUserEmails(userId: number): Promise<Email[]> {
    return await db
      .select()
      .from(emails)
      .where(eq(emails.recipientId, userId))
      .orderBy(desc(emails.createdAt));
  }

  async getUserSentEmails(userId: number): Promise<Email[]> {
    return await db
      .select()
      .from(emails)
      .where(eq(emails.senderId, userId))
      .orderBy(desc(emails.createdAt));
  }

  async markEmailAsRead(id: number): Promise<Email | undefined> {
    const [updatedEmail] = await db
      .update(emails)
      .set({ read: true })
      .where(eq(emails.id, id))
      .returning();
      
    return updatedEmail;
  }

  async deleteEmail(id: number): Promise<boolean> {
    const result = await db
      .delete(emails)
      .where(eq(emails.id, id));
      
    return result.rowCount > 0;
  }

  // Transaction operations
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
      
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        or(
          eq(transactions.senderId, userId),
          eq(transactions.recipientId, userId)
        )
      )
      .orderBy(desc(transactions.createdAt));
  }

  // Banking operations
  async transferPocketSniffles(senderId: number, recipientId: number, amount: number, description?: string): Promise<boolean> {
    if (amount <= 0) return false;
    
    try {
      return await db.transaction(async (tx) => {
        // Get sender and recipient
        const [sender] = await tx
          .select()
          .from(users)
          .where(eq(users.id, senderId));
          
        const [recipient] = await tx
          .select()
          .from(users)
          .where(eq(users.id, recipientId));
          
        if (!sender || !recipient) return false;
        if (sender.pocketSniffles < amount) return false;
        
        // Update sender balance
        await tx
          .update(users)
          .set({ pocketSniffles: sender.pocketSniffles - amount })
          .where(eq(users.id, senderId));
          
        // Update recipient balance
        await tx
          .update(users)
          .set({ pocketSniffles: recipient.pocketSniffles + amount })
          .where(eq(users.id, recipientId));
          
        // Create transaction record
        await tx
          .insert(transactions)
          .values({
            senderId,
            recipientId,
            amount,
            type: 'transfer',
            description
          });
          
        return true;
      });
    } catch (error) {
      console.error('Transfer failed:', error);
      return false;
    }
  }

  async addPocketSniffles(userId: number, amount: number, description?: string): Promise<boolean> {
    if (amount <= 0) return false;
    
    try {
      return await db.transaction(async (tx) => {
        // Get user
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId));
          
        if (!user) return false;
        
        // Update balance
        await tx
          .update(users)
          .set({ pocketSniffles: user.pocketSniffles + amount })
          .where(eq(users.id, userId));
          
        // Create transaction record
        await tx
          .insert(transactions)
          .values({
            senderId: null,
            recipientId: userId,
            amount,
            type: 'admin',
            description: description || 'Admin deposit'
          });
          
        return true;
      });
    } catch (error) {
      console.error('Add funds failed:', error);
      return false;
    }
  }

  async removePocketSniffles(userId: number, amount: number, description?: string): Promise<boolean> {
    if (amount <= 0) return false;
    
    try {
      return await db.transaction(async (tx) => {
        // Get user
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId));
          
        if (!user) return false;
        if (user.pocketSniffles < amount) return false;
        
        // Update balance
        await tx
          .update(users)
          .set({ pocketSniffles: user.pocketSniffles - amount })
          .where(eq(users.id, userId));
          
        // Create transaction record
        await tx
          .insert(transactions)
          .values({
            senderId: userId,
            recipientId: null,
            amount,
            type: 'admin',
            description: description || 'Admin withdrawal'
          });
          
        return true;
      });
    } catch (error) {
      console.error('Remove funds failed:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
