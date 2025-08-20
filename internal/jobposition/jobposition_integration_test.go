//go:build !unit

package jobposition

import (
	"Automated-Scheduling-Project/internal/database/models"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// setupTestDB initializes an in-memory SQLite database and migrates JobPosition.
func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.JobPosition{}))

	DB = db
	RulesSvc = nil
	return db
}

// setupRouter wires endpoints directly to handlers (no external middleware for tests).
func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	api := r.Group("/api")
	{
		api.GET("/job-positions", GetAllJobPositionsHandler)
		api.POST("/job-positions", CreateJobPositionHandler)
		api.PUT("/job-positions/:positionCode", UpdateJobPositionHandler)
		api.PUT("/job-positions/:positionCode/status", UpdateJobPositionStatusHandler)
	}
	return r
}

func performRequest(r http.Handler, method, path string, body []byte) *httptest.ResponseRecorder {
	req, _ := http.NewRequest(method, path, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestListAndCreateJobPositions(t *testing.T) {
	_ = setupTestDB(t)
	r := setupRouter()

	// Empty list
	w := performRequest(r, http.MethodGet, "/api/job-positions", nil)
	require.Equal(t, http.StatusOK, w.Code)
	var list []models.JobPosition
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &list))
	require.Len(t, list, 0)

	// Create
	req := CreateJobPositionRequest{PositionMatrixCode: "POS-001", JobTitle: "Technician", Description: "Ops"}
	body, _ := json.Marshal(req)
	w = performRequest(r, http.MethodPost, "/api/job-positions", body)
	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	var created models.JobPosition
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	require.Equal(t, req.PositionMatrixCode, created.PositionMatrixCode)
	require.Equal(t, req.JobTitle, created.JobTitle)
	require.True(t, created.IsActive)

	// Duplicate should fail
	w = performRequest(r, http.MethodPost, "/api/job-positions", body)
	require.Equal(t, http.StatusInternalServerError, w.Code)

	// Invalid body
	w = performRequest(r, http.MethodPost, "/api/job-positions", []byte(`{"jobTitle":}`))
	require.Equal(t, http.StatusBadRequest, w.Code)

	// List now has 1
	w = performRequest(r, http.MethodGet, "/api/job-positions", nil)
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &list))
	require.Len(t, list, 1)
}

func TestUpdateJobPosition(t *testing.T) {
	db := setupTestDB(t)
	// seed one position
	seed := models.JobPosition{PositionMatrixCode: "POS-002", JobTitle: "Operator", Description: "Old", IsActive: true}
	require.NoError(t, db.Create(&seed).Error)
	r := setupRouter()

	t.Run("Success", func(t *testing.T) {
		req := UpdateJobPositionRequest{JobTitle: "Senior Operator", Description: "Updated"}
		body, _ := json.Marshal(req)
		w := performRequest(r, http.MethodPut, "/api/job-positions/POS-002", body)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var updated models.JobPosition
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
		require.Equal(t, req.JobTitle, updated.JobTitle)
		require.Equal(t, req.Description, updated.Description)
	})

	t.Run("Not found", func(t *testing.T) {
		req := UpdateJobPositionRequest{JobTitle: "X", Description: "Y"}
		body, _ := json.Marshal(req)
		w := performRequest(r, http.MethodPut, "/api/job-positions/UNKNOWN", body)
		require.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("Invalid body", func(t *testing.T) {
		w := performRequest(r, http.MethodPut, "/api/job-positions/POS-002", []byte(`{"jobTitle":}`))
		require.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestUpdateJobPositionStatus(t *testing.T) {
	db := setupTestDB(t)
	seed := models.JobPosition{PositionMatrixCode: "POS-003", JobTitle: "Engineer", Description: "", IsActive: true}
	require.NoError(t, db.Create(&seed).Error)
	r := setupRouter()

	t.Run("Deactivate", func(t *testing.T) {
		body, _ := json.Marshal(UpdateStatusRequest{IsActive: boolPtr(false)})
		w := performRequest(r, http.MethodPut, "/api/job-positions/POS-003/status", body)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var updated models.JobPosition
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
		require.False(t, updated.IsActive)
	})

	t.Run("Reactivate", func(t *testing.T) {
		body, _ := json.Marshal(UpdateStatusRequest{IsActive: boolPtr(true)})
		w := performRequest(r, http.MethodPut, "/api/job-positions/POS-003/status", body)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var updated models.JobPosition
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
		require.True(t, updated.IsActive)
	})

	t.Run("Not found", func(t *testing.T) {
		body, _ := json.Marshal(UpdateStatusRequest{IsActive: boolPtr(false)})
		w := performRequest(r, http.MethodPut, "/api/job-positions/UNKNOWN/status", body)
		require.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("Invalid body", func(t *testing.T) {
		w := performRequest(r, http.MethodPut, "/api/job-positions/POS-003/status", []byte(`{}`))
		require.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func boolPtr(b bool) *bool { return &b }
