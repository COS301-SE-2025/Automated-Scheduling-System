This folder contains JMeter test plans and instructions for running them locally or in CI.

How it runs in CI (GitHub Actions):
- The workflow `.github/workflows/go-test.yml` builds the Go binary (`make build` -> `go build -o main cmd/api/main.go`) and uploads it as artifact `my-app-build`.
- The `performance-test` job downloads the artifact, starts a PostgreSQL service, runs migrations and seeds, starts the `main` binary on port 8080, then runs the JMeter test plan `jmeter/tests/api-test-plan.jmx` against `http://localhost:8080`.

Run locally:
- Ensure Postgres is running and matches the env vars in `.env` (or set them in your shell):
  - BLUEPRINT_DB_HOST, BLUEPRINT_DB_PORT, BLUEPRINT_DB_USERNAME, BLUEPRINT_DB_PASSWORD, BLUEPRINT_DB_DATABASE, BLUEPRINT_DB_SCHEMA
  This folder contains JMeter test plans and detailed, copy‑pasteable instructions to run them locally or in CI.

  Summary
  - Test plan: `jmeter/tests/api-test-plan.jmx` (targets `http://localhost:8080` by default)
  - JMeter version used in CI: 5.6.3 (the repository includes a JMeter distribution under `apache-jmeter-5.6.3/`)

  Prerequisites (what must be in place before any test runs)
  - Java (JRE/JDK) available on PATH for running JMeter.
  - PostgreSQL accessible and seeded for the application. The following environment variables must be set for the app:
    - `BLUEPRINT_DB_HOST` (e.g. localhost)
    - `BLUEPRINT_DB_PORT` (e.g. 5432)
    - `BLUEPRINT_DB_USERNAME` (e.g. postgres)
    - `BLUEPRINT_DB_PASSWORD`
    - `BLUEPRINT_DB_DATABASE` (e.g. scheduling_db)
    - `BLUEPRINT_DB_SCHEMA` (e.g. public)
    - `PORT` (the HTTP port the app listens on; default used in plan: `8080`)
  - Application migrations and seed SQL must be applied before test (CI runs `go run cmd/migrate/main.go` and `go run cmd/seed/main.go`).
  - The built Go binary `./main` must be available (CI builds via `make build` which produces `./main`).

  How the CI job runs (GitHub Actions mapping)
  - `build_and_unit_test` job (existing): builds the application with `make build` and uploads the compiled binary (`./main`) as artifact `my-app-build`.
  - `performance-test` job (depends on build):
    1. Starts a Postgres service container and waits for readiness.
    2. Downloads `my-app-build` artifact and makes `./main` executable.
    3. Runs migrations and seeds: `go run cmd/migrate/main.go` and `go run cmd/seed/main.go`.
    4. Exports DB env vars and `PORT=8080`, then starts `./main` in the background.
    5. Runs JMeter (uses `rbhadti94/apache-jmeter-action@v0.6.0` configured to use JMeter 5.6.3) with test file `jmeter/tests/api-test-plan.jmx`.
    6. Uploads JMeter reports as artifacts (`jmeter/reports/`).

  How to run the test locally (copy-paste commands)
  Note: these examples assume WSL or a POSIX shell. Adjust Windows paths if using CMD/PowerShell.

  1) Start Postgres (or ensure DB is available) and set env vars
  ```bash
  # example for local Postgres (adjust values to your environment)
  export BLUEPRINT_DB_HOST=localhost
  export BLUEPRINT_DB_PORT=5432
  export BLUEPRINT_DB_USERNAME=postgres
  export BLUEPRINT_DB_PASSWORD=postgres
  export BLUEPRINT_DB_DATABASE=scheduling_db
  export BLUEPRINT_DB_SCHEMA=public
  export PORT=8080
  ```

  2) Build and prepare the app
  ```bash
  # from repo root
  make build      # produces ./main
  # apply migrations & seed DB (same commands used in CI)
  go run cmd/migrate/main.go
  go run cmd/seed/main.go
  # start app in background
  chmod +x ./main
  ./main &
  # (optionally) wait until the health endpoint returns 200
  until curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health | grep -q 200; do
    echo 'waiting for app...'
    sleep 1
  done
  ```

  3) Run JMeter headless (non-GUI) and create an HTML report
  ```bash
  # using the bundled JMeter in this repo (recommended)
  JMETER_BIN="$(pwd)/apache-jmeter-5.6.3/bin/jmeter"
  PLAN="$(pwd)/jmeter/tests/api-test-plan.jmx"
  RESULTS="$(pwd)/jmeter/reports/result.jtl"
  OUT_DIR="$(pwd)/jmeter/reports/html"

  # ensure the output dir does not already exist (JMeter requires -o dir to be non-existent)
  rm -rf "$(pwd)/jmeter/reports"
  mkdir -p "$(pwd)/jmeter/reports"   # we'll keep the directory but make the html subdir non-existent

  # run test (override variables if needed). Example overrides set server & port explicitly:
  "$JMETER_BIN" -n -t "$PLAN" -l "$RESULTS" -Jserver=localhost -Jport=8080

  # generate the HTML report from the produced .jtl
  rm -rf "$OUT_DIR"
  "$JMETER_BIN" -g "$RESULTS" -o "$OUT_DIR"

  # open the report in Windows explorer (from WSL)
  explorer.exe "$(wslpath -w "$OUT_DIR")"
  ```

  4) If you only have an existing `.jtl` and want to create the HTML report (no test run)
  ```bash
  # JMETER_BIN and RESULTS should point to the correct locations
  "$JMETER_BIN" -g "/path/to/results.jtl" -o "/path/to/report-output-dir"
  ```

  Important JMeter notes
  - The test plan defines two user-defined variables: `server` and `port`. You can override them on the command line with `-Jserver=... -Jport=...`.
  - The Thread Group uses a fixed duration (60s by default). You can make this configurable by editing the JMX to use `${__P(testDuration,60)}` and then passing `-JtestDuration=30` to JMeter.
  - The Response Assertion in `api-test-plan.jmx` now checks the HTTP response code equals `200` (this was updated to avoid validating the response body incorrectly).

  Troubleshooting
  - Report HTML generation fails: ensure the `-o` output directory does not exist. Remove it, then re-run `jmeter -g`.
  - Empty or truncated `.jtl`: if the .jtl is empty the report generator will fail. Confirm the app was reachable during the test and that the `.jtl` file contains sample lines: `tail -n 20 jmeter/reports/result.jtl`.
  - JMeter version mismatch: CI is configured to use JMeter 5.6.3. If you run a different local JMeter version and your JMX was saved by 5.6.x you may see load errors — use the bundled `apache-jmeter-5.6.3/` or install 5.6.3 locally.
  - Assertion failures: the plan now asserts response code `200`. If your app returns other codes (redirects, auth required), either update the plan or make the app/seed/config match the expected behavior.

  Graceful stop
  - If you need to stop a running JMeter test and still want a usable `.jtl`/report: send a graceful shutdown (press Ctrl+C once in the terminal running JMeter, or `touch apache-jmeter-5.6.3/bin/shutdown`). Avoid `kill -9`.

  CI notes / tips
  - If you cancel a workflow run in GitHub Actions the JMeter job may be terminated before it can generate the HTML report. The job currently uploads raw JMeter outputs from `jmeter/reports/` as artifacts — ensure your workflow always uploads the `.jtl` (you can add an `if: always()` upload step if you want artifacts on failed/cancelled runs).
  - Put DB credentials in GitHub Secrets rather than hard-coding them if you change the workflow to run against non-service DBs.

  Questions or next changes I can make
  - Make the expected response code configurable via a JMeter property (e.g. `-JexpectedCode=200`) and update the JMX to use that property.
  - Add a small health/poll script step to the CI job so JMeter doesn't start until the app responds 200.

  ---
  Updated: This file was expanded to include precise local commands and CI mapping so you can reproduce runs locally and in GitHub Actions.