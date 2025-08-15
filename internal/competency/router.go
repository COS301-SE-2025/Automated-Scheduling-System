package competency

import (
	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/role"

	"github.com/gin-gonic/gin"
)

func RegisterCompetencyRoutes(r *gin.Engine) {
	apiProtected := r.Group("/api")

	apiProtected.Use(auth.AuthMiddleware(), role.RequirePage("competencies"))
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
