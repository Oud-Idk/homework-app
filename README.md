# homework-app

A homework tracker with class groups, journals, and web push notifications.

Live at [homework.solartuff.co.id](https://homework.solartuff.co.id).

## Stack

| Service | Tech |
| --- | --- |
| `frontend` | Next.js 16, React 19, Tailwind 4, TypeScript |
| `api` | Express 5, TypeScript, Mongoose, Socket.IO |
| `worker-rust` | Rust, Tokio, Lapin, web-push |
| `mongo` | MongoDB, replica set `rs0` |
| `redis` | Redis, cache and queues |
| `rabbitmq` | RabbitMQ, job fanout |
| `meilisearch` | Meilisearch, full text search |
| `minio` | MinIO, S3 compatible uploads |
| `cloudflared` | Cloudflare Tunnel, ingress |

## Layout

```
api/            Express API
  src/routes      request routing
  src/controllers request handling
  src/services    business logic
  src/models      Mongoose schemas
  src/middlewares auth and validation
  scripts/        admin and search sync tools
frontend/       Next.js app
  src/app         App Router pages
  src/components  UI, including the Markdown renderer
worker-rust/    Async worker
  src/workers     notifier and scheduler
  src/queues      RabbitMQ consumers and fanout
config/         redis.conf and MinIO bucket policy
```

## Getting started

Fill in the values in `.env` at the repo root. Docker Compose reads that file
directly. Every key is needed by some service. Then start the stack.

```bash
docker compose -f docker-compose.dev.yml up -d
```

That runs the backing services only, with ports published to the host.

| Service | Port |
| --- | --- |
| MongoDB | 27017 |
| Redis | 6379 |
| RabbitMQ | 5672, management on 16672 |
| Meilisearch | 7700 |
| MinIO API | 9000 |
| MinIO console | 9001 |

Run the app services from your host so you get fast reload:

```bash
cd api && npm install && npm run dev
cd frontend && npm install && npm run dev
```

The frontend listens on 3000. The API defaults to port 4000 and reads its
config from the environment via `dotenv`.

## Production

```bash
docker compose up -d
```

This builds and runs all services on the internal `app_net` bridge network.
Only Cloudflare Tunnel is exposed to the internet, so nothing needs public
ports.

Two one-shot jobs run on boot. `mongo-init-replica` initiates the replica set,
and `minio-setup` creates the `user-uploads` bucket with a public read policy.

Useful commands:

```bash
npm run make-admin --prefix api   # promote a user to admin
npm run sync:search --prefix api # reindex Meilisearch
```

## Notes

Search indexing, scheduling, and notifications run through RabbitMQ. The Rust
worker consumes those queues and sends web push through the VAPID keys.

Uploads go to MinIO and are served from `storage.solartuff.co.id`.

## License

No license set yet. Add one before you reuse this.