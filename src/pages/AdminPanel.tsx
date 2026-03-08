import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShieldCheck, UserX, UserCheck, Loader2, Coins, Search, Users } from "lucide-react";
import { motion } from "framer-motion";
import { apiAdminLogin, apiAdminGetUsers, apiAdminToggleBlock, apiAdminUpdateBalance, apiAdminGetSettings, apiAdminUpdateSettings } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState("");
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
    mutationFn: ({ userId, isBlocked }: { userId: number; isBlocked: boolean }) => apiAdminToggleBlock(userId, isBlocked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const updateBalanceMutation = useMutation({
    mutationFn: ({ userId, balance }: { userId: number; balance: number }) => apiAdminUpdateBalance(userId, balance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUserId(null);
      setNewBalance("");
      toast({ title: "ব্যালেন্স আপডেট হয়েছে" });
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => apiAdminUpdateSettings(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-settings"] }),
  });

  const filteredUsers = users?.filter((u: any) => u.guest_id?.includes(searchQuery) || u.display_name?.includes(searchQuery)) || [];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 rounded-3xl w-full max-w-sm space-y-6">
          <div className="text-center">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <input type="password" placeholder="পাসওয়ার্ড..." className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          <button onClick={handleLogin} className="btn-primary py-3">লগিন করুন</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>

        {/* Settings */}
        <div className="glass-card rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-bold text-lg">সেটিংস</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateSettingMutation.mutate({ key: "buyStatus", value: settings?.buyStatus === "on" ? "off" : "on" })}
              className={`p-3 rounded-xl font-bold text-sm ${settings?.buyStatus === "on" ? "bg-primary/20 text-primary border border-primary/30" : "bg-destructive/20 text-destructive border border-destructive/30"}`}
            >
              Buy: {settings?.buyStatus || "on"}
            </button>
            <button
              onClick={() => updateSettingMutation.mutate({ key: "bonusStatus", value: settings?.bonusStatus === "on" ? "off" : "on" })}
              className={`p-3 rounded-xl font-bold text-sm ${settings?.bonusStatus === "on" ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-border"}`}
            >
              Bonus: {settings?.bonusStatus || "off"}
            </button>
          </div>
        </div>

        {/* Users */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">ইউজার ({filteredUsers.length})</h2>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
            <input type="text" placeholder="সার্চ..." className="input-field pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredUsers.map((u: any) => (
              <div key={u.id} className="p-4 bg-secondary/50 rounded-xl border border-border space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{u.display_name || "No Name"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{u.guest_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleBlockMutation.mutate({ userId: u.id, isBlocked: !u.is_blocked })}
                      className={`p-2 rounded-lg ${u.is_blocked ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`}
                    >
                      {u.is_blocked ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Balance: <span className="text-primary font-bold">{u.balance} TK</span></span>
                  <span>Keys: <span className="text-primary font-bold">{u.key_count}</span></span>
                </div>
                {editingUserId === u.id ? (
                  <div className="flex gap-2">
                    <input type="number" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} className="input-field flex-1" placeholder="নতুন ব্যালেন্স" />
                    <button onClick={() => updateBalanceMutation.mutate({ userId: u.id, balance: parseInt(newBalance) })} className="btn-primary w-auto px-4" disabled={!newBalance}>
                      {updateBalanceMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Coins className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingUserId(u.id)} className="text-xs text-primary hover:underline">ব্যালেন্স পরিবর্তন</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
