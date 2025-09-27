//go:build !unit

package employment_history

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

    require.NoError(t, db.AutoMigrate(&models.EmploymentHistory{}), "AutoMigrate failed")

    // Wire handler DB
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
    return d
}

/* ---------- Tests ---------- */

func TestCreateEmploymentHistoryHandler_Integration(t *testing.T) {
    db := setupTestDB(t)
    _ = db

    r := gin.New()
    r.POST("/employment-history", CreateEmploymentHistoryHandler)

    req := models.CreateEmploymentHistoryRequest{
        EmployeeNumber:     "E100",
        PositionMatrixCode: "POS-1",
        StartDate:          "2025-01-01",
        Notes:              "Initial hire",
    }

    body, _ := json.Marshal(req)
    w := performRequest(t, r, "POST", "/employment-history", body)

    require.Equal(t, http.StatusCreated, w.Code, "Response: %s", w.Body.String())

    var created models.EmploymentHistory
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
    require.NotZero(t, created.EmploymentID)
    require.Equal(t, "E100", created.EmployeeNumber)
    require.Equal(t, "POS-1", created.PositionMatrixCode)
    require.Equal(t, mustDate(t, "2025-01-01"), created.StartDate)
    require.Nil(t, created.EndDate)
    require.Equal(t, "Primary", created.EmploymentType)
    require.Equal(t, "Initial hire", created.Notes)

    // Confirm persisted
    var inDB models.EmploymentHistory
    require.NoError(t, DB.First(&inDB, created.EmploymentID).Error)
    require.Equal(t, created.EmployeeNumber, inDB.EmployeeNumber)
}

func TestCreateEmploymentHistoryHandler_BadDate_Integration(t *testing.T) {
    _ = setupTestDB(t)

    r := gin.New()
    r.POST("/employment-history", CreateEmploymentHistoryHandler)

    req := models.CreateEmploymentHistoryRequest{
        EmployeeNumber:     "E1",
        PositionMatrixCode: "P1",
        StartDate:          "BADDATE",
    }
    body, _ := json.Marshal(req)
    w := performRequest(t, r, "POST", "/employment-history", body)

    require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetEmploymentHistoryHandler_Integration(t *testing.T) {
    db := setupTestDB(t)

    seed := models.EmploymentHistory{
        EmployeeNumber:     "E101",
        PositionMatrixCode: "POS-A",
        StartDate:          mustDate(t, "2025-02-01"),
        EmploymentType:     "Primary",
        Notes:              "Seed row",
    }
    require.NoError(t, db.Create(&seed).Error)

    r := gin.New()
    r.GET("/employment-history/:employmentID", GetEmploymentHistoryHandler)

    path := "/employment-history/" + intToStr(seed.EmploymentID)
    w := performRequest(t, r, "GET", path, nil)

    require.Equal(t, http.StatusOK, w.Code, w.Body.String())

    var got models.EmploymentHistory
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
    require.Equal(t, seed.EmploymentID, got.EmploymentID)
    require.Equal(t, "E101", got.EmployeeNumber)
}

func TestGetEmploymentHistoryHandler_NotFound_Integration(t *testing.T) {
    _ = setupTestDB(t)
    r := gin.New()
    r.GET("/employment-history/:employmentID", GetEmploymentHistoryHandler)

    w := performRequest(t, r, "GET", "/employment-history/999999", nil)
    require.Equal(t, http.StatusNotFound, w.Code)
}

func TestListEmploymentHistoryHandler_BasicAndFilters_Integration(t *testing.T) {
    db := setupTestDB(t)

    // Today is 2025-09-27 (per prompt); insert three rows to exercise filters
    rec1 := models.EmploymentHistory{
        EmployeeNumber:     "E1",
        PositionMatrixCode: "P1",
        StartDate:          mustDate(t, "2024-01-01"),
        EmploymentType:     "Primary",
    }
    rec2 := models.EmploymentHistory{
        EmployeeNumber:     "E1",
        PositionMatrixCode: "P2",
        StartDate:          mustDate(t, "2025-01-01"),
        EmploymentType:     "Secondary",
    }
    rec3 := models.EmploymentHistory{
        EmployeeNumber:     "E2",
        PositionMatrixCode: "P3",
        StartDate:          mustDate(t, "2023-01-01"),
        EndDate:            ptrTime(mustDate(t, "2023-12-31")),
        EmploymentType:     "Primary",
    }
    require.NoError(t, db.Create(&rec1).Error)
    require.NoError(t, db.Create(&rec2).Error)
    require.NoError(t, db.Create(&rec3).Error)

    r := gin.New()
    r.GET("/employment-history", ListEmploymentHistoryHandler)

    // No filters (default paging)
    w := performRequest(t, r, "GET", "/employment-history", nil)
    require.Equal(t, http.StatusOK, w.Code)

    var res struct {
        Data       []models.EmploymentHistory `json:"data"`
        Total      int64                      `json:"total"`
        Page       int                        `json:"page"`
        PageSize   int                        `json:"pageSize"`
        TotalPages int64                      `json:"totalPages"`
    }
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &res))
    require.Equal(t, int64(3), res.Total)
    require.True(t, len(res.Data) <= res.PageSize)

    // current=true (should include rec1 and rec2 on 2025-09-27)
    w2 := performRequest(t, r, "GET", "/employment-history?current=true", nil)
    require.Equal(t, http.StatusOK, w2.Code)

    var res2 struct {
        Data  []models.EmploymentHistory `json:"data"`
        Total int64                      `json:"total"`
    }
    require.NoError(t, json.Unmarshal(w2.Body.Bytes(), &res2))
    require.Equal(t, int64(2), res2.Total)

    // activeOn=2024-06-01 (rec1 active; rec3 ended 2023-12-31 so not active)
    w3 := performRequest(t, r, "GET", "/employment-history?activeOn=2024-06-01", nil)
    require.Equal(t, http.StatusOK, w3.Code)

    var res3 struct {
        Data  []models.EmploymentHistory `json:"data"`
        Total int64                      `json:"total"`
    }
    require.NoError(t, json.Unmarshal(w3.Body.Bytes(), &res3))
    require.Equal(t, int64(1), res3.Total)

    // employeeNumber + positionCode filters
    w4 := performRequest(t, r, "GET", "/employment-history?employeeNumber=E1&positionCode=P2", nil)
    require.Equal(t, http.StatusOK, w4.Code)

    var res4 struct {
        Data  []models.EmploymentHistory `json:"data"`
        Total int64                      `json:"total"`
    }
    require.NoError(t, json.Unmarshal(w4.Body.Bytes(), &res4))
    require.Equal(t, int64(1), res4.Total)
    require.Equal(t, "P2", res4.Data[0].PositionMatrixCode)
}

func TestUpdateEmploymentHistoryHandler_Integration(t *testing.T) {
    db := setupTestDB(t)

    seed := models.EmploymentHistory{
        EmployeeNumber:     "E9",
        PositionMatrixCode: "PX",
        StartDate:          mustDate(t, "2025-03-01"),
        EmploymentType:     "Primary",
        Notes:              "Before",
    }
    require.NoError(t, db.Create(&seed).Error)

    r := gin.New()
    r.PUT("/employment-history/:employmentID", UpdateEmploymentHistoryHandler)

    req := models.UpdateEmploymentHistoryRequest{
        EndDate:        strPtr("2025-12-31"),
        EmploymentType: strPtr("Secondary"),
        Notes:          strPtr("After"),
    }
    body, _ := json.Marshal(req)
    w := performRequest(t, r, "PUT", "/employment-history/"+intToStr(seed.EmploymentID), body)

    require.Equal(t, http.StatusOK, w.Code, w.Body.String())

    var updated models.EmploymentHistory
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
    require.Equal(t, seed.EmploymentID, updated.EmploymentID)
    require.Equal(t, "Secondary", updated.EmploymentType)
    require.NotNil(t, updated.EndDate)
    require.Equal(t, mustDate(t, "2025-12-31"), updated.EndDate.UTC())
    require.Equal(t, "After", updated.Notes)

    // Verify persisted
    var inDB models.EmploymentHistory
    require.NoError(t, db.First(&inDB, seed.EmploymentID).Error)
    require.Equal(t, "Secondary", inDB.EmploymentType)
    require.NotNil(t, inDB.EndDate)
    require.Equal(t, mustDate(t, "2025-12-31"), inDB.EndDate.UTC())
}

func TestUpdateEmploymentHistoryHandler_InvalidID_Integration(t *testing.T) {
    _ = setupTestDB(t)

    r := gin.New()
    r.PUT("/employment-history/:employmentID", UpdateEmploymentHistoryHandler)

    w := performRequest(t, r, "PUT", "/employment-history/not-a-number", []byte(`{}`))
    require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeleteEmploymentHistoryHandler_Integration(t *testing.T) {
    db := setupTestDB(t)

    seed := models.EmploymentHistory{
        EmployeeNumber:     "E55",
        PositionMatrixCode: "PD",
        StartDate:          mustDate(t, "2024-05-01"),
    }
    require.NoError(t, db.Create(&seed).Error)

    r := gin.New()
    r.DELETE("/employment-history/:employmentID", DeleteEmploymentHistoryHandler)

    // First delete succeeds
    w := performRequest(t, r, "DELETE", "/employment-history/"+intToStr(seed.EmploymentID), nil)
    require.Equal(t, http.StatusOK, w.Code)

    // Second delete is 404
    w2 := performRequest(t, r, "DELETE", "/employment-history/"+intToStr(seed.EmploymentID), nil)
    require.Equal(t, http.StatusNotFound, w2.Code)
}

/* ---------- helpers ---------- */

func ptrTime(ti time.Time) *time.Time { return &ti }
func strPtr(s string) *string         { return &s }
func intToStr(i int) string           { return jsonNumber(i) }

// jsonNumber formats an int to string without importing strconv twice here.
func jsonNumber(i int) string {
    b, _ := json.Marshal(i)
    // b is like: 123
    return string(b)
}