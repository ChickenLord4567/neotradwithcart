import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function HistoricalAnalysis() {
  // Fetch account stats for real data
  const { data: accountStats } = useQuery({
    queryKey: ['/api/account-stats'],
    refetchInterval: 10000,
  });

  // Calculate performance periods from real data
  const winRate = accountStats?.winRate || 0;
  const totalTrades = accountStats?.totalTrades || 0;
  const wins = Math.floor((winRate / 100) * totalTrades);
  const losses = totalTrades - wins;

  const timeperiods = [
    { label: "Total", wins, losses, winPercentage: Math.round(winRate) },
    { label: "YTD", wins, losses, winPercentage: Math.round(winRate) },
    { label: "90D", wins, losses, winPercentage: Math.round(winRate) },
    { label: "30D", wins, losses, winPercentage: Math.round(winRate) },
  ];
  return (
    <Card className="trade-card">
      <CardHeader>
        <CardTitle className="text-xl font-cyber font-bold text-cyan-400">
          Performance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeperiods.map((period) => (
            <div key={period.label} className="flex items-center justify-between">
              <div className="w-20 text-sm text-gray-400">{period.label}</div>
              <div className="flex-1 mx-4">
                <div className="progress-bar-bg h-6 rounded-full relative overflow-hidden neon-border">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-400 absolute left-0 rounded-full"
                    style={{ width: `${period.winPercentage}%` }}
                  />
                </div>
              </div>
              <div className="w-32 text-right">
                <span className="text-blue-400 font-bold">{period.wins}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-purple-400 font-bold">{period.losses}</span>
                <div className="text-xs text-gray-400">{period.winPercentage}% Win Rate</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
