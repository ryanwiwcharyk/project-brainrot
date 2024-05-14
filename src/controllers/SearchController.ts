import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import { createUTCDate } from "../utils";
import Stats, { StatsProps } from "../models/Stats";
import Profile, { ProfileProps } from "../models/GameProfile";
import { Platform, PlatformProps } from "../models/Platform";
import User from "../models/User";

/**
 * Controller for handling Todo CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class SearchController {
    private sql: postgres.Sql<any>;

    constructor(sql: postgres.Sql<any>) {
        this.sql = sql;
    }

    /**
     * To register a route, call the corresponding method on
     * the router instance based on the HTTP method of the route.
     *
     * @param router Router instance to register routes on.
     *
     * @example router.get("/todos", this.getTodoList);
     */
    registerRoutes(router: Router) {
        router.get("/search", this.getSearchForm);
        router.post("/search", this.findPlayerStatistics);
        router.get("/stats/:username", this.getStatisticsPage)
        router.get("/search/linked", this.getLinkedProfileStats)
    }

    getSearchForm = async (req: Request, res: Response) => {
        let messages = req.getSearchParams().get("error")

        if (req.getSearchParams().has("no_user")) {
            await res.send({
                statusCode: StatusCode.Unauthorized,
                message: "Search page retrieved with errors",
                payload: {
                    error: "You must be logged in and have linked a platform profile to access stats this way.",
                    isLoggedIn: req.session.get("isLoggedIn")
                },
                template: "SearchFormView"
            });
        }
        else {
            await res.send({
                statusCode: StatusCode.OK,
                message: "Search page retrieved",
                payload: {
                    error: messages,
                    isLoggedIn: req.session.get("isLoggedIn")
                },
                template: "SearchFormView"
            });
        }
        

    }
    findPlayerStatistics = async (req: Request, res: Response) => {
        let platform: Platform | null = null;
        let gameProfile: Profile | null = null;
        let playerStats: Stats | null = null;
    
        try {
            
            //check db for stats
            gameProfile = await Profile.read(this.sql, req.body.username, req.body.platform)
            
            //If theres no existing game profile then there wouldnt be a corresponding
            //player stats so we populate stats given the api.
            if (gameProfile) 
            {
                req.session.set("gameProfileId", gameProfile.props.id);
                req.session.set("gameProfileUsername", gameProfile.props.username);
                req.session.set("gameProfilePlatform", req.body.platform);
                res.setCookie(req.session.cookie)

                await res.send({
                    statusCode: StatusCode.OK,
                    message: "Player stats exist in the database",
                    redirect: `/stats/${req.body.username}`,
                });
            }
            else
            {
                let platformAPIName: string = this.GetPlatformAPIName(req, res);
                const response = await fetch('https://api.mozambiquehe.re/bridge?auth=e38777f38399c07353c55e53bcda5082&player=' + req.body.username + '&platform=' + platformAPIName);
                const stats = await response.json();
                if(stats.Error)
                {
                    await res.send({
                        statusCode: StatusCode.NotFound,
                        message: "Player not found in API",
                        redirect: `/search?error=player_not_found`,
                    });
                    
                } else {
                    platform = await Platform.read(this.sql, req.body.platform)
                    let profileStats: ProfileProps = {
                        username: req.body.username,
                        platformId: platform?.props.id
                    };
        
                    gameProfile = await Profile.create(this.sql, profileStats)
    
                    req.session.set("gameProfileId", gameProfile.props.id);
                    req.session.set("gameProfileUsername", gameProfile.props.username);
                    req.session.set("gameProfilePlatform", req.body.platform);
                    res.setCookie(req.session.cookie)

                    let statsProps: StatsProps = {
                        playerLevel: stats.global.level ?? null,
                        playerKills: stats.total.kills?.value ?? null,
                        playerDamage: stats.total.damage?.value ?? null,
                        playerWins: stats.total.career_wins?.value ?? null,
                        playerRank: stats.global.rank?.rankName ?? null,
                        profileId: gameProfile.props.id
                    };
        
                    playerStats = await Stats.create(this.sql, statsProps)
                    await res.send({
                        statusCode: StatusCode.Created,
                        message: "Player stats added successfully!",
                        redirect: `/stats/${req.body.username}`,
                    });
                }
            }
        } 
        catch (error) 
        {
            await res.send({
                statusCode: StatusCode.BadRequest,
                message: "Error requesting information. The API might be down",
                redirect: `/search?error=try_again`,
            });
        }
    }
    getStatisticsPage = async (req: Request, res: Response) => {
        let gameProfileId: number = req.session.get("gameProfileId")
        

        try {
            let userStats: Stats | null = await Stats.read(this.sql, gameProfileId);

            if(!userStats) {
                await res.send({
                    statusCode: StatusCode.NotFound,
                    message: "Could not retrieve user stats.",
                    redirect: "/search?error=try_again"
                });
            }
            else {
                let userGameProfile: Profile | null = await Profile.read(this.sql, req.session.get("gameProfileUsername"), req.session.get("gameProfilePlatform"))
                let userId = req.session.get("userId")
			    let favourites = await User.FavouritesReadAll(this.sql, userId)
                if (userGameProfile) {
                    if (userGameProfile.props.siteUserId) {
                        await res.send({
                            statusCode: StatusCode.OK,
                            message: "Stats page retrieved",
                            payload: {
                                name: userGameProfile.props.username,
                                level: userStats.props.playerLevel,
                                kills: userStats.props.playerKills,
                                damage: userStats.props.playerDamage,
                                wins: userStats.props.playerWins,
                                rank: userStats.props.playerRank,
                                favourites: favourites,
                                isLinked: userGameProfile.props.siteUserId,
                                isLoggedIn: req.session.get("isLoggedIn")
                            },
                            template: "StatsView"
                        });
                    }
                    else {
                        await res.send({
                            statusCode: StatusCode.OK,
                            message: "Stats page retrieved",
                            payload: {
                                name: userGameProfile.props.username,
                                level: userStats.props.playerLevel,
                                kills: userStats.props.playerKills,
                                damage: userStats.props.playerDamage,
                                wins: userStats.props.playerWins,
                                rank: userStats.props.playerRank,
                                favourites: favourites,
                                isLinked: await this.UserHasLinkedPlatformProfile(req, res),
                                isLoggedIn: req.session.get("isLoggedIn")
                            },
                            template: "StatsView"
                        });
                    }
                }
                else {
                    await res.send({
                        statusCode: StatusCode.InternalServerError,
                        message: "Search page retrieved with errors",
                        redirect: "/search?error=try_again"
                    });
                }
                
            }
            

        } catch (error) {
            await res.send({
                statusCode: StatusCode.BadRequest,
                message: "Error getting user stats.",
                redirect: "/search?error=try_again"
            });
        }
        
    }

    getLinkedProfileStats = async (req: Request, res: Response) => {
        let gameProfile: Profile | null = await Profile.getGameProfileFromUserId(this.sql, req.session.get("userId"));
        let favourites: Profile[] | null = await User.FavouritesReadAll(this.sql, req.session.get("userId"));

        if (!gameProfile) {
            await res.send({
                statusCode: StatusCode.NotFound,
                message: "User is not logged in.",
                redirect: "/search?no_user=not_logged_in"
            });
            return
        }

        let profileStats: Stats | null = await Stats.read(this.sql, gameProfile?.props.id);

        if (!profileStats) {
            await res.send({
                statusCode: StatusCode.NotFound,
                message: "Error getting user stats from database.",
                redirect: "/search?error=try_again"
            });
            return
        }
        else {
            await res.send({
                statusCode: StatusCode.OK,
                message: "Stats page retrieved",
                payload: {
                    name: gameProfile.props.username,
                    level: profileStats.props.playerLevel,
                    kills: profileStats.props.playerKills,
                    damage: profileStats.props.playerDamage,
                    wins: profileStats.props.playerWins,
                    rank: profileStats.props.playerRank,
                    isLinked: true,
                    //favourites: favourites,
                    isLoggedIn: req.session.get("isLoggedIn")
                },
                template: "StatsView"
            });
        }
    }



    private GetPlatformAPIName(req: Request, res: Response): string {
        if (req.body["platform"] === "PSN") {
            return "PS4"
        }
        else if (req.body["platform"] === "XBOX") {
            return "X1"
        }
        else {
            return "PC"
        }
    }

    private async UserHasLinkedPlatformProfile(req: Request, res: Response): Promise<boolean> {
        let loggedInUser: User | null = await User.read(this.sql, req.session.get("userId"))
        let loggedInUserGameProfile: Profile | null = await Profile.getGameProfileFromUserId(this.sql, req.session.get("userId"))
        
        if (loggedInUserGameProfile?.props.siteUserId && loggedInUserGameProfile.props.siteUserId === loggedInUser?.props.id) {
            return true
        }

        return false

    }


}