-- Sample rules for testing the integration
-- Run these INSERT statements to add some example rules to your database

-- Insert a cooldown rule for vision checks
INSERT INTO db_rules (id, enabled, type, body) VALUES (
    'vision-cooldown-30',
    true,
    'cooldown',
    '{"id": "vision-cooldown-30", "type": "cooldown", "enabled": true, "params": {"days": 30, "checkType": "vision"}}'
);

-- Insert a recurring rule for annual health checks
INSERT INTO db_rules (id, enabled, type, body) VALUES (
    'annual-health-check',
    true,
    'recurringCheck',
    '{"id": "annual-health-check", "type": "recurringCheck", "enabled": true, "frequency": {"years": 1}, "params": {"checkType": "health", "notifyDaysBefore": 14}}'
);

-- Insert an action rule that notifies drivers about vision tests
INSERT INTO db_rules (id, enabled, type, body) VALUES (
    'driver-vision-notification',
    true,
    'action',
    '{"id": "driver-vision-notification", "type": "action", "enabled": true, "when": "user.role == \"driver\" && check[\"checkType\"] == \"vision\"", "actions": [{"type": "notify", "params": {"message": "Time for your vision test"}}]}'
);
