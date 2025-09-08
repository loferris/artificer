-- PostgreSQL initialization script for local development
-- This script runs when the Docker container starts for the first time

-- Create the main application database (if not already created by POSTGRES_DB)
-- Note: The database 'chatapp' is already created by the POSTGRES_DB environment variable

-- Create a development user with appropriate permissions
-- Note: The 'postgres' user is already created by the container

-- Set up any initial configuration
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create any custom functions or triggers if needed in the future
-- (None needed for current schema)

-- Set timezone to UTC for consistency
SET timezone = 'UTC';

-- Log successful initialization
\echo 'Database initialization completed successfully'
\echo 'Database: chatapp'
\echo 'Default user: postgres'
\echo 'Ready for Prisma migrations'
