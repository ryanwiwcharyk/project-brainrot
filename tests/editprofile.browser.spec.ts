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

const createUser = async (props: Partial<UserProps> = {}) => {
	return await User.create(sql, {
		userName: props.userName || "default",
		email: props.email || "user@email.com",
		password: props.password || "password",
		createdAt: props.createdAt || createUTCDate(),
	});
};

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
        await sql.unsafe(
			`INSERT INTO users ;`,
		);

	} catch (error) {
		console.error(error);
	}

	await logout(page);
});

test("Profile Updated successfully.", async ({ page }) => {
	await page.goto("/users/edit");

    await page.fill('form#edit-profile-form input[name="username"]', 'Davydav')
    await page.fill('form#edit-profile-form input[name="email"]', 'davidlynch1919@gmail.com')


    expect(await page?.url()).toBe(getPath("/users/edit"));
    const successElement = await page.$("#success");

	expect(await successElement?.innerText()).toMatch("User updated successfully");
})
test("Profile duplicate email", async ({ page }) => {
    const user = await createUser({ email: "user@email.com" });
	await page.goto("/users/edit");

    await page.fill('form#edit-profile-form input[name="username"]', 'Davydav')
    await page.fill('form#edit-profile-form input[name="email"]', 'user@email.com')


    expect(await page?.url()).toBe(getPath("/users/edit"));

    const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("User with this email already exists.");
})
test("Profile update, empty username.", async ({ page }) => {
	await page.goto("/users/edit");

    await page.fill('form#edit-profile-form input[name="username"]', '')
    await page.fill('form#edit-profile-form input[name="email"]', 'davidlynch1919@gmail.com')


    expect(await page?.url()).toBe(getPath("/users/edit"));
    const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Username cannot be empty.");
})
test("Profile update, empty email.", async ({ page }) => {
	await page.goto("/users/edit");

    await page.fill('form#edit-profile-form input[name="username"]', 'Davydav')
    await page.fill('form#edit-profile-form input[name="email"]', '')


    expect(await page?.url()).toBe(getPath("/users/edit"));
    const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Email cannot be empty.");
})