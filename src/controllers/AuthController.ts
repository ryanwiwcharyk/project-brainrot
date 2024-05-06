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
        let urlSearchParams: URLSearchParams = req.getSearchParams();
		let session: Session = req.getSession();
        res.setCookie(new Cookie("session_id", session.id))
		if (urlSearchParams.has("login_error")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						error: `The email or password is incorrect.`
					}
				}
			)
		}
        else if (urlSearchParams.has("empty_password")) {
            await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						error: `Password is required.`
					}
				}
			)
        }
		else if (urlSearchParams.has("emtpy_email")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						error: `Email is required.`
					}
				}
			)
		}
		else {
			await res.send(
				{
					statusCode: StatusCode.OK,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						emailCookie: req.findCookie("email")?.value
					}
				}
			)
		}
    }

    logout = async (req: Request, res: Response) => {
        let session: Session = req.getSession();
		session.destroy();
		await res.send({
			statusCode: StatusCode.OK,
			message: "User successfully logged out",
			redirect: "/"
		})
    }

    login = async (req: Request, res: Response) => {
        let email: string = req.body["email"];
		let password: string  = req.body["password"]
		let cookie: Cookie;

		if (!email) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "Invalid credentials.",
					redirect: "/login?empty_email=empty_fields"
				}
			)
		}
        else if (!password) {
            await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "Invalid credentials.",
					redirect: "/login?empty_password=empty_fields"
				}
			)
        }
		else {
			try {
				let loggedInUser: User = await User.login(this.sql, email, password)
				if (loggedInUser) {
					req.session.set("isLoggedIn", true);
					req.session.set("userId", loggedInUser.props.id)
					if (req.body.remember === "on") {
						cookie = new Cookie("email", email)
					}
					else {
						cookie = new Cookie("email", "");
						cookie.setExpires();
					}
					res.setCookie(cookie)
					res.setCookie(req.session.cookie)
					console.log(req.session.get("userId"))
					await res.send(
						{
							statusCode: StatusCode.OK,
							message: "Logged in successfully!",
							redirect: "/todos",
							template: "ListView",
							payload: {
								user: loggedInUser.props,
								path: "/todos"
							}
						}
					)
				}
			} catch (error) {
				console.log(error)
				await res.send(
					{
						statusCode: StatusCode.BadRequest,
						message: "Invalid credentials.",
						redirect: "/login?login_error=invalid_credentials"
					}
				)
			}
		}
    }


}
