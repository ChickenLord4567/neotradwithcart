interface OandaConfig {
  accountId: string;
  apiKey: string;
  baseUrl: string;
}

interface OandaPrice {
  instrument: string;
  time: string;
  closeoutBid: string;
  closeoutAsk: string;
}

interface OandaTrade {
  id: string;
  instrument: string;
  price: string;
  openTime: string;
  state: string;
  initialUnits: string;
  currentUnits: string;
  unrealizedPL: string;
}

interface OandaAccount {
  id: string;
  balance: string;
  unrealizedPL: string;
  marginRate: string;
}

export class OandaService {
  private config: OandaConfig;

  constructor() {
    this.config = {
      accountId: process.env.OANDA_ACCOUNT_ID || '',
      apiKey: process.env.OANDA_API_KEY || '',
      baseUrl: 'https://api-fxpractice.oanda.com/v3' // Practice API endpoint
    };

    if (!this.config.accountId || !this.config.apiKey) {
      console.warn('⚠ Missing OANDA_API_KEY or OANDA_ACCOUNT_ID. Please provide them in the .env file.');
    } else {
      console.log('✅ OANDA practice API configured');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.config.apiKey || !this.config.accountId) {
      throw new Error('OANDA credentials not configured');
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OANDA API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  // Convert UI instrument format to OANDA format
  private formatInstrument(instrument: string): string {
    const mapping: Record<string, string> = {
      'XAUUSD': 'XAU_USD',
      'EURUSD': 'EUR_USD',
      'GBPUSD': 'GBP_USD',
      'USDJPY': 'USD_JPY'
    };
    return mapping[instrument] || instrument;
  }

  async getCurrentPrice(instrument: string): Promise<{ bid: number; ask: number }> {
    try {
      const formattedInstrument = this.formatInstrument(instrument);
      const data = await this.makeRequest(`/accounts/${this.config.accountId}/pricing?instruments=${formattedInstrument}`);
      
      if (!data.prices || data.prices.length === 0) {
        throw new Error('No price data received');
      }

      const price = data.prices[0];
      return {
        bid: parseFloat(price.closeoutBid),
        ask: parseFloat(price.closeoutAsk)
      };
    } catch (error) {
      console.error('Error fetching price from OANDA:', error);
      throw error; // Let calling code handle the error
    }
  }

  async getAccountBalance(): Promise<number> {
    try {
      const data = await this.makeRequest(`/accounts/${this.config.accountId}`);
      return parseFloat(data.account.balance);
    } catch (error) {
      console.error('Error fetching account balance from OANDA:', error);
      throw error;
    }
  }

  async placeTrade(params: {
    instrument: string;
    direction: 'buy' | 'sell';
    units: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
  }): Promise<{ tradeId: string; fillPrice: number }> {
    const formattedInstrument = this.formatInstrument(params.instrument);
    const units = params.direction === 'buy' ? Math.abs(params.units) : -Math.abs(params.units);

    const orderData = {
      order: {
        type: 'MARKET',
        instrument: formattedInstrument,
        units: units.toString(),
        stopLossOnFill: {
          price: params.stopLoss.toString()
        }
      }
    };

    console.log('Placing OANDA trade:', { instrument: formattedInstrument, units, stopLoss: params.stopLoss });

    const response = await this.makeRequest(
      `/accounts/${this.config.accountId}/orders`,
      {
        method: 'POST',
        body: JSON.stringify(orderData)
      }
    );

    const tradeId = response.orderFillTransaction?.tradeOpened?.tradeID || 
                   response.orderCreateTransaction?.id;
    const fillPrice = parseFloat(response.orderFillTransaction?.price || 
                                response.orderCreateTransaction?.price || '0');

    if (!tradeId) {
      throw new Error('No trade ID received from OANDA');
    }

    console.log('✅ OANDA trade placed:', { tradeId, fillPrice });

    return {
      tradeId,
      fillPrice
    };
  }

  async closeTrade(tradeId: string, unitsToClose?: string): Promise<{ success: boolean; closePrice: number; actualUnits?: string }> {
    const closeData = unitsToClose ? { units: unitsToClose } : { units: 'ALL' };

    console.log('Closing OANDA trade:', { tradeId, units: closeData.units });

    const response = await this.makeRequest(
      `/accounts/${this.config.accountId}/trades/${tradeId}/close`,
      {
        method: 'PUT',
        body: JSON.stringify(closeData)
      }
    );

    const closePrice = parseFloat(response.orderFillTransaction?.price || '0');
    const actualUnits = response.orderFillTransaction?.units;

    console.log('✅ OANDA trade closed:', { tradeId, closePrice, actualUnits });

    return {
      success: true,
      closePrice,
      actualUnits
    };
  }

  async getOpenTrades(): Promise<OandaTrade[]> {
    try {
      const data = await this.makeRequest(`/accounts/${this.config.accountId}/openTrades`);
      return data.trades || [];
    } catch (error) {
      console.error('Error fetching open trades:', error);
      return [];
    }
  }

  async updateStopLoss(tradeId: string, newStopLoss: number): Promise<boolean> {
    console.log('Updating OANDA stop loss:', { tradeId, newStopLoss });

    const data = {
      stopLoss: {
        price: newStopLoss.toString()
      }
    };

    await this.makeRequest(
      `/accounts/${this.config.accountId}/trades/${tradeId}/orders`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    );

    console.log('✅ OANDA stop loss updated:', { tradeId, newStopLoss });
    return true;
  }

  // Get trade details to calculate 75% of units for partial close
  async getTradeDetails(tradeId: string): Promise<{ currentUnits: number; unrealizedPL: number }> {
    const response = await this.makeRequest(`/accounts/${this.config.accountId}/trades/${tradeId}`);
    
    return {
      currentUnits: Math.abs(parseFloat(response.trade.currentUnits)),
      unrealizedPL: parseFloat(response.trade.unrealizedPL)
    };
  }

  // Close 75% of a trade (for TP1)
  async closePartialTrade(tradeId: string): Promise<{ success: boolean; closePrice: number; remainingUnits: number }> {
    const tradeDetails = await this.getTradeDetails(tradeId);
    const unitsToClose = Math.floor(tradeDetails.currentUnits * 0.75);
    
    console.log('Closing 75% of trade:', { tradeId, totalUnits: tradeDetails.currentUnits, unitsToClose });

    const result = await this.closeTrade(tradeId, unitsToClose.toString());
    
    return {
      success: result.success,
      closePrice: result.closePrice,
      remainingUnits: tradeDetails.currentUnits - unitsToClose
    };
  }
}

export const oandaService = new OandaService();
