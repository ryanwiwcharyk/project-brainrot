import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import { createUTCDate } from "../utils";
import Stats, { StatsProps } from "../models/Stats";
import Profile, { ProfileProps } from "../models/GameProfile";
import Platform, { PlatformProps } from "../models/Platform";
import StatsHistory, { StatsHistoryProps } from "../models/StatsHistory";
import User from "../models/User";
import { ResolvedResult } from "vite/runtime";
import { platform } from "os";

/**
 * Controller for handling Todo CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class SearchController {
    private sql: postgres.Sql<any>;
    private readonly apiKey: string = "e38777f38399c07353c55e53bcda5082"

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
        router.get("/redirect/:username", this.redirectToStatsPage)
        router.get("/search/linked", this.getLinkedProfileStats)
    }

    getSearchForm = async (req: Request, res: Response) => {
        let messages = req.getSearchParams().get("error")
        let darkmode = req.findCookie("darkmode")?.value
        let dark = false
        if (darkmode == "dark") {
            dark = true
        } let mapData = await this.GetMapDataFromAPI(req, res)

        if (req.getSearchParams().has("no_user")) {
            await res.send({
                statusCode: StatusCode.Unauthorized,
                message: "Search page retrieved with errors",
                payload: {
                    darkmode: dark,
                    error: "You must be logged in and have linked a platform profile to access stats this way.",
                    isLoggedIn: req.session.get("isLoggedIn"),
                    currentMapName: mapData.current.map,
                    currentMapTimeRemaining: mapData.current.remainingTimer,
                    nextMapName: mapData.next.map,
                    nextMapStart: mapData.next.readableDate_start
                },
                template: "SearchFormView"
            });
        }
        else if (req.getSearchParams().has("not_found_api")) {
            await res.send({
                statusCode: StatusCode.InternalServerError,
                message: "Search page retrieved",
                payload: {
                    darkmode: dark,
                    error: "Player not found in the API.",
                    isLoggedIn: req.session.get("isLoggedIn"),
                    currentMapName: mapData.current.map,
                    currentMapTimeRemaining: mapData.current.remainingTimer,
                    nextMapName: mapData.next.map,
                    nextMapStart: mapData.next.readableDate_start
                },
                template: "SearchFormView"
            });
        }
        else if (req.getSearchParams().has("not_found_linked")) {
            await res.send({
                statusCode: StatusCode.InternalServerError,
                message: "Search page retrieved",
                payload: {
                    darkmode: dark,
                    error: "Could not find current user's stats.",
                    isLoggedIn: req.session.get("isLoggedIn"),
                    currentMapName: mapData.current.map,
                    currentMapTimeRemaining: mapData.current.remainingTimer,
                    nextMapName: mapData.next.map,
                    nextMapStart: mapData.next.readableDate_start
                },
                template: "SearchFormView"
            });
        } else if (req.getSearchParams().has("not_found")) {
            await res.send({
                statusCode: StatusCode.InternalServerError,
                message: "Search page retrieved",
                payload: {
                    darkmode: dark,
                    error: "Could not find the specified user.",
                    isLoggedIn: req.session.get("isLoggedIn"),
                    currentMapName: mapData.current.map,
                    currentMapTimeRemaining: mapData.current.remainingTimer,
                    nextMapName: mapData.next.map,
                    nextMapStart: mapData.next.readableDate_start
                },
                template: "SearchFormView"
            });
        }
        else if (req.getSearchParams().has("api_error")) {
            await res.send({
                statusCode: StatusCode.InternalServerError,
                message: "Search page retrieved",
                payload: {
                    darkmode: dark,
                    error: "The API might be down. Please try again later.",
                    isLoggedIn: req.session.get("isLoggedIn"),
                    currentMapName: mapData.current.map,
                    currentMapTimeRemaining: mapData.current.remainingTimer,
                    nextMapName: mapData.next.map,
                    nextMapStart: mapData.next.readableDate_start
                },
                template: "SearchFormView"
            });
        } else if (req.getSearchParams().has("platform_error")) {
            await res.send({
                statusCode: StatusCode.BadRequest,
                message: "Search page retrieved",
                payload: {
                    darkmode: dark,
                    error: "Invalid platform specified.",
                    isLoggedIn: req.session.get("isLoggedIn"),
                    currentMapName: mapData.current.map,
                    currentMapTimeRemaining: mapData.current.remainingTimer,
                    nextMapName: mapData.next.map,
                    nextMapStart: mapData.next.readableDate_start
                },
                template: "SearchFormView"
            });
        } else if (req.getSearchParams().has("profile_not_found")) {
            await res.send({
                statusCode: StatusCode.InternalServerError,
                message: "Search page retrieved",
                payload: {
                    darkmode: dark,
                    error: "Could not find current user's profile.",
                    isLoggedIn: req.session.get("isLoggedIn"),
                    currentMapName: mapData.current.map,
                    currentMapTimeRemaining: mapData.current.remainingTimer,
                    nextMapName: mapData.next.map,
                    nextMapStart: mapData.next.readableDate_start
                },
                template: "SearchFormView"
            });
        }
        else {
            await res.send({
                statusCode: StatusCode.OK,
                message: "Search page retrieved",
                payload: {
                    darkmode: dark,
                    error: messages,
                    isLoggedIn: req.session.get("isLoggedIn"),
                    currentMapName: mapData.current.map,
                    currentMapTimeRemaining: mapData.current.remainingTimer,
                    nextMapName: mapData.next.map,
                    nextMapStart: mapData.next.readableDate_start
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
            if (gameProfile) {
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
            else {
                let platformAPIName: string = this.GetPlatformAPIName(req, res);
                const response = await fetch(`https://api.mozambiquehe.re/bridge?auth=${this.apiKey}&player=${req.body.username}&platform=${platformAPIName}`);
                const stats = await response.json();
                if (stats.Error) {
                    await res.send({
                        statusCode: StatusCode.NotFound,
                        message: "Player not found in API",
                        redirect: `/search?not_found_api=player_not_found`,
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
        catch (error) {
            await res.send({
                statusCode: StatusCode.BadRequest,
                message: "Error requesting information. The API might be down",
                redirect: `/search?api_error=try_again`,
            });
        }
    }
    getStatisticsPage = async (req: Request, res: Response) => {
        let gameProfileId: number = req.session.get("gameProfileId")
        let isFavourite = false;

        let darkmode = req.findCookie("darkmode")?.value
        let dark = false
        if (darkmode == "dark") {
            dark = true
        }

        if (!gameProfileId) {
            let gameProfile: Profile | null = await Profile.getGameProfileFromUserId(this.sql, req.session.get("userId"))
            if (gameProfile) {
                gameProfileId = gameProfile.props.id!
            }
            else {
                await res.send({
                    statusCode: StatusCode.InternalServerError,
                    message: "Error getting user profile.",
                    redirect: `/search?not_found_linked=try_again`,
                });
                return
            }

        }

        try {
            let userStats: Stats | null = await Stats.read(this.sql, gameProfileId);
            let userStatsHistory: StatsHistory[] | null = await StatsHistory.readStatsHistory(this.sql, gameProfileId)

            if (!userStats) {
                await res.send({
                    statusCode: StatusCode.NotFound,
                    message: "Could not retrieve user stats.",
                    redirect: "/search?not_found=try_again"
                });
                return
            }
            else {
                let gameProfileUsername = req.session.get("gameProfileUsername");
                let gameProfilePlatform = req.session.get("gameProfilePlatform")

                let userGameProfile = await Profile.read(this.sql, gameProfileUsername, gameProfilePlatform)
                if (userGameProfile) {
                    let favourites: Profile[] | null = await User.FavouritesReadAll(this.sql, req.session.get("userId"));
                    if (favourites) {
                        favourites.forEach(element => {
                            if (element.props.username == userGameProfile!.props.username) {
                                isFavourite = true
                            }
                        });
                    }

                    if (userGameProfile.props.siteUserId) {
                        await res.send({
                            statusCode: StatusCode.OK,
                            message: "Stats page retrieved",
                            payload: {
                                darkmode: dark,
                                isFavourite: isFavourite,
                                favouritesPlatform: gameProfilePlatform,
                                name: userGameProfile.props.username,
                                level: userStats.props.playerLevel,
                                kills: userStats.props.playerKills,
                                damage: userStats.props.playerDamage,
                                wins: userStats.props.playerWins,
                                rank: userStats.props.playerRank,
                                isLinked: userGameProfile.props.siteUserId,
                                isLoggedIn: req.session.get("isLoggedIn"),
                                statsHistory: userStatsHistory
                            },
                            template: "StatsView"
                        });
                    }
                    else {
                        await res.send({
                            statusCode: StatusCode.OK,
                            message: "Stats page retrieved",
                            payload: {
                                darkmode: dark,
                                isFavourite: isFavourite,
                                name: userGameProfile.props.username,
                                level: userStats.props.playerLevel,
                                kills: userStats.props.playerKills,
                                damage: userStats.props.playerDamage,
                                wins: userStats.props.playerWins,
                                rank: userStats.props.playerRank,
                                isLinked: await this.UserHasLinkedPlatformProfile(req, res),
                                isLoggedIn: req.session.get("isLoggedIn"),
                                statsHistory: userStatsHistory
                            },
                            template: "StatsView"
                        });
                    }
                }
                else {
                    await res.send({
                        statusCode: StatusCode.InternalServerError,
                        message: "Search page retrieved with errors",
                        redirect: "/search?not_found=try_again"
                    });
                    return
                }

            }


        } catch (error) {
            await res.send({
                statusCode: StatusCode.BadRequest,
                message: "Error getting user stats.",
                redirect: "/search?not_found=try_again"
            });
        }

    }

    redirectToStatsPage = async (req: Request, res: Response) => {
        let gameProfile: Profile | null = null;
        let platform: Platform | null = null;
        let queryParams = req.getSearchParams()
        const favouriteUsername: string = queryParams.get('favouriteUsername') ?? "";
        const favouritePlatform: number = Number(queryParams.get('favouritePlatform') ?? "");

        let session = req.getSession();
        if (!session.get("userId")) {
            await res.send({
                statusCode: StatusCode.Unauthorized,
                message: "Unauthorized",
                redirect: `/login`,
            });
            return
        }

        try {
            platform = await Platform.readFromId(this.sql, favouritePlatform)
            if (platform) {
                gameProfile = await Profile.read(this.sql, favouriteUsername, platform?.props.platformName)
                if (gameProfile) {
                    req.session.set("gameProfileId", gameProfile.props.id);
                    req.session.set("gameProfileUsername", favouriteUsername);
                    req.session.set("gameProfilePlatform", platform?.props.platformName);
                    res.setCookie(req.session.cookie)
                }
                else {
                    //Gameprofile not found
                    await res.send({
                        statusCode: StatusCode.NotFound,
                        message: "Profile not found.",
                        redirect: "/search?profile_not_found=profile_not_found"
                    });
                    return;
                }
                await res.send({
                    statusCode: StatusCode.OK,
                    message: "Session updated.",
                    redirect: `/stats/${req.body.favouriteUsername}`,
                });
            }
            else {
                //platform not found
                await res.send({
                    statusCode: StatusCode.NotFound,
                    message: "Platform not found.",
                    redirect: "/search?platform_error=platform_not_found"
                });
                return
            }
        } catch (error) {
            await res.send({
                statusCode: StatusCode.InternalServerError,
                message: "Error getting getting information from the database.",
                redirect: "/search?not_found=try_again"
            });
            return
        }
    }

    getLinkedProfileStats = async (req: Request, res: Response) => {
        let gameProfile: Profile | null = await Profile.getGameProfileFromUserId(this.sql, req.session.get("userId"));
        let isFavourite = false

        let darkmode = req.findCookie("darkmode")?.value
        let dark = false
        if (darkmode == "dark") {
            dark = true
        }

        if (!gameProfile) {
            await res.send({
                statusCode: StatusCode.NotFound,
                message: "User is not logged in.",
                redirect: "/search?no_user=not_logged_in"
            });
            return
        }
        else if (gameProfile.props.platformId) {
            let platform = await Platform.readFromId(this.sql, gameProfile.props.platformId)
            if (platform) {
                req.session.set("gameProfileId", gameProfile.props.id);
                req.session.set("gameProfileUsername", gameProfile.props.username);
                req.session.set("gameProfilePlatform", platform.props.platformName);
                res.setCookie(req.session.cookie)
            }
        }

        let profileStats: Stats | null = await Stats.read(this.sql, gameProfile?.props.id);
        let userStatsHistory: StatsHistory[] | null = await StatsHistory.readStatsHistory(this.sql, gameProfile.props.id!)

        if (!profileStats) {
            await res.send({
                statusCode: StatusCode.NotFound,
                message: "Error getting user stats from database.",
                redirect: "/search?not_found=try_again"
            });
            return
        }
        else {
            let favourites: Profile[] | null = await User.FavouritesReadAll(this.sql, req.session.get("userId"));
            if (favourites) {
                favourites.forEach(element => {
                    if (element.props.username == gameProfile!.props.username) {
                        isFavourite = true
                    }
                });
            }
            await res.send({
                statusCode: StatusCode.OK,
                message: "Stats page retrieved",
                payload: {
                    darkmode: dark,
                    isFavourite: isFavourite,
                    name: gameProfile.props.username,
                    level: profileStats.props.playerLevel,
                    kills: profileStats.props.playerKills,
                    damage: profileStats.props.playerDamage,
                    wins: profileStats.props.playerWins,
                    rank: profileStats.props.playerRank,
                    isLinked: true,
                    isLoggedIn: req.session.get("isLoggedIn"),
                    statsHistory: userStatsHistory
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

    private async GetMapDataFromAPI(req: Request, res: Response) {
        let response = await fetch(`https://api.mozambiquehe.re/maprotation?auth=${this.apiKey}`)
        let responseJson = await response.json();
        return responseJson
    }


}