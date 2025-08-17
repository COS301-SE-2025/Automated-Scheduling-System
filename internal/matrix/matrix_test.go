//go:build unit

package matrix

import (
	"Automated-Scheduling-Project/internal/database/models"
	"bytes"
	"encoding/json"
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

// --- Test Setup & Helpers ---

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	return gormDB, mock
}

func ctxWithJSON(t *testing.T, db *gorm.DB, method string, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	jsonBody, err := json.Marshal(body)
	require.NoError(t, err)

	req, err := http.NewRequest(method, path, bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Set the database
	DB = db

	return c, w
}

func TestCreateJobMatrixEntryHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	// Mock request body
	requestBody := models.CreateJobMatrixRequest{
		PositionMatrixCode: "POS001",
		CompetencyID:       1,
		RequirementStatus:  "Required",
		Notes:              "Critical competency",
	}

	// Mock the validation queries first (these happen before the insert)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "job_positions" WHERE position_matrix_code = $1`)).
		WithArgs("POS001").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "competency_definitions" WHERE competency_id = $1`)).
		WithArgs(1).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	// Mock database insert
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "custom_job_matrix"`)).
		WithArgs(
			requestBody.PositionMatrixCode,
			requestBody.CompetencyID,
			requestBody.RequirementStatus,
			requestBody.Notes,
			sqlmock.AnyArg(), // createdBy
			sqlmock.AnyArg(), // creationDate
		).
		WillReturnRows(sqlmock.NewRows([]string{"custom_matrix_id"}).AddRow(1))
	mock.ExpectCommit()

	// Create context and perform request
	c, w := ctxWithJSON(t, db, "POST", "/job-requirements", requestBody)
	c.Set("email", "admin@example.com") // Set email for createdBy

	CreateJobMatrixEntryHandler(c)

	// Assertions
	require.Equal(t, http.StatusCreated, w.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetJobMatrixEntriesHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	// Mock the main query first
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "custom_job_matrix"`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"custom_matrix_id", "position_matrix_code", "competency_id",
			"requirement_status", "notes", "created_by", "creation_date",
		}).AddRow(1, "POS001", 1, "Required", "Critical competency", "admin", time.Now()))

	// Mock the Preload queries (competency happens first, then job position)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1`)).
		WithArgs(1).
		WillReturnRows(sqlmock.NewRows([]string{"competency_id", "competency_name"}).
			AddRow(1, "Test Competency"))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "job_positions" WHERE "job_positions"."position_matrix_code" = $1`)).
		WithArgs("POS001").
		WillReturnRows(sqlmock.NewRows([]string{"position_matrix_code", "position_title"}).
			AddRow("POS001", "Test Position"))

	// Create context and perform request
	c, w := ctxWithJSON(t, db, "GET", "/job-requirements", nil)

	GetJobMatrixEntriesHandler(c)

	// Assertions
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateJobMatrixEntryHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	// Mock request body
	requestBody := models.UpdateJobMatrixRequest{
		RequirementStatus: "Optional",
		Notes:             "Updated notes",
	}

	// Mock the update operation
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "custom_job_matrix" SET "requirement_status"=$1,"notes"=$2 WHERE custom_matrix_id = $3`)).
		WithArgs("Optional", "Updated notes", "1").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Mock the fetch for updated entry (with preloads)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "custom_job_matrix" WHERE "custom_job_matrix"."custom_matrix_id" = $1 ORDER BY "custom_job_matrix"."custom_matrix_id" LIMIT $2`)).
		WithArgs("1", 1).
		WillReturnRows(sqlmock.NewRows([]string{
			"custom_matrix_id", "position_matrix_code", "competency_id",
			"requirement_status", "notes", "created_by", "creation_date",
		}).AddRow(1, "POS001", 1, "Optional", "Updated notes", "admin", time.Now()))

	// Mock the Preload queries (competency happens first, then job position)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1`)).
		WithArgs(1).
		WillReturnRows(sqlmock.NewRows([]string{"competency_id", "competency_name"}).
			AddRow(1, "Test Competency"))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "job_positions" WHERE "job_positions"."position_matrix_code" = $1`)).
		WithArgs("POS001").
		WillReturnRows(sqlmock.NewRows([]string{"position_matrix_code", "position_title"}).
			AddRow("POS001", "Test Position"))

	// Create context and perform request
	c, w := ctxWithJSON(t, db, "PUT", "/job-requirements/1", requestBody)
	c.Params = []gin.Param{{Key: "matrixID", Value: "1"}}

	UpdateJobMatrixEntryHandler(c)

	// Assertions
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteJobMatrixEntryHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	// Mock database expectations
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM "custom_job_matrix"`)).
		WithArgs("1").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Create context and perform request
	c, w := ctxWithJSON(t, db, "DELETE", "/job-requirements/1", nil)
	c.Params = []gin.Param{{Key: "matrixID", Value: "1"}}

	DeleteJobMatrixEntryHandler(c)

	// Assertions
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, mock.ExpectationsWereMet())

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	require.Equal(t, "Job requirement entry deleted successfully", response["message"])
}
