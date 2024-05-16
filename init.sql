DROP DATABASE IF EXISTS "UserStats";
CREATE DATABASE "UserStats";

\c UserStats;

-- Beware of drop table, when we start creating accounts and saving them we want to remove these
-- TODO: Remove drop Table
DROP TABLE IF EXISTS platform CASCADE;
CREATE TABLE platform (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(50) UNIQUE
);

DROP TABLE IF EXISTS game_profile CASCADE;
CREATE TABLE game_profile (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    site_user_id INTEGER,
    platform_id INTEGER REFERENCES platform(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    picture_link TEXT,
    profile_id INTEGER REFERENCES game_profile(id) ON DELETE CASCADE
); 

DROP TABLE IF EXISTS stats CASCADE;
CREATE TABLE stats (
    id SERIAL PRIMARY KEY,
    player_level SMALLINT,
    player_kills INTEGER,
    player_deaths INTEGER,
    kill_death_ratio DECIMAL(4,2),
    player_damage INTEGER,
    player_wins SMALLINT,
    player_rank VARCHAR(100),
    profile_id INTEGER REFERENCES game_profile(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS session_stats CASCADE;
CREATE TABLE session_stats (
    id SERIAL PRIMARY KEY,
    legend_played VARCHAR(100),
    map_played VARCHAR(100),
    damage_dealt INTEGER,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    session_kills SMALLINT,
    profile_id INTEGER REFERENCES game_profile(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS favourites CASCADE;
CREATE TABLE favourites (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES game_profile(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, profile_id)
);


INSERT INTO platform (platform_name) VALUES ('PC'), ('XBOX'), ('PSN');


