//go:build unit

package competency

import (
	"Automated-Scheduling-Project/internal/database/models"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// helpers
func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	gormLogger := logger.New(&testingLogger{t}, logger.Config{
		SlowThreshold: 0,
		LogLevel:      logger.Silent,
	})
	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{Logger: gormLogger})
	require.NoError(t, err)
	return gormDB, mock
}
type testingLogger struct{ t *testing.T }
func (l *testingLogger) Printf(format string, args ...interface{}) { l.t.Logf(format, args...) }

func ctxWithJSON(t *testing.T, db *gorm.DB, method string, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	jsonBody := []byte{}
	if body != nil {
		var err error
		jsonBody, err = json.Marshal(body)
		require.NoError(t, err)
	}
	req, err := http.NewRequest(method, path, bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	DB = db
	return c, rec
}

// tests

func TestGetCompetencyDefinitionByIDHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	compID := 1

	t.Run("Success", func(t *testing.T) {
		rows := sqlmock.NewRows([]string{"competency_id", "competency_name"}).AddRow(compID, "Test Comp")
		mock.ExpectQuery(regexp.QuoteMeta(
			`SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1 ORDER BY "competency_definitions"."competency_id" LIMIT $2`)).
			WithArgs(compID, 1).WillReturnRows(rows)

		mock.ExpectQuery(regexp.QuoteMeta(
			`SELECT * FROM "competency_prerequisites" WHERE "competency_prerequisites"."competency_id" = $1`)).
			WithArgs(compID).
			WillReturnRows(sqlmock.NewRows([]string{"competency_id"}))

		c, rec := ctxWithJSON(t, db, http.MethodGet, fmt.Sprintf("/api/competencies/%d", compID), nil)
		c.Params = gin.Params{gin.Param{Key: "competencyID", Value: fmt.Sprint(compID)}}
		GetCompetencyDefinitionByIDHandler(c)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.NoError(t, mock.ExpectationsWereMet())
	})
}


func TestUpdateCompetencyDefinitionHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	compID := 1
	isActive := false
	expiry := 12

	req := models.UpdateCompetencyRequest{
		CompetencyName:     "Updated Go Name",
		Description:        "A new description",
		CompetencyTypeName: "Programming",
		ExpiryPeriodMonths: &expiry,
		IsActive:           &isActive,
	}

	t.Run("Success", func(t *testing.T) {
		mockSource := "Original Source"
		mockCreationDate := time.Now()
		
		mock.ExpectQuery(regexp.QuoteMeta(
			`SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1 ORDER BY "competency_definitions"."competency_id" LIMIT $2`)).
			WithArgs(compID, 1).
			WillReturnRows(sqlmock.NewRows([]string{"competency_id", "source", "creation_date"}).
				AddRow(compID, mockSource, mockCreationDate))

		mock.ExpectBegin()
		mock.ExpectExec(regexp.QuoteMeta(
			`UPDATE "competency_definitions" SET "competency_name"=$1,"description"=$2,"competency_type_name"=$3,"source"=$4,"expiry_period_months"=$5,"is_active"=$6,"creation_date"=$7 WHERE "competency_id" = $8`)).
			WithArgs(
				req.CompetencyName,
				req.Description,
				req.CompetencyTypeName,
				mockSource,
				*req.ExpiryPeriodMonths,
				*req.IsActive,
				mockCreationDate,
				compID,
			).
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectCommit()

		c, rec := ctxWithJSON(t, db, http.MethodPut, fmt.Sprintf("/api/competencies/%d", compID), req)
		c.Params = gin.Params{gin.Param{Key: "competencyID", Value: fmt.Sprint(compID)}}
		UpdateCompetencyDefinitionHandler(c)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestCreateCompetencyDefinitionHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	isActive := true
	req := models.CreateCompetencyRequest{
		CompetencyName: "Go Programming",
		IsActive:       &isActive,
		Source:         "Custom",
	}

	t.Run("Success", func(t *testing.T) {
		mock.ExpectBegin()
		mock.ExpectQuery(regexp.QuoteMeta(
			`INSERT INTO "competency_definitions" ("competency_name","description","competency_type_name","source","expiry_period_months","is_active","creation_date") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "competency_id"`)).
			WithArgs(req.CompetencyName, req.Description, req.CompetencyTypeName, req.Source, nil, *req.IsActive, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"competency_id"}).AddRow(1))
		mock.ExpectCommit()
		c, rec := ctxWithJSON(t, db, http.MethodPost, "/api/competencies/", req)
		CreateCompetencyDefinitionHandler(c)
		require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestDeleteCompetencyDefinitionHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	compID := 1
	t.Run("Success", func(t *testing.T) {
		mock.ExpectBegin()
		mock.ExpectExec(regexp.QuoteMeta(
			`UPDATE "competency_definitions" SET "is_active"=$1 WHERE competency_id = $2`)).
			WithArgs(false, compID).
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectCommit()
		c, rec := ctxWithJSON(t, db, http.MethodDelete, fmt.Sprintf("/api/competencies/%d", compID), nil)
		c.Params = gin.Params{gin.Param{Key: "competencyID", Value: fmt.Sprint(compID)}}
		DeleteCompetencyDefinitionHandler(c)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestRemovePrerequisiteHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	compID := 1
	prereqID := 2
	t.Run("Success", func(t *testing.T) {
		mock.ExpectBegin()
		mock.ExpectExec(regexp.QuoteMeta(
			`DELETE FROM "competency_prerequisites" WHERE competency_id = $1 AND prerequisite_competency_id = $2`)).
			WithArgs(fmt.Sprint(compID), fmt.Sprint(prereqID)).
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectCommit()
		path := fmt.Sprintf("/api/competencies/%d/prerequisites/%d", compID, prereqID)
		c, rec := ctxWithJSON(t, db, http.MethodDelete, path, nil)
		c.Params = gin.Params{
			{Key: "competencyID", Value: fmt.Sprint(compID)},
			{Key: "prerequisiteID", Value: fmt.Sprint(prereqID)},
		}
		RemovePrerequisiteHandler(c)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.NoError(t, mock.ExpectationsWereMet())
	})
}