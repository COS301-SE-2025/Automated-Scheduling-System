package profile

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"net/http"
	// "strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GetEmployeeVisualizationData provides visualization data for the current authenticated user
func GetEmployeeVisualizationData(c *gin.Context) {
	emailVal, ok := c.Get("email")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	email := emailVal.(string)

	// Load user+employee
	var ext models.ExtendedEmployee
	if err := DB.Model(&gen_models.Employee{}).Preload("User").Where("Useraccountemail = ?", email).First(&ext).Error; err != nil || ext.User == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "employee not found"})
		return
	}

	// Current job position from employment_history
	var curPos struct { Code, Title string }
	DB.Table("employment_history eh").
		Select("eh.position_matrix_code as code, jp.job_title as title").
		Joins("LEFT JOIN job_positions jp ON jp.position_matrix_code = eh.position_matrix_code").
		Where("eh.employee_number = ? AND (eh.end_date IS NULL OR eh.end_date > NOW())", ext.Employee.Employeenumber).
		Order("eh.start_date desc").
		Limit(1).Scan(&curPos)

	// Initialize visualization data
	vizData := VisualizationData{}
	vizData.Employee.EmployeeNumber = ext.Employee.Employeenumber
	vizData.Employee.Name = ext.Employee.Firstname + " " + ext.Employee.Lastname
	vizData.Employee.PositionCode = curPos.Code
	vizData.Employee.PositionTitle = curPos.Title

	// Get completed competencies with status
	completedRows := []struct {
		ID int; Name, Type string; IsActive bool; Ach time.Time; Exp *time.Time
	}{}
	DB.Table("employee_competencies ec").
		Select("cd.competency_id as id, cd.competency_name as name, cd.competency_type_name as type, cd.is_active as is_active, ec.achievement_date as ach, ec.expiry_date as exp").
		Joins("JOIN competency_definitions cd ON cd.competency_id = ec.competency_id").
		Where("ec.employee_number = ?", ext.Employee.Employeenumber).Scan(&completedRows)

	now := time.Now()
	completedSet := map[int]struct{}{}
	statusCounts := map[string]int{
		"completed":     0,
		"expired":       0,
		"expires_soon":  0,
	}

	for _, r := range completedRows {
		completedSet[r.ID] = struct{}{}
		
		status := "completed"
		var daysUntilExpiry *int
		
		if !r.IsActive {
			status = "archived"
		} else if r.Exp != nil {
			daysUntil := int(r.Exp.Sub(now).Hours() / 24)
			daysUntilExpiry = &daysUntil
			
			if r.Exp.Before(now) {
				status = "expired"
			} else if daysUntil <= 60 { // Expires within 60 days
				status = "expires_soon"
			}
		}

		statusCounts[status]++

		vizData.CompetencyBreakdown = append(vizData.CompetencyBreakdown, CompetencyVisualizationItem{
			CompetencyID:       r.ID,
			CompetencyName:     r.Name,
			CompetencyTypeName: r.Type,
			Status:             status,
			AchievementDate:    &r.Ach,
			ExpiryDate:         r.Exp,
			DaysUntilExpiry:    daysUntilExpiry,
		})
	}

	// Get required competencies (not yet completed)
	var requiredCount int
	if curPos.Code != "" {
		reqRows := []struct {
			CompetencyID       int    `gorm:"column:competency_id"`
			CompetencyName     string `gorm:"column:competency_name"`
			CompetencyTypeName string `gorm:"column:competency_type_name"`
		}{}
		
		DB.Table("custom_job_matrix cjm").
			Select("cd.competency_id, cd.competency_name, cd.competency_type_name").
			Joins("JOIN competency_definitions cd ON cd.competency_id = cjm.competency_id").
			Where("cjm.position_matrix_code = ? AND cjm.requirement_status = ? AND cd.is_active = ?", curPos.Code, "Required", true).
			Scan(&reqRows)

		for _, r := range reqRows {
			if _, done := completedSet[r.CompetencyID]; done { 
				continue 
			}
			requiredCount++
			
			vizData.CompetencyBreakdown = append(vizData.CompetencyBreakdown, CompetencyVisualizationItem{
				CompetencyID:       r.CompetencyID,
				CompetencyName:     r.CompetencyName,
				CompetencyTypeName: r.CompetencyTypeName,
				Status:             "required",
			})
		}
	}

	// Calculate completion overview
	totalCompleted := len(completedRows)
	totalRequired := totalCompleted + requiredCount
	completionRate := 0.0
	if totalRequired > 0 {
		completionRate = float64(totalCompleted) / float64(totalRequired) * 100
	}

	vizData.CompletionOverview.TotalRequired = totalRequired
	vizData.CompletionOverview.TotalCompleted = totalCompleted
	vizData.CompletionOverview.CompletionRate = completionRate
	vizData.CompletionOverview.TotalOutstanding = requiredCount

	// Status breakdown for pie chart
	statusCounts["required"] = requiredCount
	
	for status, count := range statusCounts {
		if count > 0 {
			label := strings.Title(strings.ReplaceAll(status, "_", " "))
			vizData.StatusBreakdown = append(vizData.StatusBreakdown, StatusBreakdownItem{
				Status: status,
				Count:  count,
				Label:  label,
			})
		}
	}

	c.JSON(http.StatusOK, vizData)
}

// GetAdminComplianceData provides company-wide compliance dashboard data
func GetAdminComplianceData(c *gin.Context) {
	// Check if user has admin permissions
	emailVal, ok := c.Get("email")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	email := emailVal.(string)

	// Get user ID for permission check
	var emp gen_models.Employee
	if err := DB.Where("useraccountemail = ?", email).First(&emp).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "employee not found"})
		return
	}
	var user gen_models.User
	if err := DB.Where("employee_number = ?", emp.Employeenumber).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	// Check admin access (simplified check - you may want to use the role system)
	if user.Role != "Admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	// Parse filters from query parameters
	filters := AdminComplianceFilter{}
	if positionCodes := c.Query("positionCodes"); positionCodes != "" {
		filters.PositionCodes = strings.Split(positionCodes, ",")
	}
	if competencyTypes := c.Query("competencyTypes"); competencyTypes != "" {
		filters.CompetencyTypes = strings.Split(competencyTypes, ",")
	}

	// Initialize compliance data
	complianceData := AdminComplianceData{}

	// Company overview - get total employees
	var totalEmployees int64
	DB.Model(&gen_models.Employee{}).Where("employeestatus != ?", "Terminated").Count(&totalEmployees)

	// Get total active competencies
	var totalCompetencies int64
	DB.Model(&models.CompetencyDefinition{}).Where("is_active = ?", true).Count(&totalCompetencies)

	// Calculate total required assignments (based on current positions)
	type requirementCount struct { Total int }
	var totalReq requirementCount
	query := `
		SELECT COUNT(*) as total
		FROM employment_history eh
		JOIN custom_job_matrix cjm ON cjm.position_matrix_code = eh.position_matrix_code
		JOIN competency_definitions cd ON cd.competency_id = cjm.competency_id
		WHERE (eh.end_date IS NULL OR eh.end_date > NOW())
		AND cjm.requirement_status = 'Required'
		AND cd.is_active = true
	`
	DB.Raw(query).Scan(&totalReq)

	// Calculate total completed assignments
	var totalComp requirementCount
	compQuery := `
		SELECT COUNT(*) as total
		FROM employee_competencies ec
		JOIN competency_definitions cd ON cd.competency_id = ec.competency_id
		WHERE cd.is_active = true
	`
	DB.Raw(compQuery).Scan(&totalComp)

	overallComplianceRate := 0.0
	if totalReq.Total > 0 {
		overallComplianceRate = float64(totalComp.Total) / float64(totalReq.Total) * 100
	}

	complianceData.CompanyOverview.TotalEmployees = int(totalEmployees)
	complianceData.CompanyOverview.TotalCompetencies = int(totalCompetencies)
	complianceData.CompanyOverview.TotalRequired = totalReq.Total
	complianceData.CompanyOverview.TotalCompleted = totalComp.Total
	complianceData.CompanyOverview.OverallComplianceRate = overallComplianceRate

	// Department breakdown
	departmentRows := []struct {
		PositionCode   string `gorm:"column:position_code"`
		PositionTitle  string `gorm:"column:position_title"`
		EmployeeCount  int    `gorm:"column:employee_count"`
		RequiredCount  int    `gorm:"column:required_count"`
		CompletedCount int    `gorm:"column:completed_count"`
	}{}

	deptQuery := `
		SELECT 
			jp.position_matrix_code as position_code,
			jp.job_title as position_title,
			COUNT(DISTINCT eh.employee_number) as employee_count,
			COUNT(DISTINCT CASE WHEN cjm.requirement_status = 'Required' THEN cjm.competency_id END) as required_count,
			COUNT(DISTINCT ec.competency_id) as completed_count
		FROM job_positions jp
		LEFT JOIN employment_history eh ON eh.position_matrix_code = jp.position_matrix_code 
			AND (eh.end_date IS NULL OR eh.end_date > NOW())
		LEFT JOIN custom_job_matrix cjm ON cjm.position_matrix_code = jp.position_matrix_code 
			AND cjm.requirement_status = 'Required'
		LEFT JOIN employee_competencies ec ON ec.employee_number = eh.employee_number 
			AND ec.competency_id = cjm.competency_id
		WHERE jp.is_active = true
		GROUP BY jp.position_matrix_code, jp.job_title
		ORDER BY jp.job_title
	`
	DB.Raw(deptQuery).Scan(&departmentRows)

	for _, row := range departmentRows {
		complianceRate := 0.0
		if row.RequiredCount > 0 {
			complianceRate = float64(row.CompletedCount) / float64(row.RequiredCount) * 100
		}

		complianceData.DepartmentBreakdown = append(complianceData.DepartmentBreakdown, DepartmentComplianceItem{
			PositionCode:     row.PositionCode,
			PositionTitle:    row.PositionTitle,
			EmployeeCount:    row.EmployeeCount,
			RequiredCount:    row.RequiredCount,
			CompletedCount:   row.CompletedCount,
			ComplianceRate:   complianceRate,
			OutstandingCount: row.RequiredCount - row.CompletedCount,
		})
	}

	// Competency hotspots (competencies with highest incomplete rates)
	hotspotRows := []struct {
		CompetencyID       int     `gorm:"column:competency_id"`
		CompetencyName     string  `gorm:"column:competency_name"`
		CompetencyTypeName string  `gorm:"column:competency_type_name"`
		TotalRequired      int     `gorm:"column:total_required"`
		TotalCompleted     int     `gorm:"column:total_completed"`
	}{}

	hotspotQuery := `
		SELECT 
			cd.competency_id,
			cd.competency_name,
			cd.competency_type_name,
			COUNT(DISTINCT cjm.custom_matrix_id) as total_required,
			COUNT(DISTINCT ec.employee_competency_id) as total_completed
		FROM competency_definitions cd
		JOIN custom_job_matrix cjm ON cjm.competency_id = cd.competency_id 
			AND cjm.requirement_status = 'Required'
		JOIN employment_history eh ON eh.position_matrix_code = cjm.position_matrix_code 
			AND (eh.end_date IS NULL OR eh.end_date > NOW())
		LEFT JOIN employee_competencies ec ON ec.competency_id = cd.competency_id 
			AND ec.employee_number = eh.employee_number
		WHERE cd.is_active = true
		GROUP BY cd.competency_id, cd.competency_name, cd.competency_type_name
		HAVING COUNT(DISTINCT cjm.custom_matrix_id) > 0
		ORDER BY (COUNT(DISTINCT cjm.custom_matrix_id) - COUNT(DISTINCT ec.employee_competency_id)) DESC
		LIMIT 10
	`
	DB.Raw(hotspotQuery).Scan(&hotspotRows)

	for _, row := range hotspotRows {
		incompleteCount := row.TotalRequired - row.TotalCompleted
		incompleteRate := 0.0
		if row.TotalRequired > 0 {
			incompleteRate = float64(incompleteCount) / float64(row.TotalRequired) * 100
		}

		complianceData.CompetencyHotspots = append(complianceData.CompetencyHotspots, CompetencyHotspotItem{
			CompetencyID:       row.CompetencyID,
			CompetencyName:     row.CompetencyName,
			CompetencyTypeName: row.CompetencyTypeName,
			TotalRequired:      row.TotalRequired,
			TotalCompleted:     row.TotalCompleted,
			IncompleteCount:    incompleteCount,
			IncompleteRate:     incompleteRate,
		})
	}

	// Status distribution (company-wide)
	statusRows := []struct {
		Status string `gorm:"column:status"`
		Count  int    `gorm:"column:count"`
	}{}

	statusQuery := `
		SELECT 
			CASE 
				WHEN ec.expiry_date IS NOT NULL AND ec.expiry_date < NOW() THEN 'expired'
				WHEN ec.expiry_date IS NOT NULL AND ec.expiry_date <= NOW() + INTERVAL '60 days' THEN 'expires_soon'
				WHEN ec.employee_competency_id IS NOT NULL THEN 'completed'
				ELSE 'required'
			END as status,
			COUNT(*) as count
		FROM (
			SELECT DISTINCT eh.employee_number, cjm.competency_id
			FROM employment_history eh
			JOIN custom_job_matrix cjm ON cjm.position_matrix_code = eh.position_matrix_code
			WHERE (eh.end_date IS NULL OR eh.end_date > NOW())
			AND cjm.requirement_status = 'Required'
		) required_assignments
		LEFT JOIN employee_competencies ec ON ec.employee_number = required_assignments.employee_number 
			AND ec.competency_id = required_assignments.competency_id
		GROUP BY status
	`
	DB.Raw(statusQuery).Scan(&statusRows)

	for _, row := range statusRows {
		label := strings.Title(strings.ReplaceAll(row.Status, "_", " "))
		complianceData.StatusDistribution = append(complianceData.StatusDistribution, StatusDistributionItem{
			Status: row.Status,
			Count:  row.Count,
			Label:  label,
		})
	}

	// Trend data (last 12 months) - simplified version
	startDate := time.Now().AddDate(0, -12, 0)
	for i := 0; i < 12; i++ {
		monthStart := startDate.AddDate(0, i, 0)
		monthEnd := monthStart.AddDate(0, 1, 0)

		var monthCompleted int64
		
		// Count completions in this month
		DB.Model(&models.EmployeeCompetency{}).
			Where("achievement_date >= ? AND achievement_date < ?", monthStart, monthEnd).
			Count(&monthCompleted)

		complianceData.TrendData = append(complianceData.TrendData, TrendDataPoint{
			Date:           monthStart,
			CompletedCount: int(monthCompleted),
			RequiredCount:  0, // Simplified - historical requirements would need complex calculation
			ComplianceRate: overallComplianceRate, // Simplified - you might want to calculate historical rates
		})
	}

	c.JSON(http.StatusOK, complianceData)
}