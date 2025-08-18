package rulesv2

import (
	"github.com/gin-gonic/gin"
)

// RegisterRulesRoutes registers all rules engine HTTP endpoints
func RegisterRulesRoutes(router *gin.Engine, service *RuleBackEndService) {
	rulesGroup := router.Group("/api/rules")
	{
		// Trigger endpoints for external systems to notify the rules engine
		rulesGroup.POST("/trigger/job-matrix", func(c *gin.Context) {
			TriggerJobMatrixUpdate(c, service)
		})
		rulesGroup.POST("/trigger/new-hire", func(c *gin.Context) {
			TriggerNewHire(c, service)
		})
		rulesGroup.POST("/trigger/scheduled-check", func(c *gin.Context) {
			TriggerScheduledCheck(c, service)
		})

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
