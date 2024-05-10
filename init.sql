DROP DATABASE IF EXISTS "UserStats";
CREATE DATABASE "UserStats";

\c UserStats;

-- Beware of drop table, when we start creating accounts and saving them we want to remove these
-- TODO: Remove drop Table
DROP TABLE IF EXISTS platform;
CREATE TABLE platform (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(50)
);

DROP TABLE IF EXISTS game_profile;
CREATE TABLE game_profile (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    is_online BOOLEAN,
    platform_id INTEGER REFERENCES platform(id)
);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    picture_link TEXT,
    profile_id INTEGER REFERENCES game_profile(id)
); 

DROP TABLE IF EXISTS stats;
CREATE TABLE stats (
    id SERIAL PRIMARY KEY,
    player_level SMALLINT,
    player_kills INTEGER,
    player_deaths INTEGER,
    kill_death_ratio DECIMAL(4,2)
    player_damage INTEGER,
    player_wins SMALLINT,
    player_rank VARCHAR(100),
    profile_id INTEGER REFERENCES game_profile(id)
);

DROP TABLE IF EXISTS session_stats;
CREATE TABLE session_stats (
    id SERIAL PRIMARY KEY,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    games_played SMALLINT,
    session_kills SMALLINT,
    session_deaths SMALLINT,
    session_kill_death DECIMAL(4,2),
    profile_id INTEGER REFERENCES game_profile(id)
);

DROP TABLE IF EXISTS favourites;
CREATE TABLE favourites (
    user_id INTEGER REFERENCES users(id),
    profile_id INTEGER REFERENCES game_profile(id),
    PRIMARY KEY (user_id, profile_id)
);




