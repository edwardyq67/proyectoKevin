import { IRequest, Router } from "itty-router";
import type { D1Database, ExecutionContext } from "@cloudflare/workers-types";

import userRouter from "./usuarios/index";
import archivosRouter from "./archivos/index";
import categoriaRouter from "./categoria/index";
import productosRouter from "./productos/index"; // Importar router de productos
import { corsHeaders } from "./middleware/cors";

interface Env {
    db_zeng: D1Database;
}

const router = Router();
// ============================================
// RUTAS DE ARCHIVOS
// ============================================
router.post("/archivos",archivosRouter.handle)
// ============================================
// RUTAS DE CATEGORÍA
// ============================================
router.get("/categoria", categoriaRouter.handle);           // GET todas
router.get("/categoria/:uuid", categoriaRouter.handle);     // GET by ID
router.post("/categoria", categoriaRouter.handle);          // POST crear
router.patch("/categoria/:uuid", categoriaRouter.handle);   // PATCH actualizar
router.delete("/categoria/:uuid", categoriaRouter.handle);  // DELETE eliminar

// ============================================
// RUTAS DE PRODUCTOS
// ============================================
router.get("/productos", productosRouter.handle);           // GET todos con filtros
router.get("/productos/:uuid", productosRouter.handle);     // GET by ID
router.post("/productos", productosRouter.handle);          // POST crear
router.patch("/productos/:uuid", productosRouter.handle);   // PATCH actualizar
router.delete("/productos/:uuid", productosRouter.handle);  // DELETE eliminar

// ============================================
// RUTAS DE USUARIOS
// ============================================
router.post("/usuarios/create", userRouter.handle);
router.post("/usuarios/login", userRouter.handle);
router.post("/usuarios/logout-all", userRouter.handle);

// ============================================
// MANEJO DE CORS PREFLIGHT
// ============================================
router.options("*", (request: IRequest) => {
    return new Response(null, {
        status: 204,
        headers: corsHeaders(request)
    });
});

// ============================================
// RUTA 404 - NO ENCONTRADA
// ============================================
router.all("*", (request: IRequest) => 
    new Response("Ruta no encontrada", { 
        status: 404,
        headers: corsHeaders(request)
    })
);

export default {
    fetch: (request: Request, env: Env, ctx: ExecutionContext) => router.handle(request, env, ctx),
};