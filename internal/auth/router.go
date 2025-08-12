package auth

import "github.com/gin-gonic/gin"

func RegisterAuthRoutes(r *gin.Engine) {
	api := r.Group("/api")

	api.POST("/register", RegisterHandler)
	api.POST("/login", LoginHandler)
	api.POST("/forgot-password", generateResetLinkHandler)
	api.POST("/reset-password", resetPasswordHandler)
	api.GET("/reset-password/:resetToken", resetPasswordPageHandler)

	// If there are more protected endpoints, add them to a group
	// It is probably better to add the AuthMiddleware as a parameter before the ProfileHandler, but I opted for the Use after for consistency
	api.GET("/profile", ProfileHandler).Use(AuthMiddleware())
}
