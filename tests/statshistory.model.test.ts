import postgres from "postgres";
import { test, describe, expect, afterEach } from "vitest";
import StatsHistory, { StatsHistoryProps } from "../src/models/StatsHistory";

describe("StatsHistory operations", () => {
    // Set up the connection to the DB.
    const sql = postgres({
        database: "UserStats",
    });

    /**
     * Clean up the database after each test. This function deletes all the rows
     * from the stats and session_stats tables and resets the sequence for each table.
     */
    afterEach(async () => {
        const tables = ["stats", "session_stats"];

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

    const createStatsHistory = async (props: Partial<StatsHistoryProps> = {}) => {
        return new StatsHistory(sql, {
            legendPlayed: props.legendPlayed || "Legend",
            mapPlayed: props.mapPlayed || "Map",
            damageDealt: props.damageDealt || 0,
            startTime: props.startTime || BigInt(Date.now()),
            endTime: props.endTime || BigInt(Date.now()),
            sessionKills: props.sessionKills || 0,
            profileId: props.profileId || 1,
        });
    };

    test("StatsHistory was read.", async () => {
        const statsHistory1 = await createStatsHistory({ legendPlayed: "Legend1" });
        const statsHistory2 = await createStatsHistory({ legendPlayed: "Legend2" });

        const history = await StatsHistory.readStatsHistory(sql, statsHistory1.props.profileId!);

        expect(history).toHaveLength(2);
        expect(history![0].props.legendPlayed).toBe("Legend1");
        expect(history![1].props.legendPlayed).toBe("Legend2");
    });
});