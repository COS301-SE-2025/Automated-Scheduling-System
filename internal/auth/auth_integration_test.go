//go:build !unit

package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"Automated-Scheduling-Project/internal/database/gen_models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// type Employee struct {
// 	Employeenumber   string `gorm:"primaryKey"`
// 	Firstname        string
// 	Lastname         string
// 	Useraccountemail string `gorm:"unique"`
// 	Employeestatus   string
// 	TerminationDate  *string `gorm:"column:TerminationDate"`
// }

// func (gen_models.Employee) TableName() string { return "employee" }

type User struct {
	ID                 uint `gorm:"primaryKey"`
	EmployeeNumber     string
	Username           string `gorm:"unique"`
	Password           string
	ForgotPasswordLink string
	Role               string
}

const (
	testIntEmail        = "integration.user@example.com"
	testIntPassword     = "a-secure-password"
	testIntUsername     = "integration.user"
	testIntEmployeeNum  = "E999"
	testIntEmployeeName = "Integration User"
	unusedEmployeeEmail = "new.hire@example.com"
	unusedEmployeeNum   = "E998"
	jwtEnvKey           = "JWT_SECRET"
)

func setupAuthTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&gen_models.Employee{}, &User{}))
	DB = db
	return db
}

func seedAuthTestDB(t *testing.T, db *gorm.DB) (User, gen_models.Employee) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(testIntPassword), bcrypt.DefaultCost)
	require.NoError(t, err)

	employeeWithUser := gen_models.Employee{
		Employeenumber:   testIntEmployeeNum,
		Firstname:        "Integration",
		Lastname:         "User",
		Useraccountemail: testIntEmail,
		Employeestatus:   "Active",
	}
	employeeWithoutUser := gen_models.Employee{
		Employeenumber:   unusedEmployeeNum,
		Firstname:        "New",
		Lastname:         "Hire",
		Useraccountemail: unusedEmployeeEmail,
		Employeestatus:   "Active",
	}
	require.NoError(t, db.Create(&[]gen_models.Employee{employeeWithUser, employeeWithoutUser}).Error)

	user := User{
		EmployeeNumber: testIntEmployeeNum,
		Username:       testIntUsername,
		Password:       string(hashedPassword),
		Role:           "User",
	}
	require.NoError(t, db.Create(&user).Error)

	return user, employeeWithoutUser
}

func TestRegisterHandler_Integration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/register", RegisterHandler)

	t.Run("Success", func(t *testing.T) {
		db := setupAuthTestDB(t)
		_, employeeToRegister := seedAuthTestDB(t, db)

		form := url.Values{
			"username": {"new.username"},
			"email":    {employeeToRegister.Useraccountemail},
			"password": {"new-strong-password"},
		}

		req, _ := http.NewRequest("POST", "/register", strings.NewReader(form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var newUser User
		err := db.First(&newUser, "username = ?", "new.username").Error
		require.NoError(t, err, "new user should exist in database")
		require.Equal(t, employeeToRegister.Employeenumber, newUser.EmployeeNumber)
	})

	t.Run("Failure - Duplicate", func(t *testing.T) {
		db := setupAuthTestDB(t)
		seedAuthTestDB(t, db)

		form := url.Values{
			"username": {"another.user"},
			"email":    {testIntEmail}, // Try to register with an email that already has a user
			"password": {"password123"},
		}

		req, _ := http.NewRequest("POST", "/register", strings.NewReader(form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusConflict, w.Code)
	})
}

func TestLoginHandler_Integration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/login", LoginHandler)

	t.Run("Success", func(t *testing.T) {
		db := setupAuthTestDB(t)
		seedAuthTestDB(t, db)

		form := url.Values{
			"email":    {testIntEmail},
			"password": {testIntPassword},
		}

		req, _ := http.NewRequest("POST", "/login", strings.NewReader(form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var respData map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &respData)
		require.NoError(t, err)
		require.NotEmpty(t, respData["token"])
	})

	t.Run("Failure - Wrong Password", func(t *testing.T) {
		db := setupAuthTestDB(t)
		seedAuthTestDB(t, db)

		form := url.Values{
			"email":    {testIntEmail},
			"password": {"wrong-password"},
		}

		req, _ := http.NewRequest("POST", "/login", strings.NewReader(form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestProfileHandler_Integration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_ = os.Setenv(jwtEnvKey, "test-secret")
	r := gin.New()
	r.GET("/profile", ProfileHandler)

	db := setupAuthTestDB(t)
	seedAuthTestDB(t, db)

	token, err := GenerateJWT(testIntEmail)
	require.NoError(t, err)

	req, _ := http.NewRequest("GET", "/profile", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("email", testIntEmail)

	ProfileHandler(c)

	require.Equal(t, http.StatusOK, c.Writer.Status())

	var profile map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &profile)
	require.NoError(t, err)
	require.Equal(t, testIntEmail, profile["email"])
	require.Equal(t, testIntUsername, profile["username"])
}
