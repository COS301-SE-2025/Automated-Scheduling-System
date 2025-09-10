import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/ui/Button';
import { getEmployeeCompetencyProfile, type EmployeeCompetencyProfile, type CompetencyBrief } from '../services/profileService';

const EmployeeProfilePage: React.FC = () => {
  const [data, setData] = useState<EmployeeCompetencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'completed' | 'required' | 'explore'>('completed');

  // Explore controls
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getEmployeeCompetencyProfile();
        setData(res);
        setError(null);
      } catch (e) {
        console.error('Failed to load profile:', e);
        setError('Failed to load your competency profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    (data?.explore ?? []).forEach((c) => s.add(c.competencyTypeName));
    (data?.required ?? []).forEach((c) => s.add(c.competencyTypeName));
    (data?.completed ?? []).forEach((c) => s.add(c.competencyTypeName));
    return ['All', ...Array.from(s).sort()];
  }, [data]);

  const filteredExplore = useMemo(() => {
    if (!data) return [] as CompetencyBrief[];
    const q = search.trim().toLowerCase();
    return (data.explore ?? []).filter(c => {
      if (typeFilter !== 'All' && c.competencyTypeName !== typeFilter) return false;
      if (!q) return true;
      return c.competencyName.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
    });
  }, [data, search, typeFilter]);

  return (
    <MainLayout pageTitle="Employee Competency Profile">
      <div className="bg-white dark:bg-dark-div p-4 rounded-lg shadow">
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600">{error}</div>}
        {data && (
          <>
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-custom-text dark:text-dark-text">{data.employee.name}</h2>
              <div className="text-sm text-gray-600 dark:text-gray-300">Employee ID: {data.employee.employeeNumber}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Position: {data.employee.positionTitle || '—'} {data.employee.positionCode && `(${data.employee.positionCode})`}</div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b dark:border-gray-700 mb-4">
              {(['completed', 'required', 'explore'] as const).map(tab => (
                <button key={tab} className={`px-3 py-2 text-sm ${activeTab === tab ? 'border-b-2 border-custom-primary font-semibold' : 'text-gray-600'}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'completed' ? 'Completed Competencies' : tab === 'required' ? 'Required Competencies' : 'Explore Competencies'}
                </button>
              ))}
            </div>

            {/* Completed */}
            {activeTab === 'completed' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium">Competency</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Completion Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Expiry Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(data.completed?.length ?? 0) === 0 && (
                      <tr><td colSpan={6} className="px-3 py-4 text-sm text-gray-500">No completed competencies yet.</td></tr>
                    )}
                    {(data.completed ?? []).map((c) => (
                      <tr key={c.competencyID}>
                        <td className="px-3 py-2 text-sm">{c.competencyName}</td>
                        <td className="px-3 py-2 text-sm">{c.competencyTypeName}</td>
                        <td className="px-3 py-2 text-sm">{c.achievementDate ? new Date(c.achievementDate).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-2 text-sm">{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${c.status === 'Expired' ? 'bg-red-100 text-red-700' : c.status === 'Expires Soon' ? 'bg-amber-100 text-amber-700' : c.status === 'Archived' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>{c.status}</span>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {/* Placeholder for certificate/doc actions if applicable */}
                          <Button type="button" variant="outline" disabled>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Required */}
            {activeTab === 'required' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.employee.positionCode === '' && (
                  <div className="col-span-full text-sm text-gray-600">Your required competencies will appear here once you are assigned a job position.</div>
                )}
                {(data.required?.length ?? 0) === 0 && (
                  <div className="col-span-full text-sm text-gray-600">No required competencies at the moment.</div>
                )}
                {(data.required ?? []).map((c) => {
                  const unmet = (c.prerequisites ?? []).filter(pid => !(data.completed ?? []).some(cm => cm.competencyID === pid));
                  const canEnroll = unmet.length === 0;
                  return (
                    <div key={c.competencyID} className="border rounded p-3">
                      <div className="font-medium">{c.competencyName}</div>
                      <div className="text-xs text-gray-600">{c.competencyTypeName}</div>
                      {c.prerequisites && c.prerequisites.length > 0 && (
                        <div className="mt-2 text-xs">
                          Prerequisites: {(c.prerequisites ?? []).map(pid => {
                            const pName = (data.completed ?? []).find(cm => cm.competencyID === pid)?.competencyName || 'Competency #' + pid;
                            return <span key={pid} className="mr-2">{pName}</span>;
                          })}
                        </div>
                      )}
                      <div className="mt-3">
                        <Button type="button" variant="primary" disabled={!canEnroll} title={!canEnroll ? `Requires completion of ${unmet.length} prerequisite(s)` : ''}>View Details</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Explore */}
            {activeTab === 'explore' && (
              <div>
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  <input className="p-2 border rounded md:flex-1 dark:bg-dark-input" placeholder="Search competencies" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <select className="p-2 border rounded w-full md:w-64 dark:bg-dark-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredExplore.length === 0 && <div className="col-span-full text-sm text-gray-600">No matching competencies.</div>}
                  {(filteredExplore ?? []).map((c) => (
                    <div key={c.competencyID} className="border rounded p-3">
                      <div className="font-medium">{c.competencyName}</div>
                      <div className="text-xs text-gray-600">{c.competencyTypeName}</div>
                      <p className="text-sm mt-2">{c.description}</p>
                      <div className="mt-3">
                        <Button type="button" variant="outline">View Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default EmployeeProfilePage;
