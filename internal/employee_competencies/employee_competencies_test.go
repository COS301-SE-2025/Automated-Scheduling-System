//go:build unit

package employee_competencies

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

// --- helpers ---

type testingLogger struct{ t *testing.T }
func (l *testingLogger) Printf(format string, args ...interface{}) { l.t.Logf(format, args...) }

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

func ctxWithJSON(t *testing.T, db *gorm.DB, method, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
    var b []byte
    var err error
    if body != nil {
        b, err = json.Marshal(body)
        require.NoError(t, err)
    }
    req, err := http.NewRequest(method, path, bytes.NewBuffer(b))
    require.NoError(t, err)
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(rec)
    c.Request = req
    DB = db
    return c, rec
}

// --- tests ---

func TestCreateEmployeeCompetencyHandler_Unit(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    empNum := "E123"
    compID := 10
    achStr := "2025-01-15"
    expiryMonths := 12
    expAch, _ := time.Parse("2006-01-02", achStr)
    expAch = expAch.UTC()
    expExpiry := expAch.AddDate(0, expiryMonths, 0)

    req := models.CreateEmployeeCompetencyRequest{
        EmployeeNumber:  empNum,
        CompetencyID:    compID,
        AchievementDate: &achStr,
        Notes:           "Initial grant",
    }

    t.Run("Success", func(t *testing.T) {
        // Load competency definition
        rowsComp := sqlmock.NewRows([]string{"competency_id", "expiry_period_months"}).
            AddRow(compID, expiryMonths)
        mock.ExpectQuery(regexp.QuoteMeta(
            `SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1 ORDER BY "competency_definitions"."competency_id" LIMIT $2`)).
            WithArgs(compID, 1).
            WillReturnRows(rowsComp)

        // Insert (gorm uses tx)
        mock.ExpectBegin()
        mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "employee_competencies"`)).
            WithArgs(
                req.EmployeeNumber,
                req.CompetencyID,
                expAch,
                expExpiry,
                nil,
                req.Notes,
            ).
            WillReturnRows(sqlmock.NewRows([]string{"employee_competency_id"}).AddRow(100))
        mock.ExpectCommit()

        // Reload (note duplicate WHERE param & extra LIMIT param)
        rowsReload := sqlmock.NewRows([]string{
            "employee_competency_id",
            "employee_number",
            "competency_id",
            "achievement_date",
            "expiry_date",
            "granted_by_schedule_id",
            "notes",
        }).AddRow(100, empNum, compID, expAch, expExpiry, nil, req.Notes)

        mock.ExpectQuery(regexp.QuoteMeta(
            `SELECT * FROM "employee_competencies" WHERE "employee_competencies"."employee_competency_id" = $1 AND "employee_competencies"."employee_competency_id" = $2 ORDER BY "employee_competencies"."employee_competency_id" LIMIT $3`)).
            WithArgs(100, 100, 1).
            WillReturnRows(rowsReload)

        // Preload competency definition (equality form)
        rowsPreload := sqlmock.NewRows([]string{
            "competency_id", "competency_name", "description", "competency_type_name",
            "source", "expiry_period_months", "is_active", "creation_date",
        }).AddRow(compID, "Comp Name", "Desc", "Type", "Source", expiryMonths, true, time.Now())
        mock.ExpectQuery(regexp.QuoteMeta(
            `SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1`)).
            WithArgs(compID).
            WillReturnRows(rowsPreload)

        c, rec := ctxWithJSON(t, db, http.MethodPost, "/api/employee-competencies", req)
        CreateEmployeeCompetencyHandler(c)
        require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
        require.Contains(t, rec.Body.String(), `"employeeCompetencyID":100`)
        require.Contains(t, rec.Body.String(), `"expiryDate":"2026-01-15`)
        require.NoError(t, mock.ExpectationsWereMet())
    })
}

func TestGetEmployeeCompetencyHandler_Unit(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    id := 55
    compID := 7
    empNum := "E999"
    ach := time.Now().UTC().AddDate(0, -1, 0)

    row := sqlmock.NewRows([]string{
        "employee_competency_id",
        "employee_number",
        "competency_id",
        "achievement_date",
        "expiry_date",
        "granted_by_schedule_id",
        "notes",
    }).AddRow(id, empNum, compID, ach, nil, nil, "note")

    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "employee_competencies" WHERE "employee_competencies"."employee_competency_id" = $1 ORDER BY "employee_competencies"."employee_competency_id" LIMIT $2`)).
        WithArgs(id, 1).
        WillReturnRows(row)

    // Preload equality
    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1`)).
        WithArgs(compID).
        WillReturnRows(sqlmock.NewRows([]string{"competency_id"}).AddRow(compID))

    c, rec := ctxWithJSON(t, db, http.MethodGet, fmt.Sprintf("/api/employee-competencies/%d", id), nil)
    c.Params = gin.Params{gin.Param{Key: "employeeCompetencyID", Value: fmt.Sprint(id)}}
    GetEmployeeCompetencyHandler(c)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.Contains(t, rec.Body.String(), `"employeeCompetencyID":55`)
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateEmployeeCompetencyHandler_Unit(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    id := 77
    compID := 3
    empNum := "E500"

    origAch := time.Now().UTC().AddDate(0, -6, 0)
    reqAchStr := "2025-02-01"
    reqExpStr := "2025-12-31"
    reqNotes := "Updated notes"
    scheduleID := 42

    req := models.UpdateEmployeeCompetencyRequest{
        AchievementDate:     &reqAchStr,
        ExpiryDate:          &reqExpStr,
        GrantedByScheduleID: &scheduleID,
        Notes:               &reqNotes,
    }

    // Load existing
    rowsExisting := sqlmock.NewRows([]string{
        "employee_competency_id",
        "employee_number",
        "competency_id",
        "achievement_date",
        "expiry_date",
        "granted_by_schedule_id",
        "notes",
    }).AddRow(id, empNum, compID, origAch, nil, nil, "old")

    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "employee_competencies" WHERE "employee_competencies"."employee_competency_id" = $1 ORDER BY "employee_competencies"."employee_competency_id" LIMIT $2`)).
        WithArgs(id, 1).
        WillReturnRows(rowsExisting)

    newAch, _ := time.Parse("2006-01-02", reqAchStr)
    newAch = newAch.UTC()
    newExp, _ := time.Parse("2006-01-02", reqExpStr)
    newExp = newExp.UTC()

    // UPDATE (GORM updates all columns)
    mock.ExpectBegin()
    mock.ExpectExec(regexp.QuoteMeta(
        `UPDATE "employee_competencies" SET "employee_number"=$1,"competency_id"=$2,"achievement_date"=$3,"expiry_date"=$4,"granted_by_schedule_id"=$5,"notes"=$6 WHERE "employee_competency_id" = $7`)).
        WithArgs(empNum, compID, newAch, newExp, scheduleID, reqNotes, id).
        WillReturnResult(sqlmock.NewResult(0, 1))
    mock.ExpectCommit()

    // Reload (pattern like create reload OR simpler one; accept duplicated condition)
    rowsReload := sqlmock.NewRows([]string{
        "employee_competency_id",
        "employee_number",
        "competency_id",
        "achievement_date",
        "expiry_date",
        "granted_by_schedule_id",
        "notes",
    }).AddRow(id, empNum, compID, newAch, newExp, scheduleID, reqNotes)

    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "employee_competencies" WHERE "employee_competencies"."employee_competency_id" = $1 AND "employee_competencies"."employee_competency_id" = $2 ORDER BY "employee_competencies"."employee_competency_id" LIMIT $3`)).
        WithArgs(id, id, 1).
        WillReturnRows(rowsReload)

    // Preload
    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1`)).
        WithArgs(compID).
        WillReturnRows(sqlmock.NewRows([]string{"competency_id"}).AddRow(compID))

    c, rec := ctxWithJSON(t, db, http.MethodPut, fmt.Sprintf("/api/employee-competencies/%d", id), req)
    c.Params = gin.Params{gin.Param{Key: "employeeCompetencyID", Value: fmt.Sprint(id)}}
    UpdateEmployeeCompetencyHandler(c)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.Contains(t, rec.Body.String(), `"employeeCompetencyID":77`)
    require.Contains(t, rec.Body.String(), `"notes":"Updated notes"`)
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteEmployeeCompetencyHandler_Unit(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    id := 90
    mock.ExpectBegin()

    mock.ExpectExec(`^(DELETE FROM "employee_competencies" WHERE .*|"UPDATE "employee_competencies" SET .*deleted_at.*)`).
        WithArgs(id).
        WillReturnResult(sqlmock.NewResult(0, 1))

    mock.ExpectCommit()

    c, rec := ctxWithJSON(t, db, http.MethodDelete, fmt.Sprintf("/api/employee-competencies/%d", id), nil)
    c.Params = gin.Params{gin.Param{Key: "employeeCompetencyID", Value: fmt.Sprint(id)}}
    DeleteEmployeeCompetencyHandler(c)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String(), rec.Body.String())
    require.NoError(t, mock.ExpectationsWereMet())
}

func TestListEmployeeCompetenciesByEmployeeHandler_Unit(t *testing.T) {
    gin.SetMode(gin.TestMode)
    db, mock := newMockDB(t)

    emp := "E777"
    compID := 5
    id := 200
    ach := time.Now().UTC().AddDate(0, -2, 0)

    mainRows := sqlmock.NewRows([]string{
        "employee_competency_id",
        "employee_number",
        "competency_id",
        "achievement_date",
        "expiry_date",
        "granted_by_schedule_id",
        "notes",
    }).AddRow(id, emp, compID, ach, nil, nil, "some note")

    // Main query
    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "employee_competencies" WHERE employee_number = $1 ORDER BY achievement_date DESC NULLS LAST, employee_competency_id DESC`)).
        WithArgs(emp).
        WillReturnRows(mainRows)

    // Preload
    mock.ExpectQuery(regexp.QuoteMeta(
        `SELECT * FROM "competency_definitions" WHERE "competency_definitions"."competency_id" = $1`)).
        WithArgs(compID).
        WillReturnRows(sqlmock.NewRows([]string{"competency_id"}).AddRow(compID))

    c, rec := ctxWithJSON(t, db, http.MethodGet, fmt.Sprintf("/api/employees/%s/competencies", emp), nil)
    c.Params = gin.Params{gin.Param{Key: "employeeNumber", Value: emp}}
    ListEmployeeCompetenciesByEmployeeHandler(c)
    require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
    require.Contains(t, rec.Body.String(), `"employeeCompetencyID":200`)
    require.NoError(t, mock.ExpectationsWereMet())
}