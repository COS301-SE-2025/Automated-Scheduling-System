# Simple Makefile for a Go project

# Build the application
all: build test

build:
	@echo "Building..."
	
	
	@go build -o main cmd/api/main.go

# Run migrations
drop_tables:
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
	@go run cmd/api/main.go &
	@cd frontend && yarn install --prefer-offline --no-fund
	@cd frontend && npm run dev

# Run frontend tests
ftest:
	@cd frontend && yarn install --prefer-offline --no-fund && yarn run test --silent --watch=false

# Run frontend linting
flint:
	@cd frontend && yarn install --prefer-offline --no-fund && yarn run lint

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

# Test the application
test:
	@echo "Testing..."
	@go test ./... -cover -covermode=atomic -coverprofile=coverage.out -v

# Unit testing (auth only)
utest:
	@echo "Running Unit Tests"
	@go test -v -tags=unit ./... -covermode=atomic -coverprofile=coverage.out

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

.PHONY: all build run test clean watch docker-run docker-down itest flint
