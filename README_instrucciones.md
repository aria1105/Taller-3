# Módulo Hexagonal Purificador de Aire con Planta Marina

## Guía de instalación y uso — Paso a paso para principiantes

---

## Índice

1. [¿Qué necesitás comprar?](#1-qué-necesitás-comprar)
2. [Instalación de Arduino IDE](#2-instalación-de-arduino-ide)
3. [Configurar Arduino IDE para ESP32](#3-configurar-arduino-ide-para-esp32)
4. [Instalar las librerías necesarias](#4-instalar-las-librerías-necesarias)
5. [Conexión de los sensores al ESP32](#5-conexión-de-los-sensores-al-esp32)
6. [Configurar y subir el firmware](#6-configurar-y-subir-el-firmware)
7. [Instalar Node.js en tu computadora](#7-instalar-nodejs-en-tu-computadora)
8. [Ejecutar el servidor backend](#8-ejecutar-el-servidor-backend)
9. [Abrir la web app en tu celular](#9-abrir-la-web-app-en-tu-celular)
10. [Generar el código QR](#10-generar-el-código-qr)
11. [Diagrama completo del sistema](#11-diagrama-completo-del-sistema)
12. [Solución de problemas](#12-solución-de-problemas)

---

## 1. ¿Qué necesitás comprar?

| Componente | Cantidad | Precio aproximado |
|---|---|---|
| ESP32 (modelo con USB-C) | 1 | $200–400 ARS |
| Sensor DHT11 | 1 | $100–200 ARS |
| Sensor MQ-2 | 1 | $200–400 ARS |
| Sensor TCS230 | 1 | $300–500 ARS |
| LED RGB (cátodo común) | 1 | $50–100 ARS |
| Resistencias 220Ω | 3 | $10 ARS c/u |
| Cables jumper (MM/ MF) | 20 | $100–200 ARS |
| Protoboard | 1 | $100–200 ARS |
| Cable USB-C a USB-A | 1 | $200–400 ARS |
| Alga marina (Ulva) | 1 | — |
| Tiras indicadoras de pH | 1 caja | $200–400 ARS |

**Total aproximado:** $1500–3000 ARS (depende de dónde compres).

---

## 2. Instalación de Arduino IDE

Arduino IDE es el programa donde vas a escribir y subir el código al ESP32.

1. Andá a la página oficial: https://www.arduino.cc/en/software
2. Descargá la versión para **Windows** (el instalador .exe o la versión portable .zip).
3. Ejecutá el instalador y seguí los pasos (siguiente, siguiente, aceptar).
4. Una vez instalado, abrí Arduino IDE. Te va a aparecer una ventana con un editor de texto.

---

## 3. Configurar Arduino IDE para ESP32

Por defecto, Arduino IDE no sabe programar ESP32. Hay que agregarle el soporte.

1. Abrí **Arduino IDE**.
2. Andá al menú **Archivo > Preferencias** (o **File > Preferences**).
3. En el campo **"URLs adicionales de Gestor de Placas"** (o *Additional Boards Manager URLs*), pegá esta URL:

   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```

4. Hacé clic en **OK** para cerrar la ventana.
5. Andá al menú **Herramientas > Placa > Gestor de Placas** (o *Tools > Board > Boards Manager*).
6. En la ventana que aparece, escribí **ESP32** en el buscador.
7. Aparece un resultado que dice **"esp32 by Espressif Systems"**. Hacé clic en **Instalar**.
8. Esperá a que termine la descarga (puede tardar varios minutos, depende de tu internet).
9. Cuando termine, cerrá el Gestor de Placas.

**Para verificar que quedó bien instalado:**
- Andá a **Herramientas > Placa** y debería aparecer una sección con muchas placas ESP32.
- Seleccioná **"ESP32 Dev Module"** (o **"ESP32 Wrover Module"**).

---

## 4. Instalar las librerías necesarias

Las librerías son códigos ya escritos que nos ayudan a usar los sensores sin tener que programar todo desde cero.

### 4.1. Librería DHT (para el sensor de temperatura y humedad)

1. En Arduino IDE, andá a **Herramientas > Gestor de Librerías** (o *Tools > Manage Libraries*).
2. En el buscador, escribí **DHT sensor library**.
3. Aparece **"DHT sensor library by Adafruit"**. Hacé clic en **Instalar**.
4. Cuando termine, la librería ya está lista para usar.

### 4.2. Librería Adafruit Unified Sensor (dependencia del DHT)

1. Sin cerrar el Gestor de Librerías, buscá **Adafruit Unified Sensor**.
2. Hacé clic en **Instalar**.
3. Cerra el Gestor de Librerías.

### 4.3. ¿Y las otras librerías?

Las librerías **WiFi.h** y **HTTPClient.h** ya vienen incluidas cuando instalaste el soporte para ESP32. **No necesitás instalarlas aparte.**

---

## 5. Conexión de los sensores al ESP32

> **IMPORTANTE:** Antes de conectar cualquier cosa, asegurate de que el ESP32 **NO** esté conectado a la corriente. Trabajá siempre con todo apagado.

### 5.1. Diagrama de conexión

```
                  ┌─────────────────────────┐
                  │         ESP32           │
                  │                         │
   ┌──────────────┤   ┌───┐ ┌───┐ ┌───┐   ├──────────────┐
   │    DHT11     │   │   │ │   │ │   │   │    LED RGB    │
   │  ┌───────┐   │   │ 16│ │34 │ │25 │   │  ┌───┐       │
   │  │ VCC   ├───┤   │   │ │   │ │   │   │  │ R │──GPIO17│
   │  │ DATA  ├───┤   └───┘ └───┘ └───┘   │  ├───┤       │
   │  │ GND   ├───┤        ...            │  │ G │──GPIO18│
   │  └───────┘   │                        │  ├───┤       │
   │              │                        │  │ B │──GPIO19│
   │    MQ2       │       TCS230           │  └─┬─┘       │
   │  ┌───────┐   │     ┌────────┐         │    │220Ω     │
   │  │ VCC   ├───┤     │ S0=25  │         │   GND        │
   │  │ AOUT  ├───┤     │ S1=26  │         │              │
   │  │ GND   ├───┤     │ S2=27  │         │              │
   │  └───────┘   │     │ S3=14  │         │              │
   │              │     │ OUT=12 │         │              │
   │              │     │ VCC=5V │         │              │
   │              │     │ GND=   │         │              │
   └──────────────┘     └────────┘         └──────────────┘
```

### 5.2. Tabla de conexiones detallada

Conectá cada pin exactamente como indica esta tabla:

#### DHT11 (temperatura y humedad)

| Pin del DHT11 | Conectalo a... | Color de cable sugerido |
|---|---|---|
| VCC (pin 1) | **3.3V** del ESP32 | Rojo |
| DATA (pin 2) | **GPIO 16** del ESP32 | Amarillo |
| GND (pin 4) | **GND** del ESP32 | Negro |

> *El pin 3 del DHT11 no se usa (es NC = No Conectado).*

#### MQ2 (sensor de gases)

| Pin del MQ2 | Conectalo a... | Color de cable sugerido |
|---|---|---|
| VCC | **5V** del ESP32 | Rojo |
| AOUT (salida analógica) | **GPIO 34** del ESP32 | Naranja |
| GND | **GND** del ESP32 | Negro |

> **Atención:** El MQ2 funciona a 5V. La salida AOUT da entre 0V y 5V aproximadamente. El pin GPIO 34 del ESP32 solo acepta hasta 3.3V. Para un proyecto de universidad funciona conectado directo, pero idealmente deberías usar un **divisor de tensión** con dos resistencias (1kΩ y 2kΩ) para bajar el voltaje.

#### TCS230 (sensor de color)

| Pin del TCS230 | Conectalo a... | Color de cable sugerido |
|---|---|---|
| VCC | **5V** del ESP32 | Rojo |
| S0 | **GPIO 25** del ESP32 | Azul |
| S1 | **GPIO 26** del ESP32 | Verde |
| S2 | **GPIO 27** del ESP32 | Amarillo |
| S3 | **GPIO 14** del ESP32 | Blanco |
| OUT | **GPIO 12** del ESP32 | Violeta |
| GND | **GND** del ESP32 | Negro |

#### LED RGB (indicador de estado)

| Pin del LED | Conectalo a... | Color de cable sugerido |
|---|---|---|
| Ánodo R (rojo) | **GPIO 17** + resistencia 220Ω | Rojo |
| Ánodo G (verde) | **GPIO 18** + resistencia 220Ω | Verde |
| Ánodo B (azul) | **GPIO 19** + resistencia 220Ω | Azul |
| Cátodo común (-) | **GND** del ESP32 | Negro |

> **¿Cómo identificar los pines del LED RGB?**
> - Si tenés un LED RGB de 4 patas, la pata más larga es el **cátodo común** (va a GND).
> - Las otras tres patas son los ánodos de cada color (R, G, B). El orden puede variar según el fabricante. Si no estás seguro, buscá la hoja de datos del modelo.

#### Resumen rápido de los pines del ESP32 que usamos

| GPIO | Conectado a | Función |
|---|---|---|
| 16 | DHT11 DATA | Temperatura y humedad |
| 34 | MQ2 AOUT | Gas/calidad de aire |
| 25 | TCS230 S0 | Control de frecuencia |
| 26 | TCS230 S1 | Control de frecuencia |
| 27 | TCS230 S2 | Selección de filtro de color |
| 14 | TCS230 S3 | Selección de filtro de color |
| 12 | TCS230 OUT | Lectura de frecuencia de color |
| 17 | LED RGB R (con 220Ω) | LED rojo |
| 18 | LED RGB G (con 220Ω) | LED verde |
| 19 | LED RGB B (con 220Ω) | LED azul |

---

## 6. Configurar y subir el firmware

### 6.1. Abrir el archivo firmware.ino

1. Abrí **Arduino IDE**.
2. Andá a **Archivo > Abrir** (o *File > Open*).
3. Navegá hasta la carpeta donde guardaste los archivos del proyecto.
4. Entrá a la subcarpeta **firmware/** y seleccioná el archivo **firmware.ino**.
5. Hacé clic en **Abrir**.

### 6.2. Configurar la placa y el puerto

1. Andá a **Herramientas > Placa > ESP32 Arduino** y seleccioná **"ESP32 Dev Module"**.
2. Andá a **Herramientas > Puerto** y seleccioná el puerto donde está conectado tu ESP32.
   - En Windows, suele aparecer como **COM3**, **COM4**, **COM5**, etc.
   - Si no ves ningún puerto, probablemente necesitás instalar los drivers USB.
   - Buscá en Google **"CP210x USB to UART driver Windows"** o **"CH340 driver Windows"** según el chip que tenga tu ESP32.
3. Configurá estos parámetros (también en Herramientas):
   - **Flash Size:** 4MB (32Mb)
   - **Partition Scheme:** Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)
   - **Upload Speed:** 115200

### 6.3. Configurar el WiFi y la IP del servidor en el código

Antes de subir el firmware, tenés que cambiar dos cosas en el código:

1. En el archivo **firmware.ino**, buscá estas líneas al principio:

```cpp
const char* ssid = "Telefono de Ari <3";       // nombre de la red WiFi
const char* password = "depositamexfa";         // contraseña de la red WiFi
```

2. Cambiá `"Telefono de Ari <3"` por el nombre de **tu** red WiFi (el hotspot de tu celular).
3. Cambiá `"depositamexfa"` por la contraseña de **tu** red WiFi.

4. Después, buscá esta línea:

```cpp
const char* servidorURL = "http://192.168.1.100:3000/data";
```

5. Cambiá `192.168.1.100` por la **dirección IP de tu computadora**.
   - **¿Cómo saber la IP de tu PC?**
     - En Windows: abrí `cmd` y escribí `ipconfig`. Buscá la línea que dice **"Dirección IPv4"**.
     - Si tu celular está haciendo de router, tu IP probablemente sea algo como `192.168.43.XXX` o `192.168.1.XXX`.
   - También podés usar `localhost` si querés probar desde la misma computadora, pero para el celular necesitás la IP real.

> **Importante:** La PC y el ESP32 tienen que estar conectados a la **misma red WiFi**. Si la PC está conectada al hotspot de tu celular, la IP que te da `ipconfig` es la que va en el firmware.

### 6.4. Subir el firmware al ESP32

1. Conectá el ESP32 a tu computadora mediante el cable USB-C.
2. En Arduino IDE, hacé clic en el botón **→** (flecha a la derecha) que dice **"Subir"** (o *Upload*).
3. Esperá a que el código se compile (puede tardar entre 30 segundos y 2 minutos).
4. Cuando termine de compilar, va a aparecer un mensaje como `Connecting...` y luego va a subir el código al ESP32.
5. Si todo sale bien, vas a ver el mensaje **"Done uploading"** en la parte de abajo del IDE.
6. Abrí el **Monitor Serie** (menú **Herramientas > Monitor Serie**, o el ícono de lupa en la esquina superior derecha).
7. Asegurate de que la velocidad esté en **115200 baudios**.
8. Vas a ver los mensajes de depuración del ESP32, incluyendo la dirección IP que le asigna el WiFi.

---

## 7. Instalar Node.js en tu computadora

El backend está hecho en Node.js. Si ya lo tenés instalado, saltá al paso 8.

1. Andá a la página oficial: https://nodejs.org
2. Descargá la versión **LTS** (la recomendada para la mayoría de los usuarios).
3. Ejecutá el instalador y seguí los pasos:
   - Aceptá los términos.
   - Dejá la carpeta de instalación por defecto.
   - Hacé clic en **Next** hasta que empiece la instalación.
4. Cuando termine, abrí una terminal:
   - Presioná **Windows + R**, escribí `cmd` y presioná Enter.
5. Escribí este comando para verificar que Node.js se instaló bien:

```
node --version
```

Debería aparecer un número como `v20.11.0` o similar (la versión puede variar).

6. También verificá que npm (el gestor de paquetes de Node) se instaló:

```
npm --version
```

Debería aparecer un número de versión.

> **Nota:** Este proyecto no necesita ningún paquete adicional de npm. Usa solo módulos nativos de Node.js. No hace falta hacer `npm install`.

---

## 8. Ejecutar el servidor backend

1. Abrí una terminal (cmd) en tu computadora.
2. Navegá hasta la carpeta del proyecto:

```
cd C:\Users\tu_usuario\Downloads\tallerIII\backend
```

3. Ejecutá el servidor con este comando:

```
node server.js
```

4. Vas a ver un mensaje como este:

```
===================================
 Servidor del modulo hexagonal
 Corriendo en: http://localhost:3000
 Abre esta URL en tu navegador
===================================
```

5. **Dejá esta ventana abierta** (no la cierres). El servidor tiene que estar corriendo todo el tiempo para que funcione.

> **Para probar que funciona:**
> - Abrí un navegador web en tu PC y andá a `http://localhost:3000`.
> - Si ves la página del módulo, el servidor está funcionando bien.
> - Andá a `http://localhost:3000/latest` para ver la última lectura (si el ESP32 ya envió datos).

---

## 9. Abrir la web app en tu celular

Una vez que el servidor está corriendo en tu PC:

1. Asegurate de que tu **celular** esté conectado al **mismo WiFi** que la PC.
   - Si la PC está conectada al hotspot de tu celular, ya están en la misma red.
2. En tu celular, abrí el navegador (Chrome, Safari, etc.).
3. Escribí la dirección IP de tu PC seguida de `:3000`. Por ejemplo:

```
http://192.168.1.100:3000
```

4. Reemplazá `192.168.1.100` por la IP real de tu PC (la misma que pusiste en el firmware).
5. Si todo funciona, vas a ver la aplicación web del módulo hexagonal.

> **Si no carga la página:**
> - Verificá que el servidor Node.js esté corriendo (la ventana de cmd abierta).
> - Verificá que el celular esté conectado al mismo WiFi que la PC.
> - En Windows, el firewall puede bloquear la conexión. Si no funciona, desactivá temporalmente el firewall de Windows para probar, o creá una regla de entrada para el puerto 3000.

---

## 10. Generar el código QR

El código QR se pega en el módulo físico para que los usuarios escaneen y abran la app.

### Opción 1: Usar un generador online (la más fácil)

1. Andá a https://www.qr-code-generator.com/ o https://es.qr-code-generator.com/
2. En el campo de texto, poné la URL completa de tu aplicación web. Por ejemplo:

```
http://192.168.1.100:3000
```

3. Hacé clic en **Generar código QR** (o *Generate QR Code*).
4. Descargá la imagen del código QR.
5. Imprimila en una hoja y pegala sobre el módulo hexagonal con cinta adhesiva transparente.

### Opción 2: Usar Python (si tenés Python instalado)

1. Instalá la librería qrcode:

```
pip install qrcode pillow
```

2. Ejecutá este código (creá un archivo `generar_qr.py` en la carpeta del proyecto):

```python
import qrcode                               # importa la librería para generar códigos QR
url = "http://192.168.1.100:3000"           # la URL de tu aplicación web
img = qrcode.make(url)                      # genera la imagen del QR
img.save("codigo_qr_modulo.png")            # guarda la imagen en un archivo
print("Codigo QR generado como codigo_qr_modulo.png")  # mensaje de confirmación
```

3. Reemplazá la URL por la IP de tu PC.
4. Ejecutalo con `python generar_qr.py`.
5. Imprimí el archivo `codigo_qr_modulo.png`.

### Opción 3: Usar Node.js

1. Instalá la librería qrcode:

```
npm install qrcode
```

2. Ejecutá este código (creá un archivo `generar_qr.js`):

```javascript
const QRCode = require("qrcode");          // importa la librería QR
const url = "http://192.168.1.100:3000";   // URL de la app web
QRCode.toFile("codigo_qr_modulo.png", url, { width: 400 }, function(err) {
  if (err) console.log("Error:", err);     // si hay error, lo muestra
  else console.log("QR generado!");        // si sale bien, avisa
});
```

3. Reemplazá la URL por la IP de tu PC.
4. Ejecutalo con `node generar_qr.js`.
5. Imprimí el archivo `codigo_qr_modulo.png`.

---

## 11. Diagrama completo del sistema

```
  ┌──────────────────────────────────────────────────────────┐
  │                     MÓDULO FÍSICO                        │
  │                                                          │
  │   ┌──────────────────────────────────────────┐           │
  │   │           HEXÁGONO (15 cm)               │           │
  │   │                                          │           │
  │   │   ┌───────┐          ┌────────┐        │           │
  │   │   │ DHT11 │          │ TCS230 │        │           │
  │   │   │(temp/ │          │(color) │        │           │
  │   │   │ hum)  │          │(pH)    │        │           │
  │   │   └───┬───┘          └───┬────┘        │           │
  │   │       │                  │             │           │
  │   │       └──────┬───────────┘             │           │
  │   │              │                         │           │
  │   │         ┌────┴────┐                   │           │
  │   │         │  ESP32  │  ◄── USB-C        │           │
  │   │         └────┬────┘                   │           │
  │   │              │                        │           │
  │   │       ┌──────┴──────┐                │           │
  │   │       │   LED RGB   │                │           │
  │   │       │  (verde/    │                │           │
  │   │       │ amarillo/   │                │           │
  │   │       │   rojo)     │                │           │
  │   │       └─────────────┘                │           │
  │   │                                      │           │
  │   └──────────────────────────────────────────┘       │
  │                                                          │
  │   Imanes en cada vértice (x6)        QR code pegado     │
  │                                                          │
  └──────────────────────────────────────────────────────────┘
                            │
                            │ WiFi (HTTP POST cada 15s)
                            ▼
  ┌──────────────────────────────────────────────────────────┐
  │                    TU COMPUTADORA                        │
  │                                                          │
  │   ┌──────────────────┐     ┌──────────────────┐        │
  │   │  server.js       │     │  datos.jsonl     │        │
  │   │  (Node.js)       │────►│  (archivo con    │        │
  │   │  Puerto 3000     │     │   las lecturas)  │        │
  │   └────────┬─────────┘     └──────────────────┘        │
  │            │                                            │
  │            │ Sirve archivos estáticos                   │
  │            ▼                                            │
  │   ┌──────────────────┐                                  │
  │   │   frontend/      │                                  │
  │   │   index.html     │                                  │
  │   │   style.css      │                                  │
  │   │   app.js         │                                  │
  │   └──────────────────┘                                  │
  └──────────────────────────────────────────────────────────┘
                            │
                            │ WiFi (navegador web)
                            ▼
  ┌──────────────────────────────────────────────────────────┐
  │                   TU CELULAR                             │
  │                                                          │
  │   Abrís: http://192.168.X.X:3000                        │
  │   (o escaneás el código QR)                             │
  │                                                          │
  │   ┌──────────────────────────────────────┐              │
  │   │  Dashboard:                          │              │
  │   │  ┌──────┐ ┌──────┐                  │              │
  │   │  │ 25°C  │ │ 65%  │                 │              │
  │   │  │ Temp  │ │ Hum  │                 │              │
  │   │  └──────┘ └──────┘                  │              │
  │   │  ┌─────────────┐                    │              │
  │   │  │  [Gauge]    │                    │              │
  │   │  │  Calidad    │                    │              │
  │   │  │  de aire 72 │                    │              │
  │   │  └─────────────┘                    │              │
  │   │  ┌─────────────┐                    │              │
  │   │  │  🟢 pH 7.0  │                    │              │
  │   │  └─────────────┘                    │              │
  │   │  "¡Tu planta está bien!"            │              │
  │   └──────────────────────────────────────┘              │
  └──────────────────────────────────────────────────────────┘
```

---

## 12. Solución de problemas

### "No se puede conectar al WiFi" (en el Monitor Serie)

- Verificá que escribiste bien el nombre y la contraseña del WiFi.
- El ESP32 solo funciona en redes de 2.4GHz. Si tu celular está en 5GHz, cambiá la configuración del hotspot.
- Acercá el ESP32 al celular/módem.

### "Error leyendo el DHT11"

- Verificá las conexiones del DHT11 (VCC a 3.3V, DATA a GPIO 16, GND a GND).
- Asegurate de que el DHT11 no esté dañado (probá con otro si tenés).
- Recordá que el DHT11 tiene 4 pines, pero el pin del medio (pin 3) no se conecta.

### Error de compilación: "DHT.h: No such file or directory"

- No instalaste la librería DHT. Seguí los pasos de la sección 4.1.

### Error de compilación: "WiFi.h: No such file or directory"

- No instalaste correctamente el soporte para ESP32. Revisá la sección 3.

### "No se pueden enviar los datos" (en el Monitor Serie)

- El ESP32 perdió la conexión WiFi. El código ya intenta reconectar automáticamente.
- Verificá que el celular siga transmitiendo WiFi.

### La página web no carga en el celular

- Verificá que el servidor Node.js esté corriendo (la ventana de cmd abierta).
- Verificá que el celular y la PC estén en la misma red WiFi.
- Probá la dirección IP desde la PC primero (`http://localhost:3000`).
- En Windows, desactivá temporalmente el firewall para probar.

### El LED RGB no se enciende

- Verificá la conexión del cátodo común a GND.
- Verificá las resistencias de 220Ω en cada ánodo.
- Probá cada color individualmente conectando el pin a GND momentáneamente.

### Después de subir el firmware, no pasa nada

- Abrí el Monitor Serie (velocidad 115200) para ver los mensajes de depuración.
- Apretá el botón **EN** (Reset) en el ESP32 para reiniciarlo.

---

## Créditos

Proyecto universitario — Sistemas Embebidos e IoT
Módulo hexagonal purificador de aire con planta marina y monitoreo IoT.
