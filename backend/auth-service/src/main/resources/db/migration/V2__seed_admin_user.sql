-- Default admin user (password: Admin123!)
-- BCrypt hash of 'Admin123!'
INSERT INTO users (id, email, password, name, role, department, active, force_password_change, created_at, updated_at)
VALUES (
    'admin-001',
    'admin@company.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'System Admin',
    'ADMIN',
    'IT',
    1,
    0,
    datetime('now'),
    datetime('now')
);
