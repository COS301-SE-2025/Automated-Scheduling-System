//go:build !unit

package rulesv2

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"Automated-Scheduling-Project/internal/database/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// test helpers

func setupITRouter(t *testing.T) (*gin.Engine, *RuleBackEndService) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)

	// Automigrate the rules table
	err = db.AutoMigrate(&models.Rule{})
	require.NoError(t, err)

	svc := NewRuleBackEndService(db)
	r := gin.New()
	RegisterRulesRoutes(r, svc)
	return r, svc
}

func doJSONIT(t *testing.T, router *gin.Engine, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf *bytes.Buffer
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		buf = bytes.NewBuffer(b)
	} else {
		buf = bytes.NewBuffer(nil)
	}
	req, err := http.NewRequest(method, path, buf)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

// tests

func TestRules_Metadata_Integration(t *testing.T) {
	router, _ := setupITRouter(t)

	endpoints := []string{
		"/api/rules/metadata",
		"/api/rules/metadata/triggers",
		"/api/rules/metadata/actions",
		"/api/rules/metadata/facts",
		"/api/rules/metadata/operators",
	}
	for _, ep := range endpoints {
		rec := doJSONIT(t, router, http.MethodGet, ep, nil)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	}
}

func TestRules_Validate_Integration(t *testing.T) {
	router, _ := setupITRouter(t)

	valid := Rulev2{
		Name:       "Notify On Scheduled",
		Trigger:    TriggerSpec{Type: "scheduled_event"},
		Conditions: []Condition{{Fact: "scheduledEvent.StatusName", Operator: "equals", Value: "Scheduled"}},
		Actions: []ActionSpec{{Type: "notification", Parameters: map[string]any{
			"recipients": "test@example.com",
			"subject":    "Hello",
			"message":    "World",
			"type":       "email",
		}}},
	}
	rec := doJSONIT(t, router, http.MethodPost, "/api/rules/validate", valid)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), "\"valid\":true")

	invalid := Rulev2{Name: "Bad", Trigger: TriggerSpec{Type: "nope"}, Actions: []ActionSpec{{Type: "missing_action"}}}
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/validate", invalid)
	require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), "\"valid\":false")
}

func TestRules_CRUD_Status_Integration(t *testing.T) {
	router, _ := setupITRouter(t)

	// Create
	create := Rulev2{
		Name:    "My Rule",
		Trigger: TriggerSpec{Type: "event_definition"},
		Actions: []ActionSpec{{Type: "notification", Parameters: map[string]any{
			"recipients": "ops@example.com",
			"subject":    "Subj",
			"message":    "Msg",
		}}},
	}
	rec := doJSONIT(t, router, http.MethodPost, "/api/rules/rules", create)
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
	var resp map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	id, _ := resp["id"].(string)
	require.NotEmpty(t, id)

	// List
	rec = doJSONIT(t, router, http.MethodGet, "/api/rules/rules", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), "\"rules\"")

	// Get
	rec = doJSONIT(t, router, http.MethodGet, "/api/rules/rules/"+id, nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), "\"rule\"")

	// Update
	update := Rulev2{
		Name:    "My Rule Updated",
		Trigger: TriggerSpec{Type: "scheduled_event", Parameters: map[string]any{"operation": "update"}},
		Actions: []ActionSpec{{Type: "notification", Parameters: map[string]any{
			"recipients": "ops@example.com",
			"subject":    "Updated",
			"message":    "Updated body",
		}}},
	}
	rec = doJSONIT(t, router, http.MethodPut, "/api/rules/rules/"+id, update)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Disable -> Enable
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/rules/"+id+"/disable", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/rules/"+id+"/enable", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Status
	rec = doJSONIT(t, router, http.MethodGet, "/api/rules/status", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), "total_rules")

	// Delete and verify 404 after
	rec = doJSONIT(t, router, http.MethodDelete, "/api/rules/rules/"+id, nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	rec = doJSONIT(t, router, http.MethodGet, "/api/rules/rules/"+id, nil)
	require.Equal(t, http.StatusNotFound, rec.Code, rec.Body.String())
}

func TestRules_Triggers_Integration(t *testing.T) {
	router, _ := setupITRouter(t)

	// Scheduled Event
	rec := doJSONIT(t, router, http.MethodPost, "/api/rules/trigger/scheduled-event", map[string]any{
		"operation":      "create",
		"scheduledEvent": map[string]any{"Title": "Safety"},
	})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Event Definition
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/trigger/event-definition", map[string]any{
		"operation":       "update",
		"eventDefinition": map[string]any{"EventName": "Confined Space"},
	})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Roles
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/trigger/roles", map[string]any{
		"operation":   "update",
		"update_kind": "permissions",
		"role":        map[string]any{"Name": "Supervisor"},
	})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Link Job -> Competency
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/trigger/link-job-to-competency", map[string]any{
		"operation":   "add",
		"link":        map[string]any{"State": "active"},
		"jobPosition": map[string]any{"PositionMatrixCode": "POS001"},
		"competency":  map[string]any{"CompetencyName": "Basic"},
	})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Competency Prerequisite
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/trigger/competency-prerequisite", map[string]any{
		"operation":    "add",
		"prerequisite": map[string]any{"ParentCompetencyID": 1, "RequiredCompetencyID": 2},
		"competency":   map[string]any{"ID": 1},
	})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Competency Type
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/trigger/competency-type", map[string]any{
		"operation":      "create",
		"competencyType": map[string]any{"TypeName": "Certification"},
	})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Job Position
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/trigger/job-position", map[string]any{
		"operation":   "update",
		"jobPosition": map[string]any{"PositionMatrixCode": "MAT001"},
	})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Missing operation -> 400
	rec = doJSONIT(t, router, http.MethodPost, "/api/rules/trigger/scheduled-event", map[string]any{
		"scheduledEvent": map[string]any{"Title": "X"},
	})
	require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
}
