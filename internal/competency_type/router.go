// internal/competency_type/router.go
package competency_type

import (
	"Automated-Scheduling-Project/internal/auth"
	"github.com/gin-gonic/gin"
)

func RegisterCompetencyTypeRoutes(r *gin.Engine) {
	apiProtected := r.Group("/api")
	
	apiProtected.Use(auth.AuthMiddleware())
	{
		apiProtected.GET("/competency-types", GetAllCompetencyTypesHandler)
		apiProtected.POST("/competency-types", CreateCompetencyTypeHandler)
		apiProtected.PUT("/competency-types/:typeName", UpdateCompetencyTypeHandler)
		apiProtected.DELETE("/competency-types/:typeName", DeleteCompetencyTypeHandler)
	}
}