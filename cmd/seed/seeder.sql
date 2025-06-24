-- Create tables
CREATE TABLE employee (
    EmployeeNumber VARCHAR(200) PRIMARY KEY NOT NULL,
    FirstName VARCHAR(255),
    LastName VARCHAR(255),
    UserAccountEmail VARCHAR(255) UNIQUE NOT NULL,
    EmployeeStatus VARCHAR(100),
    TerminationDate DATE
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    forgot_password_link VARCHAR(255),
    role VARCHAR(50) DEFAULT 'User',
    employee_number VARCHAR(200) NOT NULL,
    CONSTRAINT fk_employee FOREIGN KEY (employee_number) REFERENCES employee(EmployeeNumber) ON DELETE CASCADE
);

CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_type VARCHAR(100),
    relevant_parties VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE user_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Insert dummy data
-- Insert data into the employee table
INSERT INTO employee (EmployeeNumber, FirstName, LastName, UserAccountEmail, EmployeeStatus, TerminationDate)
VALUES
('E001', 'John', 'Doe', 'john.doe@example.com', 'Active', NULL),
('E002', 'Jane', 'Smith', 'jane.smith@example.com', 'Active', NULL),
('E003', 'Alice', 'Johnson', 'alice.johnson@example.com', 'Terminated', '2025-06-01'),
('E004', 'Bob', 'Brown', 'bob.brown@example.com', 'Active', NULL);

-- Insert data into the users table
-- Password is set to: Pa$$w0rd!
INSERT INTO users (id, username, password, forgot_password_link, role, employee_number)
VALUES
(1, 'johndoe', '$2a$10$gca/UYFWZXMD/xBOLKntSeD.fFmE2IdzdqSD1qxFvcuJgDyfd17Qq', NULL, 'Admin', 'E001'),
(2, 'janesmith', '$2a$10$gca/UYFWZXMD/xBOLKntSeD.fFmE2IdzdqSD1qxFvcuJgDyfd17Qq', NULL, 'User', 'E002'),
(3, 'alicejohnson', '$2a$10$gca/UYFWZXMD/xBOLKntSeD.fFmE2IdzdqSD1qxFvcuJgDyfd17Qq', NULL, 'User', 'E003');