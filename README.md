# Project Automated-Scheduling-Project

This project creates an Automated Scheduling System with custom
scheduling rules that integrates with HR systems to automatically schedule
required training, assessments, and compliance reviews while notifying
employees.

## Getting Started

Copy environment example
```bash
cp .env.example .env
```
Edit .env file according to postgres db details

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

## MakeFile

Run build make command with tests
```bash
make all
```

Build the application
```bash
make build
```

Run the application
```bash
make run
```
Create DB container
```bash
make docker-run
```

Shutdown DB Container
```bash
make docker-down
```

DB Integrations Test:
```bash
make itest
```

Live reload the application:
```bash
make watch
```

Run the test suite:
```bash
make test
```

Clean up binary from the last build:
```bash
make clean
```
