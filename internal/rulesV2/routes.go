package rulesv2

import (
	"github.com/gin-gonic/gin"
)

// RegisterRulesRoutes registers all rules engine HTTP endpoints
func RegisterRulesRoutes(router *gin.Engine, service *RuleBackEndService) {
	rulesGroup := router.Group("/api/rules")
	{
		// Metadata endpoints for frontend integration
		rulesGroup.GET("/metadata", func(c *gin.Context) {
			GetRulesMetadataHandler(c)
		})
		rulesGroup.GET("/metadata/triggers", func(c *gin.Context) {
			GetTriggersMetadataHandler(c)
		})
		rulesGroup.GET("/metadata/actions", func(c *gin.Context) {
			GetActionsMetadataHandler(c)
		})
		rulesGroup.GET("/metadata/facts", func(c *gin.Context) {
			GetFactsMetadataHandler(c)
		})
		rulesGroup.GET("/metadata/operators", func(c *gin.Context) {
			GetOperatorsMetadataHandler(c)
		})

		// Validation endpoint
		rulesGroup.POST("/validate", func(c *gin.Context) {
			ValidateRuleHandler(c)
		})

		// Trigger endpoints for external systems to notify the rules engine
		rulesGroup.POST("/trigger/new-hire", func(c *gin.Context) {
			TriggerNewHire(c, service)
		})
		rulesGroup.POST("/trigger/scheduled-check", func(c *gin.Context) {
			TriggerScheduledCheck(c, service)
		})

		// New/updated trigger endpoints
		rulesGroup.POST("/trigger/job-position", func(c *gin.Context) { TriggerJobPosition(c, service) })
		rulesGroup.POST("/trigger/competency-type", func(c *gin.Context) { TriggerCompetencyType(c, service) })
		rulesGroup.POST("/trigger/competency", func(c *gin.Context) { TriggerCompetency(c, service) })
		rulesGroup.POST("/trigger/event-definition", func(c *gin.Context) { TriggerEventDefinition(c, service) })
		rulesGroup.POST("/trigger/scheduled-event", func(c *gin.Context) { TriggerScheduledEvent(c, service) })
		rulesGroup.POST("/trigger/roles", func(c *gin.Context) { TriggerRoles(c, service) })
		rulesGroup.POST("/trigger/link-job-to-competency", func(c *gin.Context) { TriggerLinkJobToCompetency(c, service) })
        rulesGroup.POST("/trigger/competency-prerequisite", func(c *gin.Context) { TriggerCompetencyPrerequisite(c, service) })

		// Status and monitoring endpoints
		rulesGroup.GET("/status", func(c *gin.Context) {
			GetRulesStatus(c, service)
		})

		// Rule management endpoints
		rulesGroup.GET("/rules", func(c *gin.Context) {
			ListRules(c, service)
		})
		rulesGroup.POST("/rules", func(c *gin.Context) {
			CreateRule(c, service)
		})
		rulesGroup.GET("/rules/:id", func(c *gin.Context) {
			GetRule(c, service)
		})
		rulesGroup.PUT("/rules/:id", func(c *gin.Context) {
			UpdateRule(c, service)
		})
		rulesGroup.DELETE("/rules/:id", func(c *gin.Context) {
			DeleteRule(c, service)
		})

		// Rule state management endpoints
		rulesGroup.POST("/rules/:id/enable", func(c *gin.Context) {
			EnableRule(c, service)
		})
		rulesGroup.POST("/rules/:id/disable", func(c *gin.Context) {
			DisableRule(c, service)
		})
	}
}
