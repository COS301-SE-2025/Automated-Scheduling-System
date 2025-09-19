import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
// Button removed: actions hidden in this view
import { getEmployeeCompetencyProfile, type EmployeeCompetencyProfile } from '../services/profileService';
import { getEmployeeVisualizationData, type VisualizationData } from '../services/visualizationService';
import VisualizationTab from '../components/visualization/VisualizationTab';

const EmployeeProfilePage: React.FC = () => {
  const [data, setData] = useState<EmployeeCompetencyProfile | null>(null);
  const [vizData, setVizData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [vizLoading, setVizLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vizError, setVizError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'completed' | 'required' | 'visualization'>('completed');

  // Remove explore-related state variables

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

  useEffect(() => {
    (async () => {
      try {
        setVizLoading(true);
        const res = await getEmployeeVisualizationData();
        setVizData(res);
        setVizError(null);
      } catch (e) {
        console.error('Failed to load visualization data:', e);
        setVizError('Failed to load visualization data');
      } finally {
        setVizLoading(false);
      }
    })();
  }, []);

  // Remove explore-related useMemo

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
              {(['completed', 'required', 'visualization'] as const).map(tab => (
                <button key={tab} className={`px-3 py-2 text-sm ${activeTab === tab ? 'border-b-2 border-custom-primary font-semibold' : 'text-gray-600'}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'completed' ? 'Completed Competencies' : tab === 'required' ? 'Required Competencies' : 'Visualization'}
                </button>
              ))}
            </div>

            {/* Completed */}
            {activeTab === 'completed' && (
              <div className="mt-6 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-dark-input">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium">Competency</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Completion Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Expiry Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-input">
                    {(data.completed?.length ?? 0) === 0 && (
                      <tr><td colSpan={5} className="px-3 py-4 text-sm text-gray-500">No completed competencies yet.</td></tr>
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
                      </tr>
                    ))}
                  </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Required */}
            {activeTab === 'required' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.employee.positionCode === '' && (
                  <div className="col-span-full text-sm text-custom-text dark:text-dark-secondary">Your required competencies will appear here once you are assigned a job position.</div>
                )}
                {(data.required?.length ?? 0) === 0 && (
                  <div className="col-span-full text-sm text-custom-text dark:text-dark-secondary">No required competencies at the moment.</div>
                )}
        {(data.required ?? []).map((c) => {
                  return (
          <div key={c.competencyID} className="bg-white dark:bg-dark-div p-4 rounded-lg shadow ring-1 ring-black ring-opacity-5 border border-gray-200 dark:border-gray-700 border-l-4 border-l-custom-secondary dark:border-l-dark-accent">
                      <div className="font-medium text-custom-text dark:text-dark-text">{c.competencyName}</div>
                      <div className="text-xs text-custom-text dark:text-dark-secondary">{c.competencyTypeName}</div>
                      {c.prerequisites && c.prerequisites.length > 0 && (
                        <div className="mt-2 text-xs text-custom-text dark:text-dark-secondary">
                          Prerequisites: {(c.prerequisites ?? []).map(pid => {
                            const pName = (data.completed ?? []).find(cm => cm.competencyID === pid)?.competencyName || 'Competency #' + pid;
                            return <span key={pid} className="mr-2">{pName}</span>;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Visualization */}
            {activeTab === 'visualization' && (
              <VisualizationTab 
                data={vizData}
                loading={vizLoading}
                error={vizError}
              />
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default EmployeeProfilePage;
