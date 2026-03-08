import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, User, Copy, Check, Wallet, Shield, History,
  Phone, HeadphonesIcon, Code2, MessageCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { apiGetUser, apiGetTransactions } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "support">("history");

  const { data: user, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: apiGetUser,
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: apiGetTransactions,
  });

  const copyId = () => {
    if (user?.guest_id) {
      navigator.clipboard.writeText(user.guest_id);
      setCopied(true);
      toast({ title: "ID কপি করা হয়েছে" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen pb-10">
      {/* Gradient Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-indigo/20 to-cyan/20 blur-3xl" />
        <div className="relative z-10 pt-6 pb-16 px-4 max-w-md mx-auto">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> ড্যাশবোর্ডে ফিরুন
          </button>

          {/* Profile Avatar */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-accent to-cyan flex items-center justify-center shadow-2xl shadow-primary/30 mb-4">
              <User className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">{user.display_name || "Unknown User"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground font-mono">{user.guest_id}</p>
              <button onClick={copyId} className="p-1 hover:bg-secondary rounded transition-colors">
                {copied ? <Check className="w-3 h-3 text-emerald" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-8 space-y-4 relative z-20">
        {/* Stats Cards */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl p-4 text-center border border-emerald/30">
            <Shield className="w-5 h-5 text-emerald mx-auto mb-1" />
            <p className="text-xl font-bold text-emerald">{user.key_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">ভেরিফাইড</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center border border-amber/30">
            <Wallet className="w-5 h-5 text-amber mx-auto mb-1" />
            <p className="text-xl font-bold text-amber">{user.balance || 0}</p>
            <p className="text-[10px] text-muted-foreground">ব্যালেন্স</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center border border-cyan/30">
            <History className="w-5 h-5 text-cyan mx-auto mb-1" />
            <p className="text-xl font-bold text-cyan">{transactions?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">লেনদেন</p>
          </div>
        </motion.div>

        {/* Account Status */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">অ্যাকাউন্ট স্ট্যাটাস</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.is_blocked ? 'bg-destructive/20 text-destructive' : 'bg-emerald/20 text-emerald'}`}>
              {user.is_blocked ? "ব্লকড" : "সক্রিয়"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">পেমেন্ট স্ট্যাটাস</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              user.payment_status === "received" ? 'bg-emerald/20 text-emerald' :
              user.payment_status === "pending" ? 'bg-amber/20 text-amber' :
              'bg-secondary text-muted-foreground'
            }`}>
              {user.payment_status === "received" ? "পেয়েছি" : user.payment_status === "pending" ? "পেন্ডিং" : "কোনো রিকোয়েস্ট নেই"}
            </span>
          </div>
        </motion.div>

        {/* Tab Switch */}
        <div className="flex gap-2 bg-secondary/50 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "history" ? "bg-indigo text-indigo-foreground shadow-lg" : "text-muted-foreground"
            }`}
          >
            <History className="w-4 h-4" /> হিস্ট্রি
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "support" ? "bg-teal text-teal-foreground shadow-lg" : "text-muted-foreground"
            }`}
          >
            <HeadphonesIcon className="w-4 h-4" /> সাপোর্ট
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "history" ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl overflow-hidden border border-indigo/20">
            {!transactions || transactions.length === 0 ? (
              <div className="p-8 text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">এখনো কোনো লেনদেন হয়নি</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {transactions.map((tx: any, index: number) => (
                  <div key={tx.id} className="p-4 hover:bg-secondary/30 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.type === "earning" ? "bg-emerald/20" : "bg-rose/20"
                      }`}>
                        {tx.type === "earning" ? (
                          <Shield className="w-4 h-4 text-emerald" />
                        ) : (
                          <Wallet className="w-4 h-4 text-rose" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {tx.type === "earning" ? "ভেরিফিকেশন" : "উত্তোলন"} #{transactions.length - index}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString("bn-BD")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${tx.type === "earning" ? "text-emerald" : "text-rose"}`}>
                        {tx.type === "earning" ? "+1 verified" : "withdrawal"}
                      </p>
                      <p className={`text-[10px] font-bold ${
                        tx.status === "completed" ? "text-emerald" : tx.status === "pending" ? "text-amber" : "text-muted-foreground"
                      }`}>
                        {tx.status === "completed" ? "সম্পন্ন" : tx.status === "pending" ? "পেন্ডিং" : tx.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Developer Info */}
            <div className="glass-card rounded-2xl p-6 border border-teal/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal to-cyan flex items-center justify-center">
                  <Code2 className="w-6 h-6 text-teal-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ডেভেলপার</p>
                  <p className="font-bold text-lg">Md Anamul Haque</p>
                </div>
              </div>
              <div className="space-y-3">
                <a href="tel:01892564963" className="flex items-center gap-3 p-3 bg-emerald/10 border border-emerald/20 rounded-xl hover:bg-emerald/20 transition-all">
                  <Phone className="w-5 h-5 text-emerald" />
                  <div>
                    <p className="text-xs text-muted-foreground">ফোন নম্বর</p>
                    <p className="font-bold text-emerald">01892564963</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Support */}
            <div className="glass-card rounded-2xl p-6 border border-rose/20">
              <div className="flex items-center gap-3 mb-4">
                <MessageCircle className="w-6 h-6 text-rose" />
                <h3 className="font-bold text-lg">সাহায্য দরকার?</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                অ্যাপ সংক্রান্ত যেকোনো সমস্যার জন্য ডেভেলপারের সাথে যোগাযোগ করুন। আমরা সবসময় আপনার পাশে আছি।
              </p>
              <div className="space-y-2">
                <a href="tel:01892564963" className="btn-rose py-3">
                  <Phone className="w-4 h-4" /> কল করুন
                </a>
              </div>
            </div>

            <div className="text-center py-4">
              <p className="text-[10px] text-muted-foreground">Secure Earn v1.0 • Built with ❤️ by Md Anamul Haque</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
