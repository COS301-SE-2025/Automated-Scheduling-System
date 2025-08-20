//go:build !unit

package rulesv2

import (
	"context"
	"testing"

	models "Automated-Scheduling-Project/internal/database/models"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newSQLite(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	return db
}

func TestNewRuleBackEndService_WiresAndMigrates(t *testing.T) {
	db := newSQLite(t)
	svc := NewRuleBackEndService(db)
	require.NotNil(t, svc)
	require.NotNil(t, svc.Engine)
	require.NotNil(t, svc.Store)

	// rules table must exist after NewRuleBackEndService
	has := db.Migrator().HasTable(&models.Rule{})
	require.True(t, has, "rules table should be migrated")
}

func TestDbRuleStore_CRUD_Stats(t *testing.T) {
	db := newSQLite(t)
	svc := NewRuleBackEndService(db)
	ctx := context.Background()

	// Create rule
	rule := Rulev2{
		Name: "Initial Name",
		Trigger: TriggerSpec{
			Type: "competency",
		},
		Actions: []ActionSpec{
			{
				Type: "notification",
				Parameters: map[string]any{
					"recipient": "ops@example.com",
					"subject":   "Subj",
					"message":   "Msg",
				},
			},
		},
	}
	id, err := svc.Store.CreateRule(ctx, rule)
	require.NoError(t, err)
	require.NotEmpty(t, id)

	// Get by ID
	got, err := svc.Store.GetRuleByID(ctx, id)
	require.NoError(t, err)
	require.Equal(t, "Initial Name", got.Name)
	require.Equal(t, "competency", got.Trigger.Type)

	// List by trigger (matching)
	matching, err := svc.Store.ListByTrigger(ctx, "competency")
	require.NoError(t, err)
	require.Len(t, matching, 1)

	// List by trigger (non-matching)
	nonMatching, err := svc.Store.ListByTrigger(ctx, "scheduled_event")
	require.NoError(t, err)
	require.Len(t, nonMatching, 0)

	// List all rule rows and specs
	rows, err := svc.Store.ListAllRuleRows(ctx)
	require.NoError(t, err)
	require.Len(t, rows, 1)

	specs, err := svc.Store.ListAllRules(ctx)
	require.NoError(t, err)
	require.Len(t, specs, 1)

	// Update rule (change name and trigger type)
	updated := Rulev2{
		Name: "Updated Name",
		Trigger: TriggerSpec{
			Type: "scheduled_event",
		},
		Actions: rule.Actions,
	}
	err = svc.Store.UpdateRule(ctx, id, updated)
	require.NoError(t, err)

	got, err = svc.Store.GetRuleByID(ctx, id)
	require.NoError(t, err)
	require.Equal(t, "Updated Name", got.Name)
	require.Equal(t, "scheduled_event", got.Trigger.Type)

	// Disable rule and check stats
	err = svc.Store.EnableRule(ctx, id, false)
	require.NoError(t, err)
	stats, err := svc.Store.GetRuleStats(ctx)
	require.NoError(t, err)
	require.EqualValues(t, 1, stats["total_rules"])
	require.EqualValues(t, 0, stats["enabled_rules"])
	require.EqualValues(t, 1, stats["disabled_rules"])

	// Re-enable and check stats
	err = svc.Store.EnableRule(ctx, id, true)
	require.NoError(t, err)
	stats, err = svc.Store.GetRuleStats(ctx)
	require.NoError(t, err)
	require.EqualValues(t, 1, stats["total_rules"])
	require.EqualValues(t, 1, stats["enabled_rules"])
	require.EqualValues(t, 0, stats["disabled_rules"])

	// Delete rule
	err = svc.Store.DeleteRule(ctx, id)
	require.NoError(t, err)

	// Get should now fail
	_, err = svc.Store.GetRuleByID(ctx, id)
	require.Error(t, err)
}

func TestService_OnTriggers_NoRules(t *testing.T) {
	db := newSQLite(t)
	svc := NewRuleBackEndService(db)
	ctx := context.Background()

	require.NoError(t, svc.OnJobPosition(ctx, "create", map[string]any{"PositionMatrixCode": "POS001"}))
	require.NoError(t, svc.OnCompetencyType(ctx, "update", map[string]any{"TypeName": "Certification"}))
	require.NoError(t, svc.OnCompetency(ctx, "deactivate", map[string]any{"CompetencyID": 1}))
	require.NoError(t, svc.OnEventDefinition(ctx, "update", map[string]any{"EventName": "Safety"}))
	require.NoError(t, svc.OnScheduledEvent(ctx, "update", "StatusName", map[string]any{"Title": "Safety Training"}))
	require.NoError(t, svc.OnRoles(ctx, "update", "permissions", map[string]any{"RoleName": "Supervisor"}))
	require.NoError(t, svc.OnLinkJobToCompetency(ctx, "add", map[string]any{"State": "active"}, map[string]any{"PositionMatrixCode": "POS001"}, map[string]any{"CompetencyID": 1}))
	require.NoError(t, svc.OnCompetencyPrerequisite(ctx, "add", map[string]any{"ParentCompetencyID": 1, "RequiredCompetencyID": 2}, map[string]any{"CompetencyID": 1}))
}
