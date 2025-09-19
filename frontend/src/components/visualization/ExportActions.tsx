import React, { useState } from 'react';
import * as Papa from 'papaparse';
import jsPDF from 'jspdf';
import { type AdminComplianceData } from '../../services/visualizationService';

interface ExportActionsProps {
  data: AdminComplianceData;
}

const ExportActions: React.FC<ExportActionsProps> = ({ data }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const exportToCSV = () => {
    try {
      setIsExporting(true);
      
      // Prepare department data
      const departmentCSV = data.departmentBreakdown.map(dept => ({
        'Department': dept.positionTitle,
        'Position Code': dept.positionCode,
        'Employee Count': dept.employeeCount,
        'Required Count': dept.requiredCount,
        'Completed Count': dept.completedCount,
        'Outstanding Count': dept.outstandingCount,
        'Compliance Rate (%)': dept.complianceRate.toFixed(2)
      }));

      // Prepare competency hotspots data
      const hotspotsCSV = data.competencyHotspots.map(comp => ({
        'Competency Name': comp.competencyName,
        'Competency Type': comp.competencyTypeName,
        'Total Required': comp.totalRequired,
        'Total Completed': comp.totalCompleted,
        'Incomplete Count': comp.incompleteCount,
        'Incomplete Rate (%)': comp.incompleteRate.toFixed(2)
      }));

      // Create CSV content
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Export department breakdown
      const deptCSV = Papa.unparse(departmentCSV);
      const deptBlob = new Blob([deptCSV], { type: 'text/csv;charset=utf-8;' });
      const deptLink = document.createElement('a');
      const deptUrl = URL.createObjectURL(deptBlob);
      deptLink.setAttribute('href', deptUrl);
      deptLink.setAttribute('download', `department-compliance-${timestamp}.csv`);
      deptLink.style.visibility = 'hidden';
      document.body.appendChild(deptLink);
      deptLink.click();
      document.body.removeChild(deptLink);

      // Export competency hotspots
      const hotspotsCSVString = Papa.unparse(hotspotsCSV);
      const hotspotsBlob = new Blob([hotspotsCSVString], { type: 'text/csv;charset=utf-8;' });
      const hotspotsLink = document.createElement('a');
      const hotspotsUrl = URL.createObjectURL(hotspotsBlob);
      hotspotsLink.setAttribute('href', hotspotsUrl);
      hotspotsLink.setAttribute('download', `competency-hotspots-${timestamp}.csv`);
      hotspotsLink.style.visibility = 'hidden';
      document.body.appendChild(hotspotsLink);
      hotspotsLink.click();
      document.body.removeChild(hotspotsLink);

      setShowMenu(false);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Failed to export CSV files. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      setShowMenu(false);

      // Create a new jsPDF instance
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add title
      pdf.setFontSize(20);
      pdf.text('Compliance Dashboard Report', 20, 30);
      
      // Add timestamp
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);
      
      let yPosition = 60;

      // Add company overview
      pdf.setFontSize(16);
      pdf.text('Company Overview', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      const overview = [
        `Total Employees: ${data.companyOverview.totalEmployees}`,
        `Total Competencies: ${data.companyOverview.totalCompetencies}`,
        `Total Required: ${data.companyOverview.totalRequired}`,
        `Total Completed: ${data.companyOverview.totalCompleted}`,
        `Overall Compliance Rate: ${data.companyOverview.overallComplianceRate.toFixed(1)}%`
      ];
      
      overview.forEach(line => {
        pdf.text(line, 20, yPosition);
        yPosition += 8;
      });

      // Add department breakdown table
      yPosition += 10;
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 30;
      }
      
      pdf.setFontSize(16);
      pdf.text('Department Breakdown', 20, yPosition);
      yPosition += 15;
      
      // Table headers
      pdf.setFontSize(10);
      const headers = ['Department', 'Employees', 'Compliance %'];
      const colWidths = [80, 30, 30];
      let xPosition = 20;
      
      headers.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      yPosition += 8;
      
      // Table rows
      data.departmentBreakdown.slice(0, 15).forEach(dept => { // Limit to prevent overflow
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 30;
        }
        
        xPosition = 20;
        const rowData = [
          dept.positionTitle.length > 25 ? dept.positionTitle.substring(0, 22) + '...' : dept.positionTitle,
          dept.employeeCount.toString(),
          `${dept.complianceRate.toFixed(1)}%`
        ];
        
        rowData.forEach((cell, index) => {
          pdf.text(cell, xPosition, yPosition);
          xPosition += colWidths[index];
        });
        yPosition += 8;
      });

      // Add top competency gaps
      yPosition += 15;
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 30;
      }
      
      pdf.setFontSize(16);
      pdf.text('Top Competency Gaps', 20, yPosition);
      yPosition += 15;
      
      pdf.setFontSize(10);
      const gapHeaders = ['Competency', 'Incomplete', 'Gap %'];
      xPosition = 20;
      
      gapHeaders.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      yPosition += 8;
      
      data.competencyHotspots.slice(0, 10).forEach(comp => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 30;
        }
        
        xPosition = 20;
        const rowData = [
          comp.competencyName.length > 25 ? comp.competencyName.substring(0, 22) + '...' : comp.competencyName,
          comp.incompleteCount.toString(),
          `${comp.incompleteRate.toFixed(1)}%`
        ];
        
        rowData.forEach((cell, index) => {
          pdf.text(cell, xPosition, yPosition);
          xPosition += colWidths[index];
        });
        yPosition += 8;
      });

      // Save the PDF
      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`compliance-dashboard-${timestamp}.pdf`);
      
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={`px-4 py-2 text-sm font-medium rounded-md border ${
          isExporting 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        } dark:bg-dark-input dark:text-dark-text dark:border-gray-600 dark:hover:bg-gray-600`}
      >
        {isExporting ? 'Exporting...' : 'Export Data'}
      </button>
      
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-div border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={exportToCSV}
              disabled={isExporting}
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
            >
              Export as CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
            >
              Export as PDF
            </button>
          </div>
        </div>
      )}
      
      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default ExportActions;