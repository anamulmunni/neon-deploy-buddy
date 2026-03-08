import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, User, Wallet, Copy, Check, Bell, Send, Loader2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  apiGetUser, apiGetPublicSettings, apiPaymentFeedback, clearSession,
  apiCheckDuplicates, apiSubmitNumbers, apiLookupUsers
} from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { KeySubmitter } from "@/components/KeySubmitter";
import { TransactionList } from "@/components/TransactionList";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showTelegramAdmin, setShowTelegramAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [batchNumbers, setBatchNumbers] = useState("");
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [serverDuplicates, setServerDuplicates] = useState<string[]>([]);
  const [lookupResults, setLookupResults] = useState<any[]>([]);

  const lookupTimerRef = useRef<any>(null);
  const dupCheckTimerRef = useRef<any>(null);

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

  const submitNumbersMutation = useMutation({
    mutationFn: (numbers: string[]) => apiSubmitNumbers(numbers, adminName, paymentNumber || undefined, paymentNumber ? paymentMethod : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setBatchNumbers("");
      setPaymentNumber("");
      setServerDuplicates([]);
      toast({ title: "সফলভাবে সাবমিট করা হয়েছে" });
    },
    onError: () => {
      toast({ title: "সব নম্বর ইতিমধ্যে সাবমিট করা হয়েছে", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!isLoading && !user) navigate("/");
  }, [isLoading, user, navigate]);

  const checkServerDups = async (nums: string[]) => {
    try {
      const dups = await apiCheckDuplicates(nums);
      setServerDuplicates(dups);
    } catch {
      setServerDuplicates([]);
    }
  };

  const lookupNums = async (nums: string[]) => {
    try {
      const results = await apiLookupUsers(nums);
      setLookupResults(results);
    } catch {
      setLookupResults([]);
    }
  };

  const handleBatchNumbersChange = (val: string) => {
    setBatchNumbers(val);
    const lines = val.split("\n").map(l => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    const dups = new Set<string>();
    lines.forEach(num => {
      if (seen.has(num)) dups.add(num);
      seen.add(num);
    });
    setDuplicates(Array.from(dups));
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    if (dupCheckTimerRef.current) clearTimeout(dupCheckTimerRef.current);
    if (lines.length > 0) {
      lookupTimerRef.current = setTimeout(() => lookupNums(lines), 500);
      dupCheckTimerRef.current = setTimeout(() => checkServerDups(lines), 500);
    } else {
      setLookupResults([]);
      setServerDuplicates([]);
    }
  };

  const removeDuplicate = (num: string) => {
    const lines = batchNumbers.split("\n").map(l => l.trim()).filter(Boolean);
    const firstIndex = lines.indexOf(num);
    const filtered = lines.filter((l, idx) => l !== num || idx === firstIndex);
    setBatchNumbers(filtered.join("\n"));
    setDuplicates(duplicates.filter(d => d !== num));
  };

  const getBatchInfo = () => {
    const lines = batchNumbers.split("\n").map(l => l.trim()).filter(Boolean);
    let totalVerified = 0;
    const details = lines.map(num => {
      const u = lookupResults?.find((u: any) => u.guestId === num);
      totalVerified += u?.keyCount || 0;
      return { num, count: u?.keyCount || 0 };
    });
    return { totalVerified, details };
  };

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
  const customNoticeText = publicSettings?.customNotice;

  return (
    <div className="min-h-screen pb-24 relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Payment confirmation modal */}
      <AnimatePresence>
        {user.payment_status === "pending" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-card p-8 rounded-3xl w-full max-w-sm text-center space-y-6 border-2 border-primary/30 shadow-2xl shadow-primary/20">
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
          <button onClick={() => navigate("/profile")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-primary via-accent to-cyan rounded-full flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
              {(user as any).avatar_url ? (
                <img src={(user as any).avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">স্বাগতম,</p>
              <div className="flex flex-col">
                <p className="font-bold text-sm truncate max-w-[120px]">{user.display_name || user.guest_id}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground font-mono">ID: {user.guest_id}</p>
                  <button onClick={(e) => { e.stopPropagation(); copyId(); }} className="p-1 hover:bg-secondary rounded transition-colors">
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            </div>
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6 relative z-10">
        {/* Telegram Admin Section */}
        <section className="glass-card p-6 rounded-3xl border-2 border-cyan/30">
          <button onClick={() => setShowTelegramAdmin(!showTelegramAdmin)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 text-cyan">
              <Send className="w-6 h-6" />
              <h2 className="text-xl font-bold">Payment Request Only Telegram Admin</h2>
            </div>
          </button>

          <AnimatePresence>
            {showTelegramAdmin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-6 space-y-4">
                {!isPasswordVerified ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">পাসওয়ার্ড দিন:</p>
                    <input
                      type="password"
                      placeholder="পাসওয়ার্ড..."
                      className="input-field"
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        if (e.target.value === "anamul984516") setIsPasswordVerified(true);
                      }}
                    />
                  </div>
                ) : !isNameSet ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">আপনার নাম লিখুন:</p>
                    <input type="text" placeholder="আপনার নাম..." className="input-field" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                    <button onClick={() => { if (adminName.trim()) setIsNameSet(true); }} className="btn-primary py-3 font-black" disabled={!adminName.trim()}>
                      এগিয়ে যান
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-secondary/50 p-4 rounded-xl border border-border">
                      <p className="text-sm font-bold mb-2">Total Verified: <span className="text-primary">{getBatchInfo().totalVerified}</span></p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {getBatchInfo().details.map((d, i) => (
                          <p key={i} className="text-xs flex justify-between">
                            <span>{d.num}</span>
                            <span className="text-primary font-bold">{d.count} টা</span>
                          </p>
                        ))}
                      </div>
                    </div>
                    <textarea
                      placeholder="ইউজার নম্বরগুলো দিন (প্রতি লাইনে একটি)..."
                      className={`input-field min-h-[120px] font-mono text-sm ${duplicates.length > 0 ? 'border-destructive' : ''}`}
                      value={batchNumbers}
                      onChange={(e) => handleBatchNumbersChange(e.target.value)}
                    />
                    {duplicates.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 space-y-2">
                        <p className="text-xs text-destructive font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> ডুপ্লিকেট নম্বর পাওয়া গেছে (একই লিস্টে):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {duplicates.map(num => (
                            <div key={num} className="bg-destructive/20 text-destructive text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                              {num}
                              <button onClick={() => removeDuplicate(num)} className="hover:text-foreground">
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {serverDuplicates.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
                        <p className="text-xs text-amber-500 font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> এই নম্বরগুলো আগেই সাবমিট করা হয়েছে:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {serverDuplicates.map(num => (
                            <div key={num} className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-1 rounded-md font-mono font-bold">
                              {num}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-amber-400/70">এগুলো সরিয়ে দিন, তারপর সাবমিট করুন</p>
                      </div>
                    )}
                    <div className="bg-secondary/50 p-4 rounded-xl border border-border space-y-3">
                      <p className="text-sm font-bold text-muted-foreground">পেমেন্ট নম্বর (bKash/Nagad)</p>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 bg-secondary p-1 rounded-xl border border-border">
                          <button onClick={() => setPaymentMethod("bkash")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'bkash' ? 'bg-pink-500 text-pink-50 shadow-lg' : 'text-muted-foreground'}`}>
                            bKash
                          </button>
                          <button onClick={() => setPaymentMethod("nagad")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'nagad' ? 'bg-orange-500 text-orange-50 shadow-lg' : 'text-muted-foreground'}`}>
                            Nagad
                          </button>
                        </div>
                        <input type="text" placeholder="01XXXXXXXXX" value={paymentNumber} onChange={(e) => setPaymentNumber(e.target.value)} className="input-field flex-1" />
                      </div>
                    </div>
                    {(duplicates.length > 0 || serverDuplicates.length > 0) ? (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
                        <p className="text-sm text-destructive font-bold">ডুপ্লিকেট নম্বর সরান, তারপর সাবমিট করুন</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => submitNumbersMutation.mutate(batchNumbers.split("\n").map(l => l.trim()).filter(Boolean))}
                        className="btn-primary py-4 font-black"
                        disabled={submitNumbersMutation.isPending || !batchNumbers.trim()}
                      >
                        {submitNumbersMutation.isPending ? <Loader2 className="animate-spin" /> : <><Send className="w-5 h-5" /> Submit Request</>}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Custom Notice */}
        <AnimatePresence>
          {customNoticeText && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-amber/20 border-2 border-amber/40 rounded-2xl p-6 flex items-start gap-4 shadow-xl shadow-amber/10">
              <Bell className="w-10 h-10 text-amber shrink-0" />
              <p className="text-xl font-black leading-tight whitespace-pre-wrap">{customNoticeText}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bonus Section */}
        {bonusEnabled && (
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/50 rounded-2xl p-6 text-center shadow-lg shadow-yellow-500/10">
              <p className="text-xl font-black text-yellow-500 mb-2">🔥 ধামাকা বোনাস অফার! 🔥</p>
              <p className="text-sm font-bold leading-relaxed">
                ১ দিনে {targetAmount}টি অ্যাকাউন্ট ভেরিফাই করতে পারলে বর্তমান দামের সাথে আরও <span className="text-yellow-500 text-lg">২০% বোনাস</span> দেওয়া হবে প্রত্যেক অ্যাকাউন্টে!
              </p>
            </motion.div>

            <div className="glass-card p-5 rounded-3xl border border-border">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-bold">আজকের টার্গেট (Bonus)</p>
                <p className="text-xs font-mono bg-primary/20 text-primary px-2 py-1 rounded-lg">{user.key_count}/{targetAmount}</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: targetAmount }, (_, i) => {
                  const done = i < user.key_count;
                  return (
                    <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.05 }} className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${done ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20' : 'bg-secondary/50 border-border'}`}>
                      {done ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: i * 0.05 }}>
                          <Check className="w-5 h-5 text-primary" />
                        </motion.div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-bold">{i + 1}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              {user.key_count >= targetAmount ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center">
                  <p className="text-emerald-400 font-bold text-sm">🎉 আপনি বোনাসের জন্য এলিজিবল হয়েছেন!</p>
                  <p className="text-[10px] text-emerald-200/70">নির্ধারিত এডমিনের কাছ থেকে বোনাসের টাকা গ্রহণ করুন।</p>
                </motion.div>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-3 text-center">{targetAmount}টি টার্গেট পূর্ণ হলে বোনাস আনলক হবে</p>
              )}
            </div>
          </div>
        )}

        {/* Verified Key Count Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-emerald via-teal to-cyan rounded-3xl p-8 shadow-2xl shadow-emerald/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-foreground/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan/20 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-emerald-foreground/80 font-medium mb-1">মোট ভেরিফাইড কি</p>
              <h1 className="text-5xl font-bold tracking-tight text-emerald-foreground">{user.key_count || 0}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-foreground/60 text-sm relative z-10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            লাইভ আপডেট সক্রিয়
          </div>
        </motion.div>

        {/* Important Notice */}
        <div className="bg-rose/10 border border-rose/20 rounded-2xl p-4 text-rose">
          <p className="text-sm font-bold mb-1">গুরুত্বপূর্ণ নোটিশ:</p>
          <div className="space-y-2 text-xs leading-relaxed">
            <p>সবাইকে জানানো যাচ্ছে যে, একটি প্রাইভেট কি শুধুমাত্র একবারই সাবমিট করা যাবে। একই কি বারবার সাবমিট করলে আপনার অ্যাকাউন্টটি ব্লক করে দেওয়া হতে পারে।</p>
            <p className="font-bold border-t border-rose/20 pt-2">Account verified করে স্থানীয় অ্যাডমিনের কাছ থেকে নির্ধারিত পরিমাণ টাকা বুঝে নিন।</p>
          </div>
        </div>

        {/* Key Submitter */}
        <KeySubmitter userGuestId={user.guest_id} />

        {/* Recent History */}
        <div className="pt-4">
          <h3 className="text-lg font-bold mb-4 px-2">Recent History</h3>
          <TransactionList />
        </div>
      </main>
    </div>
  );
}
