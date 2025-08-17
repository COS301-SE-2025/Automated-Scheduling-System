//go:build unit

package user

import (
	"Automated-Scheduling-Project/internal/database/models"
	"bytes"
	"encoding/json"
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

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
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
	testUserEmail     = "test.user@example.com"
	testUserUsername  = "test.user"
	testUserPassword  = "password123"
	testUserEmpNum    = "E101"
	testNewUserEmail  = "new.user@example.com"
	testNewUserEmpNum = "E102"
)

func TestGetAllUsersHandler_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "users"."id","users"."username","users"."password","users"."forgot_password_link","users"."role","users"."employee_number" FROM "users"`)).
		WillReturnRows(sqlmock.NewRows([]string{"id", "username", "employee_number", "role"}).
			AddRow(1, "user1", "E001", "Admin").
			AddRow(2, "user2", "E002", "User"))

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "employee" WHERE "employee"."employeenumber" IN ($1,$2)`)).
		WithArgs("E001", "E002").
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "employeestatus"}).
			AddRow("E001", "Admin", "Test", "admin@example.com", "Active").
			AddRow("E002", "User", "Test", "user@example.com", "Active"))

	c, rec := ctxWithJSON(t, db, "GET", "/users", nil)
	GetAllUsersHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	var users []models.UserResponse
	err := json.Unmarshal(rec.Body.Bytes(), &users)
	require.NoError(t, err)
	require.Len(t, users, 2)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddUserHandler_Success_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	addUserReq := models.AddUserRequest{Username: testUserUsername, Email: testNewUserEmail, Password: testUserPassword, Role: "User"}

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."terminationdate" FROM "employee" WHERE UserAccountEmail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testNewUserEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail"}).
			AddRow(testNewUserEmpNum, "New", "User", testNewUserEmail))

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "users" WHERE "users"."employee_number" = $1`)).
		WithArgs(testNewUserEmpNum).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(
		`INSERT INTO "users" ("username","password","forgot_password_link","role","employee_number") VALUES ($1,$2,$3,$4,$5) RETURNING "id"`)).
		WithArgs(addUserReq.Username, sqlmock.AnyArg(), "", addUserReq.Role, testNewUserEmpNum).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

	c, rec := ctxWithJSON(t, db, "POST", "/users", addUserReq)
	AddUserHandler(c)

	require.Equal(t, http.StatusCreated, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddUserHandler_UserAlreadyExists_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	addUserReq := models.AddUserRequest{Username: testUserUsername, Email: testUserEmail, Password: testUserPassword, Role: "User"}

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."terminationdate" FROM "employee" WHERE UserAccountEmail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testUserEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber"}).AddRow(testUserEmpNum))

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "users" WHERE "users"."employee_number" = $1`)).
		WithArgs(testUserEmpNum).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

	c, rec := ctxWithJSON(t, db, "POST", "/users", addUserReq)
	AddUserHandler(c)

	require.Equal(t, http.StatusNotFound, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateUserHandler_Success_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)

	newRole := "Admin"
	updateReq := models.UpdateUserRequest{Role: &newRole}
	userID := 1

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "users"."id","users"."username","users"."password","users"."forgot_password_link","users"."role","users"."employee_number" FROM "users" WHERE "users"."id" = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(userID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "username", "employee_number", "role"}).
			AddRow(userID, testUserUsername, testUserEmpNum, "User"))

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "employee" WHERE "employee"."employeenumber" = $1`)).
		WithArgs(testUserEmpNum).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname"}).
			AddRow(testUserEmpNum, "Test", "User"))

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "users" SET "id"=$1,"username"=$2,"role"=$3,"employee_number"=$4 WHERE id = $5`)).
		WithArgs(userID, testUserUsername, newRole, testUserEmpNum, userID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	c, rec := ctxWithJSON(t, db, "PUT", fmt.Sprintf("/users/%d", userID), updateReq)
	c.Params = gin.Params{gin.Param{Key: "userID", Value: fmt.Sprint(userID)}}
	UpdateUserHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)

	var res models.UserResponse
	err := json.Unmarshal(rec.Body.Bytes(), &res)
	require.NoError(t, err)
	require.Equal(t, newRole, res.Role)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateUserHandler_UserNotFound_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	newRole := "Admin"
	updateReq := models.UpdateUserRequest{Role: &newRole}
	userID := 999

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "users"."id","users"."username","users"."password","users"."forgot_password_link","users"."role","users"."employee_number" FROM "users" WHERE "users"."id" = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(userID, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	c, rec := ctxWithJSON(t, db, "PUT", fmt.Sprintf("/users/%d", userID), updateReq)
	c.Params = gin.Params{gin.Param{Key: "userID", Value: fmt.Sprint(userID)}}
	UpdateUserHandler(c)

	require.Equal(t, http.StatusUnauthorized, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}
