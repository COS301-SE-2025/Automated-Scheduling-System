import React from 'react';
import type { AdminComplianceData } from '../../services/visualizationService';

interface ComplianceOverviewProps {
  data: AdminComplianceData;
}

const ComplianceOverview: React.FC<ComplianceOverviewProps> = ({ data }) => {
  const { companyOverview } = data;
  const complianceRateColor = companyOverview.overallComplianceRate >= 90 ? 'green' : 
                               companyOverview.overallComplianceRate >= 70 ? 'yellow' : 'red';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
          {companyOverview.totalEmployees}
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">Total Employees</div>
      </div>
      
      <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
          {companyOverview.totalCompetencies}
        </div>
        <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">Active Competencies</div>
      </div>
      
      <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
          {companyOverview.totalRequired}
        </div>
        <div className="text-sm text-amber-600 dark:text-amber-400 mt-1">Total Required</div>
      </div>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
        <div className="text-3xl font-bold text-green-700 dark:text-green-300">
          {companyOverview.totalCompleted}
        </div>
        <div className="text-sm text-green-600 dark:text-green-400 mt-1">Total Completed</div>
      </div>
      
      <div className={`p-6 rounded-lg border ${
        complianceRateColor === 'green' 
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
          : complianceRateColor === 'yellow'
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}>
        <div className={`text-3xl font-bold ${
          complianceRateColor === 'green' 
            ? 'text-emerald-700 dark:text-emerald-300' 
            : complianceRateColor === 'yellow'
            ? 'text-yellow-700 dark:text-yellow-300'
            : 'text-red-700 dark:text-red-300'
        }`}>
          {companyOverview.overallComplianceRate.toFixed(1)}%
        </div>
        <div className={`text-sm mt-1 ${
          complianceRateColor === 'green' 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : complianceRateColor === 'yellow'
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-red-600 dark:text-red-400'
        }`}>
          Overall Compliance
        </div>
        
        {companyOverview.overallComplianceRate === 100 && (
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            🎉 Perfect Compliance!
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceOverview;