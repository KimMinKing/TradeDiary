# Server DB Restore

The reliable deployment rule for this project is simple: match `code`, `.env`, and `database state` to the same point in time.

Do not mix:

- a newer commit with an older DB dump
- a restored dump with a partially stale `postgres-data` volume
- a correct dump with an incomplete server `.env`

For this repo, the least fragile path is:

1. check out the exact commit locally
2. create one full PostgreSQL dump from the final local DB state
3. copy project files, `.env`, and dump together to the server
4. remove the old Postgres volume on the server
5. restore into a fresh empty DB
6. start the rest of the stack

## Files

- Dump directory: `database/dumps/`
- Local dump script for PowerShell: `scripts/create_db_dump.ps1`
- Server restore script: `scripts/restore_db.sh`

## Local: create the dump

Check out the exact code first:

```bash
git checkout 6d87b35
```

From Windows PowerShell, create a PostgreSQL custom-format dump:

```powershell
.\scripts\create_db_dump.ps1
```

That produces a file like:

```text
database/dumps/tradediary_20260623_123456.dump
```

The script uses:

- container: `tradediary-postgres`
- db user: `tradediary`
- db name: `tradediary`

## Server: restore from a fresh DB

Copy these together to the server:

- checked-out project at the same commit
- server `.env` with the same required keys
- the new dump file under `database/dumps/`

Critical `.env` values include:

- `JWT_SECRET`
- `AES_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `CRYPTOCOMPARE_API_KEY`
- `GROQ_API_KEY`
- `DEEPSEEK_API_KEY`

`DB_*` is fixed by `docker-compose.yml` for the app containers, but if you override any DB-related values on the server, keep them aligned with Compose.

Then on the server:

```bash
docker compose down
docker volume ls
docker volume rm tradediary_postgres-data
docker compose up -d postgres
chmod +x scripts/restore_db.sh
./scripts/restore_db.sh database/dumps/tradediary_20260623_123456.dump
docker compose up -d --build
```

## Restore behavior

`scripts/restore_db.sh` supports both:

- custom dumps: `*.dump` via `pg_restore --clean --if-exists --no-owner`
- plain SQL dumps: `*.sql` via `psql`

Use `*.dump` for full schema+data migration between machines. That is the preferred path.

## Important constraints

- Keep PostgreSQL major versions the same on local and server. Current Compose uses `postgres:16`.
- Create the dump only after all schema and data changes are finished locally.
- Do not run `run_all_migrations.sql` first and then restore an older dump on top of it.
- If `docker volume rm tradediary_postgres-data` fails because the actual volume name differs, use the exact name shown by `docker volume ls`.
