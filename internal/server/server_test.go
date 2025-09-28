package server

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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

	err = db.AutoMigrate(&gen_models.Employee{}, &gen_models.User{})
	require.NoError(t, err)

	s := &Server{
		db: &mockDBService{db: db},
	}

	return s.RegisterRoutes()
}

func TestHealthRoute(t *testing.T) {
	handler := setupTestServer(t)

	req, _ := http.NewRequest("GET", "/health", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
}

func TestHealthRoute_Body(t *testing.T) {
	handler := setupTestServer(t)
	req, _ := http.NewRequest("GET", "/health", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)
	var body map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	require.Equal(t, "up", body["status"])
}

func TestCORS_NotProduction_NoHeader(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	handler := setupTestServer(t)
	req, _ := http.NewRequest("GET", "/", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if v := rr.Header().Get("Access-Control-Allow-Origin"); v != "" && v != "*" {
		t.Fatalf("unexpected CORS header value in non-production: %s", v)
	}
}

func TestCORS_Production_AllowedOrigin(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	handler := setupTestServer(t)
	req, _ := http.NewRequest("GET", "/", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	require.Equal(t, "http://localhost:5173", rr.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_Production_DisallowedOrigin(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	handler := setupTestServer(t)
	req, _ := http.NewRequest("GET", "/", nil)
	req.Header.Set("Origin", "https://evil.example")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	// gin-contrib/cors will echo allowed origins only; disallowed results in no header
	if hv := rr.Header().Get("Access-Control-Allow-Origin"); hv != "" && strings.Contains(hv, "evil") {
		t.Fatalf("expected no CORS header for disallowed origin, got %s", hv)
	}
}
