import { supabase } from "@/integrations/supabase/client";

// Session management using localStorage
const SESSION_KEY = "gd_user_id";

export function getSessionUserId(): number | null {
  const id = localStorage.getItem(SESSION_KEY);
  return id ? parseInt(id) : null;
}

export function setSessionUserId(id: number) {
  localStorage.setItem(SESSION_KEY, String(id));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// API functions that talk directly to Supabase
export async function apiLogin(guestId: string, displayName: string) {
  // Check if user exists
  const { data: existing } = await supabase
    .from("gd_users")
    .select("*")
    .eq("guest_id", guestId.trim())
    .single();

  if (existing) {
    if (existing.is_blocked) throw new Error("Account is blocked");
    setSessionUserId(existing.id);
    return existing;
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from("gd_users")
    .insert({ guest_id: guestId.trim(), display_name: displayName || null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  setSessionUserId(newUser.id);
  return newUser;
}

export async function apiGetUser() {
  const userId = getSessionUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("gd_users")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function apiGetTransactions() {
  const userId = getSessionUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from("gd_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data || [];
}

export async function apiGetPublicSettings() {
  const { data } = await supabase.from("gd_settings").select("*");
  const settings: Record<string, string> = {};
  data?.forEach((s: any) => { settings[s.key] = s.value; });
  return {
    buyStatus: settings.buyStatus || "on",
    bonusStatus: settings.bonusStatus || "off",
    bonusTarget: parseInt(settings.bonusTarget || "10"),
    customNotice: settings.customNotice || "",
  };
}

export async function apiGetKey() {
  const { data, error } = await supabase
    .from("gd_verification_pool")
    .select("*")
    .eq("is_used", false)
    .limit(1)
    .single();

  if (error || !data) throw new Error("কোনো কি এখন খালি নেই");

  // Mark as used
  await supabase
    .from("gd_verification_pool")
    .update({ is_used: true })
    .eq("id", data.id);

  return { id: data.id, privateKey: data.private_key, verifyUrl: data.verify_url };
}

export async function apiSubmitKey(privateKey: string) {
  const userId = getSessionUserId();
  if (!userId) throw new Error("Unauthorized");

  const user = await apiGetUser();
  if (!user) throw new Error("User not found");
  if (user.is_blocked) throw new Error("Account blocked");

  // Get reward rate
  const { data: rateSetting } = await supabase
    .from("gd_settings")
    .select("value")
    .eq("key", "rewardRate")
    .single();
  const rewardRate = rateSetting ? parseInt(rateSetting.value) : 40;

  // Update balance
  await supabase
    .from("gd_users")
    .update({
      balance: user.balance + rewardRate,
      key_count: user.key_count + 1,
    })
    .eq("id", userId);

  // Create transaction
  await supabase.from("gd_transactions").insert({
    user_id: userId,
    type: "earning",
    amount: rewardRate,
    details: `Key: ${privateKey.substring(0, 10)}...`,
    status: "completed",
  });

  return { newBalance: user.balance + rewardRate, message: `Key verified! +${rewardRate} TK added` };
}

export async function apiWithdraw(method: string, number: string, amount: number) {
  const userId = getSessionUserId();
  if (!userId) throw new Error("Unauthorized");

  const user = await apiGetUser();
  if (!user) throw new Error("User not found");
  if (user.is_blocked) throw new Error("Account blocked");
  if (user.balance < amount) throw new Error("Insufficient balance");
  if (amount < 50) throw new Error("Minimum withdrawal is 50 TK");

  await supabase
    .from("gd_users")
    .update({ balance: user.balance - amount })
    .eq("id", userId);

  await supabase.from("gd_transactions").insert({
    user_id: userId,
    type: "withdrawal",
    amount,
    details: `${method.toUpperCase()}: ${number}`,
    status: "pending",
  });

  return { newBalance: user.balance - amount, message: `Withdrawal of ${amount} TK requested` };
}

export async function apiPaymentFeedback(status: "received" | "not_received") {
  const userId = getSessionUserId();
  if (!userId) throw new Error("Unauthorized");
  await supabase.from("gd_users").update({ payment_status: status }).eq("id", userId);
}

// Admin functions
export async function apiAdminLogin(password: string) {
  return password === "admin123";
}

export async function apiAdminGetUsers() {
  const { data } = await supabase.from("gd_users").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function apiAdminToggleBlock(userId: number, isBlocked: boolean) {
  await supabase.from("gd_users").update({ is_blocked: isBlocked }).eq("id", userId);
}

export async function apiAdminUpdateBalance(userId: number, balance: number) {
  await supabase.from("gd_users").update({ balance }).eq("id", userId);
}

export async function apiAdminUpdateSettings(key: string, value: string) {
  await supabase.from("gd_settings").upsert({ key, value }, { onConflict: "key" });
}

export async function apiAdminGetSettings() {
  const { data } = await supabase.from("gd_settings").select("*");
  const settings: Record<string, string> = {};
  data?.forEach((s: any) => { settings[s.key] = s.value; });
  return settings;
}

export async function apiAddKey(privateKey: string, verifyUrl: string, addedBy: string) {
  await supabase.from("gd_verification_pool").insert({
    private_key: privateKey,
    verify_url: verifyUrl,
    added_by: addedBy || "Unknown",
  });
}

export async function apiGetPoolStats() {
  const { data } = await supabase.from("gd_verification_pool").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function apiCheckDuplicates(numbers: string[]) {
  const { data } = await supabase.from("gd_submitted_numbers").select("phone_number");
  const existing = data?.map((d: any) => d.phone_number) || [];
  return numbers.filter(n => existing.includes(n));
}

export async function apiSubmitNumbers(numbers: string[], submittedBy: string, paymentNumber?: string, paymentMethod?: string) {
  const rows = numbers.map(n => ({
    phone_number: n,
    submitted_by: submittedBy,
    payment_number: paymentNumber,
    payment_method: paymentMethod,
  }));
  await supabase.from("gd_submitted_numbers").insert(rows);
}

export async function apiLookupUsers(numbers: string[]) {
  const results = [];
  for (const num of numbers) {
    const { data } = await supabase.from("gd_users").select("guest_id, key_count, balance").eq("guest_id", num).single();
    results.push({ guestId: num, keyCount: data?.key_count || 0, balance: data?.balance || 0 });
  }
  return results;
}
