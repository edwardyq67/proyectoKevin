import { IRequest } from "itty-router";

export function corsHeaders(request: IRequest) {
    const allowedOrigins = ["http://localhost:8788", "https://localhost:3001", "https://www.xn--inicialniojesus-6qb.com"];
    const origin = request.headers.get("Origin");

    // Validar si el origen está en la lista de permitidos
    const isAllowedOrigin = origin && allowedOrigins.includes(origin) ? origin : "";

    return {
        "Access-Control-Allow-Origin": isAllowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}