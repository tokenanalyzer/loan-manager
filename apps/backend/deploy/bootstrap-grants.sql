-- One-time bootstrap: grant the application user schema privileges on the
-- production database. Postgres 15+ revokes CREATE on the `public` schema
-- from non-owners by default, so without this, loan_manager_app can connect
-- but cannot create any tables (migrations will fail).
--
-- Run once, connected as the `postgres` superuser, after the app database
-- and user already exist (both created — see docs/PRODUCTION_DEPLOYMENT_CHECKPOINT.md).
--
-- Cannot be run from a machine outside loan-manager-vpc: the instance has no
-- public IP. Run this from something with VPC connectivity — e.g. a one-off
-- `gcloud run jobs execute` against this Cloud Run project (once deployed
-- with the same Direct VPC egress config as the backend service), or a
-- temporary Compute Engine VM in the VPC, deleted immediately after.

GRANT ALL PRIVILEGES ON DATABASE loan_manager_prod TO loan_manager_app;

\c loan_manager_prod

GRANT ALL ON SCHEMA public TO loan_manager_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO loan_manager_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO loan_manager_app;
