import postgres from "postgres";
import { test, describe, expect, afterEach } from "vitest";
import User, { UserProps, DuplicateEmailError, InvalidCredentialsError, DuplicateUsernameError } from "../src/models/User";
import GameProfile, { ProfileProps } from "../src/models/GameProfile";
import { createUTCDate } from "../src/utils";

describe("User CRUD operations", () => {
    const sql = postgres({
        database: "UserStats",
    });


    afterEach(async () => {
        const tables = ["users", "favourites", "game_profile", "platform", "stats", "session_stats"];

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

    const createUser = async (props: Partial<UserProps> = {}) => {
        return await User.create(sql, {
            userName: props.userName || "user123",
            email: props.email || "user@email.com",
            password: props.password || "password",
            createdAt: props.createdAt || createUTCDate(),
            profilePicture: props.profilePicture,
        });
    };

    const createGameProfile = async (props: Partial<ProfileProps> = {}) => {
        return await GameProfile.create(sql, {
            username: props.username || "gamer123",
            platformId: props.platformId || 1,
            siteUserId: props.siteUserId,
        });
    };

    test("User was created.", async () => {
        const user = await createUser({ password: "Password123" });

        expect(user.props.email).toBe("user@email.com");
        expect(user.props.password).toBe("Password123");
        expect(user.props.createdAt).toBeTruthy();
        expect(user.props.editedAt).toBeFalsy();
    });

    test("User was not created with duplicate email.", async () => {
        await createUser({ email: "user@email.com" });

        await expect(async () => {
            await createUser({ email: "user@email.com" });
        }).rejects.toThrow(DuplicateEmailError);
    });

    test("User was not created with duplicate username.", async () => {
        await createUser({ userName: "user123" });

        await expect(async () => {
            await createUser({ userName: "user123" });
        }).rejects.toThrow(DuplicateUsernameError);
    });

    test("User was logged in.", async () => {
        const user = await createUser({ password: "Password123" });
        const loggedInUser = await User.login(
            sql,
            user.props.email,
            "Password123",
        );

        expect(loggedInUser?.props.email).toBe("user@email.com");
        expect(loggedInUser?.props.password).toBe("Password123");
    });

    test("User was not logged in with invalid password.", async () => {
        const user = await createUser({ password: "Password123" });

        await expect(async () => {
            await User.login(sql, user.props.email, "wrongpassword");
        }).rejects.toThrow(InvalidCredentialsError);
    });

    test("User was not logged in with invalid email.", async () => {
        const user = await createUser({ password: "Password123" });

        await expect(async () => {
            await User.login(sql, "invalid@email.com", "password");
        }).rejects.toThrow(InvalidCredentialsError);
    });

    test("User was read.", async () => {
        const user = await createUser({ password: "Password123" });
        const readUser = await User.read(sql, user.props.id!);

        expect(readUser?.props.email).toBe("user@email.com");
        expect(readUser?.props.password).toBe("Password123");
    });

    test("User was updated.", async () => {
        const user = await createUser({ password: "Password123" });
        const oldPassword = user.props.password;

        await user.update({
            email: "updated@email.com",
            password: "newpassword",
        });

        expect(user.props.email).toBe("updated@email.com");
        expect(user.props.password).toBe("newpassword");
        expect(user.props.password).not.toBe(oldPassword);
        expect(user.props.editedAt).toBeTruthy();
    });

    test("User was not updated with duplicate email.", async () => {
        const user1 = await createUser({ email: "user1@email.com" });
        const user2 = await createUser({ email: "user2@email.com" });

        await expect(async () => {
            await user2.update({ email: "user1@email.com" });
        }).rejects.toThrow(DuplicateEmailError);

        expect(user2.props.email).not.toBe(user1.props.email);
    });

    test("User was deleted.", async () => {
        const user = await createUser({ password: "Password123" });
        await user.delete(sql, user.props.id!);

        const deletedUser = await User.read(sql, user.props.id!);

        expect(deletedUser).toBeNull();
    });

    test("User added a game profile to favourites.", async () => {
        const user = await createUser();
        const profile = await createGameProfile();

        await User.FavouritesCreate(sql, user.props.id!, profile.props.id!);

        const favourites = await User.FavouritesReadAll(sql, user.props.id!);

        expect(favourites).toHaveLength(1);
        expect(favourites[0].props.username).toBe(profile.props.username);
    });

    test("User removed a game profile from favourites.", async () => {
        const user = await createUser();
        const profile = await createGameProfile();

        await User.FavouritesCreate(sql, user.props.id!, profile.props.id!);
        await User.FavouritesDelete(sql, user.props.id!, profile.props.id!);

        const favourites = await User.FavouritesReadAll(sql, user.props.id!);

        expect(favourites).toHaveLength(0);
    });
});