import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// Convex Storage yêu cầu URL được tạo từ storage.getUrl(). Endpoint này
// chuyển hướng tới đúng URL của logo mới trong Storage.
const APP_LOGO_STORAGE_ID = "kg28vmks2ffwhk14575s6jnvws8f3n8z";

auth.addHttpRoutes(http);

http.route({
  path: "/logo",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const storageUrl = await ctx.storage.getUrl(APP_LOGO_STORAGE_ID);
    if (!storageUrl) {
      return new Response("Logo not found", { status: 404 });
    }
    return Response.redirect(storageUrl, 302);
  }),
});

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
