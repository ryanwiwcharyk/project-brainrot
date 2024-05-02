import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";

export interface UserProps {
	id?: number;
	name: string;
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

export default class User {
	constructor(
		private sql: postgres.Sql<any>,
		public props: UserProps,
	) {}

	static async login(
		sql: postgres.Sql<any>,
		email: string,
		password: string,
	): Promise<User> {
		const connection = await sql.reserve();

		if(!email || !password){
			throw new InvalidCredentialsError()
		}

		const [row] = await connection<UserProps[]>`
			SELECT * FROM users
			WHERE email = ${email} AND password = ${password}
			`;

		if(row){
			return new User(sql, convertToCase(snakeToCamel, row) as UserProps);
		}
		else{
			throw new InvalidCredentialsError()
		}
	}

	static async create(
		sql: postgres.Sql<any>,
		props: UserProps,
	): Promise<User> {
		const connection = await sql.reserve();

		props.createdAt = props.createdAt ?? createUTCDate();

		const [row] = await connection<UserProps[]>`
			SELECT * FROM users
			WHERE email = ${props.email}
		`;

		if (!row) {
			const [row] = await connection<UserProps[]>`
			INSERT INTO users
			${sql(convertToCase(camelToSnake, props))}
			RETURNING *
			`;
			
			await connection.release();
			
			return new User(sql, convertToCase(snakeToCamel, row) as UserProps);
		}
		else{
			throw new DuplicateEmailError();
		}

	}
	static async update(
		sql: postgres.Sql<any>,
		updateProps: Partial<UserProps>,
		id: number
	): Promise<User> {
		const connection = await sql.reserve();

		const [row] = await connection`
		UPDATE users
		SET
			${sql(convertToCase(camelToSnake, updateProps))}, edited_at = ${createUTCDate()}
		WHERE
			id = ${id}
		RETURNING *
		`;


		await connection.release();

		return new User(sql, convertToCase(snakeToCamel, row) as UserProps);
	
	}

	// static async read(sql: postgres.Sql<any>, id: number): Promise<User> {
	// 	return new User(sql, {});
	// }

	// static async readAll(sql: postgres.Sql<any>): Promise<User[]> {
	// 	return [new User(sql, {})];
	// }

	// async update(updateProps: Partial<UserProps>) {
	// }

	// async delete() {
	// }
}
