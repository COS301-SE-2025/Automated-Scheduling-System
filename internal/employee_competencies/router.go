package employee_competencies

import (
    "Automated-Scheduling-Project/internal/auth"
    "Automated-Scheduling-Project/internal/role"

    "github.com/gin-gonic/gin"
)

func RegisterEmployeeCompetencyRoutes(r *gin.Engine) {
    api := r.Group("/api")
    api.Use(auth.AuthMiddleware(), role.RequirePage("competencies"))
    {
        api.POST("/employee-competencies", CreateEmployeeCompetencyHandler)
        api.GET("/employee-competencies", ListEmployeeCompetenciesHandler)
        api.GET("/employee-competencies/:employeeCompetencyID", GetEmployeeCompetencyHandler)
        api.PUT("/employee-competencies/:employeeCompetencyID", UpdateEmployeeCompetencyHandler)
        api.DELETE("/employee-competencies/:employeeCompetencyID", DeleteEmployeeCompetencyHandler)

        // Employee focused views
        api.GET("/employees/:employeeNumber/competencies", ListEmployeeCompetenciesByEmployeeHandler)
    }
}
