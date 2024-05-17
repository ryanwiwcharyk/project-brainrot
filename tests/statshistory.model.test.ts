import postgres from "postgres";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
import StatsHistory, { StatsHistoryProps } from "../src/models/StatsHistory";
import { camelToSnake, convertToCase, snakeToCamel } from "../src/utils";

describe("StatsHistory operations", () => {
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
    
    /**
     * Clean up the database after each test. This function deletes all the rows
     * from the session_stats table and resets the sequence for the table.
     */
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

    test("StatsHistory read returns null when no records found.", async () => {
        const history = await StatsHistory.readStatsHistory(sql, 999); // Using a profileId that doesn't exist

        expect(history).toBeNull();
    });
});