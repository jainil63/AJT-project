import { useState, useMemo, useCallback, useEffect } from 'react';
import { sortRows, resolveAccessorSpec, buildSortTypeMap } from '../utils/tableSort';

/**
 * Client-side table sorting for list/table views.
 * @param {Array} data - rows to sort (usually already filtered)
 * @param {Record<string, Function|{ getValue: Function, type?: string }>} accessors
 * @param {string|null} initialKey
 * @param {'asc'|'desc'} initialDir
 * @param {string|number|null} resetKey - when this changes, sort resets (e.g. active tab id)
 */
export default function useTableSort(data, accessors, initialKey = null, initialDir = 'asc', resetKey = null) {
    const [sortKey, setSortKey] = useState(initialKey);
    const [sortDir, setSortDir] = useState(initialDir);

    useEffect(() => {
        setSortKey(initialKey);
        setSortDir(initialDir);
    }, [resetKey, initialKey, initialDir]);

    const toggleSort = useCallback(
        (key) => {
            if (!accessors?.[key]) return;
            setSortKey((prevKey) => {
                if (prevKey === key) {
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                } else {
                    setSortDir(resolveAccessorSpec(accessors[key]).defaultDir);
                }
                return key;
            });
        },
        [accessors]
    );

    const sortTypes = useMemo(() => buildSortTypeMap(accessors), [accessors]);

    const sortedRows = useMemo(
        () => sortRows(data || [], sortKey, sortDir, accessors),
        [data, sortKey, sortDir, accessors]
    );

    return { sortedRows, sortKey, sortDir, toggleSort, setSortKey, setSortDir, sortTypes };
}
