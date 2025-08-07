//go:build unit

package matrix

import (
	"Automated-Scheduling-Project/internal/database/models"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Helper to create a mock GORM DB and sqlmock instance
func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	gormLogger := logger.New(&testingLogger{t}, logger.Config{
		SlowThreshold: 0,
		LogLevel:      logger.Info,
	})

	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{Logger: gormLogger})
	require.NoError(t, err)
	return gormDB, mock
}

// Custom logger for GORM to output to the testing framework
type testingLogger struct{ t *testing.T }

func (l *testingLogger) Printf(format string, args ...interface{}) { l.t.Logf(format, args...) }

// Helper to create a Gin context for testing, with a JSON body
func ctxWithJSON(t *testing.T, db *gorm.DB, method string, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	var req *http.Request
	var err error

	if body != nil {
		jsonBody, err := json.Marshal(body)
		require.NoError(t, err)
		req, err = http.NewRequest(method, path, bytes.NewBuffer(jsonBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, err = http.NewRequest(method, path, nil)
		require.NoError(t, err)
	}

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	DB = db // Set the global DB variable used by the handlers

	return c, rec
}

const (
	testEmployeeNumber  = "E123"
	testPositionCode    = "DEV-01"
	testCompetencyID    = 1
	testMatrixID        = 42
	testCreatorEmail    = "test.admin@example.com"
	testNonExistentComp = 999
)

// === Test CreateJobMatrixEntryHandler ===

func TestCreateJobMatrixEntryHandler_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	employeeNum := testEmployeeNumber
	createReq := models.CreateJobMatrixRequest{
		EmployeeNumber:     &employeeNum,
		PositionMatrixCode: testPositionCode,
		CompetencyID:       testCompetencyID,
		RequirementStatus:  "Required",
		Notes:              "Initial entry",
	}

	// Mock competency lookup
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1 ORDER BY "competency_definitions"."competency_id" LIMIT $2`)).
		WithArgs(testCompetencyID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"competency_id", "competency_name"}).AddRow(testCompetencyID, "Test Competency"))

	// Mock matrix entry creation
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(
		`INSERT INTO "custom_job_matrix" ("employee_number","position_matrix_code","competency_id","requirement_status","notes","created_by","creation_date") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "custom_matrix_id"`)).
		WithArgs(createReq.EmployeeNumber, createReq.PositionMatrixCode, createReq.CompetencyID, createReq.RequirementStatus, createReq.Notes, testCreatorEmail, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"custom_matrix_id"}).AddRow(testMatrixID))
	mock.ExpectCommit()

	c, rec := ctxWithJSON(t, db, http.MethodPost, "/api/job-matrix/", createReq)
	c.Set("email", testCreatorEmail) // Set email from auth middleware

	CreateJobMatrixEntryHandler(c)

	require.Equal(t, http.StatusCreated, rec.Code)
	var createdEntry models.CustomJobMatrix
	err := json.Unmarshal(rec.Body.Bytes(), &createdEntry)
	require.NoError(t, err)
	require.Equal(t, testMatrixID, createdEntry.CustomMatrixID)
	require.Equal(t, testCreatorEmail, createdEntry.CreatedBy)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateJobMatrixEntryHandler_CompetencyNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	createReq := models.CreateJobMatrixRequest{
		PositionMatrixCode: testPositionCode,
		CompetencyID:       testNonExistentComp,
		RequirementStatus:  "Required",
	}

	// Mock competency lookup to fail
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1 ORDER BY "competency_definitions"."competency_id" LIMIT $2`)).
		WithArgs(testNonExistentComp, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	c, rec := ctxWithJSON(t, db, http.MethodPost, "/api/job-matrix/", createReq)

	CreateJobMatrixEntryHandler(c)

	require.Equal(t, http.StatusNotFound, rec.Code)
	require.Contains(t, rec.Body.String(), "Competency with the specified ID not found")
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateJobMatrixEntryHandler_InvalidRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := newMockDB(t) // No mock expectations, as DB shouldn't be hit

	// Missing PositionMatrixCode, which is required
	invalidReq := map[string]interface{}{"competencyId": 1}

	c, rec := ctxWithJSON(t, db, http.MethodPost, "/api/job-matrix/", invalidReq)

	CreateJobMatrixEntryHandler(c)

	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Contains(t, rec.Body.String(), "Invalid request data")
}

// === Test GetJobMatrixEntriesHandler ===

func TestGetJobMatrixEntriesHandler_GetAll(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	rows := sqlmock.NewRows([]string{"custom_matrix_id", "employee_number", "position_matrix_code", "competency_id"}).
		AddRow(1, "E001", "POS01", 1).
		AddRow(2, "E002", "POS02", 2)

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_job_matrix"`)).
		WillReturnRows(rows)

	c, rec := ctxWithJSON(t, db, http.MethodGet, "/api/job-matrix/", nil)

	GetJobMatrixEntriesHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	var entries []models.CustomJobMatrix
	err := json.Unmarshal(rec.Body.Bytes(), &entries)
	require.NoError(t, err)
	require.Len(t, entries, 2)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetJobMatrixEntriesHandler_WithFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	rows := sqlmock.NewRows([]string{"custom_matrix_id", "employee_number", "position_matrix_code", "competency_id"}).
		AddRow(1, testEmployeeNumber, testPositionCode, 1)

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_job_matrix" WHERE employee_number = $1 AND position_matrix_code = $2`)).
		WithArgs(testEmployeeNumber, testPositionCode).
		WillReturnRows(rows)

	url := fmt.Sprintf("/api/job-matrix/?employeeNumber=%s&positionMatrixCode=%s", testEmployeeNumber, testPositionCode)
	c, rec := ctxWithJSON(t, db, http.MethodGet, url, nil)

	GetJobMatrixEntriesHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	var entries []models.CustomJobMatrix
	err := json.Unmarshal(rec.Body.Bytes(), &entries)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	require.Equal(t, *entries[0].EmployeeNumber, testEmployeeNumber)
	require.Equal(t, entries[0].PositionMatrixCode, testPositionCode)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetJobMatrixEntriesHandler_DBError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_job_matrix"`)).
		WillReturnError(errors.New("db connection failed"))

	c, rec := ctxWithJSON(t, db, http.MethodGet, "/api/job-matrix/", nil)

	GetJobMatrixEntriesHandler(c)

	require.Equal(t, http.StatusInternalServerError, rec.Code)
	require.Contains(t, rec.Body.String(), "Failed to fetch job matrix entries")
	require.NoError(t, mock.ExpectationsWereMet())
}

// === Test UpdateJobMatrixEntryHandler ===

func TestUpdateJobMatrixEntryHandler_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	updateReq := models.UpdateJobMatrixRequest{
		RequirementStatus: "Completed",
		Notes:             "Updated notes.",
	}

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "custom_job_matrix" SET "requirement_status"=$1,"notes"=$2 WHERE custom_matrix_id = $3`)).
		WithArgs(updateReq.RequirementStatus, updateReq.Notes, fmt.Sprintf("%d", testMatrixID)).
		WillReturnResult(sqlmock.NewResult(1, 1)) // 1 row updated
	mock.ExpectCommit()

	url := fmt.Sprintf("/api/job-matrix/%d", testMatrixID)
	c, rec := ctxWithJSON(t, db, http.MethodPut, url, updateReq)
	c.Params = gin.Params{gin.Param{Key: "matrixID", Value: fmt.Sprintf("%d", testMatrixID)}}

	UpdateJobMatrixEntryHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), "Matrix entry updated successfully")
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateJobMatrixEntryHandler_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	updateReq := models.UpdateJobMatrixRequest{RequirementStatus: "Completed"}

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "custom_job_matrix" SET "requirement_status"=$1 WHERE custom_matrix_id = $2`)).
		WithArgs(updateReq.RequirementStatus, fmt.Sprintf("%d", testMatrixID)).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	url := fmt.Sprintf("/api/job-matrix/%d", testMatrixID)
	c, rec := ctxWithJSON(t, db, http.MethodPut, url, updateReq)
	c.Params = gin.Params{gin.Param{Key: "matrixID", Value: fmt.Sprintf("%d", testMatrixID)}}

	UpdateJobMatrixEntryHandler(c)

	require.Equal(t, http.StatusNotFound, rec.Code)
	require.Contains(t, rec.Body.String(), "Matrix entry not found")
	require.NoError(t, mock.ExpectationsWereMet())
}

// === Test DeleteJobMatrixEntryHandler ===

func TestDeleteJobMatrixEntryHandler_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`DELETE FROM "custom_job_matrix" WHERE "custom_job_matrix"."custom_matrix_id" = $1`)).
		WithArgs(fmt.Sprintf("%d", testMatrixID)).
		WillReturnResult(sqlmock.NewResult(1, 1)) // 1 row deleted
	mock.ExpectCommit()

	url := fmt.Sprintf("/api/job-matrix/%d", testMatrixID)
	c, rec := ctxWithJSON(t, db, http.MethodDelete, url, nil)
	c.Params = gin.Params{gin.Param{Key: "matrixID", Value: fmt.Sprintf("%d", testMatrixID)}}

	DeleteJobMatrixEntryHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), "Matrix entry deleted successfully")
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteJobMatrixEntryHandler_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`DELETE FROM "custom_job_matrix" WHERE "custom_job_matrix"."custom_matrix_id" = $1`)).
		WithArgs(fmt.Sprintf("%d", testMatrixID)).
		WillReturnResult(sqlmock.NewResult(0, 0)) // 0 rows affected
	mock.ExpectCommit()

	url := fmt.Sprintf("/api/job-matrix/%d", testMatrixID)
	c, rec := ctxWithJSON(t, db, http.MethodDelete, url, nil)
	c.Params = gin.Params{gin.Param{Key: "matrixID", Value: fmt.Sprintf("%d", testMatrixID)}}

	DeleteJobMatrixEntryHandler(c)

	require.Equal(t, http.StatusNotFound, rec.Code)
	require.Contains(t, rec.Body.String(), "Matrix entry not found")
	require.NoError(t, mock.ExpectationsWereMet())
}