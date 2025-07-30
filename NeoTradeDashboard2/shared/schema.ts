import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  oandaTradeId: text("oanda_trade_id"),
  instrument: text("instrument").notNull(),
  direction: text("direction").notNull(), // 'buy' or 'sell'
  entryPrice: real("entry_price").notNull(),
  closePrice: real("close_price"),
  lotSize: real("lot_size").notNull(),
  tp1: real("tp1").notNull(),
  tp2: real("tp2").notNull(),
  sl: real("sl").notNull(),
  currentSl: real("current_sl").notNull(),
  dateOpened: timestamp("date_opened").notNull().defaultNow(),
  dateClosed: timestamp("date_closed"),
  profitLoss: real("profit_loss"),
  isProfit: boolean("is_profit"),
  isLoss: boolean("is_loss"),
  partialClosed: boolean("partial_closed").default(false),
  tp1Hit: boolean("tp1_hit").default(false),
  tp2Hit: boolean("tp2_hit").default(false),
  slHit: boolean("sl_hit").default(false),
  status: text("status").notNull().default('open'), // 'open', 'partial', 'closed'
  closeReason: text("close_reason"), // 'tp1', 'tp2', 'sl', 'manual'
});

export const accountStats = pgTable("account_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  balance: real("balance").notNull(),
  totalProfit: real("total_profit").default(0),
  totalLoss: real("total_loss").default(0),
  totalTrades: integer("total_trades").default(0),
  winRate: real("win_rate").default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  dateOpened: true,
  dateClosed: true,
  profitLoss: true,
  isProfit: true,
  isLoss: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const placeTradeSchema = z.object({
  instrument: z.enum(["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"]),
  direction: z.enum(["buy", "sell"]),
  lotSize: z.number().min(0.01).max(100),
  tp1: z.number().positive(),
  tp2: z.number().positive(),
  sl: z.number().positive(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type AccountStats = typeof accountStats.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type PlaceTradeData = z.infer<typeof placeTradeSchema>;
