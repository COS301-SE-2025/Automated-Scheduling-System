import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { getAdminComplianceData, type AdminComplianceData, type AdminComplianceFilter } from '../services/visualizationService';
import ComplianceOverview from '../components/visualization/ComplianceOverview';
import DepartmentBreakdown from '../components/visualization/DepartmentBreakdown';
import CompetencyHotspots from '../components/visualization/CompetencyHotspots';
import ComplianceTrends from '../components/visualization/ComplianceTrends';
import ExportActions from '../components/visualization/ExportActions';

const AdminCompliancePage: React.FC = () => {
  const [data, setData] = useState<AdminComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminComplianceFilter>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (newFilters?: AdminComplianceFilter) => {
    try {
      setRefreshing(true);
      const res = await getAdminComplianceData(newFilters || filters);
      setData(res);
      setError(null);
    } catch (e) {
      console.error('Failed to load compliance data:', e);
      setError('Failed to load compliance dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (newFilters: AdminComplianceFilter) => {
    setFilters(newFilters);
    loadData(newFilters);
  };

  const handleRefresh = () => {
    loadData();
  };

  if (loading) {
    return (
      <MainLayout pageTitle="Compliance Dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-primary"></div>
          <span className="ml-2 text-custom-text dark:text-dark-text">Loading compliance data...</span>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout pageTitle="Compliance Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">{error}</div>
          <button 
            onClick={handleRefresh}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout pageTitle="Compliance Dashboard">
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">No compliance data available</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Compliance Dashboard">
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-custom-text dark:text-dark-text">
              Company Compliance Overview
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Monitor competency compliance across the organization
            </p>
          </div>
          <div className="flex space-x-3">
            <ExportActions data={data} />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-4 py-2 text-sm font-medium rounded-md border ${
                refreshing 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } dark:bg-dark-input dark:text-dark-text dark:border-gray-600 dark:hover:bg-gray-600`}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Company Overview Cards */}
        <ComplianceOverview data={data} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Department Breakdown */}
          <DepartmentBreakdown 
            data={data.departmentBreakdown}
            onFilterChange={handleFilterChange}
            currentFilters={filters}
          />
          
          {/* Competency Hotspots */}
          <CompetencyHotspots data={data.competencyHotspots} />
        </div>

        {/* Trends Chart */}
        <ComplianceTrends data={data.trendData} />

        {/* Status Distribution */}
        {/* <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text mb-4">
            Overall Status Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.statusDistribution.map((item) => (
              <div key={item.status} className="text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {item.count}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div> */}

        {/* Large datasets warning */}
        {data.companyOverview.totalEmployees > 100 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="text-blue-800 text-sm">
              <strong>Performance Note:</strong> You have a large dataset ({data.companyOverview.totalEmployees} employees). 
              Consider using filters to focus on specific departments or time periods for better performance.
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminCompliancePage;