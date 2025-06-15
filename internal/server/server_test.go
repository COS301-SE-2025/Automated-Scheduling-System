package server

import (
	"Automated-Scheduling-Project/internal/auth"

	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type mockDBService struct {
	db *gorm.DB
}

func (m *mockDBService) Gorm() *gorm.DB {
	return m.db
}

func (m *mockDBService) Health() map[string]string {
	return map[string]string{"status": "up", "message": "test"}
}

func (m *mockDBService) Close() error {
	sqlDB, _ := m.db.DB()
	return sqlDB.Close()
}

func setupTestServer(t *testing.T) http.Handler {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&auth.User{})
	require.NoError(t, err)

	s := &Server{
		db: &mockDBService{db: db},
	}

	return s.RegisterRoutes()
}
