import React, { useState, useEffect, useRef } from 'react';
import { Droplets, Bell, BellOff, Plus, Minus, Settings, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  dailyTarget: number; // in ml
}

const WaterTracker: React.FC<Props> = ({ dailyTarget }) => {
  const [consumed, setConsumed] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [cupSize, setCupSize] = useState(250); // ml
  
  // Schedule State
  const [showSettings, setShowSettings] = useState(false);
  const [wakeTime, setWakeTime] = useState("08:00");
  const [bedTime, setBedTime] = useState("22:00");

  const progress = Math.min((consumed / dailyTarget) * 100, 100);

  // Calculate Hourly Goal
  const startHour = parseInt(wakeTime.split(':')[0]);
  const endHour = parseInt(bedTime.split(':')[0]);
  // Handle day wrap around or simple subtraction
  const totalHours = endHour > startHour ? endHour - startHour : (24 - startHour) + endHour;
  const hourlyGoal = Math.round(dailyTarget / (totalHours > 0 ? totalHours : 1));

  // Request notification permission
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações de área de trabalho");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(!notificationsEnabled);
      return;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        new Notification("Notificações de Água Ativadas!", {
          body: `Vamos te lembrar de beber aprox. ${hourlyGoal}ml por hora entre ${wakeTime} e ${bedTime}.`,
          icon: "https://cdn-icons-png.flaticon.com/512/3105/3105807.png"
        });
      }
    }
  };

  // Notification Logic
  useEffect(() => {
    if (!notificationsEnabled) return;

    // Check every minute if we should notify
    const interval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      // Check if we are within the active window
      // Note: Simple logic assuming wake < bed. Complex logic needed for night shifts.
      const isDayShift = startHour < endHour;
      const inWindow = isDayShift 
        ? (currentHour >= startHour && currentHour < endHour)
        : (currentHour >= startHour || currentHour < endHour);

      // Trigger notification at the top of the hour (minute 0) if we haven't reached the goal
      if (inWindow && currentMin === 0 && consumed < dailyTarget) {
         new Notification("Hora de Hidratar! 💧", {
          body: `Meta horária: ${hourlyGoal}ml. Você já bebeu ${consumed}ml hoje.`,
          icon: "https://cdn-icons-png.flaticon.com/512/3105/3105807.png"
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [notificationsEnabled, consumed, dailyTarget, startHour, endHour, hourlyGoal]);

  const addWater = () => {
    setConsumed(prev => Math.min(prev + cupSize, dailyTarget + 1000));
  };

  const removeWater = () => {
    setConsumed(prev => Math.max(0, prev - cupSize));
  };

  return (
    <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl mb-6 relative overflow-hidden transition-all">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Droplets size={20} className="text-blue-200" />
              Hidratação
            </h3>
            <p className="text-blue-200 text-xs">Meta: {dailyTarget}ml</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-blue-700 text-white' : 'bg-blue-800 text-blue-300 hover:bg-blue-700'}`}
              title="Configurar Horários"
            >
              <Settings size={18} />
            </button>
            <button 
              onClick={requestPermission}
              className={`p-2 rounded-full transition-colors ${notificationsEnabled ? 'bg-white text-blue-600' : 'bg-blue-800 text-blue-300 hover:bg-blue-700'}`}
              title={notificationsEnabled ? "Notificações Ativas" : "Ativar Notificações"}
            >
              {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 bg-blue-700/50 p-4 rounded-2xl border border-blue-500/30 animate-fade-in">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Clock size={14} /> Distribuição Inteligente
            </h4>
            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <label className="block text-[10px] uppercase font-bold text-blue-200 mb-1">Acordar</label>
                <input 
                  type="time" 
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full bg-blue-800 text-white rounded-lg p-2 text-center text-sm font-bold border border-blue-600 focus:outline-none focus:border-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] uppercase font-bold text-blue-200 mb-1">Dormir</label>
                <input 
                  type="time" 
                  value={bedTime}
                  onChange={(e) => setBedTime(e.target.value)}
                  className="w-full bg-blue-800 text-white rounded-lg p-2 text-center text-sm font-bold border border-blue-600 focus:outline-none focus:border-white"
                />
              </div>
            </div>
            <div className="text-xs text-blue-200 bg-blue-800/50 p-2 rounded-lg text-center">
              Beba aprox. <strong className="text-white">{hourlyGoal}ml</strong> a cada hora ({totalHours}h ativas)
            </div>
          </div>
        )}

        {/* Main Tracker UI */}
        <div className="flex items-center gap-6">
          {/* Progress Circle */}
          <div className="relative w-24 h-24 flex-shrink-0">
             <div 
               className="w-full h-full rounded-full flex items-center justify-center bg-blue-800"
               style={{
                 background: `conic-gradient(#60a5fa ${progress}%, #1e40af ${progress}% 100%)`
               }}
             >
               <div className="w-20 h-20 bg-blue-600 rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="font-bold text-xl">{Math.round(progress)}%</span>
               </div>
             </div>
          </div>

          <div className="flex-1">
             <div className="text-3xl font-bold mb-1">{consumed} <span className="text-sm font-normal text-blue-200">ml</span></div>
             <div className="flex gap-3 mt-2">
                <button 
                  onClick={removeWater}
                  className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center hover:bg-blue-800 transition active:scale-95"
                >
                  <Minus size={20} />
                </button>
                <button 
                  onClick={addWater}
                  className="flex-1 h-10 rounded-xl bg-white text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition shadow-lg active:scale-95"
                >
                  <Plus size={18} />
                  {cupSize}ml
                </button>
             </div>
          </div>
        </div>
        
        {/* Status Footer */}
        {notificationsEnabled && (
          <div className="mt-4 pt-4 border-t border-blue-500/50 text-[10px] text-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Lembretes: {wakeTime} às {bedTime}
            </div>
            <span>{hourlyGoal}ml/h</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterTracker;