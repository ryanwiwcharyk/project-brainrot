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
			INSERT INTO game_profile
			${sql(convertToCase(camelToSnake, props))}
			RETURNING *
			`;

		await connection.release();

		return new Profile(sql, convertToCase(snakeToCamel, row) as ProfileProps);
	}

	static async read(sql: postgres.Sql<any>, username: string) {
		const connection = await sql.reserve();

		const [row] = await connection<ProfileProps[]>`
			SELECT * FROM
			game_profile WHERE username = ${username}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Profile(sql, convertToCase(snakeToCamel, row) as ProfileProps);
	}

}
