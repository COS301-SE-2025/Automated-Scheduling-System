import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { type DepartmentComplianceItem, type AdminComplianceFilter } from '../../services/visualizationService';

interface DepartmentBreakdownProps {
  data: DepartmentComplianceItem[];
  onFilterChange: (filters: AdminComplianceFilter) => void;
  currentFilters: AdminComplianceFilter;
}

const DepartmentBreakdown: React.FC<DepartmentBreakdownProps> = ({ 
  data, 
  onFilterChange, 
  currentFilters 
}) => {
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    currentFilters.positionCodes || []
  );

  // Color scale based on compliance rate
  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return '#0078a6'; // custom-third (dark blue)
    if (rate >= 70) return '#00bac8'; // custom-secondary (light blue)
    if (rate >= 50) return '#243966'; // custom-primary (darker blue)
    return '#EF4444'; // red
  };

  const chartData = data.map(item => ({
    ...item,
    color: getComplianceColor(item.complianceRate)
  }));

  const handleDepartmentClick = (positionCode: string) => {
    const newSelected = selectedDepartments.includes(positionCode)
      ? selectedDepartments.filter(code => code !== positionCode)
      : [...selectedDepartments, positionCode];
    
    setSelectedDepartments(newSelected);
    onFilterChange({
      ...currentFilters,
      positionCodes: newSelected.length > 0 ? newSelected : undefined
    });
  };

  const clearFilters = () => {
    setSelectedDepartments([]);
    onFilterChange({
      ...currentFilters,
      positionCodes: undefined
    });
  };

  return (
    <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text">
          Department Compliance Rates
        </h3>
        {selectedDepartments.length > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-custom-secondary hover:text-custom-primary dark:text-dark-secondary dark:hover:text-dark-primary"
          >
            Clear filters ({selectedDepartments.length})
          </button>
        )}
      </div>
      
      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="positionTitle" 
                tick={{ fontSize: 12, fill: '#374151' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: '#374151' }}
              />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'complianceRate' ? `${value}%` : value,
                  name === 'complianceRate' ? 'Compliance Rate' :
                  name === 'employeeCount' ? 'Employees' :
                  name === 'completedCount' ? 'Completed' :
                  name === 'outstandingCount' ? 'Outstanding' : name
                ]}
                labelFormatter={(label) => `Department: ${label}`}
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: `1px solid #243966`,
                  borderRadius: '6px',
                  color: '#1f2937'
                }}
              />
              <Bar 
                dataKey="complianceRate" 
                name="Compliance Rate"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={selectedDepartments.includes(entry.positionCode) ? 
                      entry.color : 
                      `${entry.color}80`
                    } 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* Department drill-down table */}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-dark-input">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employees
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Compliance Rate
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-input">
                {data.map((dept) => (
                  <tr 
                    key={dept.positionCode}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 ${
                      selectedDepartments.includes(dept.positionCode) ? 
                      'bg-custom-fourth dark:bg-dark-accent/20 border-l-4 border-custom-secondary dark:border-dark-secondary' : ''
                    }`}
                    onClick={() => handleDepartmentClick(dept.positionCode)}
                  >
                    <td className="px-3 py-2 text-sm text-custom-text dark:text-dark-text">
                      <div>
                        <div className="font-medium">{dept.positionTitle}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {dept.positionCode}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                      {dept.employeeCount}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getComplianceColor(dept.complianceRate) }}
                        ></div>
                        <span className="font-medium">
                          {dept.complianceRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-custom-third dark:text-dark-third">
                      {dept.completedCount}
                    </td>
                    <td className="px-3 py-2 text-sm text-custom-secondary dark:text-dark-secondary">
                      {dept.outstandingCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No department data available
        </div>
      )}
    </div>
  );
};

export default DepartmentBreakdown;