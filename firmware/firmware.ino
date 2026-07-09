/*
 * firmware.ino - Codigo para el modulo hexagonal purificador de aire
 * con planta marina, monitoreo IoT y sensores DHT11 + TCS230
 * 
 * Lee temperatura/humedad (DHT11) y color de pH (TCS230),
 * controla un LED RGB indicador y envia datos por HTTP a un servidor.
 */

// ============================================================
//  INCLUSION DE LIBRERIAS
// ============================================================

#include <WiFi.h>          // libreria para conectar el ESP32 a una red WiFi
#include <HTTPClient.h>    // libreria para hacer peticiones HTTP desde el ESP32
#include <DHT.h>           // libreria para leer el sensor de temperatura y humedad DHT11

// ============================================================
//  CONFIGURACION DE RED
// ============================================================

const char* ssid = "Telefono de Ari <3";       // nombre de la red WiFi (hotspot del celular)
const char* password = "depositamexfa";         // contrasena de la red WiFi

// Direccion IP de la PC donde corre server.js (cambiar si la IP cambia)
const char* servidorURL = "http://172.20.10.5:3000/data";  // URL del backend

// ============================================================
//  PINES DE CONEXION DE LOS SENSORES AL ESP32
// ============================================================

// DHT11 — temperatura y humedad
const int pinDHT11 = 5;             // pin GPIO 5 conectado al DATA del DHT11

// TCS230 — sensor de color para medir pH
const int pinTCS_S0 = 25;           // GPIO 25 a S0 del TCS230
const int pinTCS_S1 = 26;           // GPIO 26 a S1 del TCS230
const int pinTCS_S2 = 27;           // GPIO 27 a S2 del TCS230
const int pinTCS_S3 = 14;           // GPIO 14 a S3 del TCS230
const int pinTCS_OUT = 12;          // GPIO 12 a OUT del TCS230

// NOTA: no se usa LED RGB externo, solo los LEDs blancos del propio modulo TCS230

// ============================================================
//  INTERVALOS DE TIEMPO
// ============================================================

const unsigned long intervaloDHT = 10000;       // leer DHT11 cada 10 segundos
const unsigned long intervaloTCS = 30000;       // leer TCS230 cada 30 segundos
const unsigned long intervaloEnvio = 15000;     // enviar datos al servidor cada 15 segundos

// ============================================================
//  VARIABLES GLOBALES
// ============================================================

DHT dht(pinDHT11, DHT11);           // crea el objeto DHT en el pin asignado

float temperatura = 0.0;            // temperatura en grados Celsius
float humedad = 0.0;                // humedad relativa en porcentaje
int indiceCalidadAire = 100;        // indice de calidad de aire (100 = bueno, sin MQ2 se asume bueno)
float pHestimado = 7.0;             // pH estimado de la planta
String colorpH = "saludable";       // etiqueta de color: saludable, advertencia, critico

unsigned long tiempoAnteriorDHT = 0;   // ultima lectura del DHT11
unsigned long tiempoAnteriorTCS = 0;   // ultima lectura del TCS230
unsigned long tiempoAnteriorEnvio = 0; // ultimo envio al servidor

int fallosDHT = 0;                  // contador de fallos consecutivos del DHT11
bool primerEnvio = true;            // bandera para forzar el primer envio

// ============================================================
//  PROTOTIPOS DE FUNCIONES
// ============================================================

void conectarWiFi();
void verificarWiFi();
void leerDHT11();
void leerTCS230();
void enviarDatos();

// ============================================================
//  SETUP — se ejecuta una vez al iniciar
// ============================================================

void setup() {
  Serial.begin(115200);             // inicia la comunicacion serial

  pinMode(pinDHT11, INPUT_PULLUP);  // activa resistencia pull-up interna en el pin del DHT11
  delay(3000);                      // espera 3 segundos para que el DHT11 se estabilice
  dht.begin();                      // inicializa el DHT11

  pinMode(pinTCS_S0, OUTPUT);       // configura los pines de control del TCS230
  pinMode(pinTCS_S1, OUTPUT);
  pinMode(pinTCS_S2, OUTPUT);
  pinMode(pinTCS_S3, OUTPUT);
  pinMode(pinTCS_OUT, INPUT);       // pin OUT como entrada

  digitalWrite(pinTCS_S0, HIGH);    // S0=HIGH, S1=LOW = frecuencia al 20%
  digitalWrite(pinTCS_S1, LOW);

  Serial.println("Iniciando modulo hexagonal purificador...");

  conectarWiFi();                   // conecta al WiFi
}

// ============================================================
//  LOOP — se ejecuta en ciclo infinito
// ============================================================

void loop() {
  verificarWiFi();                  // verifica y reconecta WiFi si es necesario

  unsigned long ahora = millis();   // tiempo actual en milisegundos

  // Leer DHT11 cada 10 segundos
  if (ahora - tiempoAnteriorDHT >= intervaloDHT) {
    tiempoAnteriorDHT = ahora;
    leerDHT11();
  }

  // Leer TCS230 cada 30 segundos
  if (ahora - tiempoAnteriorTCS >= intervaloTCS) {
    tiempoAnteriorTCS = ahora;
    leerTCS230();
  }

  // Enviar datos cada 15 segundos
  if (ahora - tiempoAnteriorEnvio >= intervaloEnvio || primerEnvio) {
    tiempoAnteriorEnvio = ahora;
    primerEnvio = false;
    enviarDatos();
  }
}

// ============================================================
//  CONECTAR WIFI
// ============================================================

void conectarWiFi() {
  Serial.print("Conectando a: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Conectado! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Error: no se pudo conectar al WiFi");
  }
}

// ============================================================
//  VERIFICAR Y RECONECTAR WIFI
// ============================================================

void verificarWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado. Reconectando...");
    WiFi.disconnect();
    WiFi.begin(ssid, password);

    for (int i = 0; i < 10; i++) {
      if (WiFi.status() == WL_CONNECTED) break;
      delay(500);
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("Reconectado al WiFi!");
    }
  }
}

// ============================================================
//  LEER DHT11 — temperatura y humedad
//  Reintenta hasta 5 veces si falla la primera lectura
// ============================================================

void leerDHT11() {
  float t = 0.0;
  float h = 0.0;
  bool lecturaExitosa = false;

  for (int i = 0; i < 5; i++) {
    t = dht.readTemperature();
    h = dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      lecturaExitosa = true;
      break;
    }
    delay(200);
  }

  if (lecturaExitosa) {
    fallosDHT = 0;
    temperatura = t;
    humedad = h;
    Serial.print("DHT11 - Temp: ");
    Serial.print(temperatura);
    Serial.print(" C, Hum: ");
    Serial.print(humedad);
    Serial.println(" %");
  } else {
    fallosDHT++;
    Serial.print("Error DHT11 (fallo ");
    Serial.print(fallosDHT);
    Serial.println(")");
    // Solo marca error critico despues de 5 fallos seguidos
    if (fallosDHT < 5) {
      // Mantiene el ultimo valor valido, no sobreescribe con 0
      return;
    }
    temperatura = 0.0;
    humedad = 0.0;
  }
}

// ============================================================
//  LEER TCS230 — color de la tira indicadora de pH
//  Determina si es verde (saludable), amarillo (advertencia)
//  o marron/oscuro (critico)
// ============================================================

void leerTCS230() {
  // Lee una sola vez cada color (mas simple y rapido)
  // Si pulseIn devuelve 0 es porque no detecta senal (timeout)

  // Leer rojo: S2=LOW, S3=LOW
  digitalWrite(pinTCS_S2, LOW);
  digitalWrite(pinTCS_S3, LOW);
  delay(50);
  int pulsoRojo = pulseIn(pinTCS_OUT, LOW, 100000);

  // Leer verde: S2=HIGH, S3=HIGH
  digitalWrite(pinTCS_S2, HIGH);
  digitalWrite(pinTCS_S3, HIGH);
  delay(50);
  int pulsoVerde = pulseIn(pinTCS_OUT, LOW, 100000);

  // Leer azul: S2=LOW, S3=HIGH
  digitalWrite(pinTCS_S2, LOW);
  digitalWrite(pinTCS_S3, HIGH);
  delay(50);
  int pulsoAzul = pulseIn(pinTCS_OUT, LOW, 100000);

  Serial.print("RGB CRUDO - R:");
  Serial.print(pulsoRojo);
  Serial.print(" G:");
  Serial.print(pulsoVerde);
  Serial.print(" B:");
  Serial.println(pulsoAzul);

  // si pulseIn devuelve 0 en los tres, el sensor no esta respondiendo
  if (pulsoRojo == 0 && pulsoVerde == 0 && pulsoAzul == 0) {
    pHestimado = 5.0;
    colorpH = "critico";
    Serial.println("Error: TCS230 no responde -> pH critico");
    return;
  }

  // Calcular el porcentaje que representa cada color sobre el total
  // El color que MAS se refleja tiene el pulso MAS CORTO (menor valor)
  // pero necesitamos que domine claramente sobre los otros dos
  int total = pulsoRojo + pulsoVerde + pulsoAzul;

  int porcentajeRojo = (pulsoRojo * 100) / total;
  int porcentajeVerde = (pulsoVerde * 100) / total;
  int porcentajeAzul = (pulsoAzul * 100) / total;

  Serial.print("% - R:");
  Serial.print(porcentajeRojo);
  Serial.print(" G:");
  Serial.print(porcentajeVerde);
  Serial.print(" B:");
  Serial.println(porcentajeAzul);

  // Encontrar el color con menor porcentaje (mas luz reflejada = menor pulso)
  // Si el menor porcentaje es <= 27% del total, hay dominio claro
  String colorDominante = "rojo";
  int menorPorcentaje = porcentajeRojo;

  if (porcentajeVerde < menorPorcentaje) {
    menorPorcentaje = porcentajeVerde;
    colorDominante = "verde";
  }
  if (porcentajeAzul < menorPorcentaje) {
    menorPorcentaje = porcentajeAzul;
    colorDominante = "azul";
  }

  Serial.print("Menor %: ");
  Serial.print(menorPorcentaje);
  Serial.print(" (");
  Serial.print(colorDominante);
  Serial.println(")");

  // Si el color dominante es menos del 28% del total, significa que
  // refleja mucha mas luz que los otros dos -> hay tira de pH presente
  if (menorPorcentaje > 28) {
    pHestimado = 7.0;
    colorpH = "saludable";
    Serial.println("Sin dominio claro -> sin tira de pH -> saludable");
    return;
  }

  if (colorDominante == "verde") {
    pHestimado = 7.0;
    colorpH = "saludable";
    Serial.println("Resultado: VERDE -> pH saludable (6.5-7.5)");
  } else if (colorDominante == "rojo") {
    pHestimado = 6.0;
    colorpH = "advertencia";
    Serial.println("Resultado: ROJO/AMARILLO -> pH advertencia (5.5-6.5)");
  } else {
    pHestimado = 5.0;
    colorpH = "critico";
    Serial.println("Resultado: AZUL -> pH critico (<5.5 o >8)");
  }

  Serial.print("pH estimado: ");
  Serial.println(pHestimado);
}

// ============================================================
//  ENVIAR DATOS AL SERVIDOR VIA HTTP POST
// ============================================================

void enviarDatos() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sin WiFi, no se envian datos");
    return;
  }

  HTTPClient http;
  http.begin(servidorURL);
  http.addHeader("Content-Type", "application/json");

  // Si el DHT11 no fallo, los valores de temperatura/humedad son los leidos
  // Si esta fallando, se envian los ultimos valores validos (no 0 si tenia datos antes)
  long timestamp = millis() / 1000;

  String json = "{";
  json += "\"temperature\":" + String(temperatura, 1) + ",";
  json += "\"humidity\":" + String(humedad, 1) + ",";
  json += "\"air_quality_index\":" + String(indiceCalidadAire) + ",";
  json += "\"ph_estimate\":" + String(pHestimado, 1) + ",";
  json += "\"ph_color_label\":\"" + colorpH + "\",";
  json += "\"timestamp\":" + String(timestamp);
  json += "}";

  Serial.print("Enviando: ");
  Serial.println(json);

  int codigoHTTP = http.POST(json);

  if (codigoHTTP > 0) {
    Serial.print("Servidor responde: ");
    Serial.println(codigoHTTP);
  } else {
    Serial.print("Error de envio: ");
    Serial.println(codigoHTTP);
  }

  http.end();
}


