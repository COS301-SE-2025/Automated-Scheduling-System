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
	"Automated-Scheduling-Project/internal/matrix"
	"Automated-Scheduling-Project/internal/server"
	"Automated-Scheduling-Project/internal/user"
)

func gracefulShutdown(apiServer *http.Server, done chan bool) {
	// Create context that listens for the interrupt signal from the OS.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Listen for the interrupt signal.
	<-ctx.Done()

	log.Println("shutting down gracefully, press Ctrl+C again to force")
	stop() // Allow Ctrl+C to force shutdown

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

	auth.DB = dbConnection
	user.DB = dbConnection
	event.DB = dbConnection
	competency.DB = dbConnection
	matrix.DB = dbConnection
	competency_type.DB = dbConnection


	server := server.NewServer()

	// Create a done channel to signal when the shutdown is complete
	done := make(chan bool, 1)

	// Run graceful shutdown in a separate goroutine
	go gracefulShutdown(server, done)

	err := server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		panic(fmt.Sprintf("http server error: %s", err))
	}

	// Wait for the graceful shutdown to complete
	<-done
	log.Println("Graceful shutdown complete.")
}
