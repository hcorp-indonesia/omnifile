package main

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"strings"
	"time"

	"gofiber-starterkit/app/modules/product"
	"gofiber-starterkit/pkg/utils"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/migrate"
)

var Migrations = migrate.NewMigrations()

//go:embed *.sql
var sqlMigrations embed.FS

// atlasToBunFS wraps embed.FS to trick Bun into seeing Atlas-style .sql files as .up.sql files
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
		if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
			log.Error().Err(err).Msg("Error loading .env file")
		}
	}
}

func main() {
	ctx := context.Background()

	seed := false
	for _, arg := range os.Args[1:] {
		if arg == "--seed" {
			seed = true
		}
	}

	sqldb := sql.OpenDB(pgdriver.NewConnector(
		pgdriver.WithDSN(utils.DatabaseConnectionString()),
	))

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

	if seed {
		if err := seeder(pg, ctx); err != nil {
			fmt.Printf("Failed to run seeder: %v\n", err)
			os.Exit(1)
		}
	}
}

func seeder(pg *bun.DB, ctx context.Context) error {
	fmt.Println("Running seeder...")

	products := []product.Product{
		{
			Name:        "Premium Coffee Beans",
			Description: ptr("Organic Arabica beans from Gayo highlands."),
			Price:       150000,
			Stock:       50,
			Status:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Name:        "Green Tea Matcha",
			Description: ptr("Pure ceremonial grade matcha powder."),
			Price:       200000,
			Stock:       30,
			Status:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	for _, p := range products {
		exists, err := pg.NewSelect().Model((*product.Product)(nil)).Where("name = ?", p.Name).Exists(ctx)
		if err != nil {
			return err
		}
		if exists {
			fmt.Printf("Product %s already exists, skipping\n", p.Name)
			continue
		}

		_, err = pg.NewInsert().Model(&p).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to insert product %s: %w", p.Name, err)
		}

		fmt.Printf("Seeded product: %s\n", p.Name)
	}

	fmt.Println("Seeding completed")
	return nil
}

func ptr[T any](v T) *T {
	return &v
}
