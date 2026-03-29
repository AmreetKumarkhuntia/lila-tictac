-- Replace neondb_owner with your current Neon user (run SELECT current_user;)
-- psql "postgres://neondb_owner:your_password@your-neon-host.neon.tech/nakama?sslmode=require"
CREATE USER nakama WITH PASSWORD 'Nakamdb@123';

GRANT nakama TO neondb_owner;

CREATE DATABASE nakama OWNER nakama;

\c nakama

GRANT ALL ON SCHEMA public TO nakama;

-- ALTER USER nakama WITH PASSWORD 'new_password_here';