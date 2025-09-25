//go:build unit

package employment_history

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "net/http/httptest"
    "regexp"
    "testing"
    "time"

    "Automated-Scheduling-Project/internal/database/models"

    "github.com/DATA-DOG/go-sqlmock"
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/require"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

/* ---------- Helpers ---------- */

type testingLogger struct{ t *testing.T }
func (l *testingLogger) Printf(format string, args ...interface{}) { l.t.Logf(format, args...) }

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
    db, mock, err := sqlmock.New()
    require.NoError(t, err)
    gormLogger := logger.New(&testingLogger{t}, logger.Config{
        SlowThreshold: time.Millisecond,
        LogLevel:      logger.Silent,
    })
    gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{Logger: gormLogger})
    require.NoError(t, err)
    return gormDB, mock
}

func ctxWithJSON(t *testing.T, db *gorm.DB, method, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
    var buf []byte
    var err error
    if body != nil {
        buf, err = json.Marshal(body)
        require.NoError(t, err)
    }
    req, err := http.NewRequest(method, path, bytes.NewBuffer(buf))
    require.NoError(t, err)
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(rec)
    c.Request = req
    DB = db
    return c, rec
}

func mustDate(t *testing.T, s string) time.Time {
    d, err := time.Parse("2006-01-02", s)
    require.NoError(t, err)
    return d
}

/* ---------- Tests ---------- */

func TestCreateEmploymentHistoryHandler_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    req := models.CreateEmploymentHistoryRequest{
        EmployeeNumber:     "E123",
        PositionMatrixCode: "POS-A",
        StartDate:          "2025-01-01",
        EmploymentType:     nil,
    }

    start := mustDate(t, req.StartDate)

    mock.ExpectBegin()
    mock.ExpectQuery(regexp.QuoteMeta(
        `INSERT INTO "employment_history" ("employee_number","position_matrix_code","start_date","end_date","employment_type","notes") VALUES ($1,$2,$3,$4,$5,$6) RETURNING "employment_id"`)).
        WithArgs(req.EmployeeNumber, req.PositionMatrixCode, start, nil, "Primary", "").
        WillReturnRows(sqlmock.NewRows([]string{"employment_id"}).AddRow(10))
    mock.ExpectCommit()

    c, rec := ctxWithJSON(t, db, http.MethodPost, "/api/employment-history", req)
    CreateEmploymentHistoryHandler(c)

    require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
    require.Contains(t, rec.Body.String(), `"employmentID":10`)
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateEmploymentHistoryHandler_InvalidDate(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, _ := newMockDB(t)

    req := models.CreateEmploymentHistoryRequest{
        EmployeeNumber:     "E123",
        PositionMatrixCode: "POS-A",
        StartDate:          "BADDATE",
    }
    c, rec := ctxWithJSON(t, db, http.MethodPost, "/api/employment-history", req)
    CreateEmploymentHistoryHandler(c)
    require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestGetEmploymentHistoryHandler_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    id := 5
    start := mustDate(t, "2025-01-01")
    rows := sqlmock.NewRows([]string{
        "employment_id", "employee_number", "position_matrix_code", "start_date",
        "end_date", "employment_type", "notes",
    }).AddRow(id, "E1", "P1", start, nil, "Primary", "")

    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "employment_history" WHERE "employment_history"."employment_id" = $1 ORDER BY "employment_history"."employment_id" LIMIT $2`)).
        WithArgs(id, 1).
        WillReturnRows(rows)

    c, rec := ctxWithJSON(t, db, http.MethodGet, fmt.Sprintf("/api/employment-history/%d", id), nil)
    c.Params = gin.Params{gin.Param{Key: "employmentID", Value: fmt.Sprint(id)}}
    GetEmploymentHistoryHandler(c)

    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.Contains(t, rec.Body.String(), `"employmentID":5`)
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestListEmploymentHistoryHandler_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    s1 := mustDate(t, "2025-02-01")
    s2 := mustDate(t, "2025-01-01")

    // Count
    mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "employment_history"`)).
        WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))
    // Data
    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "employment_history" ORDER BY employment_id DESC LIMIT $1`)).
        WithArgs(50).
        WillReturnRows(sqlmock.NewRows([]string{
            "employment_id", "employee_number", "position_matrix_code", "start_date",
            "end_date", "employment_type", "notes",
        }).AddRow(2, "E1", "P2", s1, nil, "Primary", "").
            AddRow(1, "E1", "P1", s2, nil, "Primary", ""),
        )

    c, rec := ctxWithJSON(t, db, http.MethodGet, "/api/employment-history", nil)
    ListEmploymentHistoryHandler(c)

    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.Contains(t, rec.Body.String(), `"total":2`)
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestListEmploymentHistoryByEmployeeHandler_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    emp := "E9"
    start := mustDate(t, "2025-01-01")
    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "employment_history" WHERE employee_number = $1 ORDER BY start_date DESC, employment_id DESC`)).
        WithArgs(emp).
        WillReturnRows(sqlmock.NewRows([]string{
            "employment_id", "employee_number", "position_matrix_code", "start_date",
            "end_date", "employment_type", "notes",
        }).AddRow(11, emp, "POS1", start, nil, "Primary", ""),
        )

    c, rec := ctxWithJSON(t, db, http.MethodGet, fmt.Sprintf("/api/employees/%s/employment-history", emp), nil)
    c.Params = gin.Params{gin.Param{Key: "employeeNumber", Value: emp}}
    ListEmploymentHistoryByEmployeeHandler(c)

    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.Contains(t, rec.Body.String(), `"employmentID":11`)
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateEmploymentHistoryHandler_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    id := 21
    start := mustDate(t, "2025-03-01")
    // First (load)
    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "employment_history" WHERE "employment_history"."employment_id" = $1 ORDER BY "employment_history"."employment_id" LIMIT $2`)).
        WithArgs(id, 1).
        WillReturnRows(sqlmock.NewRows([]string{
            "employment_id", "employee_number", "position_matrix_code", "start_date",
            "end_date", "employment_type", "notes",
        }).AddRow(id, "E5", "POS-X", start, nil, "Primary", "Initial"),
        )

    req := models.UpdateEmploymentHistoryRequest{
        EndDate:        strPtr("2025-06-01"),
        EmploymentType: strPtr("Secondary"),
        Notes:          strPtr("Updated notes"),
    }
    end := mustDate(t, "2025-06-01")

    mock.ExpectBegin()
    mock.ExpectExec(regexp.QuoteMeta(
        `UPDATE "employment_history" SET "employee_number"=$1,"position_matrix_code"=$2,"start_date"=$3,"end_date"=$4,"employment_type"=$5,"notes"=$6 WHERE "employment_id" = $7`)).
        WithArgs("E5", "POS-X", start, end, "Secondary", "Updated notes", id).
        WillReturnResult(sqlmock.NewResult(0, 1))
    mock.ExpectCommit()

    c, rec := ctxWithJSON(t, db, http.MethodPut, fmt.Sprintf("/api/employment-history/%d", id), req)
    c.Params = gin.Params{gin.Param{Key: "employmentID", Value: fmt.Sprint(id)}}
    UpdateEmploymentHistoryHandler(c)

    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.Contains(t, rec.Body.String(), `"employmentID":21`)
    require.Contains(t, rec.Body.String(), `"employmentType":"Secondary"`)
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteEmploymentHistoryHandler_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)
    id := 30

    mock.ExpectBegin()
    mock.ExpectExec(regexp.QuoteMeta(
        `DELETE FROM "employment_history" WHERE "employment_history"."employment_id" = $1`)).
        WithArgs(id).
        WillReturnResult(sqlmock.NewResult(0, 1))
    mock.ExpectCommit()

    c, rec := ctxWithJSON(t, db, http.MethodDelete, fmt.Sprintf("/api/employment-history/%d", id), nil)
    c.Params = gin.Params{gin.Param{Key: "employmentID", Value: fmt.Sprint(id)}}
    DeleteEmploymentHistoryHandler(c)

    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.Contains(t, rec.Body.String(), `"message"`)
    require.NoError(t, mock.ExpectationsWereMet())
}

/* ---------- Helpers ---------- */

func strPtr(s string) *string { return &s }