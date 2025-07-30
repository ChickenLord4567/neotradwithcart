import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountOverviewProps {
  accountBalance: number;
  accountStats: any;
}

export default function AccountOverview({ accountBalance, accountStats }: AccountOverviewProps) {
  return (
    <Card className="trade-card">
      <CardHeader>
        <CardTitle className="text-xl font-cyber font-bold text-cyan-400">
          Account Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Account Balance</div>
            <div className="text-3xl font-cyber font-bold text-cyan-400 neon-text">
              ${accountBalance.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Total Profit</div>
            <div className="text-2xl font-bold text-blue-400 neon-text">
              ${(accountStats?.totalProfit || 0).toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Total Loss</div>
            <div className="text-2xl font-bold text-purple-400 neon-text">
              ${(accountStats?.totalLoss || 0).toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Total Trades</div>
            <div className="text-2xl font-bold text-white">
              {accountStats?.totalTrades || 0}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
