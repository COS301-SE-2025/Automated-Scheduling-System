package scheduler

import (
    "context"
    "log"
    "sync"
    "time"

    "github.com/robfig/cron/v3"
    "gorm.io/gorm"
)

// Service manages time-based triggers.
type Service struct {
    db       *gorm.DB
    store    RuleStore
    eval     EvaluateFunc
    cron     *cron.Cron
    interval time.Duration

    stop   chan struct{}
    closed chan struct{}

    // Debug enables verbose logging.
    Debug bool

    mu       sync.Mutex
    fixedIDs map[string]cron.EntryID // key -> cron entry
}

// debugf logs only when Debug is true.
func (s *Service) debugf(format string, args ...any) {
    if s.Debug {
        log.Printf("[rulesv2/scheduler] "+format, args...)
    }
}

// EnableDebug toggles verbose logging.
func (s *Service) EnableDebug(v bool) { s.Debug = v }

func New(db *gorm.DB, store RuleStore, eval EvaluateFunc) *Service {
    parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.Descriptor)
    return &Service{
        db:       db,
        store:    store,
        eval:     eval,
        cron:     cron.New(cron.WithParser(parser), cron.WithLocation(time.UTC)),
        interval: time.Minute,
        stop:     make(chan struct{}),
        closed:   make(chan struct{}),
        fixedIDs: map[string]cron.EntryID{},
    }
}

func (s *Service) Start(ctx context.Context) error {
    s.debugf("Start: loading scheduled_time rules and starting poller (interval=%s)", s.interval)
    if err := s.scheduleFixedTimeRules(ctx); err != nil {
        return err
    }
    s.cron.Start()
    go s.runRelativePoller(ctx)
    return nil
}

func (s *Service) Stop(ctx context.Context) error {
    s.debugf("Stop: stopping cron and poller")
    s.cron.Stop()
    close(s.stop)
    <-s.closed
    s.debugf("Stop: all background workers stopped")
    return nil
}

// DumpCronEntries logs current cron entries (id, next, prev).
func (s *Service) DumpCronEntries() {
    for _, e := range s.cron.Entries() {
        log.Printf("[rulesv2/scheduler] entry id=%d next=%s prev=%s", e.ID, e.Next.Format(time.RFC3339), e.Prev.Format(time.RFC3339))
    }
}