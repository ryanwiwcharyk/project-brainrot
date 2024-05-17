import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";
import { SourceMap } from "module";

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

export default class StatsHistory {
	constructor(
		private sql: postgres.Sql<any>,
		public props: StatsHistoryProps,
	) { }

	static async readStatsHistory(
		sql: postgres.Sql<any>,
		profileId: number): Promise<StatsHistory[] | null> {
		const connection = await sql.reserve();

		const rows = await connection<StatsHistoryProps[]>`
			SELECT * FROM
			session_stats WHERE profile_id = ${profileId}
		`;

		await connection.release();

		if (rows.count === 0) {
			return null;
		}

		return rows.map(
			(row: StatsHistoryProps) =>
				new StatsHistory(sql, convertToCase(snakeToCamel, row) as StatsHistoryProps)
		);
	}
}