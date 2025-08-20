//go:build unit

package jobposition

import (
    "bytes"
    "encoding/json"
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

func TestGetAllJobPositionsHandler_Unit(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    rows := sqlmock.NewRows([]string{"position_matrix_code", "job_title", "description", "is_active"}).
        AddRow("DEV-001", "Developer", "Writes code", true).
        AddRow("QA-001", "QA Engineer", "Tests software", false)

    mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "job_positions" ORDER BY job_title`)).
        WillReturnRows(rows)

    c, rec := ctxWithJSON(t, db, http.MethodGet, "/api/job-positions", nil)
    GetAllJobPositionsHandler(c)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateJobPositionHandler_Unit(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    req := CreateJobPositionRequest{
        PositionMatrixCode: "DEV-002",
        JobTitle:           "Sr Developer",
        Description:        "Builds features",
    }

    mock.ExpectBegin()
    mock.ExpectExec(regexp.QuoteMeta(
        `INSERT INTO "job_positions" ("position_matrix_code","job_title","description","is_active","creation_date") VALUES ($1,$2,$3,$4,$5)`)).
        WithArgs(req.PositionMatrixCode, req.JobTitle, req.Description, true, sqlmock.AnyArg()).
        WillReturnResult(sqlmock.NewResult(0, 1))
    mock.ExpectCommit()

    c, rec := ctxWithJSON(t, db, http.MethodPost, "/api/job-positions", req)
    CreateJobPositionHandler(c)
    require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateJobPositionHandler_Unit(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    code := "DEV-003"
    req := UpdateJobPositionRequest{
        JobTitle:    "Lead Developer",
        Description: "Leads dev team",
    }

    // Update
    mock.ExpectBegin()
    mock.ExpectExec(regexp.QuoteMeta(
        `UPDATE "job_positions" SET "job_title"=$1,"description"=$2 WHERE position_matrix_code = $3`)).
        WithArgs(req.JobTitle, req.Description, code).
        WillReturnResult(sqlmock.NewResult(0, 1))
    mock.ExpectCommit()

    // Fetch updated
    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "job_positions" WHERE position_matrix_code = $1 ORDER BY "job_positions"."position_matrix_code" LIMIT $2`)).
        WithArgs(code, 1).
        WillReturnRows(sqlmock.NewRows([]string{"position_matrix_code", "job_title", "description", "is_active"}).
            AddRow(code, req.JobTitle, req.Description, true))

    c, rec := ctxWithJSON(t, db, http.MethodPut, "/api/job-positions/"+code, req)
    c.Params = gin.Params{gin.Param{Key: "positionCode", Value: code}}
    UpdateJobPositionHandler(c)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateJobPositionStatusHandler_Unit(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    code := "DEV-004"
    active := false
    req := UpdateStatusRequest{IsActive: &active}

    // Update status
    mock.ExpectBegin()
    mock.ExpectExec(regexp.QuoteMeta(
        `UPDATE "job_positions" SET "is_active"=$1 WHERE position_matrix_code = $2`)).
        WithArgs(active, code).
        WillReturnResult(sqlmock.NewResult(0, 1))
    mock.ExpectCommit()

    // Fetch updated
    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "job_positions" WHERE position_matrix_code = $1 ORDER BY "job_positions"."position_matrix_code" LIMIT $2`)).
        WithArgs(code, 1).
        WillReturnRows(sqlmock.NewRows([]string{"position_matrix_code", "job_title", "description", "is_active"}).
            AddRow(code, "Any Title", "Any Desc", active))

    c, rec := ctxWithJSON(t, db, http.MethodPut, "/api/job-positions/"+code+"/status", req)
    c.Params = gin.Params{gin.Param{Key: "positionCode", Value: code}}
    UpdateJobPositionStatusHandler(c)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.NoError(t, mock.ExpectationsWereMet())
}