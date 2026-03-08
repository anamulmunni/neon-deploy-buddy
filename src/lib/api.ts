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

export async function apiUpdateDisplayName(name: string) {
  const userId = getSessionUserId();
  if (!userId) throw new Error("Unauthorized");
  const { error } = await supabase
    .from("gd_users")
    .update({ display_name: name })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function apiUploadAvatar(file: File) {
  const userId = getSessionUserId();
  if (!userId) throw new Error("Unauthorized");
  
  const ext = file.name.split('.').pop();
  const filePath = `user_${userId}.${ext}`;
  
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  
  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
  
  const { error } = await supabase
    .from("gd_users")
    .update({ avatar_url: avatarUrl } as any)
    .eq("id", userId);
  if (error) throw new Error(error.message);
  
  return avatarUrl;
}

export async function apiSearchByPaymentNumber(paymentNumber: string) {
  const trimmed = paymentNumber.trim();
  
  // Search in active submitted numbers
  const { data: activeData } = await supabase
    .from("gd_submitted_numbers")
    .select("*")
    .eq("payment_number", trimmed)
    .order("submitted_at", { ascending: false });

  // Also search in reset history
  const { data: historyData } = await supabase
    .from("gd_reset_history")
    .select("*")
    .eq("payment_number", trimmed)
    .order("reset_at", { ascending: false });

  // Combine both, marking source
  const active = (activeData || []).map((r: any) => ({ ...r, source: "active" }));
  const history = (historyData || []).map((r: any) => ({
    ...r,
    submitted_at: r.reset_at,
    source: "reset",
  }));

  return [...active, ...history];
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
    details: `Verification completed`,
    status: "completed",
  });

  return { newBalance: user.balance + rewardRate, message: `Key verified! +1 verified added` };
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

export async function apiDeleteUsedKeys() {
  const { error } = await supabase.from("gd_verification_pool").delete().eq("is_used", true);
  if (error) throw new Error(error.message);
}

export async function apiCheckDuplicates(numbers: string[]) {
  const { data } = await supabase.from("gd_submitted_numbers").select("phone_number");
  const existing = data?.map((d: any) => d.phone_number) || [];
  return numbers.filter(n => existing.includes(n));
}

export async function apiSubmitNumbers(numbers: string[], submittedBy: string, paymentNumber?: string, paymentMethod?: string) {
  const cleanedNumbers = Array.from(new Set(numbers.map((n) => n.trim()).filter(Boolean)));
  if (!cleanedNumbers.length) return;

  const { data: users, error: usersError } = await supabase
    .from("gd_users")
    .select("guest_id, key_count")
    .in("guest_id", cleanedNumbers);

  if (usersError) throw new Error(usersError.message);

  const countByGuestId = new Map((users || []).map((u: any) => [u.guest_id, u.key_count || 0]));

  const rows = cleanedNumbers.map((n) => ({
    phone_number: n,
    submitted_by: submittedBy,
    payment_number: paymentNumber,
    payment_method: paymentMethod,
    verified_count: countByGuestId.get(n) || 0,
  }));

  const { error } = await supabase.from("gd_submitted_numbers").insert(rows);
  if (error) throw new Error(error.message);
}

export async function apiLookupUsers(numbers: string[]) {
  const results = [];
  for (const num of numbers) {
    const { data } = await supabase.from("gd_users").select("guest_id, key_count, balance").eq("guest_id", num).single();
    results.push({ guestId: num, keyCount: data?.key_count || 0, balance: data?.balance || 0 });
  }
  return results;
}

export async function apiAdminGetSubmittedNumbers() {
  const { data, error } = await supabase
    .from("gd_submitted_numbers")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function apiAdminGetResetHistory() {
  const { data, error } = await supabase
    .from("gd_reset_history")
    .select("*")
    .order("reset_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function apiAdminDeleteSubmittedNumber(id: number) {
  const { error } = await supabase.from("gd_submitted_numbers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function apiAdminResetSubmittedNumber(id: number) {
  const { data: row, error: rowError } = await supabase
    .from("gd_submitted_numbers")
    .select("*")
    .eq("id", id)
    .single();

  if (rowError || !row) throw new Error("Submitted number not found");

  const { error: resetUserError } = await supabase
    .from("gd_users")
    .update({ key_count: 0 })
    .eq("guest_id", row.phone_number);

  if (resetUserError) throw new Error(resetUserError.message);

  const { error: historyError } = await supabase.from("gd_reset_history").insert({
    phone_number: row.phone_number,
    submitted_by: row.submitted_by,
    payment_number: row.payment_number,
    payment_method: row.payment_method,
    verified_count: row.verified_count || 0,
  });

  if (historyError) throw new Error(historyError.message);

  const { error: deleteError } = await supabase.from("gd_submitted_numbers").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);
}

export async function apiAdminResetAllSubmittedNumbers() {
  const { data: rows, error: rowsError } = await supabase.from("gd_submitted_numbers").select("*");
  if (rowsError) throw new Error(rowsError.message);

  if (!rows?.length) return;

  const guestIds = Array.from(new Set(rows.map((row: any) => row.phone_number)));
  const { error: resetUsersError } = await supabase
    .from("gd_users")
    .update({ key_count: 0 })
    .in("guest_id", guestIds);

  if (resetUsersError) throw new Error(resetUsersError.message);

  const historyRows = rows.map((row: any) => ({
    phone_number: row.phone_number,
    submitted_by: row.submitted_by,
    payment_number: row.payment_number,
    payment_method: row.payment_method,
    verified_count: row.verified_count || 0,
  }));

  const { error: historyError } = await supabase.from("gd_reset_history").insert(historyRows);
  if (historyError) throw new Error(historyError.message);

  const { error: clearError } = await supabase.from("gd_submitted_numbers").delete().gt("id", 0);
  if (clearError) throw new Error(clearError.message);
}
