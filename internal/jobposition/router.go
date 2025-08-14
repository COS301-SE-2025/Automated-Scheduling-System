package jobposition

import (
	"Automated-Scheduling-Project/internal/auth"
	"github.com/gin-gonic/gin"
)

func RegisterJobPositionRoutes(r *gin.Engine) {
	apiProtected := r.Group("/api")
	apiProtected.Use(auth.AuthMiddleware())
	{
		apiProtected.GET("/job-positions", GetAllJobPositionsHandler)
		apiProtected.POST("/job-positions", CreateJobPositionHandler)
		apiProtected.PUT("/job-positions/:positionCode", UpdateJobPositionHandler)
		apiProtected.PUT("/job-positions/:positionCode/status", UpdateJobPositionStatusHandler)
	}
}