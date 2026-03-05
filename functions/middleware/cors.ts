import { IRequest } from "itty-router";

export function corsHeaders(request: IRequest) {
    const allowedOrigins = [
        "http://localhost:8788",
        "http://localhost", 
        "https://localhost", 
        "http://localhost:3001", 
        "https://www.xn--inicialniojesus-6qb.com",
        "https://zengprueba.deivyp.workers.dev",
        "https://bienestarzeng.com"
    ];
    const origin = request.headers.get("Origin");

    // Validar si el origen está en la lista de permitidos
    const isAllowedOrigin = origin && allowedOrigins.includes(origin) ? origin : "";

    return {
        "Access-Control-Allow-Origin": isAllowedOrigin,
        // ✅ AGREGADO PATCH A LOS MÉTODOS PERMITIDOS
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}