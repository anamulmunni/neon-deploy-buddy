import { useState } from "react";
import { Wallet, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiWithdraw } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function WithdrawForm({ balance }: { balance: number }) {
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const { toast } = useToast();

  const { mutate: withdraw, isPending } = useMutation({
    mutationFn: () => apiWithdraw(method, number, Number(amount)),
    onSuccess: (data) => {
      setNumber("");
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: data?.message || "সফল" });
    },
    onError: (err: any) => {
      toast({ title: "ব্যর্থ", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !amount) return;
    withdraw();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/20 rounded-lg">
          <Wallet className="w-6 h-6 text-accent" />
        </div>
        <h2 className="text-xl font-bold">টাকা উত্তোলন (Withdraw)</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMethod("bkash")}
            className={`p-3 rounded-xl border-2 transition-all font-semibold ${
              method === "bkash" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            bKash
          </button>
          <button
            type="button"
            onClick={() => setMethod("nagad")}
            className={`p-3 rounded-xl border-2 transition-all font-semibold ${
              method === "nagad" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            Nagad
          </button>
        </div>

        <input type="tel" placeholder="নম্বর লিখুন (01XXXXXXXXX)" value={number} onChange={(e) => setNumber(e.target.value)} className="input-field" />
        <input type="number" placeholder={`পরিমাণ (Min: 50, Max: ${balance})`} value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field" />

        <button type="submit" disabled={isPending || !number || !amount} className="btn-primary py-4">
          {isPending ? <Loader2 className="animate-spin" /> : <><Wallet className="w-5 h-5" /> উত্তোলন করুন</>}
        </button>
      </form>
    </motion.div>
  );
}
