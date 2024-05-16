import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";
import GameProfile, { ProfileProps } from "./GameProfile";


export interface UserProps {
	id?: number;
	userName: string;
	email: string;
	password: string;
	createdAt: Date;
	editedAt?: Date;
	profilePicture?: string;
}

export class DuplicateEmailError extends Error {
	constructor() {
		super("User with this email already exists.");
	}
}

export class InvalidCredentialsError extends Error {
	constructor() {
		super("Invalid credentials.");
	}
}

export class DuplicateUsernameError extends Error {
	constructor() {
		super("This username is taken. Please try again.")
	}
}

export default class User {
	constructor(
		private sql: postgres.Sql<any>,
		public props: UserProps,
	) { }

	static async login(
		sql: postgres.Sql<any>,
		email: string,
		password: string,
	): Promise<User> {
		const connection = await sql.reserve();

		if (!email || !password) {
			throw new InvalidCredentialsError()
		}

		const [row] = await connection<UserProps[]>`
			SELECT * FROM users
			WHERE email = ${email} AND password = ${password}
			`;

		if (row) {
			return new User(sql, convertToCase(snakeToCamel, row) as UserProps);
		}
		else {
			throw new InvalidCredentialsError()
		}
	}

	static async create(
		sql: postgres.Sql<any>,
		props: UserProps,
	): Promise<User> {
		const connection = await sql.reserve();

		props.createdAt = props.createdAt ?? createUTCDate();

		const email = await connection<UserProps[]>`
			SELECT email FROM users WHERE email = ${props.email}`;

		const userName = await connection<UserProps[]>`
			SELECT user_name FROM users WHERE user_name = ${props.userName}`;

		if (email.count !== 0) {
			throw new DuplicateEmailError();
		}
		else if (userName.count !== 0) {
			throw new DuplicateUsernameError();
		}
		else {
			const [row] = await connection<UserProps[]>`
			INSERT INTO users
			${sql(convertToCase(camelToSnake, props))}
			RETURNING *`;

			await connection.release();

			return new User(sql, convertToCase(snakeToCamel, row) as UserProps)
		}

	}
	async update(
		updateProps: Partial<UserProps>,
	) {
		const connection = await this.sql.reserve();
		if (updateProps.email) {
			const email = await connection<UserProps[]>`
				SELECT email FROM users WHERE email = ${updateProps.email}`;
			if (email.count !== 0) {
				throw new DuplicateEmailError();
			}
		}

		const [row] = await connection`
		UPDATE users
		SET
			${this.sql(convertToCase(camelToSnake, updateProps))}, edited_at = ${createUTCDate()}
		WHERE
			id = ${this.props.id}
		RETURNING *
		`;


		await connection.release();

		this.props = { ...this.props, ...convertToCase(snakeToCamel, row) }
	}

	static async read(sql: postgres.Sql<any>, id: number) {
		const connection = await sql.reserve();

		const [row] = await connection<UserProps[]>`
			SELECT * FROM
			users WHERE id = ${id}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new User(sql, convertToCase(snakeToCamel, row) as UserProps);
	}

	async delete(
		sql: postgres.Sql<any>,
		id: number
	) {
		const connection = await sql.reserve();

		const [row] = await connection`
		DELETE FROM users WHERE id = ${id}
		`;

		await connection.release();

	}

	static async FavouritesReadAll(
		sql: postgres.Sql<any>,
		userId: number
	): Promise<GameProfile[] | null> {
		const connection = await sql.reserve();

		const rows: postgres.RowList<ProfileProps[]> = await connection<ProfileProps[]>`
			SELECT game_profile.*
			FROM favourites JOIN game_profile
			ON favourites.profile_id = game_profile.id
            WHERE favourites.user_id = ${userId}
		`;

		await connection.release();

		if (!rows || rows.count === 0) {
			return null;
		}

		return rows.map(
			(row: ProfileProps) =>
				new GameProfile(sql, convertToCase(snakeToCamel, row) as ProfileProps),
		);
	}

	static async FavouritesCreate(
		sql: postgres.Sql<any>,
		userId: number,
		profileId: number,
	) {
		const connection = await sql.reserve();


		const [row] = await connection<UserProps[]>`
			INSERT INTO favourites (user_id, profile_id)
			VALUES(${userId}, ${profileId})
		`;

		await connection.release();

	}
	static async FavouritesDelete(
		sql: postgres.Sql<any>,
		userId: number,
		profileId: number,
	) {
		const connection = await sql.reserve();


		const [row] = await connection<UserProps[]>`
			DELETE FROM favourites
			WHERE user_id = ${userId} AND profile_id = ${profileId}
		`;

		await connection.release();

	}

}
