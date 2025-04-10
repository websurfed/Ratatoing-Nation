import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User ranks in order of hierarchy
export const USER_RANKS = ['Nibbler', 'Cheese Guard', 'Elite Nibbler', 'Banson'] as const;
export type UserRank = typeof USER_RANKS[number];

// User status
export const USER_STATUS = ['pending', 'active', 'banned'] as const;
export type UserStatus = typeof USER_STATUS[number];
export type Task = typeof tasks.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type InsertPayout = typeof payouts.$inferInsert;

// Game types
export const GAME_TYPES = ['embedded', 'external'] as const;
export type GameType = typeof GAME_TYPES[number];

// Games table
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  gameType: text("game_type").$type<GameType>().notNull(),
  gameContent: text("game_content"),
  thumbnailPath: text("thumbnail_path"),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  category: text("category"),
  hearts: integer("hearts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Game comments
export const gameComments = pgTable("game_comments", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Game hearts (likes)
export const gameHearts = pgTable("game_hearts", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  unq: unique().on(t.gameId, t.userId), // Ensures one like per user per game
}));

// Schema validation
export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  hearts: true,
  createdAt: true,
  updatedAt: true
});

export const insertGameCommentSchema = createInsertSchema(gameComments).omit({
  id: true,
  createdAt: true
});

export const USER_JOBS = [
  'Arcade Manager',
  'Media Curator',
  'Forum Moderator',
  'Immigrants Officer'
] as const;
export type UserJob = typeof USER_JOBS[number] | null;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  profilePicture: text("profile_picture"),
  pin: text("pin").notNull(),
  description: text("description"),
  rank: text("rank").$type<UserRank>().notNull().default('Nibbler'),
  status: text("status").$type<UserStatus>().notNull().default('pending'),
  job: text("job").$type<UserJob>(),
  pocketSniffles: integer("pocket_sniffles").notNull().default(0),
  approvedBy: integer("approved_by").references((): any => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  cellDigits: text("cell_digits").notNull().unique(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contactCellDigits: text("contact_cell_digits").notNull(),
  contactName: text("contact_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  unq: unique().on(t.userId, t.contactCellDigits),
}));

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assignedJob: text("assigned_job").$type<UserJob>().notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  originalTaskId: integer("original_task_id").references(() => tasks.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default('pending'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedBy: integer("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at")
});

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  amount: integer("amount").notNull(),
  paidBy: integer("paid_by").notNull().references(() => users.id),
  job: text("job").$type<UserJob>().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Media table
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'image' or 'video'
  path: text("path").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Shop items
export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  buyerId: integer("buyer_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  imagePath: text("image_path").notNull(),
  status: text("status").notNull().default('available'), // 'available', 'sold', 'reselling'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  soldAt: timestamp("sold_at"),
  originalPrice: integer("original_price"), // Track original purchase price for reselling
  previousOwnerId: integer("previous_owner_id").references(() => users.id), // Track item history
});

// Email messages
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  recipientId: integer("recipient_id").references(() => users.id),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // 'transfer', 'purchase', 'admin'
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  approvedBy: true,
  createdAt: true,
  cellDigits: true // Add this to omit it from required fields
}).extend({
  description: z.string().min(10, "Please provide a description of at least 10 characters").max(500, "Description should not exceed 500 characters")
});

export const loginUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

export const updateUserSchema = createInsertSchema(users, {
    job: z.enum([...USER_JOBS]).nullable().optional()
  }).partial().omit({
  id: true,
  createdAt: true,
  email: true,
  username: true,
  password: true,
  pin: true,
  rank: true,
  status: true,
  pocketSniffles: true,
  approvedBy: true
});

export const insertMediaSchema = createInsertSchema(media).omit({
  id: true,
  createdAt: true
});

export const insertShopItemSchema = createInsertSchema(shopItems).omit({
  id: true,
  buyerId: true,
  status: true,
  createdAt: true,
  soldAt: true
});

export const insertEmailSchema = createInsertSchema(emails)
  .omit({
    id: true,
    read: true,
    createdAt: true
  })
  .extend({
    body: z.string().min(1, "Message is required").max(1500, "Message cannot exceed 1500 characters")
  });


export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true
});

// Job applications table
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  job: text("job").$type<UserJob>().notNull(),
  description: text("description").notNull(),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Schema validation
export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  status: true,
  reviewedBy: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type GameComment = typeof gameComments.$inferSelect;
export type InsertGameComment = z.infer<typeof insertGameCommentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type Media = typeof media.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;

export type ShopItem = typeof shopItems.$inferSelect;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;

export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export interface JobApplication {
  id: number;
  userId: number;
  job: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  // Add user fields directly
  username: string;
  name: string;
  profilePicture: string | null;
}

export type JobApplicationWithUser = typeof jobApplications.$inferSelect & {
  user: Pick<User, 'username' | 'name' | 'profilePicture'>;
};