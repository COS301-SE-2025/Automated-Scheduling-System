package rulesv2

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetRulesMetadataHandler returns metadata about all available triggers, actions, facts, and operators
func GetRulesMetadataHandler(c *gin.Context) {
	metadata := GetRulesMetadata()
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   metadata,
	})
}

// GetTriggersMetadataHandler returns metadata about available triggers
func GetTriggersMetadataHandler(c *gin.Context) {
	triggers := getTriggerMetadata()
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   triggers,
	})
}

// GetActionsMetadataHandler returns metadata about available actions
func GetActionsMetadataHandler(c *gin.Context) {
	actions := getActionMetadata()
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   actions,
	})
}

// GetFactsMetadataHandler returns metadata about available facts for conditions
func GetFactsMetadataHandler(c *gin.Context) {
	facts := getFactMetadata()
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   facts,
	})
}

// GetOperatorsMetadataHandler returns metadata about available operators
func GetOperatorsMetadataHandler(c *gin.Context) {
	operators := getOperatorMetadata()
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   operators,
	})
}

// ValidateRuleHandler validates a rule without saving it
func ValidateRuleHandler(c *gin.Context) {
	var rule Rulev2
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	result := ValidateRuleParameters(rule)

	status := http.StatusOK
	if !result.Valid {
		status = http.StatusBadRequest
	}

	c.JSON(status, gin.H{
		"status": "success",
		"data":   result,
	})
}

// Removed legacy new_hire and scheduled_competency_check handlers

// GetRulesStatus returns system status and statistics
func GetRulesStatus(c *gin.Context, service *RuleBackEndService) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	stats, err := service.Store.GetRuleStats(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "online",
		"timestamp": time.Now().UTC(),
		"stats":     stats,
	})
}

// ListRules returns all rules in the system
func ListRules(c *gin.Context, service *RuleBackEndService) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Fetch raw DB rows so we have id, name, trigger_type, enabled, spec
	rows, err := service.Store.ListAllRuleRows(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return the exact shape the frontend normalizer expects
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, map[string]any{
			"id":          r.ID,
			"name":        r.Name,
			"triggerType": r.TriggerType,
			"enabled":     r.Enabled,
			"spec":        r.Spec, // datatypes.JSON marshals as raw JSON
		})
	}

	c.JSON(http.StatusOK, gin.H{"rules": out})
}

// CreateRule creates a new rule and returns the DB id
func CreateRule(c *gin.Context, service *RuleBackEndService) {
	var rule Rulev2
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	newID, err := service.Store.CreateRule(ctx, rule)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": newID, "message": "Rule created successfully"})
}

// GetRule returns a specific rule by ID
func GetRule(c *gin.Context, service *RuleBackEndService) {
	ruleID := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rule, err := service.Store.GetRuleByID(ctx, ruleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rule not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rule": rule})
}

// helper to map store errors to HTTP codes
func httpStatusForStoreErr(err error) int {
	if err == nil {
		return http.StatusOK
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(err, sql.ErrNoRows) {
		return http.StatusNotFound
	}
	// best-effort string check if store wraps its own error with "not found"
	if strings.Contains(strings.ToLower(err.Error()), "not found") {
		return http.StatusNotFound
	}
	return http.StatusInternalServerError
}

// UpdateRule updates an existing rule
func UpdateRule(c *gin.Context, service *RuleBackEndService) {
	ruleID := c.Param("id")
	var rule Rulev2

	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := service.Store.UpdateRule(ctx, ruleID, rule); err != nil {
		c.JSON(httpStatusForStoreErr(err), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rule updated successfully"})
}

// DeleteRule removes a rule
func DeleteRule(c *gin.Context, service *RuleBackEndService) {
	ruleID := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := service.Store.DeleteRule(ctx, ruleID); err != nil {
		c.JSON(httpStatusForStoreErr(err), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rule deleted successfully"})
}

// EnableRule enables a rule
func EnableRule(c *gin.Context, service *RuleBackEndService) {
	ruleID := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := service.Store.EnableRule(ctx, ruleID, true); err != nil {
		c.JSON(httpStatusForStoreErr(err), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rule enabled successfully"})
}

// DisableRule disables a rule
func DisableRule(c *gin.Context, service *RuleBackEndService) {
	ruleID := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := service.Store.EnableRule(ctx, ruleID, false); err != nil {
		c.JSON(httpStatusForStoreErr(err), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rule disabled successfully"})
}

// Trigger handlers (updated payloads, plus two new)

func TriggerJobPosition(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation   string         `json:"operation" binding:"required"` // create|update|deactivate|reactivate
		JobPosition map[string]any `json:"jobPosition"`                  // optional payload
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := service.OnJobPosition(ctx, req.Operation, req.JobPosition); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerCompetencyType(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation      string         `json:"operation" binding:"required"`
		CompetencyType map[string]any `json:"competencyType"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnCompetencyType(ctx, req.Operation, req.CompetencyType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerCompetency(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation  string         `json:"operation" binding:"required"`
		Competency map[string]any `json:"competency"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnCompetency(ctx, req.Operation, req.Competency); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerEventDefinition(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation       string         `json:"operation" binding:"required"`
		EventDefinition map[string]any `json:"eventDefinition"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnEventDefinition(ctx, req.Operation, req.EventDefinition); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerScheduledEvent(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation      string         `json:"operation" binding:"required"`
		UpdateField    string         `json:"update_field"`
		ScheduledEvent map[string]any `json:"scheduledEvent"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnScheduledEvent(ctx, req.Operation, req.UpdateField, req.ScheduledEvent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerRoles(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation  string         `json:"operation" binding:"required"`
		UpdateKind string         `json:"update_kind"`
		Role       map[string]any `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnRoles(ctx, req.Operation, req.UpdateKind, req.Role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerLinkJobToCompetency(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation   string         `json:"operation" binding:"required"` // add|remove
		Link        map[string]any `json:"link"`
		JobPosition map[string]any `json:"jobPosition"`
		Competency  map[string]any `json:"competency"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnLinkJobToCompetency(ctx, req.Operation, req.Link, req.JobPosition, req.Competency); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerCompetencyPrerequisite(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation    string         `json:"operation" binding:"required"` // add|remove
		Prerequisite map[string]any `json:"prerequisite"`
		Competency   map[string]any `json:"competency"` // parent competency (optional)
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnCompetencyPrerequisite(ctx, req.Operation, req.Prerequisite, req.Competency); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
