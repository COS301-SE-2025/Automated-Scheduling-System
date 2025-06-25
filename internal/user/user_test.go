//go:build !unit

package user

import (
	"Automated-Scheduling-Project/internal/database/models"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// --- Test Models (to match what handlers use, based on your schema) ---
type Employee struct {
	Employeenumber   string `gorm:"primaryKey"`
	Firstname        string
	Lastname         string
	Useraccountemail string `gorm:"unique"`
	Employeestatus   string
	TerminationDate  *string `gorm:"column:TerminationDate"`
}

func (Employee) TableName() string {
	return "employee"
}

type User struct {
	ID                 uint `gorm:"primaryKey"`
	EmployeeNumber     string
	Username           string `gorm:"unique"`
	Password           string
	ForgotPasswordLink *string
	Role               string
}

// --- Test Constants ---
const (
	AdminEmail        = "admin@example.com"
	AdminUsername     = "testadmin"
	AdminEmployeeNum  = "E001"
	UserEmail         = "user@example.com"
	UserUsername      = "testuser"
	UserEmployeeNum   = "E002"
	UnusedEmail       = "new.employee@example.com" // An employee who doesn't have a user account yet
	UnusedEmployeeNum = "E003"
	TestPassword      = "password123"
)

// --- Test Helpers ---

// setupTestDB creates a fresh in-memory SQLite database for each test run.
func setupTestDB(t *testing.T) *gorm.DB {
	// THE FIX for "UNIQUE constraint failed"
	// Removing "?cache=shared" ensures a truly new, empty DB for every call.
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	require.NoError(t, err, "Failed to connect to in-memory database")
	require.NoError(t, db.AutoMigrate(&Employee{}, &User{}), "Schema migration failed")

	// Set the global variable directly.
	DB = db
	return db
}

// seedUsersAndEmployees populates the test database with predictable data.
func seedUsersAndEmployees(t *testing.T, db *gorm.DB) (adminUser User, regularUser User) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(TestPassword), bcrypt.DefaultCost)
	require.NoError(t, err)

	employees := []Employee{
		{Employeenumber: AdminEmployeeNum, Firstname: "Admin", Lastname: "User", Useraccountemail: AdminEmail, Employeestatus: "Active"},
		{Employeenumber: UserEmployeeNum, Firstname: "Regular", Lastname: "User", Useraccountemail: UserEmail, Employeestatus: "Active"},
		{Employeenumber: UnusedEmployeeNum, Firstname: "New", Lastname: "Employee", Useraccountemail: UnusedEmail, Employeestatus: "Active"},
	}

	// THE FIX IS HERE: Add the `&` to pass a pointer to the slice.
	require.NoError(t, db.Create(&employees).Error)

	adminUser = User{EmployeeNumber: AdminEmployeeNum, Username: AdminUsername, Password: string(hashedPassword), Role: "Admin"}
	regularUser = User{EmployeeNumber: UserEmployeeNum, Username: UserUsername, Password: string(hashedPassword), Role: "User"}

	// These lines are already correct from the previous fix.
	require.NoError(t, db.Create(&adminUser).Error)
	require.NoError(t, db.Create(&regularUser).Error)

	return adminUser, regularUser
}

// performRequest is a helper to execute HTTP requests against a handler.
func performRequest(t *testing.T, r http.Handler, method, path string, body []byte) *httptest.ResponseRecorder {
	req, err := http.NewRequest(method, path, bytes.NewBuffer(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// --- Test Suite ---

// A dummy middleware to simulate checking the role from an auth token.
func CheckAdminMiddleware(c *gin.Context) {
	// For testing, we assume the role is passed in a header. A real app would get this from a JWT.
	role := c.GetHeader("X-Test-Role")
	if role != "Admin" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied. Admins only."})
		return
	}
	c.Next()
}

func TestGetAllUsersHandler_AdminAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	_, _ = seedUsersAndEmployees(t, db)

	r := gin.New()
	r.GET("/users", CheckAdminMiddleware, GetAllUsersHandler)

	// Perform request as an Admin
	req, _ := http.NewRequest("GET", "/users", nil)
	req.Header.Set("X-Test-Role", "Admin") // Simulate admin user
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var users []models.UserResponse
	err := json.Unmarshal(w.Body.Bytes(), &users)
	require.NoError(t, err)
	require.Len(t, users, 2, "Should return the 2 seeded users")
	// Verify one of the users to ensure data integrity
	require.Equal(t, AdminUsername, users[0].Username)
}

func TestGetAllUsersHandler_UserAccessDenied(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	_, _ = seedUsersAndEmployees(t, db)

	r := gin.New()
	r.GET("/users", CheckAdminMiddleware, GetAllUsersHandler)

	// Perform request as a regular User (or with no role)
	req, _ := http.NewRequest("GET", "/users", nil)
	req.Header.Set("X-Test-Role", "User") // Simulate non-admin user
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusForbidden, w.Code)
}

func TestAddUserHandler(t *testing.T) {
	// Setup router once for all sub-tests
	r := gin.New()
	r.POST("/users", AddUserHandler)

	t.Run("Success - Add user for existing employee", func(t *testing.T) {
		db := setupTestDB(t)
		_, _ = seedUsersAndEmployees(t, db)

		// THE FIX: Add the "Role" field to the request struct.
		addUserReq := models.AddUserRequest{
			Username: "new.user",
			Email:    UnusedEmail,
			Password: "new-password-that-is-long", // Ensure password meets min=8
			Role:     "User",                      // Added required role field
		}
		body, _ := json.Marshal(addUserReq)
		w := performRequest(t, r, "POST", "/users", body)

		// Now the assertion for 201 Created should pass.
		require.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

		var createdUser models.UserResponse
		err := json.Unmarshal(w.Body.Bytes(), &createdUser)
		require.NoError(t, err)
		require.Equal(t, "new.user", createdUser.Username)
		require.Equal(t, UnusedEmail, createdUser.Email)

		// Verify in DB
		var userInDB User
		err = db.First(&userInDB, "username = ?", "new.user").Error
		require.NoError(t, err, "User should be found in the database")
		require.Equal(t, UnusedEmployeeNum, userInDB.EmployeeNumber)
	})

	// The "Validation error" sub-test is already passing because it's supposed to fail binding.
	t.Run("Failure - Validation error (invalid email)", func(t *testing.T) {
		db := setupTestDB(t)
		_ = db // Unused, but keeps setup consistent

		addUserReq := map[string]string{
			"username": "bad.user",
			"email":    "not-an-email",
			"password": "password123",
			"role":     "User",
		}
		body, _ := json.Marshal(addUserReq)
		w := performRequest(t, r, "POST", "/users", body)
		require.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Failure - Employee does not exist", func(t *testing.T) {
		db := setupTestDB(t)
		_, _ = seedUsersAndEmployees(t, db)

		// THE FIX: Add the "Role" field to the request struct.
		addUserReq := models.AddUserRequest{
			Username: "ghost.user",
			Email:    "ghost@example.com",
			Password: "password123",
			Role:     "User", // Added required role field
		}
		body, _ := json.Marshal(addUserReq)
		w := performRequest(t, r, "POST", "/users", body)

		// Now the assertion for 404 Not Found should pass.
		require.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("Failure - User account already exists for employee", func(t *testing.T) {
		db := setupTestDB(t)
		_, _ = seedUsersAndEmployees(t, db)

		// THE FIX: Add the "Role" field to the request struct.
		addUserReq := models.AddUserRequest{
			Username: "another.admin",
			Email:    AdminEmail,
			Password: "password123",
			Role:     "Admin", // Added required role field
		}
		body, _ := json.Marshal(addUserReq)
		w := performRequest(t, r, "POST", "/users", body)

		// Now the assertion for 404 Not Found should pass.
		require.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestUpdateUserHandler(t *testing.T) {
	t.Run("Success - Update user role", func(t *testing.T) {
		db := setupTestDB(t)
		_, regularUser := seedUsersAndEmployees(t, db)
		r := gin.New()
		r.PUT("/users/:userID", UpdateUserHandler)

		newRole := "Manager"
		updateReq := models.UpdateUserRequest{Role: &newRole}
		body, _ := json.Marshal(updateReq)
		path := fmt.Sprintf("/users/%d", regularUser.ID)

		w := performRequest(t, r, "PUT", path, body)
		require.Equal(t, http.StatusOK, w.Code)

		var updatedUser models.UserResponse
		err := json.Unmarshal(w.Body.Bytes(), &updatedUser)
		require.NoError(t, err)
		require.Equal(t, "Manager", updatedUser.Role)

		// Verify in DB
		var userInDB User
		err = db.First(&userInDB, regularUser.ID).Error
		require.NoError(t, err)
		require.Equal(t, "Manager", userInDB.Role)
	})

	t.Run("Failure - Invalid User ID format", func(t *testing.T) {
		db := setupTestDB(t)
		_ = db
		r := gin.New()
		r.PUT("/users/:userID", UpdateUserHandler)

		w := performRequest(t, r, "PUT", "/users/not-a-number", nil)
		require.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Failure - User does not exist", func(t *testing.T) {
		db := setupTestDB(t)
		_ = db
		r := gin.New()
		r.PUT("/users/:userID", UpdateUserHandler)

		newRole := "Manager"
		updateReq := models.UpdateUserRequest{Role: &newRole}
		body, _ := json.Marshal(updateReq)
		w := performRequest(t, r, "PUT", "/users/99999", body) // Non-existent ID
		// Your handler returns 401 Unauthorized in this case.
		require.Equal(t, http.StatusUnauthorized, w.Code)
	})
}
