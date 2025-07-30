import { type User, type InsertUser, type Trade, type InsertTrade, type AccountStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trade methods
  getTrade(id: string): Promise<Trade | undefined>;
  getTradesByUser(userId: string): Promise<Trade[]>;
  getActiveTradesByUser(userId: string): Promise<Trade[]>;
  getRecentTradesByUser(userId: string, limit?: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | undefined>;
  deleteTrade(id: string): Promise<boolean>;
  
  // Account stats methods
  getAccountStats(userId: string): Promise<AccountStats | undefined>;
  updateAccountStats(userId: string, stats: Partial<AccountStats>): Promise<AccountStats>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private trades: Map<string, Trade>;
  private accountStats: Map<string, AccountStats>;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.accountStats = new Map();
    
    // Create default user
    const defaultUser: User = {
      id: "default-user",
      username: "admin",
      password: "admin123" // In production, this should be hashed
    };
    this.users.set(defaultUser.id, defaultUser);
    
    // Create default account stats
    const defaultStats: AccountStats = {
      id: randomUUID(),
      userId: defaultUser.id,
      balance: 10542.78,
      totalProfit: 0,
      totalLoss: 0,
      totalTrades: 0,
      winRate: 0,
      lastUpdated: new Date()
    };
    this.accountStats.set(defaultUser.id, defaultStats);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTrade(id: string): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async getTradesByUser(userId: string): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(trade => trade.userId === userId);
  }

  async getActiveTradesByUser(userId: string): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(
      trade => trade.userId === userId && trade.status === 'open'
    );
  }

  async getRecentTradesByUser(userId: string, limit: number = 10): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(trade => trade.userId === userId && trade.status === 'closed')
      .sort((a, b) => new Date(b.dateClosed || 0).getTime() - new Date(a.dateClosed || 0).getTime())
      .slice(0, limit);
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = randomUUID();
    const trade: Trade = {
      ...insertTrade,
      id,
      dateOpened: new Date(),
      dateClosed: null,
      profitLoss: null,
      isProfit: null,
      isLoss: null,
      partialClosed: false,
      tp1Hit: false,
      tp2Hit: false,
      slHit: false,
      status: 'open',
      closeReason: null,
      currentSl: insertTrade.sl,
      closePrice: null,
      oandaTradeId: null
    };
    this.trades.set(id, trade);
    return trade;
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (!trade) return undefined;
    
    const updatedTrade = { ...trade, ...updates };
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  async deleteTrade(id: string): Promise<boolean> {
    return this.trades.delete(id);
  }

  async getAccountStats(userId: string): Promise<AccountStats | undefined> {
    return this.accountStats.get(userId);
  }

  async updateAccountStats(userId: string, updates: Partial<AccountStats>): Promise<AccountStats> {
    const current = this.accountStats.get(userId);
    const updated: AccountStats = {
      id: current?.id || randomUUID(),
      userId,
      balance: 10542.78,
      totalProfit: 0,
      totalLoss: 0,
      totalTrades: 0,
      winRate: 0,
      lastUpdated: new Date(),
      ...current,
      ...updates
    };
    this.accountStats.set(userId, updated);
    return updated;
  }
}

export const storage = new MemStorage();
