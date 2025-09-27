//go:build unit

package auth

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"regexp"
	"strings"
	"testing"

	"Automated-Scheduling-Project/internal/database/gen_models"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
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

	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})

	require.NoError(t, err)
	return gormDB, mock
}

// newSqliteDB creates an in-memory sqlite database and auto-migrates the minimal
// models required for the auth handlers we want to exercise. Using a real
// in-memory DB lets us cover success paths that would otherwise require many
// fragile sqlmock expectations (especially for UPDATE statements with dynamic
// column ordering).
func newSqliteDB(t *testing.T) *gorm.DB {
	gdb, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, gdb.AutoMigrate(&gen_models.Employee{}, &gen_models.User{}))
	return gdb
}

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
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "employeestatus", "phonenumber"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail, "Active", nil))

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

func TestRegisterHandler_ValidationError_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// Missing username triggers 400 before any DB usage.
	form := url.Values{"username": {""}, "email": {testEmail}, "password": {testPassword}}
	c, rec := ctxWithForm(t, nil, http.MethodPost, form)
	RegisterHandler(c)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestRegisterHandler_DBError_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"username": {testUsername}, "email": {testEmail}, "password": {testPassword}}

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnError(errors.New("boom"))

	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	RegisterHandler(c)
	require.Equal(t, http.StatusInternalServerError, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRegisterHandler_UserCreationFails_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"username": {testUsername}, "email": {testEmail}, "password": {testPassword}}

	// Employee exists
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "employeestatus", "phonenumber"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail, "Active", nil))
	// No existing user
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE "users"."employee_number" = $1`)).
		WithArgs(testEmployeeNum).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))
	// Transaction with failing INSERT
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "users"`)).
		WithArgs(testUsername, sqlmock.AnyArg(), "", "User", testEmployeeNum).
		WillReturnError(errors.New("insert failed"))
	mock.ExpectRollback()

	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	RegisterHandler(c)
	require.Equal(t, http.StatusInternalServerError, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRegisterHandler_Duplicate_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"username": {testUsername}, "email": {testEmail}, "password": {testPassword}}

	// 1. Mock finding the employee.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "employeestatus", "phonenumber"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail, "Active", nil))

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
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
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
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE Useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "phonenumber"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail, nil))

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

func TestLoginHandler_MissingFields_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := newMockDB(t)
	form := url.Values{"email": {""}, "password": {""}}
	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	LoginHandler(c)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestLoginHandler_InvalidCredentials_Unit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"email": {testEmail}, "password": {testPassword}}
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE Useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnError(gorm.ErrRecordNotFound)
	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	LoginHandler(c)
	require.Equal(t, http.StatusUnauthorized, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestLoginHandler_WrongPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	form := url.Values{"email": {testEmail}, "password": {"wrong-password"}}

	correctHashedPassword, err := bcrypt.GenerateFromPassword([]byte(testPassword), bcrypt.DefaultCost)
	require.NoError(t, err)

	//  Mock finding the employee.
	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE Useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "phonenumber"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail, nil))

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
		`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE Useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnRows(sqlmock.NewRows([]string{"employeenumber", "firstname", "lastname", "useraccountemail", "employeestatus", "phonenumber"}).
			AddRow(testEmployeeNum, "Alice", "Smith", testEmail, "Active", nil))

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

	require.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestProfileHandler_InvalidEmailType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	req, _ := http.NewRequest(http.MethodGet, "/profile", nil)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	c.Set("email", 12345) // not a string
	ProfileHandler(c)
	require.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestProfileHandler_UserNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE Useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnError(gorm.ErrRecordNotFound)
	req, _ := http.NewRequest(http.MethodGet, "/profile", nil)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	DB = db
	c.Set("email", testEmail)
	ProfileHandler(c)
	require.Equal(t, http.StatusNotFound, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

/* -------------------------------------------------------------------------- */
/*                       Reset / Forgot Password Handlers                     */
/* -------------------------------------------------------------------------- */

func TestGenerateResetLinkHandler_BindError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newSqliteDB(t)
	DB = db
	body := bytes.NewBufferString(`{"notEmail":"x"}`) // missing required field
	req, _ := http.NewRequest(http.MethodPost, "/forgot", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	generateResetLinkHandler(c)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestGenerateResetLinkHandler_EmployeeNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	// Query returns record not found
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE Useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnError(gorm.ErrRecordNotFound)
	body := bytes.NewBufferString(`{"email":"` + testEmail + `"}`)
	req, _ := http.NewRequest(http.MethodPost, "/forgot", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	DB = db
	generateResetLinkHandler(c)
	require.Equal(t, http.StatusNotFound, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGenerateResetLinkHandler_NoUserAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newSqliteDB(t)
	require.NoError(t, db.Create(&gen_models.Employee{Employeenumber: testEmployeeNum, Firstname: "Alice", Lastname: "Smith", Useraccountemail: testEmail, Employeestatus: "Active"}).Error)
	DB = db
	body := bytes.NewBufferString(`{"email":"` + testEmail + `"}`)
	req, _ := http.NewRequest(http.MethodPost, "/forgot", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	generateResetLinkHandler(c)
	require.Equal(t, http.StatusNotFound, rec.Code)
}

func TestResetPasswordHandler_BindError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newSqliteDB(t)
	DB = db
	body := bytes.NewBufferString(`{"email":"not-an-email"}`) // missing required fields
	req, _ := http.NewRequest(http.MethodPost, "/reset", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	resetPasswordHandler(c)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestResetPasswordHandler_UserNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "employee"."employeenumber","employee"."firstname","employee"."lastname","employee"."useraccountemail","employee"."employeestatus","employee"."phonenumber","employee"."terminationdate" FROM "employee" WHERE useraccountemail = $1 ORDER BY "employee"."employeenumber" LIMIT $2`)).
		WithArgs(testEmail, 1).
		WillReturnError(gorm.ErrRecordNotFound)
	DB = db
	body := bytes.NewBufferString(`{"email":"` + testEmail + `","password":"newpass","confirmPassword":"newpass"}`)
	req, _ := http.NewRequest(http.MethodPost, "/reset", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	resetPasswordHandler(c)
	require.Equal(t, http.StatusNotFound, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestResetPasswordHandler_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newSqliteDB(t)
	// Insert employee and related user
	require.NoError(t, db.Create(&gen_models.Employee{Employeenumber: testEmployeeNum, Firstname: "Alice", Lastname: "Smith", Useraccountemail: testEmail, Employeestatus: "Active"}).Error)
	hashed, _ := bcrypt.GenerateFromPassword([]byte("oldpass"), bcrypt.DefaultCost)
	require.NoError(t, db.Create(&gen_models.User{Username: testUsername, Password: string(hashed), Role: "User", EmployeeNumber: testEmployeeNum, ForgotPasswordLink: "abc"}).Error)
	DB = db
	body := bytes.NewBufferString(`{"email":"` + testEmail + `","password":"newpass","confirmPassword":"newpass"}`)
	req, _ := http.NewRequest(http.MethodPost, "/reset", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	resetPasswordHandler(c)
	require.Equal(t, http.StatusOK, rec.Code)
}

func TestResetPasswordPageHandler_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := newMockDB(t)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE forgot_password_link = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs("badtoken", 1).
		WillReturnError(gorm.ErrRecordNotFound)
	DB = db
	req, _ := http.NewRequest(http.MethodGet, "/reset/badtoken", nil)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Params = append(c.Params, gin.Param{Key: "resetToken", Value: "badtoken"})
	c.Request = req
	resetPasswordPageHandler(c)
	require.Equal(t, http.StatusUnauthorized, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestResetPasswordPageHandler_ValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newSqliteDB(t)
	require.NoError(t, db.Create(&gen_models.User{Username: testUsername, Password: "hash", Role: "User", EmployeeNumber: testEmployeeNum, ForgotPasswordLink: "validtoken"}).Error)
	DB = db
	req, _ := http.NewRequest(http.MethodGet, "/reset/validtoken", nil)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Params = append(c.Params, gin.Param{Key: "resetToken", Value: "validtoken"})
	c.Request = req
	resetPasswordPageHandler(c)
	require.Equal(t, http.StatusOK, rec.Code)
}
