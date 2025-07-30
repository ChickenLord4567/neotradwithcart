import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TradeSetup from "@/components/trade-setup";
import AccountOverview from "@/components/account-overview";
import HistoricalAnalysis from "@/components/historical-analysis";
import ActiveTrades from "@/components/active-trades";
import RecentTrades from "@/components/recent-trades";

export default function Dashboard() {
  const [selectedInstrument, setSelectedInstrument] = useState("XAUUSD");
  const { toast } = useToast();

  // Fetch current price
  const { data: priceData, refetch: refetchPrice } = useQuery({
    queryKey: ['/api/current-price', selectedInstrument],
    refetchInterval: 2000, // Update every 2 seconds
  });

  // Fetch active trades
  const { data: activeTrades, refetch: refetchActiveTrades } = useQuery({
    queryKey: ['/api/trades/active'],
    refetchInterval: 5000, // Update every 5 seconds
  });

  // Fetch recent trades
  const { data: recentTrades } = useQuery({
    queryKey: ['/api/trades/recent'],
  });

  // Fetch account balance
  const { data: accountData } = useQuery({
    queryKey: ['/api/account-balance'],
    refetchInterval: 5000,
  });

  // Fetch account stats
  const { data: accountStats } = useQuery({
    queryKey: ['/api/account-stats'],
    refetchInterval: 10000,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout');
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged Out",
        description: "See you next time!",
      });
    },
  });

  const currentPrice = priceData ? (priceData.ask + priceData.bid) / 2 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="trade-card border-b border-cyan-400/30 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-cyber font-bold text-cyan-400 neon-text">
              NEON TRADER
            </h1>
            <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
              <SelectTrigger className="input-neon w-32 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-400/50">
                <SelectItem value="XAUUSD" className="text-white hover:bg-cyan-400/20">XAU/USD</SelectItem>
                <SelectItem value="EURUSD" className="text-white hover:bg-cyan-400/20">EUR/USD</SelectItem>
                <SelectItem value="GBPUSD" className="text-white hover:bg-cyan-400/20">GBP/USD</SelectItem>
                <SelectItem value="USDJPY" className="text-white hover:bg-cyan-400/20">USD/JPY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Current Market Price</div>
              <div className="text-4xl font-cyber font-bold text-cyan-400 neon-text pulse-glow">
                ${currentPrice.toFixed(2)}
              </div>
            </div>
            <Button
              onClick={() => logoutMutation.mutate()}
              variant="outline"
              size="sm"
              className="border-red-400 text-red-400 hover:bg-red-400/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {/* Trade Setup */}
        <TradeSetup 
          selectedInstrument={selectedInstrument}
          currentPrice={currentPrice}
          onTradeSuccess={() => {
            refetchActiveTrades();
            queryClient.invalidateQueries({ queryKey: ['/api/trades/recent'] });
            queryClient.invalidateQueries({ queryKey: ['/api/account-stats'] });
          }}
        />

        {/* Account Overview */}
        <AccountOverview 
          accountBalance={accountData?.balance || 0}
          accountStats={accountStats}
        />

        {/* Historical Analysis */}
        <HistoricalAnalysis />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Trades */}
          <ActiveTrades 
            trades={activeTrades || []}
            currentPrice={currentPrice}
            onTradeClose={() => {
              refetchActiveTrades();
              queryClient.invalidateQueries({ queryKey: ['/api/trades/recent'] });
              queryClient.invalidateQueries({ queryKey: ['/api/account-stats'] });
            }}
          />

          {/* Recent Trades */}
          <RecentTrades trades={recentTrades || []} />
        </div>
      </main>
    </div>
  );
}
