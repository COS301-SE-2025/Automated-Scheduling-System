package employment_history

import (
    "Automated-Scheduling-Project/internal/auth"
    "Automated-Scheduling-Project/internal/role"

    "github.com/gin-gonic/gin"
)

func RegisterEmploymentHistoryRoutes(r *gin.Engine) {
    api := r.Group("/api")
    // Using same permission as employee competencies; adjust if you add a dedicated page.
    api.Use(auth.AuthMiddleware(), role.RequirePage("competencies"))
    {
        api.POST("/employment-history", CreateEmploymentHistoryHandler)
        api.GET("/employment-history", ListEmploymentHistoryHandler)
        api.GET("/employment-history/:employmentID", GetEmploymentHistoryHandler)
        api.PUT("/employment-history/:employmentID", UpdateEmploymentHistoryHandler)
        api.DELETE("/employment-history/:employmentID", DeleteEmploymentHistoryHandler)

        api.GET("/employees/:employeeNumber/employment-history", ListEmploymentHistoryByEmployeeHandler)
        api.GET("/employees/:employeeNumber/current-positions", ListCurrentPositionsForEmployeeHandler)
    }
}