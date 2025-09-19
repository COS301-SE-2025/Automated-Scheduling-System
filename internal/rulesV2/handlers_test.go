//go:build unit

package rulesv2

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Test-only minimal rules table model for sqlite :memory:
type testRuleRow struct {
	ID          uint      `gorm:"primaryKey;autoIncrement"`
	Name        string
	TriggerType string
	Spec        string
	Enabled     bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (testRuleRow) TableName() string { return "rules" }

// setup helpers

func setupRouter(t *testing.T) (*gin.Engine, *RuleBackEndService) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Ensure the rules table exists for store queries used by handlers.
	require.NoError(t, db.AutoMigrate(&testRuleRow{}))

	svc := NewRuleBackEndService(db)
	router := gin.New()
	RegisterRulesRoutes(router, svc)

	return router, svc
}

func doJSON(t *testing.T, router *gin.Engine, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf *bytes.Buffer
	if body != nil {
		data, err := json.Marshal(body)
		require.NoError(t, err)
		buf = bytes.NewBuffer(data)
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

func TestMetadataHandlers_Unit(t *testing.T) {
	router, _ := setupRouter(t)

	type tc struct {
		name     string
		endpoint string
	}
	for _, c := range []tc{
		{name: "All", endpoint: "/api/rules/metadata"},
		{name: "Triggers", endpoint: "/api/rules/metadata/triggers"},
		{name: "Actions", endpoint: "/api/rules/metadata/actions"},
		{name: "Facts", endpoint: "/api/rules/metadata/facts"},
		{name: "Operators", endpoint: "/api/rules/metadata/operators"},
	} {
		t.Run(c.name, func(t *testing.T) {
			rec := doJSON(t, router, http.MethodGet, c.endpoint, nil)
			require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		})
	}
}

func TestValidateRuleHandler_Unit(t *testing.T) {
	router, _ := setupRouter(t)

	validRule := Rulev2{
		Name: "Test Rule",
		Trigger: TriggerSpec{
			Type: "scheduled_event",
		},
		Conditions: []Condition{
			{Fact: "scheduledEvent.StatusName", Operator: "equals", Value: "Scheduled"},
		},
		Actions: []ActionSpec{
			{
				Type: "notification",
				Parameters: map[string]any{
					"recipients": "test@example.com",
					"subject":    "Hello",
					"message":    "World",
					"type":       "email",
				},
			},
		},
	}
	t.Run("Valid", func(t *testing.T) {
		rec := doJSON(t, router, http.MethodPost, "/api/rules/validate", validRule)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), `"valid":true`)
	})

	invalidRule := Rulev2{
		Name: "Bad Rule",
		Trigger: TriggerSpec{
			Type: "not_a_real_trigger",
		},
		Actions: []ActionSpec{
			{Type: "no_such_action"},
		},
	}
	t.Run("Invalid", func(t *testing.T) {
		rec := doJSON(t, router, http.MethodPost, "/api/rules/validate", invalidRule)
		require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), `"valid":false`)
	})

	t.Run("BadJSON", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPost, "/api/rules/validate", bytes.NewBufferString("{"))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
	})
}

func TestTriggerHandlers_Unit(t *testing.T) {
	router, _ := setupRouter(t)

	t.Run("ScheduledEvent OK", func(t *testing.T) {
		payload := map[string]any{
			"operation": "create",
			"scheduledEvent": map[string]any{
				"Title": "Safety Training",
			},
		}
		rec := doJSON(t, router, http.MethodPost, "/api/rules/trigger/scheduled-event", payload)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	})

	t.Run("EventDefinition OK", func(t *testing.T) {
		payload := map[string]any{
			"operation": "update",
			"eventDefinition": map[string]any{
				"EventName": "Confined Space",
			},
		}
		rec := doJSON(t, router, http.MethodPost, "/api/rules/trigger/event-definition", payload)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	})

	t.Run("Roles OK", func(t *testing.T) {
		payload := map[string]any{
			"operation":   "update",
			"update_kind": "permissions",
			"role": map[string]any{
				"Name": "Supervisor",
			},
		}
		rec := doJSON(t, router, http.MethodPost, "/api/rules/trigger/roles", payload)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	})

	t.Run("LinkJobToCompetency OK", func(t *testing.T) {
		payload := map[string]any{
			"operation": "add",
			"link":      map[string]any{"State": "active"},
			"jobPosition": map[string]any{
				"PositionMatrixCode": "POS001",
			},
			"competency": map[string]any{
				"CompetencyName": "Basic Safety",
			},
		}
		rec := doJSON(t, router, http.MethodPost, "/api/rules/trigger/link-job-to-competency", payload)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	})

	t.Run("CompetencyPrerequisite OK", func(t *testing.T) {
		payload := map[string]any{
			"operation": "add",
			"prerequisite": map[string]any{
				"ParentCompetencyID":   1,
				"RequiredCompetencyID": 2,
			},
			"competency": map[string]any{"ID": 1},
		}
		rec := doJSON(t, router, http.MethodPost, "/api/rules/trigger/competency-prerequisite", payload)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	})

	t.Run("Missing Operation -> 400", func(t *testing.T) {
		payload := map[string]any{
			// no operation
			"scheduledEvent": map[string]any{"Title": "X"},
		}
		rec := doJSON(t, router, http.MethodPost, "/api/rules/trigger/scheduled-event", payload)
		require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
	})
}

func TestRuleCRUDAndStatus_Unit(t *testing.T) {
	router, _ := setupRouter(t)

	// Create
	createRule := Rulev2{
		Name: "My Rule",
		Trigger: TriggerSpec{
			Type: "event_definition",
		},
		Actions: []ActionSpec{
			{
				Type: "notification",
				Parameters: map[string]any{
					"recipients": "ops@example.com",
					"subject":    "Subj",
					"message":    "Msg",
				},
			},
		},
	}
	rec := doJSON(t, router, http.MethodPost, "/api/rules/rules", createRule)
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

	var createResp map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &createResp))
	// ID may be numeric (float64 from JSON) or string; normalize to string
	rawID, ok := createResp["id"]
	require.True(t, ok, "response should have id")
	var id string
	switch v := rawID.(type) {
	case float64:
		id = strconv.FormatInt(int64(v), 10)
	case json.Number:
		i64, _ := v.Int64()
		id = strconv.FormatInt(i64, 10)
	case string:
		id = v
	default:
		id = fmt.Sprintf("%v", v)
	}
	require.NotEmpty(t, id)

	// List
	rec = doJSON(t, router, http.MethodGet, "/api/rules/rules", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), `"rules"`)

	// Get
	rec = doJSON(t, router, http.MethodGet, "/api/rules/rules/"+id, nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), `"rule"`)

	// Update
	updateRule := Rulev2{
		Name: "My Rule Updated",
		Trigger: TriggerSpec{
			Type: "scheduled_event",
			Parameters: map[string]any{
				"operation": "update",
			},
		},
		Actions: []ActionSpec{
			{
				Type: "notification",
				Parameters: map[string]any{
					"recipients": "ops@example.com",
					"subject":    "Updated",
					"message":    "Updated Body",
				},
			},
		},
	}
	rec = doJSON(t, router, http.MethodPut, "/api/rules/rules/"+id, updateRule)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Disable
	rec = doJSON(t, router, http.MethodPost, "/api/rules/rules/"+id+"/disable", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Enable
	rec = doJSON(t, router, http.MethodPost, "/api/rules/rules/"+id+"/enable", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Status
	rec = doJSON(t, router, http.MethodGet, "/api/rules/status", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), "total_rules")

	// Delete
	rec = doJSON(t, router, http.MethodDelete, "/api/rules/rules/"+id, nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	// Get after delete -> 404
	rec = doJSON(t, router, http.MethodGet, "/api/rules/rules/"+id, nil)
	require.Equal(t, http.StatusNotFound, rec.Code, rec.Body.String())
}
