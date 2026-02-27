import { IRequest, Router } from "itty-router";
import type { D1Database } from "@cloudflare/workers-types";
import { authMiddleware } from "../middleware/auth";
import { corsHeaders } from "../middleware/cors";

interface Env {
    db_zeng: D1Database;
}

interface Producto {
    id: number;
    uuid: string;
    rs: string;
    descripcion: string;
    principioActivo: string;
    presentacion: string;
    laboratorio: string;
    productControlado: number;
    carrusel: number; // NUEVO CAMPO
    imagen: string;
    categoria_uuid: string;
    activo: number;
}

const router = Router();

// GET /productos - Obtener todos los productos activos con filtros
router.get("/productos", async (request: IRequest, env: Env) => {
    try {
        const url = new URL(request.url);
        const laboratorio = url.searchParams.get("laboratorio");
        const categoria_uuid = url.searchParams.get("categoria");
        const productControlado = url.searchParams.get("controlado");
        const carrusel = url.searchParams.get("carrusel"); // NUEVO FILTRO
        const search = url.searchParams.get("search");

        let query = `
            SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p
            LEFT JOIN categoria c ON p.categoria_uuid = c.uuid
            WHERE p.activo = 1
        `;
        const params: any[] = [];

        if (laboratorio) {
            query += ` AND p.laboratorio = ?`;
            params.push(laboratorio);
        }

        if (categoria_uuid) {
            query += ` AND p.categoria_uuid = ?`;
            params.push(categoria_uuid);
        }

        if (productControlado !== null) {
            query += ` AND p.productControlado = ?`;
            params.push(parseInt(productControlado));
        }

        // NUEVO: Filtro por carrusel
        if (carrusel !== null) {
            query += ` AND p.carrusel = ?`;
            params.push(parseInt(carrusel));
        }

        if (search) {
            query += ` AND (p.descripcion LIKE ? OR p.principioActivo LIKE ? OR p.rs LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY p.descripcion ASC`;

        const result = await env.db_zeng
            .prepare(query)
            .bind(...params)
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
            error: "Error al obtener productos"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

// GET /productos/:uuid - Obtener producto por UUID
router.get("/productos/:uuid", async (request: IRequest, env: Env) => {
    try {
        const { uuid } = request.params;
        
        const producto = await env.db_zeng
            .prepare(`
                SELECT p.*, c.nombre as categoria_nombre 
                FROM productos p
                LEFT JOIN categoria c ON p.categoria_uuid = c.uuid
                WHERE p.uuid = ? AND p.activo = 1
            `)
            .bind(uuid)
            .first();

        if (!producto) {
            return new Response(JSON.stringify({
                success: false,
                error: "Producto no encontrado"
            }), {
                status: 404,
                headers: corsHeaders(request)
            });
        }

        return new Response(JSON.stringify({
            success: true,
            data: producto
        }), {
            status: 200,
            headers: corsHeaders(request)
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Error al obtener el producto"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

// POST /productos - Crear nuevo producto
router.post("/productos", async (request: IRequest, env: Env) => {
    try {
        const authResult = await authMiddleware(request, env);
        if (authResult instanceof Response) return authResult;

        const body = await request.json();
        const { 
            rs, 
            descripcion, 
            principioActivo, 
            presentacion, 
            laboratorio, 
            productControlado = 0,
            carrusel = 0, // NUEVO CAMPO con valor por defecto
            imagen = null,
            categoria_uuid 
        } = body;

        // Validaciones
        if (!rs || !descripcion || !principioActivo || !presentacion || !laboratorio) {
            return new Response(JSON.stringify({
                success: false,
                error: "Faltan campos requeridos: rs, descripcion, principioActivo, presentacion, laboratorio"
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        // Verificar si la categoría existe
        if (categoria_uuid) {
            const categoria = await env.db_zeng
                .prepare("SELECT uuid FROM categoria WHERE uuid = ? AND activo = 1")
                .bind(categoria_uuid)
                .first();

            if (!categoria) {
                return new Response(JSON.stringify({
                    success: false,
                    error: "La categoría especificada no existe"
                }), {
                    status: 400,
                    headers: corsHeaders(request)
                });
            }
        }

        // Verificar si ya existe un producto con el mismo RS
        const existing = await env.db_zeng
            .prepare("SELECT rs FROM productos WHERE rs = ? AND activo = 1")
            .bind(rs)
            .first();

        if (existing) {
            return new Response(JSON.stringify({
                success: false,
                error: "Ya existe un producto con ese Registro Sanitario"
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        const uuid = crypto.randomUUID();
        
        await env.db_zeng
            .prepare(`
                INSERT INTO productos (
                    uuid, rs, descripcion, principioActivo, presentacion, 
                    laboratorio, productControlado, carrusel, imagen, categoria_uuid, activo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(uuid, rs, descripcion, principioActivo, presentacion, laboratorio, 
                  productControlado, carrusel, imagen, categoria_uuid, 1)
            .run();

        return new Response(JSON.stringify({
            success: true,
            message: "Producto creado correctamente",
            data: { uuid, rs, descripcion }
        }), {
            status: 201,
            headers: corsHeaders(request)
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Error al crear el producto"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

// PATCH /productos/:uuid - Actualizar producto
router.patch("/productos/:uuid", async (request: IRequest, env: Env) => {
    try {
        const authResult = await authMiddleware(request, env);
        if (authResult instanceof Response) return authResult;

        const { uuid } = request.params;
        const body = await request.json();
        const { 
            rs, 
            descripcion, 
            principioActivo, 
            presentacion, 
            laboratorio, 
            productControlado,
            carrusel, // NUEVO CAMPO
            imagen,
            categoria_uuid 
        } = body;

        // Verificar si el producto existe
        const producto = await env.db_zeng
            .prepare("SELECT uuid FROM productos WHERE uuid = ? AND activo = 1")
            .bind(uuid)
            .first();

        if (!producto) {
            return new Response(JSON.stringify({
                success: false,
                error: "Producto no encontrado"
            }), {
                status: 404,
                headers: corsHeaders(request)
            });
        }

        // Verificar categoría si se proporciona
        if (categoria_uuid) {
            const categoria = await env.db_zeng
                .prepare("SELECT uuid FROM categoria WHERE uuid = ? AND activo = 1")
                .bind(categoria_uuid)
                .first();

            if (!categoria) {
                return new Response(JSON.stringify({
                    success: false,
                    error: "La categoría especificada no existe"
                }), {
                    status: 400,
                    headers: corsHeaders(request)
                });
            }
        }

        // Verificar RS único si se proporciona
        if (rs) {
            const existing = await env.db_zeng
                .prepare("SELECT uuid FROM productos WHERE rs = ? AND uuid != ? AND activo = 1")
                .bind(rs, uuid)
                .first();

            if (existing) {
                return new Response(JSON.stringify({
                    success: false,
                    error: "Ya existe otro producto con ese Registro Sanitario"
                }), {
                    status: 400,
                    headers: corsHeaders(request)
                });
            }
        }

        // Construir query dinámica
        let updates: string[] = [];
        let params: any[] = [];

        if (rs !== undefined) {
            updates.push("rs = ?");
            params.push(rs);
        }
        if (descripcion !== undefined) {
            updates.push("descripcion = ?");
            params.push(descripcion);
        }
        if (principioActivo !== undefined) {
            updates.push("principioActivo = ?");
            params.push(principioActivo);
        }
        if (presentacion !== undefined) {
            updates.push("presentacion = ?");
            params.push(presentacion);
        }
        if (laboratorio !== undefined) {
            updates.push("laboratorio = ?");
            params.push(laboratorio);
        }
        if (productControlado !== undefined) {
            updates.push("productControlado = ?");
            params.push(productControlado);
        }
        // NUEVO: Actualizar carrusel
        if (carrusel !== undefined) {
            updates.push("carrusel = ?");
            params.push(carrusel);
        }
        if (imagen !== undefined) {
            updates.push("imagen = ?");
            params.push(imagen);
        }
        if (categoria_uuid !== undefined) {
            updates.push("categoria_uuid = ?");
            params.push(categoria_uuid);
        }

        if (updates.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: "No hay campos para actualizar"
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        params.push(uuid);
        await env.db_zeng
            .prepare(`UPDATE productos SET ${updates.join(", ")} WHERE uuid = ?`)
            .bind(...params)
            .run();

        return new Response(JSON.stringify({
            success: true,
            message: "Producto actualizado correctamente"
        }), {
            status: 200,
            headers: corsHeaders(request)
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Error al actualizar el producto"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

// DELETE /productos/:uuid - Eliminar producto (soft delete)
router.delete("/productos/:uuid", async (request: IRequest, env: Env) => {
    try {
        const authResult = await authMiddleware(request, env);
        if (authResult instanceof Response) return authResult;

        const { uuid } = request.params;

        // Verificar si el producto existe y está activo
        const producto = await env.db_zeng
            .prepare("SELECT uuid FROM productos WHERE uuid = ? AND activo = 1")
            .bind(uuid)
            .first();

        if (!producto) {
            return new Response(JSON.stringify({
                success: false,
                error: "Producto no encontrado"
            }), {
                status: 404,
                headers: corsHeaders(request)
            });
        }

        // Soft delete
        await env.db_zeng
            .prepare("UPDATE productos SET activo = 0 WHERE uuid = ?")
            .bind(uuid)
            .run();

        return new Response(JSON.stringify({
            success: true,
            message: "Producto eliminado correctamente"
        }), {
            status: 200,
            headers: corsHeaders(request)
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Error al eliminar el producto"
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

export default router;