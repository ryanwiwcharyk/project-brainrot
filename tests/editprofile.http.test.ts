import postgres from "postgres";
import User, { UserProps } from "../src/models/User";
import Server from "../src/Server";
import { StatusCode } from "../src/router/Response";
import { HttpResponse, clearCookieJar, makeHttpRequest } from "./client";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
import { createUTCDate } from "../src/utils";

describe("User profile update operations", () => {
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

	const createUser = async (props: Partial<UserProps> = {}) => {
		return await User.create(sql, {
			userName: props.userName || "Davydav",
			email: props.email || "davidlynch1919@gmail.com",
			password: props.password || "password",
			createdAt: props.createdAt || createUTCDate(),
		});
	};

    
    // const loginUser = (async () => {
    //     await makeHttpRequest(
	// 		"POST",
	// 		"/login",
	// 		{
	// 			email: "davidlynch1919@gmail.com",
	// 			password: "password",
	// 		},
	// 	);
    // })


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

	test("Profile updated successfully.", async () => {
        const user = await createUser({ userName: "Davydav", email: "davidlynch1919@gmail.com" });
        await makeHttpRequest(
			"POST",
			"/login",
			{
				email: "davidlynch1919@gmail.com",
				password: "password",
			},
		);

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/users/edit`,
			{
				username: "Davydav",
				email: "123@gmail.com"
			}
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("User updated successfully!");
	});

	test("Profile duplicate email", async () => {
        const user1 = await createUser({ email: "user@email.com" });
		const user2 = await createUser({ userName: "Davydav", email: "davidlynch1919@email.com" });
        await makeHttpRequest(
			"POST",
			"/login",
			{
				email: "davidlynch1919@gmail.com",
				password: "password",
			},
		);

        console.log("Hello")

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/users/edit`,
			{
				username: "Davydav",
				email: "user@email.com"
			}
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("User with this email already exists.");
	});

	test("Profile update, empty username.", async () => {
        const user = await createUser();
        await makeHttpRequest(
			"POST",
			"/login",
			{
				email: "davidlynch1919@gmail.com",
				password: "password",
			},
		);

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/users/edit`,
			{
				username: "",
				email: "123@gmail.com"
			}
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Username cannot be empty.");
	});

	test("Profile update, empty email.", async () => {
        const user = await createUser();
        await makeHttpRequest(
			"POST",
			"/login",
			{
				email: "davidlynch1919@gmail.com",
				password: "password",
			},
		);

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/users/edit`,
			{
				username: "Davydav",
				email: ""
			}
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Email cannot be empty.");
	});
});
