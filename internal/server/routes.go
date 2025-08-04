package server

import (
	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/event"
	"Automated-Scheduling-Project/internal/rules"
	"Automated-Scheduling-Project/internal/user"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true, // Enable cookies/auth
	}))

	r.GET("/", s.HelloWorldHandler)

	r.GET("/health", s.healthHandler)

	// Initialize database connections for modules
	event.DB = s.db.Gorm()
	rules.DB = s.db.Gorm()

	// Initialize rule engine
	if err := event.InitializeRuleEngine(); err != nil {
		// Log error but don't fail startup
		// In production, you might want to handle this differently
	}

	// Register routes
	auth.RegisterAuthRoutes(r)
	user.RegisterUserRoutes(r)
	event.RegisterEventRoutes(r)

	// Register rule management routes
	ruleProtected := r.Group("/api/rules")
	ruleProtected.Use(auth.AuthMiddleware())
	{
		ruleProtected.GET("", rules.GetRulesHandler)
		ruleProtected.POST("", rules.CreateRuleHandler)
		ruleProtected.PUT("/:ruleID", rules.UpdateRuleHandler)
		ruleProtected.DELETE("/:ruleID", rules.DeleteRuleHandler)
		ruleProtected.POST("/trigger-scheduled", rules.TriggerScheduledRulesHandler)
	}

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
