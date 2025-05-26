package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"
    "gorm.io/gorm"
    "gorm.io/driver/postgres"
	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/joho/godotenv/autoload"
)

// Service represents a service that interacts with a database.
type Service interface {
    Gorm() *gorm.DB
    Health() map[string]string
    Close() error
}

type service struct {
    db *gorm.DB
}

var (
	database   = os.Getenv("BLUEPRINT_DB_DATABASE")
	password   = os.Getenv("BLUEPRINT_DB_PASSWORD")
	username   = os.Getenv("BLUEPRINT_DB_USERNAME")
	port       = os.Getenv("BLUEPRINT_DB_PORT")
	host       = os.Getenv("BLUEPRINT_DB_HOST")
	schema     = os.Getenv("BLUEPRINT_DB_SCHEMA")
	dbInstance *service
)

func (s *service) Gorm() *gorm.DB{
    return s.db
}

func New() Service {
	// Reuse Connection
	if dbInstance != nil {
		return dbInstance
	}
    dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s search_path=%s sslmode=disable",
    host,
    username,
    password,
    database,
    port,
    schema,
)
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err!= nil{
        log.Fatalf("Failed to connect to DB: %v", err)
    }
    dbInstance = &service{db:db}
	return dbInstance
}

// Health checks the health of the database connection by pinging the database.
// It returns a map with keys indicating various health statistics.
func (s *service) Health() map[string]string {
	stats := make(map[string]string)

	sqlDB, err := s.db.DB()
	if err != nil {
		stats["status"] = "error"
		stats["error"] = "failed to get sql.DB from GORM"
		return stats
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	// Ping the database
	if err := sqlDB.PingContext(ctx); err != nil {
		stats["status"] = "down"
		stats["error"] = fmt.Sprintf("db down: %v", err)
		return stats
	}

	// Database is up, collect stats
	dbStats := sqlDB.Stats()
	stats["status"] = "up"
	stats["message"] = "Database is healthy"
	stats["open_connections"] = strconv.Itoa(dbStats.OpenConnections)
	stats["in_use"] = strconv.Itoa(dbStats.InUse)
	stats["idle"] = strconv.Itoa(dbStats.Idle)
	stats["wait_count"] = strconv.FormatInt(dbStats.WaitCount, 10)
	stats["wait_duration"] = dbStats.WaitDuration.String()
	stats["max_idle_closed"] = strconv.FormatInt(dbStats.MaxIdleClosed, 10)
	stats["max_lifetime_closed"] = strconv.FormatInt(dbStats.MaxLifetimeClosed, 10)

	// Additional health warnings
	if dbStats.OpenConnections > 40 {
		stats["message"] = "The database is experiencing heavy load"
	}
	if dbStats.WaitCount > 1000 {
		stats["message"] = "High wait events detected, possible bottlenecks"
	}
	if dbStats.MaxIdleClosed > int64(dbStats.OpenConnections)/2 {
		stats["message"] = "Many idle connections closed — check pool settings"
	}
	if dbStats.MaxLifetimeClosed > int64(dbStats.OpenConnections)/2 {
		stats["message"] = "Connections closed due to max lifetime — consider tuning"
	}

	return stats}

// Close closes the database connection.
// It logs a message indicating the disconnection from the specific database.
// If the connection is successfully closed, it returns nil.
// If an error occurs while closing the connection, it returns the error.
func (s *service) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		log.Printf("Failed to retrieve sql.DB for closing: %v", err)
		return err
	}

	log.Printf("Disconnected from database: %s", database)
	return sqlDB.Close()}
