package profile

import "time"

// VisualizationData represents user-facing visualization data
type VisualizationData struct {
	Employee struct {
		EmployeeNumber string `json:"employeeNumber"`
		Name           string `json:"name"`
		PositionCode   string `json:"positionCode"`
		PositionTitle  string `json:"positionTitle"`
	} `json:"employee"`
	CompletionOverview struct {
		TotalRequired     int     `json:"totalRequired"`
		TotalCompleted    int     `json:"totalCompleted"`
		CompletionRate    float64 `json:"completionRate"` // Percentage
		TotalOutstanding  int     `json:"totalOutstanding"`
	} `json:"completionOverview"`
	CompetencyBreakdown []CompetencyVisualizationItem `json:"competencyBreakdown"`
	StatusBreakdown     []StatusBreakdownItem         `json:"statusBreakdown"`
}

// CompetencyVisualizationItem represents individual competency status for charts
type CompetencyVisualizationItem struct {
	CompetencyID       int       `json:"competencyID"`
	CompetencyName     string    `json:"competencyName"`
	CompetencyTypeName string    `json:"competencyTypeName"`
	Status             string    `json:"status"` // "completed", "required", "expired", "expires_soon"
	AchievementDate    *time.Time `json:"achievementDate,omitempty"`
	ExpiryDate         *time.Time `json:"expiryDate,omitempty"`
	DaysUntilExpiry    *int      `json:"daysUntilExpiry,omitempty"`
}

// StatusBreakdownItem represents status counts for pie charts
type StatusBreakdownItem struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
	Label  string `json:"label"`
}

// AdminComplianceData represents company-wide compliance dashboard data
type AdminComplianceData struct {
	CompanyOverview struct {
		TotalEmployees        int     `json:"totalEmployees"`
		TotalCompetencies     int     `json:"totalCompetencies"`
		TotalRequired         int     `json:"totalRequired"`        // Total required assignments
		TotalCompleted        int     `json:"totalCompleted"`       // Total completed assignments
		OverallComplianceRate float64 `json:"overallComplianceRate"` // Percentage
	} `json:"companyOverview"`
	DepartmentBreakdown []DepartmentComplianceItem `json:"departmentBreakdown"`
	CompetencyHotspots  []CompetencyHotspotItem    `json:"competencyHotspots"`
	TrendData           []TrendDataPoint           `json:"trendData"`
	StatusDistribution  []StatusDistributionItem   `json:"statusDistribution"`
}

// DepartmentComplianceItem represents compliance by department/position
type DepartmentComplianceItem struct {
	PositionCode      string  `json:"positionCode"`
	PositionTitle     string  `json:"positionTitle"`
	EmployeeCount     int     `json:"employeeCount"`
	RequiredCount     int     `json:"requiredCount"`
	CompletedCount    int     `json:"completedCount"`
	ComplianceRate    float64 `json:"complianceRate"`
	OutstandingCount  int     `json:"outstandingCount"`
}

// CompetencyHotspotItem represents competencies with high incomplete rates
type CompetencyHotspotItem struct {
	CompetencyID       int     `json:"competencyID"`
	CompetencyName     string  `json:"competencyName"`
	CompetencyTypeName string  `json:"competencyTypeName"`
	TotalRequired      int     `json:"totalRequired"`
	TotalCompleted     int     `json:"totalCompleted"`
	IncompleteCount    int     `json:"incompleteCount"`
	IncompleteRate     float64 `json:"incompleteRate"` // Percentage
}

// TrendDataPoint represents historical completion trend data
type TrendDataPoint struct {
	Date           time.Time `json:"date"`
	CompletedCount int       `json:"completedCount"`
	RequiredCount  int       `json:"requiredCount"`
	ComplianceRate float64   `json:"complianceRate"`
}

// StatusDistributionItem represents overall status distribution
type StatusDistributionItem struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
	Label  string `json:"label"`
}

// AdminComplianceFilter represents filtering options for admin dashboard
type AdminComplianceFilter struct {
	PositionCodes   []string `json:"positionCodes,omitempty"`
	CompetencyTypes []string `json:"competencyTypes,omitempty"`
	DateFrom        *time.Time `json:"dateFrom,omitempty"`
	DateTo          *time.Time `json:"dateTo,omitempty"`
}