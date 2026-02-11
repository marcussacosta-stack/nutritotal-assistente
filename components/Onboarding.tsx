
import React, { useState } from 'react';
import { ActivityLevel, Gender, Goal, MealType, UserProfile } from '../types';
import { ChevronRight, ChefHat, Activity, Target, Utensils, Sliders } from 'lucide-react';

interface Props {
  onComplete: (profile: UserProfile) => void;
  isLoading: boolean;
  loadingMessage?: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const FULL_WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const FASTING_HOURS = [12, 14, 16, 18, 20, 24];

const Onboarding: React.FC<Props> = ({ onComplete, isLoading, loadingMessage }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    age: 30,
    weight: 70,
    height: 170,
    gender: Gender.MALE,
    activityLevel: ActivityLevel.MODERATELY_ACTIVE,
    goal: Goal.FAT_LOSS_MEDIUM,
    selectedMeals: [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER],
    intermittentFasting: {
      enabled: false,
      hours: 16,
      days: [],
      startTime: "20:00"
    },
    cheatDay: undefined
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else onComplete(profile);
  };

  const toggleMeal = (meal: MealType) => {
    setProfile(prev => {
      const exists = prev.selectedMeals.includes(meal);
      if (exists) {
        return { ...prev, selectedMeals: prev.selectedMeals.filter(m => m !== meal) };
      } else {
        return { ...prev, selectedMeals: [...prev.selectedMeals, meal] };
      }
    });
  };

  const toggleFastingDay = (day: string) => {
    setProfile(prev => {
      const currentDays = prev.intermittentFasting.days;
      const exists = currentDays.includes(day);
      let newDays;
      if (exists) {
        newDays = currentDays.filter(d => d !== day);
      } else {
        newDays = [...currentDays, day];
      }
      return { 
        ...prev, 
        intermittentFasting: { ...prev.intermittentFasting, days: newDays } 
      };
    });
  };

  // Helper to calculate feeding window for display
  const getFeedingWindow = () => {
    if (!profile.intermittentFasting.startTime) return "";
    const startHour = parseInt(profile.intermittentFasting.startTime.split(':')[0]);
    const fastingDuration = profile.intermittentFasting.hours;
    const endFastingHour = (startHour + fastingDuration) % 24;
    const formattedEnd = endFastingHour.toString().padStart(2, '0') + ":00";
    return `Comer entre ${formattedEnd} e ${profile.intermittentFasting.startTime}`;
  };

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto p-6">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600">
            {step === 1 && <Activity size={32} />}
            {step === 2 && <Target size={32} />}
            {step === 3 && <Utensils size={32} />}
            {step === 4 && <Sliders size={32} />}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {step === 1 && "Dados Corporais"}
            {step === 2 && "Objetivos"}
            {step === 3 && "Refeições"}
            {step === 4 && "Personalização"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Passo {step} de 4
          </p>
        </div>

        {/* Step 1: Body Data */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
                <input 
                  type="number" 
                  value={profile.age} 
                  onChange={(e) => setProfile({...profile, age: Number(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                <input 
                  type="number" 
                  value={profile.weight} 
                  onChange={(e) => setProfile({...profile, weight: Number(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Altura (cm)</label>
              <input 
                type="number" 
                value={profile.height} 
                onChange={(e) => setProfile({...profile, height: Number(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gênero</label>
              <div className="flex gap-4">
                {Object.values(Gender).map((g) => (
                  <button
                    key={g}
                    onClick={() => setProfile({...profile, gender: g})}
                    className={`flex-1 p-3 rounded-xl border transition-all ${
                      profile.gender === g 
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold' 
                      : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Activity & Goal */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nível de Atividade</label>
              <div className="space-y-2">
                {Object.values(ActivityLevel).map((level) => (
                  <button
                    key={level}
                    onClick={() => setProfile({...profile, activityLevel: level})}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${
                      profile.activityLevel === level 
                      ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Objetivo Principal</label>
              <div className="space-y-2">
                {Object.values(Goal).map((g) => {
                  let colorClass = 'border-gray-200 text-gray-600';
                  let icon = '🎯';
                  
                  if (profile.goal === g) {
                    if (g.includes('Gordura')) {
                      colorClass = 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500';
                    } else if (g.includes('Hipertrofia')) {
                      colorClass = 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500';
                    } else if (g.includes('Recomposição')) {
                      colorClass = 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500';
                    } else {
                      colorClass = 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500';
                    }
                  }

                  if (g.includes('Gordura')) icon = '🔥';
                  if (g.includes('Hipertrofia')) icon = '💪';
                  if (g.includes('Recomposição')) icon = '⚖️';
                  if (g.includes('Manter')) icon = '🛡️';
                  
                  return (
                    <button
                      key={g}
                      onClick={() => setProfile({...profile, goal: g})}
                      className={`w-full text-left p-3 rounded-xl border transition-all font-medium text-sm flex items-center gap-3 ${colorClass} ${profile.goal === g ? 'shadow-md' : 'hover:bg-gray-50'}`}
                    >
                      <span className="text-xl">{icon}</span>
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Meals */}
        {step === 3 && (
          <div className="animate-fade-in">
            <p className="text-gray-600 mb-4 text-sm text-center">Quais refeições você deseja incluir no seu dia a dia?</p>
            <div className="space-y-3">
              {Object.values(MealType).map((meal) => (
                <label 
                  key={meal} 
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    profile.selectedMeals.includes(meal)
                      ? 'border-brand-500 bg-brand-50 shadow-md transform scale-[1.02]'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="font-medium">{meal}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    profile.selectedMeals.includes(meal) ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                  }`}>
                    {profile.selectedMeals.includes(meal) && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={profile.selectedMeals.includes(meal)}
                    onChange={() => toggleMeal(meal)}
                  />
                </label>
              ))}
            </div>
            {profile.selectedMeals.length === 0 && (
              <p className="text-red-500 text-xs mt-2 text-center">Selecione pelo menos uma refeição.</p>
            )}
          </div>
        )}

        {/* Step 4: Configuration (Fasting & Cheat Day) */}
        {step === 4 && (
          <div className="animate-fade-in space-y-8">
            
            {/* Jejum Intermitente Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                Jejum Intermitente
              </h3>
              
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-purple-900 font-medium">Ativar Jejum?</span>
                  <div className={`w-12 h-7 rounded-full flex items-center p-1 transition-colors ${profile.intermittentFasting.enabled ? 'bg-purple-600' : 'bg-gray-300'}`}>
                     <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${profile.intermittentFasting.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={profile.intermittentFasting.enabled}
                    onChange={() => setProfile({
                      ...profile, 
                      intermittentFasting: { 
                        ...profile.intermittentFasting, 
                        enabled: !profile.intermittentFasting.enabled 
                      }
                    })}
                  />
                </label>
              </div>

              {profile.intermittentFasting.enabled && (
                <div className="animate-fade-in space-y-4 pl-2 border-l-2 border-purple-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Início</label>
                      <input 
                        type="time" 
                        value={profile.intermittentFasting.startTime}
                        onChange={(e) => setProfile({
                          ...profile, 
                          intermittentFasting: { ...profile.intermittentFasting, startTime: e.target.value }
                        })}
                        className="w-full p-2 border border-purple-200 rounded-lg text-center font-bold text-purple-900"
                      />
                    </div>
                     <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Janela</label>
                       <select 
                         value={profile.intermittentFasting.hours}
                         onChange={(e) => setProfile({
                          ...profile, 
                          intermittentFasting: { ...profile.intermittentFasting, hours: Number(e.target.value) }
                        })}
                        className="w-full p-2 border border-purple-200 rounded-lg text-center font-bold text-purple-900"
                       >
                         {FASTING_HOURS.map(h => <option key={h} value={h}>{h} horas</option>)}
                       </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Dias de Jejum</label>
                    <div className="flex justify-between">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleFastingDay(day)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                            profile.intermittentFasting.days.includes(day)
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {day.charAt(0)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Dia Livre Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
                Dia Livre (Cheat Day)
              </h3>
              
              <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                <p className="text-xs text-yellow-800 mb-3">
                  Escolha um dia da semana para comer o que quiser, sem restrições do plano.
                </p>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                     onClick={() => setProfile({...profile, cheatDay: undefined})}
                     className={`px-3 py-2 rounded-lg text-xs font-bold border ${!profile.cheatDay ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-500 border-gray-200'}`}
                  >
                    Não quero
                  </button>
                  {FULL_WEEKDAYS.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => setProfile({...profile, cheatDay: day})}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        profile.cheatDay === day
                        ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {WEEKDAYS[idx]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Footer Controls */}
      <div className="mt-4 pt-4 border-t border-gray-100 bg-white">
        <button
          onClick={handleNext}
          disabled={
            isLoading || 
            (step === 3 && profile.selectedMeals.length === 0) ||
            (step === 4 && profile.intermittentFasting.enabled && profile.intermittentFasting.days.length === 0)
          }
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all ${
            isLoading || (step === 3 && profile.selectedMeals.length === 0) || (step === 4 && profile.intermittentFasting.enabled && profile.intermittentFasting.days.length === 0)
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {loadingMessage || "Gerando..."}
            </>
          ) : step === 4 ? (
            <>
              Criar Meu Plano
              <ChefHat size={20} />
            </>
          ) : (
            <>
              Próximo
              <ChevronRight size={20} />
            </>
          )}
        </button>
        {step > 1 && !isLoading && (
          <button 
            onClick={() => setStep(step - 1)}
            className="w-full mt-3 text-gray-500 text-sm font-medium py-2 hover:text-gray-800"
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
