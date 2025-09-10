package profile

import (
    "Automated-Scheduling-Project/internal/database/gen_models"
    "Automated-Scheduling-Project/internal/database/models"
    // "Automated-Scheduling-Project/internal/role"
    "net/http"
    "sort"
    "time"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

var DB *gorm.DB

type CompetencyBrief struct {
    CompetencyID       int       `json:"competencyID"`
    CompetencyName     string    `json:"competencyName"`
    CompetencyTypeName string    `json:"competencyTypeName"`
    Description        string    `json:"description"`
    ExpiryPeriodMonths *int      `json:"expiryPeriodMonths"`
    IsActive           bool      `json:"isActive"`
    AchievementDate    *time.Time `json:"achievementDate,omitempty"`
    ExpiryDate         *time.Time `json:"expiryDate,omitempty"`
    Status             string    `json:"status,omitempty"` // Valid | Expires Soon | Expired | Archived
    Prerequisites      []int     `json:"prerequisites,omitempty"`
}

type EmployeeCompetencyProfile struct {
    Employee struct {
        EmployeeNumber string `json:"employeeNumber"`
        Name           string `json:"name"`
        PositionCode   string `json:"positionCode"`
        PositionTitle  string `json:"positionTitle"`
    } `json:"employee"`
    Completed []CompetencyBrief `json:"completed"`
    Required  []CompetencyBrief `json:"required"`
    Explore   []CompetencyBrief `json:"explore"`
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
    var curPos struct { Code, Title string }
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

    // Completed: from employee_competencies join competency_definitions
    rows := []struct {
        ID int; Name, Type string; Desc string; Expires *int; IsActive bool; Ach time.Time; Exp *time.Time
    }{}
    DB.Table("employee_competencies ec").
        Select("cd.competency_id as id, cd.competency_name as name, cd.competency_type_name as type, cd.description as desc, cd.expiry_period_months as expires, cd.is_active as is_active, ec.achievement_date as ach, ec.expiry_date as exp").
        Joins("JOIN competency_definitions cd ON cd.competency_id = ec.competency_id").
        Where("ec.employee_number = ?", ext.Employee.Employeenumber).Scan(&rows)
    now := time.Now()
    for _, r := range rows {
        status := "Valid"
        if !r.IsActive { status = "Archived" }
        if r.Exp != nil {
            if r.Exp.Before(now) { status = "Expired" } else if r.Exp.Sub(now).Hours() <= 24*60 { status = "Expires Soon" }
        }
        prof.Completed = append(prof.Completed, CompetencyBrief{
            CompetencyID: r.ID,
            CompetencyName: r.Name,
            CompetencyTypeName: r.Type,
            Description: r.Desc,
            ExpiryPeriodMonths: r.Expires,
            IsActive: r.IsActive,
            AchievementDate: &r.Ach,
            ExpiryDate: r.Exp,
            Status: status,
        })
    }

    // Required: from custom_job_matrix for current position, active competencies, excluding completed
    completedSet := map[int]struct{}{}
    for _, ccc := range prof.Completed { completedSet[ccc.CompetencyID] = struct{}{} }
    var reqRows []models.CustomJobMatrix
    if curPos.Code != "" {
        _ = DB.Preload("CompetencyDefinition.Prerequisites").Where("position_matrix_code = ?", curPos.Code).Find(&reqRows).Error
    }
    for _, r := range reqRows {
        cdef := r.CompetencyDefinition
        if !cdef.IsActive { continue }
        if _, done := completedSet[cdef.CompetencyID]; done { continue }
        // prerequisites IDs
        prereqIDs := make([]int, 0, len(cdef.Prerequisites))
        for _, p := range cdef.Prerequisites { prereqIDs = append(prereqIDs, p.CompetencyID) }
        prof.Required = append(prof.Required, CompetencyBrief{
            CompetencyID: cdef.CompetencyID,
            CompetencyName: cdef.CompetencyName,
            CompetencyTypeName: cdef.CompetencyTypeName,
            Description: cdef.Description,
            ExpiryPeriodMonths: cdef.ExpiryPeriodMonths,
            IsActive: cdef.IsActive,
            Prerequisites: prereqIDs,
        })
    }
    // sort: with no prerequisites first
    sort.SliceStable(prof.Required, func(i, j int) bool { return len(prof.Required[i].Prerequisites) < len(prof.Required[j].Prerequisites) })

    // Explore: other active competencies not in completed or required
    reqSet := map[int]struct{}{}
    for _, r := range prof.Required { reqSet[r.CompetencyID] = struct{}{} }
    var allActive []models.CompetencyDefinition
    _ = DB.Where("is_active = ?", true).Preload("Prerequisites").Find(&allActive).Error
    for _, cdef := range allActive {
        if _, done := completedSet[cdef.CompetencyID]; done { continue }
        if _, req := reqSet[cdef.CompetencyID]; req { continue }
        prof.Explore = append(prof.Explore, CompetencyBrief{
            CompetencyID: cdef.CompetencyID,
            CompetencyName: cdef.CompetencyName,
            CompetencyTypeName: cdef.CompetencyTypeName,
            Description: cdef.Description,
            ExpiryPeriodMonths: cdef.ExpiryPeriodMonths,
            IsActive: cdef.IsActive,
        })
    }

    c.JSON(http.StatusOK, prof)
}
