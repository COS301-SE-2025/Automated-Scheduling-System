package rules

import (
	"Automated-Scheduling-Project/internal/database/gen_models"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"
)

type MedicalCheck struct {
	ID        string
	UserID    int64
	CheckType string
	StartTime time.Time
	EndTime   time.Time
	Result    string
}

// Schedule is a wrapper that will be enabled by the DB
// Passed to validate rules to see existing events
type Schedule struct {
	Checks []MedicalCheck
}

// Marker used to store mixed collections
type Rule interface {
	ID() string
	Enabled() bool
	Type() string
	Description() string
	TargetsUser(user gen_models.User) bool
}

// Validation runs immediately when a check is proposed
type ValidationRule interface {
	Rule
	Validate(check MedicalCheck, schedule Schedule, user gen_models.User) error
}

// ScheduleRule is evaluated by a runner on a time-tick (like cron jobs)
// ShouldTrigger decides if Execute must run
type ScheduledRule interface {
	Rule
	ShouldTrigger(now time.Time, user gen_models.User) bool
	Execute(
		now time.Time,
		user gen_models.User,
		newCheck func(MedicalCheck) error,
		notify func(Notification) error,
	) error
}

type Notification struct {
	ToUserID int64  `json:"toUserID"`
	Subject  string `json:"subject"`
	Message  string `json:"message"`
}

type Period struct {
	Years  int `json:"years,omitempty"`
	Months int `json:"months,omitempty"`
	Days   int `json:"days,omitempty"`
}

type RawRule struct {
	ID          string         `json:"id"`
	Type        string         `json:"type"`
	Enabled     bool           `json:"enabled"`
	Description string         `json:"description,omitempty"`
	Target      string         `json:"target"` // "user", "role", "employee_number", "all"
	TargetValue string         `json:"target_value,omitempty"`
	UserIDs     []int64        `json:"user_ids,omitempty"`
	Frequency   *Period        `json:"frequency,omitempty"`
	Conditions  map[string]any `json:"conditions,omitempty"`
	Params      map[string]any `json:"params,omitempty"`
	When        string         `json:"when,omitempty"`
	Actions     []RawAction    `json:"actions,omitempty"`
}

type RawAction struct {
	Type   string         `json:"type"` // Things like webhook, 'notify'
	Params map[string]any `json:"params,omitempty"`
}

func DecodeRawRules(data []byte) ([]RawRule, error) {
	var rr []RawRule
	if err := json.Unmarshal(data, &rr); err != nil {
		return nil, err
	}
	return rr, nil
}

type CooldownRule struct {
	id          string
	enabled     bool
	description string
	target      string
	targetValue string
	userIDs     []int64
	days        int // minimum days between two checks
	checkType   string
}

func (r *CooldownRule) ID() string          { return r.id }
func (r *CooldownRule) Enabled() bool       { return r.enabled }
func (r *CooldownRule) Type() string        { return "cooldown" }
func (r *CooldownRule) Description() string { return r.description }

func (r *CooldownRule) TargetsUser(user gen_models.User) bool {
	switch r.target {
	case "all":
		return true
	case "user":
		for _, userID := range r.userIDs {
			if userID == user.ID {
				return true
			}
		}
		return false
	case "role":
		return user.Role == r.targetValue
	case "employee_number":
		return user.EmployeeNumber == r.targetValue
	default:
		return false
	}
}

func (r *CooldownRule) Validate(check MedicalCheck, schedule Schedule, user gen_models.User) error {
	// Check if this rule applies to this user
	if !r.TargetsUser(user) {
		return nil
	}
	
	if check.CheckType != r.checkType {
		return nil
	}
	for _, c := range schedule.Checks {
		if c.UserID == check.UserID && c.CheckType == check.CheckType {
			diff := check.StartTime.Sub(c.StartTime)
			if diff < 0 {
				diff = -diff
			}
			if diff < (time.Duration(r.days) * 24 * time.Hour) {
				return fmt.Errorf("%s check must be at least %d days apart", r.checkType, r.days)
			}
		}
	}
	return nil
}

type RecurringCheckRule struct {
	id               string
	enabled          bool
	description      string
	target           string
	targetValue      string
	userIDs          []int64
	frequency        Period
	notifyDaysBefore int
	checkType        string
	lastRun          map[int64]time.Time
}

func (r *RecurringCheckRule) ID() string          { return r.id }
func (r *RecurringCheckRule) Enabled() bool       { return r.enabled }
func (r *RecurringCheckRule) Type() string        { return "recurringCheck" }
func (r *RecurringCheckRule) Description() string { return r.description }

func (r *RecurringCheckRule) TargetsUser(user gen_models.User) bool {
	switch r.target {
	case "all":
		return true
	case "user":
		for _, userID := range r.userIDs {
			if userID == user.ID {
				return true
			}
		}
		return false
	case "role":
		return user.Role == r.targetValue
	case "employee_number":
		return user.EmployeeNumber == r.targetValue
	default:
		return false
	}
}

func (r *RecurringCheckRule) ShouldTrigger(now time.Time, user gen_models.User) bool {
	// Check if this rule applies to this user
	if !r.TargetsUser(user) {
		return false
	}
	
	if !r.enabled {
		return false
	}
	if lr, ok := r.lastRun[user.ID]; ok {
		next := lr.AddDate(r.frequency.Years, r.frequency.Months, r.frequency.Days)
		return !now.Before(next) // true when now ≥ next
	}
	return true // first-ever run
}

func (r *RecurringCheckRule) Execute(now time.Time, user gen_models.User, newCheck func(MedicalCheck) error, notify func(Notification) error) error {
	// Check if this rule applies to this user
	if !r.TargetsUser(user) {
		return nil
	}
	
	checkDate := now.AddDate(0, 0, r.notifyDaysBefore)
	// Create new medical check in the future
	mc := MedicalCheck{
		ID:        fmt.Sprintf("%s-%v-%d", r.checkType, user.ID, now.Unix()),
		UserID:    user.ID,
		CheckType: r.checkType,
		StartTime: checkDate,
		EndTime:   checkDate.Add(30 * time.Minute),
	}
	if err := newCheck(mc); err != nil {
		return err
	}

	note := Notification{
		ToUserID: user.ID,
		Subject:  fmt.Sprintf("Upcoming %s check", r.checkType),
		Message:  fmt.Sprintf("You have a %s medical check on %s", r.checkType, mc.StartTime.Format(time.RFC822)),
	}
	if err := notify(note); err != nil {
		return err
	}
	r.lastRun[user.ID] = now
	return nil
}

// Factory RawRule -> full implementation
func BuildRule(rr RawRule) (Rule, error) {
	if !rr.Enabled {
		return nil, nil // skip disabled rules
	}

	switch rr.Type {
	case "cooldown":
		days, ok := rr.Params["days"].(float64)
		if !ok {
			return nil, errors.New("cooldown rule requires numeric 'days' param")
		}
		ct, _ := rr.Params["checkType"].(string)
		
		// Extract user IDs from target configuration
		var userIDs []int64
		if rr.Target == "user" {
			if rr.UserIDs != nil {
				userIDs = rr.UserIDs
			} else if rr.TargetValue != "" {
				// Handle single user ID in target_value for backward compatibility
				if userID, err := strconv.ParseInt(rr.TargetValue, 10, 64); err == nil {
					userIDs = []int64{userID}
				}
			}
		}
		
		return &CooldownRule{
			id:          rr.ID,
			enabled:     rr.Enabled,
			description: rr.Description,
			target:      rr.Target,
			targetValue: rr.TargetValue,
			userIDs:     userIDs,
			days:        int(days),
			checkType:   ct,
		}, nil

	case "recurringCheck":
		if rr.Frequency == nil {
			return nil, fmt.Errorf("recurringCheck %q, frequency is required", rr.ID)
		}
		per := *rr.Frequency
		if per.Years == 0 && per.Months == 0 && per.Days == 0 {
			return nil, fmt.Errorf("recurringCheck %q: frequency cannot be 0", rr.ID)
		}

		pdAny, ok := rr.Params["notifyDaysBefore"]
		if !ok {
			return nil, fmt.Errorf("recurringCheck %q: param 'notifyDaysBefore' not set", rr.ID)
		}

		pDays, ok := pdAny.(float64)
		if !ok {
			return nil, fmt.Errorf("'notifyDaysBefore' must be numeric")
		}

		ct, _ := rr.Params["checkType"].(string)

		// Extract user IDs from target configuration
		var userIDs []int64
		if rr.Target == "user" {
			if rr.UserIDs != nil {
				userIDs = rr.UserIDs
			} else if rr.TargetValue != "" {
				if userID, err := strconv.ParseInt(rr.TargetValue, 10, 64); err == nil {
					userIDs = []int64{userID}
				}
			}
		}

		return &RecurringCheckRule{
			id:               rr.ID,
			enabled:          rr.Enabled,
			description:      rr.Description,
			target:           rr.Target,
			targetValue:      rr.TargetValue,
			userIDs:          userIDs,
			frequency:        per,
			notifyDaysBefore: int(pDays),
			checkType:        ct,
			lastRun:          make(map[int64]time.Time),
		}, nil
	case "action":
		if len(rr.Actions) == 0 {
			return nil, fmt.Errorf("action rule %q has no actions", rr.ID)
		}
		
		// Extract user IDs from target configuration
		var userIDs []int64
		if rr.Target == "user" {
			if rr.UserIDs != nil {
				userIDs = rr.UserIDs
			} else if rr.TargetValue != "" {
				if userID, err := strconv.ParseInt(rr.TargetValue, 10, 64); err == nil {
					userIDs = []int64{userID}
				}
			}
		}
		
		return &ActionRule{
			id:          rr.ID,
			enabled:     rr.Enabled,
			description: rr.Description,
			target:      rr.Target,
			targetValue: rr.TargetValue,
			userIDs:     userIDs,
			whenExpr:    rr.When,
			actions:     rr.Actions,
		}, nil

	default:
		return nil, fmt.Errorf("unknown rule type: %s", rr.Type)
	}
}

type Engine struct {
	validations []ValidationRule
	scheduled   []ScheduledRule
}

// NewEngine takes already‑built rules (you can mix both kinds in one slice).
func NewEngine(rs []Rule) *Engine {
	var v []ValidationRule
	var s []ScheduledRule
	for _, r := range rs {
		if r == nil { // disabled rule returned nil
			continue
		}
		switch t := r.(type) {
		case ValidationRule:
			v = append(v, t)
		case ScheduledRule:
			s = append(s, t)
		}
	}
	return &Engine{validations: v, scheduled: s}
}

// ValidateCheck runs all validation rules and returns the first violations.
func (e *Engine) ValidateCheck(check MedicalCheck, sch Schedule, u gen_models.User) []error {
	var errs []error
	for _, r := range e.validations {
		if err := r.Validate(check, sch, u); err != nil {
			errs = append(errs, fmt.Errorf("[%s] %w", r.ID(), err))
		}
	}
	return errs
}

// RunScheduled iterates over all users and executes rules that hit.
// Inject two delegate functions so the engine stays decoupled from persistence
// and messaging layers.
func (e *Engine) RunScheduled(now time.Time, users []gen_models.User,
	newCheck func(MedicalCheck) error,
	notify func(Notification) error) {

	for _, r := range e.scheduled {
		for _, u := range users {
			if r.ShouldTrigger(now, u) {
				_ = r.Execute(now, u, newCheck, notify) // ignore exec errors for demo
			}
		}
	}
}
