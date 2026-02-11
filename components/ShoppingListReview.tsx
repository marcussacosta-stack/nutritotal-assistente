import React, { useState, useEffect } from 'react';
import { ShoppingListResult, ShoppingItem, ShoppingBudget } from '../types';
import { getShoppingItemSubstitute } from '../services/geminiService';
import { Check, ShoppingCart, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';

interface Props {
  initialList: ShoppingListResult;
  onConfirm: (selectedItems: string[]) => void;
  isLoading: boolean;
  budget: ShoppingBudget;
}

const ShoppingListReview: React.FC<Props> = ({ initialList, onConfirm, isLoading, budget }) => {
  // Local state to hold the list, as the user might modify it by substituting items
  const [listItems, setListItems] = useState<ShoppingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [substitutingItemName, setSubstitutingItemName] = useState<string | null>(null);

  // Initialize state when props change
  useEffect(() => {
    if (initialList?.items) {
      setListItems(initialList.items);
      // Default: Select all items
      const allItems = new Set(initialList.items.map(i => i.name));
      setSelectedItems(allItems);
    }
  }, [initialList]);

  const toggleItem = (name: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setSelectedItems(newSet);
  };

  const handleSubstitute = async (e: React.MouseEvent, item: ShoppingItem) => {
    e.stopPropagation(); // Prevent toggling the checkbox
    setSubstitutingItemName(item.name);

    try {
      const newItem = await getShoppingItemSubstitute(item, budget);
      
      // Update the list with the new item
      setListItems(prevItems => 
        prevItems.map(i => (i.name === item.name && i.category === item.category) ? newItem : i)
      );

      // Update selection: if old item was selected, new one should be too
      if (selectedItems.has(item.name)) {
        const newSet = new Set(selectedItems);
        newSet.delete(item.name);
        newSet.add(newItem.name);
        setSelectedItems(newSet);
      }

    } catch (error) {
      alert("Não foi possível substituir este item agora. Tente novamente.");
    } finally {
      setSubstitutingItemName(null);
    }
  };

  // Group items by category using the local state 'listItems'
  const groupedItems = listItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const handleConfirm = () => {
    if (selectedItems.size === 0) {
      alert("Selecione pelo menos um item para compor seu cardápio.");
      return;
    }
    onConfirm(Array.from(selectedItems));
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-6 pb-2 border-b bg-white z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand-100 p-3 rounded-xl text-brand-600">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">1º Passo: Suas Compras</h2>
            <p className="text-sm text-gray-500">Revise e personalize sua lista sugerida.</p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-xs mt-2 border border-blue-100">
          <strong>Como funciona:</strong> Selecione o que você tem ou vai comprar. Use o botão <RefreshCw size={12} className="inline mx-0.5"/> para trocar alimentos que você não gosta.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-32">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="mb-6 animate-fade-in">
            <h3 className="font-bold text-gray-800 mb-3 sticky top-0 bg-white py-1 z-10">{category}</h3>
            <div className="space-y-2">
              {(items as ShoppingItem[]).map((item, idx) => {
                const isSelected = selectedItems.has(item.name);
                const isSubstituting = substitutingItemName === item.name;

                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleItem(item.name)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                      isSelected 
                      ? 'bg-green-50 border-green-200 shadow-sm' 
                      : 'bg-white border-gray-100 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                      isSelected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check size={16} className="text-white" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isSelected ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">{item.quantity}</p>
                    </div>

                    <button
                      onClick={(e) => handleSubstitute(e, item)}
                      disabled={isSubstituting || isLoading}
                      className="p-2 text-gray-400 hover:text-brand-600 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                      title="Substituir por opção similar"
                    >
                      {isSubstituting ? (
                        <Loader2 size={18} className="animate-spin text-brand-500" />
                      ) : (
                        <RefreshCw size={18} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-white absolute bottom-0 left-0 right-0">
        <button
          onClick={handleConfirm}
          disabled={isLoading || selectedItems.size === 0}
          className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg hover:bg-brand-700 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Criando Cardápio...
            </>
          ) : (
            <>
              Gerar Cardápio com estes Itens
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ShoppingListReview;