import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface RecentTradesProps {
  trades: any[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <Card className="trade-card">
      <CardHeader>
        <CardTitle className="text-xl font-cyber font-bold text-cyan-400">
          Recent Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="neon-border border-b border-cyan-400/30">
                <th className="text-left py-2 text-cyan-400">Date</th>
                <th className="text-left py-2 text-cyan-400">Pair</th>
                <th className="text-right py-2 text-cyan-400">Entry</th>
                <th className="text-right py-2 text-cyan-400">P/L</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-gray-400 py-8">
                    No recent trades
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-white/5">
                    <td className="py-3 text-gray-300">
                      {trade.dateClosed ? format(new Date(trade.dateClosed), 'yyyy-MM-dd') : '-'}
                    </td>
                    <td className="py-3 text-white">{trade.instrument}</td>
                    <td className="py-3 text-right text-white">
                      ${trade.entryPrice?.toFixed(2)}
                    </td>
                    <td className={`py-3 text-right font-bold ${
                      trade.isProfit ? 'text-blue-400' : 'text-purple-400'
                    }`}>
                      {trade.profitLoss > 0 ? '+' : ''}${trade.profitLoss?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
