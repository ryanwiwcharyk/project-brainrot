import postgres from "postgres";
import { test, describe, expect, afterEach } from "vitest";
import StatsHistory, { StatsHistoryProps } from "../src/models/StatsHistory";
import { camelToSnake, convertToCase, snakeToCamel } from "../src/utils";

describe("StatsHistory operations", () => {
    // Set up the connection to the DB.
    const sql = postgres({
        database: "UserStats",
    });

    /**
     * Clean up the database after each test. This function deletes all the rows
     * from the session_stats table and resets the sequence for the table.
     */
    afterEach(async () => {
        try {

            await sql.unsafe(
                `TRUNCATE TABLE users, favourites, game_profile, platform, stats, session_stats restart identity;`,
            );

        } catch (error) {
            console.error(error);
        }
    });

    const createStatsHistory = async (props: Partial<StatsHistoryProps> = {}) => {
        const connection = await sql.reserve();

        const [row] = await connection<StatsHistoryProps[]>`
            INSERT INTO session_stats
            ${sql(convertToCase(camelToSnake, props))}
            RETURNING *`;

        await connection.release();

        return new StatsHistory(sql, convertToCase(snakeToCamel, row) as StatsHistoryProps);
    };

    test("StatsHistory was created and read correctly.", async () => {
        const now = BigInt(Date.now());
        const statsHistory1 = await createStatsHistory({
            legendPlayed: "Legend1",
            mapPlayed: "Map1",
            damageDealt: 500,
            startTime: now,
            endTime: now,
            sessionKills: 5,
            profileId: 1,
        });

        const statsHistory2 = await createStatsHistory({
            legendPlayed: "Legend2",
            mapPlayed: "Map2",
            damageDealt: 300,
            startTime: now,
            endTime: now,
            sessionKills: 3,
            profileId: 1,
        });

        const history = await StatsHistory.readStatsHistory(sql, 1);

        expect(history).toHaveLength(2);

        expect(history![0].props.legendPlayed).toBe("Legend1");
        expect(history![0].props.mapPlayed).toBe("Map1");
        expect(history![0].props.damageDealt).toBe(500);
        expect(history![0].props.startTime).toBe(now);
        expect(history![0].props.endTime).toBe(now);
        expect(history![0].props.sessionKills).toBe(5);
        expect(history![0].props.profileId).toBe(1);

        expect(history![1].props.legendPlayed).toBe("Legend2");
        expect(history![1].props.mapPlayed).toBe("Map2");
        expect(history![1].props.damageDealt).toBe(300);
        expect(history![1].props.startTime).toBe(now);
        expect(history![1].props.endTime).toBe(now);
        expect(history![1].props.sessionKills).toBe(3);
        expect(history![1].props.profileId).toBe(1);
    });

    test("StatsHistory read returns null when no records found.", async () => {
        const history = await StatsHistory.readStatsHistory(sql, 999); // Using a profileId that doesn't exist

        expect(history).toBeNull();
    });
});