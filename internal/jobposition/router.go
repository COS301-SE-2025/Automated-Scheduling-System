package jobposition

import (
	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/role"

	"github.com/gin-gonic/gin"
)

func RegisterJobPositionRoutes(r *gin.Engine) {
	apiProtected := r.Group("/api")
	apiProtected.Use(auth.AuthMiddleware(), role.RequirePage("competencies"))
	{
		apiProtected.GET("/job-positions", GetAllJobPositionsHandler)
		apiProtected.POST("/job-positions", CreateJobPositionHandler)
		apiProtected.PUT("/job-positions/:positionCode", UpdateJobPositionHandler)
		apiProtected.PUT("/job-positions/:positionCode/status", UpdateJobPositionStatusHandler)
	}
}
