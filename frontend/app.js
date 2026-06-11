/*
 * app.js - Lógica de la aplicación web del módulo hexagonal purificador
 * 
 * Este archivo maneja la comunicación con el servidor backend,
 * actualiza el dashboard en tiempo real, dibuja el gráfico de historial,
 * y controla la navegación entre pantallas.
 */

// ============================================================
//  VARIABLES GLOBALES
// ============================================================

let chartInstance = null;               // referencia al gráfico de Chart.js para poder destruirlo y recrearlo
let tipoGraficoActual = "temperatura";  // tipo de gráfico que se está mostrando: temperatura, aire o ph
let intervaloActualizacion = null;      // referencia al intervalo que actualiza el dashboard cada 5 segundos

// ============================================================
//  FUNCIÓN: cambiarPantalla
//  Muestra la pantalla seleccionada y oculta las demás.
//  También activa/desactiva el botón de navegación correspondiente.
//  Parámetro: nombrePantalla = "dashboard", "historial" o "acerca"
// ============================================================

function cambiarPantalla(nombrePantalla) {
  // Obtiene todos los elementos con clase "pantalla" (las tres secciones)
  const pantallas = document.querySelectorAll(".pantalla");
  for (let i = 0; i < pantallas.length; i++) {
    pantallas[i].classList.remove("activa");  // oculta todas las pantallas
  }

  // Obtiene la pantalla específica que se quiere mostrar usando su ID
  const pantallaMostrar = document.getElementById("pantalla-" + nombrePantalla);
  if (pantallaMostrar) {
    pantallaMostrar.classList.add("activa");   // muestra la pantalla seleccionada
  }

  // Obtiene todos los botones de navegación (tabs)
  const tabs = document.querySelectorAll(".tab");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove("activo");        // desactiva todos los botones
  }

  // Activa el botón que corresponde a la pantalla actual
  const tabActivo = document.querySelector('.tab[data-pantalla="' + nombrePantalla + '"]');
  if (tabActivo) {
    tabActivo.classList.add("activo");          // marca el botón como activo
  }

  // Si se cambió a la pantalla de historial, actualiza el gráfico
  if (nombrePantalla === "historial") {
    cargarHistorial();                          // carga los datos y dibuja el gráfico
  }
}

// ============================================================
//  FUNCIÓN: cambiarGrafico
//  Cambia el tipo de datos que se muestran en el gráfico de historial.
//  Parámetro: tipo = "temperatura", "aire" o "ph"
// ============================================================

function cambiarGrafico(tipo) {
  tipoGraficoActual = tipo;                     // guarda el tipo de gráfico seleccionado

  // Actualiza el botón activo en los controles del gráfico
  const botones = document.querySelectorAll(".btn-control");
  for (let i = 0; i < botones.length; i++) {
    botones[i].classList.remove("activo");      // desactiva todos los botones
  }

  const botonActivo = document.querySelector('.btn-control[data-grafico="' + tipo + '"]');
  if (botonActivo) {
    botonActivo.classList.add("activo");        // activa el botón seleccionado
  }

  cargarHistorial();                            // recarga el gráfico con el nuevo tipo de datos
}

// ============================================================
//  FUNCIÓN: cargarDatosRecientes
//  Obtiene la lectura más reciente del servidor (GET /latest)
//  y actualiza todos los elementos del dashboard con esos valores.
// ============================================================

function cargarDatosRecientes() {
  fetch("/latest")                              // hace una petición GET al endpoint /latest
    .then(function(respuesta) {
      return respuesta.json();                  // convierte la respuesta a objeto JavaScript
    })
    .then(function(datos) {
      // Si el servidor devuelve un mensaje de "no hay datos", no actualiza nada
      if (datos.mensaje === "Aun no hay datos") {
        return;
      }

      // Actualiza el valor de temperatura en la tarjeta
      const elementoTemp = document.getElementById("valor-temperatura");
      if (elementoTemp) {
        elementoTemp.textContent = datos.temperature.toFixed(1);  // muestra la temperatura con 1 decimal
      }

      // Actualiza el valor de humedad en la tarjeta
      const elementoHum = document.getElementById("valor-humedad");
      if (elementoHum) {
        elementoHum.textContent = datos.humidity.toFixed(1);       // muestra la humedad con 1 decimal
      }

      // Actualiza el medidor circular (gauge) de calidad de aire
      const indiceAire = datos.air_quality_index;                 // índice de calidad de aire (0-100)
      actualizarGauge(indiceAire);                                // llama a la función que anima el gauge

      // Actualiza el indicador de pH
      const pH = datos.ph_estimate;              // valor de pH estimado
      const etiquetaPH = datos.ph_color_label;   // etiqueta: saludable, advertencia o critico
      actualizarPH(pH, etiquetaPH);              // llama a la función que actualiza el círculo de pH

      // Actualiza el LED indicador de estado según el color del pH
      actualizarLED(etiquetaPH);                 // cambia el color del LED virtual

      // Actualiza el mensaje de estado según los valores de los sensores
      actualizarMensajeEstado(datos);            // genera un mensaje amigable en español

      // Actualiza el timestamp de la última actualización
      const elementoTimestamp = document.getElementById("timestamp");
      if (elementoTimestamp) {
        const ahora = new Date();                // obtiene la fecha y hora actual
        const hora = ahora.getHours().toString().padStart(2, "0");    // hora con 2 dígitos
        const minutos = ahora.getMinutes().toString().padStart(2, "0"); // minutos con 2 dígitos
        const segundos = ahora.getSeconds().toString().padStart(2, "0"); // segundos con 2 dígitos
        elementoTimestamp.textContent = "Ultima actualizacion: " + hora + ":" + minutos + ":" + segundos;
      }
    })
    .catch(function(error) {
      // Si hay un error de red o el servidor no responde, muestra un mensaje
      console.log("Error al cargar datos:", error);
    });
}

// ============================================================
//  FUNCIÓN: actualizarGauge
//  Anima el medidor circular de calidad de aire.
//  El círculo se llena proporcionalmente al valor (0-100).
//  Parámetro: valor = número de 0 a 100
// ============================================================

function actualizarGauge(valor) {
  const gauge = document.getElementById("gauge-avance");  // obtiene el círculo de avance del SVG
  const textoGauge = document.getElementById("gauge-valor");  // obtiene el texto en el centro

  if (!gauge || !textoGauge) return;          // si no encuentra los elementos, sale de la función

  const circunferencia = 314;                 // longitud total de la circunferencia (2 * pi * radio 50)
  const offset = circunferencia - (valor / 100) * circunferencia;  // calcula cuánto se debe ocultar

  gauge.style.strokeDashoffset = offset;      // aplica el desplazamiento para mostrar la proporción correcta

  // Cambia el color del gauge según el valor: verde >60, amarillo 30-60, rojo <30
  if (valor >= 60) {
    gauge.style.stroke = "#52b788";            // verde agua para aire bueno
  } else if (valor >= 30) {
    gauge.style.stroke = "#ffd166";            // amarillo para aire regular
  } else {
    gauge.style.stroke = "#e63946";            // rojo para aire malo
  }

  textoGauge.textContent = valor;             // muestra el valor numérico en el centro del gauge
}

// ============================================================
//  FUNCIÓN: actualizarPH
//  Actualiza el círculo de color y el valor numérico del pH.
//  Parámetros:
//    valorPH = número decimal con el pH estimado
//    etiqueta = "saludable", "advertencia" o "critico"
// ============================================================

function actualizarPH(valorPH, etiqueta) {
  const bola = document.getElementById("ph-bola");       // obtiene el círculo de pH
  const textoPH = document.getElementById("ph-valor");   // obtiene el texto del valor de pH
  const etiquetaPH = document.getElementById("ph-etiqueta");  // obtiene la etiqueta de texto

  if (!bola || !textoPH || !etiquetaPH) return;         // si no encuentra los elementos, sale

  // Remueve todas las clases de color del círculo
  bola.classList.remove("saludable", "advertencia", "critico");

  // Agrega la clase que corresponde según la etiqueta
  if (etiqueta === "saludable") {
    bola.classList.add("saludable");                     // pone el círculo en verde
    etiquetaPH.textContent = "pH saludable (6.5 - 7.5)";  // texto informativo
  } else if (etiqueta === "advertencia") {
    bola.classList.add("advertencia");                   // pone el círculo en amarillo
    etiquetaPH.textContent = "pH en advertencia (5.5 - 6.5)";  // texto informativo
  } else if (etiqueta === "critico") {
    bola.classList.add("critico");                       // pone el círculo en rojo
    etiquetaPH.textContent = "pH critico (< 5.5 o > 8)";  // texto informativo
  }

  textoPH.textContent = valorPH.toFixed(1);             // muestra el pH con 1 decimal
}

// ============================================================
//  FUNCIÓN: actualizarLED
//  Cambia el color del LED virtual en el dashboard según el estado.
//  Parámetro: estado = "saludable", "advertencia" o "critico"
// ============================================================

function actualizarLED(estado) {
  const led = document.getElementById("led-indicador");   // obtiene el elemento del LED

  if (!led) return;                                       // si no existe, sale de la función

  // Remueve todas las clases de color del LED
  led.classList.remove("led-verde", "led-amarillo", "led-rojo", "encendido");

  if (estado === "saludable") {
    led.classList.add("led-verde", "encendido");          // LED verde encendido
  } else if (estado === "advertencia") {
    led.classList.add("led-amarillo", "encendido");       // LED amarillo encendido
  } else if (estado === "critico") {
    led.classList.add("led-rojo", "encendido");           // LED rojo encendido
  }
}

// ============================================================
//  FUNCIÓN: actualizarMensajeEstado
//  Genera un mensaje amigable en español según los datos actuales.
//  Parámetro: datos = objeto con temperature, humidity, air_quality_index, ph_color_label
// ============================================================

function actualizarMensajeEstado(datos) {
  const elemento = document.getElementById("mensaje-estado");  // obtiene el elemento del mensaje
  if (!elemento) return;                                      // si no existe, sale

  let mensaje = "";                                           // variable para el mensaje

  const aire = datos.air_quality_index;                       // índice de calidad de aire
  const etiquetaPH = datos.ph_color_label;                    // etiqueta de pH
  const temperatura = datos.temperature;                      // temperatura actual

  // Decide el mensaje según la combinación de factores
  if (etiquetaPH === "critico") {
    mensaje = "Alerta: el pH de la planta es critico. Revisa el agua.";  // mensaje de pH crítico
  } else if (aire < 30) {
    mensaje = "El CO2 esta muy alto. Abre una ventana para ventilar.";  // mensaje de aire malo
  } else if (etiquetaPH === "advertencia" || aire < 60) {
    mensaje = "Algunos valores estan fuera de rango. Monitorea el modulo.";  // mensaje de advertencia
  } else if (temperatura > 35) {
    mensaje = "Hace mucho calor. Aleja el modulo de fuentes de calor.";  // mensaje de temperatura alta
  } else {
    mensaje = "Todo bien! Tu planta esta saludable y el aire es limpio.";  // mensaje de todo bien
  }

  elemento.textContent = mensaje;                             // actualiza el texto en la página
}

// ============================================================
//  FUNCIÓN: cargarHistorial
//  Obtiene las últimas 50 lecturas del servidor (GET /history)
//  y dibuja el gráfico de líneas con Chart.js.
// ============================================================

function cargarHistorial() {
  fetch("/history")                                 // hace una petición GET al endpoint /history
    .then(function(respuesta) {
      return respuesta.json();                      // convierte la respuesta a array de objetos
    })
    .then(function(datosHistorial) {
      if (!datosHistorial || datosHistorial.length === 0) {
        return;                                     // si no hay datos, no dibuja nada
      }

      // Prepara los datos para el gráfico según el tipo seleccionado
      const etiquetas = [];                         // array para las etiquetas del eje X (timestamps)
      const valores = [];                           // array para los valores del eje Y

      for (let i = 0; i < datosHistorial.length; i++) {
        const lectura = datosHistorial[i];          // cada lectura individual

        // Convierte el timestamp a una hora legible (HH:MM)
        const fecha = new Date(lectura.timestamp * 1000);  // multiplica por 1000 porque está en segundos
        const hora = fecha.getHours().toString().padStart(2, "0");
        const minutos = fecha.getMinutes().toString().padStart(2, "0");

        let labelHora = hora + ":" + minutos;       // formato de hora:minutos
        if (i % 5 !== 0) {                          // para no saturar el eje X, muestra solo 1 de cada 5
          labelHora = "";                           // deja la etiqueta vacía
        }
        etiquetas.push(labelHora);                  // agrega la etiqueta al array

        // Según el tipo de gráfico seleccionado, extrae el valor correspondiente
        if (tipoGraficoActual === "temperatura") {
          valores.push(lectura.temperature);        // valor de temperatura
        } else if (tipoGraficoActual === "aire") {
          valores.push(lectura.air_quality_index);  // valor de calidad de aire
        } else if (tipoGraficoActual === "ph") {
          valores.push(lectura.ph_estimate);        // valor de pH
        }
      }

      dibujarGrafico(etiquetas, valores);            // llama a la función que dibuja el gráfico
    })
    .catch(function(error) {
      console.log("Error al cargar historial:", error);  // muestra el error en la consola
    });
}

// ============================================================
//  FUNCIÓN: dibujarGrafico
//  Crea o actualiza un gráfico de líneas usando Chart.js.
//  Parámetros:
//    etiquetas = array de strings para el eje X
//    valores = array de números para el eje Y
// ============================================================

function dibujarGrafico(etiquetas, valores) {
  const canvas = document.getElementById("grafico-historial");  // obtiene el elemento canvas
  if (!canvas) return;                                          // si no existe, sale

  const ctx = canvas.getContext("2d");            // obtiene el contexto de dibujo 2D

  // Si ya existe un gráfico, lo destruye para crear uno nuevo
  if (chartInstance) {
    chartInstance.destroy();                      // elimina el gráfico anterior
    chartInstance = null;                         // limpia la referencia
  }

  // Determina el color de la línea según el tipo de gráfico
  let colorLinea = "#52b788";                     // color por defecto: verde agua
  let nombreEjeY = "";                            // nombre del eje Y

  if (tipoGraficoActual === "temperatura") {
    colorLinea = "#e76f51";                       // color naranja para temperatura
    nombreEjeY = "Temperatura (°C)";              // nombre del eje Y
  } else if (tipoGraficoActual === "aire") {
    colorLinea = "#52b788";                       // color verde para calidad de aire
    nombreEjeY = "Indice de calidad (0-100)";     // nombre del eje Y
  } else if (tipoGraficoActual === "ph") {
    colorLinea = "#ffd166";                       // color amarillo para pH
    nombreEjeY = "pH estimado";                   // nombre del eje Y
  }

  // Crea un nuevo gráfico de líneas con Chart.js
  chartInstance = new Chart(ctx, {
    type: "line",                                 // tipo de gráfico: línea
    data: {
      labels: etiquetas,                          // etiquetas del eje X
      datasets: [{
        label: nombreEjeY,                        // nombre de la serie de datos
        data: valores,                            // valores del eje Y
        borderColor: colorLinea,                  // color de la línea
        backgroundColor: colorLinea + "22",       // color de relleno (con transparencia)
        borderWidth: 2,                           // grosor de la línea
        pointRadius: 2,                           // tamaño de los puntos en la línea
        pointBackgroundColor: colorLinea,         // color de los puntos
        tension: 0.3,                             // suavizado de la línea (0 = recta, 1 = muy curveada)
        fill: true                                // rellena el área debajo de la línea
      }]
    },
    options: {                                    // opciones de configuración del gráfico
      responsive: true,                           // se adapta al tamaño del contenedor
      maintainAspectRatio: false,                 // no mantiene la relación de aspecto
      plugins: {
        legend: {
          display: false                          // oculta la leyenda del gráfico
        }
      },
      scales: {                                   // configuración de los ejes
        x: {
          ticks: {
            color: "#95d5b2",                     // color de las marcas del eje X
            maxTicksLimit: 8,                     // máximo de 8 marcas en el eje X
            font: {
              size: 10                            // tamaño de letra de las marcas
            }
          },
          grid: {
            color: "#1b4332"                      // color de la cuadrícula del eje X
          }
        },
        y: {
          ticks: {
            color: "#95d5b2",                     // color de las marcas del eje Y
            font: {
              size: 10                            // tamaño de letra de las marcas
            }
          },
          grid: {
            color: "#1b4332"                      // color de la cuadrícula del eje Y
          }
        }
      }
    }
  });
}

// ============================================================
//  INICIALIZACIÓN — Se ejecuta cuando la página termina de cargar
// ============================================================

document.addEventListener("DOMContentLoaded", function() {
  // Carga los datos inmediatamente al abrir la página
  cargarDatosRecientes();

  // Configura un intervalo para actualizar el dashboard cada 5 segundos
  intervaloActualizacion = setInterval(cargarDatosRecientes, 5000);

  // Si la pantalla de historial es la que está visible inicialmente, carga el gráfico
  const pantallaHistorial = document.getElementById("pantalla-historial");
  if (pantallaHistorial && pantallaHistorial.classList.contains("activa")) {
    cargarHistorial();                            // carga el historial si la pantalla está activa
  }
});
