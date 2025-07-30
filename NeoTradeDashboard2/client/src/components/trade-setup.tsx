import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { placeTradeSchema, type PlaceTradeData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TradeSetupProps {
  selectedInstrument: string;
  currentPrice: number;
  onTradeSuccess: () => void;
}

export default function TradeSetup({ selectedInstrument, currentPrice, onTradeSuccess }: TradeSetupProps) {
  const { toast } = useToast();
  
  const form = useForm<PlaceTradeData>({
    resolver: zodResolver(placeTradeSchema),
    defaultValues: {
      instrument: selectedInstrument as any,
      direction: "buy",
      lotSize: 0.01,
      tp1: undefined,
      tp2: undefined,
      sl: undefined,
    },
  });

  const placeTradeMutation = useMutation({
    mutationFn: async (data: PlaceTradeData) => {
      const response = await apiRequest('POST', '/api/place-trade', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Placed Successfully!",
        description: `${data.trade.direction.toUpperCase()} ${data.trade.instrument} at $${data.trade.entryPrice}`,
      });
      onTradeSuccess();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Trade Failed",
        description: error.message || "Failed to place trade",
        variant: "destructive",
      });
    },
  });

  const handleTrade = (direction: "buy" | "sell") => {
    const values = form.getValues();
    placeTradeMutation.mutate({
      ...values,
      instrument: selectedInstrument as any,
      direction,
    });
  };

  // Update instrument when prop changes
  useState(() => {
    form.setValue('instrument', selectedInstrument as any);
  });

  return (
    <Card className="trade-card">
      <CardHeader>
        <CardTitle className="text-xl font-cyber font-bold text-cyan-400">
          Trade Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Current Price</label>
              <Input
                value={`$${currentPrice.toFixed(2)}`}
                readOnly
                className="input-neon text-white"
              />
            </div>
            
            <FormField
              control={form.control}
              name="tp1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400">TP1</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      className="input-neon text-white"
                      placeholder="1950.00"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tp2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400">TP2</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      className="input-neon text-white"
                      placeholder="1952.00"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400">Stop Loss</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      className="input-neon text-white"
                      placeholder="1945.00"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lotSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400">Lot Size</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      className="input-neon text-white"
                      placeholder="0.01"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex space-x-4">
            <Button
              type="button"
              onClick={() => handleTrade("buy")}
              className="btn-neon-blue flex-1 py-4 text-white font-bold text-lg flex items-center justify-center space-x-2"
              disabled={placeTradeMutation.isPending}
            >
              <ArrowUp className="h-5 w-5" />
              <span>BUY</span>
            </Button>
            <Button
              type="button"
              onClick={() => handleTrade("sell")}
              className="btn-neon-purple flex-1 py-4 text-white font-bold text-lg flex items-center justify-center space-x-2"
              disabled={placeTradeMutation.isPending}
            >
              <ArrowDown className="h-5 w-5" />
              <span>SELL</span>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
