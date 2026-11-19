import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check } from 'lucide-react';

const MultiSelect = ({ 
  options = [], 
  selectedIds = [], 
  onChange, 
  placeholder = "Select options...",
  labelKey = "name",
  valueKey = "id",
  colorKey = "color",
  fixedDropdown = false,
  dropdownZIndex = 70,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const updateDropdownPosition = () => {
    if (!fixedDropdown || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      zIndex: dropdownZIndex,
    });
  };

  useEffect(() => {
    if (!isOpen || !fixedDropdown) return;
    updateDropdownPosition();
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isOpen, fixedDropdown, dropdownZIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inTrigger = containerRef.current?.contains(event.target);
      const inDropdown = event.target.closest?.('[data-multiselect-dropdown]');
      if (!inTrigger && !inDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => 
    option[labelKey]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOptions = options.filter(option => 
    selectedIds.includes(option[valueKey])
  );

  const toggleOption = (id) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id];
    onChange(newSelectedIds);
  };

  const removeOption = (e, id) => {
    e.stopPropagation();
    onChange(selectedIds.filter(selectedId => selectedId !== id));
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        ref={triggerRef}
        onClick={() => {
          setIsOpen((open) => {
            const next = !open;
            if (next && fixedDropdown) {
              requestAnimationFrame(updateDropdownPosition);
            }
            return next;
          });
        }}
        className={`min-h-[44px] w-full px-3 py-1.5 bg-slate-50 border rounded-xl flex flex-wrap gap-1.5 cursor-pointer transition-all ${isOpen ? 'ring-2 ring-brand-500/10 border-brand-500 bg-white' : 'border-slate-200 hover:border-slate-300'}`}
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.map(option => (
            <span 
              key={option[valueKey]}
              style={option[colorKey] ? { backgroundColor: `${option[colorKey]}15`, color: option[colorKey], borderColor: `${option[colorKey]}30` } : {}}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border bg-slate-100 text-slate-700 border-slate-200"
            >
              {option[colorKey] && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: option[colorKey] }}></span>}
              {option[labelKey]}
              <button 
                onClick={(e) => removeOption(e, option[valueKey])}
                className="hover:bg-black/5 rounded-full p-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-slate-400 text-sm py-1">{placeholder}</span>
        )}
        <div className="ml-auto flex items-center pr-1 text-slate-400">
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (() => {
        const dropdown = (
          <div
            data-multiselect-dropdown
            style={fixedDropdown ? dropdownStyle : undefined}
            className={`${fixedDropdown ? '' : 'absolute z-50 w-full mt-2'} bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden`}
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(option => {
                  const isSelected = selectedIds.includes(option[valueKey]);
                  return (
                    <button
                      key={option[valueKey]}
                      type="button"
                      onClick={() => toggleOption(option[valueKey])}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${isSelected ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                    >
                      <div className="flex items-center gap-2">
                         {option[colorKey] && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: option[colorKey] }}></span>}
                         {option[labelKey]}
                      </div>
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                   No results found
                </div>
              )}
            </div>
          </div>
        );
        return fixedDropdown ? createPortal(dropdown, document.body) : dropdown;
      })()}
    </div>
  );
};

export default MultiSelect;
