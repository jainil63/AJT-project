import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

const SearchableSelect = ({ 
  options = [], 
  value = "", 
  onChange, 
  placeholder = "Select...",
  labelKey = "name",
  valueKey = "id",
  searchFields = [] // array of keys to search in, e.g. ['patientName', 'mobileNo']
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => {
    const query = searchQuery.toLowerCase();
    
    // Default search in labelKey
    if (option[labelKey]?.toLowerCase().includes(query)) return true;
    
    // Search in additional fields
    for (const field of searchFields) {
      if (option[field]?.toString().toLowerCase().includes(query)) return true;
    }
    
    return false;
  });

  const selectedOption = options.find(option => option[valueKey]?.toString() === value?.toString());

  const handleSelect = (option) => {
    onChange(option[valueKey]);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[44px] w-full px-4 py-2.5 bg-slate-50 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'ring-2 ring-brand-500/10 border-brand-500 bg-white' : 'border-slate-200 hover:border-slate-300'}`}
      >
        <div className="flex-1 overflow-hidden">
          {selectedOption ? (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 truncate">{selectedOption[labelKey]}</span>
              {searchFields.includes('mobileNo') && selectedOption.mobileNo && (
                <span className="text-[10px] text-slate-500">Tel: {selectedOption.mobileNo}</span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="ml-2 flex items-center text-slate-400">
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-60 w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                autoFocus
                type="text"
                placeholder="Search name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = option[valueKey]?.toString() === value?.toString();
                return (
                  <button
                    key={option[valueKey]}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${isSelected ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                  >
                    <div className="flex flex-col items-start translate-x-1">
                       <span className="truncate">{option[labelKey]}</span>
                       {searchFields.includes('mobileNo') && option.mobileNo && (
                         <span className={`text-[10px] ${isSelected ? 'text-brand-500' : 'text-slate-400'}`}>
                           {option.mobileNo}
                         </span>
                       )}
                    </div>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center flex flex-col items-center gap-2">
                 <X className="w-8 h-8 text-slate-200" />
                 <span className="text-slate-400 text-sm">No patients found</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
