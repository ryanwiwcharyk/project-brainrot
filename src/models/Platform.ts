import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";

export interface PlatformProps {
	id?: number;
	platformName?: string;
}

export class Platform {
	constructor(
		private sql: postgres.Sql<any>,
		public props: PlatformProps,
	) { }
	static async platformRead(sql: postgres.Sql<any>, platformName: string) {
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
}