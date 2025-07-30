import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ActiveTradesProps {
  trades: any[];
  currentPrice: number;
  onTradeClose: () => void;
}

export default function ActiveTrades({ trades, currentPrice, onTradeClose }: ActiveTradesProps) {
  const { toast } = useToast();

  const closeTradeMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const response = await apiRequest('POST', `/api/close-trade/${tradeId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trade Closed",
        description: "Trade closed successfully!",
      });
      onTradeClose();
    },
    onError: (error: any) => {
      toast({
        title: "Close Failed",
        description: error.message || "Failed to close trade",
        variant: "destructive",
      });
    },
  });

  const calculatePL = (trade: any) => {
    const priceDiff = trade.direction === 'buy' 
      ? currentPrice - trade.entryPrice 
      : trade.entryPrice - currentPrice;
    
    let multiplier = 100000; // Default for forex
    if (trade.instrument === 'XAUUSD') {
      multiplier = 100;
    }
    
    return priceDiff * trade.lotSize * multiplier;
  };

  return (
    <Card className="trade-card">
      <CardHeader>
        <CardTitle className="text-xl font-cyber font-bold text-cyan-400">
          Active Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trades.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No active trades
            </div>
          ) : (
            trades.map((trade) => {
              const profitLoss = calculatePL(trade);
              const isProfit = profitLoss > 0;
              
              return (
                <div key={trade.id} className="neon-border rounded-lg p-4 bg-gray-800/30">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{trade.instrument}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        trade.direction === 'buy' ? 'btn-neon-blue' : 'btn-neon-purple'
                      }`}>
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => closeTradeMutation.mutate(trade.id)}
                      disabled={closeTradeMutation.isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/20"
                    >
                      <X className="h-4 w-4" />
                      Close
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Entry:</span>
                      <span className="text-white ml-2">${trade.entryPrice?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Current:</span>
                      <span className="text-cyan-400 ml-2">${currentPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Lot Size:</span>
                      <span className="text-white ml-2">{trade.lotSize}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">P/L:</span>
                      <span className={`ml-2 font-bold ${
                        isProfit ? 'text-blue-400' : 'text-purple-400'
                      }`}>
                        {isProfit ? '+' : ''}${profitLoss.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">TP1:</span>
                      <span className="text-white ml-2">${trade.tp1?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">SL:</span>
                      <span className="text-white ml-2">${trade.currentSl?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {trades.length > 0 && (
          <div className="mt-4 text-center text-gray-400 text-sm">
            Auto-refreshing every 5 seconds
          </div>
        )}
      </CardContent>
    </Card>
  );
}
