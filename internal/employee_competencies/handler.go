package employee_competencies

import (
    "Automated-Scheduling-Project/internal/database/models"
    "errors"
    "net/http"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

var DB *gorm.DB

func SetDB(db *gorm.DB) { DB = db }

// parseDate parses YYYY-MM-DD into *time.Time
func parseDate(v *string) (*time.Time, error) {
    if v == nil || *v == "" {
        return nil, nil
    }
    t, err := time.Parse("2006-01-02", *v)
    if err != nil {
        return nil, err
    }
    // normalize to date (UTC midnight)
    t = t.UTC()
    return &t, nil
}

func computeExpiry(base *time.Time, months *int) *time.Time {
    if base == nil || months == nil {
        return nil
    }
    d := base.AddDate(0, *months, 0)
    return &d
}

// POST /api/employee-competencies
func CreateEmployeeCompetencyHandler(c *gin.Context) {
    var req models.CreateEmployeeCompetencyRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
        return
    }

    // Achievement date: now defaults to NULL when omitted (previously defaulted to today)
    var achDate *time.Time
    if req.AchievementDate != nil && *req.AchievementDate != "" {
        d, err := parseDate(req.AchievementDate)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid achievementDate format (expected YYYY-MM-DD)"})
            return
        }
        achDate = d
    } // else leave nil

    // Load competency for potential auto-expiry
    var compDef models.CompetencyDefinition
    if err := DB.First(&compDef, req.CompetencyID).Error; err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Competency not found"})
        return
    }

    // Expiry logic:
    // 1. If expiryDate provided -> parse & use.
    // 2. Else if no expiryDate provided AND we have an achievement date AND competency has expiry months -> auto-calc.
    // 3. Else (no ach date or no expiry period) -> leave NULL.
    var expiry *time.Time
    if req.ExpiryDate != nil && *req.ExpiryDate != "" {
        d, err := parseDate(req.ExpiryDate)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expiryDate format (expected YYYY-MM-DD)"})
            return
        }
        expiry = d
    } else if achDate != nil && compDef.ExpiryPeriodMonths != nil {
        expiry = computeExpiry(achDate, compDef.ExpiryPeriodMonths)
    }

    newRec := models.EmployeeCompetency{
        EmployeeNumber:      req.EmployeeNumber,
        CompetencyID:        req.CompetencyID,
        AchievementDate:     achDate,
        ExpiryDate:          expiry,
        GrantedByScheduleID: req.GrantedByScheduleID,
        Notes:               req.Notes,
    }

    if err := DB.Create(&newRec).Error; err != nil {
        if errors.Is(err, gorm.ErrDuplicatedKey) {
            c.JSON(http.StatusConflict, gin.H{"error": "Duplicate: this employee already has this competency with that achievement date"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create employee competency"})
        return
    }

    DB.Preload("CompetencyDefinition").First(&newRec, newRec.EmployeeCompetencyID)
    c.JSON(http.StatusCreated, newRec)
}

// GET /api/employee-competencies (with filters)
func ListEmployeeCompetenciesHandler(c *gin.Context) {
    q := DB.Model(&models.EmployeeCompetency{}).Preload("CompetencyDefinition")

    if v := c.Query("employeeNumber"); v != "" {
        q = q.Where("employee_number = ?", v)
    }
    if v := c.Query("competencyID"); v != "" {
        if id, err := strconv.Atoi(v); err == nil {
            q = q.Where("competency_id = ?", id)
        }
    }
    nowDate := time.Now().UTC()
    if c.Query("current") == "true" {
        q = q.Where("(expiry_date IS NULL OR expiry_date >= ?)", nowDate.Format("2006-01-02"))
    }
    if c.Query("expired") == "true" {
        q = q.Where("expiry_date IS NOT NULL AND expiry_date < ?", nowDate.Format("2006-01-02"))
    }
    if v := c.Query("upcomingExpiryDays"); v != "" {
        if days, err := strconv.Atoi(v); err == nil && days >= 0 {
            to := nowDate.AddDate(0, 0, days).Format("2006-01-02")
            q = q.Where("expiry_date IS NOT NULL AND expiry_date BETWEEN ? AND ?", nowDate.Format("2006-01-02"), to)
        }
    }

    // Pagination
    pageSize := 50
    if v := c.Query("pageSize"); v != "" {
        if ps, err := strconv.Atoi(v); err == nil && ps > 0 && ps <= 500 {
            pageSize = ps
        }
    }
    page := 1
    if v := c.Query("page"); v != "" {
        if p, err := strconv.Atoi(v); err == nil && p > 0 {
            page = p
        }
    }
    var total int64
    q.Count(&total)

    var rows []models.EmployeeCompetency
    if err := q.Order("employee_competency_id DESC").
        Limit(pageSize).
        Offset((page - 1) * pageSize).
        Find(&rows).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch records"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "data":       rows,
        "total":      total,
        "page":       page,
        "pageSize":   pageSize,
        "totalPages": (total + int64(pageSize) - 1) / int64(pageSize),
    })
}

// GET /api/employee-competencies/:employeeCompetencyID
func GetEmployeeCompetencyHandler(c *gin.Context) {
    idStr := c.Param("employeeCompetencyID")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }
    var rec models.EmployeeCompetency
    if err := DB.Preload("CompetencyDefinition").First(&rec, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch record"})
        }
        return
    }
    c.JSON(http.StatusOK, rec)
}

// GET /api/employees/:employeeNumber/competencies
func ListEmployeeCompetenciesByEmployeeHandler(c *gin.Context) {
    emp := c.Param("employeeNumber")
    var rows []models.EmployeeCompetency
    if err := DB.Preload("CompetencyDefinition").
        Where("employee_number = ?", emp).
        Order("achievement_date DESC NULLS LAST, employee_competency_id DESC").
        Find(&rows).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employee competencies"})
        return
    }
    c.JSON(http.StatusOK, rows)
}

// PUT /api/employee-competencies/:employeeCompetencyID
func UpdateEmployeeCompetencyHandler(c *gin.Context) {
    idStr := c.Param("employeeCompetencyID")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }
    var rec models.EmployeeCompetency
    if err := DB.First(&rec, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Lookup failed"})
        }
        return
    }

    var req models.UpdateEmployeeCompetencyRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
        return
    }

    if req.AchievementDate != nil {
        d, err := parseDate(req.AchievementDate)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid achievementDate"})
            return
        }
        rec.AchievementDate = d
    }
    if req.ExpiryDate != nil {
        if *req.ExpiryDate == "" {
            rec.ExpiryDate = nil
        } else {
            d, err := parseDate(req.ExpiryDate)
            if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expiryDate"})
                return
            }
            rec.ExpiryDate = d
        }
    }
    if req.GrantedByScheduleID != nil {
        rec.GrantedByScheduleID = req.GrantedByScheduleID
    }
    if req.Notes != nil {
        rec.Notes = *req.Notes
    }

    if err := DB.Save(&rec).Error; err != nil {
        if errors.Is(err, gorm.ErrDuplicatedKey) {
            c.JSON(http.StatusConflict, gin.H{"error": "Update caused duplicate unique key"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update record"})
        return
    }

    DB.Preload("CompetencyDefinition").First(&rec, rec.EmployeeCompetencyID)
    c.JSON(http.StatusOK, rec)
}

// DELETE /api/employee-competencies/:employeeCompetencyID
func DeleteEmployeeCompetencyHandler(c *gin.Context) {
    idStr := c.Param("employeeCompetencyID")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }
    result := DB.Delete(&models.EmployeeCompetency{}, id)
    if result.Error != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete record"})
        return
    }
    if result.RowsAffected == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
