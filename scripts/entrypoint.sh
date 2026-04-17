#!/bin/sh
set -e

# On Render, /data is the persistent disk mount. On first boot it's empty,
# so we seed it with the DB snapshot baked into the image. Subsequent boots
# reuse the persisted DB.
DB_PATH="${DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"

mkdir -p "$DB_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "No DB found at $DB_PATH — seeding from /app/prisma/seed.db"
  cp /app/prisma/seed.db "$DB_PATH"
else
  echo "DB present at $DB_PATH — keeping existing data"
fi

exec node server.js
