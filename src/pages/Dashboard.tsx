import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, User, Wallet, Copy, Check, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiGetUser, apiGetPublicSettings, apiPaymentFeedback, clearSession } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { KeySubmitter } from "@/components/KeySubmitter";
import { WithdrawForm } from "@/components/WithdrawForm";
import { TransactionList } from "@/components/TransactionList";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: apiGetUser,
    refetchInterval: 10000,
  });

  const { data: publicSettings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: apiGetPublicSettings,
  });

  const paymentMutation = useMutation({
    mutationFn: (status: "received" | "not_received") => apiPaymentFeedback(status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({ title: "আপনার ফিডব্যাক জমা হয়েছে" });
    },
  });

  useEffect(() => {
    if (!isLoading && !user) navigate("/");
  }, [isLoading, user, navigate]);

  const copyId = () => {
    if (user?.guest_id) {
      navigator.clipboard.writeText(user.guest_id);
      setCopied(true);
      toast({ title: "ID কপি করা হয়েছে" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const bonusEnabled = publicSettings?.bonusStatus === "on";
  const targetAmount = publicSettings?.bonusTarget || 10;
  const currentProgress = (user.key_count || 0) % targetAmount;

  return (
    <div className="min-h-screen pb-24 relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Payment confirmation modal */}
      <AnimatePresence>
        {user.payment_status === "pending" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-8 rounded-3xl w-full max-w-sm text-center space-y-6 border-2 border-primary/30">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Wallet className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">পেমেন্ট পেয়েছেন?</h2>
                <p className="text-muted-foreground">আপনার পূর্বের কাজের পেমেন্ট কি আপনি বুঝে পেয়েছেন?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => paymentMutation.mutate("received")} className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-14 text-lg font-black" disabled={paymentMutation.isPending}>
                  হ্যাঁ
                </button>
                <button onClick={() => paymentMutation.mutate("not_received")} className="btn-destructive h-14 text-lg font-black" disabled={paymentMutation.isPending}>
                  না
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b-0 rounded-none bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center border border-border">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">স্বাগতম,</p>
              <p className="font-bold text-sm truncate max-w-[120px]">{user.display_name || user.guest_id}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground font-mono">ID: {user.guest_id}</p>
                <button onClick={copyId} className="p-1 hover:bg-secondary rounded transition-colors">
                  {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                </button>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6 relative z-10">
        {/* Custom Notice */}
        {publicSettings?.customNotice && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/20 border-2 border-primary/40 rounded-2xl p-6 flex items-start gap-4">
            <Bell className="w-10 h-10 text-primary shrink-0" />
            <div>
              <h3 className="font-bold text-primary mb-1">বিজ্ঞপ্তি</h3>
              <p className="text-sm text-foreground/80">{publicSettings.customNotice}</p>
            </div>
          </motion.div>
        )}

        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-6 border-2 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground text-sm">মোট ব্যালেন্স</p>
            <div className="px-3 py-1 bg-primary/20 rounded-full text-xs text-primary font-bold">
              {user.key_count} কি সাবমিট
            </div>
          </div>
          <p className="text-4xl font-black text-primary">{user.balance} <span className="text-lg text-muted-foreground">TK</span></p>

          {bonusEnabled && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>বোনাস প্রগ্রেস</span>
                <span>{currentProgress}/{targetAmount}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(currentProgress / targetAmount) * 100}%` }} />
              </div>
            </div>
          )}
        </motion.div>

        {/* Key Submitter */}
        <KeySubmitter userGuestId={user.guest_id} />

        {/* Withdraw Form */}
        <WithdrawForm balance={user.balance} />

        {/* Recent History */}
        <div>
          <h2 className="text-lg font-bold mb-4">Recent History</h2>
          <TransactionList />
        </div>
      </main>
    </div>
  );
}
