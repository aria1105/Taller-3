let chartInstance = null;
let tipoGraficoActual = "temperatura";
let intervaloActualizacion = null;
let moduloActivo = "terraza";

const MODULOS = [
  { id: "terraza",    nombre: "Casa Terraza",    icono: "🏡", color: "#E8F5E9" },
  { id: "dormitorio", nombre: "Casa Dormitorio", icono: "🛏️", color: "#F5F0E8" },
  { id: "oficina",    nombre: "Oficina",         icono: "💼", color: "#F0ECE4" },
  { id: "cocina",     nombre: "Cocina",          icono: "🍳", color: "#EDE8DF" },
];

function cambiarPantalla(nombrePantalla) {
  const pantallas = document.querySelectorAll(".pantalla");
  for (let i = 0; i < pantallas.length; i++) {
    pantallas[i].classList.remove("activa");
  }

  const pantallaMostrar = document.getElementById("pantalla-" + nombrePantalla);
  if (pantallaMostrar) {
    pantallaMostrar.classList.add("activa");
  }

  const tabs = document.querySelectorAll(".tab");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove("activo");
  }

  const tabActivo = document.querySelector('.tab[data-pantalla="' + nombrePantalla + '"]');
  if (tabActivo) {
    tabActivo.classList.add("activo");
  }

  if (nombrePantalla === "historial") {
    cargarHistorial();
  }
}

function cambiarGrafico(tipo) {
  tipoGraficoActual = tipo;

  const botones = document.querySelectorAll(".btn-control");
  for (let i = 0; i < botones.length; i++) {
    botones[i].classList.remove("activo");
  }

  const botonActivo = document.querySelector('.btn-control[data-grafico="' + tipo + '"]');
  if (botonActivo) {
    botonActivo.classList.add("activo");
  }

  cargarHistorial();
}

function seleccionarModulo(id) {
  moduloActivo = id;
  actualizarModulosConDatos(null);
}

function cargarDatosRecientes() {
  fetch("/latest")
    .then(function(respuesta) {
      return respuesta.json();
    })
    .then(function(datos) {
      if (datos.mensaje === "Aun no hay datos") {
        return;
      }

      const datosModulo = generarDatosModulo(datos);

      const elementoTemp = document.getElementById("valor-temperatura");
      if (elementoTemp) {
        elementoTemp.textContent = datosModulo.temperature ? datosModulo.temperature.toFixed(1) : "--.-";
      }

      const elementoHum = document.getElementById("valor-humedad");
      if (elementoHum) {
        elementoHum.textContent = datosModulo.humidity ? datosModulo.humidity.toFixed(1) : "--.-";
      }

      if (datosModulo.air_quality_index !== undefined) {
        actualizarGauge(datosModulo.air_quality_index);
      }

      if (datosModulo.ph_estimate !== undefined && datosModulo.ph_color_label) {
        actualizarPH(datosModulo.ph_estimate, datosModulo.ph_color_label);
      }

      actualizarLED(datosModulo.ph_color_label || "saludable");
      actualizarMensajeEstado(datosModulo);
      actualizarEstadisticas(datosModulo);
      actualizarModulosConDatos(datos);

      const elementoTimestamp = document.getElementById("timestamp");
      if (elementoTimestamp) {
        const ahora = new Date();
        const hora = ahora.getHours().toString().padStart(2, "0");
        const minutos = ahora.getMinutes().toString().padStart(2, "0");
        const segundos = ahora.getSeconds().toString().padStart(2, "0");
        elementoTimestamp.textContent = "Última actualización: " + hora + ":" + minutos + ":" + segundos;
      }
    })
    .catch(function(error) {
      console.log("Error al cargar datos:", error);
    });
}

function generarDatosModulo(datos) {
  const offsets = {
    terraza:    { temp: 0,   hum: 0,   aqi: 0,   ph: 0 },
    dormitorio: { temp: -2,  hum: 8,   aqi: 8,   ph: 0.1 },
    oficina:    { temp: 1.5, hum: -10, aqi: -3,  ph: -0.2 },
    cocina:     { temp: 3,   hum: 12,  aqi: -15, ph: -0.4 },
  };

  const off = offsets[moduloActivo] || offsets.terraza;

  return {
    temperature: (datos.temperature || 25) + off.temp,
    humidity: (datos.humidity || 50) + off.hum,
    air_quality_index: Math.max(0, Math.min(100, (datos.air_quality_index || 70) + off.aqi)),
    ph_estimate: Math.max(0, Math.min(14, (datos.ph_estimate || 7) + off.ph)),
    ph_color_label: datos.ph_color_label || "saludable",
  };
}

function actualizarEstadisticas(datos) {
  const aqi = datos.air_quality_index || 50;
  const ph = datos.ph_estimate || 7;
  const temp = datos.temperature || 25;
  const hum = datos.humidity || 50;

  const co2 = ((aqi / 100) * 12 + (ph > 6.5 && ph < 7.5 ? 3 : 0)).toFixed(1);
  const o2 = (co2 * 0.73).toFixed(1);
  const fotosintesis = Math.min(100, Math.round((aqi * 0.6 + (100 - Math.abs(temp - 21) * 3) * 0.2 + (hum > 40 && hum < 80 ? 20 : 5))));
  const eficiencia = Math.min(100, Math.round((fotosintesis * 0.7 + (ph > 6.5 && ph < 7.5 ? 30 : 10))));

  document.getElementById("valor-co2").textContent = co2;
  document.getElementById("bar-co2").style.width = (co2 / 15 * 100) + "%";
  document.getElementById("valor-o2").textContent = o2;
  document.getElementById("bar-o2").style.width = (o2 / 11 * 100) + "%";
  document.getElementById("valor-fotosintesis").textContent = fotosintesis;
  document.getElementById("bar-fotosintesis").style.width = fotosintesis + "%";
  document.getElementById("valor-eficiencia").textContent = eficiencia;
  document.getElementById("bar-eficiencia").style.width = eficiencia + "%";
}

function actualizarGauge(valor) {
  const gauge = document.getElementById("gauge-avance");
  const textoGauge = document.getElementById("gauge-valor");

  if (!gauge || !textoGauge) return;

  const circunferencia = 314;
  const offset = circunferencia - (valor / 100) * circunferencia;

  gauge.style.strokeDashoffset = offset;

  if (valor >= 60) {
    gauge.style.stroke = "#ACE1A8";
  } else if (valor >= 30) {
    gauge.style.stroke = "#FDD835";
  } else {
    gauge.style.stroke = "#EF5350";
  }

  textoGauge.textContent = Math.round(valor);
}

function actualizarPH(valorPH, etiqueta) {
  const bola = document.getElementById("ph-bola");
  const textoPH = document.getElementById("ph-valor");
  const etiquetaPH = document.getElementById("ph-etiqueta");

  if (!bola || !textoPH || !etiquetaPH) return;

  bola.classList.remove("saludable", "advertencia", "critico");

  if (etiqueta === "saludable") {
    bola.classList.add("saludable");
    etiquetaPH.textContent = "pH saludable (6.5 - 7.5)";
  } else if (etiqueta === "advertencia") {
    bola.classList.add("advertencia");
    etiquetaPH.textContent = "pH en advertencia (5.5 - 6.5)";
  } else if (etiqueta === "critico") {
    bola.classList.add("critico");
    etiquetaPH.textContent = "pH crítico (< 5.5 o > 8)";
  }

  textoPH.textContent = valorPH.toFixed(1);
}

function actualizarLED(estado) {
  const led = document.getElementById("led-indicador");
  if (!led) return;

  led.classList.remove("led-verde", "led-amarillo", "led-rojo", "encendido");

  if (estado === "saludable") {
    led.classList.add("led-verde", "encendido");
  } else if (estado === "advertencia") {
    led.classList.add("led-amarillo", "encendido");
  } else if (estado === "critico") {
    led.classList.add("led-rojo", "encendido");
  }
}

function actualizarMensajeEstado(datos) {
  const elemento = document.getElementById("mensaje-estado");
  if (!elemento) return;

  let mensaje = "";
  const aire = datos.air_quality_index || 100;
  const etiquetaPH = datos.ph_color_label || "saludable";
  const temperatura = datos.temperature || 25;

  if (etiquetaPH === "critico") {
    mensaje = "⚠️ Alerta: el pH de la planta es crítico. Revisa el agua.";
  } else if (aire < 30) {
    mensaje = "⚠️ El CO₂ está muy alto. Abre una ventana para ventilar.";
  } else if (etiquetaPH === "advertencia" || aire < 60) {
    mensaje = "⚡ Algunos valores están fuera de rango. Monitorea el módulo.";
  } else if (temperatura > 35) {
    mensaje = "🌡️ Hace mucho calor. Aleja el módulo de fuentes de calor.";
  } else {
    mensaje = "✅ Todo bien — tu planta está saludable y el aire es limpio.";
  }

  elemento.textContent = mensaje;
}

function renderizarModulos(datos) {
  const contenedor = document.getElementById("modulos-lista");
  if (!contenedor) return;

  let html = "";

  for (let i = 0; i < MODULOS.length; i++) {
    const m = MODULOS[i];
    const datosModulo = datos ? generarDatosModulo(datos) : null;
    const temp = datosModulo ? datosModulo.temperature.toFixed(1) : "--.-";
    const hum = datosModulo ? datosModulo.humidity.toFixed(1) : "--.-";
    const aire = datosModulo ? datosModulo.air_quality_index : "--";

    html += '<div class="module-card" onclick="seleccionarModulo(\'' + m.id + '\');cambiarPantalla(\'dashboard\')">';
    html += '  <div class="module-card-avatar" style="background:' + m.color + '">' + m.icono + '</div>';
    html += '  <div class="module-card-info">';
    html += '    <div class="module-card-nombre">' + m.nombre + '</div>';
    html += '    <div class="module-card-estado online">● Online</div>';
    html += '    <div class="module-card-datos">' + temp + '°C · ' + hum + '% · AQI ' + aire + '</div>';
    html += '  </div>';
    html += '  <div class="module-card-badge">ANKUF</div>';
    html += '</div>';
  }

  contenedor.innerHTML = html;
}

function actualizarModulosConDatos(datos) {
  renderizarModulos(datos);
}

function cargarHistorial() {
  fetch("/history")
    .then(function(respuesta) {
      return respuesta.json();
    })
    .then(function(datosHistorial) {
      if (!datosHistorial || datosHistorial.length === 0) {
        return;
      }

      const etiquetas = [];
      const valores = [];

      for (let i = 0; i < datosHistorial.length; i++) {
        const lectura = datosHistorial[i];

        const fecha = new Date(lectura.timestamp * 1000);
        const hora = fecha.getHours().toString().padStart(2, "0");
        const minutos = fecha.getMinutes().toString().padStart(2, "0");

        let labelHora = hora + ":" + minutos;
        if (i % 5 !== 0) {
          labelHora = "";
        }
        etiquetas.push(labelHora);

        if (tipoGraficoActual === "temperatura") {
          valores.push(lectura.temperature);
        } else if (tipoGraficoActual === "aire") {
          valores.push(lectura.air_quality_index);
        } else if (tipoGraficoActual === "ph") {
          valores.push(lectura.ph_estimate);
        }
      }

      dibujarGrafico(etiquetas, valores);
      actualizarHistorialStats(datosHistorial);
    })
    .catch(function(error) {
      console.log("Error al cargar historial:", error);
    });
}

function dibujarGrafico(etiquetas, valores) {
  const canvas = document.getElementById("grafico-historial");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  let colorLinea = "#ACE1A8";
  let nombreEjeY = "";

  if (tipoGraficoActual === "temperatura") {
    colorLinea = "#FF8A65";
    nombreEjeY = "Temperatura (°C)";
  } else if (tipoGraficoActual === "aire") {
    colorLinea = "#81C784";
    nombreEjeY = "Índice de calidad (0-100)";
  } else if (tipoGraficoActual === "ph") {
    colorLinea = "#FDD835";
    nombreEjeY = "pH estimado";
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: etiquetas,
      datasets: [{
        label: nombreEjeY,
        data: valores,
        borderColor: colorLinea,
        backgroundColor: colorLinea + "22",
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: colorLinea,
        pointBorderColor: "#fff",
        pointBorderWidth: 1,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#aaa", maxTicksLimit: 8, font: { size: 10 } },
          grid: { color: "#f0f0f0" }
        },
        y: {
          ticks: { color: "#aaa", font: { size: 10 } },
          grid: { color: "#f0f0f0" }
        }
      }
    }
  });
}

function actualizarHistorialStats(datos) {
  let sumT = 0, sumH = 0, sumP = 0, sumA = 0, n = 0;
  for (let i = 0; i < datos.length; i++) {
    const d = datos[i];
    if (d.temperature !== undefined) { sumT += d.temperature; n++; }
    if (d.humidity !== undefined) sumH += d.humidity;
    if (d.ph_estimate !== undefined) sumP += d.ph_estimate;
    if (d.air_quality_index !== undefined) sumA += d.air_quality_index;
  }
  if (n === 0) return;
  document.getElementById("stat-temp").textContent = (sumT / n).toFixed(1) + "°C";
  document.getElementById("stat-hum").textContent = (sumH / n).toFixed(0) + "%";
  document.getElementById("stat-ph").textContent = (sumP / n).toFixed(1);
  document.getElementById("stat-aqi").textContent = (sumA / n).toFixed(0);
}

function descargarHistorial() {
  fetch("/history")
    .then(function(respuesta) {
      return respuesta.json();
    })
    .then(function(datos) {
      if (!datos || datos.length === 0) {
        alert("No hay datos para descargar.");
        return;
      }

      let csv = "timestamp,fecha,temperatura,humedad,calidad_aire,pH_estimado,ph_etiqueta\n";

      for (let i = 0; i < datos.length; i++) {
        const d = datos[i];
        const fecha = new Date(d.timestamp * 1000);
        const fechaStr = fecha.toLocaleString("es-ES");
        csv += d.timestamp + "," + fechaStr + ",";
        csv += (d.temperature || "") + "," + (d.humidity || "") + ",";
        csv += (d.air_quality_index || "") + "," + (d.ph_estimate || "") + ",";
        csv += (d.ph_color_label || "") + "\n";
      }

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "historial_ankuf_" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
    })
    .catch(function(error) {
      console.log("Error al descargar historial:", error);
      alert("Error al descargar el historial.");
    });
}

document.addEventListener("DOMContentLoaded", function() {
  renderizarModulos(null);
  cargarDatosRecientes();
  intervaloActualizacion = setInterval(cargarDatosRecientes, 5000);

  const pantallaHistorial = document.getElementById("pantalla-historial");
  if (pantallaHistorial && pantallaHistorial.classList.contains("activa")) {
    cargarHistorial();
  }
});
