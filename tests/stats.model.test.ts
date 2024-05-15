import postgres from "postgres";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
import Stats, { StatsProps } from "../src/models/Stats";
import { camelToSnake, convertToCase, snakeToCamel } from "../src/utils";

describe("Stats operations", () => {
    // Set up the connection to the DB.
    const sql = postgres({
        database: "UserStats",
    });

    afterEach(async () => {
        try {

            await sql.unsafe(
                `TRUNCATE TABLE users, favourites, game_profile, platform, stats, session_stats restart identity;`,
            );

        } catch (error) {
            console.error(error);
        }
    });


    test("Stats are created and read correctly", async () => {
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        await sql.unsafe(`INSERT INTO game_profile (username, platform_id) VALUES ('Davydav1919', 1)`);
        const stats1 = await Stats.create(sql, {
            playerLevel: 10,
            playerKills: 50,
            playerDeaths: 20,
            killDeathRatio: 2.5,
            playerDamage: 5000,
            playerWins: 10,
            playerRank: "Gold",
            profileId: 1,
        });
        const readStats1 = await Stats.read(sql, 1);

        expect(readStats1).not.toBeNull();
        expect(readStats1!.props.playerLevel).toBe(10);
        expect(readStats1!.props.playerKills).toBe(50);
        expect(readStats1!.props.playerDeaths).toBe(20);
        expect(readStats1!.props.killDeathRatio).toBe("2.50");
        expect(readStats1!.props.playerDamage).toBe(5000);
        expect(readStats1!.props.playerWins).toBe(10);
        expect(readStats1!.props.playerRank).toBe("Gold");
        expect(readStats1!.props.profileId).toBe(1);
    });

    test("Reading Stats returns null for non-existent profile", async () => {
        const readStats = await Stats.read(sql, 999); // Using a profileId that doesn't exist

        expect(readStats).toBeNull();
    });
});