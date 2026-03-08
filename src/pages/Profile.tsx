import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, User, Copy, Check, Shield, History,
  Phone, HeadphonesIcon, Code2, MessageCircle, Pencil, Loader2, Camera
} from "lucide-react";
import { motion } from "framer-motion";
import { apiGetUser, apiGetTransactions, apiUpdateDisplayName, apiUploadAvatar } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "support">("history");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: apiGetUser,
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: apiGetTransactions,
  });

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => apiUpdateDisplayName(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setIsEditingName(false);
      toast({ title: "নাম আপডেট হয়েছে" });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => apiUploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({ title: "প্রোফাইল ছবি আপডেট হয়েছে" });
    },
    onError: () => {
      toast({ title: "ছবি আপলোড ব্যর্থ", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "ছবি 2MB এর কম হতে হবে", variant: "destructive" });
        return;
      }
      uploadAvatarMutation.mutate(file);
    }
  };

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

  const avatarUrl = (user as any).avatar_url;

  return (
    <div className="min-h-screen pb-10">
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Gradient Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-indigo/20 to-cyan/20 blur-3xl" />
        <div className="relative z-10 pt-6 pb-16 px-4 max-w-md mx-auto">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> ড্যাশবোর্ডে ফিরুন
          </button>

          {/* Profile Avatar */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary via-accent to-cyan flex items-center justify-center shadow-2xl shadow-primary/30 mb-4 group overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-12 h-12 text-primary-foreground" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                {uploadAvatarMutation.isPending ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
            
            {/* Name with edit */}
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input-field text-center text-lg py-2 w-48"
                    placeholder="নতুন নাম..."
                    autoFocus
                  />
                  <button
                    onClick={() => { if (newName.trim()) updateNameMutation.mutate(newName.trim()); }}
                    disabled={updateNameMutation.isPending || !newName.trim()}
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'hsl(var(--emerald) / 0.2)' }}
                  >
                    {updateNameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'hsl(var(--emerald))' }} /> : <Check className="w-4 h-4" style={{ color: 'hsl(var(--emerald))' }} />}
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{user.display_name || "Unknown User"}</h1>
                  <button
                    onClick={() => { setNewName(user.display_name || ""); setIsEditingName(true); }}
                    className="p-1.5 bg-secondary/80 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground font-mono">{user.guest_id}</p>
              <button onClick={copyId} className="p-1 hover:bg-secondary rounded transition-colors">
                {copied ? <Check className="w-3 h-3" style={{ color: 'hsl(var(--emerald))' }} /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-8 space-y-4 relative z-20">
        {/* Stats Cards */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4 text-center" style={{ borderColor: 'hsl(var(--emerald) / 0.3)' }}>
            <Shield className="w-5 h-5 mx-auto mb-1" style={{ color: 'hsl(var(--emerald))' }} />
            <p className="text-xl font-bold" style={{ color: 'hsl(var(--emerald))' }}>{user.key_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">ভেরিফাইড</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center" style={{ borderColor: 'hsl(var(--cyan) / 0.3)' }}>
            <History className="w-5 h-5 mx-auto mb-1" style={{ color: 'hsl(var(--cyan))' }} />
            <p className="text-xl font-bold" style={{ color: 'hsl(var(--cyan))' }}>{transactions?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">লেনদেন</p>
          </div>
        </motion.div>

        {/* Account Status */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">অ্যাকাউন্ট স্ট্যাটাস</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.is_blocked ? 'bg-destructive/20 text-destructive' : ''}`} style={!user.is_blocked ? { background: 'hsl(var(--emerald) / 0.2)', color: 'hsl(var(--emerald))' } : {}}>
              {user.is_blocked ? "ব্লকড" : "সক্রিয়"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">পেমেন্ট স্ট্যাটাস</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              user.payment_status === "received" ? '' :
              user.payment_status === "pending" ? '' :
              'bg-secondary text-muted-foreground'
            }`} style={
              user.payment_status === "received" ? { background: 'hsl(var(--emerald) / 0.2)', color: 'hsl(var(--emerald))' } :
              user.payment_status === "pending" ? { background: 'hsl(var(--amber) / 0.2)', color: 'hsl(var(--amber))' } : {}
            }>
              {user.payment_status === "received" ? "পেয়েছি" : user.payment_status === "pending" ? "পেন্ডিং" : "কোনো রিকোয়েস্ট নেই"}
            </span>
          </div>
        </motion.div>

        {/* Tab Switch */}
        <div className="flex gap-2 bg-secondary/50 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "history" ? "shadow-lg text-primary-foreground" : "text-muted-foreground"
            }`}
            style={activeTab === "history" ? { background: 'hsl(var(--indigo))' } : {}}
          >
            <History className="w-4 h-4" /> হিস্ট্রি
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "support" ? "shadow-lg text-primary-foreground" : "text-muted-foreground"
            }`}
            style={activeTab === "support" ? { background: 'hsl(var(--teal))' } : {}}
          >
            <HeadphonesIcon className="w-4 h-4" /> সাপোর্ট
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "history" ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl overflow-hidden" style={{ borderColor: 'hsl(var(--indigo) / 0.2)' }}>
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
                      <div className={`p-2 rounded-full`} style={{ background: tx.type === "earning" ? 'hsl(var(--emerald) / 0.2)' : 'hsl(var(--rose) / 0.2)' }}>
                        {tx.type === "earning" ? (
                          <Shield className="w-4 h-4" style={{ color: 'hsl(var(--emerald))' }} />
                        ) : (
                          <History className="w-4 h-4" style={{ color: 'hsl(var(--rose))' }} />
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
                      <p className="font-bold text-sm" style={{ color: tx.type === "earning" ? 'hsl(var(--emerald))' : 'hsl(var(--rose))' }}>
                        {tx.type === "earning" ? "+1 verified" : "withdrawal"}
                      </p>
                      <p className={`text-[10px] font-bold`} style={{ color: tx.status === "completed" ? 'hsl(var(--emerald))' : tx.status === "pending" ? 'hsl(var(--amber))' : undefined }}>
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
            <div className="glass-card rounded-2xl p-6" style={{ borderColor: 'hsl(var(--teal) / 0.2)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--teal)), hsl(var(--cyan)))' }}>
                  <Code2 className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ডেভেলপার</p>
                  <p className="font-bold text-lg">Md Anamul Haque</p>
                </div>
              </div>
              <div className="space-y-3">
                <a href="tel:01892564963" className="flex items-center gap-3 p-3 rounded-xl hover:opacity-80 transition-all" style={{ background: 'hsl(var(--emerald) / 0.1)', border: '1px solid hsl(var(--emerald) / 0.2)' }}>
                  <Phone className="w-5 h-5" style={{ color: 'hsl(var(--emerald))' }} />
                  <div>
                    <p className="text-xs text-muted-foreground">ফোন নম্বর</p>
                    <p className="font-bold" style={{ color: 'hsl(var(--emerald))' }}>01892564963</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6" style={{ borderColor: 'hsl(var(--rose) / 0.2)' }}>
              <div className="flex items-center gap-3 mb-4">
                <MessageCircle className="w-6 h-6" style={{ color: 'hsl(var(--rose))' }} />
                <h3 className="font-bold text-lg">সাহায্য দরকার?</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                অ্যাপ সংক্রান্ত যেকোনো সমস্যার জন্য ডেভেলপারের সাথে যোগাযোগ করুন। আমরা সবসময় আপনার পাশে আছি।
              </p>
              <a href="tel:01892564963" className="btn-rose py-3">
                <Phone className="w-4 h-4" /> কল করুন
              </a>
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
