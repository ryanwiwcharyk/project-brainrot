import postgres from "postgres";
import User, { UserProps } from "../src/models/User";
import Server from "../src/Server";
import { StatusCode } from "../src/router/Response";
import { HttpResponse, clearCookieJar, makeHttpRequest } from "./client";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
import { createUTCDate } from "../src/utils";
import { randomFillSync } from "crypto";
import { stat } from "fs";

describe("User HTTP operations", () => {
    const sql = postgres({
        database: "UserStats",
    });

    const server = new Server({
        host: "localhost",
        port: 3000,
        sql,
    });

    const createUser = async (props: Partial<UserProps> = {}) => {
        return await User.create(sql, {
            userName: props.userName || "default",
            email: props.email || "user@email.com",
            password: props.password || "password",
            createdAt: props.createdAt || createUTCDate(),
        });
    };

    beforeAll(async () => {
        await server.start();
    });

    /**
     * Clean up the database after each test. This function deletes all the rows
     * from the todos and subtodos tables and resets the sequence for each table.
     * @see https://www.postgresql.org/docs/13/sql-altersequence.html
     */
    afterEach(async () => {
        // Replace the table_name with the name of the table(s) you want to clean up.
        try {

            await sql.unsafe(
                `TRUNCATE TABLE users, favourites, game_profile, stats, session_stats;`,
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
        clearCookieJar()
    });


    test("Logged in user can access edit profile", async () => {
        const user = await createUser();

        await makeHttpRequest(
            "POST",
            "/login",
            {
                email: user.props.email,
                password: "password",
            },
        );

        const { statusCode, body }: HttpResponse = await makeHttpRequest("GET",
            "/users/edit");

        expect(statusCode).toBe(StatusCode.OK);
        expect(Object.keys(body).includes("message")).toBe(true);
        expect(body.message).toBe("Edit form retrieved");

    })

    test("Non-logged in user cannot access edit profile", async () => {

        const { statusCode, body }: HttpResponse = await makeHttpRequest("GET",
            "/users/edit");

        expect(statusCode).toBe(StatusCode.Unauthorized);
        expect(Object.keys(body).includes("message")).toBe(true);
        expect(body.message).toBe("Unauthorized");

    })

    test("Logged in user can favourite a profile", async () => {

        const user = await createUser();

        // Simulate login
         await makeHttpRequest("POST", "/login", {
            email: user.props.email,
            password: "password",
        });

        await makeHttpRequest("POST", "/search", {
            username: "Davydav1919",
            platform: "PC",
        });

        // Simulate favoriting the profile
        const {statusCode, body} = await makeHttpRequest("POST", "/favourites");

        expect(statusCode).toBe(StatusCode.OK);
        expect(body.message).toBe("Profile favourited successfully");
    });

    test("Non-logged in user cannot favourite a profile", async () => {

        await makeHttpRequest("POST", "/search", {
            username: "Davydav1919",
            platform: "PC",
        });

        // Simulate favoriting the profile
        const {statusCode, body} = await makeHttpRequest("POST", "/favourites");

        expect(statusCode).toBe(StatusCode.Unauthorized);
        expect(body.message).toBe("Must be logged in to favourite a profile.");
    });


test("Logged in user can link a profile", async () => {

    const user = await createUser({ email: "test@example.com", password: "pass123" });


    await makeHttpRequest("POST", "/login", {
        email: user.props.email,
        password: "pass123",
    });

    await makeHttpRequest("POST", "/search", {
        username: "Davydav1919",
        platform: "PC"
    });


    // Simulate claiming (linking) the profile
    const {statusCode, body} = await makeHttpRequest("POST", "/profile");

    expect(statusCode).toBe(StatusCode.OK);
    expect(body.message).toBe("Profiles linked successfully");

});

test("Non-logged in user cannot link a profile", async () => {

    await makeHttpRequest("POST", "/search", {
        username: "Davydav1919",
        platform: "PC"
    });


    // Simulate claiming (linking) the profile
    const {statusCode, body} = await makeHttpRequest("POST", "/profile");

    expect(statusCode).toBe(StatusCode.Unauthorized);
    expect(body.message).toBe("Must be logged in to claim a profile.");

});


});