import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, History, CheckCircle2, Clock, XCircle } from "lucide-react";
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
        <p className="text-muted-foreground">এখনো কোনো লেনদেন হয়নি</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border bg-secondary/30">
        <h3 className="font-semibold flex items-center gap-2">
          <History className="w-4 h-4 text-primary" /> সাম্প্রতিক ইতিহাস
        </h3>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {transactions.map((tx: any) => {
          const isPending = tx.status === "pending";
          const isRejected = tx.status === "rejected";
          const isEarning = tx.type === "earning";

          return (
            <div key={tx.id} className="p-4 hover:bg-secondary/30 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isEarning ? "bg-primary/20" : "bg-destructive/20"}`}>
                  {isEarning ? <ArrowDownLeft className="w-4 h-4 text-primary" /> : <ArrowUpRight className="w-4 h-4 text-destructive" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">{isEarning ? "আয়" : "উত্তোলন"}</p>
                  <p className="text-xs text-muted-foreground">{tx.details}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${isEarning ? "text-primary" : "text-destructive"}`}>
                  {isEarning ? "+" : "-"}{tx.amount} TK
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {isPending ? (
                    <><Clock className="w-3 h-3 text-yellow-500" /> <span className="text-yellow-500">Pending</span></>
                  ) : isRejected ? (
                    <><XCircle className="w-3 h-3 text-destructive" /> <span className="text-destructive">Rejected</span></>
                  ) : (
                    <><CheckCircle2 className="w-3 h-3 text-primary" /> <span className="text-primary">Done</span></>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
