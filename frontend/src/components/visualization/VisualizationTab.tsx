import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { type VisualizationData } from '../../services/visualizationService';

interface VisualizationTabProps {
  data: VisualizationData | null;
  loading: boolean;
  error: string | null;
}

const VisualizationTab: React.FC<VisualizationTabProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-primary"></div>
        <span className="ml-2 text-custom-text dark:text-dark-text">Loading visualization data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800 text-sm">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">No visualization data available</div>
      </div>
    );
  }

  // Check if user has no competencies assigned (no job position or no requirements)
  if (!data.competencyBreakdown || data.competencyBreakdown.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Competencies Assigned Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Your competency requirements will appear here once you are assigned to a job position. 
            Contact your supervisor or HR department if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const isFullyCompleted = data.completionOverview?.completionRate === 100;

  const statusColors = {
    completed: '#0078a6', // custom-third (dark blue)
    required: '#00bac8',   // custom-secondary (light blue)
    expired: '#EF4444',    // red - keeping for critical status
    expires_soon: '#243966', // custom-primary (darker blue)
    archived: '#6B7280'    // gray - keeping neutral
  };

  // Prepare data for charts with null safety
  const pieData = (data.statusBreakdown || []).map(item => ({
    name: item.label,
    value: item.count,
    color: statusColors[item.status as keyof typeof statusColors] || '#6B7280'
  }));

  // Group competencies by type for bar chart with null safety
  const competencyTypeData = (data.competencyBreakdown || []).reduce((acc, item) => {
    const existing = acc.find(x => x.name === item.competencyTypeName);
    if (existing) {
      existing[item.status] = (existing[item.status] || 0) + 1;
      existing.total += 1;
    } else {
      acc.push({
        name: item.competencyTypeName,
        [item.status]: 1,
        total: 1
      });
    }
    return acc;
  }, [] as any[]);

  // Custom label function for pie chart
  const renderLabel = (entry: any) => {
    const totalRequired = data.completionOverview?.totalRequired || 1;
    const percent = ((entry.value / totalRequired) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <div className="space-y-6">
      {/* Completion Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-custom-fourth dark:bg-dark-accent/20 p-4 rounded-lg border border-custom-secondary/30 dark:border-dark-secondary/30">
          <div className="text-2xl font-bold text-custom-primary dark:text-dark-primary">
            {data.completionOverview?.totalRequired || 0}
          </div>
          <div className="text-sm text-custom-text dark:text-dark-secondary">Total Required</div>
        </div>
        
        <div className="bg-custom-accent dark:bg-dark-accent/20 p-4 rounded-lg border border-custom-third/30 dark:border-dark-third/30">
          <div className="text-2xl font-bold text-custom-third dark:text-dark-third">
            {data.completionOverview?.totalCompleted || 0}
          </div>
          <div className="text-sm text-custom-third dark:text-dark-third">Completed</div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-custom-secondary dark:text-dark-secondary">
            {data.completionOverview?.totalOutstanding || 0}
          </div>
          <div className="text-sm text-custom-secondary dark:text-dark-secondary">Outstanding</div>
        </div>
        
        <div className={`p-4 rounded-lg border ${
          isFullyCompleted 
            ? 'bg-custom-accent dark:bg-dark-accent/20 border-custom-third dark:border-dark-third' 
            : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
        }`}>
          <div className={`text-2xl font-bold ${
            isFullyCompleted 
              ? 'text-custom-third dark:text-dark-third' 
              : 'text-custom-primary dark:text-dark-primary'
          }`}>
            {(data.completionOverview?.completionRate || 0).toFixed(1)}%
          </div>
          <div className={`text-sm ${
            isFullyCompleted 
              ? 'text-custom-third dark:text-dark-third' 
              : 'text-custom-text dark:text-dark-secondary'
          }`}>
            Completion Rate
          </div>
        </div>
      </div>

      {/* Celebratory message for 100% completion */}
      {isFullyCompleted && (
        <div className="bg-gradient-to-r from-custom-third to-custom-secondary text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🎉</div>
            <div>
              <h3 className="text-xl font-bold">Congratulations!</h3>
              <p>You have completed all required competencies for your position.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Status Pie Chart */}
        <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text mb-4">
            Competency Status Overview
          </h3>
          
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  labelStyle={{ color: '#1f2937' }}
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: `1px solid #243966`,
                    borderRadius: '6px',
                    color: '#1f2937'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No competency data available
            </div>
          )}
        </div>

        {/* Competency Types Breakdown Bar Chart */}
        <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text mb-4">
            Competencies by Type
          </h3>
          
          {competencyTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={competencyTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#374151' }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: '#374151' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: `1px solid #243966`,
                    borderRadius: '6px',
                    color: '#1f2937'
                  }}
                />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill={statusColors.completed} name="Completed" />
                <Bar dataKey="required" stackId="a" fill={statusColors.required} name="Required" />
                <Bar dataKey="expired" stackId="a" fill={statusColors.expired} name="Expired" />
                <Bar dataKey="expires_soon" stackId="a" fill={statusColors.expires_soon} name="Expires Soon" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No competency type data available
            </div>
          )}
        </div>
      </div>

      {/* Competency Details Table */}
      <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text mb-4">
          Detailed Competency Status
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-input">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Competency
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Achievement Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expiry Info
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-input">
              {!data.competencyBreakdown || data.competencyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-sm text-gray-500 text-center">
                    No competencies found
                  </td>
                </tr>
              ) : (
                data.competencyBreakdown.map((competency) => (
                  <tr key={competency.competencyID}>
                    <td className="px-3 py-2 text-sm text-custom-text dark:text-dark-text">
                      {competency.competencyName}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                      {competency.competencyTypeName}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        competency.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                        competency.status === 'required' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' :
                        competency.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                        competency.status === 'expires_soon' ? 'bg-custom-fourth text-custom-primary dark:bg-dark-signin/20 dark:text-dark-primary' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
                      }`}>
                        {competency.status === 'expires_soon' ? 'Expires Soon' : 
                         competency.status.charAt(0).toUpperCase() + competency.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                      {competency.achievementDate ? 
                        new Date(competency.achievementDate).toLocaleDateString() : 
                        '—'
                      }
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                      {competency.expiryDate ? (
                        <div>
                          <div>{new Date(competency.expiryDate).toLocaleDateString()}</div>
                          {competency.daysUntilExpiry !== undefined && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {competency.daysUntilExpiry > 0 ? 
                                `${competency.daysUntilExpiry} days remaining` : 
                                `${Math.abs(competency.daysUntilExpiry)} days overdue`
                              }
                            </div>
                          )}
                        </div>
                      ) : 'No expiry'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* No data state for new users */}
      {(data.completionOverview?.totalRequired || 0) === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <div className="text-4xl text-gray-400">📊</div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Competency Requirements Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Your competency requirements will appear here once you are assigned to a job position. 
            Contact your supervisor or HR department if you believe this is an error.
          </p>
        </div>
      )}
    </div>
  );
};

export default VisualizationTab;