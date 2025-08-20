//go:build !unit

package matrix

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

// setupTestDB initializes an in-memory SQLite database and migrates required tables.
func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.JobPosition{}, &models.CompetencyDefinition{}, &models.CustomJobMatrix{}))

	DB = db
	RulesSvc = nil
	return db
}

// setupRouter registers endpoints and a tiny auth stub to set email into context.
func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// stub to set email from header or default for createdBy
	r.Use(func(c *gin.Context) {
		if email := c.GetHeader("X-Test-Email"); email != "" {
			c.Set("email", email)
		} else {
			c.Set("email", "tester@example.com")
		}
		c.Next()
	})
	api := r.Group("/api")
	{
		api.POST("/job-requirements", CreateJobMatrixEntryHandler)
		api.GET("/job-requirements", GetJobMatrixEntriesHandler)
		api.PUT("/job-requirements/:matrixID", UpdateJobMatrixEntryHandler)
		api.DELETE("/job-requirements/:matrixID", DeleteJobMatrixEntryHandler)
	}
	return r
}

func performRequest(r http.Handler, method, path string, body []byte, headers map[string]string) *httptest.ResponseRecorder {
	req, _ := http.NewRequest(method, path, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestCreateAndListJobRequirements(t *testing.T) {
	db := setupTestDB(t)
	// seed required FK rows
	pos := models.JobPosition{PositionMatrixCode: "POS100", JobTitle: "Tech", Description: "", IsActive: true}
	require.NoError(t, db.Create(&pos).Error)
	comp := models.CompetencyDefinition{CompetencyName: "CPR", Description: "", CompetencyTypeName: "Safety", Source: "Custom", IsActive: true}
	require.NoError(t, db.Create(&comp).Error)

	r := setupRouter()
	headers := map[string]string{"X-Test-Email": "creator@example.com"}

	// Empty list
	w := performRequest(r, http.MethodGet, "/api/job-requirements", nil, nil)
	require.Equal(t, http.StatusOK, w.Code)
	var list []models.CustomJobMatrix
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &list))
	require.Len(t, list, 0)

	// Create
	req := models.CreateJobMatrixRequest{
		PositionMatrixCode: pos.PositionMatrixCode,
		CompetencyID:       comp.CompetencyID,
		RequirementStatus:  "Required",
		Notes:              "Critical",
	}
	body, _ := json.Marshal(req)
	w = performRequest(r, http.MethodPost, "/api/job-requirements", body, headers)
	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	var created models.CustomJobMatrix
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	require.Equal(t, req.PositionMatrixCode, created.PositionMatrixCode)
	require.Equal(t, req.CompetencyID, created.CompetencyID)
	require.Equal(t, "creator@example.com", created.CreatedBy)

	// List now shows 1
	w = performRequest(r, http.MethodGet, "/api/job-requirements", nil, nil)
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &list))
	require.Len(t, list, 1)

	// Filter by position code
	w = performRequest(r, http.MethodGet, "/api/job-requirements?positionMatrixCode="+pos.PositionMatrixCode, nil, nil)
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &list))
	require.Len(t, list, 1)

	// Invalid body
	w = performRequest(r, http.MethodPost, "/api/job-requirements", []byte(`{"positionMatrixCode":}`), headers)
	require.Equal(t, http.StatusBadRequest, w.Code)

	// Missing FK should 404 (unknown competency)
	bad := models.CreateJobMatrixRequest{PositionMatrixCode: pos.PositionMatrixCode, CompetencyID: 99999, RequirementStatus: "Required"}
	body, _ = json.Marshal(bad)
	w = performRequest(r, http.MethodPost, "/api/job-requirements", body, headers)
	require.Equal(t, http.StatusNotFound, w.Code)
}

func TestUpdateJobRequirement(t *testing.T) {
	db := setupTestDB(t)
	// seed FK rows and one entry
	pos := models.JobPosition{PositionMatrixCode: "POS200", JobTitle: "Operator", Description: "", IsActive: true}
	require.NoError(t, db.Create(&pos).Error)
	comp := models.CompetencyDefinition{CompetencyName: "First Aid", Description: "", CompetencyTypeName: "Safety", Source: "Custom", IsActive: true}
	require.NoError(t, db.Create(&comp).Error)
	entry := models.CustomJobMatrix{PositionMatrixCode: pos.PositionMatrixCode, CompetencyID: comp.CompetencyID, RequirementStatus: "Required", Notes: "", CreatedBy: "seed@example.com"}
	require.NoError(t, db.Create(&entry).Error)

	r := setupRouter()

	// Success
	req := models.UpdateJobMatrixRequest{RequirementStatus: "Optional", Notes: "Changed"}
	body, _ := json.Marshal(req)
	w := performRequest(r, http.MethodPut, "/api/job-requirements/"+itoa(entry.CustomMatrixID), body, nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	var updated models.CustomJobMatrix
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
	require.Equal(t, req.RequirementStatus, updated.RequirementStatus)
	require.Equal(t, req.Notes, updated.Notes)
	require.Equal(t, pos.PositionMatrixCode, updated.PositionMatrixCode)
	require.Equal(t, comp.CompetencyID, updated.CompetencyID)

	// Invalid body
	w = performRequest(r, http.MethodPut, "/api/job-requirements/"+itoa(entry.CustomMatrixID), []byte(`{"requirementStatus":}`), nil)
	require.Equal(t, http.StatusBadRequest, w.Code)

	// Not found
	body, _ = json.Marshal(req)
	w = performRequest(r, http.MethodPut, "/api/job-requirements/999999", body, nil)
	require.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteJobRequirement(t *testing.T) {
	db := setupTestDB(t)
	pos := models.JobPosition{PositionMatrixCode: "POS300", JobTitle: "Engineer", Description: "", IsActive: true}
	require.NoError(t, db.Create(&pos).Error)
	comp := models.CompetencyDefinition{CompetencyName: "Rigging", Description: "", CompetencyTypeName: "Safety", Source: "Custom", IsActive: true}
	require.NoError(t, db.Create(&comp).Error)
	entry := models.CustomJobMatrix{PositionMatrixCode: pos.PositionMatrixCode, CompetencyID: comp.CompetencyID, RequirementStatus: "Required", CreatedBy: "seed@example.com"}
	require.NoError(t, db.Create(&entry).Error)

	r := setupRouter()

	// Success
	w := performRequest(r, http.MethodDelete, "/api/job-requirements/"+itoa(entry.CustomMatrixID), nil, nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	// verify removed
	var count int64
	require.NoError(t, db.Model(&models.CustomJobMatrix{}).Where("custom_matrix_id = ?", entry.CustomMatrixID).Count(&count).Error)
	require.Equal(t, int64(0), count)

	// Not found
	w = performRequest(r, http.MethodDelete, "/api/job-requirements/999999", nil, nil)
	require.Equal(t, http.StatusNotFound, w.Code)
}

// tiny helper without importing strconv everywhere
func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	var b [20]byte
	bp := len(b)
	for i > 0 {
		bp--
		b[bp] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		bp--
		b[bp] = '-'
	}
	return string(b[bp:])
}
