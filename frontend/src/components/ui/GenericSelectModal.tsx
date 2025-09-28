import React, { useEffect, useMemo, useState } from 'react';
import Button from './Button';

export type Column<T> = {
  header: string;
  render?: (item: T) => React.ReactNode;
  field?: keyof T; // fallback if no render provided
  className?: string;
};

export interface GenericSelectModalProps<T> {
  isOpen: boolean;
  title?: string;
  items: T[];
  idKey: keyof T | ((item: T) => string);
  columns: Column<T>[];
  searchFields?: (keyof T)[]; // which fields to search against
  placeholderText?: string;
  multiSelect?: boolean; // default true; when false behaves like a single-select
  initialSelected?: string[]; // avoid passing a new [] each render; omit if none
  disabledIds?: string[]; // rows that cannot be toggled
  pageSizeOptions?: number[]; // default [10, 15, 20, 50]
  defaultPageSize?: number; // default 10
  footerPrimaryLabel?: string; // default 'Confirm'
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

function getId<T>(idKey: keyof T | ((item: T) => string), item: T): string {
  return typeof idKey === 'function' ? idKey(item) : String(item[idKey]);

}

function GenericSelectModal<T>({
  isOpen,
  title = 'Select',
  items,
  idKey,
  columns,
  searchFields = [],
  placeholderText = 'Search…',
  multiSelect = true,
  initialSelected,
  disabledIds,
  pageSizeOptions = [10, 15, 20, 50],
  defaultPageSize = 10,
  footerPrimaryLabel = 'Confirm',
  onClose,
  onConfirm,
}: GenericSelectModalProps<T>) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected ?? []));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  // Use useMemo to stabilize the array reference
  const safeItems = useMemo<T[]>(() => (Array.isArray(items) ? items : []), [items]);
  const disabledSet = useMemo(() => new Set(disabledIds ?? []), [disabledIds]);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(initialSelected ?? []));
      setPage(1);
      setSearch('');
      setPageSize(defaultPageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch || (searchFields?.length ?? 0) === 0) return safeItems;
    const fields = searchFields as (keyof T)[];
    return safeItems.filter((it) =>
      fields.some((f) => (String((it as any)[f]) || '').toLowerCase().includes(normalizedSearch))
    );
  }, [safeItems, normalizedSearch, searchFields]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = filtered.slice(startIdx, endIdx);

  const isAllPageSelected = useMemo(() => {
    if (pageItems.length === 0) return false;
    return pageItems.every((item) => {
      const id = getId(idKey, item);
      return selected.has(id) || disabledSet.has(id);
    });
  }, [pageItems, selected, disabledSet, idKey]);

  const toggleItem = (id: string) => {
    if (disabledSet.has(id)) return;
    if (!multiSelect) {
      setSelected(new Set([id]));
      return;
    }
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAllOnPage = () => {
    const ids = pageItems.map((it) => getId(idKey, it)).filter((id) => !disabledSet.has(id));
    const next = new Set(selected);
    const allSelected = ids.every((id) => next.has(id));
    if (allSelected) ids.forEach((id) => next.delete(id)); else ids.forEach((id) => next.add(id));
    setSelected(next);
  };

  const clearAll = () => setSelected(new Set());
  const confirm = () => onConfirm(Array.from(selected));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
      <div className="relative w-full max-w-4xl mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl h-[80vh] max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">✕</button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={placeholderText}
              className="w-full md:max-w-sm p-2 border rounded-md dark:bg-dark-input"
            />
            <div className="flex-1" />
            {multiSelect && (
              <button type="button" onClick={clearAll} className="text-sm text-red-600 hover:underline">Clear selections</button>
            )}
          </div>

          <div className="border rounded-md overflow-hidden max-h-[48vh]">
            <div className="overflow-y-auto" style={{ maxHeight: '48vh' }}>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {multiSelect && (
                        <input type="checkbox" checked={isAllPageSelected} onChange={toggleAllOnPage} aria-label="Select all on page" />
                      )}
                    </th>
                    {columns.map((c) => (
                      <th key={c.header} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{c.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-div divide-y divide-gray-200 dark:divide-gray-700">
                  {pageItems.map((item) => {
                    const id = getId(idKey, item);
                    const isChecked = selected.has(id);
                    const rowClass = isChecked ? 'bg-blue-50 dark:bg-blue-900/30' : '';
                    return (
                      <tr key={id} className={rowClass}>
                        <td className="px-3 py-2">
                          {multiSelect ? (
                            <input type="checkbox" checked={isChecked} disabled={disabledSet.has(id)} onChange={() => toggleItem(id)} aria-label={`Select ${id}`} />
                          ) : (
                            <input type="radio" name="generic-single" checked={isChecked} disabled={disabledSet.has(id)} onChange={() => toggleItem(id)} aria-label={`Select ${id}`} />
                          )}
                        </td>
                        {columns.map((c, idx) => (
                          <td key={idx} className={`px-3 py-2 text-sm ${c.className || ''}`}>
                            {c.render ? c.render(item) : String((item as any)[c.field ?? ''])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-sm text-gray-500">No results</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Showing {total === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Rows per page</label>
              <select
                value={pageSize}
                onChange={(e) => { const n = parseInt(e.target.value) || defaultPageSize; setPageSize(n); setPage(1); }}
                className="p-1 border rounded dark:bg-dark-input text-sm"
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Prev</Button>
              <span className="text-sm">{currentPage} / {pageCount}</span>
              <Button type="button" variant="outline" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}>Next</Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" onClick={confirm}>{footerPrimaryLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export default GenericSelectModal;
