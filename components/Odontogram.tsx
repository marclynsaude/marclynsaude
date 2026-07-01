import React, { useState } from 'react';
import { ToothRecord } from '../types';
import { Check, AlertCircle, X, Activity } from 'lucide-react';

interface OdontogramProps {
  initialData?: ToothRecord[];
  onChange: (data: ToothRecord[]) => void;
  readOnly?: boolean;
}

const TOOTH_NUMBERS = [
  [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
];

const CONDITIONS = [
  { id: 'healthy', label: 'Saudável', color: 'bg-emerald-500', icon: <Check size={10}/> },
  { id: 'cavity', label: 'Cárie', color: 'bg-red-500', icon: <AlertCircle size={10}/> },
  { id: 'missing', label: 'Ausente', color: 'bg-slate-300', icon: <X size={10}/> },
  { id: 'treatment', label: 'Tratamento', color: 'bg-amber-500', icon: <Activity size={10}/> }
];

export const Odontogram: React.FC<OdontogramProps> = ({ initialData = [], onChange, readOnly = false }) => {
  const [data, setData] = useState<ToothRecord[]>(initialData);

  const handleToothClick = (num: number) => {
    if (readOnly) return;
    
    const existing = data.find(t => t.toothNumber === num);
    let newData: ToothRecord[];
    
    if (!existing) {
      newData = [...data, { toothNumber: num, condition: 'cavity' }];
    } else {
      const currentIndex = CONDITIONS.findIndex(c => c.id === existing.condition);
      const nextIndex = (currentIndex + 1) % CONDITIONS.length;
      
      if (nextIndex === 0) {
        newData = data.filter(t => t.toothNumber !== num);
      } else {
        newData = data.map(t => t.toothNumber === num ? { ...t, condition: CONDITIONS[nextIndex].id as any } : t);
      }
    }
    
    setData(newData);
    onChange(newData);
  };

  const getToothColor = (num: number) => {
    const tooth = data.find(t => t.toothNumber === num);
    if (!tooth) return 'bg-white border-slate-200 text-slate-400';
    const condition = CONDITIONS.find(c => c.id === tooth.condition);
    return `${condition?.color} text-white border-transparent`;
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center">
        <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Odontograma Interativo</h4>
        <div className="flex gap-3">
          {CONDITIONS.map(c => (
            <div key={c.id} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${c.color}`}></div>
              <span className="text-[8px] font-black text-slate-400 uppercase">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {TOOTH_NUMBERS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map(num => (
              <button
                key={num}
                onClick={() => handleToothClick(num)}
                className={`w-8 h-10 rounded-lg border font-black text-[10px] flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-90 ${getToothColor(num)}`}
                title={`Dente ${num}`}
              >
                {num}
                {data.find(t => t.toothNumber === num) && (
                  <div className="mt-0.5">
                    {CONDITIONS.find(c => c.id === data.find(t => t.toothNumber === num)?.condition)?.icon}
                  </div>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
      
      {!readOnly && (
        <p className="text-[8px] text-slate-400 font-bold uppercase text-center italic">Clique no dente para alternar o estado (Saudável → Cárie → Ausente → Tratamento)</p>
      )}
    </div>
  );
};
