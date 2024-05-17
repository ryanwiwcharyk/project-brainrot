import postgres from "postgres";
import Server from "../src/Server";
import { StatusCode } from "../src/router/Response";
import { HttpResponse, clearCookieJar, makeHttpRequest } from "./client";
import { test, describe, expect, afterEach, beforeAll } from "vitest";

describe("User search operations", () => {
	const sql = postgres({
		database: "UserStats",
	});

	const server = new Server({
		host: "localhost",
		port: 3000,
		sql,
	});

	beforeAll(async () => {
        await server.start();
	});

	/**
	 * Clean up the database after each test. This function deletes all the rows
	 * from the relevant tables and resets the sequence for each table.
	 */
	afterEach(async () => {
		try {
			await sql.unsafe(
				`TRUNCATE TABLE users, favourites, game_profile, stats, session_stats RESTART IDENTITY CASCADE;`
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
		clearCookieJar();
	});

	test("Profile was found.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/search",
			{
				username: "Davydav1919",
				platform: "PC",
			}
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Search page retrieved");
	});

	test("Profile was not found due to invalid username.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/search",
			{
				username: "Davydav19191919",
				platform: "PC",
			}
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(body.message).toBe("Player not found in API");
	});

	test("Profile was not found due to invalid platform.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/search",
			{
				username: "Davydav1919",
				platform: "XBOX",
			}
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(body.message).toBe("Player not found in API");
	});
});