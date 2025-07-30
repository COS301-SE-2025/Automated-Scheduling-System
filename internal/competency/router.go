package competency

import (
	"Automated-Scheduling-Project/internal/auth"
	"github.com/gin-gonic/gin"
)

func RegisterCompetencyRoutes(r *gin.Engine) {

	apiProtected := r.Group("/api")
	apiProtected.Use(auth.AuthMiddleware())
	{
		competencies := apiProtected.Group("/competencies")
		{
			competencies.POST("/", CreateCompetencyDefinitionHandler)
			competencies.GET("/", GetCompetencyDefinitionsHandler)
			competencies.GET("/:competencyID", GetCompetencyDefinitionByIDHandler)
			competencies.PUT("/:competencyID", UpdateCompetencyDefinitionHandler)
			competencies.DELETE("/:competencyID", DeleteCompetencyDefinitionHandler)
			competencies.POST("/:competencyID/prerequisites", AddPrerequisiteHandler)
			competencies.DELETE("/:competencyID/prerequisites/:prerequisiteID", RemovePrerequisiteHandler)
		}
	}
}