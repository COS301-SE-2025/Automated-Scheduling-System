package matrix

import (
	"Automated-Scheduling-Project/internal/auth"
	"github.com/gin-gonic/gin"
)

func RegisterMatrixRoutes(r *gin.Engine) {

	apiProtected := r.Group("/api")
	apiProtected.Use(auth.AuthMiddleware())
	{
		matrix := apiProtected.Group("/job-matrix")
		{
			matrix.POST("/", CreateJobMatrixEntryHandler)
			matrix.GET("/", GetJobMatrixEntriesHandler)
			matrix.PUT("/:matrixID", UpdateJobMatrixEntryHandler)
			matrix.DELETE("/:matrixID", DeleteJobMatrixEntryHandler)
		}
	}
}