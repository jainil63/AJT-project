import { useEffect } from 'react';

/**
 * Step-by-step ESC support for every modal/popup in the app, without touching
 * each modal file.
 *
 * How it works: on Escape we find every visible "modal-shaped" element on the
 * page — anything that combines `fixed inset-0` with a backdrop-like class — and
 * pick the topmost one (highest z-index, breaking ties by DOM order so the most
 * recently mounted modal wins). We then look for its close affordance inside
 * (an element marked `data-modal-close` or the standard lucide X button) and
 * synthesize a click on it.
 *
 * Pressing Escape repeatedly therefore closes nested popups one layer at a time
 * (e.g. the Add-Document picker first, then the surrounding form modal).
 *
 * Modals can opt in explicitly by adding `data-modal-close` to a button. By
 * convention every existing modal in this project already renders a lucide
 * `<X />` button, so the detection works out of the box.
 */

const isVisibleModal = (el) => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const cls = (el.className && typeof el.className === 'string') ? el.className : '';
    // Either a backdrop class on the root or a backdrop child marks this as a modal.
    if (/backdrop-blur|bg-slate-900\/|bg-black\/|bg-slate-900[/\\]/.test(cls)) return true;
    return !!el.querySelector(':scope > .backdrop-blur-sm, :scope > [class*="backdrop-blur"], :scope > [class*="bg-slate-900/"], :scope > [class*="bg-black/"]');
};

const getZ = (el) => {
    const raw = window.getComputedStyle(el).zIndex;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? 0 : n;
};

const findCloseButton = (modal) => {
    // 1. Explicit opt-in attribute.
    const tagged = modal.querySelector('[data-modal-close]:not([disabled])');
    if (tagged) return tagged;

    // 2. Standard lucide X icon inside a button (every modal in this project uses this).
    const xIcons = modal.querySelectorAll('svg.lucide-x, svg.lucide-X');
    for (const icon of xIcons) {
        const btn = icon.closest('button');
        if (btn && !btn.disabled) return btn;
    }

    return null;
};

const GlobalEscapeCloser = () => {
    useEffect(() => {
        const handler = (e) => {
            if (e.key !== 'Escape' && e.key !== 'Esc') return;

            // Let native widgets handle Escape first (open select, contentEditable, etc.).
            const t = e.target;
            if (t && (t.tagName === 'SELECT' || (t.isContentEditable && false))) return;

            const all = Array.from(document.querySelectorAll('.fixed.inset-0, [class*="fixed"][class*="inset-0"]'));
            const modals = all.filter(isVisibleModal);
            if (modals.length === 0) return;

            modals.sort((a, b) => {
                const dz = getZ(b) - getZ(a);
                if (dz !== 0) return dz;
                // Same z-index — pick the one that appears later in the DOM (last opened wins).
                const pos = a.compareDocumentPosition(b);
                if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return 1;
                if (pos & Node.DOCUMENT_POSITION_PRECEDING) return -1;
                return 0;
            });

            const top = modals[0];
            const closeBtn = findCloseButton(top);
            if (!closeBtn) return;

            e.preventDefault();
            e.stopPropagation();
            closeBtn.click();
        };

        document.addEventListener('keydown', handler, true);
        return () => document.removeEventListener('keydown', handler, true);
    }, []);

    return null;
};

export default GlobalEscapeCloser;
