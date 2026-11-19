import React, { useMemo } from 'react';
import SortableTh from './SortableTh';
import useTableSort from '../../hooks/useTableSort';
import { buildSortAccessors } from '../../utils/tableSort';

/**
 * Renders sortable <thead> row + returns sorted data.
 * @param {Array} columns - { key, label, className?, align?, sortable?, type?, getValue? }
 * @param {Array} rows - data to sort
 */
export function useSortableTable(columns, rows) {
    const accessors = useMemo(() => buildSortAccessors(columns), [columns]);
    const sort = useTableSort(rows, accessors);
    return { ...sort, accessors, columns };
}

export function SortableTableHeaderRow({ columns, sortKey, sortDir, toggleSort, rowClassName = '' }) {
    return (
        <tr className={rowClassName}>
            {columns.map((col) => (
                <SortableTh
                    key={col.key}
                    label={col.label}
                    sortKey={col.key}
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                    className={col.className || ''}
                    align={col.align || 'left'}
                    sortable={col.sortable !== false && !!col.getValue}
                />
            ))}
        </tr>
    );
}

export default SortableTableHeaderRow;
