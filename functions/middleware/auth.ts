import { D1Database } from "@cloudflare/workers-types";
import { IRequest } from "itty-router";
import { verify } from "jsonwebtoken";

const SECRET_KEY = "34328489327984deqhio13c13";

export interface Authenticatedusuarios {
    usuarios: string;

}

interface Env {
    db_zeng: D1Database;
}

/**
 * Obtiene la clave secreta actual desde la base de datos
 */
export async function getSecretKey(env: Env): Promise<string> {
    return SECRET_KEY;
}

/**
 * Middleware de autenticación
 * Verifica el token JWT y devuelve el usuario autenticado
 */
export async function authMiddleware(request: IRequest, env: Env): Promise<{ usuarios: string; } | Response> {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded  = await verify(token, await getSecretKey(env));
        const { usuarios } = decoded as { usuarios: string; };

        // Consultar la base de datos para verificar si el usuario está activo
        const usuariosRecord = await env.db_zeng.prepare("SELECT activo FROM usuarios WHERE usuarios = ?").bind(usuarios).first();

        if (!usuariosRecord) {
            return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404 });
        }

        if (usuariosRecord.activo !== 1) {
            return new Response(JSON.stringify({ error: "Usuario inactivo" }), { status: 403 });
        }

        return { usuarios }; // Permitir la ejecución de la solicitud con datos del usuario

    } catch (error) {
        return new Response(JSON.stringify({ error: "Token inválido o expirado" }), { status: 401 });
    }
}