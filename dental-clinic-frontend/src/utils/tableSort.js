/**
 * Compare two cell values for table sorting.
 * @param {'auto'|'string'|'number'|'date'} type
 */
export function compareValues(a, b, type = 'auto') {
    const isEmpty = (v) => v === null || v === undefined || v === '';
    if (isEmpty(a) && isEmpty(b)) return 0;
    if (isEmpty(a)) return 1;
    if (isEmpty(b)) return -1;

    if (type === 'number') {
        const na = Number(a);
        const nb = Number(b);
        if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
        if (Number.isNaN(na)) return 1;
        if (Number.isNaN(nb)) return -1;
        return na - nb;
    }

    if (type === 'date') {
        const ta = new Date(a).getTime();
        const tb = new Date(b).getTime();
        if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
        if (Number.isNaN(ta)) return 1;
        if (Number.isNaN(tb)) return -1;
        return ta - tb;
    }

    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/** Normalize accessor to { getValue, type, defaultDir, sortType }. */
export function resolveAccessorSpec(spec) {
    if (typeof spec === 'function') {
        return { getValue: spec, type: 'auto', defaultDir: 'asc', sortType: 'text' };
    }
    const type = spec.type || 'auto';
    const sortType = spec.sortType || (type === 'date' ? 'date' : type === 'number' ? 'number' : 'text');
    const defaultDir =
        spec.defaultDir ?? (type === 'date' || type === 'number' ? 'desc' : 'asc');
    return { getValue: spec.getValue, type, defaultDir, sortType };
}

export function getDefaultSortDir(accessors, key) {
    if (!accessors?.[key]) return 'asc';
    return resolveAccessorSpec(accessors[key]).defaultDir;
}

export function buildSortTypeMap(accessors) {
    if (!accessors) return {};
    return Object.fromEntries(
        Object.keys(accessors).map((k) => [k, resolveAccessorSpec(accessors[k]).sortType])
    );
}

/**
 * @param {Array} rows
 * @param {string|null} sortKey
 * @param {'asc'|'desc'|null} direction
 * @param {Record<string, Function|{ getValue: Function, type?: string }>} accessors
 */
export function sortRows(rows, sortKey, direction, accessors) {
    if (!sortKey || !direction || !accessors?.[sortKey]) return rows;

    const { getValue, type } = resolveAccessorSpec(accessors[sortKey]);
    const mult = direction === 'asc' ? 1 : -1;

    return [...rows].sort((rowA, rowB) => compareValues(getValue(rowA), getValue(rowB), type) * mult);
}

/** Build accessors map from column definitions used with SortableTableHeader */
export function buildSortAccessors(columns) {
    const accessors = {};
    columns.forEach((col) => {
        if (col.sortable === false || !col.getValue) return;
        accessors[col.key] = col.type ? { getValue: col.getValue, type: col.type } : col.getValue;
    });
    return accessors;
}
