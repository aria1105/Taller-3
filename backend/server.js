/*
 * server.js - Servidor backend para el módulo hexagonal purificador de aire
 * 
 * Este servidor recibe los datos del ESP32 por HTTP POST, los guarda
 * en un archivo JSON, y sirve la página web al usuario.
 * 
 * Para ejecutarlo: node server.js
 * No necesita instalar ninguna librería adicional (usa solo módulos nativos de Node.js).
 */

// ============================================================
//  IMPORTACIÓN DE MÓDULOS NATIVOS DE NODE.JS
// ============================================================

const http = require("http");       // módulo para crear el servidor HTTP
const fs = require("fs");           // módulo para leer y escribir archivos en el disco
const path = require("path");       // módulo para trabajar con rutas de archivos

// ============================================================
//  CONSTANTES DE CONFIGURACIÓN
// ============================================================

const PUERTO = 3000;                // número del puerto donde escuchará el servidor
const ARCHIVO_DATOS = "datos.jsonl";  // nombre del archivo donde se guardan las lecturas (JSON Lines)
const RUTA_FRONTEND = path.join(__dirname, "..", "frontend");  // ruta a la carpeta del frontend

// ============================================================
//  INICIALIZACIÓN: CREAR EL ARCHIVO DE DATOS SI NO EXISTE
// ============================================================

if (!fs.existsSync(ARCHIVO_DATOS)) {            // si el archivo de datos no existe todavía
  fs.writeFileSync(ARCHIVO_DATOS, "");          // lo crea vacío para poder empezar a guardar lecturas
  console.log("Archivo " + ARCHIVO_DATOS + " creado.");  // avisa en la consola que se creó el archivo
}

// ============================================================
//  FUNCIÓN: leerUltimasLecturas
//  Lee las últimas N líneas del archivo de datos (formato JSON Lines).
//  Cada línea es un objeto JSON con una lectura del ESP32.
//  Parámetro: cantidad = número de líneas a leer desde el final.
//  Devuelve: un array con los objetos JSON de las últimas lecturas.
// ============================================================

function leerUltimasLecturas(cantidad) {
  try {
    const contenido = fs.readFileSync(ARCHIVO_DATOS, "utf8");  // lee todo el archivo como texto
    const lineas = contenido.trim().split("\n");                // separa el texto por saltos de línea

    if (lineas.length === 0 || (lineas.length === 1 && lineas[0] === "")) {
      return [];                                                // si está vacío, devuelve un array vacío
    }

    const ultimas = lineas.slice(-cantidad);                    // toma solo las últimas N líneas

    const resultado = [];                                       // array donde se guardarán los objetos JSON

    for (let i = 0; i < ultimas.length; i++) {                 // recorre cada línea seleccionada
      try {
        const objeto = JSON.parse(ultimas[i]);                  // convierte la línea de texto a objeto JSON
        resultado.push(objeto);                                 // agrega el objeto al array de resultado
      } catch (error) {
        // si una línea no se puede convertir a JSON, la salta y sigue con la siguiente
        console.log("Error al parsear una linea: " + error);
      }
    }

    return resultado;                                           // devuelve el array con los objetos JSON
  } catch (error) {
    console.log("Error al leer el archivo: " + error);          // muestra el error en la consola
    return [];                                                  // devuelve un array vacío si hubo error
  }
}

// ============================================================
//  FUNCIÓN: obtenerMimeType
//  Devuelve el tipo MIME correcto según la extensión del archivo.
//  Esto es necesario para que el navegador interprete bien cada archivo.
//  Parámetro: rutaArchivo = la ruta del archivo a servir.
//  Devuelve: un string con el tipo MIME.
// ============================================================

function obtenerMimeType(rutaArchivo) {
  const extension = path.extname(rutaArchivo).toLowerCase();    // obtiene la extensión del archivo

  if (extension === ".html") return "text/html";                // tipo MIME para archivos HTML
  if (extension === ".css") return "text/css";                  // tipo MIME para archivos CSS
  if (extension === ".js") return "application/javascript";     // tipo MIME para archivos JavaScript
  if (extension === ".json") return "application/json";         // tipo MIME para archivos JSON
  if (extension === ".png") return "image/png";                 // tipo MIME para imágenes PNG
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";  // tipo MIME para imágenes JPG
  if (extension === ".ico") return "image/x-icon";             // tipo MIME para íconos

  return "application/octet-stream";                            // tipo MIME genérico para otros archivos
}

// ============================================================
//  CREACIÓN DEL SERVIDOR HTTP
//  El servidor escucha en el puerto 3000 y maneja diferentes
//  rutas (endpoints) según la URL de la petición.
// ============================================================

const servidor = http.createServer(function(peticion, respuesta) {
  const url = peticion.url;                                     // obtiene la URL de la petición
  const metodo = peticion.method;                               // obtiene el método HTTP (GET, POST, etc.)

  console.log("Peticion recibida: " + metodo + " " + url);      // muestra la petición en la consola

  // ============================================================
  //  ENDPOINT: POST /data
  //  Recibe los datos del ESP32 en formato JSON y los guarda
  //  como una nueva línea en el archivo datos.jsonl.
  // ============================================================

  if (url === "/data" && metodo === "POST") {
    let cuerpo = "";                                            // variable para acumular el cuerpo de la petición

    peticion.on("data", function(chunk) {                       // evento que se dispara cuando llegan datos
      cuerpo += chunk.toString();                               // convierte el chunk a string y lo acumula
    });

    peticion.on("end", function() {                             // evento que se dispara cuando terminan los datos
      try {
        const datosJSON = JSON.parse(cuerpo);                   // convierte el cuerpo a objeto JSON

        datosJSON.timestamp = Math.floor(Date.now() / 1000);    // agrega el timestamp Unix actual en segundos

        const linea = JSON.stringify(datosJSON) + "\n";          // convierte el objeto a string JSON y agrega salto de línea

        fs.appendFileSync(ARCHIVO_DATOS, linea);                 // agrega la línea al final del archivo

        console.log("Datos guardados:", datosJSON);              // muestra los datos guardados en la consola

        respuesta.writeHead(200, { "Content-Type": "application/json" });  // envía código 200 (éxito)
        respuesta.end(JSON.stringify({ estado: "ok", mensaje: "Datos recibidos correctamente" }));
      } catch (error) {                                          // si hubo un error al procesar los datos
        console.log("Error al procesar datos:", error);          // muestra el error en la consola
        respuesta.writeHead(400, { "Content-Type": "application/json" });  // envía código 400 (error del cliente)
        respuesta.end(JSON.stringify({ estado: "error", mensaje: "JSON invalido" }));
      }
    });

  // ============================================================
  //  ENDPOINT: GET /latest
  //  Devuelve la lectura más reciente (última línea del archivo).
  // ============================================================

  } else if (url === "/latest" && metodo === "GET") {
    const ultimas = leerUltimasLecturas(1);                     // lee la última línea del archivo

    if (ultimas.length > 0) {                                   // si hay al menos una lectura
      respuesta.writeHead(200, { "Content-Type": "application/json" });  // envía código 200
      respuesta.end(JSON.stringify(ultimas[0]));                 // devuelve la última lectura como JSON
    } else {                                                     // si no hay ninguna lectura todavía
      respuesta.writeHead(200, { "Content-Type": "application/json" });  // igual responde con 200
      respuesta.end(JSON.stringify({ mensaje: "Aun no hay datos" }));   // mensaje indicando que no hay datos
    }

  // ============================================================
  //  ENDPOINT: GET /history
  //  Devuelve las últimas 50 lecturas guardadas en el archivo.
  // ============================================================

  } else if (url.startsWith("/history") && metodo === "GET") {
    let limite = 50;                                              // valor por defecto

    if (url.includes("?")) {                                      // si la URL tiene parámetros
      const partes = url.split("?");                              // separa la ruta de los parámetros
      const parametros = partes[1].split("&");                    // separa cada parámetro

      for (let i = 0; i < parametros.length; i++) {
        const par = parametros[i].split("=");                     // separa nombre y valor
        if (par[0] === "limit") {                                 // si es el parámetro limit
          limite = parseInt(par[1], 10);                          // convierte a número
          if (isNaN(limite) || limite < 1) limite = 50;           // si es inválido, usa 50
          if (limite > 200) limite = 200;                         // máximo 200 para evitar abusos
          break;
        }
      }
    }

    const historial = leerUltimasLecturas(limite);                // lee las últimas N líneas

    respuesta.writeHead(200, { "Content-Type": "application/json" });  // envía código 200
    respuesta.end(JSON.stringify(historial));                     // devuelve el array de lecturas como JSON

  // ============================================================
  //  CUALQUIER OTRA RUTA — Servir archivos estáticos del frontend
  //  Si la URL no es /data, /latest ni /history, se intenta
  //  servir un archivo estático desde la carpeta frontend.
  // ============================================================

  } else {
    let rutaArchivo = "";                                         // variable para la ruta del archivo a servir

    if (url === "/") {                                            // si la URL es la raíz
      rutaArchivo = path.join(RUTA_FRONTEND, "index.html");       // sirve el archivo index.html
    } else {
      rutaArchivo = path.join(RUTA_FRONTEND, url);                // sirve el archivo que pide la URL
    }

    fs.readFile(rutaArchivo, function(error, datos) {             // intenta leer el archivo del disco
      if (error) {                                                // si el archivo no existe o hay un error
        respuesta.writeHead(404, { "Content-Type": "text/html" });  // envía código 404 (no encontrado)
        respuesta.end("<h1>404 - Archivo no encontrado</h1>");     // mensaje de error simple
      } else {                                                    // si el archivo existe
        const tipoMIME = obtenerMimeType(rutaArchivo);             // obtiene el tipo MIME según la extensión
        respuesta.writeHead(200, { "Content-Type": tipoMIME });   // envía código 200 con el tipo correcto
        respuesta.end(datos);                                      // envía el contenido del archivo al navegador
      }
    });
  }
});

// ============================================================
//  INICIO DEL SERVIDOR
//  El servidor comienza a escuchar en el puerto 3000 y muestra
//  un mensaje en la consola indicando que está funcionando.
// ============================================================

servidor.listen(PUERTO, function() {
  console.log("===================================");
  console.log(" Servidor del modulo hexagonal");
  console.log(" Corriendo en: http://localhost:" + PUERTO);
  console.log(" Abre esta URL en tu navegador");
  console.log("===================================");
});
