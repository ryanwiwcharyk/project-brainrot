import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import { createUTCDate } from "../utils";

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
        router.get("/stats:username", this.getStatisticsPage)
	}

    getSearchForm = async (req: Request, res: Response) => {
        
    }
    findPlayerStatistics = async (req: Request, res: Response) => {
        let 

    }
    getStatisticsPage = async (req: Request, res: Response) => {
        throw new Error("Method not implemented.");
    }

    
}