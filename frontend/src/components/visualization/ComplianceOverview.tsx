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
      <div className="bg-custom-fourth dark:bg-dark-accent/20 p-6 rounded-lg border border-custom-secondary/30 dark:border-dark-secondary/30">
        <div className="text-3xl font-bold text-custom-primary dark:text-dark-primary">
          {companyOverview.totalEmployees}
        </div>
        <div className="text-sm text-custom-text dark:text-dark-secondary mt-1">Total Employees</div>
      </div>
      
      <div className="bg-custom-accent dark:bg-dark-accent/30 p-6 rounded-lg border border-custom-third/30 dark:border-dark-third/30">
        <div className="text-3xl font-bold text-custom-third dark:text-dark-third">
          {companyOverview.totalCompetencies}
        </div>
        <div className="text-sm text-custom-text dark:text-dark-secondary mt-1">Active Competencies</div>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="text-3xl font-bold text-custom-secondary dark:text-dark-secondary">
          {companyOverview.totalRequired}
        </div>
        <div className="text-sm text-custom-secondary dark:text-dark-secondary mt-1">Total Required</div>
      </div>
      
      <div className="bg-custom-accent dark:bg-dark-accent/20 p-6 rounded-lg border border-custom-third/30 dark:border-dark-third/30">
        <div className="text-3xl font-bold text-custom-third dark:text-dark-third">
          {companyOverview.totalCompleted}
        </div>
        <div className="text-sm text-custom-third dark:text-dark-third mt-1">Total Completed</div>
      </div>
      
      <div className={`p-6 rounded-lg border ${
        complianceRateColor === 'green' 
          ? 'bg-custom-accent dark:bg-dark-accent/20 border-custom-third dark:border-dark-third' 
          : complianceRateColor === 'yellow'
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}>
        <div className={`text-3xl font-bold ${
          complianceRateColor === 'green' 
            ? 'text-custom-third dark:text-dark-third' 
            : complianceRateColor === 'yellow'
            ? 'text-custom-secondary dark:text-dark-secondary'
            : 'text-red-700 dark:text-red-300'
        }`}>
          {companyOverview.overallComplianceRate.toFixed(1)}%
        </div>
        <div className={`text-sm mt-1 ${
          complianceRateColor === 'green' 
            ? 'text-custom-third dark:text-dark-third' 
            : complianceRateColor === 'yellow'
            ? 'text-custom-secondary dark:text-dark-secondary'
            : 'text-red-600 dark:text-red-400'
        }`}>
          Overall Compliance
        </div>
        
        {companyOverview.overallComplianceRate === 100 && (
          <div className="mt-2 text-xs text-custom-third dark:text-dark-third font-medium">
            🎉 Perfect Compliance!
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceOverview;