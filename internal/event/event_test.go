//go:build unit

package event

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
	// "gorm.io/gorm/logger"
)

// --- Test Setup & Helpers ---

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	// gormLogger := logger.New(&testingLogger{t}, logger.Config{
	//     SlowThreshold: 0,
	//     LogLevel:      logger.Info,
	// })

	// gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{Logger: gormLogger})
	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}))
	require.NoError(t, err)
	return gormDB, mock
}

// type testingLogger struct{ t *testing.T }

// func (l *testingLogger) Printf(format string, args ...interface{}) { l.t.Logf(format, args...) }

func ctxWithJSON(t *testing.T, db *gorm.DB, method string, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	jsonBody, err := json.Marshal(body)
	require.NoError(t, err)

	req, err := http.NewRequest(method, path, bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	DB = db

	return c, rec
}

const (
	testUserEmail = "test.user@example.com"
)

// --- Event Definition Unit Tests ---

func TestCreateEventDefinitionHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	req := models.CreateEventDefinitionRequest{
		EventName: "Unit Test Event",
	}

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(
		`INSERT INTO "custom_event_definitions" ("event_name","activity_description","standard_duration","grants_certificate_id","facilitator","created_by","creation_date") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "custom_event_id"`)).
		WithArgs(req.EventName, req.ActivityDescription, req.StandardDuration, req.GrantsCertificateID, req.Facilitator, testUserEmail, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_id"}).AddRow(1))
	mock.ExpectCommit()

	c, rec := ctxWithJSON(t, db, "POST", "/event-definitions", req)
	c.Set("email", testUserEmail)
	CreateEventDefinitionHandler(c)

	require.Equal(t, http.StatusCreated, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetEventDefinitionsHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_event_definitions"`)).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_id", "event_name"}).
			AddRow(1, "Event 1").
			AddRow(2, "Event 2"))

	c, rec := ctxWithJSON(t, db, "GET", "/event-definitions", nil)
	GetEventDefinitionsHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	var defs []models.CustomEventDefinition
	err := json.Unmarshal(rec.Body.Bytes(), &defs)
	require.NoError(t, err)
	require.Len(t, defs, 2)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateEventDefinitionHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	defID := 1
	req := models.CreateEventDefinitionRequest{EventName: "Updated Name"}

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_event_definitions" WHERE "custom_event_definitions"."custom_event_id" = $1 ORDER BY "custom_event_definitions"."custom_event_id" LIMIT $2`)).
		WithArgs(defID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_id", "event_name"}).AddRow(defID, "Old Name"))

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "custom_event_definitions" SET "event_name"=$1,"activity_description"=$2,"standard_duration"=$3,"grants_certificate_id"=$4,"facilitator"=$5,"created_by"=$6,"creation_date"=$7 WHERE "custom_event_id" = $8`)).
		WithArgs(req.EventName, "", "", nil, "", "", sqlmock.AnyArg(), defID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	c, rec := ctxWithJSON(t, db, "PATCH", fmt.Sprintf("/event-definitions/%d", defID), req)
	c.Params = gin.Params{gin.Param{Key: "definitionID", Value: fmt.Sprint(defID)}}
	UpdateEventDefinitionHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteEventDefinitionHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	defID := 1

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`DELETE FROM "custom_event_definitions" WHERE "custom_event_definitions"."custom_event_id" = $1`)).
		WithArgs(defID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	c, rec := ctxWithJSON(t, db, "DELETE", fmt.Sprintf("/event-definitions/%d", defID), nil)
	c.Params = gin.Params{gin.Param{Key: "definitionID", Value: fmt.Sprint(defID)}}
	DeleteEventDefinitionHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

// --- Event Schedule Unit Tests ---

func TestCreateEventScheduleHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	defID := 1
	req := models.CreateEventScheduleRequest{
		CustomEventID:  defID,
		Title:          "New Schedule",
		EventStartDate: time.Now(),
		EventEndDate:   time.Now().Add(time.Hour),
	}

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT count(*) FROM "custom_event_definitions" WHERE custom_event_id = $1`)).
		WithArgs(defID).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(
		`INSERT INTO "custom_event_schedules" ("custom_event_id","title","event_start_date","event_end_date","room_name","maximum_attendees","minimum_attendees","status_name","color","creation_date") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING "custom_event_schedule_id"`)).
		WithArgs(req.CustomEventID, req.Title, sqlmock.AnyArg(), sqlmock.AnyArg(), req.RoomName, req.MaximumAttendees, req.MinimumAttendees, "Scheduled", req.Color, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_schedule_id"}).AddRow(1))
	mock.ExpectCommit()

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_event_schedules" ORDER BY event_start_date asc`)).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_schedule_id", "custom_event_id"}).AddRow(1, defID))

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_event_definitions" WHERE "custom_event_definitions"."custom_event_id" = $1`)).
		WithArgs(defID).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_id"}).AddRow(defID))

	c, rec := ctxWithJSON(t, db, "POST", "/event-schedules", req)
	CreateEventScheduleHandler(c)

	require.Equal(t, http.StatusCreated, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetEventSchedulesHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_event_schedules"`)).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_schedule_id", "title", "custom_event_id"}).
			AddRow(1, "Schedule 1", 10).
			AddRow(2, "Schedule 2", 20))

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_event_definitions" WHERE "custom_event_definitions"."custom_event_id" IN ($1,$2)`)).
		WithArgs(10, 20).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_id", "event_name"}).
			AddRow(10, "Event A").
			AddRow(20, "Event B"))

	c, rec := ctxWithJSON(t, db, "GET", "/event-schedules", nil)
	GetEventSchedulesHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	var schedules []models.CustomEventSchedule
	err := json.Unmarshal(rec.Body.Bytes(), &schedules)
	require.NoError(t, err)
	require.Len(t, schedules, 2)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateEventScheduleHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	scheduleID := 1
	defID := 10

	req := models.CreateEventScheduleRequest{
		CustomEventID:  defID,
		Title:          "Updated Schedule Title",
		EventStartDate: time.Now(),
		EventEndDate:   time.Now().Add(time.Hour),
	}

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_event_schedules" WHERE "custom_event_schedules"."custom_event_schedule_id" = $1 ORDER BY "custom_event_schedules"."custom_event_schedule_id" LIMIT $2`)).
		WithArgs(scheduleID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_schedule_id", "title", "custom_event_id"}).AddRow(scheduleID, "Old Title", defID))

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "custom_event_schedules" SET "custom_event_id"=$1,"title"=$2,"event_start_date"=$3,"event_end_date"=$4,"room_name"=$5,"maximum_attendees"=$6,"minimum_attendees"=$7,"status_name"=$8,"color"=$9,"creation_date"=$10 WHERE "custom_event_schedule_id" = $11`)).
		WithArgs(req.CustomEventID, req.Title, sqlmock.AnyArg(), sqlmock.AnyArg(), req.RoomName, req.MaximumAttendees, req.MinimumAttendees, req.StatusName, req.Color, sqlmock.AnyArg(), scheduleID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_event_schedules" ORDER BY event_start_date asc`)).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_schedule_id", "custom_event_id"}).AddRow(1, defID))

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "custom_event_definitions" WHERE "custom_event_definitions"."custom_event_id" = $1`)).
		WithArgs(defID).
		WillReturnRows(sqlmock.NewRows([]string{"custom_event_id"}).AddRow(defID))

	c, rec := ctxWithJSON(t, db, "PATCH", fmt.Sprintf("/event-schedules/%d", scheduleID), req)
	c.Params = gin.Params{gin.Param{Key: "scheduleID", Value: fmt.Sprint(scheduleID)}}
	UpdateEventScheduleHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteEventScheduleHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	scheduleID := 1

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`DELETE FROM "custom_event_schedules" WHERE "custom_event_schedules"."custom_event_schedule_id" = $1`)).
		WithArgs(scheduleID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	c, rec := ctxWithJSON(t, db, "DELETE", fmt.Sprintf("/event-schedules/%d", scheduleID), nil)
	c.Params = gin.Params{gin.Param{Key: "scheduleID", Value: fmt.Sprint(scheduleID)}}
	DeleteEventScheduleHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}
