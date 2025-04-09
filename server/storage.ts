import { 
  users, User, InsertUser, UserRank, UpdateUser, UserJob,
  media, Media, InsertMedia,
  shopItems, ShopItem, InsertShopItem,
  emails, Email, InsertEmail,
  transactions, Transaction, InsertTransaction,
  jobApplications, JobApplication, InsertJobApplication,
  USER_RANKS, USER_JOBS, Task, Payout, tasks, payouts, games, Game, InsertGame, gameComments, GameComment, InsertGameComment, gameHearts, contacts, Contact, InsertContact
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { pool } from "./db";
import { isNull } from "drizzle-orm";

import { ref, set, push, onValue, off, query, orderByChild, equalTo } from "firebase/database";
import { firebaseDb } from "./firebase";


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
  getUserInventory(userId: number): Promise<ShopItem[]>;
  purchaseShopItem(itemId: number, buyerId: number): Promise<ShopItem | undefined>;
  resellShopItem(itemId: number, newPrice: number): Promise<ShopItem | undefined>;
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

    // Update any existing users without cell digits
    this.updateMissingCellDigits().catch(err => {
      console.error("Failed to update missing cell digits:", err);
    });
  }

  // Seed admin users
  private generateCellDigits(): string {
    // Generate 10 random digits
    return Array.from({length: 10}, () => Math.floor(Math.random() * 10)).join('');
  }
  
  private async seedAdminUsers() {
    // Import hashPassword from auth
    const { hashPassword } = await import('./auth');

    // Only add if they don't exist
    if (!(await this.getUserByUsername("banson"))) {
      const hashedPassword = await hashPassword("CheezeFactory11$");

      await this.createUser({
        username: "banson",
        password: hashedPassword,
        name: "Banson Admin",
        email: "banson@ratatoing",
        pin: "8142",
        description: "Official Banson Administrator of Ratatoing Nation",
        rank: "Banson",
        status: "active",
        pocketSniffles: 10000,
        cellDigits: this.generateCellDigits() // Add this line
      });
    }

    if (!(await this.getUserByUsername("banson2"))) {
      const hashedPassword = await hashPassword("CheezeFactory11$");

      await this.createUser({
        username: "banson2",
        password: hashedPassword,
        name: "Banson Admin 2",
        email: "banson2@ratatoing",
        pin: "8142",
        description: "Secondary Banson Administrator of Ratatoing Nation",
        rank: "Banson",
        status: "active",
        pocketSniffles: 10000,
        cellDigits: this.generateCellDigits() // Add this line
      });
    }
  }

  public async updateMissingCellDigits(): Promise<void> {
    // Get all users with empty or null cellDigits
    const usersWithoutDigits = await db.select()
      .from(users)
      .where(or(
        isNull(users.cellDigits),
        eq(users.cellDigits, '')
      ));

    // Update each user with generated digits
    for (const user of usersWithoutDigits) {
      await db.update(users)
        .set({ cellDigits: this.generateCellDigits() })
        .where(eq(users.id, user.id));
    }
  }

  async updateMessageStatus(messageId: string, status: 'delivered' | 'read'): Promise<void> {
    const messageRef = ref(firebaseDb, `messages/${messageId}/status`);
    await set(messageRef, status);
  }

  async sendMessage(senderCellDigits: string, recipientCellDigits: string, message: string): Promise<void> {
    const messageRef = push(ref(firebaseDb, 'messages')); // Use firebaseDb
    await set(messageRef, {
      sender: senderCellDigits,
      recipient: recipientCellDigits,
      text: message,
      timestamp: Date.now(),
      status: 'sent',
      participants: [senderCellDigits, recipientCellDigits].sort().join('_') // For querying
    });
  }

  async getMessageThread(cellDigits1: string, cellDigits2: string): Promise<any[]> {
    const participantsKey = [cellDigits1, cellDigits2].sort().join('_');
    const messagesRef = query(
      ref(firebaseDb, 'messages'), // Use firebaseDb
      orderByChild('participants'),
      equalTo(participantsKey)
    );

    return new Promise((resolve) => {
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const messages: any[] = [];
        snapshot.forEach((childSnapshot) => {
          messages.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        resolve(messages);
        unsubscribe(); // Clean up after first fetch
      });
    });
  }

  setupMessageListener(cellDigits: string, callback: (message: any) => void): () => void {
    const messagesRef = query(
      ref(firebaseDb, 'messages'), // Use firebaseDb
      orderByChild('recipient'),
      equalTo(cellDigits)
    );

    const onMessage = onValue(messagesRef, (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        callback({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
    });

    return () => off(messagesRef, 'value', onMessage);
  }

  async getContacts(userId: number): Promise<Contact[]> {
    return await db.select()
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(desc(contacts.updatedAt));
  }

  async addContact(userId: number, cellDigits: string, name?: string): Promise<Contact> {
    const [contact] = await db.insert(contacts).values({
      userId,
      contactCellDigits: cellDigits,
      contactName: name || null
    }).returning();

    return contact;
  }

  async deleteContact(contactId: number): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, contactId));
    return result.rowCount > 0;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Game operations
  async createGame(gameData: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(gameData).returning();
    return game;
  }

  async getGameById(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async getAllGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(desc(games.createdAt));
  }

  async updateGame(id: number, updateData: Partial<Game>): Promise<Game | undefined> {
    const [updated] = await db.update(games)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(games.id, id))
      .returning();
    return updated;
  }

  async deleteGame(id: number): Promise<boolean> {
    const result = await db.delete(games).where(eq(games.id, id));
    return result.rowCount > 0;
  }

  // Comment operations
  async addGameComment(comment: InsertGameComment): Promise<GameComment> {
    const [newComment] = await db.insert(gameComments).values(comment).returning();
    return newComment;
  }

  async getGameComments(gameId: number): Promise<GameComment[]> {
    return await db.select()
      .from(gameComments)
      .where(eq(gameComments.gameId, gameId))
      .orderBy(desc(gameComments.createdAt));
  }

  async deleteGameComment(commentId: number): Promise<boolean> {
    const result = await db.delete(gameComments).where(eq(gameComments.id, commentId));
    return result.rowCount > 0;
  }

  // Heart operations
  async toggleGameHeart(gameId: number, userId: number): Promise<{ hearts: number, hasHearted: boolean }> {
    return await db.transaction(async (tx) => {
      // Check if already hearted
      const [existing] = await tx.select()
        .from(gameHearts)
        .where(and(
          eq(gameHearts.gameId, gameId),
          eq(gameHearts.userId, userId)
        ));

      if (existing) {
        // Remove heart
        await tx.delete(gameHearts)
          .where(and(
            eq(gameHearts.gameId, gameId),
            eq(gameHearts.userId, userId)
          ));

        // Decrement count
        await tx.update(games)
          .set({ hearts: sql`${games.hearts} - 1` })
          .where(eq(games.id, gameId));

        const [game] = await tx.select({ hearts: games.hearts })
          .from(games)
          .where(eq(games.id, gameId));

        return { hearts: game?.hearts || 0, hasHearted: false };
      } else {
        // Add heart
        await tx.insert(gameHearts)
          .values({ gameId, userId });

        // Increment count
        await tx.update(games)
          .set({ hearts: sql`${games.hearts} + 1` })
          .where(eq(games.id, gameId));

        const [game] = await tx.select({ hearts: games.hearts })
          .from(games)
          .where(eq(games.id, gameId));

        return { hearts: game?.hearts || 0, hasHearted: true };
      }
    });
  }

  async getGameHearts(gameId: number): Promise<number> {
    const [game] = await db.select({ hearts: games.hearts })
      .from(games)
      .where(eq(games.id, gameId));
    return game?.hearts || 0;
  }

  async hasHeartedGame(gameId: number, userId: number): Promise<boolean> {
    const [heart] = await db.select()
      .from(gameHearts)
      .where(and(
        eq(gameHearts.gameId, gameId),
        eq(gameHearts.userId, userId)
      ));
    return !!heart;
  }

  // Add these new methods to storage.ts
  async createTask(taskData: {
    title: string;
    description: string;
    assignedJob: UserJob;
    createdBy: number;
    dueDate?: Date;
  }): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async getTasks(forJob?: UserJob): Promise<Task[]> {
    let query = db.select().from(tasks).orderBy(desc(tasks.createdAt));

    if (forJob) {
      query = query.where(eq(tasks.assignedJob, forJob));
    }

    return await query;
  }

  // Add to DatabaseStorage class
  async deleteTask(taskId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(tasks)
        .where(eq(tasks.id, taskId));

      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting task:", error);
      return false;
    }
  }

  // For admin to delete all instances of a template task
  async deleteTaskAndAssignments(taskId: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // First delete all assigned tasks (copies)
      await tx.delete(tasks)
        .where(eq(tasks.originalTaskId, taskId)); // You'll need to add this column

      // Then delete the template
      const result = await tx.delete(tasks)
        .where(eq(tasks.id, taskId));

      return result.rowCount > 0;
    });
  }

  // Assign a task to specific users
  async assignTaskToUsers(taskId: number, userIds: number[]): Promise<boolean> {
    try {
      // Get the original task
      const [originalTask] = await db.select().from(tasks).where(eq(tasks.id, taskId));
      if (!originalTask) return false;

      // Create a copy for each user
      await Promise.all(userIds.map(async userId => {
        await db.insert(tasks).values({
          title: originalTask.title,
          description: originalTask.description,
          assignedJob: originalTask.assignedJob,
          assignedTo: userId,
          originalTaskId: taskId, // Link to the template task
          createdBy: originalTask.createdBy,
          dueDate: originalTask.dueDate,
          status: 'pending'
        });
      }));

      return true;
    } catch (error) {
      console.error("Error assigning task to users:", error);
      return false;
    }
  }

  // Modify the getUserTasks method to:
  async getUserTasks(userId: number): Promise<Task[]> {
    try {
      // First get the user's job
      const [user] = await db.select({ job: users.job })
        .from(users)
        .where(eq(users.id, userId));

      if (!user || !user.job) return [];

      // Build the query step by step for better debugging
      const query = db.select()
        .from(tasks)
        .where(
          and(
            // Either assigned to this user OR assigned to their job (with no specific user)
            or(
              eq(tasks.assignedTo, userId),
              and(
                eq(tasks.assignedJob, user.job),
                isNull(tasks.assignedTo)
              )
            ),
            // Only pending or completed tasks
            or(
              eq(tasks.status, 'pending'),
              eq(tasks.status, 'completed')
            )
          )
        )
        .orderBy(desc(tasks.createdAt));

      // For debugging - log the generated SQL
      console.log("Tasks query SQL:", query.toSQL());

      return await query;
    } catch (error) {
      console.error("Error in getUserTasks:", error);
      throw error;
    }
  }

  // Complete a task (user-specific)
  async completeUserTask(taskId: number, userId: number): Promise<Task | undefined> {
    return await db.transaction(async (tx) => {
      // Verify the task is assigned to this user
      const [task] = await tx.select()
        .from(tasks)
        .where(and(
          eq(tasks.id, taskId),
          eq(tasks.assignedTo, userId)
        ))

      if (!task || task.status !== 'pending') return undefined;

      // Mark as completed
      const [updatedTask] = await tx.update(tasks)
        .set({ 
          status: 'completed',
          completedBy: userId,
          completedAt: new Date()
        })
        .where(eq(tasks.id, taskId))
        .returning();

      return updatedTask;
    });
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return task;
  }

  async updateTask(
    id: number, 
    updateData: Partial<Task>
  ): Promise<Task> {
    const [task] = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async getEmployeesByJob(job: UserJob): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(and(
        eq(users.job, job),
        eq(users.status, 'active')
      ));
  }

  async createPayout(payoutData: {
    job: UserJob;
    amount: number;
    description?: string;
    paidBy: number;
    taskId?: number;
  }): Promise<Payout> {
    const [payout] = await db.insert(payouts).values(payoutData).returning();
    return payout;
  }

  async getPayoutHistory(): Promise<Payout[]> {
    return await db.select()
      .from(payouts)
      .orderBy(desc(payouts.createdAt));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // For exact match - fix the "username already exists" issue
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
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

  async unbanUser(userId: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ status: 'active' })
      .where(eq(users.id, userId))
      .returning();
      
    return updatedUser;
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      // First, find the user to check if they exist
      const user = await this.getUser(userId);
      if (!user) {
        return false;
      }

      // Delete all associated records first to maintain referential integrity
      // Delete user's sent and received emails
      await db.delete(emails).where(sql`${emails.senderId} = ${userId} OR ${emails.recipientId} = ${userId}`);
      
      // Delete user's transactions
      await db.delete(transactions).where(sql`${transactions.senderId} = ${userId} OR ${transactions.recipientId} = ${userId}`);
      
      // Delete user's media
      await db.delete(media).where(eq(media.userId, userId));
      
      // Delete or update user's shop items
      await db.delete(shopItems).where(eq(shopItems.sellerId, userId));
      
      // Finally, delete the user
      const result = await db.delete(users).where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // Job application operations
  async createJobApplication(application: InsertJobApplication): Promise<JobApplication> {
    const [created] = await db
      .insert(jobApplications)
      .values(application)
      .returning();
    return created;
  }

  async getJobApplication(id: number): Promise<JobApplication | undefined> {
    const [app] = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, id));
    return app;
  }

  async getUserApplications(userId: number): Promise<JobApplication[]> {
    return await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.userId, userId))
      .orderBy(desc(jobApplications.createdAt));
  }

  async getPendingApplications(): Promise<JobApplication[]> {
    return await db
      .select({
        id: jobApplications.id,
        userId: jobApplications.userId,
        job: jobApplications.job,
        description: jobApplications.description,
        status: jobApplications.status,
        createdAt: jobApplications.createdAt,
        updatedAt: jobApplications.updatedAt,

        username: users.username,
        name: users.name,
      })
      .from(jobApplications)
      .innerJoin(users, eq(jobApplications.userId, users.id))
      .where(eq(jobApplications.status, 'pending'))
      .orderBy(desc(jobApplications.createdAt));
  }

  async approveJobApplication(appId: number, adminId: number): Promise<JobApplication | undefined> {
    return await db.transaction(async (tx) => {
      // Get the application
      const [app] = await tx
        .select()
        .from(jobApplications)
        .where(eq(jobApplications.id, appId));

      if (!app || app.status !== 'pending') return undefined;

      // Update user's job
      await tx
        .update(users)
        .set({ job: app.job })
        .where(eq(users.id, app.userId));

      // Update application status
      const [updated] = await tx
        .update(jobApplications)
        .set({ 
          status: 'approved',
          reviewedBy: adminId,
          updatedAt: new Date()
        })
        .where(eq(jobApplications.id, appId))
        .returning();

      return updated;
    });
  }

  async rejectJobApplication(appId: number, adminId: number): Promise<JobApplication | undefined> {
    const [updated] = await db
      .update(jobApplications)
      .set({ 
        status: 'rejected',
        reviewedBy: adminId,
        updatedAt: new Date()
      })
      .where(eq(jobApplications.id, appId))
      .returning();
    return updated;
  }

  // ==============================================
  // NEW JOB-RELATED OPERATIONS (ADD HERE)
  // ==============================================
  async getUserJob(userId: number): Promise<UserJob | undefined> {
    const [user] = await db
      .select({ job: users.job })
      .from(users)
      .where(eq(users.id, userId));
    return user?.job;
  }

  async setUserJob(userId: number, job: UserJob): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ job })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getUsersWithJob(job: Exclude<UserJob, null>): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.job, job));
  }

  async getUnemployedUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(sql`${users.job} IS NULL`);
  }

  async promoteToJob(userId: number, job: Exclude<UserJob, null>): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    return this.setUserJob(userId, job);
  }

  async demoteToUnemployed(userId: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    return this.setUserJob(userId, null);
  }

  async hasJob(userId: number, job: Exclude<UserJob, null>): Promise<boolean> {
    const userJob = await this.getUserJob(userId);
    return userJob === job;
  }

  async isEmployed(userId: number): Promise<boolean> {
    const userJob = await this.getUserJob(userId);
    return userJob !== null;
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
  
  async getUserInventory(userId: number): Promise<ShopItem[]> {
    return await db
      .select()
      .from(shopItems)
      .where(
        and(
          eq(shopItems.buyerId, userId),
          eq(shopItems.status, 'sold')
        )
      )
      .orderBy(desc(shopItems.soldAt));
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
          soldAt: new Date(),
          originalPrice: item.price
        })
        .where(eq(shopItems.id, itemId))
        .returning();
        
      return updatedItem;
    });
  }
  
  async resellShopItem(itemId: number, newPrice: number): Promise<ShopItem | undefined> {
    // Get item and validate it's in the user's inventory (status: sold)
    const item = await this.getShopItemById(itemId);
    if (!item || item.status !== 'sold') return undefined;
    
    // Ensure the new price is at least the original purchase price
    if (item.originalPrice && newPrice < item.originalPrice) {
      return undefined;
    }
    
    // Update the item for reselling
    const [updatedItem] = await db
      .update(shopItems)
      .set({
        sellerId: item.buyerId,
        previousOwnerId: item.sellerId,
        price: newPrice,
        status: 'available',
        buyerId: null,
        soldAt: null
      })
      .where(eq(shopItems.id, itemId))
      .returning();
      
    return updatedItem;
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

  async getEmailById(id: number): Promise<any | undefined> {
    // First get the email
    const [basicEmail] = await db
      .select()
      .from(emails)
      .where(eq(emails.id, id));
      
    if (!basicEmail) return undefined;
    
    // Now fetch sender and recipient data separately
    const [sender] = await db
      .select()
      .from(users)
      .where(eq(users.id, basicEmail.senderId));
      
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.id, basicEmail.recipientId));
      
    // Combine the data
    return {
      ...basicEmail,
      senderName: sender?.name || "Unknown",
      senderUsername: sender?.username || "unknown",
      recipientName: recipient?.name || "Unknown",
      recipientUsername: recipient?.username || "unknown"
    };
  }

  async getUserEmails(userId: number): Promise<any[]> {
    // Get all emails sent to this user
    const userEmails = await db
      .select()
      .from(emails)
      .where(eq(emails.recipientId, userId))
      .orderBy(desc(emails.createdAt));
    
    // For each email, get the sender info
    const result = await Promise.all(userEmails.map(async (email) => {
      const [sender] = await db
        .select()
        .from(users)
        .where(eq(users.id, email.senderId));
      
      return {
        ...email,
        senderName: sender?.name || "Unknown",
        senderUsername: sender?.username || "unknown"
      };
    }));
    
    return result;
  }

  async getUserSentEmails(userId: number): Promise<any[]> {
    // Get all emails sent by this user
    const sentEmails = await db
      .select()
      .from(emails)
      .where(eq(emails.senderId, userId))
      .orderBy(desc(emails.createdAt));
    
    // For each email, get the recipient info
    const result = await Promise.all(sentEmails.map(async (email) => {
      const [recipient] = await db
        .select()
        .from(users)
        .where(eq(users.id, email.recipientId));
      
      return {
        ...email,
        recipientName: recipient?.name || "Unknown",
        recipientUsername: recipient?.username || "unknown"
      };
    }));
    
    return result;
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
