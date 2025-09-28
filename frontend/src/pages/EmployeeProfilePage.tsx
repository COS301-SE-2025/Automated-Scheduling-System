import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { getEmployeeCompetencyProfile, type EmployeeCompetencyProfile, updateEmployeeProfile } from '../services/profileService';

const EmployeeProfilePage: React.FC = () => {
  const [data, setData] = useState<EmployeeCompetencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'completed' | 'required' | 'visualization' | 'settings'>('completed');

  // Settings form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // Keep originals to allow cancel
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Remove explore-related state variables

  const handleSaveSettings = async () => {
    // Basic validation
    if (!email.trim() && !phone.trim()) {
      setSettingsMessage({ 
        type: 'error', 
        text: 'Please enter at least an email address or phone number.' 
      });
      return;
    }

    if (email.trim() && !isValidEmail(email.trim())) {
      setSettingsMessage({ 
        type: 'error', 
        text: 'Please enter a valid email address.' 
      });
      return;
    }

    setIsSettingsSaving(true);
    setSettingsMessage(null);
    
    try {
      await updateEmployeeProfile({
        email: email.trim(),
        phone: phone.trim(),
      });

      setSettingsMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Profile update failed:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('404')) {
        setSettingsMessage({ 
          type: 'error', 
          text: 'Profile update endpoint not implemented yet. Contact your system administrator.' 
        });
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setSettingsMessage({ 
          type: 'error', 
          text: 'Network error. Please check your connection and try again.' 
        });
      } else {
        setSettingsMessage({ 
          type: 'error', 
          text: `Failed to update profile: ${error.message || 'Please try again.'}` 
        });
      }
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCancelSettings = () => {
    // Reset form to original values
    setEmail(originalEmail);
    setPhone(originalPhone);
    setSettingsMessage(null);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getEmployeeCompetencyProfile();
        setData(res);
        // Prefill email/phone if present on employee header
        if (res?.employee) {
          if (res.employee.email) {
            setEmail(res.employee.email);
            setOriginalEmail(res.employee.email);
          }
          if (res.employee.phone) {
            setPhone(res.employee.phone);
            setOriginalPhone(res.employee.phone);
          }
        }
        setError(null);
      } catch (e) {
        console.error('Failed to load profile:', e);
        setError('Failed to load your competency profile');
      } finally {
        setLoading(false);
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
              <div>
                <h2 className="text-xl font-semibold text-custom-text dark:text-dark-text">{data.employee.name}</h2>
                <div className="text-sm text-gray-600 dark:text-gray-300">Employee ID: {data.employee.employeeNumber}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Position: {data.employee.positionTitle || '—'} {data.employee.positionCode && `(${data.employee.positionCode})`}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b dark:border-gray-700 mb-4">
              {(['completed', 'required', 'settings'] as const).map(tab => (
                <button key={tab} className={`px-3 py-2 text-sm ${activeTab === tab ? 'border-b-2 border-custom-primary font-semibold' : 'text-gray-600'}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'completed' ? 'Completed Competencies' : tab === 'required' ? 'Required Competencies' : 'Settings'}
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
            

            {/* Settings */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-custom-text dark:text-dark-text mb-4">Personal Information</h3>
                    <div className="bg-gray-50 dark:bg-dark-input rounded-lg p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={data?.employee.name || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Contact HR to change your name</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">
                            Employee ID
                          </label>
                          <input
                            type="text"
                            value={data?.employee.employeeNumber || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@company.com"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-div text-custom-text dark:text-dark-text focus:ring-2 focus:ring-custom-primary focus:border-custom-primary"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used for notifications and password reset</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+27 00 000 0000"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-div text-custom-text dark:text-dark-text focus:ring-2 focus:ring-custom-primary focus:border-custom-primary"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">For emergency contact and SMS notifications</p>
                        </div>
                      </div>

                      {/* Settings message */}
                      {settingsMessage && (
                        <div className={`p-3 rounded-md ${settingsMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                          <p className="text-sm">{settingsMessage.text}</p>
                        </div>
                      )}
                      
                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <button
                          type="button"
                          onClick={handleCancelSettings}
                          disabled={isSettingsSaving}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-div border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSettings}
                          disabled={isSettingsSaving}
                          className="px-4 py-2 text-sm font-medium text-white bg-custom-primary hover:bg-custom-primary/90 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSettingsSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-custom-text dark:text-dark-text mb-4">Account Settings</h3>
                    <div className="bg-gray-50 dark:bg-dark-input rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-custom-text dark:text-dark-text">Password</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Last changed: Never</p>
                        </div>
                        <Link 
                          to="/forgot-password"
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-custom-secondary dark:text-dark-third hover:text-custom-third dark:hover:text-dark-text hover:underline transition-colors duration-200"
                        >
                          Change Password
                        </Link>
                      </div>
                    </div>
                  </div>
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
