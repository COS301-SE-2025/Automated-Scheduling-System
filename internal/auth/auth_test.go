package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

/* -------------------------------------------------------------------------- */
/*                               helpers                                      */
/* -------------------------------------------------------------------------- */

const (
	testEmail    = "alice@example.com"
	testPassword = "s3cr3t!"
	jwtEnvKey    = "JWT_SECRET"
)

func dump(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	t.Logf("status=%d body=%s", w.Code, w.Body.String())
}

func testDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&User{}))
	DB = db
	return db
}

// ctxWithForm builds a gin.Context carrying x-www-form-urlencoded data.
func ctxWithForm(t *testing.T, db *gorm.DB, method string, form url.Values) (*gin.Context, *httptest.ResponseRecorder) {
	req, err := http.NewRequest(method, "/", strings.NewReader(form.Encode()))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	c.Set("db", db)
	return c, rec
}

/* -------------------------------------------------------------------------- */
/*                            RegisterHandler tests                           */
/* -------------------------------------------------------------------------- */

func TestRegisterHandler_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testDB(t)

	form := url.Values{
		"username": {"alice"},
		"email":    {testEmail},
		"password": {testPassword},
	}

	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	RegisterHandler(c)
	require.Equal(t, http.StatusOK, rec.Code)

	var u User
	require.NoError(t, db.First(&u, "email = ?", testEmail).Error)
}

func TestRegisterHandler_Duplicate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testDB(t)

	form := url.Values{
		"username": {"alice"},
		"email":    {testEmail},
		"password": {testPassword},
	}

	// first registration
	c, rec := ctxWithForm(t, db, http.MethodPost, form)
	RegisterHandler(c)
	require.Equal(t, http.StatusConflict, rec.Code)

	// duplicate should fail with 409
	c, rec = ctxWithForm(t, db, http.MethodPost, form)
	RegisterHandler(c)
	require.Equal(t, http.StatusConflict, rec.Code)
}

/* -------------------------------------------------------------------------- */
/*                               LoginHandler tests                           */
/* -------------------------------------------------------------------------- */

func TestLoginHandler_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testDB(t)

	// create user
	reg := url.Values{
		"username": {"alice"},
		"email":    {testEmail},
		"password": {testPassword},
	}
	c, _ := ctxWithForm(t, db, http.MethodPost, reg)
	RegisterHandler(c)

	// login
	login := url.Values{
		"email":    {testEmail},
		"password": {testPassword},
	}
	c, rec := ctxWithForm(t, db, http.MethodPost, login)
	LoginHandler(c)
	require.Equal(t, http.StatusOK, rec.Code)

	var out struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
	require.NotEmpty(t, out.Token)
}

func TestLoginHandler_WrongPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testDB(t)

	// create user
	reg := url.Values{
		"username": {"alice"},
		"email":    {testEmail},
		"password": {testPassword},
	}
	c, _ := ctxWithForm(t, db, http.MethodPost, reg)
	RegisterHandler(c)

	// bad password
	bad := url.Values{
		"email":    {testEmail},
		"password": {"wrong"},
	}
	c, rec := ctxWithForm(t, db, http.MethodPost, bad)
	LoginHandler(c)
	require.Equal(t, http.StatusUnauthorized, rec.Code)
}

/* -------------------------------------------------------------------------- */
/*                              ProfileHandler tests                          */
/* -------------------------------------------------------------------------- */

func TestProfileHandler_ValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_ = os.Setenv(jwtEnvKey, "test-secret")
	db := testDB(t)

	// register + login to obtain token
	reg := url.Values{
		"username": {"alice"},
		"email":    {testEmail},
		"password": {testPassword},
	}
	c, _ := ctxWithForm(t, db, http.MethodPost, reg)
	RegisterHandler(c)

	login := url.Values{
		"email":    {testEmail},
		"password": {testPassword},
	}
	c, rec := ctxWithForm(t, db, http.MethodPost, login)
	LoginHandler(c)

	var resp struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))

	// craft GET with token
	req, _ := http.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+resp.Token)

	rec = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(rec)
	c.Request = req
	c.Set("db", db)

	AuthMiddleware()(c)
	if !c.IsAborted() {
		ProfileHandler(c)
	}

	require.Equal(t, http.StatusOK, rec.Code)

	var profile struct {
		Email    string `json:"email"`
		Username string `json:"username"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &profile))
	require.Equal(t, testEmail, profile.Email)
}

func TestProfileHandler_MissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testDB(t)

	req, _ := http.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	c.Set("db", db)

	AuthMiddleware()(c)
	if !c.IsAborted() {
		ProfileHandler(c)
	}

	require.Equal(t, http.StatusUnauthorized, rec.Code)
}
