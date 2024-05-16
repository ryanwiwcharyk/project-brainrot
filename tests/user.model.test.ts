import postgres from "postgres";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
import User, { UserProps, DuplicateEmailError, InvalidCredentialsError, DuplicateUsernameError } from "../src/models/User";
import GameProfile, { ProfileProps } from "../src/models/GameProfile";
import { createUTCDate } from "../src/utils";

describe("User CRUD operations", () => {
    const sql = postgres({
        database: "UserStats",
    });

    // beforeAll(async () => {
    //     try {
    //         await sql`
    //             INSERT INTO platform (platform_name) VALUES ('PC'), ('XBOX'), ('PSN')
    //             ON CONFLICT (platform_name) DO NOTHING;
    //         `;
    //     } catch (error) {
    //         console.error('Error during beforeAll setup:', error);
    //     }
    // });
    
    afterEach(async () => {
        try {

            await sql.unsafe(
                `TRUNCATE TABLE users, favourites, game_profile, stats, session_stats RESTART IDENTITY CASCADE;`,
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
    });

    const createUser = async (props: Partial<UserProps> = {}) => {
        return await User.create(sql, {
            userName: props.userName || "user123",
            email: props.email || "user@email.com",
            password: props.password || "password",
            createdAt: props.createdAt || createUTCDate(),
        });
    };


    test("User was created.", async () => {
        const user = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });

        expect(user.props.email).toBe("123@gmail.com");
        expect(user.props.password).toBe("123");
        expect(user.props.userName).toBe("Davydav");
        expect(user.props.createdAt).toBeTruthy();
        expect(user.props.editedAt).toBeFalsy();
    });

    test("User was not created due to duplicate email.", async () => {
        await createUser({ email: "123@gmail.com" });

        try {
            await createUser({ email: "123@gmail.com" });
            expect(false).toBeFalsy();
        } catch (error) {
            expect(true).toBeTruthy();
        }
        
    });

    test("User was not created due to duplicate username.", async () => {
        await createUser({ userName: "Davydav" });

        try {
            await createUser({ userName: "Davydav" });
            expect(false).toBeFalsy();
        } catch (error) {
            expect(true).toBeTruthy();
        }
    });

    test("User was logged in.", async () => {
        const user = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });
        const loggedInUser = await User.login(
            sql,
            user.props.email,
            user.props.password,
        );

        expect(loggedInUser?.props.email).toBe("123@gmail.com");
        expect(loggedInUser?.props.password).toBe("123");
    });

    test("User was not logged in due to invalid password.", async () => {
        const user = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });

        await expect(async () => {
            await User.login(sql, user.props.email, "wrongpassword");
        }).rejects.toThrow(InvalidCredentialsError);
    });

    test("User was not logged in due to invalid email.", async () => {
        const user = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });

        await expect(async () => {
            await User.login(sql, "invalid@email.com", user.props.password);
        }).rejects.toThrow(InvalidCredentialsError);
    });

    test("User was read.", async () => {
        const user = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });
        const readUser = await User.read(sql, user.props.id!);

        expect(readUser?.props.email).toBe("123@gmail.com");
        expect(readUser?.props.password).toBe("123");
        expect(user.props.userName).toBe("Davydav");
    });

    test("User was updated.", async () => {
        const user = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });
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

    test("User was not updated due to duplicate email.", async () => {
        const user1 = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });
        const user2 = await createUser({ userName: "Horizon", email: "1234@gmail.com", password: "123" });

        await expect(async () => {
            await user2.update({ email: "123@gmail.com" });
        }).rejects.toThrow(DuplicateEmailError);

        expect(user2.props.email).not.toBe(user1.props.email);
    });

    test("User was deleted.", async () => {
        const user = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });
        await user.delete(sql, user.props.id!);

        const deletedUser = await User.read(sql, user.props.id!);

        expect(deletedUser).toBeNull();
    });

    test("User added a game profile to favourites.", async () => {
        const user = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });
        const profile = await GameProfile.create(sql, {username: "Davydav1919", platformId: 1});

        await User.FavouritesCreate(sql, user.props.id!, profile.props.id!);

        const favourites = await User.FavouritesReadAll(sql, user.props.id!);

        expect(favourites).toHaveLength(1);
        expect(favourites).not.toBeNull();
        if(favourites){
            expect(favourites[0].props.username).toBe(profile.props.username);     
        }
    });

    test("User removed a game profile from favourites.", async () => {
        const user = await createUser({ userName: "Davydav", email: "123@gmail.com", password: "123" });
        const profile = await GameProfile.create(sql, {username: "Davydav1919", platformId: 1});

        await User.FavouritesCreate(sql, user.props.id!, profile.props.id!);
        await User.FavouritesDelete(sql, user.props.id!, profile.props.id!);

        const favourites = await User.FavouritesReadAll(sql, user.props.id!);

        expect(favourites).toBeNull();
    });
});