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
RUN cargo build --release --bin worker

# Stage 4: Runtime
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/worker /usr/local/bin
CMD ["worker"]