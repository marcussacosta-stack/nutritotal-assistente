
export enum Gender {
  MALE = 'Masculino',
  FEMALE = 'Feminino'
}

export enum ActivityLevel {
  SEDENTARY = 'Sedentário (pouco ou nenhum exercício)',
  LIGHTLY_ACTIVE = 'Levemente ativo (1-3 dias/semana)',
  MODERATELY_ACTIVE = 'Moderadamente ativo (3-5 dias/semana)',
  VERY_ACTIVE = 'Muito ativo (6-7 dias/semana)',
  EXTRA_ACTIVE = 'Extremamente ativo (trabalho físico pesado)'
}

export enum Goal {
  FAT_LOSS_MODERATE = 'Perda de Gordura (Moderada)',
  FAT_LOSS_MEDIUM = 'Perda de Gordura (Média)',
  FAT_LOSS_HIGH = 'Perda de Gordura (Agressiva)',
  MAINTAIN = 'Manter Peso',
  HYPERTROPHY_MEDIUM = 'Hipertrofia (Média)',
  HYPERTROPHY_HIGH = 'Hipertrofia (Alta Performance)',
  BODY_RECOMPOSITION = 'Recomposição Corporal (Perder gordura e ganhar massa)'
}

export enum MealType {
  BREAKFAST = 'Café da Manhã',
  LUNCH = 'Almoço',
  SNACK = 'Lanche da Tarde',
  DINNER = 'Jantar',
  SUPPER = 'Ceia'
}

export enum ShoppingDuration {
  WEEKLY = 'Semanal (7 dias)',
  BIWEEKLY = 'Quinzenal (15 dias)',
  MONTHLY = 'Mensal (30 dias)'
}

export enum ShoppingBudget {
  ECONOMICAL = 'Econômico',
  PREMIUM = 'Premium'
}

export interface IntermittentFastingConfig {
  enabled: boolean;
  hours: number; // 12, 14, 16, 18, 20, 24
  days: string[]; // ["Seg", "Ter", ...]
  startTime: string; // "20:00" - Horário que começa o jejum
}

export interface UserProfile {
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
  selectedMeals: MealType[];
  intermittentFasting: IntermittentFastingConfig;
  cheatDay?: string; // "Domingo", "Sábado", etc.
}

export interface FoodItem {
  id: string; // Unique ID for UI handling
  name: string;
  weight: string; // e.g., "100g" or "1 unidade"
  calories: number;
  glycemicIndex: string; // Low, Medium, High or number
  isSugarOrSweetener?: boolean;
}

export interface Meal {
  type: MealType;
  foods: FoodItem[];
  totalCalories: number;
}

export interface DailyPlan {
  day: string; // "Segunda-feira", etc.
  meals: Meal[];
  dailyCalories: number;
}

export interface WeeklyPlanData {
  bmr: number;
  tdee: number;
  targetCalories: number;
  waterTarget: number; // ml
  days: DailyPlan[];
}

export interface ShoppingItem {
  name: string;
  quantity: string;
  category: string;
  checked?: boolean; // UI state
}

export interface ShoppingListResult {
  items: ShoppingItem[];
  estimatedCost: string; // Text description
}

export interface SavedPlan {
  id: string;
  name: string;
  createdAt: number;
  planData: WeeklyPlanData;
  userProfile: UserProfile;
  shoppingList: ShoppingListResult | null;
}

// === NEW AUTH & PROGRESS TYPES ===

export interface BodyMetricLog {
  date: number; // Timestamp
  weight: number;
  neck: number;
  biceps: number;
  chest: number;
  waist: number;
  hips: number;
}

export interface UserAccount {
  id: string; // Supabase UUID
  username: string; // Used as Email in UI logic mostly
  logs: BodyMetricLog[];
  currentProfile: UserProfile | null;
  currentPlan: WeeklyPlanData | null;
  currentShoppingList: ShoppingListResult | null;
  savedPlans: SavedPlan[];
  lastMeasurementNotification?: number;
}
