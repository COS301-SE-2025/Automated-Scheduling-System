package rules

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
    "Automated-Scheduling-Project/internal/database/gen_models"
)

type ActionRule struct {
	id       string
	enabled  bool
	whenExpr string        // CEL expression, optional
	actions  []RawAction   // notify, webhook, …
}

func (r *ActionRule) ID() string     { return r.id }
func (r *ActionRule) Enabled() bool  { return r.enabled }
func (r *ActionRule) Type() string   { return "action" }

// Validate is called by Engine.ValidateCheck.  If the optional 'when' condition
// evaluates to true (or is empty) we execute each RawAction via runAction,
// otherwise we silently skip.
func (r *ActionRule) Validate(c MedicalCheck, _ Schedule, u gen_models.User) error {
	// ------------------------------------------------------------------
	// 1. Evaluate the optional CEL condition
	// ------------------------------------------------------------------
	if r.whenExpr != "" {
		userVars := map[string]any{
			"id":   u.ID,
			"role": u.Role,
		}
		evtVars := map[string]any{
			"checkType": c.CheckType,
			"result":    c.Result,
		}

		ok, err := Eval(r.whenExpr, userVars, evtVars)
		if err != nil || !ok {
			return err // return nil when condition is simply false
		}
	}

	// ------------------------------------------------------------------
	// 2. Execute each configured action
	// ------------------------------------------------------------------
	vars := map[string]any{
		"user": map[string]any{
			"id":   u.ID,
			"role": u.Role,
		},
		"evt": map[string]any{
			"checkType": c.CheckType,
			"result":    c.Result,
		},
	}

	for _, a := range r.actions {
		if err := runAction(a, vars); err != nil {
			return err
		}
	}
	return nil
}
// Notifier is left as a placeholder.  Consumers will call RegisterNotifier
// once they are ready to plug in e‑mail, SMS, Slack, etc.
//
//     rules.RegisterNotifier(myNotifier)
//
// Until then, notify actions are silently ignored.
type Notifier interface {
    Send(userID int64, msg string) error
}

var notifier Notifier // defaults to nil – safe no‑op

func RegisterNotifier(n Notifier) { notifier = n }

// postJSON is a minimal webhook helper.  It remains functional even if no
// notifier is registered, so webhook actions can be tested immediately.
func postJSON(url string, payload any) error {
    body, err := json.Marshal(payload)
    if err != nil {
        return err
    }
    c := &http.Client{Timeout: 5 * time.Second}
    resp, err := c.Post(url, "application/json", bytes.NewReader(body))
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    if resp.StatusCode >= 300 {
        return fmt.Errorf("webhook %s returned %s", url, resp.Status)
    }
    return nil
}

// runAction executes a RawAction.  For now, "notify" becomes a no‑op when no
// notifier is registered, so your engine won’t panic while you finish the
// comms layer.
func runAction(a RawAction, vars map[string]any) error {
    switch a.Type {
    case "notify":
        // Skip silently if notifier not yet wired.
        if notifier == nil {
            return nil // TODO: log debug once logger is available
        }
        msg, ok := a.Params["message"].(string)
        if !ok {
            return errors.New("notify action requires string param 'message'")
        }
        userMap, _ := vars["user"].(map[string]any)
        userID, _ := userMap["id"].(int64)
        if userID == 0 {
            return errors.New("notify action expects user.id in CEL context")
        }
        return notifier.Send(userID, msg)

    case "webhook":
        url, ok := a.Params["url"].(string)
        if !ok {
            return errors.New("webhook action requires string param 'url'")
        }
        return postJSON(url, vars)

    default:
        return fmt.Errorf("unknown action type %q", a.Type)
    }
}

