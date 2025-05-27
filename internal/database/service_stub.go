//go:build unit
// +build unit

package database

import "gorm.io/gorm"

// Service mirrors the production interface so imports compile.
type Service interface {
	Gorm() *gorm.DB
	Health() map[string]string
	Close() error
}

// stubService satisfies Service without touching Postgres.
type stubService struct{ db *gorm.DB }

func (s *stubService) Gorm() *gorm.DB            { return s.db }
func (s *stubService) Health() map[string]string { return map[string]string{"status": "stub"} }
func (s *stubService) Close() error              { return nil }

// New is called from auth/handler.go at package-initialisation time.
func New() Service {
	return &stubService{}
}

