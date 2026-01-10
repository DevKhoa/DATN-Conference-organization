CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL,
    capacity INT
);

INSERT INTO locations (location_name, capacity) VALUES ('Hall A', 300);