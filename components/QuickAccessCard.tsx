
import React from 'react';
import { ChevronRight } from 'lucide-react';

interface QuickAccessCardProps {
  title: string;
  icon?: React.ReactNode;
  onClick: () => void;
  description?: string;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ title, icon, onClick, description }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl p-3 md:p-4 border border-slate-100 shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-3 md:gap-4 group h-full overflow-hidden"
    >
      <div className="p-2.5 md:p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors flex-shrink-0 shadow-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-extrabold text-slate-800 text-[10px] sm:text-xs md:text-sm leading-tight group-hover:text-teal-700 transition-colors line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-500 truncate mt-0.5 font-bold uppercase tracking-wider opacity-70">
            {description}
          </p>
        )}
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0 hidden xs:block" />
    </div>
  );
};

export default QuickAccessCard;
