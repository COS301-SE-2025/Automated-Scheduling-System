//go:build !unit

package competency

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

// setupTestDB initializes an in-memory SQLite database and migrates schema used by competency handlers.
func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.CompetencyDefinition{}, &models.CompetencyPrerequisite{}))

	// wire for handlers
	DB = db
	RulesSvc = nil // avoid side effects
	return db
}

// setupRouter registers endpoints without external middleware to focus on handler behavior.
func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	api := r.Group("/api")
	{
		api.POST("/competencies", CreateCompetencyDefinitionHandler)
		api.GET("/competencies", GetCompetencyDefinitionsHandler)
		api.GET("/competencies/:competencyID", GetCompetencyDefinitionByIDHandler)
		api.PUT("/competencies/:competencyID", UpdateCompetencyDefinitionHandler)
		api.DELETE("/competencies/:competencyID", DeleteCompetencyDefinitionHandler)
		api.POST("/competencies/:competencyID/prerequisites", AddPrerequisiteHandler)
		api.DELETE("/competencies/:competencyID/prerequisites/:prerequisiteID", RemovePrerequisiteHandler)
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

func TestCreateAndListCompetencies(t *testing.T) {
	db := setupTestDB(t)
	_ = db
	r := setupRouter()

	// Empty list
	w := performRequest(r, http.MethodGet, "/api/competencies", nil)
	require.Equal(t, http.StatusOK, w.Code)
	var list []models.CompetencyDefinition
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &list))
	require.Len(t, list, 0)

	// Create
	req := models.CreateCompetencyRequest{
		CompetencyName:     "First Aid",
		Description:        "Basic life support",
		CompetencyTypeName: "Safety",
		Source:             "Custom",
	}
	body, _ := json.Marshal(req)
	w = performRequest(r, http.MethodPost, "/api/competencies", body)
	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

	var created models.CompetencyDefinition
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	require.NotZero(t, created.CompetencyID)
	require.Equal(t, req.CompetencyName, created.CompetencyName)
	require.True(t, created.IsActive)

	// List now has 1
	w = performRequest(r, http.MethodGet, "/api/competencies", nil)
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &list))
	require.Len(t, list, 1)
}

func TestGetCompetencyByID(t *testing.T) {
	db := setupTestDB(t)
	// seed one
	seed := models.CompetencyDefinition{CompetencyName: "CPR", Description: "Cardio", CompetencyTypeName: "Safety", Source: "Custom", IsActive: true}
	require.NoError(t, db.Create(&seed).Error)
	r := setupRouter()

	t.Run("Success", func(t *testing.T) {
		path := "/api/competencies/" + itoa(seed.CompetencyID)
		w := performRequest(r, http.MethodGet, path, nil)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var got models.CompetencyDefinition
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
		require.Equal(t, seed.CompetencyID, got.CompetencyID)
	})

	t.Run("Invalid ID", func(t *testing.T) {
		w := performRequest(r, http.MethodGet, "/api/competencies/not-an-int", nil)
		require.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Not found", func(t *testing.T) {
		w := performRequest(r, http.MethodGet, "/api/competencies/9999", nil)
		require.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestUpdateCompetency(t *testing.T) {
	db := setupTestDB(t)
	// seed
	seed := models.CompetencyDefinition{CompetencyName: "Hazcom", Description: "Old desc", CompetencyTypeName: "Safety", Source: "Custom", IsActive: true}
	require.NoError(t, db.Create(&seed).Error)
	r := setupRouter()

	t.Run("Success", func(t *testing.T) {
		months := 24
		active := false
		req := models.UpdateCompetencyRequest{
			CompetencyName:     "Hazard Communication",
			Description:        "Updated desc",
			CompetencyTypeName: "Safety",
			ExpiryPeriodMonths: &months,
			IsActive:           &active,
		}
		body, _ := json.Marshal(req)
		path := "/api/competencies/" + itoa(seed.CompetencyID)
		w := performRequest(r, http.MethodPut, path, body)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var updated models.CompetencyDefinition
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
		require.Equal(t, req.CompetencyName, updated.CompetencyName)
		require.Equal(t, req.Description, updated.Description)
		require.Equal(t, req.CompetencyTypeName, updated.CompetencyTypeName)
		require.Equal(t, *req.ExpiryPeriodMonths, *updated.ExpiryPeriodMonths)
		require.Equal(t, *req.IsActive, updated.IsActive)
	})

	t.Run("Invalid body", func(t *testing.T) {
		path := "/api/competencies/" + itoa(seed.CompetencyID)
		w := performRequest(r, http.MethodPut, path, []byte(`{"competencyName":}`))
		require.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Not found", func(t *testing.T) {
		req := models.UpdateCompetencyRequest{CompetencyName: "X"}
		body, _ := json.Marshal(req)
		w := performRequest(r, http.MethodPut, "/api/competencies/99999", body)
		require.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestDeleteCompetency(t *testing.T) {
	db := setupTestDB(t)
	seed := models.CompetencyDefinition{CompetencyName: "Lockout Tagout", Description: "", CompetencyTypeName: "Safety", Source: "Custom", IsActive: true}
	require.NoError(t, db.Create(&seed).Error)
	r := setupRouter()

	path := "/api/competencies/" + itoa(seed.CompetencyID)
	w := performRequest(r, http.MethodDelete, path, nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	// verify isActive flipped in DB
	var after models.CompetencyDefinition
	require.NoError(t, db.First(&after, seed.CompetencyID).Error)
	require.False(t, after.IsActive)
}

func TestPrerequisiteHandlers(t *testing.T) {
	db := setupTestDB(t)
	// seed two competencies
	parent := models.CompetencyDefinition{CompetencyName: "Rigging", Description: "", CompetencyTypeName: "Safety", Source: "Custom", IsActive: true}
	child := models.CompetencyDefinition{CompetencyName: "Crane", Description: "", CompetencyTypeName: "Safety", Source: "Custom", IsActive: true}
	require.NoError(t, db.Create(&parent).Error)
	require.NoError(t, db.Create(&child).Error)
	r := setupRouter()

	t.Run("Add prerequisite", func(t *testing.T) {
		req := models.AddPrerequisiteRequest{PrerequisiteCompetencyID: child.CompetencyID}
		body, _ := json.Marshal(req)
		path := "/api/competencies/" + itoa(parent.CompetencyID) + "/prerequisites"
		w := performRequest(r, http.MethodPost, path, body)
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
		var pr models.CompetencyPrerequisite
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &pr))
		require.Equal(t, parent.CompetencyID, pr.CompetencyID)
		require.Equal(t, child.CompetencyID, pr.PrerequisiteCompetencyID)
	})

	t.Run("Reject self prerequisite", func(t *testing.T) {
		req := models.AddPrerequisiteRequest{PrerequisiteCompetencyID: parent.CompetencyID}
		body, _ := json.Marshal(req)
		path := "/api/competencies/" + itoa(parent.CompetencyID) + "/prerequisites"
		w := performRequest(r, http.MethodPost, path, body)
		require.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Remove prerequisite", func(t *testing.T) {
		path := "/api/competencies/" + itoa(parent.CompetencyID) + "/prerequisites/" + itoa(child.CompetencyID)
		w := performRequest(r, http.MethodDelete, path, nil)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	})

	t.Run("Remove prerequisite - not found", func(t *testing.T) {
		path := "/api/competencies/" + itoa(parent.CompetencyID) + "/prerequisites/9999"
		w := performRequest(r, http.MethodDelete, path, nil)
		require.Equal(t, http.StatusNotFound, w.Code)
	})
}

// helper to format int -> string without strconv import everywhere
func itoa(i int) string { return fmtInt(i) }

// local tiny wrapper to avoid importing strconv in many places
func fmtInt(i int) string {
	// use stdlib without extra import in this block to keep imports concise
	// this is effectively strconv.Itoa
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
