package profile

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"Automated-Scheduling-Project/internal/database/models"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

type CompetencyBrief struct {
	CompetencyID       int        `json:"competencyID"`
	CompetencyName     string     `json:"competencyName"`
	CompetencyTypeName string     `json:"competencyTypeName"`
	Description        string     `json:"description"`
	ExpiryPeriodMonths *int       `json:"expiryPeriodMonths"`
	IsActive           bool       `json:"isActive"`
	AchievementDate    *time.Time `json:"achievementDate,omitempty"`
	ExpiryDate         *time.Time `json:"expiryDate,omitempty"`
	Status             string     `json:"status,omitempty"` // Valid | Expires Soon | Expired | Archived
	Prerequisites      []int      `json:"prerequisites,omitempty"`
}

type EmployeeCompetencyProfile struct {
	Employee struct {
		EmployeeNumber string `json:"employeeNumber"`
		Name           string `json:"name"`
		PositionCode   string `json:"positionCode"`
		PositionTitle  string `json:"positionTitle"`
		Email          string `json:"email"`
		Phone          string `json:"phone,omitempty"`
	} `json:"employee"`
	Completed []CompetencyBrief `json:"completed"`
	Required  []CompetencyBrief `json:"required"`
}

// GetEmployeeCompetencyProfile aggregates the competency profile for the current authenticated user
func GetEmployeeCompetencyProfile(c *gin.Context) {
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

	// Current job position from employment_history (current row: end_date is NULL or future)
	var curPos struct{ Code, Title string }
	DB.Table("employment_history eh").
		Select("eh.position_matrix_code as code, jp.job_title as title").
		Joins("LEFT JOIN job_positions jp ON jp.position_matrix_code = eh.position_matrix_code").
		Where("eh.employee_number = ? AND (eh.end_date IS NULL OR eh.end_date > NOW())", ext.Employee.Employeenumber).
		Order("eh.start_date desc").
		Limit(1).Scan(&curPos)

	prof := EmployeeCompetencyProfile{}
	prof.Employee.EmployeeNumber = ext.Employee.Employeenumber
	prof.Employee.Name = ext.Employee.Firstname + " " + ext.Employee.Lastname
	prof.Employee.PositionCode = curPos.Code
	prof.Employee.PositionTitle = curPos.Title
	prof.Employee.Email = ext.Employee.Useraccountemail
	prof.Employee.Phone = ext.Employee.PhoneNumber

	// Get all assigned competencies (both completed and required)
	allRows := []struct {
		ID         int
		Name, Type string
		Desc       string
		Expires    *int
		IsActive   bool
		Ach        *time.Time
		Exp        *time.Time
	}{}
	DB.Table("employee_competencies ec").
		Select("cd.competency_id as id, cd.competency_name as name, cd.competency_type_name as type, cd.description as desc, cd.expiry_period_months as expires, cd.is_active as is_active, ec.achievement_date as ach, ec.expiry_date as exp").
		Joins("JOIN competency_definitions cd ON cd.competency_id = ec.competency_id").
		Where("ec.employee_number = ?", ext.Employee.Employeenumber).Scan(&allRows)

	now := time.Now()
	for _, r := range allRows {
		// If achievement_date is not null, it's completed
		if r.Ach != nil {
			status := "Valid"
			if !r.IsActive {
				status = "Archived"
			}
			if r.Exp != nil {
				if r.Exp.Before(now) {
					status = "Expired"
				} else if r.Exp.Sub(now).Hours() <= 24*60 {
					status = "Expires Soon"
				}
			}
			prof.Completed = append(prof.Completed, CompetencyBrief{
				CompetencyID:       r.ID,
				CompetencyName:     r.Name,
				CompetencyTypeName: r.Type,
				Description:        r.Desc,
				ExpiryPeriodMonths: r.Expires,
				IsActive:           r.IsActive,
				AchievementDate:    r.Ach,
				ExpiryDate:         r.Exp,
				Status:             status,
			})
		} else {
			// If achievement_date is null, it's required but not completed
			// Get prerequisites for this competency
			var prereqIDs []int
			DB.Table("competency_prerequisites cp").
				Select("cp.prerequisite_competency_id").
				Where("cp.competency_id = ?", r.ID).
				Pluck("prerequisite_competency_id", &prereqIDs)

			prof.Required = append(prof.Required, CompetencyBrief{
				CompetencyID:       r.ID,
				CompetencyName:     r.Name,
				CompetencyTypeName: r.Type,
				Description:        r.Desc,
				ExpiryPeriodMonths: r.Expires,
				IsActive:           r.IsActive,
				Prerequisites:      prereqIDs,
			})
		}
	}
	// sort: with no prerequisites first
	sort.SliceStable(prof.Required, func(i, j int) bool { return len(prof.Required[i].Prerequisites) < len(prof.Required[j].Prerequisites) })

	c.JSON(http.StatusOK, prof)
}

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
	var curPos struct{ Code, Title string }
	DB.Table("employment_history eh").
		Select("eh.position_matrix_code as code, jp.job_title as title").
		Joins("LEFT JOIN job_positions jp ON jp.position_matrix_code = eh.position_matrix_code").
		Where("eh.employee_number = ? AND (eh.end_date IS NULL OR eh.end_date > NOW())", ext.Employee.Employeenumber).
		Order("eh.start_date desc").
		Limit(1).Scan(&curPos)

	// Initialize visualization data
	vizData := models.VisualizationData{}
	vizData.Employee.EmployeeNumber = ext.Employee.Employeenumber
	vizData.Employee.Name = ext.Employee.Firstname + " " + ext.Employee.Lastname
	vizData.Employee.PositionCode = curPos.Code
	vizData.Employee.PositionTitle = curPos.Title

	// Get all assigned competencies (both completed and pending)
	allCompetencyRows := []struct {
		ID         int
		Name, Type string
		IsActive   bool
		Ach        *time.Time
		Exp        *time.Time
	}{}
	DB.Table("employee_competencies ec").
		Select("cd.competency_id as id, cd.competency_name as name, cd.competency_type_name as type, cd.is_active as is_active, ec.achievement_date as ach, ec.expiry_date as exp").
		Joins("JOIN competency_definitions cd ON cd.competency_id = ec.competency_id").
		Where("ec.employee_number = ?", ext.Employee.Employeenumber).Scan(&allCompetencyRows)

	now := time.Now()
	completedSet := map[int]struct{}{}
	statusCounts := map[string]int{
		"completed":    0,
		"expired":      0,
		"expires_soon": 0,
		"required":     0,
	}

	for _, r := range allCompetencyRows {
		var status string
		var daysUntilExpiry *int

		// If achievement_date is null, competency is assigned but not completed
		if r.Ach == nil {
			status = "required"
		} else {
			// Mark as completed for tracking
			completedSet[r.ID] = struct{}{}

			if !r.IsActive {
				status = "archived"
			} else if r.Exp != nil {
				daysUntil := int(r.Exp.Sub(now).Hours() / 24)
				daysUntilExpiry = &daysUntil

				if r.Exp.Before(now) {
					status = "expired"
				} else if daysUntil <= 60 { // Expires within 60 days
					status = "expires_soon"
				} else {
					status = "completed"
				}
			} else {
				status = "completed"
			}
		}

		statusCounts[status]++

		vizData.CompetencyBreakdown = append(vizData.CompetencyBreakdown, models.CompetencyVisualizationItem{
			CompetencyID:       r.ID,
			CompetencyName:     r.Name,
			CompetencyTypeName: r.Type,
			Status:             status,
			AchievementDate:    r.Ach,
			ExpiryDate:         r.Exp,
			DaysUntilExpiry:    daysUntilExpiry,
		})
	}

	// Calculate completion overview based on individual assignments
	totalAssigned := len(allCompetencyRows)
	totalCompleted := len(completedSet)
	totalRequired := statusCounts["required"]
	completionRate := 0.0
	if totalAssigned > 0 {
		completionRate = float64(totalCompleted) / float64(totalAssigned) * 100
	}

	vizData.CompletionOverview.TotalRequired = totalAssigned
	vizData.CompletionOverview.TotalCompleted = totalCompleted
	vizData.CompletionOverview.CompletionRate = completionRate
	vizData.CompletionOverview.TotalOutstanding = totalRequired

	// Status breakdown for pie chart
	for status, count := range statusCounts {
		if count > 0 {
			label := strings.Title(strings.ReplaceAll(status, "_", " "))
			vizData.StatusBreakdown = append(vizData.StatusBreakdown, models.StatusBreakdownItem{
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
	filters := models.AdminComplianceFilter{}
	if positionCodes := c.Query("positionCodes"); positionCodes != "" {
		filters.PositionCodes = strings.Split(positionCodes, ",")
	}
	if competencyTypes := c.Query("competencyTypes"); competencyTypes != "" {
		filters.CompetencyTypes = strings.Split(competencyTypes, ",")
	}

	// Initialize compliance data
	complianceData := models.AdminComplianceData{}

	// Company overview - get total employees
	var totalEmployees int64
	DB.Model(&gen_models.Employee{}).Where("employeestatus != ?", "Terminated").Count(&totalEmployees)

	// Get total active competencies
	var totalCompetencies int64
	DB.Model(&models.CompetencyDefinition{}).Where("is_active = ?", true).Count(&totalCompetencies)

	// Calculate total assigned competencies (individual assignments)
	type requirementCount struct{ Total int }
	var totalReq requirementCount
	assignQuery := `
		SELECT COUNT(*) as total
		FROM employee_competencies ec
		JOIN competency_definitions cd ON cd.competency_id = ec.competency_id
		JOIN employee e ON e.EmployeeNumber = ec.employee_number
		WHERE cd.is_active = true 
		AND e.employeestatus != 'Terminated'
	`
	DB.Raw(assignQuery).Scan(&totalReq)

	// Calculate total completed assignments (where achievement_date is not null)
	var totalComp requirementCount
	compQuery := `
		SELECT COUNT(*) as total
		FROM employee_competencies ec
		JOIN competency_definitions cd ON cd.competency_id = ec.competency_id
		JOIN employee e ON e.EmployeeNumber = ec.employee_number
		WHERE cd.is_active = true 
		AND e.employeestatus != 'Terminated'
		AND ec.achievement_date IS NOT NULL
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
			COALESCE(jp.position_matrix_code, 'UNASSIGNED') as position_code,
			COALESCE(jp.job_title, 'No Position') as position_title,
			COUNT(DISTINCT eh.employee_number) as employee_count,
			COUNT(DISTINCT ec.competency_id) as required_count,
			COUNT(DISTINCT CASE WHEN ec.achievement_date IS NOT NULL THEN ec.competency_id END) as completed_count
		FROM employment_history eh
		JOIN employee e ON e.EmployeeNumber = eh.employee_number
		LEFT JOIN job_positions jp ON jp.position_matrix_code = eh.position_matrix_code
		LEFT JOIN employee_competencies ec ON ec.employee_number = eh.employee_number
		WHERE (eh.end_date IS NULL OR eh.end_date > NOW())
		AND e.employeestatus != 'Terminated'
		GROUP BY jp.position_matrix_code, jp.job_title
		ORDER BY jp.job_title NULLS LAST
	`
	DB.Raw(deptQuery).Scan(&departmentRows)

	for _, row := range departmentRows {
		complianceRate := 0.0
		if row.RequiredCount > 0 {
			complianceRate = float64(row.CompletedCount) / float64(row.RequiredCount) * 100
		}

		complianceData.DepartmentBreakdown = append(complianceData.DepartmentBreakdown, models.DepartmentComplianceItem{
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
		CompetencyID       int    `gorm:"column:competency_id"`
		CompetencyName     string `gorm:"column:competency_name"`
		CompetencyTypeName string `gorm:"column:competency_type_name"`
		TotalRequired      int    `gorm:"column:total_required"`
		TotalCompleted     int    `gorm:"column:total_completed"`
	}{}

	hotspotQuery := `
		SELECT 
			cd.competency_id,
			cd.competency_name,
			cd.competency_type_name,
			COUNT(DISTINCT ec.employee_competency_id) as total_required,
			COUNT(DISTINCT CASE WHEN ec.achievement_date IS NOT NULL THEN ec.employee_competency_id END) as total_completed
		FROM competency_definitions cd
		JOIN employee_competencies ec ON ec.competency_id = cd.competency_id
		JOIN employee e ON e.EmployeeNumber = ec.employee_number
		WHERE cd.is_active = true
		AND e.employeestatus != 'Terminated'
		GROUP BY cd.competency_id, cd.competency_name, cd.competency_type_name
		HAVING COUNT(DISTINCT ec.employee_competency_id) > 0
		ORDER BY (COUNT(DISTINCT ec.employee_competency_id) - COUNT(DISTINCT CASE WHEN ec.achievement_date IS NOT NULL THEN ec.employee_competency_id END)) DESC
		LIMIT 10
	`
	DB.Raw(hotspotQuery).Scan(&hotspotRows)

	for _, row := range hotspotRows {
		incompleteCount := row.TotalRequired - row.TotalCompleted
		incompleteRate := 0.0
		if row.TotalRequired > 0 {
			incompleteRate = float64(incompleteCount) / float64(row.TotalRequired) * 100
		}

		complianceData.CompetencyHotspots = append(complianceData.CompetencyHotspots, models.CompetencyHotspotItem{
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
				WHEN ec.achievement_date IS NULL THEN 'required'
				WHEN ec.expiry_date IS NOT NULL AND ec.expiry_date < NOW() THEN 'expired'
				WHEN ec.expiry_date IS NOT NULL AND ec.expiry_date <= NOW() + INTERVAL '60 days' THEN 'expires_soon'
				ELSE 'completed'
			END as status,
			COUNT(*) as count
		FROM employee_competencies ec
		JOIN competency_definitions cd ON cd.competency_id = ec.competency_id
		JOIN employee e ON e.EmployeeNumber = ec.employee_number
		WHERE cd.is_active = true
		AND e.employeestatus != 'Terminated'
		GROUP BY status
	`
	DB.Raw(statusQuery).Scan(&statusRows)

	for _, row := range statusRows {
		label := strings.Title(strings.ReplaceAll(row.Status, "_", " "))
		complianceData.StatusDistribution = append(complianceData.StatusDistribution, models.StatusDistributionItem{
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

		complianceData.TrendData = append(complianceData.TrendData, models.TrendDataPoint{
			Date:           monthStart,
			CompletedCount: int(monthCompleted),
			RequiredCount:  0,                     // Simplified - historical requirements would need complex calculation
			ComplianceRate: overallComplianceRate, // Simplified - you might want to calculate historical rates
		})
	}

	c.JSON(http.StatusOK, complianceData)
}

// UpdateProfileRequest represents the request body for updating profile
type UpdateProfileRequest struct {
	Email string `json:"email,omitempty"`
	Phone string `json:"phone,omitempty"`
}

// UpdateEmployeeProfile updates the profile information for the current authenticated user
func UpdateEmployeeProfile(c *gin.Context) {
	emailVal, ok := c.Get("email")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	email := emailVal.(string)

	// Parse request body
	var updateReq UpdateProfileRequest
	if err := c.ShouldBindJSON(&updateReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	// Find the employee by their current email (useraccountemail)
	var employee gen_models.Employee
	if err := DB.Where("useraccountemail = ?", email).First(&employee).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Prepare update data
	updateData := make(map[string]interface{})

	// Only update fields that are provided and not empty
	if updateReq.Email != "" && strings.TrimSpace(updateReq.Email) != "" {
		updateData["useraccountemail"] = strings.TrimSpace(updateReq.Email)
	}

	// Update phone number (phonenumber field exists in Employee model)
	if updateReq.Phone != "" && strings.TrimSpace(updateReq.Phone) != "" {
		// Clean and format phone number to fit database constraints
		cleanPhone := strings.ReplaceAll(strings.TrimSpace(updateReq.Phone), " ", "")
		cleanPhone = strings.ReplaceAll(cleanPhone, "-", "")
		cleanPhone = strings.ReplaceAll(cleanPhone, "(", "")
		cleanPhone = strings.ReplaceAll(cleanPhone, ")", "")

		// Check if phone number is too long and provide helpful error
		if len(cleanPhone) > 11 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Phone number too long. Please use a shorter format (max 11 digits including country code)",
				"note":  "Try using format like: +12345678901 or 12345678901",
			})
			return
		}

		updateData["phonenumber"] = cleanPhone
	}

	// Only proceed with update if there's something to update
	if len(updateData) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no valid fields to update"})
		return
	}

	// Update the employee record
	if err := DB.Model(&employee).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"updated": updateData,
	})
}
