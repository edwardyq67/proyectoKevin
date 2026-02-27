import { IRequest, Router } from "itty-router";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { sign, verify } from "jsonwebtoken"; // JWT para autenticación
import { hash, compare } from "bcryptjs"; // bcrypt para encriptar passwords
import { authMiddleware, getSecretKey } from "../middleware/auth";
import { corsHeaders } from "../middleware/cors";

interface Env {
    db_zeng: D1Database;
}

interface usuarios{
    id: number,
    uuid: string
    usuarios: string,
    password: string,
    activo: number,
}

const router = Router();

/**
 * Crear un nuevo usuario (solo administrador)
 * Ruta protegida, requiere autenticación de admin
 */
router.post("/usuarios/create", async (request: IRequest, env: Env) => {
    const authResult = await authMiddleware(request, env);
    if (authResult instanceof Response) return authResult;

    const body = await request.json();
    const { usuarios, password, dni } = body; // Añadido dni

    // Validar que todos los campos requeridos existan
    if (!usuarios || !password || !dni) {
        return new Response(JSON.stringify({ 
            error: "Faltan datos requeridos: usuarios, password, dni" 
        }), {
            status: 400, 
            headers: corsHeaders(request)
        });
    }

    // Verificar si el usuario ya existe (por nombre de usuario o DNI)
    const existingUser = await env.db_zeng
        .prepare("SELECT * FROM usuarios WHERE usuarios = ? OR dni = ?")
        .bind(usuarios, dni)
        .first();
        
    if (existingUser) {
        let mensaje = "El ";
        if (existingUser.usuarios === usuarios) {
            mensaje += "nombre de usuario";
        } else {
            mensaje += "DNI";
        }
        mensaje += " ya está registrado";
        
        return new Response(JSON.stringify({ error: mensaje }), { 
            status: 400, 
            headers: corsHeaders(request) 
        });
    }

    // Encriptar la password
    const passwordHash = await hash(password, 10);
    const uuid = crypto.randomUUID();
    
    // Insertar en la base de datos (incluyendo dni)
    await env.db_zeng.prepare(
        "INSERT INTO usuarios (uuid, usuarios, dni, password, activo) VALUES (?, ?, ?, ?, ?)"
    ).bind(uuid, usuarios, dni, passwordHash, 1).run();

    return new Response(JSON.stringify({ 
        success: true, 
        message: "Usuario creado correctamente",
        data: {
            uuid,
            usuarios,
            dni
        }
    }), { 
        status: 201, 
        headers: corsHeaders(request) 
    });
});
/**
 * Iniciar sesión y obtener JWT
 */
router.post("/usuarios/login", async (request: IRequest, env: Env) => {
    try {
        const body = await request.json();
        const { usuarios, password } = body;

        if (!usuarios || !password) {
            return new Response(JSON.stringify({ error: "Faltan datos requeridos: usuarios, password" }), { 
                status: 400, headers: corsHeaders(request) 
            });
        }

        console.log("Buscando usuario:", usuarios);
        
        // Buscar el usuario en la base de datos
        const result = await env.db_zeng.prepare("SELECT * FROM usuarios WHERE usuarios = ?").bind(usuarios).first() as usuarios | null;

        if (!result) {
            console.error("Usuario no encontrado en la base de datos:", usuarios);
            return new Response(JSON.stringify({ error: "Usuario o password incorrectos" }), { 
                status: 401, headers: corsHeaders(request) 
            });
        }

        console.log("Comparando passwords para:", usuarios);

        // Comparar passwords
        const passwordMatch = await compare(password, result.password);
        if (!passwordMatch) {
            console.error("password incorrecta para el usuario:", usuarios);
            return new Response(JSON.stringify({ error: "Usuario o password incorrectos" }), { 
                status: 401, headers: corsHeaders(request) 
            });
        }

        console.log("Usuario autenticado con éxito:", usuarios);

        // Generar token JWT
        const token = sign({ usuarios: result.usuarios }, await getSecretKey(env));

        return new Response(JSON.stringify({ token }), { 
            status: 200, headers: corsHeaders(request) 
        });

    } catch (error) {
        console.error("Error en /usuarios/login:", error);
        return new Response(JSON.stringify({ error: "Error interno en el servidor", details: error }), { 
            status: 500, headers: corsHeaders(request) 
        });
    }
});

// Manejador para solicitudes OPTIONS (Preflight CORS)
router.options("*", (request: IRequest) => {
    return new Response(null, {
        status: 204, // No Content
        headers: corsHeaders(request), // Responder con los encabezados CORS
    });
});

export default router