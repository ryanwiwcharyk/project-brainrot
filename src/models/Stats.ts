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
	playerLevel?: string;
	playerKills?: boolean;
	playerDeaths?: number;
	killDeathRatio?: number;
	playerDamage?: number;
	playerWins?: number;
	playerRank?: string;
	profileId?: number;
}

export interface StatsHistoryProps {
	id?: number,
	legendPlayed?: string,
	mapPlayed?: string,
	damageDealt?: number,
	startTime?: bigint,
	endTime?: bigint,
	sessionKills?: number,
	profileId?: number

}

export class StatsHistory {
	constructor(
		private sql: postgres.Sql<any>,
		public props: StatsHistoryProps,
	) { }

	static async readStatsHistory(
		sql: postgres.Sql<any>,
		profileId: number): Promise<StatsHistory[] | null> {
		const connection = await sql.reserve();

		const rows: postgres.RowList<StatsHistoryProps[]> = await connection<StatsHistoryProps[]>`
			SELECT * FROM
			session_stats WHERE profile_id = ${profileId}
		`;

		await connection.release();

		if (!rows) {
			return null;
		}

		return rows.map(
			(row: StatsHistoryProps) =>
				new StatsHistory(sql, convertToCase(snakeToCamel, row) as StatsHistoryProps)
		);
	}
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