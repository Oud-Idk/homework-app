# Stage 1: Plan
FROM lukemathwalker/cargo-chef:latest AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Stage 2: Build dependencies
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# This layer is cached unless your Cargo.toml changes
RUN cargo chef cook --release --recipe-path recipe.json

# Stage 3: Build application
COPY . .
RUN cargo build --release --bin worker-rust

# Stage 4: Runtime
FROM ubuntu:24.04
# Ubuntu 24.04 uses GLIBC 2.39, which is compatible with 2.38
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/worker-rust /usr/local/bin/worker
CMD ["worker"]