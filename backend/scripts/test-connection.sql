-- Test Database Connection Script
-- This script verifies the database connection and basic functionality

-- Check database version
SELECT version();

-- Check current database and user
SELECT current_database(), current_user, current_timestamp;

-- Test basic table operations
-- Create a test table
CREATE TABLE IF NOT EXISTS connection_test (
    id SERIAL PRIMARY KEY,
    test_message VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO connection_test (test_message) 
VALUES ('Database connection successful!');

-- Query test data
SELECT * FROM connection_test ORDER BY created_at DESC LIMIT 1;

-- Check if main tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user', 'admin', 'result', 'leaderboard', 'sub_admin');

-- Clean up test table
DROP TABLE IF EXISTS connection_test;

-- Success message
SELECT 'Database connection and basic operations completed successfully!' as status;
