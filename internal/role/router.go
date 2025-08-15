package role

import (
	"Automated-Scheduling-Project/internal/auth"

	"github.com/gin-gonic/gin"
)

func RegisterRoleRoutes(r *gin.Engine) {
	// Authenticated utility endpoints
	apiAuth := r.Group("/api")
	apiAuth.Use(auth.AuthMiddleware())
	{
		apiAuth.GET("/roles/permissions", GetMyPermissionsHandler)
	}

	// Role management endpoints (require roles permission)
	apiRoles := r.Group("/api")
	apiRoles.Use(auth.AuthMiddleware(), RequirePage("roles"))
	{
		apiRoles.GET("/roles", GetAllRolesHandler)
		apiRoles.POST("/roles", CreateRoleHandler)
		apiRoles.PATCH("/roles/:roleID", UpdateRoleHandler)
		apiRoles.DELETE("/roles/:roleID", DeleteRoleHandler)
	}
}
