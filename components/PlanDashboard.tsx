
import React, { useState } from 'react';
import { DailyPlan, FoodItem, Meal, UserProfile, WeeklyPlanData, ShoppingListResult } from '../types';
import { Flame, RefreshCw, ChevronDown, ChevronUp, ArrowLeft, Clock, ShoppingCart, Bell, AlertTriangle, Heart, PartyPopper } from 'lucide-react';
import { getFoodSubstitute } from '../services/geminiService';
import ShoppingListModal from './ShoppingListModal';
import SavePlanModal from './SavePlanModal';
import WaterTracker from './WaterTracker';

interface Props {
  planData: WeeklyPlanData;
  userProfile: UserProfile;
  initialShoppingList: ShoppingListResult | null;
  onReset: () => void;
  onSavePlan: (name: string, currentPlan: WeeklyPlanData, currentList: ShoppingListResult | null) => void;
}

const PlanDashboard: React.FC<Props> = ({ planData, userProfile, initialShoppingList, onReset, onSavePlan }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [expandedMealIndex, setExpandedMealIndex] = useState<number | null>(0);
  const [loadingSubstitutionId, setLoadingSubstitutionId] = useState<string | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<Set<string>>(new Set());
  
  // Shopping List State (Lifted Up) - Initialize with auto-generated list if available
  const [shoppingList, setShoppingList] = useState<ShoppingListResult | null>(initialShoppingList);
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<Set<string>>(new Set());
  
  // Local state to handle substitutions instantly in the UI
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlanData>(planData);

  const currentDay = currentPlan.days[selectedDayIndex];
  const isFastingDay = userProfile.intermittentFasting.enabled && 
                       userProfile.intermittentFasting.days.some(d => currentDay.day.includes(d));
  
  // Normalize checking day for cheat day (user might have full name or short name)
  const isCheatDay = userProfile.cheatDay && currentDay.day.toLowerCase().includes(userProfile.cheatDay.toLowerCase().split('-')[0]);

  const handleSubstitute = async (food: FoodItem, mealType: string) => {
    setLoadingSubstitutionId(food.id);
    try {
      // Pass the list of checked shopping items to the AI
      const availableIngredients = Array.from(checkedShoppingItems) as string[];
      
      const newFood = await getFoodSubstitute(
        food, 
        mealType, 
        userProfile.goal,
        availableIngredients // Smart integration here
      );
      
      // Update state deeply
      const newDays = [...currentPlan.days];
      const dayMeals = newDays[selectedDayIndex].meals;
      
      // Find meal and food to update
      for (const meal of dayMeals) {
        if (meal.type === mealType) {
          const foodIndex = meal.foods.findIndex(f => f.id === food.id);
          if (foodIndex !== -1) {
            meal.foods[foodIndex] = newFood; // Swap
          }
        }
      }

      setCurrentPlan({ ...currentPlan, days: newDays });

    } catch (e) {
      alert("Não foi possível substituir agora.");
    } finally {
      setLoadingSubstitutionId(null);
    }
  };

  const toggleLowStock = (foodName: string) => {
    const newSet = new Set(lowStockItems);
    if (newSet.has(foodName)) {
      newSet.delete(foodName);
    } else {
      newSet.add(foodName);
      // Simulate scheduling a notification
      if ("Notification" in window && Notification.permission === "granted") {
        setTimeout(() => {
           new Notification(`Alerta de Estoque: ${foodName}`, {
             body: `Você marcou ${foodName} como acabando. Não esqueça de comprar!`,
             icon: "https://cdn-icons-png.flaticon.com/512/1007/1007988.png"
           });
        }, 5000); // 5 seconds for demo
        alert(`Alerta definido! Você receberá uma notificação sobre ${foodName}.`);
      } else if ("Notification" in window && Notification.permission !== "denied") {
         Notification.requestPermission();
      } else {
         alert(`Item marcado como acabando: ${foodName}`);
      }
    }
    setLowStockItems(newSet);
  };

  const toggleMeal = (idx: number) => {
    setExpandedMealIndex(expandedMealIndex === idx ? null : idx);
  };

  const getFeedingWindow = () => {
    if (!userProfile.intermittentFasting.startTime) return "";
    const startHour = parseInt(userProfile.intermittentFasting.startTime.split(':')[0]);
    const fastingDuration = userProfile.intermittentFasting.hours;
    const endFastingHour = (startHour + fastingDuration) % 24;
    const formattedEnd = endFastingHour.toString().padStart(2, '0') + ":00";
    return `${formattedEnd} - ${userProfile.intermittentFasting.startTime}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      
      {showSaveModal && (
        <SavePlanModal 
          onClose={() => setShowSaveModal(false)}
          onSave={(name) => {
            onSavePlan(name, currentPlan, shoppingList);
            setShowSaveModal(false);
          }}
        />
      )}

      {showShoppingList && (
        <ShoppingListModal 
          planData={currentPlan} 
          currentList={shoppingList}
          onListUpdate={setShoppingList}
          checkedItems={checkedShoppingItems}
          onToggleItem={(itemName) => {
            const newSet = new Set(checkedShoppingItems);
            if (newSet.has(itemName)) newSet.delete(itemName);
            else newSet.add(itemName);
            setCheckedShoppingItems(newSet);
          }}
          onClose={() => setShowShoppingList(false)} 
        />
      )}

      {/* Header Summary */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seu Plano</h1>
            <p className="text-gray-500 text-xs mt-1 font-medium bg-gray-100 inline-block px-2 py-1 rounded-md">
              {userProfile.goal}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSaveModal(true)}
              className="p-2 bg-pink-50 text-pink-600 rounded-full hover:bg-pink-100 transition-colors"
              title="Salvar como Favorito"
            >
              <Heart size={20} />
            </button>

            <button 
              onClick={() => setShowShoppingList(true)}
              className={`p-2 rounded-full transition-colors relative ${
                checkedShoppingItems.size > 0 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'bg-brand-100 text-brand-600 hover:bg-brand-200'
              }`}
              title="Lista de Compras"
            >
              <ShoppingCart size={20} />
              {checkedShoppingItems.size > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {checkedShoppingItems.size}
                </span>
              )}
            </button>
            <button onClick={onReset} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
               <ArrowLeft size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          <div className="flex-shrink-0 bg-brand-50 p-3 rounded-2xl border border-brand-100 min-w-[100px]">
            <p className="text-xs text-brand-600 font-bold uppercase tracking-wider">Metabolismo</p>
            <p className="text-lg font-bold text-brand-900">{currentPlan.bmr} <span className="text-sm font-normal">kcal</span></p>
          </div>
          <div className="flex-shrink-0 bg-orange-50 p-3 rounded-2xl border border-orange-100 min-w-[100px]">
            <p className="text-xs text-orange-600 font-bold uppercase tracking-wider">Gasto Total</p>
            <p className="text-lg font-bold text-orange-900">{currentPlan.tdee} <span className="text-sm font-normal">kcal</span></p>
          </div>
          {userProfile.intermittentFasting.enabled && (
             <div className="flex-shrink-0 bg-purple-50 p-3 rounded-2xl border border-purple-100 min-w-[100px]">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">Jejum</p>
              <p className="text-lg font-bold text-purple-900">{userProfile.intermittentFasting.hours}h <span className="text-sm font-normal">janela</span></p>
            </div>
          )}
        </div>

        {/* Day Selector */}
        <div className="mt-6 flex space-x-3 overflow-x-auto no-scrollbar">
          {currentPlan.days.map((d, idx) => {
             const isFasting = userProfile.intermittentFasting.enabled && 
                               userProfile.intermittentFasting.days.some(day => d.day.includes(day));
             // Check if this day is a cheat day
             const isCheat = userProfile.cheatDay && d.day.toLowerCase().includes(userProfile.cheatDay.toLowerCase().split('-')[0]);

             return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDayIndex(idx);
                  setExpandedMealIndex(0); // Reset expanded to first meal
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap flex flex-col items-center ${
                  selectedDayIndex === idx
                    ? isCheat 
                      ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200'
                      : 'bg-brand-600 text-white shadow-lg shadow-brand-200'
                    : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{d.day.split('-')[0]}</span>
                  {isCheat && <span className="text-xs">★</span>}
                </div>
                {isFasting && selectedDayIndex !== idx && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1"></span>}
                {isFasting && selectedDayIndex === idx && <span className="w-1.5 h-1.5 rounded-full bg-white mt-1"></span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Meal List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        
        {/* Water Tracker Component */}
        <WaterTracker dailyTarget={currentPlan.waterTarget} />

        {isCheatDay && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-4 rounded-2xl shadow-lg flex items-center gap-3 animate-fade-in mb-4">
            <PartyPopper className="text-white" size={28} />
            <div>
              <p className="font-bold text-lg">Dia Livre!</p>
              <p className="text-xs text-white opacity-90">
                Aproveite sem culpa, mas com moderação. O equilíbrio é a chave do sucesso.
              </p>
            </div>
          </div>
        )}

        {isFastingDay && !isCheatDay && (
          <div className="bg-purple-600 text-white p-4 rounded-2xl shadow-lg flex items-center gap-3 animate-fade-in mb-4">
            <Clock className="text-purple-200" size={24} />
            <div>
              <p className="font-bold">Dia de Jejum ({userProfile.intermittentFasting.hours}h)</p>
              <p className="text-xs text-purple-100 opacity-90">
                Alimente-se apenas entre <strong>{getFeedingWindow()}</strong>.
              </p>
            </div>
          </div>
        )}

        {currentDay.meals.map((meal, idx) => (
          <div 
            key={idx} 
            className={`rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${isCheatDay ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}
          >
            <button 
              onClick={() => toggleMeal(idx)}
              className={`w-full flex items-center justify-between p-5 z-10 relative ${isCheatDay ? 'bg-yellow-50/50' : 'bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-10 rounded-full ${
                  isCheatDay ? 'bg-yellow-400' :
                  meal.type.includes("Café") ? 'bg-amber-400' :
                  meal.type.includes("Almoço") ? 'bg-green-500' :
                  meal.type.includes("Jantar") ? 'bg-indigo-500' :
                  'bg-pink-400'
                }`}></div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-800 text-lg leading-tight">{meal.type}</h3>
                  <p className="text-sm text-gray-400 font-medium flex items-center gap-1">
                    <Flame size={12} /> {meal.totalCalories > 0 ? `${meal.totalCalories} kcal` : 'Livre'}
                  </p>
                </div>
              </div>
              {expandedMealIndex === idx ? <ChevronUp className="text-gray-400"/> : <ChevronDown className="text-gray-400"/>}
            </button>

            {/* Expanded Content */}
            {expandedMealIndex === idx && (
              <div className="px-5 pb-5 pt-0">
                <div className="h-px w-full bg-gray-100 mb-4"></div>
                <div className="space-y-4">
                  {meal.foods.map((food) => (
                    <div key={food.id} className="flex items-start justify-between group">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2">
                           <p className="font-medium text-gray-800 text-base">{food.name}</p>
                           {lowStockItems.has(food.name) && (
                             <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-md font-bold flex items-center gap-0.5">
                               <AlertTriangle size={10} /> Acabando
                             </span>
                           )}
                        </div>
                        <p className="text-sm text-gray-500">{food.weight}</p>
                        
                        <div className="flex gap-2 mt-1">
                          {food.calories > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              {food.calories} kcal
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-md ${
                            food.glycemicIndex?.toLowerCase().includes('baixo') ? 'bg-green-100 text-green-700' :
                            food.glycemicIndex?.toLowerCase().includes('médio') ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            IG: {food.glycemicIndex}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleLowStock(food.name)}
                          className={`p-2 rounded-xl transition-colors ${
                            lowStockItems.has(food.name) 
                            ? 'bg-red-50 text-red-500' 
                            : 'bg-gray-50 text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                          }`}
                          title="Avisar quando acabar"
                        >
                           <Bell size={18} />
                        </button>
                        <button 
                          onClick={() => handleSubstitute(food, meal.type)}
                          disabled={loadingSubstitutionId === food.id}
                          className={`flex-shrink-0 p-2 rounded-xl transition-colors ${
                            checkedShoppingItems.size > 0 
                            ? 'bg-brand-50 text-brand-600 hover:bg-brand-100' 
                            : 'bg-gray-50 text-gray-400 hover:text-brand-600 hover:bg-brand-50'
                          }`}
                          title={checkedShoppingItems.size > 0 ? "Substituir (Priorizando itens da lista)" : "Substituir Alimento"}
                        >
                           {loadingSubstitutionId === food.id ? (
                             <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                           ) : (
                             <RefreshCw size={18} />
                           )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Suggestion Note */}
                <div className="mt-4 space-y-2">
                   {!isCheatDay && (
                     <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                      <span className="font-bold">Dica:</span>
                      Use o ícone de sino <Bell size={10} className="inline"/> para receber alertas quando um alimento estiver acabando.
                    </div>
                   )}
                   {isCheatDay && (
                     <div className="p-3 bg-yellow-100 rounded-lg text-xs text-yellow-800 font-bold">
                       Este é seu dia livre. Não se preocupe em seguir a dieta à risca!
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanDashboard;
