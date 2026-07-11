# Postgres init scripts

SQL files placed in this directory (`*.sql`) run automatically once,
on first container creation, via the official Postgres image's
`docker-entrypoint-initdb.d` mechanism.

No schema is defined in Phase 1 — this directory is a placeholder for
the database schema work that follows in a later phase.
