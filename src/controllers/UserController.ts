import postgres from "postgres";
import Router from "../router/Router";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import View from "../views/View";
import { URLSearchParams } from "url";
import Session from "../auth/Session";
import User, {UserProps} from "../models/User";
import SessionManager from "../auth/SessionManager";
import Cookie from "../auth/Cookie";
import { createUTCDate } from "../utils";


export default class UserController {
    private sql: postgres.Sql<any>;

    constructor (sql: postgres.Sql<any>) {
        this.sql = sql
    }

    registerRoutes(router: Router) {
        router.post("/users", this.createUser);
    }

    createUser = async (req: Request, res: Response) => {
        let user: User | null = null;

		let userProps: UserProps = {
            name: req.body["username"],
			email: req.body["email"],
			password: req.body["password"],
			createdAt: createUTCDate(),
		};
		if (!userProps.email){
			await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Missing email.",
				redirect: "/register?empty_email=email_empty"
		})}
		else if (!userProps.password) {
			await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Missing password.",
				redirect: "/register?empty_password=password_empty"
		})
		}
		else if (req.body["password"] === req.body["confirmPassword"])
		{
			try {
				user = await User.create(this.sql, userProps);
	
				await res.send({
					statusCode: StatusCode.Created,
					message: "User created",
					redirect: "/login",
					template: "LoginFormView",
					payload: {
						user: user.props
					}
				});
			} catch (error) {
				await res.send({
					statusCode: StatusCode.BadRequest,
					message: "User with this email already exists.",
					redirect: "/register?email_error=email_duplicate"

				}); 
			}
		}
		else {
			await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Passwords do not match",
				redirect: `/register?password_error=password_mismatch`,
			}); 
		}
		
	};
    }
