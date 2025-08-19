//go:build !unit

package event

import (
    "Automated-Scheduling-Project/internal/database/gen_models"
    "Automated-Scheduling-Project/internal/database/models"
    rolepkg "Automated-Scheduling-Project/internal/role"
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/require"
    "golang.org/x/crypto/bcrypt"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

const (
    testUserEmail    = "test.user@example.com"
    testUserEmpNum   = "E123"
    testUserPassword = "password123"
    testUsername     = "testuser"
)

// setupTestDB initializes an in-memory SQLite database for testing.
func setupTestDB(t *testing.T) *gorm.DB {
    db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Silent),
    })
    require.NoError(t, err)

    err = db.AutoMigrate(
        &gen_models.Employee{},
        &gen_models.User{},
        &models.Role{},
        &models.RolePermission{},
        &models.UserHasRole{},
        &models.CustomEventDefinition{},
        &models.CustomEventSchedule{},
        &models.EventScheduleEmployee{},
        &models.EventSchedulePositionTarget{},
        &models.EventAttendance{},
    )
    require.NoError(t, err)

    DB = db
    rolepkg.DB = db
    return db
}

// seedData populates the database with initial data for tests.
func seedData(t *testing.T, db *gorm.DB) (*gen_models.User, *models.CustomEventDefinition, *models.CustomEventSchedule) {
    employee := gen_models.Employee{
        Employeenumber:   testUserEmpNum,
        Firstname:        "Test",
        Lastname:         "User",
        Useraccountemail: testUserEmail,
        Employeestatus:   "Active",
    }
    require.NoError(t, db.Create(&employee).Error)

    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(testUserPassword), bcrypt.DefaultCost)
    require.NoError(t, err)
    user := gen_models.User{
        EmployeeNumber: testUserEmpNum,
        Username:       testUsername,
        Password:       string(hashedPassword),
        Role:           "Admin",
    }
    require.NoError(t, db.Create(&user).Error)

    // Seed roles and permissions minimally so role checks won't panic
    adminRole := models.Role{RoleName: "Admin", Description: "System Admin"}
    require.NoError(t, db.Create(&adminRole).Error)
    // give Admin some generic permissions
    _ = db.Create(&models.RolePermission{RoleID: adminRole.RoleID, Page: "events"}).Error
    // link user to Admin role mapping as well
    _ = db.Create(&models.UserHasRole{UserID: user.ID, RoleID: adminRole.RoleID}).Error

    definition := models.CustomEventDefinition{
        EventName:           "Onboarding Session",
        ActivityDescription: "Standard onboarding for new hires.",
        StandardDuration:    "4 hours",
        CreatedBy:           testUserEmail,
    }
    require.NoError(t, db.Create(&definition).Error)

    startTime := time.Now().Add(24 * time.Hour)
    endTime := startTime.Add(4 * time.Hour)
    schedule := models.CustomEventSchedule{
        CustomEventID:    definition.CustomEventID,
        Title:            "New Hire Onboarding - Group A",
        EventStartDate:   startTime,
        EventEndDate:     endTime,
        RoomName:         "Conference Room 1",
        MaximumAttendees: 20,
        MinimumAttendees: 5,
        StatusName:       "Scheduled",
        Color:            "#4A90E2",
    }
    require.NoError(t, db.Create(&schedule).Error)

    return &user, &definition, &schedule
}

// setupRouter configures the Gin engine and routes for testing.
func setupRouter() *gin.Engine {
    gin.SetMode(gin.TestMode)
    r := gin.New()

    mockAuthMiddleware := func() gin.HandlerFunc {
        return func(c *gin.Context) {
            if email := c.GetHeader("X-Test-Email"); email != "" {
                c.Set("email", email)
            }
            c.Next()
        }
    }

    api := r.Group("/api")
    api.Use(mockAuthMiddleware())
    {
    // Event Definition Routes
        api.POST("/event-definitions", CreateEventDefinitionHandler)
        api.GET("/event-definitions", GetEventDefinitionsHandler)
    api.PATCH("/event-definitions/:definitionID", UpdateEventDefinitionHandler)
        api.DELETE("/event-definitions/:definitionID", DeleteEventDefinitionHandler)

        // Event Schedule Routes
    api.POST("/event-schedules", CreateEventScheduleHandler)
        api.GET("/event-schedules", GetEventSchedulesHandler)
    api.PATCH("/event-schedules/:scheduleID", UpdateEventScheduleHandler)
        api.DELETE("/event-schedules/:scheduleID", DeleteEventScheduleHandler)
    }
    return r
}

func performRequest(r http.Handler, method, path string, body []byte, headers map[string]string) *httptest.ResponseRecorder {
    req, _ := http.NewRequest(method, path, bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    for key, val := range headers {
        req.Header.Set(key, val)
    }
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    return w
}

// --- Test Suite for Event Definitions ---

func TestCreateEventDefinitionHandler(t *testing.T) {
    db := setupTestDB(t)
    seedData(t, db)
    r := setupRouter()

    // Stub current user context to bypass role lookup complexity in tests
    original := currentUserContextFn
    currentUserContextFn = func(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
        var u gen_models.User
        require.NoError(t, db.Where("username = ?", testUsername).First(&u).Error)
        var e gen_models.Employee
        require.NoError(t, db.Where("employeenumber = ?", testUserEmpNum).First(&e).Error)
        return &u, &e, true, true, nil
    }
    t.Cleanup(func(){ currentUserContextFn = original })

    t.Run("Success - Create definition", func(t *testing.T) {
        req := models.CreateEventDefinitionRequest{
            EventName:           "Advanced Go",
            ActivityDescription: "Deep dive into Go programming.",
            StandardDuration:    "3 days",
        }
        body, _ := json.Marshal(req)
    headers := map[string]string{"X-Test-Email": testUserEmail}

        w := performRequest(r, "POST", "/api/event-definitions", body, headers)
        require.Equal(t, http.StatusCreated, w.Code)

        var createdDef models.CustomEventDefinition
        err := json.Unmarshal(w.Body.Bytes(), &createdDef)
        require.NoError(t, err)
        require.Equal(t, req.EventName, createdDef.EventName)
        require.Equal(t, testUserEmail, createdDef.CreatedBy)
        require.NotZero(t, createdDef.CustomEventID)
    })

    t.Run("Failure - Invalid request body", func(t *testing.T) {
        headers := map[string]string{"X-Test-Email": testUserEmail}
        w := performRequest(r, "POST", "/api/event-definitions", []byte(`{"eventName":}`), headers)
        require.Equal(t, http.StatusBadRequest, w.Code)
    })

    t.Run("Failure - Missing auth identity", func(t *testing.T) {
        req := models.CreateEventDefinitionRequest{EventName: "No Auth Event"}
        body, _ := json.Marshal(req)
        w := performRequest(r, "POST", "/api/event-definitions", body, nil) 
        require.Equal(t, http.StatusInternalServerError, w.Code)
    })
}

func TestGetEventDefinitionsHandler(t *testing.T) {
    db := setupTestDB(t)
    _, seededDef, _ := seedData(t, db)
    r := setupRouter()

    // Stub context as Admin so handler doesn't 401
    original := currentUserContextFn
    currentUserContextFn = func(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
        var u gen_models.User
        require.NoError(t, db.Where("username = ?", testUsername).First(&u).Error)
        var e gen_models.Employee
        require.NoError(t, db.Where("employeenumber = ?", testUserEmpNum).First(&e).Error)
        return &u, &e, true, true, nil
    }
    t.Cleanup(func(){ currentUserContextFn = original })

    w := performRequest(r, "GET", "/api/event-definitions", nil, map[string]string{"X-Test-Email": testUserEmail})
    require.Equal(t, http.StatusOK, w.Code)

    var responseDefs []models.CustomEventDefinition
    err := json.Unmarshal(w.Body.Bytes(), &responseDefs)
    require.NoError(t, err)
    require.NotEmpty(t, responseDefs)
    require.Equal(t, seededDef.EventName, responseDefs[0].EventName)
}

func TestUpdateEventDefinitionHandler(t *testing.T) {
    db := setupTestDB(t)
    _, seededDef, _ := seedData(t, db)
    r := setupRouter()

    original := currentUserContextFn
    currentUserContextFn = func(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
        var u gen_models.User
        require.NoError(t, db.Where("username = ?", testUsername).First(&u).Error)
        var e gen_models.Employee
        require.NoError(t, db.Where("employeenumber = ?", testUserEmpNum).First(&e).Error)
        return &u, &e, true, true, nil
    }
    t.Cleanup(func(){ currentUserContextFn = original })

    t.Run("Success - Update definition", func(t *testing.T) {
        req := models.CreateEventDefinitionRequest{EventName: "Updated Onboarding"}
        body, _ := json.Marshal(req)
        path := fmt.Sprintf("/api/event-definitions/%d", seededDef.CustomEventID)

    w := performRequest(r, "PATCH", path, body, map[string]string{"X-Test-Email": testUserEmail})
        require.Equal(t, http.StatusOK, w.Code)

        var updatedDef models.CustomEventDefinition
        err := json.Unmarshal(w.Body.Bytes(), &updatedDef)
        require.NoError(t, err)
        require.Equal(t, req.EventName, updatedDef.EventName)
    })

    t.Run("Failure - Definition not found", func(t *testing.T) {
        req := models.CreateEventDefinitionRequest{EventName: "Does not matter"}
        body, _ := json.Marshal(req)
    w := performRequest(r, "PATCH", "/api/event-definitions/99999", body, map[string]string{"X-Test-Email": testUserEmail})
        require.Equal(t, http.StatusNotFound, w.Code)
    })
}

func TestDeleteEventDefinitionHandler(t *testing.T) {
    db := setupTestDB(t)
    _, seededDef, seededSchedule := seedData(t, db)
    r := setupRouter()

    original := currentUserContextFn
    currentUserContextFn = func(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
        var u gen_models.User
        require.NoError(t, db.Where("username = ?", testUsername).First(&u).Error)
        var e gen_models.Employee
        require.NoError(t, db.Where("employeenumber = ?", testUserEmpNum).First(&e).Error)
        return &u, &e, true, true, nil
    }
    t.Cleanup(func(){ currentUserContextFn = original })

    t.Run("Success - Delete definition", func(t *testing.T) {
        schedulePath := fmt.Sprintf("/api/event-schedules/%d", seededSchedule.CustomEventScheduleID)
    wSchedule := performRequest(r, "DELETE", schedulePath, nil, map[string]string{"X-Test-Email": testUserEmail})
        require.Equal(t, http.StatusOK, wSchedule.Code)

        defPath := fmt.Sprintf("/api/event-definitions/%d", seededDef.CustomEventID)
    wDef := performRequest(r, "DELETE", defPath, nil, map[string]string{"X-Test-Email": testUserEmail})
        require.Equal(t, http.StatusOK, wDef.Code)

        var defInDB models.CustomEventDefinition
        err := db.First(&defInDB, seededDef.CustomEventID).Error
        require.ErrorIs(t, err, gorm.ErrRecordNotFound)
    })
}

// --- Test Suite for Event Schedules ---

func TestCreateEventScheduleHandler(t *testing.T) {
    db := setupTestDB(t)
    _, seededDef, _ := seedData(t, db)
    r := setupRouter()

    original := currentUserContextFn
    currentUserContextFn = func(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
        var u gen_models.User
        require.NoError(t, db.Where("username = ?", testUsername).First(&u).Error)
        var e gen_models.Employee
        require.NoError(t, db.Where("employeenumber = ?", testUserEmpNum).First(&e).Error)
        return &u, &e, true, true, nil
    }
    t.Cleanup(func(){ currentUserContextFn = original })

    t.Run("Success - Create schedule", func(t *testing.T) {
        startTime := time.Now().Add(72 * time.Hour)
        req := models.CreateEventScheduleRequest{
            CustomEventID: seededDef.CustomEventID,
            Title:         "New Onboarding - Group B",
            EventStartDate:  startTime,
            EventEndDate:    startTime.Add(4 * time.Hour),
            Color:         "#F5A623",
        }
        body, _ := json.Marshal(req)

    w := performRequest(r, "POST", "/api/event-schedules", body, map[string]string{"X-Test-Email": testUserEmail})
        require.Equal(t, http.StatusCreated, w.Code)

        var createdSchedules []models.CustomEventSchedule
        err := json.Unmarshal(w.Body.Bytes(), &createdSchedules)
        require.NoError(t, err)
    require.GreaterOrEqual(t, len(createdSchedules), 1)
    })

    t.Run("Failure - Definition not found", func(t *testing.T) {
        startTime := time.Now().Add(24 * time.Hour)
        req := models.CreateEventScheduleRequest{
            CustomEventID: 99999,
            Title: "Bad Schedule",
            EventStartDate: startTime,
            EventEndDate: startTime.Add(2 * time.Hour),
        }
        body, _ := json.Marshal(req)
    w := performRequest(r, "POST", "/api/event-schedules", body, map[string]string{"X-Test-Email": testUserEmail})
    require.Equal(t, http.StatusNotFound, w.Code)
    })
}

func TestGetEventSchedulesHandler(t *testing.T) {
    db := setupTestDB(t)
    _, seededDef, seededSchedule := seedData(t, db)
    r := setupRouter()

    original := currentUserContextFn
    currentUserContextFn = func(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
        var u gen_models.User
        require.NoError(t, db.Where("username = ?", testUsername).First(&u).Error)
        var e gen_models.Employee
        require.NoError(t, db.Where("employeenumber = ?", testUserEmpNum).First(&e).Error)
        return &u, &e, true, true, nil
    }
    t.Cleanup(func(){ currentUserContextFn = original })

    w := performRequest(r, "GET", "/api/event-schedules", nil, map[string]string{"X-Test-Email": testUserEmail})
    require.Equal(t, http.StatusOK, w.Code)

    var responseSchedules []models.CustomEventSchedule
    err := json.Unmarshal(w.Body.Bytes(), &responseSchedules)
    require.NoError(t, err)
    require.GreaterOrEqual(t, len(responseSchedules), 1)
    require.Equal(t, seededSchedule.Title, responseSchedules[0].Title)
    require.Equal(t, seededDef.EventName, responseSchedules[0].CustomEventDefinition.EventName) // Check preload
}

func TestUpdateEventScheduleHandler(t *testing.T) {
    db := setupTestDB(t)
    _, _, seededSchedule := seedData(t, db)
    r := setupRouter()

    original := currentUserContextFn
    currentUserContextFn = func(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
        var u gen_models.User
        require.NoError(t, db.Where("username = ?", testUsername).First(&u).Error)
        var e gen_models.Employee
        require.NoError(t, db.Where("employeenumber = ?", testUserEmpNum).First(&e).Error)
        return &u, &e, true, true, nil
    }
    t.Cleanup(func(){ currentUserContextFn = original })

    t.Run("Success - Update schedule", func(t *testing.T) {
        newTitle := "Updated Onboarding Title"
        req := models.CreateEventScheduleRequest{
            CustomEventID: seededSchedule.CustomEventID,
            Title:         newTitle,
            EventStartDate:  seededSchedule.EventStartDate,
            EventEndDate:    seededSchedule.EventEndDate,
        }
        body, _ := json.Marshal(req)
        path := fmt.Sprintf("/api/event-schedules/%d", seededSchedule.CustomEventScheduleID)

    w := performRequest(r, "PATCH", path, body, map[string]string{"X-Test-Email": testUserEmail})
        require.Equal(t, http.StatusOK, w.Code)

        var updatedSchedules []models.CustomEventSchedule
        err := json.Unmarshal(w.Body.Bytes(), &updatedSchedules)
        require.NoError(t, err)
        require.Len(t, updatedSchedules, 1)
        require.Equal(t, newTitle, updatedSchedules[0].Title)
    })

    t.Run("Failure - Invalid schedule ID", func(t *testing.T) {
        req := models.CreateEventScheduleRequest{Title: "Does not matter"}
        body, _ := json.Marshal(req)
    w := performRequest(r, "PATCH", "/api/event-schedules/abc", body, map[string]string{"X-Test-Email": testUserEmail})
        require.Equal(t, http.StatusBadRequest, w.Code)
    })
}

func TestDeleteEventScheduleHandler(t *testing.T) {
    db := setupTestDB(t)
    _, _, seededSchedule := seedData(t, db)
    r := setupRouter()

    original := currentUserContextFn
    currentUserContextFn = func(c *gin.Context) (*gen_models.User, *gen_models.Employee, bool, bool, error) {
        var u gen_models.User
        require.NoError(t, db.Where("username = ?", testUsername).First(&u).Error)
        var e gen_models.Employee
        require.NoError(t, db.Where("employeenumber = ?", testUserEmpNum).First(&e).Error)
        return &u, &e, true, true, nil
    }
    t.Cleanup(func(){ currentUserContextFn = original })

    t.Run("Success - Delete schedule", func(t *testing.T) {
        path := fmt.Sprintf("/api/event-schedules/%d", seededSchedule.CustomEventScheduleID)
    w := performRequest(r, "DELETE", path, nil, map[string]string{"X-Test-Email": testUserEmail})
        require.Equal(t, http.StatusOK, w.Code)

        var scheduleInDB models.CustomEventSchedule
        err := db.First(&scheduleInDB, seededSchedule.CustomEventScheduleID).Error
        require.ErrorIs(t, err, gorm.ErrRecordNotFound)
    })

    t.Run("Failure - Schedule not found", func(t *testing.T) {
    w := performRequest(r, "DELETE", "/api/event-schedules/99999", nil, map[string]string{"X-Test-Email": testUserEmail})
        require.Equal(t, http.StatusNotFound, w.Code)
    })
}