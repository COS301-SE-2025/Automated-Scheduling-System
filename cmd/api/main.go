package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"Automated-Scheduling-Project/internal/auth"
	"Automated-Scheduling-Project/internal/competency"
	"Automated-Scheduling-Project/internal/competency_type"
	"Automated-Scheduling-Project/internal/database"
	"Automated-Scheduling-Project/internal/event"
	"Automated-Scheduling-Project/internal/jobposition"
	"Automated-Scheduling-Project/internal/matrix"
	"Automated-Scheduling-Project/internal/profile"
	"Automated-Scheduling-Project/internal/role"
	rulesv2 "Automated-Scheduling-Project/internal/rulesV2"
	"Automated-Scheduling-Project/internal/server"
	"Automated-Scheduling-Project/internal/user"
	"Automated-Scheduling-Project/internal/employee_competencies"
	"Automated-Scheduling-Project/internal/employment_history"
)

func gracefulShutdown(apiServer *http.Server, rulesService *rulesv2.RuleBackEndService, done chan bool) {
	// Create context that listens for the interrupt signal from the OS.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Listen for the interrupt signal.
	<-ctx.Done()

	log.Println("shutting down gracefully, press Ctrl+C again to force")
	stop() // Allow Ctrl+C to force shutdown

	// Stop scheduler first
	_ = rulesService.StopScheduler(context.Background())

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := apiServer.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown with error: %v", err)
	}

	log.Println("Server exiting")

	// Notify the main goroutine that the shutdown is complete
	done <- true
}

func main() {

	dbConnection := database.New().Gorm()

	// Validate JWT secret early
	// jwtSecret := os.Getenv("JWT_SECRET")
	// if len(jwtSecret) == 0 {
	// 	log.Println("[WARN] JWT_SECRET is empty. Tokens are being signed with an empty key. Set JWT_SECRET in .env.")
	// } else if len(jwtSecret) < 32 {
	// 	log.Printf("[WARN] JWT_SECRET length (%d) is weak; use >=32 random bytes for production.\n", len(jwtSecret))
	// }

	auth.DB = dbConnection
	user.DB = dbConnection
	event.DB = dbConnection
	competency.DB = dbConnection
	matrix.DB = dbConnection
	competency_type.DB = dbConnection
	jobposition.DB = dbConnection
	role.DB = dbConnection
	profile.DB = dbConnection
	employee_competencies.DB = dbConnection
	employment_history.DB = dbConnection

	// Initialize RulesV2 Backend Service
	rulesService := rulesv2.NewRuleBackEndService(dbConnection)
	rulesService.Scheduler.EnableDebug(true)
	if err := rulesService.StartScheduler(context.Background()); err != nil {
		log.Printf("failed to start scheduler: %v", err)
	}

	// Inject rules service into domain handlers that should fire triggers
	event.SetRulesService(rulesService)
	competency.SetRulesService(rulesService)
	jobposition.SetRulesService(rulesService)
	competency_type.SetRulesService(rulesService)
	matrix.SetRulesService(rulesService)
	role.SetRulesService(rulesService)

	server := server.NewServer(rulesService)

	// Create a done channel to signal when the shutdown is complete
	done := make(chan bool, 1)

	// Run graceful shutdown in a separate goroutine
	go gracefulShutdown(server, rulesService, done)

	err := server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		panic(fmt.Sprintf("http server error: %s", err))
	}

	// Wait for the graceful shutdown to complete
	<-done
	log.Println("Graceful shutdown complete.")
}
