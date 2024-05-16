import postgres from "postgres";
import { test, expect, Page } from "@playwright/test";
import { getPath } from "../src/url";
import User, {UserProps} from "../src/models/User";
import { createUTCDate } from "../src/utils";

const sql = postgres({
	database: "UserStats",
});

const logout = async (page: Page) => {
	await page.goto("/logout");
};

test.beforeEach(async () => {
	// Anything you want to do before each test runs?
});

/**
 * Clean up the database after each test. This function deletes all the rows
 * from the todos and subtodos tables and resets the sequence for each table.
 * @see https://www.postgresql.org/docs/13/sql-altersequence.html
 */
test.afterEach(async ({ page }) => {
	try {

		await sql.unsafe(
			`TRUNCATE TABLE users, favourites, game_profile, stats, session_stats RESTART IDENTITY CASCADE;`,
		);

	} catch (error) {
		console.error(error);
	}

	await logout(page);
});

test("Profile was found.", async ({ page }) => {
	await page.goto("/search");

    await page.fill('form#search-form input[name="username"]', 'Davydav1919')
    await page.fill('form#search-form input[name="platform"]', 'PC')

    expect(await page?.url()).toBe(getPath("/stats/Davydav1919"));

})
test("Profile was not found due to invalid username.", async ({ page }) => {
	await page.goto("/search");

    await page.fill('form#search-form input[name="username"]', 'Davydav19191919')
    await page.fill('form#search-form input[name="platform"]', 'PC')

    expect(await page?.url()).toBe(getPath("search"));

    const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Player not found in the API.");
})
test("Profile was not found due to invalid username.", async ({ page }) => {
	await page.goto("/search");

    await page.fill('form#search-form input[name="username"]', 'Davydav1919')
    await page.fill('form#search-form input[name="platform"]', 'XBOX')

    expect(await page?.url()).toBe(getPath("search"));

    const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Player not found in the API.");
})
