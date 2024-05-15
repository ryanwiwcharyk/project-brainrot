import postgres from "postgres";
import { StatusCode } from "../src/router/Response";
import { HttpResponse, clearCookieJar, makeHttpRequest } from "./client";
import {
	test,
	describe,
	expect,
	afterEach,
	beforeEach,
} from "vitest";

describe("HTTP operations", () => {
	const sql = postgres({
		database: "UserStats",
	});

	beforeEach(async () => {
		// Anything you want to do before each test runs?
	});

	/**
	 * Clean up the database after each test. This function deletes all the rows
	 * from the todos and subtodos tables and resets the sequence for each table.
	 * @see https://www.postgresql.org/docs/13/sql-altersequence.html
	 */
	afterEach(async () => {
		try {

            await sql.unsafe(
                `TRUNCATE TABLE users, favourites, game_profile, platform, stats, session_stats;`,
            );

        } catch (error) {
            console.error(error);
        }

		await makeHttpRequest("POST", "/logout");
		clearCookieJar();
	});

	test("Homepage was retrieved successfully.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/",
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe("Homepage!");
	});

	test("Invalid path returned error.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/foo",
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(false);
		expect(body.message).toBe("Invalid route: GET /foo");
	});
});
