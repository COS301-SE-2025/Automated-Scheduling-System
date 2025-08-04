package rules

import (
	"Automated-Scheduling-Project/internal/database/models"
	"Automated-Scheduling-Project/internal/event"
	"Automated-Scheduling-Project/internal/event_rules"
	rules_engine "Automated-Scheduling-Project/internal/rule_engine"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var DB *gorm.DB

// GetRulesHandler returns all rules
func GetRulesHandler(c *gin.Context) {
	var dbRules []models.DBRule
	if err := DB.Find(&dbRules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch rules"})
		return
	}

	// Convert to frontend-friendly format
	var responseRules []gin.H
	for _, dbRule := range dbRules {
		responseRules = append(responseRules, gin.H{
			"id":      dbRule.ID,
			"type":    dbRule.Type,
			"enabled": dbRule.Enabled,
			"body":    dbRule.Body,
		})
	}

	c.JSON(http.StatusOK, gin.H{"rules": responseRules})
}

// CreateRuleHandler creates a new rule
func CreateRuleHandler(c *gin.Context) {
	var req struct {
		Rule models.RawRuleJSON `json:"rule" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	// Convert models.RawRuleJSON to rules_engine.RawRule for validation
	engineRule := rules_engine.RawRule{
		ID:         req.Rule.ID,
		Type:       req.Rule.Type,
		Enabled:    req.Rule.Enabled,
		Target:     req.Rule.Target,
		Conditions: req.Rule.Conditions,
		Params:     req.Rule.Params,
		When:       req.Rule.When,
	}

	// Convert frequency if present
	if req.Rule.Frequency != nil {
		engineRule.Frequency = &rules_engine.Period{
			Years:  req.Rule.Frequency.Years,
			Months: req.Rule.Frequency.Months,
			Days:   req.Rule.Frequency.Days,
		}
	}

	// Convert actions
	if len(req.Rule.Actions) > 0 {
		engineRule.Actions = make([]rules_engine.RawAction, len(req.Rule.Actions))
		for i, action := range req.Rule.Actions {
			engineRule.Actions[i] = rules_engine.RawAction{
				Type:   action.Type,
				Params: action.Params,
			}
		}
	}

	// Validate the rule by trying to build it
	if _, err := rules_engine.BuildRule(engineRule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid rule configuration: " + err.Error()})
		return
	}

	// Save to database
	dbRule := models.DBRule{
		ID:      req.Rule.ID,
		Enabled: req.Rule.Enabled,
		Type:    req.Rule.Type,
		Body:    req.Rule,
	}

	if err := DB.Create(&dbRule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create rule"})
		return
	}

	// Refresh the rule engine
	if err := event.InitializeRuleEngine(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh rule engine"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Rule created successfully",
		"rule":    dbRule,
	})
}

// UpdateRuleHandler updates an existing rule
func UpdateRuleHandler(c *gin.Context) {
	ruleID := c.Param("ruleID")

	var req struct {
		Rule models.RawRuleJSON `json:"rule" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data: " + err.Error()})
		return
	}

	// Convert models.RawRuleJSON to rules_engine.RawRule for validation
	engineRule := rules_engine.RawRule{
		ID:         req.Rule.ID,
		Type:       req.Rule.Type,
		Enabled:    req.Rule.Enabled,
		Target:     req.Rule.Target,
		Conditions: req.Rule.Conditions,
		Params:     req.Rule.Params,
		When:       req.Rule.When,
	}

	// Convert frequency if present
	if req.Rule.Frequency != nil {
		engineRule.Frequency = &rules_engine.Period{
			Years:  req.Rule.Frequency.Years,
			Months: req.Rule.Frequency.Months,
			Days:   req.Rule.Frequency.Days,
		}
	}

	// Convert actions
	if len(req.Rule.Actions) > 0 {
		engineRule.Actions = make([]rules_engine.RawAction, len(req.Rule.Actions))
		for i, action := range req.Rule.Actions {
			engineRule.Actions[i] = rules_engine.RawAction{
				Type:   action.Type,
				Params: action.Params,
			}
		}
	}

	// Validate the rule
	if _, err := rules_engine.BuildRule(engineRule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid rule configuration: " + err.Error()})
		return
	}

	// Update in database
	var dbRule models.DBRule
	if err := DB.Where("id = ?", ruleID).First(&dbRule).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rule not found"})
		return
	}

	dbRule.Enabled = req.Rule.Enabled
	dbRule.Type = req.Rule.Type
	dbRule.Body = req.Rule

	if err := DB.Save(&dbRule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update rule"})
		return
	}

	// Refresh the rule engine
	if err := event.InitializeRuleEngine(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh rule engine"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Rule updated successfully",
		"rule":    dbRule,
	})
}

// DeleteRuleHandler deletes a rule
func DeleteRuleHandler(c *gin.Context) {
	ruleID := c.Param("ruleID")

	if err := DB.Delete(&models.DBRule{}, "id = ?", ruleID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete rule"})
		return
	}

	// Refresh the rule engine
	if err := event.InitializeRuleEngine(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh rule engine"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rule deleted successfully"})
}

// TriggerScheduledRulesHandler manually triggers scheduled rules (for testing or admin purposes)
func TriggerScheduledRulesHandler(c *gin.Context) {
	if event.RuleBridge == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Rule engine not initialized"})
		return
	}

	// Create scheduler and run rules
	scheduler := event_rules.NewRuleScheduler(DB, event.RuleBridge)
	if err := scheduler.RunScheduledRules(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to run scheduled rules: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Scheduled rules executed successfully",
	})
}
