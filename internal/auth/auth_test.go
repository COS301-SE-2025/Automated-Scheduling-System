//go:build unit

package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

// newMockDB, testingLogger, and ctxWithForm helpers remain the same.
func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	gormLogger := logger.New(&testingLogger{t}, logger.Config{SlowThreshold: 0, LogLevel: logger.Info})
	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{Logger: gormLogger})
	require.NoError(t, err)
	return gormDB, mock
}

type testingLogger struct{ t *testing.T }

func (l *testingLogger) Printf(format string, args ...interface{}) { l.t.Logf(format, args...) }

func ctxWithForm(t *testing.T, db *gorm.DB, method string, form url.Values) (*gin.Context, *httptest.ResponseRecorder) {
	req, err := http.NewRequest(method, "/", strings.NewReader(form.Encode()))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	DB = db
	return c, rec
}

const (
	testEmail        = "alice@example.com"
	testPassword     = "s3cr3t!"
	testUsername     = "alice"
	testEmployeeNum  = "E101"
	testEmployeeName = "Alice Smith"
	jwtEnvKey        = "JWT_SECRET"
)

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

func TestRegisterHandler_Success_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"username": {testUsername}, "email": {testEmail}, "password": {testPassword}}

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."terminationdate" FROM "employee" WHERE useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "employeestatus"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail, "Active"))

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "users" WHERE "users"."employee_number" = $1`)).
		WithArgs(testEmployeeNum).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(
		`INSERT INTO "users" ("username","password","forgot_password_link","role","employee_number") VALUES ($1,$2,$3,$4,$5) RETURNING "id"`)).
		WithArgs(testUsername, sqlmock.AnyArg(), "", "User", testEmployeeNum).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(123))
	mock.ExpectCommit()

	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	RegisterHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	err := mock.ExpectationsWereMet()
	require.NoError(t, err, "SQL mock expectations were not met")
}

func TestRegisterHandler_Duplicate_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"username": {testUsername}, "email": {testEmail}, "password": {testPassword}}

	// 1. Mock finding the employee.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."terminationdate" FROM "employee" WHERE useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "employeestatus"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail, "Active"))

	// 2. Mock the .Preload("User") check, returning an existing user.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "users" WHERE "users"."employee_number" = $1`)).
		WithArgs(testEmployeeNum).
		WillReturnRows(sqlmock.NewRows([]string{"id", "employee_number"}).AddRow(123, testEmployeeNum))

	// No transaction or INSERT should be expected, as the handler returns early.

	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	RegisterHandler(c)

	require.Equal(t, http.StatusConflict, rec.Code)
	err := mock.ExpectationsWereMet()
	require.NoError(t, err, "SQL mock expectations were not met")
}

func TestRegisterHandler_EmployeeNotFound_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"username": {testUsername}, "email": {testEmail}, "password": {testPassword}}

	// 1. Mock the initial employee lookup to return gorm.ErrRecordNotFound.
	// FIXED: This is the correct way to test the not-found error path.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."terminationdate" FROM "employee" WHERE useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	// No other queries should be expected.

	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	RegisterHandler(c)

	require.Equal(t, http.StatusNotFound, rec.Code)
	err := mock.ExpectationsWereMet()
	require.NoError(t, err, "SQL mock expectations were not met")
}

func TestLoginHandler_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"email": {testEmail}, "password": {testPassword}}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(testPassword), bcrypt.DefaultCost)
	require.NoError(t, err)

	//  Mock finding the employee.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."terminationdate" FROM "employee" WHERE Useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail))

	//  Mock .Preload("User") check, returning the existing user with the hashed password.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "users" WHERE "users"."employee_number" = $1`)).
		WithArgs(testEmployeeNum).
		WillReturnRows(sqlmock.NewRows([]string{"id", "employee_number", "username", "password", "role"}).
			AddRow(123, testEmployeeNum, testUsername, string(hashedPassword), "User"))

	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	LoginHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	var out struct {
		Token string `json:"token"`
		User  struct {
			Email string `json:"email"`
		} `json:"user"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
	require.Equal(t, testEmail, out.User.Email)
	require.NotEmpty(t, out.Token)

	err = mock.ExpectationsWereMet()
	require.NoError(t, err)
}

func TestLoginHandler_WrongPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"email": {testEmail}, "password": {"wrong-password"}}

	correctHashedPassword, err := bcrypt.GenerateFromPassword([]byte(testPassword), bcrypt.DefaultCost)
	require.NoError(t, err)

	//  Mock finding the employee.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."terminationdate" FROM "employee" WHERE Useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail))

	//  Mock the .Preload("User") check, returning the user with the correct hashed password.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "users" WHERE "users"."employee_number" = $1`)).
		WithArgs(testEmployeeNum).
		WillReturnRows(sqlmock.NewRows([]string{"id", "employee_number", "password"}).
			AddRow(123, testEmployeeNum, string(correctHashedPassword)))

	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	LoginHandler(c)

	require.Equal(t, http.StatusUnauthorized, rec.Code)
	err = mock.ExpectationsWereMet()
	require.NoError(t, err)
}

func TestProfileHandler_ValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_ = os.Setenv(jwtEnvKey, "test-secret")
	db, mock := newMockDB(t)

	//  Mock finding the employee by email.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."terminationdate" FROM "employee" WHERE Useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "employeestatus"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail, "Active"))

	//  Mock the .Preload("User") check.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "users" WHERE "users"."employee_number" = $1`)).
		WithArgs(testEmployeeNum).
		WillReturnRows(sqlmock.NewRows([]string{"id", "employee_number", "username", "role"}).
			AddRow(123, testEmployeeNum, testUsername, "User"))

	token, err := GenerateJWT(testEmail)
	require.NoError(t, err)

	req, _ := http.NewRequest(http.MethodGet, "/profile", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	DB = db
	c.Set("email", testEmail)

	ProfileHandler(c)

	require.Equal(t, http.StatusOK, rec.Code)
	var out struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
	require.Equal(t, testEmail, out.Email)
	require.Equal(t, testEmployeeName, out.Name)

	err = mock.ExpectationsWereMet()
	require.NoError(t, err)
}

func TestProfileHandler_MissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	req, _ := http.NewRequest(http.MethodGet, "/profile", nil)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req

	ProfileHandler(c)

	require.Equal(t, http.StatusInternalServerError, rec.Code)
}
