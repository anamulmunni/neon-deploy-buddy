import { useQuery } from "@tanstack/react-query";
import { History, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { apiGetTransactions } from "@/lib/api";

export function TransactionList() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: apiGetTransactions,
  });

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">ইতিহাস লোড হচ্ছে...</div>;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center glass-card rounded-2xl">
        <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">এখনো কোনো ভেরিফিকেশন হয়নি</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border bg-secondary/30">
        <h3 className="font-semibold flex items-center gap-2">
          <History className="w-4 h-4 text-primary" /> ভেরিফিকেশন হিস্ট্রি
        </h3>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {transactions.map((tx: any, index: number) => {
          return (
            <div key={tx.id} className="p-4 hover:bg-secondary/30 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">ভেরিফিকেশন #{transactions.length - index}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString("bn-BD")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary text-sm">✓ Verified</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
