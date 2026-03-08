import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Key, Users, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiAddKey, apiGetPoolStats } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export default function AddKeys() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [newVerifyUrl, setNewVerifyUrl] = useState("");

  const { data: pool } = useQuery({
    queryKey: ["pool-stats"],
    queryFn: apiGetPoolStats,
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

  const readyKeys = pool?.filter((item: any) => !item.is_used) || [];
  const grouped: Record<string, number> = {};
  readyKeys.forEach((item: any) => {
    const n = item.added_by || "Unknown";
    if (n !== "Unknown") grouped[n] = (grouped[n] || 0) + 1;
  });

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> ফিরে যান
        </button>

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
