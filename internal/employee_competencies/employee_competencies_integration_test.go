//go:build !unit

package employee_competencies

import (
    "Automated-Scheduling-Project/internal/database/models"
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/require"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

/* ---------- Test DB setup ---------- */

func setupTestDB(t *testing.T) *gorm.DB {
    t.Helper()
    gin.SetMode(gin.TestMode)

    silentLogger := logger.Default.LogMode(logger.Silent)
    db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
        Logger: silentLogger,
    })
    require.NoError(t, err, "Failed to open in-memory sqlite")

    require.NoError(t, db.AutoMigrate(&models.CompetencyDefinition{}, &models.EmployeeCompetency{}), "AutoMigrate failed")

    SetDB(db)
    return db
}

func performRequest(t *testing.T, r http.Handler, method, path string, body []byte) *httptest.ResponseRecorder {
    t.Helper()
    req, err := http.NewRequest(method, path, bytes.NewBuffer(body))
    require.NoError(t, err)
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    return w
}

func mustDate(t *testing.T, s string) time.Time {
    t.Helper()
    d, err := time.Parse("2006-01-02", s)
    require.NoError(t, err)
    return d.UTC()
}

func seedCompetency(t *testing.T, db *gorm.DB, id int, months int) models.CompetencyDefinition {
    t.Helper()
    monthsCopy := months
    comp := models.CompetencyDefinition{
        CompetencyID:        id,
        CompetencyName:      "Test Competency",
        Source:              "Custom",
        IsActive:            true,
        ExpiryPeriodMonths:  &monthsCopy,
        CompetencyTypeName:  "Certification",
        Description:         "For testing",
    }
    require.NoError(t, db.Create(&comp).Error)
    return comp
}

/* ---------- Tests ---------- */

func TestCreateEmployeeCompetencyHandler_Integration(t *testing.T) {
    db := setupTestDB(t)
    seedCompetency(t, db, 10, 12)

    r := gin.New()
    r.POST("/employee-competencies", CreateEmployeeCompetencyHandler)

    ach := "2025-01-15"
    req := models.CreateEmployeeCompetencyRequest{
        EmployeeNumber:  "E100",
        CompetencyID:    10,
        AchievementDate: &ach,
        Notes:           "Initial grant",
    }

    body, _ := json.Marshal(req)
    w := performRequest(t, r, "POST", "/employee-competencies", body)
    require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

    var created models.EmployeeCompetency
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
    require.NotZero(t, created.EmployeeCompetencyID)
    require.Equal(t, "E100", created.EmployeeNumber)
    require.Equal(t, 10, created.CompetencyID)
    require.NotNil(t, created.AchievementDate)
    require.NotNil(t, created.ExpiryDate)
    require.Equal(t, mustDate(t, "2025-01-15"), created.AchievementDate.UTC())
    require.Equal(t, mustDate(t, "2026-01-15"), created.ExpiryDate.UTC())
    require.Equal(t, "Initial grant", created.Notes)

    // Confirm persisted
    var inDB models.EmployeeCompetency
    require.NoError(t, db.First(&inDB, created.EmployeeCompetencyID).Error)
    require.Equal(t, created.EmployeeNumber, inDB.EmployeeNumber)
}

func TestCreateEmployeeCompetencyHandler_InvalidCompetency_Integration(t *testing.T) {
    _ = setupTestDB(t)

    r := gin.New()
    r.POST("/employee-competencies", CreateEmployeeCompetencyHandler)

    ach := "2025-01-01"
    req := models.CreateEmployeeCompetencyRequest{
        EmployeeNumber:  "E1",
        CompetencyID:    9999, // not seeded
        AchievementDate: &ach,
    }
    body, _ := json.Marshal(req)
    w := performRequest(t, r, "POST", "/employee-competencies", body)

    require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetEmployeeCompetencyHandler_Integration(t *testing.T) {
    db := setupTestDB(t)
    seedCompetency(t, db, 5, 6)

    ach := mustDate(t, "2025-02-02")
    exp := mustDate(t, "2025-08-02")
    rec := models.EmployeeCompetency{
        EmployeeNumber:  "E101",
        CompetencyID:    5,
        AchievementDate: &ach,
        ExpiryDate:      &exp,
        Notes:           "Seed",
    }
    require.NoError(t, db.Create(&rec).Error)

    r := gin.New()
    r.GET("/employee-competencies/:employeeCompetencyID", GetEmployeeCompetencyHandler)

    w := performRequest(t, r, "GET", "/employee-competencies/"+intToStr(rec.EmployeeCompetencyID), nil)
    require.Equal(t, http.StatusOK, w.Code, w.Body.String())

    var got models.EmployeeCompetency
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
    require.Equal(t, rec.EmployeeCompetencyID, got.EmployeeCompetencyID)
    require.Equal(t, "E101", got.EmployeeNumber)
}

func TestGetEmployeeCompetencyHandler_NotFound_Integration(t *testing.T) {
    _ = setupTestDB(t)

    r := gin.New()
    r.GET("/employee-competencies/:employeeCompetencyID", GetEmployeeCompetencyHandler)

    w := performRequest(t, r, "GET", "/employee-competencies/999999", nil)
    require.Equal(t, http.StatusNotFound, w.Code)
}

func TestListEmployeeCompetenciesHandler_Integration(t *testing.T) {
    db := setupTestDB(t)
    seedCompetency(t, db, 10, 12)
    seedCompetency(t, db, 11, 0)
    seedCompetency(t, db, 12, 0)

    now := time.Now().UTC()
    today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

    // E1 current (no expiry)
    rec1 := models.EmployeeCompetency{
        EmployeeNumber: "E1", CompetencyID: 10,
        AchievementDate: ptrTime(mustDate(t, "2025-01-01")),
        ExpiryDate:      nil,
        Notes:           "current-no-expiry",
    }
    // E1 expired
    rec2 := models.EmployeeCompetency{
        EmployeeNumber: "E1", CompetencyID: 11,
        AchievementDate: ptrTime(mustDate(t, "2023-01-01")),
        ExpiryDate:      ptrTime(today.AddDate(0, 0, -5)),
        Notes:           "expired",
    }
    // E1 upcoming in 10 days
    rec3 := models.EmployeeCompetency{
        EmployeeNumber: "E1", CompetencyID: 10,
        AchievementDate: ptrTime(today),
        ExpiryDate:      ptrTime(today.AddDate(0, 0, 10)),
        Notes:           "upcoming",
    }
    // E2 another current
    rec4 := models.EmployeeCompetency{
        EmployeeNumber: "E2", CompetencyID: 12,
        AchievementDate: ptrTime(mustDate(t, "2024-01-01")),
        ExpiryDate:      nil,
        Notes:           "other-emp",
    }
    require.NoError(t, db.Create(&rec1).Error)
    require.NoError(t, db.Create(&rec2).Error)
    require.NoError(t, db.Create(&rec3).Error)
    require.NoError(t, db.Create(&rec4).Error)

    r := gin.New()
    r.GET("/employee-competencies", ListEmployeeCompetenciesHandler)

    // No filters
    w := performRequest(t, r, "GET", "/employee-competencies", nil)
    require.Equal(t, http.StatusOK, w.Code)
    var res struct {
        Data  []models.EmployeeCompetency `json:"data"`
        Total int64                       `json:"total"`
    }
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &res))
    require.Equal(t, int64(4), res.Total)

    // current=true (expiry is NULL or >= today)
    w2 := performRequest(t, r, "GET", "/employee-competencies?current=true", nil)
    require.Equal(t, http.StatusOK, w2.Code)
    var res2 struct {
        Data  []models.EmployeeCompetency `json:"data"`
        Total int64                       `json:"total"`
    }
    require.NoError(t, json.Unmarshal(w2.Body.Bytes(), &res2))
    require.Equal(t, int64(3), res2.Total) // rec1, rec3, rec4

    // expired=true
    w3 := performRequest(t, r, "GET", "/employee-competencies?expired=true", nil)
    require.Equal(t, http.StatusOK, w3.Code)
    var res3 struct {
        Data  []models.EmployeeCompetency `json:"data"`
        Total int64                       `json:"total"`
    }
    require.NoError(t, json.Unmarshal(w3.Body.Bytes(), &res3))
    require.Equal(t, int64(1), res3.Total) // rec2

    // upcomingExpiryDays=30 (only non-nil expiry between today and today+30)
    w4 := performRequest(t, r, "GET", "/employee-competencies?upcomingExpiryDays=30", nil)
    require.Equal(t, http.StatusOK, w4.Code)
    var res4 struct {
        Data  []models.EmployeeCompetency `json:"data"`
        Total int64                       `json:"total"`
    }
    require.NoError(t, json.Unmarshal(w4.Body.Bytes(), &res4))
    require.Equal(t, int64(1), res4.Total) // rec3

    // employeeNumber=E1
    w5 := performRequest(t, r, "GET", "/employee-competencies?employeeNumber=E1", nil)
    require.Equal(t, http.StatusOK, w5.Code)
    var res5 struct {
        Data  []models.EmployeeCompetency `json:"data"`
        Total int64                       `json:"total"`
    }
    require.NoError(t, json.Unmarshal(w5.Body.Bytes(), &res5))
    require.Equal(t, int64(3), res5.Total)

    // employeeNumber=E1&competencyID=10
    w6 := performRequest(t, r, "GET", "/employee-competencies?employeeNumber=E1&competencyID=10", nil)
    require.Equal(t, http.StatusOK, w6.Code)
    var res6 struct {
        Data  []models.EmployeeCompetency `json:"data"`
        Total int64                       `json:"total"`
    }
    require.NoError(t, json.Unmarshal(w6.Body.Bytes(), &res6))
    require.Equal(t, int64(2), res6.Total) // rec1, rec3
}

func TestListEmployeeCompetenciesByEmployeeHandler_Integration(t *testing.T) {
    db := setupTestDB(t)
    seedCompetency(t, db, 1, 0)

    ach1 := mustDate(t, "2025-01-01")
    ach2 := mustDate(t, "2025-06-01")
    a := models.EmployeeCompetency{
        EmployeeNumber: "E777", CompetencyID: 1, AchievementDate: &ach1, Notes: "older",
    }
    b := models.EmployeeCompetency{
        EmployeeNumber: "E777", CompetencyID: 1, AchievementDate: &ach2, Notes: "newer",
    }
    require.NoError(t, db.Create(&a).Error)
    require.NoError(t, db.Create(&b).Error)

    r := gin.New()
    r.GET("/employees/:employeeNumber/competencies", ListEmployeeCompetenciesByEmployeeHandler)

    w := performRequest(t, r, "GET", "/employees/E777/competencies", nil)
    require.Equal(t, http.StatusOK, w.Code)

    var rows []models.EmployeeCompetency
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &rows))
    require.GreaterOrEqual(t, len(rows), 2)
    require.Equal(t, "newer", rows[0].Notes)
}

func TestUpdateEmployeeCompetencyHandler_Integration(t *testing.T) {
    db := setupTestDB(t)
    seedCompetency(t, db, 2, 0)

    ach0 := mustDate(t, "2025-03-01")
    exp0 := mustDate(t, "2025-12-31")
    seed := models.EmployeeCompetency{
        EmployeeNumber: "E9", CompetencyID: 2,
        AchievementDate: &ach0, ExpiryDate: &exp0,
        Notes: "Before",
    }
    require.NoError(t, db.Create(&seed).Error)

    r := gin.New()
    r.PUT("/employee-competencies/:employeeCompetencyID", UpdateEmployeeCompetencyHandler)

    achNew := "2025-04-01"
    empty := ""
    req := models.UpdateEmployeeCompetencyRequest{
        AchievementDate: &achNew,
        ExpiryDate:      &empty, // clear
        Notes:           strPtr("After"),
    }
    body, _ := json.Marshal(req)
    w := performRequest(t, r, "PUT", "/employee-competencies/"+intToStr(seed.EmployeeCompetencyID), body)
    require.Equal(t, http.StatusOK, w.Code, w.Body.String())

    var updated models.EmployeeCompetency
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
    require.Equal(t, seed.EmployeeCompetencyID, updated.EmployeeCompetencyID)
    require.NotNil(t, updated.AchievementDate)
    require.Equal(t, mustDate(t, "2025-04-01"), updated.AchievementDate.UTC())
    require.Nil(t, updated.ExpiryDate)
    require.Equal(t, "After", updated.Notes)

    // Verify persisted
    var inDB models.EmployeeCompetency
    require.NoError(t, db.First(&inDB, seed.EmployeeCompetencyID).Error)
    require.Nil(t, inDB.ExpiryDate)
    require.Equal(t, "After", inDB.Notes)
}

func TestUpdateEmployeeCompetencyHandler_InvalidID_Integration(t *testing.T) {
    _ = setupTestDB(t)

    r := gin.New()
    r.PUT("/employee-competencies/:employeeCompetencyID", UpdateEmployeeCompetencyHandler)

    w := performRequest(t, r, "PUT", "/employee-competencies/not-a-number", []byte(`{}`))
    require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateEmployeeCompetencyHandler_NotFound_Integration(t *testing.T) {
    _ = setupTestDB(t)

    r := gin.New()
    r.PUT("/employee-competencies/:employeeCompetencyID", UpdateEmployeeCompetencyHandler)

    w := performRequest(t, r, "PUT", "/employee-competencies/999999", []byte(`{}`))
    require.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteEmployeeCompetencyHandler_Integration(t *testing.T) {
    db := setupTestDB(t)
    seedCompetency(t, db, 3, 0)

    rec := models.EmployeeCompetency{
        EmployeeNumber: "E55", CompetencyID: 3,
    }
    require.NoError(t, db.Create(&rec).Error)

    r := gin.New()
    r.DELETE("/employee-competencies/:employeeCompetencyID", DeleteEmployeeCompetencyHandler)

    // First delete succeeds
    w := performRequest(t, r, "DELETE", "/employee-competencies/"+intToStr(rec.EmployeeCompetencyID), nil)
    require.Equal(t, http.StatusOK, w.Code)

    // Second delete is 404
    w2 := performRequest(t, r, "DELETE", "/employee-competencies/"+intToStr(rec.EmployeeCompetencyID), nil)
    require.Equal(t, http.StatusNotFound, w2.Code)
}

/* ---------- helpers ---------- */

func ptrTime(ti time.Time) *time.Time { return &ti }
func strPtr(s string) *string         { return &s }
func intToStr(i int) string           { return jsonNumber(i) }

// jsonNumber formats an int to string without importing strconv twice here.
func jsonNumber(i int) string {
    b, _ := json.Marshal(i)
    return string(b)
}