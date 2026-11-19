import React from 'react';
import { Check } from 'lucide-react';

const ToothChart = ({ type = 'normal', selectedTeeth = [], onToothToggle, onBulkSelect }) => {
  const isNormal = type === 'normal';

  const rows = isNormal ? [
    [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
  ] : [
    [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
    [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]
  ];

  const quadrants = isNormal ? {
    q1: [18, 17, 16, 15, 14, 13, 12, 11],
    q2: [21, 22, 23, 24, 25, 26, 27, 28],
    q3: [31, 32, 33, 34, 35, 36, 37, 38],
    q4: [48, 47, 46, 45, 44, 43, 42, 41]
  } : {
    q1: [55, 54, 53, 52, 51],
    q2: [61, 62, 63, 64, 65],
    q3: [71, 72, 73, 74, 75],
    q4: [85, 84, 83, 82, 81]
  };

  const selectionOptions = [
    { label: '1st Quadrant', range: quadrants.q1, id: 'q1' },
    { label: '2nd Quadrant', range: quadrants.q2, id: 'q2' },
    { label: '3rd Quadrant', range: quadrants.q3, id: 'q3' },
    { label: '4th Quadrant', range: quadrants.q4, id: 'q4' },
    { label: 'Upper Arch', range: [...quadrants.q1, ...quadrants.q2], id: 'upper' },
    { label: 'Lower Arch', range: [...quadrants.q3, ...quadrants.q4], id: 'lower' },
    { label: 'Full Mouth', range: [...quadrants.q1, ...quadrants.q2, ...quadrants.q3, ...quadrants.q4], id: 'full' },
  ];

  const isRangeSelected = (range) => {
    if (range.length === 0) return false;
    return range.every(num => selectedTeeth.includes(num));
  };

  const handleQuickSelectToggle = (range) => {
    if (isRangeSelected(range)) {
      onBulkSelect(selectedTeeth.filter(t => !range.includes(t)));
    } else {
      onBulkSelect([...new Set([...selectedTeeth, ...range])]);
    }
  };

  const getImagePath = (num) => {
    if (!isNormal) return `/teeth/${num}.png`;
    if (num >= 11 && num <= 28) return `/teeth/${num}-tooth-upper.png`;
    if (num >= 31 && num <= 48) return `/teeth/${num}-lower-tooth.png`;
    return `/teeth/${num}.png`;
  };

  return (
    <div className="bg-white p-8 rounded-4xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-x-auto min-h-[500px] flex flex-col">
      
      {/* Selection Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-12 p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
        {selectionOptions.map((opt) => {
          const isSelected = isRangeSelected(opt.range);
          return (
            <button 
              key={opt.id}
              type="button"
              onClick={() => handleQuickSelectToggle(opt.range)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border transition-all duration-200 ${isSelected ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/30' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600'}`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-white/20 border-white/40' : 'bg-slate-50 border-slate-200'}`}>
                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">
                {opt.label.replace(' Quadrant', 'Q')}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onBulkSelect([])}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50 transition-all font-bold text-[10px] uppercase tracking-wider"
        >
          Clear
        </button>
      </div>
      
      {/* Teeth Grid Area */}
      <div className="flex-1 flex flex-col justify-center min-w-max pb-8">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className={`flex justify-center items-end gap-1.5 px-12 relative ${rowIndex === 0 ? 'mb-24' : ''}`}>
             
             {/* Arch Indicator */}
             <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="w-1 h-12 bg-slate-100 rounded-full"></div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] [writing-mode:vertical-lr] rotate-180">
                   {rowIndex === 0 ? 'Upper' : 'Lower'}
                </span>
             </div>

            {row.map((num, idx) => {
              const isSelected = selectedTeeth.includes(num);
              const isMidline = isNormal ? idx === 7 : idx === 4;

              return (
                <div key={num} className={`flex flex-col items-center gap-4 group transition-all duration-300 ${isMidline ? 'mr-16 relative after:content-[""] after:absolute after:right-[-32px] after:top-0 after:bottom-[-20px] after:w-[1.5px] after:bg-slate-200/50 after:rounded-full' : ''}`}>
                  
                  {/* Tooth Visualization */}
                  <div 
                    onClick={() => onToothToggle(num)}
                    className="relative cursor-pointer transition-all duration-500"
                  >
                    <div className={`relative z-10 transition-all duration-500 transform group-hover:-translate-y-2 ${isSelected ? 'scale-115' : 'hover:scale-105'}`}>
                      <img 
                        src={getImagePath(num)} 
                        alt={`Tooth ${num}`}
                        className="w-12 h-20 object-contain transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Selection Control */}
                  <div className="flex flex-col items-center gap-2.5 relative z-20">
                    <button 
                      type="button"
                      onClick={() => onToothToggle(num)}
                      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/20' : 'bg-white border-slate-200 group-hover:border-brand-400 group-hover:scale-110'}`} 
                    >
                        {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                    </button>
                    <span className={`text-[10px] font-black tracking-widest ${isSelected ? 'text-brand-700' : 'text-slate-300 group-hover:text-slate-500'}`}>
                      {num}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Footer Branding/Legend */}
      <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-center gap-12 opacity-50">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-brand-500"></div>
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Selected Unit</span>
        </div>
        <div className="w-px h-3 bg-slate-200"></div>
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-slate-200"></div>
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inactive Unit</span>
        </div>
      </div>
    </div>
  );
};

export default ToothChart;
