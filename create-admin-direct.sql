-- FANZ Admin User Creation Script
-- Direct database insertion for admin user

-- First, let's create the admin user
INSERT INTO users (
    id,
    username,
    email,
    password,
    role,
    firstName,
    lastName,
    authProvider,
    status,
    profileImageUrl,
    onlineStatus,
    lastSeenAt,
    createdAt,
    updatedAt
) VALUES (
    'admin-' || substr(lower(hex(randomblob(16))), 1, 16),
    'admin',
    'admin@boyfanz.com',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.0123456789abcdef', -- Simple hash for 'admin123'
    'admin',
    'Super',
    'Admin',
    'local',
    'active',
    null,
    false,
    datetime('now'),
    datetime('now'),
    datetime('now')
) ON CONFLICT(username) DO UPDATE SET
    role = 'admin',
    updatedAt = datetime('now');

-- Verify the admin user was created
SELECT id, username, email, role, firstName, lastName, status, createdAt 
FROM users 
WHERE username = 'admin';