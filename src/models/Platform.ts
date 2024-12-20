import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";

export interface PlatformProps {
	id?: number;
	platformName: string;
}

export default class Platform {
	constructor(
		private sql: postgres.Sql<any>,
		public props: PlatformProps,
	) { }
	static async read(sql: postgres.Sql<any>, platformName: string) {
		const connection = await sql.reserve();

		const [row] = await connection<PlatformProps[]>`
		SELECT * FROM
		platform WHERE platform_name = ${platformName}
	`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Platform(sql, convertToCase(snakeToCamel, row) as PlatformProps);
	}
	static async readFromId(sql: postgres.Sql<any>, id: number) {
		const connection = await sql.reserve();

		const [row] = await connection<PlatformProps[]>`
		SELECT * FROM
		platform WHERE id = ${id}
	`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Platform(sql, convertToCase(snakeToCamel, row) as PlatformProps);
	}
}