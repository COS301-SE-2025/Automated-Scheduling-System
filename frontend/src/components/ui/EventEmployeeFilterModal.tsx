import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '../../types/user';
import type { JobPosition } from '../../services/jobPositionService';
import Button from './Button';

type Mode = 'employees' | 'positions';

export interface EventEmployeeFilterModalProps {
  isOpen: boolean;
  mode: Mode;
  title?: string;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void; // employeeNumbers or positionCodes
  // Provide data for the selected mode. Only one of these will be used depending on mode.
  users?: User[];
  positions?: JobPosition[];
  initialSelected?: string[]; // initial employeeNumbers or positionCodes
  disabledIds?: string[]; // e.g., employees included via positions
}

const PAGE_SIZE_DEFAULT = 10;

const EventEmployeeFilterModal: React.FC<EventEmployeeFilterModalProps> = ({
  isOpen,
  mode,
  title,
  onClose,
  onConfirm,
  users = [],
  positions = [],
  initialSelected = [],
  disabledIds = [],
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  // Initialize or reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(initialSelected));
      setPage(1);
      setSearch('');
      setStatusFilter('Active');
    }
  }, [isOpen, initialSelected]);

  const normalizedSearch = search.trim().toLowerCase();
  const disabledSet = useMemo(() => new Set(disabledIds), [disabledIds]);

  // Derive unique statuses from users, include sensible defaults
  const statusOptions = useMemo(() => {
    const base = new Set<string>(['Active', 'On Leave', 'Terminated']);
    users.forEach((u) => base.add(String(u.employeeStatus || '').trim()));
    // Remove empty
    base.delete('');
    return ['All', ...Array.from(base.values()).sort()];
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (mode !== 'employees') return [] as User[];
    let list = users;
    if (statusFilter !== 'All') {
      list = list.filter((u) => (u.employeeStatus || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (normalizedSearch) {
      list = list.filter((u) =>
        (u.name || '').toLowerCase().includes(normalizedSearch) ||
        (u.employeeNumber || '').toLowerCase().includes(normalizedSearch)
      );
    }
    return list;
  }, [mode, users, statusFilter, normalizedSearch]);

  const filteredPositions = useMemo(() => {
    if (mode !== 'positions') return [] as JobPosition[];
    let list = positions;
    if (normalizedSearch) {
      list = list.filter((p) =>
        (p.jobTitle || '').toLowerCase().includes(normalizedSearch) ||
        (p.positionMatrixCode || '').toLowerCase().includes(normalizedSearch)
      );
    }
    return list;
  }, [mode, positions, normalizedSearch]);

  const total = mode === 'employees' ? filteredUsers.length : filteredPositions.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;

  const pageItems = useMemo(() => {
    if (mode === 'employees') return filteredUsers.slice(startIdx, endIdx);
    return filteredPositions.slice(startIdx, endIdx);
  }, [mode, filteredUsers, filteredPositions, startIdx, endIdx]);

  const isAllPageSelected = useMemo(() => {
    if (pageItems.length === 0) return false;
    return pageItems.every((item) => selected.has(mode === 'employees' ? (item as User).employeeNumber : (item as JobPosition).positionMatrixCode));
  }, [pageItems, selected, mode]);

  const toggleItem = (id: string) => {
  if (disabledSet.has(id)) return; // cannot toggle disabled rows
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAllOnPage = () => {
    const ids = pageItems
      .map((item) => (mode === 'employees' ? (item as User).employeeNumber : (item as JobPosition).positionMatrixCode))
      .filter((id) => !disabledSet.has(id));
    const next = new Set(selected);
    const allSelected = ids.every((id) => next.has(id));
    if (allSelected) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    setSelected(next);
  };

  const clearAll = () => setSelected(new Set());

  const confirm = () => {
    console.log('EventEmployeeFilterModal confirm called', { 
      selected: Array.from(selected), 
      onConfirm: typeof onConfirm,
      onConfirmExists: !!onConfirm 
    });
    
    if (!onConfirm) {
      console.error('onConfirm prop is not provided!');
      return;
    }
    
    try {
      onConfirm(Array.from(selected));
      console.log('onConfirm called successfully');
    } catch (error) {
      console.error('Error calling onConfirm:', error);
    }
  };

  if (!isOpen) return null;

  const headerTitle = title || (mode === 'employees' ? 'Add Employees to Event' : 'Select Job Positions');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
  <div className="relative w-full max-w-4xl mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl h-[80vh] max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text">{headerTitle}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

  <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={mode === 'employees' ? 'Search name or employee ID...' : 'Search position title or code...'}
              className="w-full md:max-w-sm p-2 border rounded-md dark:bg-dark-input"
            />
            {mode === 'employees' && (
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full md:w-48 p-2 border rounded-md dark:bg-dark-input"
                aria-label="Employee status filter"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            <div className="flex-1" />
            <button type="button" onClick={clearAll} className="text-sm text-red-600 hover:underline">Clear selections</button>
          </div>

          {/* Table */}
          <div className="border rounded-md overflow-hidden max-h-[48vh]">
            <div className="overflow-y-auto" style={{ maxHeight: '48vh' }}>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input type="checkbox" checked={isAllPageSelected} onChange={toggleAllOnPage} aria-label="Select all on page" />
                  </th>
                  {mode === 'employees' ? (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Position</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Position Title</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Position Code</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-div divide-y divide-gray-200 dark:divide-gray-700">
                {pageItems.map((item) => {
                  const id = mode === 'employees' ? (item as User).employeeNumber : (item as JobPosition).positionMatrixCode;
                  const isChecked = selected.has(id);
                  const rowClass = isChecked ? 'bg-blue-50 dark:bg-blue-900/30' : '';
                  if (mode === 'employees') {
                    const u = item as User;
                    return (
                      <tr key={id} className={rowClass}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={isChecked} disabled={disabledSet.has(id)} onChange={() => toggleItem(id)} aria-label={`Select ${u.name}`} />
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {u.name}
                          {disabledSet.has(id) && (
                            <span className="ml-2 text-xs text-gray-500">• via position</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm">{u.employeeNumber}</td>
                        <td className="px-3 py-2 text-sm">{/* Job Position unknown in User type; leave blank or populate if available later */}</td>
                        <td className="px-3 py-2 text-sm">{u.employeeStatus || ''}</td>
                      </tr>
                    );
                  }
                  const p = item as JobPosition;
                  return (
                    <tr key={id} className={rowClass}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleItem(id)} aria-label={`Select ${p.jobTitle}`} />
                      </td>
                      <td className="px-3 py-2 text-sm">{p.jobTitle}</td>
                      <td className="px-3 py-2 text-sm">{p.positionMatrixCode}</td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={mode === 'employees' ? 5 : 3} className="px-3 py-6 text-center text-sm text-gray-500">No results</td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Showing {total === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Rows per page</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value) || PAGE_SIZE_DEFAULT); setPage(1); }}
                className="p-1 border rounded dark:bg-dark-input text-sm"
              >
                {[10, 15, 20, 50].map((n) => (
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
          <Button type="button" variant="primary" onClick={confirm}>Confirm Selections</Button>
        </div>
      </div>
    </div>
  );
};

export default EventEmployeeFilterModal;
