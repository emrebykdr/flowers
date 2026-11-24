namespace OurBloom.Api.Infrastructure;

public static class SecurityMiddleware
{
    public const string CsrfHeader = "X-OurBloom";

    /// <summary>
    /// Durum değiştiren API isteklerinde özel bir başlık ister. Tarayıcılar başka bir siteden
    /// bu başlıkla istek atamaz (CORS ön kontrolü izin vermez); SameSite=Strict çerezle birlikte CSRF'e karşı ikinci katman.
    /// </summary>
    public static IApplicationBuilder UseCsrfHeaderCheck(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            var request = context.Request;
            if (request.Path.StartsWithSegments("/api")
                && !HttpMethods.IsGet(request.Method)
                && !HttpMethods.IsHead(request.Method)
                && !HttpMethods.IsOptions(request.Method)
                && !request.Headers.ContainsKey(CsrfHeader))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { title = "İstek reddedildi." });
                return;
            }
            await next();
        });

    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app, bool strictCsp) =>
        app.Use(async (context, next) =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "same-origin";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";
            if (strictCsp)
            {
                headers["Content-Security-Policy"] =
                    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
                    "script-src 'self'; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; " +
                    "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
            }
            if (context.Request.Path.StartsWithSegments("/api") && !headers.ContainsKey("Cache-Control"))
            {
                context.Response.OnStarting(() =>
                {
                    if (!context.Response.Headers.ContainsKey("Cache-Control"))
                        context.Response.Headers.CacheControl = "no-store";
                    return Task.CompletedTask;
                });
            }
            await next();
        });
}
