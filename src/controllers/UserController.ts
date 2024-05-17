import postgres, { ResultQueryMeta } from "postgres";
import Router from "../router/Router";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import View from "../views/View";
import { URLSearchParams } from "url";
import Session from "../auth/Session";
import User, { DuplicateEmailError, DuplicateUsernameError, UserProps } from "../models/User";
import SessionManager from "../auth/SessionManager";
import Cookie from "../auth/Cookie";
import { createUTCDate } from "../utils";
import Profile from "../models/GameProfile";
import { url } from "inspector";


export default class UserController {
	private sql: postgres.Sql<any>;

	constructor(sql: postgres.Sql<any>) {
		this.sql = sql
	}

	registerRoutes(router: Router) {
		router.post("/users", this.createUser);
		router.post("/profile", this.registerPlatformAccount)
		router.post("/favourites", this.addFavouritesToProfile)
		router.get("/unlink", this.unlinkPlatformProfile)

		router.get("/users/edit", this.getUserPage);
		router.put("/users/edit", this.updateUser);
	}

	createUser = async (req: Request, res: Response) => {
		let user: User | null = null;

		let userProps: UserProps = {
			userName: req.body["userName"],
			email: req.body["email"],
			password: req.body["password"],
			createdAt: createUTCDate(),
		};
		if (!userProps.email) {
			await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Missing email.",
				redirect: "/register?empty_email=email_empty"
			})
		}
		else if (!userProps.password) {
			await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Missing password.",
				redirect: "/register?empty_password=password_empty"
			})
		}
		else if (!userProps.userName) {
			await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Missing username.",
				redirect: "/register?empty_username=username_empty"
			})
		}
		else if (req.body["password"] === req.body["confirmPassword"]) {
			try {
				user = await User.create(this.sql, userProps);
				let darkmode = req.findCookie("darkmode")?.value
				let dark = false
				if (darkmode == "dark") {
					dark = true
				}

				await res.send({
					statusCode: StatusCode.Created,
					message: "User created",
					redirect: "/login",
					template: "LoginFormView",
					payload: {
						user: user.props,
						darkmode: dark
					}
				});
			} catch (error) {
				if (error instanceof DuplicateEmailError) {
					await res.send({
						statusCode: StatusCode.BadRequest,
						message: "User with this email already exists.",
						redirect: "/register?email_error=email_duplicate"

					});
				}
				else if (error instanceof DuplicateUsernameError) {
					await res.send({
						statusCode: StatusCode.BadRequest,
						message: "User with this username already exists.",
						redirect: "/register?user_error=username_duplicate"

					});
				}

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

	registerPlatformAccount = async (req: Request, res: Response) => {
		if (!req.session.get("isLoggedIn")) {
			await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Must be logged in to claim a profile.",
				redirect: `/login?no_user_link=not_logged_in`,
			});
			return;
		}
		let userId: number = req.session.get("userId");
		let gameProfileUsername: string = req.session.get("gameProfileUsername");
		let gameProfilePlatform: string = req.session.get("gameProfilePlatform");
		let gameProfile: Profile | null = await Profile.read(this.sql, gameProfileUsername, gameProfilePlatform)

		if (!gameProfile) {
			await res.send({
				statusCode: StatusCode.NotFound,
				message: "Error linking profiles",
				redirect: `/stats/${gameProfileUsername}?error=profile_not_found`,
			});
			return;
		}

		try {
			await gameProfile?.linkToSiteProfile(userId)
		} catch (error) {
			await res.send({
				statusCode: StatusCode.NotFound,
				message: "Error linking profiles",
				redirect: `/stats/${gameProfileUsername}?error=profile_not_found`,
			});
			return;
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Profiles linked successfully",
			redirect: `/stats/${gameProfileUsername}`,
		});

	}

	addFavouritesToProfile = async (req: Request, res: Response) => {
		if (!req.session.get("isLoggedIn")) {
			await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Must be logged in to favourite a profile.",
				redirect: `/login?no_user=not_logged_in`,
			});
			return;
		}
		try {
			let userId = req.session.get("userId")
			let gameProfileId = req.session.get("gameProfileId")

			const isChecked = req.body.checkbox
			if (isChecked) {
				await User.FavouritesCreate(this.sql, userId, gameProfileId)

				await res.send({
					statusCode: StatusCode.OK,
					message: "Profile unfavourited successfully",
					redirect: `/stats/${req.session.get("gameProfileUsername")}`,
				});
				return
			}
			else {
				await User.FavouritesDelete(this.sql, userId, gameProfileId)
				await res.send({
					statusCode: StatusCode.OK,
					message: "Profile favourited successfully",
					redirect: `/stats/${req.session.get("gameProfileUsername")}`,
				});
				return
			}
		} catch (error) {
			await res.send({
				statusCode: StatusCode.NotFound,
				message: "Error occured adding account",
				redirect: `/stats/${req.session.get("gameProfileUsername")}?error=profile_not_found`,
			});
			return;
		}
	}

	unlinkPlatformProfile = async (req: Request, res: Response) => {
		let gameProfile: Profile | null = await Profile.getGameProfileFromUserId(this.sql, req.session.get("userId"))

		if (!gameProfile) {
			await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Must be logged in to unlink an account",
				redirect: `login?no_user_unlink=not_logged_in`,
			});
			return;
		}
		try {
			await gameProfile?.unlinkPlatformAccount(req.session.get("userId"))
		} catch (error) {
			await res.send({
				statusCode: StatusCode.NotFound,
				message: "Error unlinking accounts",
				redirect: `/stats/${req.session.get("gameProfileUsername")}?error=profile_not_found`,
			});
			return;
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Profiles unlinked successfully",
			redirect: `/users/edit`,
		});
	}

	getUserPage = async (req: Request, res: Response) => {
		let messages = req.getSearchParams().get("error")
		let loggedInUser: User | null = await User.read(this.sql, req.session.get("userId"))
		let gameProfile: Profile | null = await Profile.getGameProfileFromUserId(this.sql, req.session.get("userId"))
		let urlSearchParams: URLSearchParams = req.getSearchParams()
		let userId = req.session.get("userId")
		let favourites = await User.FavouritesReadAll(this.sql, userId)

		let darkmode = req.findCookie("darkmode")?.value
		let dark = false
		if (darkmode == "dark") {
			dark = true
		}
		let pic = req.findCookie("pic")?.value

		let session = req.getSession();
		if (!session.get("userId")) {
			await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: `/login?no_user_edit=not_logged_in`,
			});
			return
		}
		if (urlSearchParams.has("success")) {
			await res.send({
				statusCode: StatusCode.OK,
				message: "Edit form retrieved",
				payload: {
					success: "User updated successfully",
					darkmode: dark,
					pic: pic,
					isLoggedIn: session.get("isLoggedIn"),
					email: loggedInUser?.props.email,
					username: loggedInUser?.props.userName,
					favourites: favourites,
					gameProfile: gameProfile
				},
				template: "EditProfileView"
			});
		}
		else {
			await res.send({
				statusCode: StatusCode.OK,
				message: "Edit form retrieved",
				payload: {
					darkmode: dark,
					pic: pic,
					isLoggedIn: session.get("isLoggedIn"),
					email: loggedInUser?.props.email,
					username: loggedInUser?.props.userName,
					favourites: favourites,
					gameProfile: gameProfile
				},
				template: "EditProfileView"
			});
		}
		
	}
	updateUser = async (req: Request, res: Response) => {
		let session = req.getSession();
		if (!session.get("userId")) {
			await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: `/login?no_user_edit`,
			});
			return
		}

		let props: Partial<UserProps> = {}
		if (req.body.username) {
			props.userName = req.body.username
		}
		if (req.body.email && req.body.email != req.session.get("email")) {
			props.email = req.body.email
		}

		if (req.body.password) {
			props.password = req.body.password
		}
		if (!req.body.password && req.body.email != req.session.get("email") && req.body.darkmode) {
			res.setCookie(new Cookie("darkmode", "dark"))
			await res.send({
				statusCode: StatusCode.OK,
				message: "User updated successfully!",
				redirect: "/users/edit?success=updated_successfully"
			});
		}
		if (!req.body.password && req.body.email != req.session.get("email") && !req.body.darkmode) {
			res.setCookie(new Cookie("darkmode", "light"))
			await res.send({
				statusCode: StatusCode.OK,
				message: "User updated successfully!",
				redirect: "/users/edit?success=updated_successfully"
			});
		}
		try {
			let id = session.get("userId")
			let user: User | null = await User.read(this.sql, id)

			if (!user) {
				await res.send({
					statusCode: StatusCode.BadRequest,
					message: "Error retrieving info from database",
					redirect: "/users/edit?error=try_again"
				});
			}
			else {
				await user.update(props)

				if (req.body.darkmode) {
					res.setCookie(new Cookie("darkmode", "dark"))
				}
				else {
					res.setCookie(new Cookie("darkmode", "light"))
				}


				await res.send({
					statusCode: StatusCode.OK,
					message: "User updated successfully!",
					redirect: "/users/edit?success=updated_successfully"
				});
			}
		}
		catch {
			await res.send({
				statusCode: StatusCode.BadRequest,
				message: "User with this email already exists.",
				redirect: "/users/edit?error=already_exists"
			});
		}


	};
}
