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
	// Replace the table_name with the name of the table(s) you want to clean up.
	try {

		await sql.unsafe(
			`TRUNCATE TABLE users, favourites, game_profile, platform, stats, session_stats;`,
		);

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

test("Homepage was retrieved successfully", async ({ page }) => {
	await page.goto("/search");

	expect(await page?.title()).toBe("Project Brainrot");
});

test("User was registered.", async ({ page }) => {
	await page.goto(`register`);

	await page.fill('form#register-form input[name="email"]', "user@email.com");
	await page.fill('form#register-form input[name="password"]', "Password123");
	await page.fill(
		'form#register-form input[name="confirmPassword"]',
		"Password123",
	);
	await page.fill('form#register-form input[name="userName"]', "ryan")
	await page.click("form#register-form #register-form-submit-button");

	expect(await page?.url()).toBe(getPath("login"));
});

test("User was not registered with blank email.", async ({ page }) => {
	await page.goto(`register`);

	await page.fill('form#register-form input[name="password"]', "Password123");
	await page.fill(
		'form#register-form input[name="confirmPassword"]',
		"Password123",
	);
	await page.fill('form#register-form input[name="userName"]', "ryan")
	await page.click("form#register-form #register-form-submit-button");

	expect(await page?.url()).toMatch(getPath("register"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Email is required");
});

test("User was not registered with mismatched passwords.", async ({ page }) => {
	await page.goto(`register`);

	await page.fill('form#register-form input[name="email"]', "user@email.com");
	await page.fill('form#register-form input[name="password"]', "Password123");
	await page.fill(
		'form#register-form input[name="confirmPassword"]',
		"Password124",
	);
	await page.fill('form#register-form input[name="userName"]', "ryan")
	await page.click("form#register-form #register-form-submit-button");

	expect(await page?.url()).toMatch(getPath("register"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Passwords do not match");
});

test("User was not registered with no username.", async ({ page }) => {
	await page.goto(`register`);

	await page.fill('form#register-form input[name="email"]', "user@email.com");
	await page.fill('form#register-form input[name="password"]', "Password123");
	await page.fill(
		'form#register-form input[name="confirmPassword"]',
		"Password124",
	);
	await page.click("form#register-form #register-form-submit-button");

	expect(await page?.url()).toMatch(getPath("register"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Username is required.");
});

test("User was logged in.", async ({ page }) => {
    const user = await createUser({ email: "test@example.com", password: "Password123" });

    await page.goto(`/login`);

    // Fill in the email and password fields
    await page.fill('form.auth-form input[name="email"]', user.props.email);
    await page.fill('form.auth-form input[name="password"]', "Password123");

    // Click the login button
    await page.click("form.auth-form .form-submit-button");

    // Check if the page redirects to the search page after login
    expect(await page?.url()).toBe(getPath("search"));

    // Check if the error message element is not present (indicating successful login)
    const errorMessage = await page.$("#error");
    expect(errorMessage).toBeFalsy();

    // Check if the logout button is present
    const logoutButton = await page.$('input.nav-button[type="submit"][value="Logout"]');
    expect(logoutButton).toBeTruthy();
});

test("User was not logged in with blank email.", async ({ page }) => {
	const user = await createUser({ password: "Password123" });

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="password"]', "Password123");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toMatch(getPath("login"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Email is required.");
});

test("User was not logged in with blank password.", async ({ page }) => {
	const user = await createUser({ email: "user@email.com" });

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', "user@email.com");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toMatch(getPath("login"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Password is required.");
});

test("User was not logged in with incorrect password.", async ({ page }) => {
	const user = await createUser({ password: "Password123" });

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "Password124");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toMatch(getPath("login"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("The email or password is incorrect.");
});

test("User was logged out.", async ({ page, context }) => {
	const user = await createUser({ password: "Password123" });

	expect((await context.cookies()).length).toBe(0);

	await page.goto(`/login`);

	expect((await context.cookies()).length).toBe(1);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "Password123");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toBe(getPath("search"));

	const logoutButton = await page.$('input.nav-button[type="submit"][value="Logout"]');

	await logoutButton?.click();

	expect(await page?.url()).toBe(getPath("login"));

	const loginElement = await page.$('input.nav-button[type="submit"][value="Login"]');

	expect(await loginElement).toBeTruthy();
});

test("User's email was remembered.", async ({ page }) => {
	const user = await createUser({ email: "user@email.com" });
	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.check('form#login-form input[name="remember"]');
	await page.click("form#login-form #login-form-submit-button");

	const cookies = await page.context().cookies();

	const emailCookie = cookies.find((cookie) => cookie.name === "email");

	expect(emailCookie).toBeTruthy();
	expect(emailCookie?.value).toBe(user.props.email);
});
