# DraftSim

Fantasy draft helper (NFL first). See `docs/superpowers/specs/` for the design.

## Run

    docker compose up -d
    cp .env.example .env
    npx prisma migrate deploy
    npm run ingest
    npm run dev
