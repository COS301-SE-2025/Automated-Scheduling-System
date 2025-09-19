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

  // Handle 100% completion case
  const isFullyCompleted = data.completionOverview.completionRate === 100;

  // Colors for different statuses
  const statusColors = {
    completed: '#10B981', // green
    required: '#F59E0B',   // amber
    expired: '#EF4444',    // red
    expires_soon: '#F97316', // orange
    archived: '#6B7280'    // gray
  };

  // Prepare data for charts
  const pieData = data.statusBreakdown.map(item => ({
    name: item.label,
    value: item.count,
    color: statusColors[item.status as keyof typeof statusColors] || '#6B7280'
  }));

  // Group competencies by type for bar chart
  const competencyTypeData = data.competencyBreakdown.reduce((acc, item) => {
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
    const percent = ((entry.value / data.completionOverview.totalRequired) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <div className="space-y-6">
      {/* Completion Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {data.completionOverview.totalRequired}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Total Required</div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {data.completionOverview.totalCompleted}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">Completed</div>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {data.completionOverview.totalOutstanding}
          </div>
          <div className="text-sm text-amber-600 dark:text-amber-400">Outstanding</div>
        </div>
        
        <div className={`p-4 rounded-lg border ${
          isFullyCompleted 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
            : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
        }`}>
          <div className={`text-2xl font-bold ${
            isFullyCompleted 
              ? 'text-emerald-700 dark:text-emerald-300' 
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            {data.completionOverview.completionRate.toFixed(1)}%
          </div>
          <div className={`text-sm ${
            isFullyCompleted 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            Completion Rate
          </div>
        </div>
      </div>

      {/* Celebratory message for 100% completion */}
      {isFullyCompleted && (
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
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
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
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
              {data.competencyBreakdown.length === 0 ? (
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
                        competency.status === 'required' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' :
                        competency.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                        competency.status === 'expires_soon' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' :
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
      {data.completionOverview.totalRequired === 0 && (
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