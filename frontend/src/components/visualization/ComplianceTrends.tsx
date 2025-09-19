import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { type TrendDataPoint } from '../../services/visualizationService';

interface ComplianceTrendsProps {
  data: TrendDataPoint[];
}

const ComplianceTrends: React.FC<ComplianceTrendsProps> = ({ data }) => {
  // Sort data by date and format for display
  const sortedData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      ...item,
      monthYear: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        year: '2-digit' 
      }),
      fullDate: new Date(item.date).toLocaleDateString()
    }));

  const formatTooltipDate = (label: string) => {
    const item = sortedData.find(d => d.monthYear === label);
    return item ? item.fullDate : label;
  };

  return (
    <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text">
            Compliance Trends
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Monthly competency completion trends over the past 12 months
          </p>
        </div>
      </div>
      
      {sortedData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="monthYear" 
              tick={{ fontSize: 12 }}
            />
            <YAxis yAxisId="count" orientation="left" />
            <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} />
            <Tooltip 
              labelFormatter={formatTooltipDate}
              formatter={(value, name) => [
                name === 'complianceRate' ? `${value}%` : value,
                name === 'completedCount' ? 'Completions' :
                name === 'complianceRate' ? 'Compliance Rate' : name
              ]}
              contentStyle={{ 
                backgroundColor: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              yAxisId="count"
              type="monotone" 
              dataKey="completedCount" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Monthly Completions"
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              yAxisId="rate"
              type="monotone" 
              dataKey="complianceRate" 
              stroke="#3B82F6" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Compliance Rate (%)"
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <div>No trend data available</div>
            <div className="text-sm">Historical data will appear here as competencies are completed.</div>
          </div>
        </div>
      )}
      
      {/* Trend insights */}
      {sortedData.length >= 2 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Trend Insights (Last 12 Months)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Completions:</span>
              <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                {sortedData.reduce((sum, item) => sum + item.completedCount, 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Average Monthly:</span>
              <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                {(sortedData.reduce((sum, item) => sum + item.completedCount, 0) / sortedData.length).toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Current Rate:</span>
              <span className="ml-2 font-medium text-purple-600 dark:text-purple-400">
                {sortedData[sortedData.length - 1]?.complianceRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceTrends;