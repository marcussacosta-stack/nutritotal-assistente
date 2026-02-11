import React, { useState, useEffect } from 'react';
import { UserProfile, WeeklyPlanData, ShoppingListResult, ShoppingDuration, ShoppingBudget, SavedPlan, UserAccount, BodyMetricLog } from './types';
import Onboarding from './components/Onboarding';
import PlanDashboard from './components/PlanDashboard';
import ShoppingListReview from './components/ShoppingListReview';
import SavedPlansView from './components/SavedPlansView';
import AuthScreen from './components/AuthScreen';
import ProgressTracker from './components/ProgressTracker';
import { generateWeeklyPlan, generateShoppingListFromProfile, generateShoppingList } from './services/geminiService';
import { savePlanToStorage, deletePlanFromStorage, getCurrentUser, logoutUser, updateUserState, addBodyLog } from './services/storageService';
import { FolderHeart, LogOut, LayoutDashboard, Ruler, Loader2 } from 'lucide-react';

const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="h-screen w-full max-w-md mx-auto bg-white overflow-hidden relative shadow-2xl md:rounded-3xl md:my-8 md:h-[90vh] border-gray-200 md:border">
    {children}
  </div>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [view, setView] = useState<'auth' | 'onboarding' | 'shopping_review' | 'dashboard' | 'saved_plans' | 'progress'>('auth');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // App Data
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanData | null>(null);
  const [suggestedShoppingList, setSuggestedShoppingList] = useState<ShoppingListResult | null>(null);
  const [finalShoppingList, setFinalShoppingList] = useState<ShoppingListResult | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');

  // 1. Initial Load: Check Auth
  useEffect(() => {
    const initAuth = async () => {
      setIsAuthChecking(true);
      try {
        const user = await getCurrentUser();
        if (user) {
          handleLogin(user);
        } else {
          setView('auth');
        }
      } catch (e) {
        console.error("Auth check failed", e);
        setView('auth');
      } finally {
        setIsAuthChecking(false);
      }
    };
    initAuth();
  }, []);

  // 2. Notification Logic (7 Days Check)
  const checkMeasurementNotification = async (user: UserAccount) => {
    const lastLog = user.logs.length > 0 ? user.logs[user.logs.length - 1] : null;
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    
    // Condition: No logs OR last log was > 7 days ago
    const needsMeasurement = !lastLog || (now - lastLog.date > SEVEN_DAYS_MS);

    if (needsMeasurement) {
       // Request permission first
       if ("Notification" in window) {
         if (Notification.permission === "default") {
           await Notification.requestPermission();
         }
         
         if (Notification.permission === "granted") {
           // We only send if we haven't notified recently (e.g., today) to avoid spamming on refresh
           const lastNotif = user.lastMeasurementNotification || 0;
           const ONE_DAY_MS = 24 * 60 * 60 * 1000;
           
           if (now - lastNotif > ONE_DAY_MS) {
              new Notification("Hora de se pesar! ⚖️", {
                body: "Já faz 7 dias desde sua última medição. Lembre-se: em jejum, antes do café e água.",
                icon: "https://cdn-icons-png.flaticon.com/512/3373/3373122.png"
              });
              
              // Update last notification time
              const updatedLastNotif = now;
              await updateUserState(user.id, { lastNotification: updatedLastNotif });
              setCurrentUser({ ...user, lastMeasurementNotification: updatedLastNotif });
           }
         }
       }
    }
  };

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setSavedPlans(user.savedPlans);
    
    // Sync state from cloud
    if (user.currentProfile && user.currentPlan) {
      setUserProfile(user.currentProfile);
      setWeeklyPlan(user.currentPlan);
      setFinalShoppingList(user.currentShoppingList);
      setView('dashboard');
    } else {
      setView('onboarding');
    }
    
    checkMeasurementNotification(user);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserProfile(null);
    setWeeklyPlan(null);
    setView('auth');
  };

  const handleAddLog = async (log: BodyMetricLog) => {
    if (currentUser) {
      // Optimistic update
      const updatedLogs = [...currentUser.logs, log].sort((a,b) => a.date - b.date);
      setCurrentUser({ ...currentUser, logs: updatedLogs });
      
      // Async DB update
      await addBodyLog(currentUser.id, log);
    }
  };

  const handleProfileComplete = async (profile: UserProfile) => {
    setUserProfile(profile);
    setIsLoading(true);
    setError(null);
    setLoadingStep('Analisando seu perfil e criando lista de compras ideal...');

    try {
      const list = await generateShoppingListFromProfile(profile, ShoppingBudget.ECONOMICAL);
      setSuggestedShoppingList(list);
      setView('shopping_review');
    } catch (err: any) {
      setError(err.message || "Erro ao gerar lista inicial.");
      setUserProfile(null); 
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleShoppingListConfirmed = async (selectedItems: string[]) => {
    if (!userProfile || !suggestedShoppingList || !currentUser) return;

    setIsLoading(true);
    setLoadingStep('Criando cardápio usando seus ingredientes...');

    try {
      const confirmedList: ShoppingListResult = {
        estimatedCost: suggestedShoppingList.estimatedCost,
        items: suggestedShoppingList.items.filter(item => selectedItems.includes(item.name)).map(item => ({...item, checked: true}))
      };
      
      setFinalShoppingList(confirmedList);

      const plan = await generateWeeklyPlan(userProfile, selectedItems);
      setWeeklyPlan(plan);
      
      // Save current state to cloud
      await updateUserState(currentUser.id, {
        profile: userProfile,
        currentPlan: plan,
        shoppingList: confirmedList
      });

      const updatedUser = {
        ...currentUser,
        currentProfile: userProfile,
        currentPlan: plan,
        currentShoppingList: confirmedList
      };
      setCurrentUser(updatedUser);

      setView('dashboard');

    } catch (err: any) {
      setError(err.message || "Erro ao gerar o plano alimentar.");
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSavePlan = async (name: string, currentPlan: WeeklyPlanData, currentList: ShoppingListResult | null) => {
    if (!userProfile || !currentUser) return;
    
    const newSavedPlan: SavedPlan = {
      id: Math.random().toString(36).substr(2, 9),
      name: name,
      createdAt: Date.now(),
      planData: currentPlan,
      userProfile: userProfile,
      shoppingList: currentList
    };

    // Optimistic Update
    const updatedPlans = [newSavedPlan, ...currentUser.savedPlans];
    setCurrentUser({ ...currentUser, savedPlans: updatedPlans });
    setSavedPlans(updatedPlans);

    // Async Save
    await savePlanToStorage(currentUser.id, newSavedPlan);
    
    alert("Plano salvo com sucesso!");
  };

  const handleLoadPlan = async (saved: SavedPlan) => {
    if (!currentUser) return;

    setUserProfile(saved.userProfile);
    setWeeklyPlan(saved.planData);
    setFinalShoppingList(saved.shoppingList);
    
    // Update active state in DB when loading a saved plan
    await updateUserState(currentUser.id, {
      profile: saved.userProfile,
      currentPlan: saved.planData,
      shoppingList: saved.shoppingList
    });

    setView('dashboard');
  };

  const handleDeletePlan = async (id: string) => {
    if (!currentUser) return;

    if (window.confirm("Tem certeza que deseja excluir este plano?")) {
      // Optimistic
      const updated = savedPlans.filter(p => p.id !== id);
      setSavedPlans(updated);
      setCurrentUser({ ...currentUser, savedPlans: updated });
      
      // Async
      await deletePlanFromStorage(id);
    }
  };

  const handleReset = async () => {
    setWeeklyPlan(null);
    setSuggestedShoppingList(null);
    setFinalShoppingList(null);
    
    // Clear active state in DB
    if (currentUser) {
       await updateUserState(currentUser.id, {
         currentPlan: null,
         shoppingList: null
       });
       setCurrentUser({ ...currentUser, currentPlan: null, currentShoppingList: null });
    }
    
    setView('onboarding');
  };

  // === RENDERERS ===

  if (isAuthChecking) {
    return (
      <Container>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="animate-spin text-brand-600" size={48} />
        </div>
      </Container>
    );
  }

  if (view === 'auth') {
    return (
      <Container>
        <AuthScreen onLogin={handleLogin} />
      </Container>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
             {/* Icon */}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ops! Algo deu errado.</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => { setError(null); handleReset(); }}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Common Header for Authenticated Views (Optional overlap)
  const renderNav = () => (
    <div className="absolute top-4 right-4 z-50 flex gap-2">
      {view !== 'progress' && (
        <button 
          onClick={() => setView('progress')}
          className="p-2 bg-blue-50 text-blue-700 rounded-full shadow-sm hover:bg-blue-100"
          title="Evolução"
        >
          <Ruler size={18} />
        </button>
      )}
      {view !== 'dashboard' && weeklyPlan && (
        <button 
          onClick={() => setView('dashboard')}
          className="p-2 bg-green-50 text-green-700 rounded-full shadow-sm hover:bg-green-100"
          title="Meu Plano"
        >
          <LayoutDashboard size={18} />
        </button>
      )}
      <button 
        onClick={() => setView('saved_plans')}
        className="p-2 bg-pink-50 text-pink-700 rounded-full shadow-sm hover:bg-pink-100"
        title="Meus Planos"
      >
        <FolderHeart size={18} />
      </button>
      <button 
        onClick={handleLogout}
        className="p-2 bg-gray-100 text-gray-700 rounded-full shadow-sm hover:bg-gray-200"
        title="Sair"
      >
        <LogOut size={18} />
      </button>
    </div>
  );

  if (view === 'progress') {
    return (
      <Container>
        {renderNav()}
        <div className="h-full overflow-y-auto p-6 pt-16">
          <h2 className="text-2xl font-bold mb-4">Olá, {currentUser?.username.split('@')[0]}!</h2>
          <ProgressTracker 
            logs={currentUser?.logs || []} 
            onAddLog={handleAddLog}
          />
        </div>
      </Container>
    );
  }

  if (view === 'dashboard' && weeklyPlan && userProfile) {
    return (
      <div className="h-screen w-full max-w-md mx-auto bg-gray-50 overflow-hidden relative shadow-2xl md:rounded-3xl md:my-8 md:h-[90vh] border-gray-200 md:border">
        {renderNav()}
        <PlanDashboard 
          planData={weeklyPlan} 
          userProfile={userProfile}
          initialShoppingList={finalShoppingList}
          onReset={handleReset}
          onSavePlan={handleSavePlan}
        />
      </div>
    );
  }

  if (view === 'shopping_review' && userProfile && suggestedShoppingList) {
    return (
      <Container>
        <ShoppingListReview 
          initialList={suggestedShoppingList}
          onConfirm={handleShoppingListConfirmed}
          isLoading={isLoading}
          budget={ShoppingBudget.ECONOMICAL}
        />
      </Container>
    );
  }

  if (view === 'saved_plans') {
    return (
      <Container>
        <SavedPlansView 
          plans={savedPlans}
          onLoad={handleLoadPlan}
          onDelete={handleDeletePlan}
          onBack={() => setView(weeklyPlan ? 'dashboard' : 'onboarding')}
        />
      </Container>
    );
  }

  // Default: Onboarding (Input)
  return (
    <div className="h-screen w-full max-w-md mx-auto bg-white overflow-hidden relative shadow-2xl md:rounded-3xl md:my-8 md:h-[90vh] border-gray-200 md:border flex flex-col">
       {renderNav()}
      <Onboarding 
        onComplete={handleProfileComplete} 
        isLoading={isLoading}
        loadingMessage={loadingStep} 
      />
    </div>
  );
};

export default App;