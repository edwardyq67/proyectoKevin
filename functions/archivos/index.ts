/* eslint-disable @typescript-eslint/no-explicit-any */
import { IRequest, Router } from "itty-router";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { authMiddleware } from "../middleware/auth";
import { corsHeaders } from "../middleware/cors";

interface Env {
    db_zeng: D1Database;
    r2_zeng: R2Bucket;
}

const router = Router();

// POST /archivo - Subir un archivo a R2
router.post("/archivos", async (request: IRequest, env: Env) => {
    try {
        // Verificar autenticación
        const authResult = await authMiddleware(request as any, env);
        if (authResult instanceof Response) return authResult;

        // Obtener el formulario con el archivo
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const folder = formData.get("folder") as string || "general";

        if (!file) {
            return new Response(JSON.stringify({
                success: false,
                error: "No se ha enviado ningún archivo"
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        // Validar tipo de archivo - AGREGAMOS .glb
        const allowedTypes = [
            "image/jpeg", 
            "image/png", 
            "image/webp", 
            "application/pdf",
            "model/gltf-binary",           // Tipo MIME para .glb
            "application/octet-stream",     // Alternativa común para .glb
            "binary/octet-stream"           // Otra alternativa
        ];
        
        // También verificamos por extensión del nombre
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isGlbFile = fileExtension === 'glb';
        
        // Si es .glb, permitimos incluso si el tipo MIME no coincide exactamente
        if (!isGlbFile && !allowedTypes.includes(file.type)) {
            return new Response(JSON.stringify({
                success: false,
                error: "Tipo de archivo no permitido. Permitidos: JPG, PNG, WEBP, PDF, GLB"
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        // Validar tamaño - MODIFICADO a 10KB máximo
        const maxSize = 10 * 1024; // 10KB en bytes
        if (file.size > maxSize) {
            return new Response(JSON.stringify({
                success: false,
                error: `El archivo es demasiado grande. Máximo 10KB. Tamaño actual: ${(file.size / 1024).toFixed(2)}KB`
            }), {
                status: 400,
                headers: corsHeaders(request)
            });
        }

        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = file.name.split('.').pop();
        const fileName = `${folder}/${timestamp}-${randomString}.${extension}`;

        // Convertir File a ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Subir a R2
        await env.r2_zeng.put(fileName, arrayBuffer, {
            httpMetadata: {
                contentType: file.type || "model/gltf-binary", // Usamos el tipo correcto para GLB
                contentDisposition: `inline; filename="${file.name}"`
            },
            customMetadata: {
                originalName: file.name,
                folder: folder,
                uploadDate: new Date().toISOString(),
                fileType: fileExtension === 'glb' ? '3d-model' : 'other'
            }
        });

        // Construir URL pública (asumiendo que el bucket es público)
        const publicUrl = `https://pub-1f9ac825129942c08cd16b7649c90824.r2.dev/${fileName}`;

        return new Response(JSON.stringify({
            success: true,
            message: "Archivo subido correctamente",
            data: {
                fileName: fileName,
                originalName: file.name,
                size: file.size,
                sizeKB: (file.size / 1024).toFixed(2) + "KB",
                type: file.type || "model/gltf-binary",
                url: publicUrl,
                folder: folder,
                is3DModel: fileExtension === 'glb'
            }
        }), {
            status: 201,
            headers: corsHeaders(request)
        });

    } catch (error) {
        console.error("Error al subir archivo:", error);
        return new Response(JSON.stringify({
            success: false,
            error: "Error al subir el archivo: " 
        }), {
            status: 500,
            headers: corsHeaders(request)
        });
    }
});

export default router;