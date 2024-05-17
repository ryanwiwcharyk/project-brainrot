import postgres from "postgres";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
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

    const createProfile = async (props: Partial<ProfileProps> = {}) => {
        return await Profile.create(sql, {
            username: props.username || "adamcarolla16",
            platformId: props.platformId || 1,
        });
    };

    test("Profile was created.", async () => {
        const platforms = await sql`
        SELECT * FROM platform
    `;
    expect(platforms.length).toBeGreaterThan(0);

        const profile = await Profile.create(sql, { username: "Davydav1919", platformId: 1});

        expect(profile.props.username).toBe("Davydav1919");
        expect(profile.props.platformId).toBe(1);
        expect(true).toBeTruthy();
    });

    test("Profile was read.", async () => {
        const profile = await Profile.create(sql, { username: "Davydav1919", platformId: 1});

        const readProfile = await Profile.read(sql, "Davydav1919", "PC");

        expect(readProfile?.props.username).toBe("Davydav1919");
        expect(readProfile?.props.platformId).toBe(1);
        expect(true).toBeTruthy();
    });

    test("Profile was not read with invalid username.", async () => {
        const profile = await Profile.create(sql,{ username: "Davydav1919", platformId: 1 });

        const readProfile = await Profile.read(sql, "invalidUser", "InvalidPlatform");

        expect(readProfile).toBeNull();
        expect(true).toBeTruthy();
    });

    test("Profile was not read with invalid platform.", async () => {
        const platforms = await sql`
        SELECT * FROM platform
        `;
        expect(platforms.length).toBeGreaterThan(0);

        const profile = await Profile.create(sql, { username: "Davydav1919", platformId: 1 });

        const readProfile = await Profile.read(sql, "Davydav1919", "InvalidPlatform");

        expect(readProfile).toBeNull();
        expect(true).toBeTruthy();
    });

    test("Profile was linked to site profile.", async () => {
        const profile = await createProfile({ username: "Davydav1919", platformId: 1  });

        await profile.linkToSiteProfile(1);

        expect(profile.props.siteUserId).toBe(1);
    });

    test("Profile was unlinked from site profile.", async () => {
        const profile = await createProfile({ username: "Davydav1919", platformId: 1  });
        await profile.linkToSiteProfile(1)

        await profile.unlinkPlatformAccount(1);

        expect(profile.props.siteUserId).toBeNull();
    });

    test("Profile was retrieved by site user ID.", async () => {
        const profile = await createProfile({ username: "Davydav1919", platformId: 1  });
        await profile.linkToSiteProfile(1)

        const retrievedProfile = await Profile.getGameProfileFromUserId(sql, 1);

        expect(retrievedProfile?.props.username).toBe("Davydav1919");
        expect(retrievedProfile?.props.siteUserId).toBe(1);
    });

    test("Profile was not retrieved by invalid site user ID.", async () => {
        const profile = await createProfile({ username: "Davydav1919", platformId: 1  });
        await profile.linkToSiteProfile(1)

        const retrievedProfile = await Profile.getGameProfileFromUserId(sql, 999);

        expect(retrievedProfile).toBeNull();
    });
});