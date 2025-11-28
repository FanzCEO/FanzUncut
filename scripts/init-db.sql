-- Initialize FANZ database schema
-- This runs automatically when the Docker container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS profiles;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS payments;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO fanzuser;
GRANT ALL PRIVILEGES ON SCHEMA auth TO fanzuser;
GRANT ALL PRIVILEGES ON SCHEMA profiles TO fanzuser;
GRANT ALL PRIVILEGES ON SCHEMA content TO fanzuser;
GRANT ALL PRIVILEGES ON SCHEMA payments TO fanzuser;

-- Set default search path
ALTER USER fanzuser SET search_path = public, auth, profiles, content, payments;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'FANZ database initialized successfully for BoyFanz platform';
END
$$;