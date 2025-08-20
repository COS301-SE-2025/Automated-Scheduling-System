//go:build !unit

package competency_type

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

// setupTestDB initializes an in-memory SQLite database and migrates the schema.
func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.CompetencyType{}))

	// wire into package-level DB used by handlers
	DB = db
	RulesSvc = nil
	return db
}

// setupRouter registers routes directly to handlers without external middleware.
func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	api := r.Group("/api")
	{
		api.GET("/competency-types", GetAllCompetencyTypesHandler)
		api.POST("/competency-types", CreateCompetencyTypeHandler)
		api.PUT("/competency-types/:typeName", UpdateCompetencyTypeHandler)
		api.PUT("/competency-types/:typeName/status", UpdateTypeStatusHandler)
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

func TestGetAllCompetencyTypesHandler(t *testing.T) {
	db := setupTestDB(t)
	_ = db
	r := setupRouter()

	t.Run("Empty list initially", func(t *testing.T) {
		w := performRequest(r, http.MethodGet, "/api/competency-types", nil)
		require.Equal(t, http.StatusOK, w.Code)
		var types []models.CompetencyType
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &types))
		require.Len(t, types, 0)
	})

	t.Run("After create, list returns item", func(t *testing.T) {
		// create via handler
		req := TypeRequest{TypeName: "Safety", Description: "Safety training"}
		body, _ := json.Marshal(req)
		w := performRequest(r, http.MethodPost, "/api/competency-types", body)
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

		// list
		w = performRequest(r, http.MethodGet, "/api/competency-types", nil)
		require.Equal(t, http.StatusOK, w.Code)
		var types []models.CompetencyType
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &types))
		require.Len(t, types, 1)
		require.Equal(t, "Safety", types[0].TypeName)
		require.Equal(t, true, types[0].IsActive)
	})
}

func TestCreateCompetencyTypeHandler(t *testing.T) {
	db := setupTestDB(t)
	_ = db
	r := setupRouter()

	t.Run("Success - create new type", func(t *testing.T) {
		req := TypeRequest{TypeName: "Compliance", Description: "Compliance related"}
		body, _ := json.Marshal(req)
		w := performRequest(r, http.MethodPost, "/api/competency-types", body)
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

		var ct models.CompetencyType
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &ct))
		require.Equal(t, req.TypeName, ct.TypeName)
		require.Equal(t, req.Description, ct.Description)
		require.True(t, ct.IsActive)
	})

	t.Run("Failure - duplicate type name", func(t *testing.T) {
		req := TypeRequest{TypeName: "Compliance", Description: "Duplicate"}
		body, _ := json.Marshal(req)
		w := performRequest(r, http.MethodPost, "/api/competency-types", body)
		require.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("Failure - invalid body", func(t *testing.T) {
		w := performRequest(r, http.MethodPost, "/api/competency-types", []byte(`{"typeName":}`))
		require.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestUpdateCompetencyTypeHandler(t *testing.T) {
	db := setupTestDB(t)
	// seed one type directly
	seed := models.CompetencyType{TypeName: "FirstAid", Description: "Basic", IsActive: true}
	require.NoError(t, db.Create(&seed).Error)
	r := setupRouter()

	t.Run("Success - update description", func(t *testing.T) {
		req := TypeRequest{TypeName: "ignored", Description: "Updated description"}
		body, _ := json.Marshal(req)
		w := performRequest(r, http.MethodPut, "/api/competency-types/FirstAid", body)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var updated models.CompetencyType
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
		require.Equal(t, "FirstAid", updated.TypeName)
		require.Equal(t, "Updated description", updated.Description)
		require.True(t, updated.IsActive)
	})

	t.Run("Failure - not found", func(t *testing.T) {
		req := TypeRequest{TypeName: "X", Description: "Doesn't matter"}
		body, _ := json.Marshal(req)
		w := performRequest(r, http.MethodPut, "/api/competency-types/Unknown", body)
		require.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("Failure - invalid body", func(t *testing.T) {
		w := performRequest(r, http.MethodPut, "/api/competency-types/FirstAid", []byte(`{"typeName":}`))
		require.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestUpdateTypeStatusHandler(t *testing.T) {
	db := setupTestDB(t)
	// seed one type directly
	seed := models.CompetencyType{TypeName: "Equipment", Description: "Equip", IsActive: true}
	require.NoError(t, db.Create(&seed).Error)
	r := setupRouter()

	t.Run("Success - deactivate", func(t *testing.T) {
		body, _ := json.Marshal(UpdateStatusRequest{IsActive: boolPtr(false)})
		w := performRequest(r, http.MethodPut, "/api/competency-types/Equipment/status", body)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var updated models.CompetencyType
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
		require.Equal(t, "Equipment", updated.TypeName)
		require.False(t, updated.IsActive)
	})

	t.Run("Success - reactivate", func(t *testing.T) {
		body, _ := json.Marshal(UpdateStatusRequest{IsActive: boolPtr(true)})
		w := performRequest(r, http.MethodPut, "/api/competency-types/Equipment/status", body)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var updated models.CompetencyType
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
		require.True(t, updated.IsActive)
	})

	t.Run("Failure - not found", func(t *testing.T) {
		body, _ := json.Marshal(UpdateStatusRequest{IsActive: boolPtr(false)})
		w := performRequest(r, http.MethodPut, "/api/competency-types/Unknown/status", body)
		require.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("Failure - invalid body (missing required isActive)", func(t *testing.T) {
		w := performRequest(r, http.MethodPut, "/api/competency-types/Equipment/status", []byte(`{}`))
		require.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func boolPtr(b bool) *bool { return &b }
