import postgres from "postgres";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
import Platform, { PlatformProps } from "../src/models/Platform";
import { convertToCase, snakeToCamel } from "../src/utils";

describe("Platform operations", () => {
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
     * from the platform table and resets the sequence for the table.
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

    test("Platform is read correctly by name", async () => {
        const platformName = "PC";

        const platform = await Platform.read(sql, platformName);

        expect(platform).not.toBeNull();
        expect(platform!.props.platformName).toBe(platformName);
    });

    test("Reading non-existent platform returns null", async () => {
        const platform = await Platform.read(sql, "NonExistentPlatform");

        expect(platform).toBeNull();
    });


    test("Reading platform by non-existent ID returns null", async () => {
        const platform = await Platform.readFromId(sql, 999); // Using an ID that doesn't exist

        expect(platform).toBeNull();
    });
});