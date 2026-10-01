package dragonfly

import (
	"context"
	"os"

	"gofiber-starterkit/pkg/utils"

	"github.com/gofiber/storage/redis/v3"
	redigo "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

type DragonflyClient struct {
	Client  *redigo.Client
	Storage *redis.Storage
}

func New() *DragonflyClient {
	rdb := redigo.NewClient(&redigo.Options{
		Addr:     os.Getenv("DRAGONFLY_ADDR"),
		Username: os.Getenv("DRAGONFLY_USERNAME"),
		Password: os.Getenv("DRAGONFLY_PASSWORD"),
		DB:       utils.ParseIntEnv("DRAGONFLY_DB", 0),
		PoolSize: 20,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Dragonfly")
	}

	storage := dragonflyStorageClient(rdb)

	log.Debug().Msg("Connected to Dragonfly successfully")

	return &DragonflyClient{
		Client:  rdb,
		Storage: storage,
	}
}

func dragonflyStorageClient(cli *redigo.Client) *redis.Storage {
	return redis.NewFromConnection(cli)
}
