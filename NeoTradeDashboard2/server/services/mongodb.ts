import mongoose from 'mongoose';

// MongoDB connection with retry logic
const connectWithRetry = () => {
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    console.warn('⚠ Missing MONGO_URI. Please provide it in the .env file.');
    return;
  }

  mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => {
      console.error('❌ MongoDB error:', err.message);
      console.log('🔁 Retrying in 5s...');
      setTimeout(connectWithRetry, 5000);
    });
};

// Initialize connection
connectWithRetry();

// Trade Schema for MongoDB
const TradeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  oandaTradeId: String,
  inMemoryId: String, // Track in-memory storage ID
  instrument: { type: String, required: true },
  direction: { type: String, required: true },
  entryPrice: { type: Number, required: true },
  closePrice: Number,
  lotSize: { type: Number, required: true },
  tp1: { type: Number, required: true },
  tp2: { type: Number, required: true },
  sl: { type: Number, required: true },
  currentSl: { type: Number, required: true },
  dateOpened: { type: Date, default: Date.now },
  dateClosed: Date,
  profitLoss: Number,
  isProfit: Boolean,
  isLoss: Boolean,
  partialClosed: { type: Boolean, default: false },
  tp1Hit: { type: Boolean, default: false },
  tp2Hit: { type: Boolean, default: false },
  slHit: { type: Boolean, default: false },
  status: { type: String, default: 'open' },
  closeReason: String
});

export const MongoTrade = mongoose.model('Trade', TradeSchema);

export class MongoService {
  async saveTrade(trade: any) {
    try {
      // Remove any _id field and other problematic fields that might exist
      const { _id, id, ...cleanTrade } = trade;
      const mongoTrade = new MongoTrade(cleanTrade);
      await mongoTrade.save();
      return mongoTrade.toObject();
    } catch (error) {
      console.error('Error saving trade to MongoDB:', error);
      return null;
    }
  }

  async updateTrade(tradeId: string, updates: any) {
    try {
      // Always use inMemoryId for updates since we're passing UUID strings
      const updated = await MongoTrade.findOneAndUpdate({ inMemoryId: tradeId }, updates, { new: true });
      return updated?.toObject();
    } catch (error) {
      console.error('Error updating trade in MongoDB:', error);
      return null;
    }
  }

  async findTradeByInMemoryId(inMemoryId: string) {
    try {
      const trade = await MongoTrade.findOne({ inMemoryId });
      return trade?.toObject();
    } catch (error) {
      console.error('Error finding trade by inMemoryId:', error);
      return null;
    }
  }

  async getTradesByUser(userId: string) {
    try {
      const trades = await MongoTrade.find({ userId }).sort({ dateOpened: -1 });
      return trades.map(trade => trade.toObject());
    } catch (error) {
      console.error('Error fetching trades from MongoDB:', error);
      return [];
    }
  }

  async getActiveTradesByUser(userId: string) {
    try {
      const trades = await MongoTrade.find({ userId, status: 'open' });
      return trades.map(trade => trade.toObject());
    } catch (error) {
      console.error('Error fetching active trades from MongoDB:', error);
      return [];
    }
  }

  async getAllTrades() {
    try {
      const trades = await MongoTrade.find({}).sort({ dateOpened: -1 });
      return trades.map(trade => trade.toObject());
    } catch (error) {
      console.error('Error fetching all trades from MongoDB:', error);
      return [];
    }
  }
}

export const mongoService = new MongoService();
