import { oandaService } from './oanda.js';
import { mongoService } from './mongodb.js';
import { storage } from '../storage.js';

export class TradeManager {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🤖 Trade manager started - checking trades every 5 seconds');
    
    // Run immediately then every 5 seconds
    this.checkTrades();
    this.intervalId = setInterval(() => {
      this.checkTrades();
    }, 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🤖 Trade manager stopped');
  }

  private async checkTrades() {
    try {
      // Get all active trades from storage
      const activeTrades = await storage.getActiveTradesByUser('default-user');
      
      for (const trade of activeTrades) {
        await this.processTrade(trade);
      }
    } catch (error) {
      console.error('Error in trade manager:', error);
    }
  }

  private async processTrade(trade: any) {
    try {
      // Get current price from OANDA
      const currentPrice = await oandaService.getCurrentPrice(trade.instrument);
      const price = trade.direction === 'buy' ? currentPrice.bid : currentPrice.ask;

      // Check TP1 hit
      if (!trade.tp1Hit && this.shouldHitTP1(trade, price)) {
        await this.handleTP1Hit(trade);
      }
      // Check TP2 hit
      else if (trade.tp1Hit && !trade.tp2Hit && this.shouldHitTP2(trade, price)) {
        await this.handleTP2Hit(trade);
      }
      // Check SL hit
      else if (this.shouldHitSL(trade, price)) {
        await this.handleSLHit(trade);
      }

    } catch (error) {
      console.error(`Error processing trade ${trade.id}:`, error);
    }
  }

  private shouldHitTP1(trade: any, currentPrice: number): boolean {
    if (trade.direction === 'buy') {
      return currentPrice >= trade.tp1;
    } else {
      return currentPrice <= trade.tp1;
    }
  }

  private shouldHitTP2(trade: any, currentPrice: number): boolean {
    if (trade.direction === 'buy') {
      return currentPrice >= trade.tp2;
    } else {
      return currentPrice <= trade.tp2;
    }
  }

  private shouldHitSL(trade: any, currentPrice: number): boolean {
    if (trade.direction === 'buy') {
      return currentPrice <= trade.currentSl;
    } else {
      return currentPrice >= trade.currentSl;
    }
  }

  private async handleTP1Hit(trade: any) {
    console.log(`🎯 TP1 hit for trade ${trade.id} (OANDA ID: ${trade.oandaTradeId})`);
    
    try {
      // Close 75% of the position via OANDA
      const closeResult = await oandaService.closePartialTrade(trade.oandaTradeId);
      
      if (closeResult.success) {
        // Move SL to breakeven via OANDA
        await oandaService.updateStopLoss(trade.oandaTradeId, trade.entryPrice);
        
        // Calculate partial profit from 75% closure
        const partialProfit = this.calculateProfitLoss({
          ...trade,
          lotSize: trade.lotSize * 0.75 // 75% of position
        }, closeResult.closePrice);
        
        // Update trade in storage
        await storage.updateTrade(trade.id, {
          partialClosed: true,
          tp1Hit: true,
          currentSl: trade.entryPrice,
          status: 'partial',
          profitLoss: partialProfit
        });

        // Update in MongoDB
        await mongoService.updateTrade(trade.id, {
          partialClosed: true,
          tp1Hit: true,
          currentSl: trade.entryPrice,
          status: 'partial',
          profitLoss: partialProfit
        });

        console.log(`✅ TP1 processed: 75% closed at $${closeResult.closePrice}, SL moved to breakeven, partial profit: $${partialProfit.toFixed(2)}`);
      }
    } catch (error) {
      console.error(`❌ Error handling TP1 for trade ${trade.id}:`, error);
    }
  }

  private async handleTP2Hit(trade: any) {
    console.log(`🎯 TP2 hit for trade ${trade.id} (OANDA ID: ${trade.oandaTradeId})`);
    
    try {
      // Close remaining position via OANDA
      const closeResult = await oandaService.closeTrade(trade.oandaTradeId);
      
      if (closeResult.success) {
        // Calculate total profit from remaining 25% position
        const remainingProfit = this.calculateProfitLoss({
          ...trade,
          lotSize: trade.lotSize * 0.25 // Remaining 25% after TP1
        }, closeResult.closePrice);
        
        // Total profit = previous partial profit + remaining profit
        const totalProfit = (trade.profitLoss || 0) + remainingProfit;
        
        // Update trade in storage
        await storage.updateTrade(trade.id, {
          tp2Hit: true,
          status: 'closed',
          dateClosed: new Date(),
          closePrice: closeResult.closePrice,
          profitLoss: totalProfit,
          isProfit: totalProfit > 0,
          isLoss: totalProfit < 0,
          closeReason: 'tp2'
        });

        // Update in MongoDB
        await mongoService.updateTrade(trade.id, {
          tp2Hit: true,
          status: 'closed',
          dateClosed: new Date(),
          closePrice: closeResult.closePrice,
          profitLoss: totalProfit,
          isProfit: totalProfit > 0,
          isLoss: totalProfit < 0,
          closeReason: 'tp2'
        });

        console.log(`✅ TP2 processed: Remaining 25% closed at $${closeResult.closePrice}, total profit: $${totalProfit.toFixed(2)}`);
      }
    } catch (error) {
      console.error(`❌ Error handling TP2 for trade ${trade.id}:`, error);
    }
  }

  private async handleSLHit(trade: any) {
    console.log(`🛑 SL hit for trade ${trade.id} (OANDA ID: ${trade.oandaTradeId})`);
    
    try {
      // Close position via OANDA
      const closeResult = await oandaService.closeTrade(trade.oandaTradeId);
      
      if (closeResult.success) {
        // Calculate loss - if partial trade, add to existing profit/loss
        let profitLoss;
        if (trade.partialClosed) {
          // Calculate loss from remaining 25% position
          const remainingLoss = this.calculateProfitLoss({
            ...trade,
            lotSize: trade.lotSize * 0.25 // Remaining 25% after TP1
          }, closeResult.closePrice);
          
          // Total P/L = previous partial profit + remaining loss
          profitLoss = (trade.profitLoss || 0) + remainingLoss;
        } else {
          // Full position loss
          profitLoss = this.calculateProfitLoss(trade, closeResult.closePrice);
        }
        
        // Update trade in storage
        await storage.updateTrade(trade.id, {
          slHit: true,
          status: 'closed',
          dateClosed: new Date(),
          closePrice: closeResult.closePrice,
          profitLoss,
          isProfit: profitLoss > 0,
          isLoss: profitLoss < 0,
          closeReason: 'sl'
        });

        // Update in MongoDB
        await mongoService.updateTrade(trade.id, {
          slHit: true,
          status: 'closed',
          dateClosed: new Date(),
          closePrice: closeResult.closePrice,
          profitLoss,
          isProfit: profitLoss > 0,
          isLoss: profitLoss < 0,
          closeReason: 'sl'
        });

        console.log(`✅ SL processed: Closed at $${closeResult.closePrice}, total P/L: $${profitLoss.toFixed(2)}`);
      }
    } catch (error) {
      console.error(`❌ Error handling SL for trade ${trade.id}:`, error);
    }
  }

  private calculateProfitLoss(trade: any, closePrice: number): number {
    const priceDiff = trade.direction === 'buy' 
      ? closePrice - trade.entryPrice 
      : trade.entryPrice - closePrice;
    
    // Convert lot size to units and calculate P/L
    // For XAUUSD: 1 lot = 100 oz, 1 pip = $0.01 per oz
    // For forex pairs: 1 lot = 100,000 units
    let multiplier = 100000; // Default for forex
    if (trade.instrument === 'XAUUSD') {
      multiplier = 100;
    }
    
    return priceDiff * trade.lotSize * multiplier;
  }
}

export const tradeManager = new TradeManager();
