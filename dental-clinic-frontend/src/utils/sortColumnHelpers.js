/** Build sort accessor specs with sensible default directions and UI hints. */

export const dateCol = (getValue) => ({
    getValue,
    type: 'date',
    defaultDir: 'desc',
    sortType: 'date'
});

export const numCol = (getValue, defaultDir = 'desc') => ({
    getValue,
    type: 'number',
    defaultDir,
    sortType: 'number'
});

export const textCol = (getValue) => ({
    getValue,
    type: 'auto',
    defaultDir: 'asc',
    sortType: 'text'
});

export const getSortTooltip = (sortType, direction, active) => {
    if (!active) return 'Click to sort';
    const map = {
        date: { asc: 'Oldest first', desc: 'Newest first' },
        number: { asc: 'Lowest first', desc: 'Highest first' },
        text: { asc: 'A to Z', desc: 'Z to A' }
    };
    return map[sortType]?.[direction] || (direction === 'asc' ? 'Low to high' : 'High to low');
};

/** Default sort when a tab/section opens (date-based lists). */
export const DATE_LIST_DEFAULT = { key: 'date', dir: 'desc' };

export const defaultSortKeyForTab = (tabId) => {
    if (['payments', 'appointments', 'opd', 'ortho', 'implant', 'followups'].includes(tabId)) {
        return 'date';
    }
    if (tabId === 'documents') return 'name';
    return null;
};
