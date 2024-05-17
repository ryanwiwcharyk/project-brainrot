import postgres from "postgres";
import { test, expect, Page } from "@playwright/test";
import { getPath } from "../src/url";
import User, {UserProps} from "../src/models/User";
import { createUTCDate } from "../src/utils";
import Profile from "../src/models/GameProfile";

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
	// Replace the table_name with the name of the table(s) you want to clean up.
	try {

		await sql.unsafe(
			`TRUNCATE TABLE users, favourites, game_profile, platform, stats, session_stats;`,
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
	await logout(page);
});

const createUser = async (props: Partial<UserProps> = {}) => {
	return await User.create(sql, {
		userName: props.userName || "default",
		email: props.email || "user@email.com",
		password: props.password || "password",
		createdAt: props.createdAt || createUTCDate(),
	});
};

test("Logged in user can access edit profile", async ({page}) => {
    const user = await createUser( {email: "test@example.com", password: "pass123"})

    await page.goto(`/login`);

    // Fill in the email and password fields
    await page.fill('form.auth-form input[name="email"]', user.props.email);
    await page.fill('form.auth-form input[name="password"]', "pass123");

    // Click the login button
    await page.click("form.auth-form .form-submit-button");
    expect(await page?.url()).toBe(getPath("search"));
    await page.click("form.nav-form #edit-profile");

    expect(await page?.url()).toBe(getPath("users/edit?"));
})

test("Non-logged in user cannot access edit profile", async ({page}) => {
    const user = await createUser( {email: "test@example.com", password: "pass123"})

    await page.goto(`/users/edit`);

    expect(await page?.url()).toBe(getPath("login?no_user_edit=not_logged_in"));
    
	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("You must be logged in to edit your account.");
})

test("Logged in user can favourite a profile", async ({page}) => {
    const user = await createUser( {email: "test@example.com", password: "pass123"})

    await page.goto(`/login`);

    // Fill in the email and password fields
    await page.fill('form.auth-form input[name="email"]', user.props.email);
    await page.fill('form.auth-form input[name="password"]', "pass123");

    // Click the login button
    await page.click("form.auth-form .form-submit-button");
    expect(await page?.url()).toBe(getPath("search"));

    const dropdown = page.locator('#main-selector');
	dropdown.selectOption({value: 'PC'})
    await page.fill('form#search-form input[name="username"]', 'Davydav1919');
	await page.press('form#search-form input[name="username"]', 'Enter');

    expect(await page?.url()).toBe(getPath("stats/Davydav1919"));

    const favCheckbox = await page.$("form#favourite-form #favourite-checkbox");
    expect(favCheckbox).toBeTruthy();
    

})

test("Non-logged in user cannot favourite a profile", async ({page}) => {
    const user = await createUser( {email: "test@example.com", password: "pass123"})

    await page.goto("/search");
    const dropdown = page.locator('#main-selector');
	dropdown.selectOption({value: 'PC'})
    await page.fill('form#search-form input[name="username"]', 'Davydav1919')
	await page.press('form#search-form input[name="username"]', 'Enter');

    expect(await page?.url()).toBe(getPath("stats/Davydav1919"));

    const favCheckbox = await page.$("form.favourite-form #favourite-checkbox")
    expect(favCheckbox).toBeFalsy()

})


test("Logged in user can link a profile", async ({page}) => {
    const user = await createUser( {email: "test@example.com", password: "pass123"})

    await page.goto(`/login`);

    // Fill in the email and password fields
    await page.fill('form.auth-form input[name="email"]', user.props.email);
    await page.fill('form.auth-form input[name="password"]', "pass123");

    // Click the login button
    await page.click("form.auth-form .form-submit-button");
    const dropdown = page.locator('#main-selector');
	dropdown.selectOption({value: 'PC'})
    await page.fill('form#search-form input[name="username"]', 'Davydav1919')
	await page.press('form#search-form input[name="username"]', 'Enter');

    expect(await page?.url()).toBe(getPath("stats/Davydav1919"));

    await page.click("form#claim-form .form-submit-button");

    await page.goto("users/edit")

    const unlinkForm = await page.$("form#unlink-form")
    expect(unlinkForm).toBeTruthy();

})

test("Non-logged in user cannot link a profile", async ({page}) => {
    const user = await createUser( {email: "test@example.com", password: "pass123"})

    await page.goto("/search");

    const dropdown = page.locator('#main-selector');
	dropdown.selectOption({value: 'PC'})
    await page.fill('form#search-form input[name="username"]', 'Davydav1919')
	await page.press('form#search-form input[name="username"]', 'Enter');

    expect(await page?.url()).toBe(getPath("stats/Davydav1919"));

    await page.click("form#claim-form .form-submit-button")
    expect(await page?.url()).toBe(getPath("login?no_user_link=not_logged_in"));

    const errorElement = await page.$("#error");
    expect(await errorElement?.innerText()).toMatch("You must be logged in to claim a profile as your own.");

})

