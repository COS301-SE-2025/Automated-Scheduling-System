package profile

import (
	"Automated-Scheduling-Project/internal/auth"

	"github.com/gin-gonic/gin"
)

func RegisterProfileRoutes(r *gin.Engine) {
	api := r.Group("/api")
	api.Use(auth.AuthMiddleware())
	{
		api.GET("/profile/competencies", GetEmployeeCompetencyProfile)
		api.GET("/profile/visualization", GetEmployeeVisualizationData)
		api.GET("/profile/admin/compliance", GetAdminComplianceData)
		api.POST("/profile/update", UpdateEmployeeProfile)
	}
}
