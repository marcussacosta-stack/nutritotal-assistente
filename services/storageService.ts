
import { SavedPlan, UserAccount, BodyMetricLog, UserProfile, WeeklyPlanData, ShoppingListResult } from "../types";
import { supabase } from "./supabaseClient";

// === AUTH SERVICES ===

export const registerUser = async (email: string, password: string): Promise<{ success: boolean, message: string, user?: UserAccount }> => {
  console.log("Attempting registration for:", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });


  if (error) {
    console.error("Supabase SignUp Error:", error);

    // Check for Rate Limit specifically
    if (error.status === 429 || error.message.includes("rate limit") || error.message.includes("Too many")) {
      return {
        success: false,
        message: "Muitas tentativas de cadastro. Por favor, aguarde alguns minutos ou tente fazer Login (sua conta já pode ter sido criada)."
      };
    }

    return { success: false, message: error.message };
  }

  if (data.user) {
    console.log("User created in Auth. Checking/Creating user_state...");

    // Tenta inserir o user_state manualmente como fallback (caso o trigger não tenha rodado)
    // Usamos 'upsert' ou 'ignore duplicates'
    const { error: stateError } = await supabase.from('user_state').insert([{ user_id: data.user.id }]).select();

    if (stateError) {
      console.warn("Manual user_state creation failed (might be handled by trigger or RLS):", stateError);
      // Não retornamos erro aqui porque o usuário foi criado no Auth.
      // O trigger SQL deve garantir a criação.
    }

    const newUser: UserAccount = {
      id: data.user.id,
      username: email,
      logs: [],
      currentProfile: null,
      currentPlan: null,
      currentShoppingList: null,
      savedPlans: []
    };
    return { success: true, message: "Conta criada com sucesso!", user: newUser };
  }

  return { success: false, message: "Erro desconhecido ao criar usuário (sem dados retornados)." };
};

export const loginUser = async (email: string, password: string): Promise<{ success: boolean, message?: string, user?: UserAccount }> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login Error:", error);
    // Retorna a mensagem real para ajudar no debug (ex: Email not confirmed)
    return { success: false, message: error.message };
  }

  if (data.user) {
    try {
      const user = await fetchUserData(data.user.id, email);
      return { success: true, user };
    } catch (err) {
      console.error("Error fetching user data after login:", err);
      return { success: false, message: "Erro ao carregar dados do usuário." };
    }
  }
  return { success: false, message: "Erro ao fazer login." };
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<UserAccount | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  return await fetchUserData(session.user.id, session.user.email || '');
};

// Helper to construct the full UserAccount object from different Supabase tables
const fetchUserData = async (userId: string, email: string): Promise<UserAccount> => {
  // 1. Fetch State (Profile, Plan)
  // Use maybeSingle() instead of single() to avoid error if row is missing
  let { data: stateData, error: stateError } = await supabase
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // Self-healing: If user exists in Auth but not in user_state (trigger failed), create it now.
  if (!stateData) {
    console.warn("User state missing. Creating default state...");
    const { data: newState, error: insertError } = await supabase
      .from('user_state')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (!insertError) {
      stateData = newState;
    } else {
      console.error("Failed to auto-create user state:", insertError);
    }
  }

  // 2. Fetch Logs
  const { data: logsData } = await supabase
    .from('body_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  // 3. Fetch Saved Plans
  const { data: plansData } = await supabase
    .from('saved_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Map Logs (Convert numeric strings to numbers if needed, Supabase returns numbers usually)
  const logs: BodyMetricLog[] = (logsData || []).map(l => ({
    date: Number(l.date),
    weight: Number(l.weight),
    neck: Number(l.neck),
    biceps: Number(l.biceps),
    chest: Number(l.chest),
    waist: Number(l.waist),
    hips: Number(l.hips)
  }));

  // Map Saved Plans
  const savedPlans: SavedPlan[] = (plansData || []).map(p => ({
    id: p.id,
    name: p.name,
    createdAt: Number(p.created_at),
    planData: p.plan_data,
    userProfile: p.user_profile,
    shoppingList: p.shopping_list
  }));

  return {
    id: userId,
    username: email,
    logs: logs,
    currentProfile: stateData?.profile || null,
    currentPlan: stateData?.current_plan || null,
    currentShoppingList: stateData?.shopping_list || null,
    savedPlans: savedPlans,
    lastMeasurementNotification: stateData?.last_notification ? Number(stateData.last_notification) : undefined
  };
};

// === DATA SERVICES ===

export const updateUserState = async (
  userId: string,
  data: {
    profile?: UserProfile | null,
    currentPlan?: WeeklyPlanData | null,
    shoppingList?: ShoppingListResult | null,
    lastNotification?: number
  }
) => {
  const updates: any = {};
  if (data.profile !== undefined) updates.profile = data.profile;
  if (data.currentPlan !== undefined) updates.current_plan = data.currentPlan;
  if (data.shoppingList !== undefined) updates.shopping_list = data.shoppingList;
  if (data.lastNotification !== undefined) updates.last_notification = data.lastNotification;

  // Check if row exists, if not insert (upsert logic usually handled by insert with conflict, but here we assume row exists from registration or we use upsert)
  const { error } = await supabase
    .from('user_state')
    .upsert({ user_id: userId, ...updates });

  if (error) console.error("Error updating state:", error);
};

export const addBodyLog = async (userId: string, log: BodyMetricLog) => {
  const { error } = await supabase.from('body_logs').insert([{
    user_id: userId,
    date: log.date,
    weight: log.weight,
    neck: log.neck,
    biceps: log.biceps,
    chest: log.chest,
    waist: log.waist,
    hips: log.hips
  }]);

  if (error) console.error("Error adding log:", error);
};

export const savePlanToStorage = async (userId: string, plan: SavedPlan) => {
  const { error } = await supabase.from('saved_plans').insert([{
    id: plan.id,
    user_id: userId,
    name: plan.name,
    created_at: plan.createdAt,
    plan_data: plan.planData,
    user_profile: plan.userProfile,
    shopping_list: plan.shoppingList
  }]);

  if (error) console.error("Error saving plan:", error);
};

export const deletePlanFromStorage = async (planId: string) => {
  const { error } = await supabase.from('saved_plans').delete().eq('id', planId);
  if (error) console.error("Error deleting plan:", error);
};
