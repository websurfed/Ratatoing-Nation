import { 
  users, User, InsertUser, UserRank, UpdateUser,
  media, Media, InsertMedia,
  shopItems, ShopItem, InsertShopItem,
  emails, Email, InsertEmail,
  transactions, Transaction, InsertTransaction,
  USER_RANKS
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

// In-memory implementation of the storage interface
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private media: Map<number, Media>;
  private shopItems: Map<number, ShopItem>;
  private emails: Map<number, Email>;
  private transactions: Map<number, Transaction>;
  private currentIds: {
    users: number;
    media: number;
    shopItems: number;
    emails: number;
    transactions: number;
  };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.media = new Map();
    this.shopItems = new Map();
    this.emails = new Map();
    this.transactions = new Map();
    this.currentIds = {
      users: 1,
      media: 1,
      shopItems: 1,
      emails: 1,
      transactions: 1
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Set up initial admin users (banson and banson2)
    this.seedAdminUsers();
  }

  // Seed admin users
  private async seedAdminUsers() {
    // Only add if they don't exist
    if (!(await this.getUserByUsername("banson"))) {
      this.createUser({
        username: "banson",
        password: "password", // Will be hashed during user creation
        name: "Banson Admin",
        email: "banson@ratatoing",
        pin: "1234",
        rank: "Banson",
        status: "active",
        pocketSniffles: 10000
      });
    }
    
    if (!(await this.getUserByUsername("banson2"))) {
      this.createUser({
        username: "banson2",
        password: "password", // Will be hashed during user creation
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
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const email = insertUser.email || `${insertUser.username}@ratatoing`;
    
    const user: User = { 
      ...insertUser, 
      id,
      email,
      createdAt: new Date(),
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateData: UpdateUser): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getPendingUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.status === 'pending',
    );
  }

  async getUsersByRank(rank: UserRank): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.rank === rank,
    );
  }

  async approveUser(userId: number, approvedById: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      status: 'active' as const, 
      approvedBy: approvedById 
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async banUser(userId: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      status: 'banned' as const 
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Media operations
  async createMedia(insertMedia: InsertMedia): Promise<Media> {
    const id = this.currentIds.media++;
    const media: Media = { 
      ...insertMedia, 
      id,
      createdAt: new Date(),
    };
    
    this.media.set(id, media);
    return media;
  }

  async getMediaById(id: number): Promise<Media | undefined> {
    return this.media.get(id);
  }

  async getAllMedia(): Promise<Media[]> {
    return Array.from(this.media.values());
  }

  async getUserMedia(userId: number): Promise<Media[]> {
    return Array.from(this.media.values()).filter(
      (media) => media.userId === userId,
    );
  }

  async deleteMedia(id: number): Promise<boolean> {
    return this.media.delete(id);
  }

  // Shop operations
  async createShopItem(insertItem: InsertShopItem): Promise<ShopItem> {
    const id = this.currentIds.shopItems++;
    const item: ShopItem = { 
      ...insertItem, 
      id,
      status: 'available' as const,
      createdAt: new Date(),
      buyerId: null,
      soldAt: null
    };
    
    this.shopItems.set(id, item);
    return item;
  }

  async getShopItemById(id: number): Promise<ShopItem | undefined> {
    return this.shopItems.get(id);
  }

  async getAllShopItems(): Promise<ShopItem[]> {
    return Array.from(this.shopItems.values());
  }

  async getUserShopItems(userId: number): Promise<ShopItem[]> {
    return Array.from(this.shopItems.values()).filter(
      (item) => item.sellerId === userId,
    );
  }

  async purchaseShopItem(itemId: number, buyerId: number): Promise<ShopItem | undefined> {
    const item = await this.getShopItemById(itemId);
    if (!item || item.status !== 'available') return undefined;
    
    const buyer = await this.getUser(buyerId);
    const seller = await this.getUser(item.sellerId);
    
    if (!buyer || !seller) return undefined;
    if (buyer.pocketSniffles < item.price) return undefined;
    
    // Transfer money
    await this.transferPocketSniffles(
      buyerId, 
      item.sellerId, 
      item.price, 
      `Purchase of ${item.title}`
    );
    
    // Update item
    const updatedItem: ShopItem = {
      ...item,
      buyerId,
      status: 'sold' as const,
      soldAt: new Date()
    };
    
    this.shopItems.set(itemId, updatedItem);
    return updatedItem;
  }

  async deleteShopItem(id: number): Promise<boolean> {
    return this.shopItems.delete(id);
  }

  // Email operations
  async sendEmail(insertEmail: InsertEmail): Promise<Email> {
    const id = this.currentIds.emails++;
    const email: Email = { 
      ...insertEmail, 
      id,
      read: false,
      createdAt: new Date(),
    };
    
    this.emails.set(id, email);
    return email;
  }

  async getEmailById(id: number): Promise<Email | undefined> {
    return this.emails.get(id);
  }

  async getUserEmails(userId: number): Promise<Email[]> {
    return Array.from(this.emails.values()).filter(
      (email) => email.recipientId === userId,
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserSentEmails(userId: number): Promise<Email[]> {
    return Array.from(this.emails.values()).filter(
      (email) => email.senderId === userId,
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markEmailAsRead(id: number): Promise<Email | undefined> {
    const email = await this.getEmailById(id);
    if (!email) return undefined;
    
    const updatedEmail: Email = { 
      ...email, 
      read: true 
    };
    
    this.emails.set(id, updatedEmail);
    return updatedEmail;
  }

  async deleteEmail(id: number): Promise<boolean> {
    return this.emails.delete(id);
  }

  // Transaction operations
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentIds.transactions++;
    const transaction: Transaction = { 
      ...insertTransaction, 
      id,
      createdAt: new Date(),
    };
    
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (tx) => tx.senderId === userId || tx.recipientId === userId,
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Banking operations
  async transferPocketSniffles(senderId: number, recipientId: number, amount: number, description?: string): Promise<boolean> {
    if (amount <= 0) return false;
    
    const sender = await this.getUser(senderId);
    const recipient = await this.getUser(recipientId);
    
    if (!sender || !recipient) return false;
    if (sender.pocketSniffles < amount) return false;
    
    // Update balances
    await this.updateUser(senderId, { 
      pocketSniffles: sender.pocketSniffles - amount 
    });
    
    await this.updateUser(recipientId, { 
      pocketSniffles: recipient.pocketSniffles + amount 
    });
    
    // Create transaction record
    await this.createTransaction({
      senderId,
      recipientId,
      amount,
      type: 'transfer',
      description
    });
    
    return true;
  }

  async addPocketSniffles(userId: number, amount: number, description?: string): Promise<boolean> {
    if (amount <= 0) return false;
    
    const user = await this.getUser(userId);
    if (!user) return false;
    
    // Update balance
    await this.updateUser(userId, { 
      pocketSniffles: user.pocketSniffles + amount 
    });
    
    // Create transaction record
    await this.createTransaction({
      senderId: null,
      recipientId: userId,
      amount,
      type: 'admin',
      description: description || 'Admin deposit'
    });
    
    return true;
  }

  async removePocketSniffles(userId: number, amount: number, description?: string): Promise<boolean> {
    if (amount <= 0) return false;
    
    const user = await this.getUser(userId);
    if (!user) return false;
    if (user.pocketSniffles < amount) return false;
    
    // Update balance
    await this.updateUser(userId, { 
      pocketSniffles: user.pocketSniffles - amount 
    });
    
    // Create transaction record
    await this.createTransaction({
      senderId: userId,
      recipientId: null,
      amount,
      type: 'admin',
      description: description || 'Admin withdrawal'
    });
    
    return true;
  }
}

export const storage = new MemStorage();
