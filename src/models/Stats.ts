import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";
import { SourceMap } from "module";

export interface StatsProps {
	id?: number;
	playerLevel?: number;
	playerKills?: number;
	playerDeaths?: number;
	killDeathRatio?: number;
	playerDamage?: number;
	playerWins?: number;
	playerRank?: string;
	profileId?: number;
}

export default class Stats {
	constructor(
		private sql: postgres.Sql<any>,
		public props: StatsProps,
	) { }

	static async create(
		sql: postgres.Sql<any>,
		props: StatsProps,
	): Promise<Stats> {
		const connection = await sql.reserve();


		const [row] = await connection<StatsProps[]>`
			INSERT INTO stats
			${sql(convertToCase(camelToSnake, props))}
			RETURNING *
			`;

		await connection.release();

		return new Stats(sql, convertToCase(snakeToCamel, row) as StatsProps);
	}

	static async read(
		sql: postgres.Sql<any>,
		id?: number
	): Promise<Stats | null> {
		const connection = await sql.reserve();

		const [row] = await connection<StatsProps[]>`
			SELECT * FROM
			stats WHERE profile_id = ${id}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Stats(sql, convertToCase(snakeToCamel, row) as StatsProps);
	}
	async update(
		sql: postgres.Sql<any>,
		updateProps: Partial<StatsProps>,
		id: number
	): Promise<Stats> {
		const connection = await sql.reserve();

		const [row] = await connection`
		UPDATE stats
		SET
			${sql(convertToCase(camelToSnake, updateProps))}
		WHERE
			id = ${id}
		RETURNING *
		`;


		await connection.release();

		return new Stats(sql, convertToCase(snakeToCamel, row) as StatsProps);

	}
}