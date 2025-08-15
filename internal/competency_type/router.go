// internal/competency_type/router.go
package competency_type

import (
	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/role"

	"github.com/gin-gonic/gin"
)

func RegisterCompetencyTypeRoutes(r *gin.Engine) {
	apiProtected := r.Group("/api")

	apiProtected.Use(auth.AuthMiddleware(), role.RequirePage("competencies"))
	{
		apiProtected.GET("/competency-types", GetAllCompetencyTypesHandler)
		apiProtected.POST("/competency-types", CreateCompetencyTypeHandler)
		apiProtected.PUT("/competency-types/:typeName", UpdateCompetencyTypeHandler)
		apiProtected.PUT("/competency-types/:typeName/status", UpdateTypeStatusHandler)
	}
}
