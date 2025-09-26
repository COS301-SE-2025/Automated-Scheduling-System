package server

import (
	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/competency"
	"Automated-Scheduling-Project/internal/competency_type"
	"Automated-Scheduling-Project/internal/event"
	"Automated-Scheduling-Project/internal/jobposition"
	"Automated-Scheduling-Project/internal/matrix"
	"Automated-Scheduling-Project/internal/profile"
	"Automated-Scheduling-Project/internal/role"
	rulesv2 "Automated-Scheduling-Project/internal/rulesV2"
	"Automated-Scheduling-Project/internal/user"
	"Automated-Scheduling-Project/internal/employee_competencies"
	"Automated-Scheduling-Project/internal/employment_history"

	"fmt"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()

	// CORS (original static configuration restored)
	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		// AllowOrigins: []string{
		// 	"http://localhost:5173",
		// 	"http://127.0.0.1:5173",
		// 	"http://localhost:8081",
		// 	"http://127.0.0.1:8081",
		// 	"http://172.27.170.118:8081",
		// 	"http://schedulingsystem.app",
		// 	"https://schedulingsystem.app",
		// 	"http://schedulingsystem.me",
		// 	"https://schedulingsystem.me",
		// 	"https://trp7ate-anonymous-8081.exp.direct",
		// },
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.GET("/", s.HelloWorldHandler)
	r.GET("/health", s.healthHandler)

	auth.RegisterAuthRoutes(r)
	user.RegisterUserRoutes(r)
	role.RegisterRoleRoutes(r)
	event.RegisterEventRoutes(r)
	matrix.RegisterMatrixRoutes(r)
	competency.RegisterCompetencyRoutes(r)
	competency_type.RegisterCompetencyTypeRoutes(r)
	jobposition.RegisterJobPositionRoutes(r)
	profile.RegisterProfileRoutes(r)
	employee_competencies.RegisterEmployeeCompetencyRoutes(r)
	employment_history.RegisterEmploymentHistoryRoutes(r)
	rulesv2.RegisterRulesRoutes(r, s.rulesService)
	

	return r
}

func (s *Server) HelloWorldHandler(c *gin.Context) {
	resp := make(map[string]string)
	resp["message"] = "Hello World"

	c.JSON(http.StatusOK, resp)
}

func (s *Server) healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, s.db.Health())
}
