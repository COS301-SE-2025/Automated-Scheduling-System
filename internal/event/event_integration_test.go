//go:build !unit

package event

import (
    "Automated-Scheduling-Project/internal/database/gen_models"
    "Automated-Scheduling-Project/internal/database/models"
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "net/http/httptest"
    "strconv"
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

    // Migrate the schema for all relevant models
    err = db.AutoMigrate(&gen_models.Employee{}, &gen_models.User{}, &gen_models.Event{}, &gen_models.UserEvent{})
    require.NoError(t, err)

    DB = db
    return db
}

// seedData populates the database with initial data for tests.
func seedData(t *testing.T, db *gorm.DB) (*gen_models.User, *gen_models.Event) {
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
        Role:           "User",
    }
    require.NoError(t, db.Create(&user).Error)

    startTime := time.Now().Add(24 * time.Hour)
    endTime := startTime.Add(1 * time.Hour)
    createdEvent := gen_models.Event{
        Title:           "Team Meeting",
        StartTime:       startTime,
        EndTime:         endTime,
        AllDay:          false,
        EventType:       "Meeting",
        RelevantParties: "Development Team",
        Color:           "#A78BFA", // purple
    }
    require.NoError(t, db.Create(&createdEvent).Error)

    userEvent := gen_models.UserEvent{
        UserID:  user.ID,
        EventID: createdEvent.ID,
    }
    require.NoError(t, db.Create(&userEvent).Error)

    return &user, &createdEvent
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
        api.GET("/events", GetEventsHandler)
        api.GET("/user-events", GetUserEventsHandler)
        api.POST("/events", CreateEventHandler)
        api.PATCH("/events/:eventID", UpdateEventHandler)
        api.DELETE("/events/:eventID", DeleteEventHandler)
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

func TestGetEventsHandler(t *testing.T) {
    db := setupTestDB(t)
    _, seededEvent := seedData(t, db)
    r := setupRouter()

    w := performRequest(r, "GET", "/api/events", nil, nil)

    require.Equal(t, http.StatusOK, w.Code)

    var responseEvents []models.EventResponse
    err := json.Unmarshal(w.Body.Bytes(), &responseEvents)
    require.NoError(t, err)
    require.NotEmpty(t, responseEvents)
    require.Equal(t, seededEvent.Title, responseEvents[0].Title)
    require.Equal(t, seededEvent.Color, responseEvents[0].Color)
}

func TestGetUserEventsHandler(t *testing.T) {
    db := setupTestDB(t)
    _, seededEvent := seedData(t, db)
    r := setupRouter()

    t.Run("Success - Get user events with auth", func(t *testing.T) {
        headers := map[string]string{"X-Test-Email": testUserEmail}
        w := performRequest(r, "GET", "/api/user-events", nil, headers)
        require.Equal(t, http.StatusOK, w.Code)

        var responseEvents []models.EventResponse
        err := json.Unmarshal(w.Body.Bytes(), &responseEvents)
        require.NoError(t, err)
        require.Len(t, responseEvents, 1)
        require.Equal(t, strconv.FormatInt(seededEvent.ID, 10), responseEvents[0].ID)
        require.Equal(t, seededEvent.Color, responseEvents[0].Color)
    })

    t.Run("Failure - Get user events without auth", func(t *testing.T) {
        w := performRequest(r, "GET", "/api/user-events", nil, nil)
        require.Equal(t, http.StatusUnauthorized, w.Code)
    })
}

func TestCreateEventHandler(t *testing.T) {
    db := setupTestDB(t)
    seedData(t, db) 
    r := setupRouter()

    t.Run("Success - Create event", func(t *testing.T) {
        startTime := time.Now().Add(48 * time.Hour)
        endTime := startTime.Add(1 * time.Hour)
        createReq := models.CreateEventRequest{
            Title:           "New Standup",
            Start:           startTime,
            End:             endTime,
            EventType:       "Meeting",
            RelevantParties: "Everyone",
            Color:           "#34D399", // green
        }
        body, _ := json.Marshal(createReq)
        headers := map[string]string{"X-Test-Email": testUserEmail}

        w := performRequest(r, "POST", "/api/events", body, headers)
        require.Equal(t, http.StatusCreated, w.Code)

        var createdEvent models.EventResponse
        err := json.Unmarshal(w.Body.Bytes(), &createdEvent)
        require.NoError(t, err)
        require.Equal(t, createReq.Title, createdEvent.Title)
        require.Equal(t, createReq.Color, createdEvent.Color)
        require.NotEmpty(t, createdEvent.ID)

        var eventInDB gen_models.Event
        eventID, _ := strconv.ParseInt(createdEvent.ID, 10, 64)
        err = db.First(&eventInDB, eventID).Error
        require.NoError(t, err)
        require.Equal(t, createReq.Title, eventInDB.Title)
        require.Equal(t, createReq.Color, eventInDB.Color)
    })

    t.Run("Failure - Invalid request body", func(t *testing.T) {
        headers := map[string]string{"X-Test-Email": testUserEmail}
        w := performRequest(r, "POST", "/api/events", []byte(`{"title":}`), headers)
        require.Equal(t, http.StatusBadRequest, w.Code)
    })
}

func TestUpdateEventHandler(t *testing.T) {
    db := setupTestDB(t)
    _, seededEvent := seedData(t, db)
    r := setupRouter()

    t.Run("Success - Update event", func(t *testing.T) {
        newTitle := "Updated Team Meeting"
        newColor := "#F87171" // red
        updateReq := models.UpdateEventRequest{Title: &newTitle, Color: &newColor}
        body, _ := json.Marshal(updateReq)
        path := fmt.Sprintf("/api/events/%d", seededEvent.ID)

        w := performRequest(r, "PATCH", path, body, nil)
        require.Equal(t, http.StatusOK, w.Code)

        var updatedEvent models.EventResponse
        err := json.Unmarshal(w.Body.Bytes(), &updatedEvent)
        require.NoError(t, err)
        require.Equal(t, newTitle, updatedEvent.Title)
        require.Equal(t, newColor, updatedEvent.Color)
    })

    t.Run("Failure - Event not found", func(t *testing.T) {
        newTitle := "Does not matter"
        updateReq := models.UpdateEventRequest{Title: &newTitle}
        body, _ := json.Marshal(updateReq)
        w := performRequest(r, "PATCH", "/api/events/99999", body, nil)
        require.Equal(t, http.StatusNotFound, w.Code)
    })
}

func TestDeleteEventHandler(t *testing.T) {
    db := setupTestDB(t)
    _, seededEvent := seedData(t, db)
    r := setupRouter()

    t.Run("Success - Delete event", func(t *testing.T) {
        path := fmt.Sprintf("/api/events/%d", seededEvent.ID)
        w := performRequest(r, "DELETE", path, nil, nil)
        require.Equal(t, http.StatusOK, w.Code)

        // Verify deletion from DB
        var eventInDB gen_models.Event
        err := db.First(&eventInDB, seededEvent.ID).Error
        require.ErrorIs(t, err, gorm.ErrRecordNotFound)

        var userEventInDB gen_models.UserEvent
        err = db.Where("event_id = ?", seededEvent.ID).First(&userEventInDB).Error
        require.ErrorIs(t, err, gorm.ErrRecordNotFound)
    })

    t.Run("Failure - Invalid event ID", func(t *testing.T) {
        w := performRequest(r, "DELETE", "/api/events/abc", nil, nil)
        require.Equal(t, http.StatusBadRequest, w.Code)
    })
}