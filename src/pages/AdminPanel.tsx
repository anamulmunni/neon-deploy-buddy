import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ShieldCheck,
  UserX,
  UserCheck,
  Loader2,
  Coins,
  Search,
  Users,
  Send,
  History,
  RefreshCcw,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Key,
  Settings,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  apiAdminLogin,
  apiAdminGetUsers,
  apiAdminToggleBlock,
  apiAdminUpdateBalance,
  apiAdminGetSettings,
  apiAdminUpdateSettings,
  apiAdminGetSubmittedNumbers,
  apiAdminGetResetHistory,
  apiAdminDeleteSubmittedNumber,
  apiAdminResetSubmittedNumber,
  apiAdminResetAllSubmittedNumbers,
  apiGetPoolStats,
  apiDeleteUsedKeys,
} from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [showSubmittedNumbers, setShowSubmittedNumbers] = useState(true);
  const [showResetHistory, setShowResetHistory] = useState(false);
  const [resetHistorySearch, setResetHistorySearch] = useState("");
  const [bonusTargetInput, setBonusTargetInput] = useState("");
  const [rewardRateInput, setRewardRateInput] = useState("");
  const [showVerifiedUsers, setShowVerifiedUsers] = useState(false);
  const { toast } = useToast();

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: apiAdminGetUsers,
    enabled: isLoggedIn,
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: apiAdminGetSettings,
    enabled: isLoggedIn,
  });

  const { data: pool } = useQuery({
    queryKey: ["admin-pool-stats"],
    queryFn: apiGetPoolStats,
    enabled: isLoggedIn,
  });

  const { data: submittedNumbers } = useQuery({
    queryKey: ["admin-submitted-numbers"],
    queryFn: apiAdminGetSubmittedNumbers,
    enabled: isLoggedIn,
  });

  const { data: resetHistory } = useQuery({
    queryKey: ["admin-reset-history"],
    queryFn: apiAdminGetResetHistory,
    enabled: isLoggedIn && showResetHistory,
  });

  const handleLogin = async () => {
    const ok = await apiAdminLogin(password);
    if (ok) {
      setIsLoggedIn(true);
      toast({ title: "এডমিন লগিন সফল" });
    } else {
      toast({ title: "ভুল পাসওয়ার্ড", variant: "destructive" });
    }
  };

  const toggleBlockMutation = useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: number; isBlocked: boolean }) =>
      apiAdminToggleBlock(userId, isBlocked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const updateBalanceMutation = useMutation({
    mutationFn: ({ userId, balance }: { userId: number; balance: number }) =>
      apiAdminUpdateBalance(userId, balance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUserId(null);
      setNewBalance("");
      toast({ title: "ব্যালেন্স আপডেট হয়েছে" });
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => apiAdminUpdateSettings(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
  });

  const resetSubmittedMutation = useMutation({
    mutationFn: (id: number) => apiAdminResetSubmittedNumber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submitted-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reset-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "রিসেট সম্পন্ন হয়েছে" });
    },
  });

  const clearSubmittedMutation = useMutation({
    mutationFn: apiAdminResetAllSubmittedNumbers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submitted-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reset-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "সব সাবমিটেড নম্বর রিসেট হয়েছে" });
    },
  });

  const deleteSubmittedMutation = useMutation({
    mutationFn: (id: number) => apiAdminDeleteSubmittedNumber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submitted-numbers"] });
      toast({ title: "নম্বর ডিলিট হয়েছে" });
    },
  });

  const deleteUsedKeysMutation = useMutation({
    mutationFn: apiDeleteUsedKeys,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pool-stats"] });
      toast({ title: "সব ব্যবহৃত কি ডিলিট হয়েছে" });
    },
  });

  useEffect(() => {
    if (settings?.bonusTarget) setBonusTargetInput(String(settings.bonusTarget));
    if (settings?.rewardRate) setRewardRateInput(String(settings.rewardRate));
  }, [settings?.bonusTarget, settings?.rewardRate]);

  const totalUsers = users?.length || 0;

  const usersWithVerified = useMemo(
    () => (users || []).filter((u: any) => (u.key_count || 0) >= 1),
    [users],
  );

  const totalReadyKeys = useMemo(
    () => (pool || []).filter((item: any) => !item.is_used).length,
    [pool],
  );

  const totalUsedKeys = useMemo(
    () => (pool || []).filter((item: any) => item.is_used).length,
    [pool],
  );

  const filteredUsers =
    users?.filter(
      (u: any) => u.guest_id?.includes(searchQuery) || u.display_name?.includes(searchQuery),
    ) || [];

  const groupedSubmitted = useMemo(() => {
    const source = submittedNumbers || [];
    return source.reduce((acc: Record<string, any[]>, row: any) => {
      const admin = row.submitted_by || "Unknown";
      if (!acc[admin]) acc[admin] = [];
      acc[admin].push(row);
      return acc;
    }, {});
  }, [submittedNumbers]);

  const filteredResetHistory = useMemo(() => {
    const source = resetHistory || [];
    if (!resetHistorySearch.trim()) return source;
    return source.filter((row: any) => row.phone_number?.includes(resetHistorySearch.trim()));
  }, [resetHistory, resetHistorySearch]);

  const totalVerifiedSubmitted = useMemo(
    () => (submittedNumbers || []).reduce((sum: number, row: any) => sum + (row.verified_count || 0), 0),
    [submittedNumbers],
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 rounded-3xl w-full max-w-sm space-y-6"
        >
          <div className="text-center">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <input
            type="password"
            placeholder="পাসওয়ার্ড..."
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <button onClick={handleLogin} className="btn-primary py-3">
            লগিন করুন
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4 text-center border border-primary/20">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">মোট ইউজার</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center border border-primary/20">
         <Key className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{totalReadyKeys}</p>
            <p className="text-xs text-muted-foreground">রেডি কি ({totalUsedKeys} ব্যবহৃত)</p>
          </div>
        </div>

        {/* Pool Keys Management */}
        <section className="glass-card rounded-2xl p-6 space-y-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">পুল কি ম্যানেজমেন্ট</h2>
            </div>
            <p className="text-xs text-muted-foreground">{(pool || []).length} টি মোট</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                const all = (pool || []).map((k: any) => `${k.private_key} | ${k.verify_url} | ${k.is_used ? "USED" : "READY"} | ${k.added_by}`).join("\n");
                navigator.clipboard.writeText(all);
                toast({ title: "সব কি কপি হয়েছে" });
              }}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-secondary rounded-xl text-xs font-bold hover:bg-secondary/80 transition-colors"
            >
              <Copy className="w-4 h-4" /> সব কপি
            </button>
            <button
              onClick={() => {
                const ready = (pool || []).filter((k: any) => !k.is_used).map((k: any) => `${k.private_key} | ${k.verify_url}`).join("\n");
                navigator.clipboard.writeText(ready);
                toast({ title: "রেডি কি কপি হয়েছে" });
              }}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/30 transition-colors"
            >
              <Copy className="w-4 h-4" /> রেডি কপি
            </button>
          </div>

          <button
            onClick={() => {
              if (confirm("সব ব্যবহৃত কি ডিলিট করতে চান?")) deleteUsedKeysMutation.mutate();
            }}
            disabled={deleteUsedKeysMutation.isPending || totalUsedKeys === 0}
            className="w-full flex items-center justify-center gap-2 p-3 bg-destructive/20 text-destructive rounded-xl text-xs font-bold hover:bg-destructive/30 transition-colors disabled:opacity-50"
          >
            {deleteUsedKeysMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> ব্যবহৃত কি ডিলিট ({totalUsedKeys})</>}
          </button>

          {(pool || []).length > 0 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(pool || []).map((k: any) => (
                <div key={k.id} className={`p-3 rounded-xl border text-xs space-y-1 ${k.is_used ? 'bg-destructive/5 border-destructive/20' : 'bg-primary/5 border-primary/20'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${k.is_used ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                      {k.is_used ? "USED" : "READY"}
                    </span>
                    <span className="text-muted-foreground">{k.added_by}</span>
                  </div>
                  <p className="font-mono truncate">{k.private_key}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(k.private_key); toast({ title: "কপি হয়েছে" }); }}
                    className="text-primary hover:underline text-[10px]"
                  >
                    কপি
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>


        {/* 1+ Verified Users Section */}
        <section className="glass-card rounded-2xl p-6 space-y-4 border border-emerald-500/20">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowVerifiedUsers((v) => !v)}
          >
            <div className="flex items-center gap-2 text-left">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              <div>
                <h2 className="font-bold text-lg">1+ ভেরিফাইড ইউজার</h2>
                <p className="text-xs text-muted-foreground">
                  মোট: {usersWithVerified.length} জন
                </p>
              </div>
            </div>
            {showVerifiedUsers ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showVerifiedUsers && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {usersWithVerified.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">কোনো ভেরিফাইড ইউজার নেই</p>
              ) : (
                usersWithVerified.map((u: any) => (
                  <div key={u.id} className="rounded-xl border border-border bg-secondary/30 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm">{u.display_name || "No Name"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{u.guest_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-bold text-sm">{u.key_count} verified</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Settings */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">সেটিংস</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                updateSettingMutation.mutate({
                  key: "buyStatus",
                  value: settings?.buyStatus === "on" ? "off" : "on",
                })
              }
              className={`p-3 rounded-xl font-bold text-sm border ${
                settings?.buyStatus === "on"
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-destructive/20 text-destructive border-destructive/30"
              }`}
            >
              Buy: {settings?.buyStatus || "on"}
            </button>
            <button
              onClick={() =>
                updateSettingMutation.mutate({
                  key: "bonusStatus",
                  value: settings?.bonusStatus === "on" ? "off" : "on",
                })
              }
              className={`p-3 rounded-xl font-bold text-sm border ${
                settings?.bonusStatus === "on"
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              Bonus: {settings?.bonusStatus || "off"}
            </button>
          </div>

          {/* Bonus Target Customization */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold">বোনাস টার্গেট কাউন্ট</p>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={bonusTargetInput}
                onChange={(e) => setBonusTargetInput(e.target.value)}
                className="input-field flex-1"
                placeholder="যেমন: 10"
              />
              <button
                onClick={() => {
                  if (bonusTargetInput) {
                    updateSettingMutation.mutate({ key: "bonusTarget", value: bonusTargetInput });
                    toast({ title: `বোনাস টার্গেট ${bonusTargetInput} সেট হয়েছে` });
                  }
                }}
                className="btn-primary w-auto px-4"
                disabled={!bonusTargetInput}
              >
                সেভ
              </button>
            </div>
          </div>

          {/* Reward Rate Customization */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold">Reward Rate (প্রতি কি)</p>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={rewardRateInput}
                onChange={(e) => setRewardRateInput(e.target.value)}
                className="input-field flex-1"
                placeholder="যেমন: 40"
              />
              <button
                onClick={() => {
                  if (rewardRateInput) {
                    updateSettingMutation.mutate({ key: "rewardRate", value: rewardRateInput });
                    toast({ title: `Reward Rate ${rewardRateInput} সেট হয়েছে` });
                  }
                }}
                className="btn-primary w-auto px-4"
                disabled={!rewardRateInput}
              >
                সেভ
              </button>
            </div>
          </div>

          {/* Custom Notice */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-sm font-bold">কাস্টম নোটিশ</p>
            <div className="flex gap-2">
              <input
                type="text"
                defaultValue={settings?.customNotice || ""}
                id="customNoticeInput"
                className="input-field flex-1"
                placeholder="নোটিশ লিখুন..."
              />
              <button
                onClick={() => {
                  const val = (document.getElementById("customNoticeInput") as HTMLInputElement)?.value || "";
                  updateSettingMutation.mutate({ key: "customNotice", value: val });
                  toast({ title: "নোটিশ আপডেট হয়েছে" });
                }}
                className="btn-primary w-auto px-4"
              >
                সেভ
              </button>
            </div>
          </div>
        </div>

        {/* Submitted Numbers */}
        <section className="glass-card rounded-2xl p-6 space-y-4 border border-primary/20">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowSubmittedNumbers((v) => !v)}
          >
            <div className="flex items-center gap-2 text-left">
              <Send className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-bold text-lg">সাবমিটেড নম্বর লিস্ট</h2>
                <p className="text-xs text-muted-foreground">
                  মোট: {submittedNumbers?.length || 0} • Verified: {totalVerifiedSubmitted}
                </p>
              </div>
            </div>
            {showSubmittedNumbers ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showSubmittedNumbers && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => clearSubmittedMutation.mutate()}
                  disabled={clearSubmittedMutation.isPending || !(submittedNumbers?.length || 0)}
                  className="px-3 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {clearSubmittedMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCcw className="w-4 h-4" /> Reset All
                    </>
                  )}
                </button>
              </div>

              {Object.entries(groupedSubmitted).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">কোনো সাবমিটেড নম্বর নেই</p>
              ) : (
                Object.entries(groupedSubmitted).map(([adminName, rows]) => {
                  const firstRow: any = rows[0];
                  return (
                    <div key={adminName} className="rounded-xl border border-border bg-secondary/30">
                      <div className="p-4 border-b border-border space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-sm flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> {adminName}
                          </p>
                          <p className="text-xs text-muted-foreground">{rows.length} টি নম্বর</p>
                        </div>
                        {firstRow?.payment_number && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono">{firstRow.payment_number}</span>
                            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary uppercase">
                              {firstRow.payment_method || "payment"}
                            </span>
                            <button
                              className="p-1 rounded hover:bg-secondary"
                              onClick={() => {
                                navigator.clipboard.writeText(firstRow.payment_number);
                                toast({ title: "নম্বর কপি হয়েছে" });
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
                        {(rows as any[]).map((row: any) => (
                          <div key={row.id} className="rounded-lg border border-border bg-background/60 p-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-sm">{row.phone_number}</p>
                              <p className="text-xs text-muted-foreground">Verified: {row.verified_count || 0}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80"
                                onClick={() => resetSubmittedMutation.mutate(row.id)}
                                title="Reset"
                              >
                                <RefreshCcw className="w-4 h-4 text-primary" />
                              </button>
                              <button
                                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80"
                                onClick={() => deleteSubmittedMutation.mutate(row.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* Reset History */}
        <section className="glass-card rounded-2xl p-6 space-y-4 border border-primary/20">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowResetHistory((v) => !v)}
          >
            <div className="flex items-center gap-2 text-left">
              <History className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-bold text-lg">রিসেট হিস্ট্রি</h2>
                <p className="text-xs text-muted-foreground">রিসেট করা সব নম্বরের হিসাব</p>
              </div>
            </div>
            {showResetHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showResetHistory && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="নম্বর দিয়ে সার্চ..."
                  className="input-field pl-10"
                  value={resetHistorySearch}
                  onChange={(e) => setResetHistorySearch(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {filteredResetHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">কোনো হিস্ট্রি নেই</p>
                ) : (
                  filteredResetHistory.map((row: any) => (
                    <div key={row.id} className="rounded-xl border border-border bg-secondary/20 p-3 space-y-1">
                      <div className="flex justify-between items-center gap-3">
                        <p className="font-mono text-sm">{row.phone_number}</p>
                        <p className="text-xs text-primary font-bold">Verified: {row.verified_count || 0}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <p>Admin: {row.submitted_by || "Unknown"}</p>
                        <p>{new Date(row.reset_at).toLocaleString("bn-BD")}</p>
                      </div>
                      {row.payment_number && (
                        <p className="text-xs text-muted-foreground">
                          {row.payment_method || "payment"}: <span className="font-mono">{row.payment_number}</span>
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {/* Users List */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">ইউজার ({filteredUsers.length})</h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="সার্চ..."
              className="input-field pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredUsers.map((u: any) => (
              <div key={u.id} className="p-4 bg-secondary/50 rounded-xl border border-border space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{u.display_name || "No Name"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{u.guest_id}</p>
                  </div>
                  <button
                    onClick={() =>
                      toggleBlockMutation.mutate({ userId: u.id, isBlocked: !u.is_blocked })
                    }
                    className={`p-2 rounded-lg ${
                      u.is_blocked ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                    }`}
                  >
                    {u.is_blocked ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    Verified: <span className="text-primary font-bold">{u.key_count}</span>
                  </span>
                  <span>
                    Balance: <span className="text-primary font-bold">{u.balance} TK</span>
                  </span>
                </div>

                {editingUserId === u.id ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      className="input-field flex-1"
                      placeholder="নতুন ব্যালেন্স"
                    />
                    <button
                      onClick={() =>
                        updateBalanceMutation.mutate({
                          userId: u.id,
                          balance: Number.parseInt(newBalance, 10),
                        })
                      }
                      className="btn-primary w-auto px-4"
                      disabled={!newBalance}
                    >
                      {updateBalanceMutation.isPending ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        <Coins className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingUserId(u.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    ব্যালেন্স পরিবর্তন
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
