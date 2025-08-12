package competency

import (
	"Automated-Scheduling-Project/internal/auth"
	"github.com/gin-gonic/gin"
)

func RegisterCompetencyRoutes(r *gin.Engine) {
	apiProtected := r.Group("/api")

	apiProtected.Use(auth.AuthMiddleware())
	{
		apiProtected.POST("/competencies", CreateCompetencyDefinitionHandler)
		apiProtected.GET("/competencies", GetCompetencyDefinitionsHandler)
		apiProtected.GET("/competencies/:competencyID", GetCompetencyDefinitionByIDHandler)
		apiProtected.PUT("/competencies/:competencyID", UpdateCompetencyDefinitionHandler)
		apiProtected.DELETE("/competencies/:competencyID", DeleteCompetencyDefinitionHandler)
		apiProtected.POST("/competencies/:competencyID/prerequisites", AddPrerequisiteHandler)
		apiProtected.DELETE("/competencies/:competencyID/prerequisites/:prerequisiteID", RemovePrerequisiteHandler)
	}
}