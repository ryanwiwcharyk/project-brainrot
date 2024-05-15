import postgres from "postgres";
import { test, describe, expect, afterEach } from "vitest";
import Profile, { ProfileProps } from "../src/models/GameProfile";

describe("Profile CRUD operations", () => {
    // Set up the connection to the DB.
    const sql = postgres({
        database: "UserStats",
    });

    /**
     * Clean up the database after each test. This function deletes all the rows
     * from the game_profile and platform tables and resets the sequence for each table.
     */
    afterEach(async () => {
        try {

            await sql.unsafe(
                `TRUNCATE TABLE users, favourites, game_profile, platform, stats, session_stats;`,
            );

        } catch (error) {
            console.error(error);
        }
    });

    const createProfile = async (props: Partial<ProfileProps> = {}) => {
        return await Profile.create(sql, {
            username: props.username || "Horizon",
            platformId: props.platformId || 1,
            siteUserId: props.siteUserId,
        });
    };

    test("Profile was created.", async () => {
        const profile = await createProfile({ username: "Horizon" });

        expect(profile.props.username).toBe("Horizon");
        expect(profile.props.platformId).toBe(1);
        expect(profile.props.siteUserId).toBeUndefined();
    });

    test("Profile was read.", async () => {
        // Assuming a platform entry exists with id = 1 and platform_name = "PC"
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        const profile = await createProfile({ username: "Horizon" });

        const readProfile = await Profile.read(sql, "Horizon", "PC");

        expect(readProfile?.props.username).toBe("Horizon");
        expect(readProfile?.props.platformId).toBe(1);
    });

    test("Profile was not read with invalid username.", async () => {
        const profile = await createProfile({ username: "Horizon" });

        const readProfile = await Profile.read(sql, "invalidUser", "PC");

        expect(readProfile).toBeNull();
    });

    test("Profile was not read with invalid platform.", async () => {
        const profile = await createProfile({ username: "Horizon" });

        const readProfile = await Profile.read(sql, "Horizon", "InvalidPlatform");

        expect(readProfile).toBeNull();
    });

    test("Profile was linked to site profile.", async () => {
        const profile = await createProfile({ username: "Horizon" });

        await profile.linkToSiteProfile(1);

        expect(profile.props.siteUserId).toBe(1);
    });

    test("Profile was unlinked from site profile.", async () => {
        const profile = await createProfile({ username: "Horizon", siteUserId: 1 });

        await profile.unlinkPlatformAccount(1);

        expect(profile.props.siteUserId).toBeNull();
    });

    test("Profile was retrieved by site user ID.", async () => {
        const profile = await createProfile({ username: "Horizon", siteUserId: 1 });

        const retrievedProfile = await Profile.getGameProfileFromUserId(sql, 1);

        expect(retrievedProfile?.props.username).toBe("Horizon");
        expect(retrievedProfile?.props.siteUserId).toBe(1);
    });

    test("Profile was not retrieved by invalid site user ID.", async () => {
        const profile = await createProfile({ username: "Horizon", siteUserId: 1 });

        const retrievedProfile = await Profile.getGameProfileFromUserId(sql, 999);

        expect(retrievedProfile).toBeNull();
    });
});