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
	isOnline: boolean;
	platformId: number;
}

export default class Profile {
	constructor(
		private sql: postgres.Sql<any>,
		public props: ProfileProps,
	) {}

    static async read(sql: postgres.Sql<any>, id: number) {
		const connection = await sql.reserve();

		const [row] = await connection<ProfileProps[]>`
			SELECT * FROM
			game_profile WHERE id = ${id}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Profile(sql, convertToCase(snakeToCamel, row) as ProfileProps);
	}
}
