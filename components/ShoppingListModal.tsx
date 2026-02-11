import React, { useState } from 'react';
import { ShoppingBudget, ShoppingDuration, ShoppingListResult, WeeklyPlanData, ShoppingItem } from '../types';
import { generateShoppingList, getShoppingItemSubstitute } from '../services/geminiService';
import { X, Check, Copy, ShoppingCart, Loader2, RefreshCw, Archive } from 'lucide-react';

interface Props {
  planData: WeeklyPlanData;
  onClose: () => void;
  // New props for controlled state
  currentList: ShoppingListResult | null;
  onListUpdate: (list: ShoppingListResult) => void;
  checkedItems: Set<string>;
  onToggleItem: (itemName: string) => void;
}

const ShoppingListModal: React.FC<Props> = ({ 
  planData, 
  onClose,
  currentList,
  onListUpdate,
  checkedItems,
  onToggleItem
}) => {
  const [step, setStep] = useState<'config' | 'loading' | 'result'>(currentList ? 'result' : 'config');
  const [duration, setDuration] = useState<ShoppingDuration>(ShoppingDuration.WEEKLY);
  const [budget, setBudget] = useState<ShoppingBudget>(ShoppingBudget.ECONOMICAL);
  const [substitutingItem, setSubstitutingItem] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStep('loading');
    try {
      const result = await generateShoppingList(planData, duration, budget);
      onListUpdate(result); // Update parent state
      setStep('result');
    } catch (e) {
      alert("Erro ao gerar lista. Tente novamente.");
      setStep('config');
    }
  };

  const handleSubstitute = async (item: ShoppingItem) => {
    setSubstitutingItem(item.name);
    try {
      const newItem = await getShoppingItemSubstitute(item, budget);
      
      if (currentList) {
        // Create new list with replaced item
        const newItems = currentList.items.map(i => 
          i.name === item.name && i.category === item.category ? newItem : i
        );
        onListUpdate({ ...currentList, items: newItems });
        
        // If the old item was checked, check the new one if appropriate, 
        // but usually we reset check for new items.
        // If needed, remove old from checkedItems in parent, but simple toggle is safer.
      }
    } catch (e) {
      alert("Não foi possível substituir este item agora.");
    } finally {
      setSubstitutingItem(null);
    }
  };

  const handleAddToStock = () => {
    const count = checkedItems.size;
    if (count === 0) {
      alert("Nenhum item marcado para adicionar ao estoque.");
      return;
    }
    // Logic is already handled by parent state (checkedItems are the stock).
    // This button serves as a confirmation/close action.
    alert(`${count} itens confirmados no seu estoque! O cardápio agora priorizará estes alimentos nas substituições.`);
    onClose();
  };

  const copyToClipboard = () => {
    if (!currentList) return;
    const text = currentList.items.map(item => 
      `[${item.checked || checkedItems.has(item.name) ? 'x' : ' '}] ${item.name}: ${item.quantity}`
    ).join('\n');
    navigator.clipboard.writeText(`Lista de Compras NutriPlan (${duration} - ${budget}):\n\n${text}`);
    alert("Lista copiada!");
  };

  // Group items by category
  const groupedItems = currentList?.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full max-w-lg h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-scale-in">
        
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
               <ShoppingCart size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Lista de Compras</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-32 md:pb-6">
          
          {step === 'config' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Duração da Lista</label>
                <div className="space-y-2">
                  {Object.values(ShoppingDuration).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        duration === d 
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-500' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Perfil de Custo</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(ShoppingBudget).map((b) => (
                    <button
                      key={b}
                      onClick={() => setBudget(b)}
                      className={`p-4 rounded-xl border text-center font-bold transition-all ${
                        budget === b 
                        ? b === ShoppingBudget.PREMIUM 
                          ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500' 
                          : 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500'
                        : 'border-gray-200 text-gray-500 grayscale'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {budget === ShoppingBudget.ECONOMICAL 
                    ? "Prioriza marcas genéricas, promoções e safras." 
                    : "Prioriza orgânicos, marcas premium e itens importados."}
                </p>
              </div>

              <button 
                onClick={handleGenerate}
                className="w-full py-4 mt-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg hover:bg-brand-700 flex items-center justify-center gap-2"
              >
                Gerar Lista Inteligente
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-10">
              <Loader2 size={48} className="animate-spin text-brand-500" />
              <div>
                <h3 className="text-lg font-bold text-gray-800">Calculando quantidades...</h3>
                <p className="text-gray-500">Otimizando sua lista para o perfil {budget}</p>
              </div>
            </div>
          )}

          {step === 'result' && currentList && groupedItems && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase">Estimativa de Custo</p>
                  <p className="text-blue-900 font-bold">{currentList.estimatedCost}</p>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 bg-white rounded-lg text-blue-600 hover:bg-blue-100 transition shadow-sm"
                  title="Copiar Lista"
                >
                  <Copy size={18} />
                </button>
              </div>

              {Object.entries(groupedItems).map(([category, items]: [string, ShoppingItem[]]) => (
                <div key={category}>
                  <h3 className="font-bold text-gray-800 mb-2 sticky top-0 bg-white py-2 border-b border-gray-100 z-10">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, idx) => {
                      const isChecked = checkedItems.has(item.name);
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                            isChecked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 hover:border-brand-200'
                          }`}
                        >
                          <div 
                            onClick={() => onToggleItem(item.name)}
                            className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                              isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'
                            }`}
                          >
                            {isChecked && <Check size={14} className="text-white" />}
                          </div>
                          
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => onToggleItem(item.name)}
                          >
                            <p className={`text-sm font-medium ${isChecked ? 'text-green-800 line-through decoration-green-800/40' : 'text-gray-800'}`}>
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">{item.quantity}</p>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubstitute(item);
                            }}
                            disabled={substitutingItem === item.name}
                            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Substituir item"
                          >
                             {substitutingItem === item.name ? (
                               <Loader2 size={16} className="animate-spin text-brand-500" />
                             ) : (
                               <RefreshCw size={16} />
                             )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
        
        {/* Footer for Result View */}
        {step === 'result' && (
          <div className="p-4 border-t bg-white absolute bottom-0 left-0 right-0 md:relative">
            <div className="flex flex-col gap-3">
              <button 
                  onClick={handleAddToStock}
                  className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Archive size={20} />
                  Adicionar ao Estoque
              </button>
              
              <button 
                  onClick={() => setStep('config')}
                  className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
                >
                  Configurar Novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingListModal;