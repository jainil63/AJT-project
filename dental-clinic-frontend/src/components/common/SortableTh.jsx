import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { getSortTooltip } from '../../utils/sortColumnHelpers';

/**
 * Clickable table header — toggles asc/desc via parent onSort(key).
 * sortType: 'date' | 'number' | 'text' — controls tooltip wording.
 */
const SortableTh = ({
    label,
    sortKey,
    activeKey,
    direction,
    onSort,
    className = '',
    align = 'left',
    sortable = true,
    sortType = 'text'
}) => {
    const thAlign = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    if (!sortable) {
        return (
            <th className={`font-semibold ${thAlign} ${className || 'px-6 py-3'}`}>
                {label}
            </th>
        );
    }

    const active = activeKey === sortKey;
    const alignCls =
        align === 'right' ? 'justify-end ml-auto' : align === 'center' ? 'justify-center mx-auto' : '';

    return (
        <th className={`font-semibold ${className || 'px-6 py-3'}`}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={`inline-flex items-center gap-1.5 text-left hover:text-brand-700 transition-colors group ${alignCls} max-w-full`}
                title={getSortTooltip(sortType, direction, active)}
                aria-label={`${label}, ${getSortTooltip(sortType, direction, active)}`}
            >
                <span className="truncate">{label}</span>
                {active ? (
                    direction === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 shrink-0 text-brand-600" aria-hidden />
                    ) : (
                        <ArrowDown className="w-3.5 h-3.5 shrink-0 text-brand-600" aria-hidden />
                    )
                ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 shrink-0 text-slate-300 group-hover:text-brand-400" aria-hidden />
                )}
            </button>
        </th>
    );
};

export default SortableTh;
