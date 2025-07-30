import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartPanel from "@/components/ChartPanel";
import MarketSelector from "@/components/MarketSelector";
import TimeframeSelector from "@/components/TimeframeSelector";
import { fetchCandles, fetchLivePrice } from "@/services/chartApi";
import TradeSetup from "@/components/trade-setup";
import AccountOverview from "@/components/account-overview";
import HistoricalAnalysis from "@/components/historical-analysis";
import ActiveTrades from "@/components/active-trades";
import RecentTrades from "@/components/recent-trades";

const MARKETS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'];

export default function Dashboard() {
  const [selectedInstrument, setSelectedInstrument] = useState("XAUUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1m");
  const [candles, setCandles] = useState([]);
  const [liveChartPrice, setLiveChartPrice] = useState<number | undefined>(undefined);

  // -- MVP Chart Data Sync --
  // Fetch chart candles when market or timeframe changes
  useEffect(() => {
    let mounted = true;
    setCandles([]); // clear chart for quick feedback
    fetchCandles(selectedInstrument, selectedTimeframe).then(data => {
      if (mounted) setCandles(data);
    });
    return () => { mounted = false; }
  }, [selectedInstrument, selectedTimeframe]);

  // Poll for live chart price every 5s (for live price line)
  useEffect(() => {
    let mounted = true;
    const poll = () => {
      fetchLivePrice(selectedInstrument).then(data => {
        if (mounted) setLiveChartPrice(data.last);
      });
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { mounted = false; clearInterval(interval); }
  }, [selectedInstrument]);

  // -- Other Dashboard Data --
  const { toast } = useToast();

  // Fetch current price for trade setup/etc
  const { data: priceData, refetch: refetchPrice } = useQuery({
    queryKey: ["/api/current-price", selectedInstrument],
    refetchInterval: 2000,
  });

  // Fetch active trades
  const { data: activeTrades, refetch: refetchActiveTrades } = useQuery({
    queryKey: ["/api/trades/active"],
    refetchInterval: 5000,
  });

  // Fetch recent trades
  const { data: recentTrades } = useQuery({
    queryKey: ["/api/trades/recent"],
  });

  // Fetch account balance
  const { data: accountData } = useQuery({
    queryKey: ["/api/account-balance"],
    refetchInterval: 5000,
  });

  // Fetch account stats
  const { data: accountStats } = useQuery({
    queryKey: ["/api/account-stats"],
    refetchInterval: 10000,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
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
            <MarketSelector
              selected={selectedInstrument}
              onChange={setSelectedInstrument}
            />
            <TimeframeSelector
              selected={selectedTimeframe}
              onChange={setSelectedTimeframe}
            />
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
        {/* Chart Panel */}
        <div className="mb-8">
          <ChartPanel candles={candles} livePrice={liveChartPrice} />
        </div>

        {/* Trade Setup */}
        <TradeSetup
          selectedInstrument={selectedInstrument}
          currentPrice={currentPrice}
          onTradeSuccess={() => {
            refetchActiveTrades();
            queryClient.invalidateQueries({ queryKey: ["/api/trades/recent"] });
            queryClient.invalidateQueries({ queryKey: ["/api/account-stats"] });
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
              queryClient.invalidateQueries({ queryKey: ["/api/trades/recent"] });
              queryClient.invalidateQueries({ queryKey: ["/api/account-stats"] });
            }}
          />

          {/* Recent Trades */}
          <RecentTrades trades={recentTrades || []} />
        </div>
      </main>
    </div>
  );
}
