import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User ranks in order of hierarchy
export const USER_RANKS = ['Nibbler', 'Cheese Guard', 'Elite Nibbler', 'Banson'] as const;
export type UserRank = typeof USER_RANKS[number];

// User status
export const USER_STATUS = ['pending', 'active', 'banned'] as const;
export type UserStatus = typeof USER_STATUS[number];

export const USER_JOBS = [
  'Arcade Manager',
  'Media Curator',
  'Forum Moderator',
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

// Schema validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  approvedBy: true,
  createdAt: true
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