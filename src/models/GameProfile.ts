import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";

export interface ProfileProps {
	id?: number;
	username: string;
	platformId?: number;
	siteUserId?: number;
}


export default class Profile {
	constructor(
		private sql: postgres.Sql<any>,
		public props: ProfileProps,
	) { }

	static async create(
		sql: postgres.Sql<any>,
		props: ProfileProps,
	): Promise<Profile> {
		const connection = await sql.reserve();


		const [row] = await connection<ProfileProps[]>`
			INSERT INTO game_profile (username, platform_id)
			VALUES (${props.username}, ${props.platformId})
			RETURNING *
			`;

		await connection.release();

		return new Profile(sql, convertToCase(snakeToCamel, row) as ProfileProps);
	}

	static async read(sql: postgres.Sql<any>, username: string, platform: string) {
		const connection = await sql.reserve();

		const [row] = await connection<ProfileProps[]>`
			SELECT game_profile.* FROM game_profile JOIN platform 
			ON game_profile.platform_id = platform.id
			WHERE game_profile.username = ${username} AND platform.platform_name = ${platform}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Profile(sql, convertToCase(snakeToCamel, row) as ProfileProps);
	}

	async linkToSiteProfile(siteProfileId: number) {
		const connection = await this.sql.reserve();

		const [row] = await connection`
		UPDATE game_profile 
		SET site_user_id = ${siteProfileId}
		WHERE id = ${this.props.id}
		RETURNING *`;

		await connection.release();

		this.props = {...this.props, ...convertToCase(snakeToCamel, row)};
	}

	async unlinkPlatformAccount(siteProfileId: number) {
		const connection = await this.sql.reserve();

		const [row] = await connection`
		UPDATE game_profile 
		SET site_user_id = NULL
		WHERE id = ${this.props.id}
		RETURNING *`;

		await connection.release();

		this.props = {...this.props, ...convertToCase(snakeToCamel, row)};
	}

	static async getGameProfileFromUserId(sql: postgres.Sql<any>, siteUserId: number): Promise<Profile | null>{
		const connection = await sql.reserve();

		const [row] = await connection<ProfileProps[]>`
			SELECT * FROM
			game_profile WHERE site_user_id = ${siteUserId}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Profile(sql, convertToCase(snakeToCamel, row) as ProfileProps);
	}

}
