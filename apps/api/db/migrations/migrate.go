package main

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"os"
	"strings"

	"magic-converter/config"
	"magic-converter/db/seeders"

	"github.com/joho/godotenv"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/migrate"
)

var Migrations = migrate.NewMigrations()

//go:embed *.sql
var sqlMigrations embed.FS

type atlasToBunFS struct {
	fs.FS
}

func (f atlasToBunFS) ReadDir(name string) ([]fs.DirEntry, error) {
	entries, err := fs.ReadDir(f.FS, name)
	if err != nil {
		return nil, err
	}
	newEntries := make([]fs.DirEntry, len(entries))
	for i, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") && !strings.HasSuffix(entry.Name(), ".up.sql") && !strings.HasSuffix(entry.Name(), ".down.sql") {
			newEntries[i] = renamedEntry{entry}
		} else {
			newEntries[i] = entry
		}
	}
	return newEntries, nil
}

func (f atlasToBunFS) Open(name string) (fs.File, error) {
	realName := name
	if strings.HasSuffix(name, ".up.sql") {
		potentialName := strings.TrimSuffix(name, ".up.sql") + ".sql"
		if _, err := fs.Stat(f.FS, potentialName); err == nil {
			realName = potentialName
		}
	}
	return f.FS.Open(realName)
}

type renamedEntry struct {
	fs.DirEntry
}

func (e renamedEntry) Name() string {
	return strings.TrimSuffix(e.DirEntry.Name(), ".sql") + ".up.sql"
}

func init() {
	if err := Migrations.Discover(atlasToBunFS{sqlMigrations}); err != nil {
		panic(err)
	}

	if os.Getenv("APP_ENV") == "" || os.Getenv("APP_ENV") == "local" || os.Getenv("APP_ENV") == "development" {
		_ = godotenv.Load("../../.env", "../.env", ".env")
	}
}

func main() {
	ctx := context.Background()
	seedModule := ""
	for _, arg := range os.Args[1:] {
		if arg == "--seed" {
			seedModule = "all"
		} else if strings.HasPrefix(arg, "--seed=") {
			seedModule = strings.TrimPrefix(arg, "--seed=")
		}
	}

	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(config.DatabaseConnectionString())))
	pg := bun.NewDB(sqldb, pgdialect.New())
	defer pg.Close()

	migrator := migrate.NewMigrator(pg, Migrations)
	if err := migrator.Init(ctx); err != nil {
		fmt.Printf("Failed to initialize migrator: %v\n", err)
		os.Exit(1)
	}

	group, err := migrator.Migrate(ctx)
	if err != nil {
		fmt.Printf("Failed to run migrations: %v\n", err)
		os.Exit(1)
	}
	if group.IsZero() {
		fmt.Println("No new migrations to run")
	} else {
		fmt.Printf("Migrated to %s\n", group)
	}

	if seedModule != "" {
		if err := seeders.Run(ctx, pg, seedModule); err != nil {
			fmt.Printf("Failed to run seeders: %v\n", err)
			os.Exit(1)
		}
	}
}
