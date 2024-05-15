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
                `TRUNCATE TABLE users, favourites, game_profile, platform, stats, session_stats restart identity;`,
            );

        } catch (error) {
            console.error(error);
        }
    });

    const createProfile = async (props: Partial<ProfileProps> = {}) => {
        return await Profile.create(sql, {
            username: props.username || "adamcarolla16",
            platformId: props.platformId || 1,
        });
    };

    test("Profile was created.", async () => {
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        const profile = await createProfile({ username: "Davydav1919", platformId: 1});

        expect(profile.props.username).toBe("Davydav1919");
        expect(profile.props.platformId).toBe(1);
        expect(true).toBeTruthy();
    });

    test("Profile was read.", async () => {
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        const profile = await createProfile({ username: "Davydav1919", platformId: 1});

        const readProfile = await Profile.read(sql, "Davydav1919", "PC");

        expect(readProfile?.props.username).toBe("Davydav1919");
        expect(readProfile?.props.platformId).toBe(1);
        expect(true).toBeTruthy();
    });

    test("Profile was not read with invalid username.", async () => {
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        const profile = await createProfile({ username: "Davydav1919", platformId: 1 });

        const readProfile = await Profile.read(sql, "invalidUser", "InvalidPlatform");

        expect(readProfile).toBeNull();
        expect(true).toBeTruthy();
    });

    test("Profile was not read with invalid platform.", async () => {
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        const profile = await createProfile({ username: "Davydav1919", platformId: 1 });

        const readProfile = await Profile.read(sql, "Davydav1919", "InvalidPlatform");

        expect(readProfile).toBeNull();
        expect(true).toBeTruthy();
    });

    test("Profile was linked to site profile.", async () => {
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        const profile = await createProfile({ username: "Davydav1919", platformId: 1  });

        await profile.linkToSiteProfile(1);

        expect(profile.props.siteUserId).toBe(1);
    });

    test("Profile was unlinked from site profile.", async () => {
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        const profile = await createProfile({ username: "Davydav1919", platformId: 1  });
        await profile.linkToSiteProfile(1)

        await profile.unlinkPlatformAccount(1);

        expect(profile.props.siteUserId).toBeNull();
    });

    test("Profile was retrieved by site user ID.", async () => {
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        const profile = await createProfile({ username: "Davydav1919", platformId: 1  });
        await profile.linkToSiteProfile(1)

        const retrievedProfile = await Profile.getGameProfileFromUserId(sql, 1);

        expect(retrievedProfile?.props.username).toBe("Davydav1919");
        expect(retrievedProfile?.props.siteUserId).toBe(1);
    });

    test("Profile was not retrieved by invalid site user ID.", async () => {
        await sql.unsafe(`INSERT INTO platform (id, platform_name) VALUES (1, 'PC')`);
        const profile = await createProfile({ username: "Davydav1919", platformId: 1  });
        await profile.linkToSiteProfile(1)

        const retrievedProfile = await Profile.getGameProfileFromUserId(sql, 999);

        expect(retrievedProfile).toBeNull();
    });
});