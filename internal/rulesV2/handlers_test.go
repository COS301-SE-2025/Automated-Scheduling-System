package rulesv2

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestRouter() (*gin.Engine, *RuleBackEndService) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Create test database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to create test database: " + err.Error())
	}

	// Create the required tables
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS db_rules (
			id TEXT PRIMARY KEY,
			enabled BOOLEAN NOT NULL DEFAULT true,
			type TEXT NOT NULL,
			body TEXT NOT NULL
		)
	`).Error
	if err != nil {
		panic("Failed to create db_rules table: " + err.Error())
	}

	service := NewRuleBackEndService(db)

	RegisterRulesRoutes(router, service)

	return router, service
}

func TestMetadataHandlers(t *testing.T) {
	router, _ := setupTestRouter()

	tests := []struct {
		name     string
		endpoint string
		contains string
	}{
		{
			name:     "GetRulesMetadata",
			endpoint: "/api/rules/metadata",
			contains: "triggers",
		},
		{
			name:     "GetTriggersMetadata",
			endpoint: "/api/rules/metadata/triggers",
			contains: "job_matrix_update",
		},
		{
			name:     "GetActionsMetadata",
			endpoint: "/api/rules/metadata/actions",
			contains: "notification",
		},
		{
			name:     "GetFactsMetadata",
			endpoint: "/api/rules/metadata/facts",
			contains: "employee.Employeestatus",
		},
		{
			name:     "GetOperatorsMetadata",
			endpoint: "/api/rules/metadata/operators",
			contains: "equals",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", tt.endpoint, nil)
			resp := httptest.NewRecorder()

			router.ServeHTTP(resp, req)

			assert.Equal(t, http.StatusOK, resp.Code)
			assert.Contains(t, resp.Body.String(), tt.contains)
		})
	}
}

func TestValidateRuleHandler(t *testing.T) {
	router, _ := setupTestRouter()

	t.Run("ValidRule", func(t *testing.T) {
		rule := Rulev2{
			Name: "Test Rule",
			Trigger: TriggerSpec{
				Type: "job_matrix_update",
			},
			Conditions: []Condition{
				{
					Fact:     "employee.Employeestatus",
					Operator: "equals",
					Value:    "Active",
				},
			},
			Actions: []ActionSpec{
				{
					Type: "notification",
					Parameters: map[string]any{
						"recipient": "test@example.com",
						"subject":   "Test",
						"message":   "Test message",
					},
				},
			},
		}

		jsonData, _ := json.Marshal(rule)
		req, _ := http.NewRequest("POST", "/api/rules/validate", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusOK, resp.Code)
		assert.Contains(t, resp.Body.String(), "\"valid\":true")
	})

	t.Run("InvalidRule", func(t *testing.T) {
		rule := Rulev2{
			Name: "Invalid Rule",
			Trigger: TriggerSpec{
				Type: "invalid_trigger",
			},
			Actions: []ActionSpec{
				{
					Type: "invalid_action",
				},
			},
		}

		jsonData, _ := json.Marshal(rule)
		req, _ := http.NewRequest("POST", "/api/rules/validate", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusBadRequest, resp.Code)
		assert.Contains(t, resp.Body.String(), "\"valid\":false")
	})

	t.Run("InvalidJSON", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/rules/validate", bytes.NewBufferString("invalid json"))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusBadRequest, resp.Code)
	})
}

func TestTriggerHandlers(t *testing.T) {
	router, _ := setupTestRouter()

	t.Run("TriggerJobMatrixUpdate", func(t *testing.T) {
		payload := map[string]any{
			"employeeNumber": "EMP001",
			"competencyID":   123,
			"action":         "created",
		}

		jsonData, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/rules/trigger/job-matrix", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusOK, resp.Code)
	})

	t.Run("TriggerJobMatrixUpdate_InvalidPayload", func(t *testing.T) {
		payload := map[string]any{
			"employeeNumber": "", // Missing required field
		}

		jsonData, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/rules/trigger/job-matrix", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusBadRequest, resp.Code)
	})

	t.Run("TriggerNewHire", func(t *testing.T) {
		payload := map[string]any{
			"employeeNumber": "EMP001",
		}

		jsonData, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/rules/trigger/new-hire", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusOK, resp.Code)
	})

	t.Run("TriggerScheduledCheck", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/rules/trigger/scheduled-check", nil)
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusOK, resp.Code)
	})
}

func TestRuleCRUDHandlers(t *testing.T) {
	router, _ := setupTestRouter()

	t.Run("GetRulesStatus", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/rules/status", nil)
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusOK, resp.Code)
		assert.Contains(t, resp.Body.String(), "total_rules")
	})

	t.Run("ListRules", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/rules/rules", nil)
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusOK, resp.Code)
	})

	t.Run("CreateRule", func(t *testing.T) {
		rule := Rulev2{
			Name: "Test Rule",
			Trigger: TriggerSpec{
				Type: "job_matrix_update",
			},
			Actions: []ActionSpec{
				{
					Type: "notification",
					Parameters: map[string]any{
						"recipient": "test@example.com",
						"subject":   "Test",
						"message":   "Test message",
					},
				},
			},
		}

		jsonData, _ := json.Marshal(rule)
		req, _ := http.NewRequest("POST", "/api/rules/rules", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusCreated, resp.Code)
	})

	t.Run("CreateRule_InvalidJSON", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/rules/rules", bytes.NewBufferString("invalid json"))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		assert.Equal(t, http.StatusBadRequest, resp.Code)
	})

	t.Run("GetRule", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/rules/rules/test_rule", nil)
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		// Rule may not exist, but handler should not crash
		assert.True(t, resp.Code == http.StatusOK || resp.Code == http.StatusNotFound)
	})

	t.Run("UpdateRule", func(t *testing.T) {
		rule := Rulev2{
			Name: "Updated Rule",
			Trigger: TriggerSpec{
				Type: "job_matrix_update",
			},
			Actions: []ActionSpec{
				{
					Type: "notification",
					Parameters: map[string]any{
						"recipient": "updated@example.com",
						"subject":   "Updated",
						"message":   "Updated message",
					},
				},
			},
		}

		jsonData, _ := json.Marshal(rule)
		req, _ := http.NewRequest("PUT", "/api/rules/rules/test_rule", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		// Rule may not exist, but handler should not crash
		assert.True(t, resp.Code == http.StatusOK || resp.Code == http.StatusNotFound)
	})

	t.Run("DeleteRule", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/rules/rules/test_rule", nil)
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		// Rule may not exist, but handler should not crash
		assert.True(t, resp.Code == http.StatusOK || resp.Code == http.StatusNotFound)
	})

	t.Run("EnableRule", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/rules/rules/test_rule/enable", nil)
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		// Rule may not exist, but handler should not crash
		assert.True(t, resp.Code == http.StatusOK || resp.Code == http.StatusNotFound)
	})

	t.Run("DisableRule", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/rules/rules/test_rule/disable", nil)
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		// Rule may not exist, but handler should not crash
		assert.True(t, resp.Code == http.StatusOK || resp.Code == http.StatusNotFound)
	})
}
