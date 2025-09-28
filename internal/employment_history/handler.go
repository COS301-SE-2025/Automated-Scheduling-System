package employment_history

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

func parseDate(v string) (time.Time, error) {
    t, err := time.Parse("2006-01-02", v)
    if err != nil {
        return time.Time{}, err
    }
    return t, nil
}

func parseDatePtr(v *string) (*time.Time, error) {
    if v == nil || *v == "" {
        return nil, nil
    }
    t, err := parseDate(*v)
    if err != nil {
        return nil, err
    }
    return &t, nil
}

// POST /api/employment-history
func CreateEmploymentHistoryHandler(c *gin.Context) {
    var req models.CreateEmploymentHistoryRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
        return
    }

    start, err := parseDate(req.StartDate)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid startDate (YYYY-MM-DD)"})
        return
    }
    end, err := parseDatePtr(req.EndDate)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid endDate (YYYY-MM-DD)"})
        return
    }
    employmentType := "Primary"
    if req.EmploymentType != nil && *req.EmploymentType != "" {
        employmentType = *req.EmploymentType
    }

    rec := models.EmploymentHistory{
        EmployeeNumber:     req.EmployeeNumber,
        PositionMatrixCode: req.PositionMatrixCode,
        StartDate:          start,
        EndDate:            end,
        EmploymentType:     employmentType,
        Notes:              req.Notes,
    }

    if err := DB.Create(&rec).Error; err != nil {
        if errors.Is(err, gorm.ErrDuplicatedKey) {
            c.JSON(http.StatusConflict, gin.H{"error": "Duplicate history entry (employee, position, startDate)"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create record"})
        return
    }

    c.JSON(http.StatusCreated, rec)
}

// GET /api/employment-history
// Query params: employeeNumber, positionCode, current=true, activeOn=YYYY-MM-DD, page, pageSize
func ListEmploymentHistoryHandler(c *gin.Context) {
    q := DB.Model(&models.EmploymentHistory{})

    if v := c.Query("employeeNumber"); v != "" {
        q = q.Where("employee_number = ?", v)
    }
    if v := c.Query("positionCode"); v != "" {
        q = q.Where("position_matrix_code = ?", v)
    }
    // activeOn date filter
    if v := c.Query("activeOn"); v != "" {
        if d, err := parseDate(v); err == nil {
            q = q.Where("start_date <= ? AND (end_date IS NULL OR end_date >= ?)", d, d)
        } else {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid activeOn date"})
            return
        }
    } else if c.Query("current") == "true" {
        today := time.Now().UTC().Format("2006-01-02")
        q = q.Where("start_date <= ? AND (end_date IS NULL OR end_date >= ?)", today, today)
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

    var rows []models.EmploymentHistory
    if err := q.Order("employment_id DESC").
        Limit(pageSize).
        Offset((page - 1) * pageSize).
        Find(&rows).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Fetch failed"})
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

// GET /api/employment-history/:employmentID
func GetEmploymentHistoryHandler(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("employmentID"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }
    var rec models.EmploymentHistory
    if err := DB.First(&rec, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Lookup failed"})
        }
        return
    }
    c.JSON(http.StatusOK, rec)
}

// GET /api/employees/:employeeNumber/employment-history
func ListEmploymentHistoryByEmployeeHandler(c *gin.Context) {
    emp := c.Param("employeeNumber")
    var rows []models.EmploymentHistory
    if err := DB.Where("employee_number = ?", emp).
        Order("start_date DESC, employment_id DESC").
        Find(&rows).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Fetch failed"})
        return
    }
    c.JSON(http.StatusOK, rows)
}

// GET /api/employees/:employeeNumber/current-positions
func ListCurrentPositionsForEmployeeHandler(c *gin.Context) {
    emp := c.Param("employeeNumber")
    today := time.Now().UTC().Format("2006-01-02")
    var rows []models.EmploymentHistory
    if err := DB.Where("employee_number = ? AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)",
        emp, today, today).
        Order("start_date DESC").
        Find(&rows).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Fetch failed"})
        return
    }
    c.JSON(http.StatusOK, rows)
}

// PUT /api/employment-history/:employmentID
// Only allows updating endDate, employmentType, notes
func UpdateEmploymentHistoryHandler(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("employmentID"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }
    var rec models.EmploymentHistory
    if err := DB.First(&rec, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Lookup failed"})
        }
        return
    }

    var req models.UpdateEmploymentHistoryRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
        return
    }

    if req.EndDate != nil {
        if *req.EndDate == "" {
            rec.EndDate = nil
        } else {
            d, err := parseDate(*req.EndDate)
            if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid endDate"})
                return
            }
            rec.EndDate = &d
        }
    }
    if req.EmploymentType != nil && *req.EmploymentType != "" {
        rec.EmploymentType = *req.EmploymentType
    }
    if req.Notes != nil {
        rec.Notes = *req.Notes
    }

    if err := DB.Save(&rec).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
        return
    }
    c.JSON(http.StatusOK, rec)
}

// DELETE /api/employment-history/:employmentID
func DeleteEmploymentHistoryHandler(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("employmentID"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }
    res := DB.Delete(&models.EmploymentHistory{}, id)
    if res.Error != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Delete failed"})
        return
    }
    if res.RowsAffected == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}