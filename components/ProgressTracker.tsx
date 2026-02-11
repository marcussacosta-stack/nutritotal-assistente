import React, { useState } from 'react';
import { BodyMetricLog } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Ruler, Scale, Calendar, ChevronDown, ChevronUp, Activity } from 'lucide-react';

interface Props {
  logs: BodyMetricLog[];
  onAddLog: (log: BodyMetricLog) => void;
}

const ProgressTracker: React.FC<Props> = ({ logs, onAddLog }) => {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'weight' | 'measurements'>('weight');
  
  const [newLog, setNewLog] = useState({
    weight: '',
    neck: '',
    biceps: '',
    chest: '',
    waist: '',
    hips: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.weight) return;

    const log: BodyMetricLog = {
      date: Date.now(),
      weight: parseFloat(newLog.weight) || 0,
      neck: parseFloat(newLog.neck) || 0,
      biceps: parseFloat(newLog.biceps) || 0,
      chest: parseFloat(newLog.chest) || 0,
      waist: parseFloat(newLog.waist) || 0,
      hips: parseFloat(newLog.hips) || 0,
    };

    onAddLog(log);
    setShowForm(false);
    setNewLog({ weight: '', neck: '', biceps: '', chest: '', waist: '', hips: '' });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const chartData = logs.map(l => ({
    ...l,
    dateStr: formatDate(l.date)
  }));

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
            <Activity className="text-brand-500" />
            Evolução Corporal
          </h3>
          <p className="text-gray-500 text-xs">Acompanhe seu progresso</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-brand-50 text-brand-700'}`}
        >
          {showForm ? <ChevronUp size={16} /> : <Plus size={16} />}
          Nova Medição
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-fade-in">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Peso Atual (kg)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="number" step="0.1" required
                  value={newLog.weight}
                  onChange={(e) => setNewLog({...newLog, weight: e.target.value})}
                  className="w-full pl-9 p-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="0.0"
                />
              </div>
            </div>
            {['neck', 'biceps', 'chest', 'waist', 'hips'].map((part) => (
               <div key={part}>
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">
                    {part === 'neck' ? 'Pescoço' : part === 'biceps' ? 'Bíceps' : part === 'chest' ? 'Peito' : part === 'waist' ? 'Cintura' : 'Quadril'} (cm)
                  </label>
                  <input 
                    type="number" step="0.1"
                    value={newLog[part as keyof typeof newLog]}
                    onChange={(e) => setNewLog({...newLog, [part]: e.target.value})}
                    className="w-full p-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    placeholder="0.0"
                  />
               </div>
            ))}
          </div>
          <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm">
            Salvar Registro
          </button>
        </form>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
           <Ruler className="mx-auto text-gray-300 mb-2" size={32} />
           <p className="text-gray-500 text-sm">Nenhum registro ainda.</p>
           <p className="text-xs text-gray-400">Adicione suas medidas para ver o gráfico.</p>
        </div>
      ) : (
        <div>
          <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
             <button 
               onClick={() => setActiveTab('weight')}
               className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'weight' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
             >
               Peso
             </button>
             <button 
               onClick={() => setActiveTab('measurements')}
               className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'measurements' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
             >
               Medidas
             </button>
          </div>

          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="dateStr" stroke="#9ca3af" tick={{fontSize: 10}} />
                <YAxis stroke="#9ca3af" tick={{fontSize: 10}} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  labelStyle={{color: '#6b7280', marginBottom: '4px'}}
                />
                <Legend wrapperStyle={{paddingTop: '10px'}} />
                
                {activeTab === 'weight' ? (
                   <Line type="monotone" dataKey="weight" name="Peso (kg)" stroke="#16a34a" strokeWidth={3} dot={{r: 4, fill: '#16a34a', strokeWidth: 0}} activeDot={{r: 6}} />
                ) : (
                  <>
                    <Line type="monotone" dataKey="chest" name="Peito" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="waist" name="Cintura" stroke="#f97316" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="hips" name="Quadril" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="biceps" name="Bíceps" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;