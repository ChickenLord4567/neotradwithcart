import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage.js";
import { oandaService } from "./services/oanda.js";
import { mongoService } from "./services/mongodb.js";
import { tradeManager } from "./services/trade-manager.js";
import { loginSchema, placeTradeSchema } from "@shared/schema.js";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Middleware to check authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'trading-dashboard-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Start trade manager
  tradeManager.start();

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ message: "Login successful", user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ id: user.id, username: user.username });
  });

  // Trading routes
  app.get('/api/current-price/:instrument', requireAuth, async (req, res) => {
    try {
      const { instrument } = req.params;
      const price = await oandaService.getCurrentPrice(instrument);
      res.json(price);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch price" });
    }
  });

  app.post('/api/place-trade', requireAuth, async (req, res) => {
    try {
      const tradeData = placeTradeSchema.parse(req.body);
      const userId = req.session.userId!;

      // Get current price for entry
      const currentPrice = await oandaService.getCurrentPrice(tradeData.instrument);
      const entryPrice = tradeData.direction === 'buy' ? currentPrice.ask : currentPrice.bid;

      // Calculate units from lot size
      let units = tradeData.lotSize;
      if (tradeData.instrument === 'XAUUSD') {
        units = tradeData.lotSize * 100; // 1 lot = 100 oz for gold
      } else {
        units = tradeData.lotSize * 100000; // 1 lot = 100,000 units for forex
      }

      // Place trade via OANDA
      const oandaResult = await oandaService.placeTrade({
        instrument: tradeData.instrument,
        direction: tradeData.direction,
        units,
        stopLoss: tradeData.sl,
        takeProfit1: tradeData.tp1,
        takeProfit2: tradeData.tp2
      });

      // Create trade record
      const trade = await storage.createTrade({
        userId,
        instrument: tradeData.instrument,
        direction: tradeData.direction,
        entryPrice: oandaResult.fillPrice,
        lotSize: tradeData.lotSize,
        tp1: tradeData.tp1,
        tp2: tradeData.tp2,
        sl: tradeData.sl,
        currentSl: tradeData.sl,
        oandaTradeId: oandaResult.tradeId
      });

      // Update the trade with OANDA trade ID
      const updatedTrade = await storage.updateTrade(trade.id, {
        oandaTradeId: oandaResult.tradeId
      });

      // Save to MongoDB (let MongoDB generate its own _id)
      const { id, ...tradeWithoutId } = trade; // Remove the id field
      const mongoTradeData = {
        ...tradeWithoutId,
        inMemoryId: id // Keep track of in-memory ID separately
      };
      
      await mongoService.saveTrade(mongoTradeData);

      res.json({ 
        message: "Trade placed successfully", 
        trade,
        oandaTradeId: oandaResult.tradeId 
      });
    } catch (error) {
      console.error('Error placing trade:', error);
      res.status(500).json({ message: "Failed to place trade" });
    }
  });

  app.post('/api/close-trade/:tradeId', requireAuth, async (req, res) => {
    try {
      const { tradeId } = req.params;
      const trade = await storage.getTrade(tradeId);
      
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }

      if (!trade.oandaTradeId) {
        return res.status(400).json({ message: "Trade has no OANDA ID" });
      }

      console.log(`Manual close requested for trade ${tradeId} (OANDA ID: ${trade.oandaTradeId})`);

      // Close trade via OANDA using the actual OANDA trade ID
      const closeResult = await oandaService.closeTrade(trade.oandaTradeId);
      
      if (closeResult.success) {
        // Calculate profit/loss properly based on instrument
        let multiplier = 100000; // Default for forex
        if (trade.instrument === 'XAUUSD') {
          multiplier = 100;
        }
        
        const profitLoss = trade.direction === 'buy' 
          ? (closeResult.closePrice - trade.entryPrice) * trade.lotSize * multiplier
          : (trade.entryPrice - closeResult.closePrice) * trade.lotSize * multiplier;
        
        // Update trade record
        const updatedTrade = await storage.updateTrade(tradeId, {
          status: 'closed',
          dateClosed: new Date(),
          closePrice: closeResult.closePrice,
          profitLoss,
          isProfit: profitLoss > 0,
          isLoss: profitLoss < 0,
          closeReason: 'manual'
        });

        // Update MongoDB
        await mongoService.updateTrade(tradeId, {
          status: 'closed',
          dateClosed: new Date(),
          closePrice: closeResult.closePrice,
          profitLoss,
          isProfit: profitLoss > 0,
          isLoss: profitLoss < 0,
          closeReason: 'manual'
        });

        console.log(`✅ Manual close completed: P/L = $${profitLoss.toFixed(2)}`);
        res.json({ 
          message: "Trade closed successfully",
          profitLoss: profitLoss.toFixed(2),
          closePrice: closeResult.closePrice
        });
      } else {
        console.error(`❌ Failed to close OANDA trade ${trade.oandaTradeId}`);
        res.status(500).json({ message: "Failed to close trade on OANDA" });
      }
    } catch (error) {
      console.error('Error in manual trade closure:', error);
      res.status(500).json({ 
        message: "Failed to close trade",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/trades/active', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const trades = await storage.getActiveTradesByUser(userId);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active trades" });
    }
  });

  app.get('/api/trades/recent', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      // Get recent trades from MongoDB for historical data
      const allTrades = await mongoService.getAllTrades();
      const recentTrades = allTrades.slice(0, 10); // Get latest 10 trades
      res.json(recentTrades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent trades" });
    }
  });

  app.get('/api/account-balance', requireAuth, async (req, res) => {
    try {
      const balance = await oandaService.getAccountBalance();
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account balance" });
    }
  });

  app.get('/api/account-stats', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get trades from MongoDB for historical analysis
      const mongoTrades = await mongoService.getAllTrades();
      const closedTrades = mongoTrades.filter((t: any) => t.status === 'closed');
      
      const totalProfit = closedTrades
        .filter((t: any) => t.isProfit)
        .reduce((sum: number, t: any) => sum + (t.profitLoss || 0), 0);
      
      const totalLoss = Math.abs(closedTrades
        .filter((t: any) => t.isLoss)
        .reduce((sum: number, t: any) => sum + (t.profitLoss || 0), 0));
      
      const winRate = closedTrades.length > 0 
        ? (closedTrades.filter((t: any) => t.isProfit).length / closedTrades.length) * 100 
        : 0;

      const stats = {
        totalProfit,
        totalLoss,
        totalTrades: closedTrades.length,
        winRate
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
