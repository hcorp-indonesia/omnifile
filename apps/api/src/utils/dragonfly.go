package utils

import (
	"context"
	"os"

	"github.com/gofiber/storage/redis/v3"
	redigo "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

type DragonflyClient struct {
	Client  *redigo.Client
	Storage *redis.Storage
}

func NewDragonflyClient() *DragonflyClient {
	rdb := redigo.NewClient(&redigo.Options{
		Addr:     os.Getenv("DRAGONFLY_ADDR"),
		Username: os.Getenv("DRAGONFLY_USERNAME"),
		Password: os.Getenv("DRAGONFLY_PASSWORD"),
		DB:       ParseIntEnv("DRAGONFLY_DB", 0),
		PoolSize: 20,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Dragonfly")
	}

	storage := redis.NewFromConnection(rdb)

	log.Debug().Msg("Connected to Dragonfly successfully")

	return &DragonflyClient{
		Client:  rdb,
		Storage: storage,
	}
}
