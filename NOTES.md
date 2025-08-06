Use npm for npm packages instead of yarn, because UP wifi blocks it

## To use postgres cli:
1. sudo service postgresql start
2. sudo -i -u postgres
3. psql

### To list databases:
\l or \list

## Create and connect to database:
CREATE database_name;
\c database_name

### To list tables:
\dt

## Grant privileges to a user
GRANT ALL PRIVILEGES ON DATABASE database_name TO postgres;


Update documentation to use the linter
Look at the following static analysis tools:
golangci-lint run --fix
staticcheck -checks all ./...
revive -formatter friendly -exclude ./vendor/... ./...
identypo ./...
nakedret ./...
gosec -fmt=golint -quiet ./...