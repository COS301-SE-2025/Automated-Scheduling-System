//go:build !unit

package event

import (
    "Automated-Scheduling-Project/internal/database/gen_models"
    "Automated-Scheduling-Project/internal/database/models"
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/require"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
)

func setupAttendanceDB(t *testing.T) *gorm.DB {
    db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
    require.NoError(t, err)
    err = db.AutoMigrate(&gen_models.Employee{}, &gen_models.User{}, &models.CustomEventDefinition{}, &models.CustomEventSchedule{}, &models.EventAttendance{}, &models.EventScheduleEmployee{}, &models.EmployeeCompetency{})
    require.NoError(t, err)
    DB = db
    return db
}

// helper to run handler
func runHandler(method, path string, body any, set func(*gin.Context)) *httptest.ResponseRecorder {
    b, _ := json.Marshal(body)
    req, _ := http.NewRequest(method, path, bytes.NewBuffer(b))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = req
    if set != nil { set(c) }
    return w
}

func TestGrantCompetencyForCompletedSchedule_Helper(t *testing.T) {
    db := setupAttendanceDB(t)

    // Seed employee + user
    emp := gen_models.Employee{Employeenumber: "E001", Firstname: "A", Lastname: "B", Useraccountemail: "admin@example.com", Employeestatus: "Active"}
    require.NoError(t, db.Create(&emp).Error)
    u := gen_models.User{EmployeeNumber: emp.Employeenumber, Username: "admin", Password: "x", Role: "Admin"}
    require.NoError(t, db.Create(&u).Error)

    // Definition that grants
    cid := 7
    def := models.CustomEventDefinition{EventName: "First Aid"}
    def.GrantsCertificateID = &cid
    require.NoError(t, db.Create(&def).Error)
    // Schedule
    sch := models.CustomEventSchedule{CustomEventID: def.CustomEventID, Title: "First Aid Cohort", EventStartDate: time.Now().Add(-4*time.Hour), EventEndDate: time.Now().Add(-3*time.Hour), StatusName: "Scheduled"}
    require.NoError(t, db.Create(&sch).Error)

    // Attendance (attended=true)
    att := models.EventAttendance{CustomEventScheduleID: sch.CustomEventScheduleID, EmployeeNumber: emp.Employeenumber, Attended: true}
    require.NoError(t, db.Create(&att).Error)

    // Call helper
    grantCompetenciesForCompletedSchedule(sch.CustomEventScheduleID)

    // Assert competency granted
    var cnt int64
    db.Table("employee_competencies").Where("employee_number = ? AND competency_id = ?", emp.Employeenumber, cid).Count(&cnt)
    require.Equal(t, int64(1), cnt)
}

func TestAttendanceHandlers(t *testing.T) {
    _ = setupAttendanceDB(t)
    gin.SetMode(gin.TestMode)

    // minimal call to SetAttendanceHandler with context
    b, _ := json.Marshal(AttendancePayload{EmployeeNumbers: []string{"EA1"}, Attendance: map[string]bool{"EA1": true}})
    req, _ := http.NewRequest("POST", "/attendance", bytes.NewBuffer(b))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = req
    c.Params = gin.Params{gin.Param{Key: "scheduleID", Value: "1"}}
    c.Set("email", "admin@example.com")

    SetAttendanceHandler(c)
    require.Equal(t, http.StatusOK, w.Code)
}
