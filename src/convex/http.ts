import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/",
  method: "GET",
  handler: httpAction(async () =>
    new Response(
      JSON.stringify({
        ok: true,
        deployment: "determined-rabbit-619",
        api: "https://determined-rabbit-619.convex.cloud",
        site: "https://determined-rabbit-619.convex.site",
      }),
      { headers: { "content-type": "application/json; charset=utf-8" } },
    ),
  ),
});

export default http;
