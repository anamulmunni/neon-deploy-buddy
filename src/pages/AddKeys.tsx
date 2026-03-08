import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Key, Users, Loader2, ArrowLeft, Copy, Trash2, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiAddKey, apiGetPoolStats, apiDeleteUsedKeys } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

const POOL_PASSWORD = "Anamul-963050";

export default function AddKeys() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [newVerifyUrl, setNewVerifyUrl] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { data: pool } = useQuery({
    queryKey: ["pool-stats"],
    queryFn: apiGetPoolStats,
    enabled: isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: () => apiAddKey(newPrivateKey, newVerifyUrl, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pool-stats"] });
      setNewPrivateKey("");
      setNewVerifyUrl("");
      toast({ title: "কি পুলে যোগ করা হয়েছে" });
    },
  });

  const deleteUsedMutation = useMutation({
    mutationFn: apiDeleteUsedKeys,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pool-stats"] });
      toast({ title: "সব ব্যবহৃত কি ডিলিট হয়েছে" });
    },
  });

  const readyKeys = pool?.filter((item: any) => !item.is_used) || [];
  const usedKeys = pool?.filter((item: any) => item.is_used) || [];
  const allKeys = pool || [];

  const grouped: Record<string, number> = {};
  readyKeys.forEach((item: any) => {
    const n = item.added_by || "Unknown";
    if (n !== "Unknown") grouped[n] = (grouped[n] || 0) + 1;
  });

  const copyAllKeys = () => {
    const text = allKeys.map((k: any) => `${k.private_key} | ${k.verify_url} | ${k.is_used ? "USED" : "READY"} | ${k.added_by}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "সব কি কপি করা হয়েছে" });
  };

  const copyReadyKeys = () => {
    const text = readyKeys.map((k: any) => `${k.private_key} | ${k.verify_url}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "রেডি কি কপি করা হয়েছে" });
  };

  const handlePasswordSubmit = () => {
    if (password === POOL_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      toast({ title: "ভুল পাসওয়ার্ড", variant: "destructive" });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 rounded-3xl w-full max-w-sm space-y-6">
          <div className="text-center">
            <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">কি পুল অ্যাক্সেস</h1>
            <p className="text-sm text-muted-foreground mt-2">পাসওয়ার্ড দিন</p>
          </div>
          <input
            type="password"
            placeholder="পাসওয়ার্ড..."
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
          />
          <button onClick={handlePasswordSubmit} className="btn-primary py-3">প্রবেশ করুন</button>
          <button onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2 w-full text-center">
            ফিরে যান
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> ফিরে যান
        </button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="glass-card rounded-2xl p-4 text-center border border-primary/20">
            <p className="text-2xl font-bold text-primary">{readyKeys.length}</p>
            <p className="text-xs text-muted-foreground">রেডি কি</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center border border-destructive/20">
            <p className="text-2xl font-bold text-destructive">{usedKeys.length}</p>
            <p className="text-xs text-muted-foreground">ব্যবহৃত কি</p>
          </div>
        </div>

        {/* Add Key Form */}
        <div className="glass-card rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Key className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">কি যোগ করুন</h1>
          </div>

          {!isNameSet ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">আপনার নাম লিখুন:</p>
              <input type="text" placeholder="আপনার নাম..." className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
              <button onClick={() => { if (name.trim()) setIsNameSet(true); }} className="btn-primary py-3" disabled={!name.trim()}>
                এগিয়ে যান
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input type="text" placeholder="Private Key" className="input-field font-mono text-sm" value={newPrivateKey} onChange={(e) => setNewPrivateKey(e.target.value)} />
              <input type="text" placeholder="Verify URL" className="input-field text-sm" value={newVerifyUrl} onChange={(e) => setNewVerifyUrl(e.target.value)} />
              <button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !newPrivateKey || !newVerifyUrl} className="btn-primary py-3">
                {addMutation.isPending ? <Loader2 className="animate-spin" /> : <><Key className="w-4 h-4" /> পুলে যোগ করুন</>}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="glass-card rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex gap-2">
            <button onClick={copyAllKeys} className="flex-1 flex items-center justify-center gap-2 p-3 bg-secondary rounded-xl text-sm font-bold hover:bg-secondary/80 transition-colors">
              <Copy className="w-4 h-4" /> সব কপি
            </button>
            <button onClick={copyReadyKeys} className="flex-1 flex items-center justify-center gap-2 p-3 bg-primary/20 text-primary rounded-xl text-sm font-bold hover:bg-primary/30 transition-colors">
              <Copy className="w-4 h-4" /> রেডি কপি
            </button>
          </div>
          <button
            onClick={() => { if (confirm("সব ব্যবহৃত কি ডিলিট করতে চান?")) deleteUsedMutation.mutate(); }}
            disabled={deleteUsedMutation.isPending || usedKeys.length === 0}
            className="w-full flex items-center justify-center gap-2 p-3 bg-destructive/20 text-destructive rounded-xl text-sm font-bold hover:bg-destructive/30 transition-colors disabled:opacity-50"
          >
            {deleteUsedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> ব্যবহৃত কি ডিলিট ({usedKeys.length})</>}
          </button>
        </div>

        {/* All Keys List */}
        {allKeys.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-6">
            <h3 className="font-bold mb-4">সব কি ({allKeys.length})</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {allKeys.map((k: any) => (
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
          </div>
        )}

        {/* Contributors */}
        {Object.keys(grouped).length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-bold">কন্ট্রিবিউটর</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(grouped).map(([n, count]) => (
                <div key={n} className="flex justify-between items-center p-3 bg-secondary/50 rounded-xl">
                  <span className="font-medium">{n}</span>
                  <span className="text-primary font-bold">{count} কি</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
