package rulesv2

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
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

// TriggerJobMatrixUpdate triggers rules when job matrix is updated
func TriggerJobMatrixUpdate(c *gin.Context, service *RuleBackEndService) {
	var request struct {
		EmployeeNumber string `json:"employeeNumber" binding:"required"`
		CompetencyID   int32  `json:"competencyID" binding:"required"`
		Action         string `json:"action" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := service.OnJobMatrixUpdate(ctx, request.EmployeeNumber, request.CompetencyID, request.Action); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Job matrix update processed"})
}

// TriggerNewHire triggers rules for new employee
func TriggerNewHire(c *gin.Context, service *RuleBackEndService) {
	var request struct {
		EmployeeNumber string `json:"employeeNumber" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := service.OnNewHire(ctx, request.EmployeeNumber); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "New hire processing completed"})
}

// TriggerScheduledCheck runs scheduled competency checks
func TriggerScheduledCheck(c *gin.Context, service *RuleBackEndService) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	if err := service.RunScheduledChecks(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Scheduled checks completed"})
}

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

	rules, err := service.Store.ListAllRules(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rules": rules})
}

// CreateRule creates a new rule
func CreateRule(c *gin.Context, service *RuleBackEndService) {
	var rule Rulev2

	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Generate rule ID
	ruleID := "rule_" + strconv.FormatInt(time.Now().Unix(), 10)

	if err := service.Store.CreateRule(ctx, rule, ruleID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": ruleID, "message": "Rule created successfully"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rule disabled successfully"})
}

// Trigger handlers (updated payloads, plus two new)

func TriggerJobPosition(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation string `json:"operation" binding:"required"` // create|update|deactivate|reactivate
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnJobPosition(ctx, req.Operation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerCompetencyType(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation string `json:"operation" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnCompetencyType(ctx, req.Operation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerCompetency(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation string `json:"operation" binding:"required"` // create|update|deactivate|reactivate
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnCompetency(ctx, req.Operation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerEventDefinition(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation string `json:"operation" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnEventDefinition(ctx, req.Operation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerScheduledEvent(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation   string `json:"operation" binding:"required"`
		UpdateField string `json:"update_field"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnScheduledEvent(ctx, req.Operation, req.UpdateField); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TriggerRoles(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation  string `json:"operation" binding:"required"` // create|update
		UpdateKind string `json:"update_kind"`                   // general|permission_added|permission_removed
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnRoles(ctx, req.Operation, req.UpdateKind); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// NEW: link_job_to_competency
func TriggerLinkJobToCompetency(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation string `json:"operation" binding:"required"` // add|deactivate|reactivate
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnLinkJobToCompetency(ctx, req.Operation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// NEW: competency_prerequisite
func TriggerCompetencyPrerequisite(c *gin.Context, service *RuleBackEndService) {
	var req struct {
		Operation string `json:"operation" binding:"required"` // add|remove
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := service.OnCompetencyPrerequisite(ctx, req.Operation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
