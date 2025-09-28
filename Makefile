# Simple Makefile for a Go project

# Build the application
all: build test

build:
	@echo "Building Frontend with NPM..."
	@cd frontend/ && npm install --prefer-offline --no-fund && npm run build
	@echo "Building Backend with GO..."
	@go build -o main cmd/api/main.go
	@echo "Done building..."

# Run migrations
drop-tables:
	@go run cmd/drop_all_tables/main.go

# Run seeder
seed:
	@go run cmd/migrate/main.go
	@go run cmd/seed/main.go

# Auto-generate models
gen:
	@go run cmd/gen/main.go

# Run the application
run:
	@echo "Building frontend once..."
	@cd frontend && npm install --prefer-offline --no-fund
	@echo "Starting backend with live reload..."
	@make watch &
	@cd frontend && npm run dev


# Run frontend tests
ftest:
	@cd frontend && npm install --prefer-offline --no-fund
	@cd frontend && npx vitest run --coverage --coverage.reporter=lcov --coverage.reportsDirectory=coverage

# Run mobile tests
mtest:
    @cd mobile && npm install --prefer-offline --no-fund
    @cd mobile && npm test

# Run frontend linting
flint:
	@cd frontend && npm install --prefer-offline --no-fund && npm run lint

# Create DB container
docker-run:
	@if docker compose up --build 2>/dev/null; then \
		: ; \
	else \
		echo "Falling back to Docker Compose V1"; \
		docker-compose up --build; \
	fi

# Shutdown DB container
docker-down:
	@if docker compose down 2>/dev/null; then \
		: ; \
	else \
		echo "Falling back to Docker Compose V1"; \
		docker-compose down; \
	fi

docker-db:
	@echo "Starting database only..."
	@if docker compose up -d scheduling_db 2>/dev/null; then \
		: ; \
	else \
		echo "Falling back to Docker Compose V1"; \
		docker-compose up -d scheduling_db; \
	fi

# Test the application
test:
	@echo "Testing..."
	@mkdir -p coverage
	@go test ./internal/... -cover -covermode=atomic -coverprofile=coverage/go-integration.out -v

# Unit testing (auth only)
utest:
	@echo "Running Unit Tests"
	@mkdir -p coverage
	@go test -v -tags=unit ./internal/... -covermode=atomic -coverprofile=coverage/go-unit.out

# Integrations Tests for the application
itest:
	@echo "Running integration tests..."
	@go test ./internal/database -v

# Clean the binary
clean:
	@echo "Cleaning..."
	@rm -f main

# Live Reload
watch:
	@if command -v air > /dev/null; then \
            air; \
            echo "Watching...";\
        else \
            read -p "Go's 'air' is not installed on your machine. Do you want to install it? [Y/n] " choice; \
            if [ "$$choice" != "n" ] && [ "$$choice" != "N" ]; then \
                go install github.com/air-verse/air@latest; \
                air; \
                echo "Watching...";\
            else \
                echo "You chose not to install air. Exiting..."; \
                exit 1; \
            fi; \
        fi

.PHONY: all build run test clean watch docker-run docker-down itest flint mtest
