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
import { url } from "inspector";


export default class AuthController {
	private sql: postgres.Sql<any>;

	constructor(sql: postgres.Sql<any>) {
		this.sql = sql
	}

	registerRoutes(router: Router) {
		router.get("/register", this.getRegistrationForm);
		router.get("/login", this.getLoginForm);
		router.get("/logout", this.logout);
		router.post("/login", this.login);
	}

	getRegistrationForm = async (req: Request, res: Response) => {
		let darkmode = req.findCookie("darkmode")?.value
		let dark = false
		if (darkmode == "dark") {
			dark = true
		}
		let urlSearchParams: URLSearchParams = req.getSearchParams();
		if (urlSearchParams.has("password_error")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded registration form with errors",
					template: "RegistrationFormView",
					payload: {
						darkmode: dark,
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
						darkmode: dark,
						error: `One or more of the password fields are empty`
					}
				}
			)
		}
		else if (urlSearchParams.has("empty_email")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded registration form with errors",
					template: "RegistrationFormView",
					payload: {
						darkmode: dark,
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
						darkmode: dark,
						error: "A user with this email already exists"
					}
				}
			)
		}
		else if (urlSearchParams.has("user_error")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded registration form with errors",
					template: "RegistrationFormView",
					payload: {
						darkmode: dark,
						error: "A user with this username already exists"
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
					payload: {
						darkmode: dark,
					}
				}
			)
		}
	}

	getLoginForm = async (req: Request, res: Response) => {
		let urlSearchParams: URLSearchParams = req.getSearchParams();
		res.setCookie(req.session.cookie)
		let darkmode = req.findCookie("darkmode")?.value
		let dark = false
		if (darkmode == "dark") {
			dark = true
		}
		if (urlSearchParams.has("login_error")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						darkmode: dark,
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
						darkmode: dark,
						error: `Password is required.`
					}
				}
			)
		}
		else if (urlSearchParams.has("empty_email")) {
			await res.send(
				{
					statusCode: StatusCode.BadRequest,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						darkmode: dark,
						error: `Email is required.`
					}
				}
			)
		}
		else if (urlSearchParams.has("no_user"))
		{
			await res.send(
				{
					statusCode: StatusCode.Unauthorized,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						darkmode: dark,
						error: `Must be logged in to favourite a profile.`
					}
				}
			)
		}
		else if (urlSearchParams.has("no_user_edit")){
			await res.send(
				{
					statusCode: StatusCode.Unauthorized,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						darkmode: dark,
						error: `You must be logged in to edit your account.`
					}
				}
			)
		}
		else if (urlSearchParams.has("no_user_link")) {
			await res.send(
				{
					statusCode: StatusCode.Unauthorized,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						darkmode: dark,
						error: `You must be logged in to claim a profile as your own.`
					}
				}
			)
		} else if (urlSearchParams.has("no_user_unlink")) {
			await res.send(
				{
					statusCode: StatusCode.Unauthorized,
					message: "loaded login form",
					template: "LoginFormView",
					payload: {
						darkmode: dark,
						error: `You must be logged in to unlink your account.`
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
						darkmode: dark,
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
			redirect: "/login"
		})
	}

	login = async (req: Request, res: Response) => {
		let email: string = req.body["email"];
		let password: string = req.body["password"]
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
					req.session.set("email", loggedInUser.props.email)
					if (req.body.remember === "on") {
						cookie = new Cookie("email", email)
					}
					else {
						cookie = new Cookie("email", "");
						cookie.setExpires();
					}
					res.setCookie(cookie)
					res.setCookie(req.session.cookie)
					await res.send(
						{
							statusCode: StatusCode.OK,
							message: "Logged in successfully!",
							redirect: "/search",
						}
					)
				}
			} catch (error) {
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
