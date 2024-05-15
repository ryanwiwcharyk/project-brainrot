import postgres from "postgres";
import { test, describe, expect, afterEach } from "vitest";
import Stats, { StatsProps } from "../src/models/Stats";

describe("Stats CRUD operations", () => {
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

    const createStats = async (props: Partial<StatsProps> = {}) => {
        return await Stats.create(sql, {
            playerLevel: props.playerLevel || "1",
            playerKills: props.playerKills || 0,
            playerDeaths: props.playerDeaths || 0,
            killDeathRatio: props.killDeathRatio || 0,
            playerDamage: props.playerDamage || 0,
            playerWins: props.playerWins || 0,
            playerRank: props.playerRank || "Bronze",
            profileId: props.profileId || 1,
        });
    };

    test("Stats was created.", async () => {
        const stats = await createStats({ playerLevel: "10" });

        expect(stats.props.playerLevel).toBe("10");
        expect(stats.props.playerKills).toBe(false);
        expect(stats.props.playerDeaths).toBe(0);
        expect(stats.props.killDeathRatio).toBe(0);
        expect(stats.props.playerDamage).toBe(0);
        expect(stats.props.playerWins).toBe(0);
        expect(stats.props.playerRank).toBe("Bronze");
        expect(stats.props.profileId).toBe(1);
    });

    test("Stats was read.", async () => {
        const stats = await createStats({ playerLevel: "10" });
        const readStats = await Stats.read(sql, stats.props.profileId!);

        expect(readStats?.props.playerLevel).toBe("10");
        expect(readStats?.props.playerKills).toBe(false);
        expect(readStats?.props.playerDeaths).toBe(0);
        expect(readStats?.props.killDeathRatio).toBe(0);
        expect(readStats?.props.playerDamage).toBe(0);
        expect(readStats?.props.playerWins).toBe(0);
        expect(readStats?.props.playerRank).toBe("Bronze");
        expect(readStats?.props.profileId).toBe(1);
    });

    test("Stats was updated.", async () => {
        const stats = await createStats({ playerLevel: "10" });

        const updatedStats = await stats.update(sql, {
            playerLevel: "15",
            playerKills: 50,
        }, stats.props.id!);

        expect(updatedStats.props.playerLevel).toBe("15");
        expect(updatedStats.props.playerKills).toBe(true);
        expect(updatedStats.props.playerDeaths).toBe(0);
        expect(updatedStats.props.killDeathRatio).toBe(0);
        expect(updatedStats.props.playerDamage).toBe(0);
        expect(updatedStats.props.playerWins).toBe(0);
        expect(updatedStats.props.playerRank).toBe("Bronze");
        expect(updatedStats.props.profileId).toBe(1);
    });
});


