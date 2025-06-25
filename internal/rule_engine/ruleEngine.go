package rules

import (
	"encoding/json"
	"fmt"
	"time"
    "errors"
)

type User struct {
    ID string
    Role string
}

type MedicalCheck struct {
    ID string 
    UserID string
    CheckType string
    StartTime  time.Time
    EndTime time.Time
    Result string
}

// Schedule is a wrapper that ewill be enabled by the DB 
// Passed to validate rules to see existing events
type Schedule struct {
    Checks []MedicalCheck
}

// Marker used to store mixed collections
type Rule interface{
    ID() string
    Enabled() bool
    Type() string
}
// Validation runs imediately when a check is proposed
type ValidationRule interface{
    Rule
    Validate(check MedicalCheck, shedule Schedule, user User) error
}

// ScheduleRule is evaluated by a runner on a time-tick (like cron jobs)
// ShouldTrigger decides if Execute must run

type ScheduledRule interface {
    Rule
    ShouldTrigger(now time.Time, user User) bool
    Execute(
        now time.Time,
        user User,
        newCheck func(MedicalCheck) error,
        notify   func(Notification) error,
    ) error
}

type Notification struct {
    ToUserID string  `json:"toUserID"`
    Subject string  `json:"subject"`
    Message string  `json:"message"`
}

type RawRule struct {
    ID string  `json:"id"`
    Type string   `json:"type"`
    Enabled bool `json:"enabled"`
    Target string `json:"target"` // "user", "role", department, etc
    Frequency string `json:"frequency"` // e.g. "6mo" -  only scheduled rules
    Conditions map[string]any `json:"conditions,omitempty"`
    Params  map[string]any  `json:"params,omitempty"`
}

func DecodeRawRules(data []byte) ([]RawRule, error){
    var rr []RawRule
    if err := json.Unmarshal(data, &rr); err != nil{
        return nil, err
    }
    return rr, nil
}


type CooldownRule struct{
    id string
    enabled bool 
    days int // minimum days between two checks 
    checkType string
}

func (r *CooldownRule) ID() string {return r.id}
func (r *CooldownRule) Enabled() bool {return r.enabled}
func (r *CooldownRule) Type() string {return "cooldown"}

func (r *CooldownRule) Validate(check MedicalCheck, schedule Schedule, _ User) error {
    if check.CheckType != r.checkType{
        return nil
    }
    for _,c := range schedule.Checks {
        if c.UserID == check.UserID && c.CheckType == check.CheckType{
            diff := check.StartTime.Sub(c.StartTime)
            if diff < 0{
                diff = -diff
            }
            if diff < (time.Duration(r.days)* 24* time.Hour){
                return fmt.Errorf("%s check must be at least %d days apart", r.checkType, r.days)
            }
        }
    }
    return nil
}

type RecurringCheckRule struct {              // single “c”
    id               string
    enabled          bool
    frequencyMonths  int
    notifyDaysBefore int
    checkType        string
    lastRun          map[string]time.Time
}

func (r *RecurringCheckRule) ID() string      { return r.id }
func (r *RecurringCheckRule) Enabled() bool   { return r.enabled }
func (r *RecurringCheckRule) Type() string    { return "recurringCheck" }

func (r *RecurringCheckRule) ShouldTrigger(now time.Time, user User) bool {
    if !r.enabled {
        return false
    }
    if lr, ok := r.lastRun[user.ID]; ok {
        next := lr.AddDate(0, r.frequencyMonths, 0)
        return !now.Before(next) // true when now ≥ next
    }
    return true // first-ever run
}



func (r *RecurringCheckRule) Execute(now time.Time, user User, newCheck func(MedicalCheck) error, notify func(Notification) error ) error {
    checkDate := now.AddDate(0,0,r.notifyDaysBefore)
    // Create new medical check in the future 
    mc := MedicalCheck{
        ID: fmt.Sprintf("%s-%s-%d", r.checkType, user.ID, now.Unix()),
        UserID: user.ID, 
        CheckType: r.checkType,
        StartTime: checkDate,
        EndTime: checkDate.Add(30 * time.Minute),
    }
    if err := newCheck(mc); err != nil{
        return err
    }

    note := Notification{
        ToUserID: user.ID,
        Subject: fmt.Sprintf("Upcomming %s check", r.checkType),
        Message: fmt.Sprintf("You have a %s medical check on %s", r.checkType, mc.StartTime.Format(time.RFC822)),
    }
    if err := notify(note); err != nil {
        return err
    }
    r.lastRun[user.ID] = now
    return nil
}

// Factory RawRule -> full implemenation


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
        return &CooldownRule{
            id:        rr.ID,
            enabled:   rr.Enabled,
            days:      int(days),
            checkType: ct,
        }, nil

    case "recurringCheck":
       
        freqStr, pdaysAny := rr.Frequency, rr.Params["notifyDaysBefore"]
        pdays := pdaysAny.(float64)
        ct, _  := rr.Params["checkType"].(string)


        months, err := parseMonths(freqStr)
        if err != nil {
            return nil, err
        }

        return &RecurringCheckRule{
            id:               rr.ID,
            enabled:          rr.Enabled,
            frequencyMonths:  months,
            notifyDaysBefore: int(pdays),
            checkType:        ct,
            lastRun:          make(map[string]time.Time),
        }, nil

    default:
        return nil, fmt.Errorf("unknown rule type: %s", rr.Type)
    }
}

// parseMonths converts a string like "6mo" → 6.
func parseMonths(s string) (int, error) {
    var n int
    if _, err := fmt.Sscanf(s, "%dmo", &n); err != nil {
        return 0, fmt.Errorf("invalid frequency %q; expected e.g. '6mo'", s)
    }
    if n <= 0 {
        return 0, errors.New("frequency must be >0 months")
    }
    return n, nil
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
func (e *Engine) ValidateCheck(check MedicalCheck, sch Schedule, u User) []error {
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
func (e *Engine) RunScheduled(now time.Time, users []User,
    newCheck func(MedicalCheck) error,
    notify func(Notification) error) {

    for _, r := range e.scheduled {
        for _, u := range users {
            if sr, ok := r.(ScheduledRule); ok && sr.ShouldTrigger(now, u) {
                _ = sr.Execute(now, u, newCheck, notify) // ignore exec errors for demo
            }
        }
    }
}
