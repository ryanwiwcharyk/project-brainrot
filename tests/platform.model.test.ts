import postgres from "postgres";
import { test, describe, expect, afterEach } from "vitest";
import Platform, { PlatformProps } from "../src/models/Platform";
import { convertToCase, snakeToCamel } from "../src/utils";

describe("Platform operations", () => {
    // Set up the connection to the DB.
    const sql = postgres({
        database: "UserStats",
    });

    /**
     * Clean up the database after each test. This function deletes all the rows
     * from the platform table and resets the sequence for the table.
     */
    afterEach(async () => {
        const tables = ["users", "favourites", "game_profile", "platform", "stats", "session_stats"];

        try {
            for (const table of tables) {
                await sql.unsafe(`DELETE FROM ${table}`);
                await sql.unsafe(
                    `ALTER SEQUENCE ${table}_id_seq RESTART WITH 1;`,
                );
            }
        } catch (error) {
            console.error(error);
        }
    });

    const createPlatform = async (platformName: string): Promise<Platform> => {
        const connection = await sql.reserve();

        const [row] = await connection<PlatformProps[]>`
            INSERT INTO platform (platform_name)
            VALUES (${platformName})
            RETURNING *`;

        await connection.release();

        return new Platform(sql, convertToCase(snakeToCamel, row) as PlatformProps);
    };

    test("Platform is read correctly by name", async () => {
        const platformName = "XBOX";
        await createPlatform(platformName);

        const platform = await Platform.read(sql, platformName);

        expect(platform).not.toBeNull();
        expect(platform!.props.platformName).toBe(platformName);
    });

    test("Reading non-existent platform returns null", async () => {
        const platform = await Platform.read(sql, "NonExistentPlatform");

        expect(platform).toBeNull();
    });

    test("Platform is read correctly by ID", async () => {
        const platformName = "PlayStation";
        const createdPlatform = await createPlatform(platformName);

        const platform = await Platform.readFromId(sql, createdPlatform.props.id!);

        expect(platform).not.toBeNull();
        expect(platform!.props.platformName).toBe(platformName);
    });

    test("Reading platform by non-existent ID returns null", async () => {
        const platform = await Platform.readFromId(sql, 999); // Using an ID that doesn't exist

        expect(platform).toBeNull();
    });
});