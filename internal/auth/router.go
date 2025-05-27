package auth

import "github.com/gin-gonic/gin"

func RegisterAuthRoutes(r *gin.Engine) {
	r.POST("/register", RegisterHandler)
	r.POST("/login", LoginHandler)
	r.POST("/forgot-password", forgotPasswordHandler)

	protected := r.Group("/api")
	protected.Use(AuthMiddleware())
	protected.GET("/profile", ProfileHandler)
}
