package auth

import "github.com/gin-gonic/gin"

func RegisterAuthRoutes(r *gin.Engine) {
	api := r.Group("/api")

	api.POST("/register", RegisterHandler)
	api.POST("/login", LoginHandler)
	api.POST("/forgot-password", generateResetLinkHandler)
	api.POST("/reset-password", resetPasswordHandler)
	api.GET("/reset-password/:resetToken", resetPasswordPageHandler)
	api.GET("/profile", AuthMiddleware(), ProfileHandler)
}
