
import React from 'react';
import { SavedPlan } from '../types';
import { Trash2, ArrowRight, Calendar, Flame, ChevronLeft } from 'lucide-react';

interface Props {
  plans: SavedPlan[];
  onLoad: (plan: SavedPlan) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const SavedPlansView: React.FC<Props> = ({ plans, onLoad, onDelete, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-6 bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Meus Planos</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {plans.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-600">Nenhum plano salvo.</p>
            <p className="text-sm text-gray-400">Crie um novo cardápio e clique no coração para salvar.</p>
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{plan.name}</h3>
                  <p className="text-xs text-gray-400">Criado em: {new Date(plan.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                    plan.userProfile.goal.includes('Hipertrofia') ? 'bg-blue-100 text-blue-700' :
                    plan.userProfile.goal.includes('Gordura') ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                }`}>
                    {plan.userProfile.goal.split(' ')[0]}
                </div>
              </div>

              <div className="flex gap-4 my-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                    <Flame size={14} className="text-brand-500" />
                    <span>{Math.round(plan.planData.targetCalories)} kcal/dia</span>
                </div>
                <div>
                    Refeições: {plan.userProfile.selectedMeals.length}
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-3 border-t border-gray-50">
                <button 
                  onClick={() => onDelete(plan.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => onLoad(plan)}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                >
                  Abrir Plano
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SavedPlansView;
