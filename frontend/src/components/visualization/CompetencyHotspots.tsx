import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { type CompetencyHotspotItem } from '../../services/visualizationService';

interface CompetencyHotspotsProps {
  data: CompetencyHotspotItem[];
}

const CompetencyHotspots: React.FC<CompetencyHotspotsProps> = ({ data }) => {
  // Sort by incomplete count (highest first) and take top 10
  const sortedData = [...data]
    .sort((a, b) => b.incompleteCount - a.incompleteCount)
    .slice(0, 10);

  const chartData = sortedData.map(item => ({
    name: item.competencyName.length > 20 ? 
      `${item.competencyName.substring(0, 17)}...` : 
      item.competencyName,
    fullName: item.competencyName,
    incompleteCount: item.incompleteCount,
    incompleteRate: item.incompleteRate,
    totalRequired: item.totalRequired,
    totalCompleted: item.totalCompleted,
    competencyTypeName: item.competencyTypeName
  }));

  return (
    <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text mb-4">
        Top Competency Gaps
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Competencies with the highest number of incomplete assignments
      </p>
      
      {sortedData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                formatter={(value, name) => [
                  value,
                  name === 'incompleteCount' ? 'Incomplete Assignments' : name
                ]}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.name === label);
                  return item ? item.fullName : label;
                }}
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
              <Bar 
                dataKey="incompleteCount" 
                fill="#EF4444" 
                name="Incomplete Assignments"
              />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Detailed list */}
          <div className="mt-6 overflow-x-auto">
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
                    Total Required
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Incomplete
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Gap Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-input">
                {sortedData.map((competency) => (
                  <tr key={competency.competencyID}>
                    <td className="px-3 py-2 text-sm text-custom-text dark:text-dark-text">
                      <div className="font-medium">{competency.competencyName}</div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                      {competency.competencyTypeName}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                      {competency.totalRequired}
                    </td>
                    <td className="px-3 py-2 text-sm text-green-600 dark:text-green-400">
                      {competency.totalCompleted}
                    </td>
                    <td className="px-3 py-2 text-sm text-red-600 dark:text-red-400 font-medium">
                      {competency.incompleteCount}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${Math.min(competency.incompleteRate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          {competency.incompleteRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {data.length > 10 && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              Showing top 10 of {data.length} competencies with gaps
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <div>No competency gaps found!</div>
            <div className="text-sm">All required competencies are completed.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetencyHotspots;