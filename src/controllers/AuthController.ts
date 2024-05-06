import postgres from "postgres";
import Router from "../router/Router";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import View from "../views/View";
import { URLSearchParams } from "url";
import Session from "../auth/Session";
import User from "../models/User";
import SessionManager from "../auth/SessionManager";
import Cookie from "../auth/Cookie";


export default class AuthController{
    private sql: postgres.Sql<any>;

    constructor (sql: postgres.Sql<any>) {
        this.sql = sql
    }

    registerRoutes(router: Router) {
        router.get("/register", this.getRegistrationForm);
        router.get("/login", this.getLoginForm);
        router.get("/logout", this.logout);
        router.post("/login", this.login);
    }

    getRegistrationForm = async (req: Request, res: Response) => {
        let urlSearchParams: URLSearchParams = req.getSearchParams();
		if (urlSearchParams.has("password_error")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded registration form with errors",
					template: "RegistrationFormView",
					payload: {
						error: `Passwords do not match`
					}
				}
			)
		}
        else if (urlSearchParams.has("empty_password")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded registration form with errors",
					template: "RegistrationFormView",
					payload: {
						error: `One or more of the password fields are empty`
					}
				}
			)
		}
		else if (urlSearchParams.has("empty_email")){
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded registration form with errors",
					template: "RegistrationFormView",
					payload: {
						error: "Email is required"
					}
				}
			)
		} else if (urlSearchParams.has("email_error")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded registration form with errors",
					template: "RegistrationFormView",
					payload: {
						error: "A user with this email already exists"
					}
				}
			)
		}
		else {
			await res.send(
				{
					statusCode: StatusCode.OK,
					message: "loaded registration form",
					template: "RegistrationFormView",
				}
			)
		}
    }

    getLoginForm = async (req: Request, res: Response) => {

    }

    logout = async (req: Request, res: Response) => {

    }

    login = async (req: Request, res: Response) => {

    }


}
