import postgres, { ResultQueryMeta } from "postgres";
import Router from "../router/Router";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import View from "../views/View";
import { URLSearchParams } from "url";
import Session from "../auth/Session";
import User, {DuplicateEmailError, DuplicateUsenameError, UserProps} from "../models/User";
import SessionManager from "../auth/SessionManager";
import Cookie from "../auth/Cookie";
import { createUTCDate } from "../utils";
import Profile from "../models/GameProfile";


export default class UserController {
    private sql: postgres.Sql<any>;

    constructor (sql: postgres.Sql<any>) {
        this.sql = sql
    }

    registerRoutes(router: Router) {
        router.post("/users", this.createUser);
        router.post("/profile", this.registerPlatformAccount)

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
                if (error instanceof DuplicateEmailError) {
                    await res.send({
                        statusCode: StatusCode.BadRequest,
                        message: "User with this email already exists.",
                        redirect: "/register?email_error=email_duplicate"
    
                    });
                }
                else if (error instanceof DuplicateUsenameError) {
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
        let userId: number = req.session.get("userId");
        let gameProfileUsername: string = req.session.get("gameProfileUsername");
        let gameProfile: Profile | null = await Profile.read(this.sql, gameProfileUsername)

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
	getUserPage = async (req: Request, res: Response) => {
		let messages = req.getSearchParams().get("error")


		let darkmode = req.findCookie("darkmode")?.value
		let dark = false
		if(darkmode == "dark"){
			dark = true
		}
		let pic = req.findCookie("pic")?.value

		let session = req.getSession();
		if(!session.get("userId"))
		{
			await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: `/login`,
			});			
			return
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Login retrieved",
			payload: {
				error: messages,
				darkmode: dark,
				pic: pic,
				loggedIn: session.get("loggedIn"),
			},
			template: "EditProfileView"
		});
	}
	updateUser = async (req: Request, res: Response) => {
		let session = req.getSession();
		let userProps: Partial<UserProps> = {}
		if(!session.get("userId"))
		{
			await res.send({
					statusCode: StatusCode.Unauthorized,
					message: "Unauthorized",
					redirect: `/login`,
			});			
			return
		}
		
		let id = session.get("userId")
		
		if(req.body.email){
			userProps.email = req.body.email
		}
		if(req.body.pic){
			userProps.profile = req.body.pic
		}
		if(req.body.password){
			userProps.password = req.body.password
		}
		if(!req.body.password && !req.body.pic && !req.body.email && req.body.darkmode){
			res.setCookie(new Cookie("darkmode", "dark"))
			await res.send({
				statusCode: StatusCode.OK,
				message: "User updated successfully!",
				redirect: "/users/edit?error=lacking_info"
			});	
		}
		if(!req.body.password && !req.body.pic && !req.body.email && !req.body.darkmode){
			res.setCookie(new Cookie("darkmode", "light"))
			await res.send({
				statusCode: StatusCode.OK,
				message: "User updated successfully!",
				redirect: "/users/edit?error=lacking_info"
			});	
		}

		try{
			let user: User = await User.update(this.sql, userProps, id)

			if(req.body.darkmode){
				res.setCookie(new Cookie("darkmode", "dark"))
			}
			else{
				res.setCookie(new Cookie("darkmode", "light"))
			}

			if(req.body.pic){
				res.setCookie(new Cookie("pic", req.body.pic))
			}

			await res.send({
				statusCode: StatusCode.OK,
				message: "User updated successfully!",
				redirect: "/users/edit?error=lacking_info"
			});	
		}
		catch{
			await res.send({
				statusCode: StatusCode.BadRequest,
				message: "User with this email already exists.",
				redirect: "/users/edit?error=lacking_info"
			});
		}

	};
}
