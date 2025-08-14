package matrix

import (
	"Automated-Scheduling-Project/internal/auth"
	"github.com/gin-gonic/gin"
)

func RegisterMatrixRoutes(r *gin.Engine) {
	apiProtected := r.Group("/api")
	apiProtected.Use(auth.AuthMiddleware())
	{
		apiProtected.POST("/job-requirements", CreateJobMatrixEntryHandler)
		apiProtected.GET("/job-requirements", GetJobMatrixEntriesHandler)
		apiProtected.PUT("/job-requirements/:matrixID", UpdateJobMatrixEntryHandler)
		apiProtected.DELETE("/job-requirements/:matrixID", DeleteJobMatrixEntryHandler)
	}
}