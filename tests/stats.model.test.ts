import postgres from "postgres";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
import Stats, { StatsProps } from "../src/models/Stats";
import { camelToSnake, convertToCase, snakeToCamel } from "../src/utils";
import Profile from "../src/models/GameProfile";

describe("Stats operations", () => {
    // Set up the connection to the DB.
    const sql = postgres({
        database: "UserStats",
    });

    // beforeAll(async () => {
    //     try {
    //         await sql`
    //             INSERT INTO platform (platform_name) VALUES ('PC'), ('XBOX'), ('PSN')
    //             ON CONFLICT (platform_name) DO NOTHING;
    //         `;
    //     } catch (error) {
    //         console.error('Error during beforeAll setup:', error);
    //     }
    // });

    afterEach(async () => {
        try {

            await sql.unsafe(
                `TRUNCATE TABLE users, favourites, game_profile, stats, session_stats RESTART IDENTITY CASCADE;`,
            );
            await sql`
                TRUNCATE TABLE platform RESTART IDENTITY CASCADE;
            `;
            await sql`
                INSERT INTO platform (platform_name) VALUES ('PC'), ('XBOX'), ('PSN');
            `;


        } catch (error) {
            console.error(error);
        }
    });


    test("Stats are created and read correctly", async () => {

        let profile = await Profile.create(sql, {username: "Davydav1919", platformId: 1})
        
        const stats1 = await Stats.create(sql, {
            playerLevel: 10,
            playerKills: 50,
            playerDeaths: 20,
            killDeathRatio: 2.5,
            playerDamage: 5000,
            playerWins: 10,
            playerRank: "Gold",
            profileId: profile.props.id,
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