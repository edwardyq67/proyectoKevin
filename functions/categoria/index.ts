import { IRequest, Router } from "itty-router";
import type { D1Database } from "@cloudflare/workers-types";
import { authMiddleware } from "../middleware/auth";
import { corsHeaders } from "../middleware/cors";

interface Env {
    db_zeng: D1Database;
}

interface Categoria {
    id: number;
    uuid: string;
    nombre: string;
    activo: number;
}

const router = Router();

// GET /categoria - Obtener todas las categorías activas
router.get("/categoria", async (request: IRequest, env: Env) => {
    try {
        const result = await env.db_zeng
            .prepare("SELECT id, uuid, nombre, activo FROM categoria WHERE activo = 1 ORDER BY nombre ASC")
            .all();

        return new Response(JSON.stringify({
            success: true,
            data: result.results || []
        }), {
            status: 200,
            headers: corsHeaders(request)
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Error al obtener categorías"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

// GET /categoria/:uuid - Obtener categoría por ID (UUID)
router.get("/categoria/:uuid", async (request: IRequest, env: Env) => {
    try {
        const { uuid } = request.params;
        
        const categoria = await env.db_zeng
            .prepare("SELECT id, uuid, nombre, activo FROM categoria WHERE uuid = ? AND activo = 1")
            .bind(uuid)
            .first();

        if (!categoria) {
            return new Response(JSON.stringify({
                success: false,
                error: "Categoría no encontrada"
            }), {
                status: 404,
                headers: corsHeaders(request)
            });
        }

        return new Response(JSON.stringify({
            success: true,
            data: categoria
        }), {
            status: 200,
            headers: corsHeaders(request)
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Error al obtener la categoría"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

// POST /categoria - Crear nueva categoría
router.post("/categoria", async (request: IRequest, env: Env) => {
    try {
        const authResult = await authMiddleware(request, env);
        if (authResult instanceof Response) return authResult;

        const body = await request.json();
        const { nombre } = body;

        if (!nombre) {
            return new Response(JSON.stringify({
                success: false,
                error: "El nombre es requerido"
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        // Verificar si ya existe una categoría con ese nombre
        const existing = await env.db_zeng
            .prepare("SELECT nombre FROM categoria WHERE nombre = ? AND activo = 1")
            .bind(nombre)
            .first();

        if (existing) {
            return new Response(JSON.stringify({
                success: false,
                error: "Ya existe una categoría con ese nombre"
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        const uuid = crypto.randomUUID();
        
        await env.db_zeng
            .prepare("INSERT INTO categoria (uuid, nombre, activo) VALUES (?, ?, ?)")
            .bind(uuid, nombre, 1)
            .run();

        return new Response(JSON.stringify({
            success: true,
            message: "Categoría creada correctamente",
            data: { uuid, nombre }
        }), {
            status: 201,
            headers: corsHeaders(request)
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Error al crear la categoría"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

// PATCH /categoria/:uuid - Actualizar categoría
router.patch("/categoria/:uuid", async (request: IRequest, env: Env) => {
    try {
        const authResult = await authMiddleware(request, env);
        if (authResult instanceof Response) return authResult;

        const { uuid } = request.params;
        const body = await request.json();
        const { nombre } = body;

        if (!nombre) {
            return new Response(JSON.stringify({
                success: false,
                error: "El nombre es requerido"
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        // Verificar si la categoría existe
        const categoria = await env.db_zeng
            .prepare("SELECT uuid FROM categoria WHERE uuid = ? AND activo = 1")
            .bind(uuid)
            .first();

        if (!categoria) {
            return new Response(JSON.stringify({
                success: false,
                error: "Categoría no encontrada"
            }), {
                status: 404,
                headers: corsHeaders(request)
            });
        }

        // Verificar si ya existe otra categoría con el mismo nombre
        const existing = await env.db_zeng
            .prepare("SELECT uuid FROM categoria WHERE nombre = ? AND uuid != ? AND activo = 1")
            .bind(nombre, uuid)
            .first();

        if (existing) {
            return new Response(JSON.stringify({
                success: false,
                error: "Ya existe otra categoría con ese nombre"
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        await env.db_zeng
            .prepare("UPDATE categoria SET nombre = ? WHERE uuid = ?")
            .bind(nombre, uuid)
            .run();

        return new Response(JSON.stringify({
            success: true,
            message: "Categoría actualizada correctamente"
        }), {
            status: 200,
            headers: corsHeaders(request)
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Error al actualizar la categoría"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

// DELETE /categoria/:uuid - Eliminar categoría (soft delete - activo = 0)
router.delete("/categoria/:uuid", async (request: IRequest, env: Env) => {
    try {
        const authResult = await authMiddleware(request, env);
        if (authResult instanceof Response) return authResult;

        const { uuid } = request.params;

        // Verificar si la categoría existe y está activa
        const categoria = await env.db_zeng
            .prepare("SELECT uuid FROM categoria WHERE uuid = ? AND activo = 1")
            .bind(uuid)
            .first();

        if (!categoria) {
            return new Response(JSON.stringify({
                success: false,
                error: "Categoría no encontrada"
            }), {
                status: 404,
                headers: corsHeaders(request)
            });
        }

        // Soft delete: solo cambiamos activo a 0
        await env.db_zeng
            .prepare("UPDATE categoria SET activo = 0 WHERE uuid = ?")
            .bind(uuid)
            .run();

        return new Response(JSON.stringify({
            success: true,
            message: "Categoría eliminada correctamente"
        }), {
            status: 200,
            headers: corsHeaders(request)
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Error al eliminar la categoría"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

export default router;