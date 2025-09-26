package server

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "github.com/joho/godotenv/autoload"

	"Automated-Scheduling-Project/internal/database"
	rulesv2 "Automated-Scheduling-Project/internal/rulesV2"
)

type Server struct {
	port int

	db           database.Service
	rulesService *rulesv2.RuleBackEndService
}

func NewServer(rulesService *rulesv2.RuleBackEndService) *http.Server {
	port, _ := strconv.Atoi(os.Getenv("PORT"))
	if port == 0 {
		port = 8080 // Default to 8080 if PORT is not set or invalid
	}
	
	NewServer := &Server{
		port: port,

		db:           database.New(),
		rulesService: rulesService,
	}

	// Declare Server config
	server := &http.Server{
		Addr:         fmt.Sprintf("0.0.0.0:%d", NewServer.port),
		Handler:      NewServer.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}
