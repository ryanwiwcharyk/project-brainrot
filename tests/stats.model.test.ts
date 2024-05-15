import postgres from "postgres";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
import Stats, { StatsProps } from "../src/models/Stats";
import { camelToSnake, convertToCase, snakeToCamel } from "../src/utils";

describe("Stats operations", () => {
    // Set up the connection to the DB.
    const sql = postgres({
        database: "UserStats",
    });

    /**
     * Clean up the database after each test. This function deletes all the rows
     * from the stats table and resets the sequence for the table.
     */
    afterEach(async () => {
        const table = "stats";

        try {
            await sql.unsafe(`DELETE FROM ${table}`);
            await sql.unsafe(
                `ALTER SEQUENCE ${table}_id_seq RESTART WITH 1;`,
            );
        } catch (error) {
            console.error(error);
        }
    });

    const createStats = async (props: Partial<StatsProps> = {}) => {
        const connection = await sql.reserve();

        const [row] = await connection<StatsProps[]>`
            INSERT INTO stats
            ${sql(convertToCase(camelToSnake, props))}
            RETURNING *`;

        await connection.release();

        return new Stats(sql, convertToCase(snakeToCamel, row) as StatsProps);
    };

    test("Stats are created and read correctly", async () => {
        const stats1 = await createStats({
            playerLevel: "10",
            playerKills: 50,
            playerDeaths: 20,
            killDeathRatio: 2.5,
            playerDamage: 5000,
            playerWins: 10,
            playerRank: "Gold",
            profileId: 1,
        });

        const stats2 = await createStats({
            playerLevel: "20",
            playerKills: 100,
            playerDeaths: 50,
            killDeathRatio: 2,
            playerDamage: 10000,
            playerWins: 20,
            playerRank: "Platinum",
            profileId: 2,
        });

        const readStats1 = await Stats.read(sql, 1);
        const readStats2 = await Stats.read(sql, 2);

        expect(readStats1).not.toBeNull();
        expect(readStats1!.props.playerLevel).toBe("10");
        expect(readStats1!.props.playerKills).toBe(50);
        expect(readStats1!.props.playerDeaths).toBe(20);
        expect(readStats1!.props.killDeathRatio).toBe(2.5);
        expect(readStats1!.props.playerDamage).toBe(5000);
        expect(readStats1!.props.playerWins).toBe(10);
        expect(readStats1!.props.playerRank).toBe("Gold");
        expect(readStats1!.props.profileId).toBe(1);

        expect(readStats2).not.toBeNull();
        expect(readStats2!.props.playerLevel).toBe("20");
        expect(readStats2!.props.playerKills).toBe(100);
        expect(readStats2!.props.playerDeaths).toBe(50);
        expect(readStats2!.props.killDeathRatio).toBe(2);
        expect(readStats2!.props.playerDamage).toBe(10000);
        expect(readStats2!.props.playerWins).toBe(20);
        expect(readStats2!.props.playerRank).toBe("Platinum");
        expect(readStats2!.props.profileId).toBe(2);
    });

    test("Reading Stats returns null for non-existent profile", async () => {
        const readStats = await Stats.read(sql, 999); // Using a profileId that doesn't exist

        expect(readStats).toBeNull();
    });

    test("Stats are updated correctly", async () => {
        const stats = await createStats({
            playerLevel: "10",
            playerKills: 50,
            playerDeaths: 20,
            killDeathRatio: 2.5,
            playerDamage: 5000,
            playerWins: 10,
            playerRank: "Gold",
            profileId: 1,
        });

        const updatedProps: Partial<StatsProps> = {
            playerLevel: "15",
            playerKills: 75,
            playerDeaths: 25,
            killDeathRatio: 3,
            playerDamage: 7500,
            playerWins: 15,
            playerRank: "Platinum",
        };

        const updatedStats = await stats.update(sql, updatedProps, stats.props.id!);

        expect(updatedStats.props.playerLevel).toBe("15");
        expect(updatedStats.props.playerKills).toBe(75);
        expect(updatedStats.props.playerDeaths).toBe(25);
        expect(updatedStats.props.killDeathRatio).toBe(3);
        expect(updatedStats.props.playerDamage).toBe(7500);
        expect(updatedStats.props.playerWins).toBe(15);
        expect(updatedStats.props.playerRank).toBe("Platinum");
        expect(updatedStats.props.profileId).toBe(1);
    });
});