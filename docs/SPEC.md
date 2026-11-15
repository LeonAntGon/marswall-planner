# Marswalk Planner (Jezero) — Especificación completa del proyecto

> NASA Space Apps Challenge 2026 · 14 y 15 de noviembre · Equipo de 2 personas
> Documento maestro: requisitos, features priorizadas, datasets, pasos de construcción, datos faltantes y entrega.
> Los links y nombres de capas marcados con ⚠️ vienen de memoria y hay que verificarlos al usarlos.

---

## 0. Cómo usar este documento con una IA

Pegar esto al inicio de cada sesión con la IA que genere el código:

```
Sos el desarrollador principal de "Marswalk Planner", una app web estática para el NASA Space Apps
Challenge 2026. Objetivo: vista integrada y por capas del cráter Jezero (Marte) que combina datos de
varias misiones de NASA para que un astronauta planifique y ejecute una caminata (EVA) segura con
paradas científicas.
Stack: Vite + React + Leaflet (2D, Web Mercator), sin backend. Preprocesamiento offline en Python
(GDAL/rasterio/numpy) que genera archivos estáticos en /public/data.
Reglas: (1) nunca inventes datos ni URLs: si falta un dato, usá un valor marcado como SUPUESTO en
src/config/assumptions.js con su fuente; (2) todas las distancias usan radio de Marte 3389.5 km;
(3) toda la interfaz en inglés; (4) cada dataset usado se registra en src/config/sources.js;
(5) entregá código completo por archivo, listo para pegar.
Te voy a pedir una feature por vez según la especificación adjunta.
```

Después se pide una feature por vez citando su ID (por ejemplo: "Implementá F3 según la especificación").

---

## 1. Objetivo y requisitos del desafío

**Objetivo:** crear una vista integrada y por capas de un lugar o ruta en Marte que combine datos de varias misiones científicas de NASA y ayude a un explorador humano a planificar y realizar una caminata segura haciendo ciencia en el camino.

| # | Requisito del desafío | Cómo lo cumplimos | Feature |
|---|---|---|---|
| R1 | Un lugar o ruta concreta | Cráter Jezero, zona de Perseverance | F1 |
| R2 | Vista integrada por capas | Mapa único con capas activables | F1, F2 |
| R3 | Datos de varias misiones NASA | MRO (HiRISE, CTX, CRISM), MGS (MOLA), Odyssey (THEMIS), Mars 2020 (MEDA, recorrido) | F2, F6, F7 |
| R4 | Detalles de ruta y destino | Ruta calculada, distancia, desnivel, pendiente | F3, F4 |
| R5 | Condiciones actuales | Panel de clima con datos de MEDA | F6 |
| R6 | Misión rápida y segura | Costo por pendiente, consumibles, regla de retorno | F3, F5 |
| R7 | Ciencia en el camino | Paradas científicas con ficha | F7 |

**Lugar elegido:** Jezero. Sitio de aterrizaje de Perseverance: 18.4447° N, 77.4508° E.

---

## 2. Requisitos de entrega (Space Apps)

- [ ] Demo obligatoria: **video de hasta 30 segundos** o **hasta 7 diapositivas** (contando portada)
- [ ] Demo alojada en un sitio externo con **link público** (YouTube, Drive, GitHub)
- [ ] **Todo en inglés** (página del proyecto y materiales). Video en otro idioma solo con subtítulos en inglés
- [ ] La demo muestra: nombre del equipo, integrantes, desafío elegido y cómo se usaron los datos abiertos de NASA
- [ ] **Citar todos los recursos**: datasets, librerías, herramientas de IA (obligatorio; si no, pueden quitar premios)
- [ ] Completar todos los campos de la página del proyecto y marcar la casilla de términos
- [ ] Confirmar la **hora exacta de cierre** en la página del equipo o con el organizador local
- [ ] Declarar el uso de IA si el formulario lo pide (revisar la Project Submission Guide 2026)

Guías oficiales: https://www.spaceappschallenge.org/resources/project-submission-guide/ y https://www.spaceappschallenge.org/resources/judging-awards-guide

---

## 3. Features priorizadas

Etiquetas: **🔴 MUST** (sin esto no se entrega) · **🟡 SHOULD** (nos diferencia) · **🟢 NICE** (solo si sobra tiempo)

| ID | Feature | Prioridad | Requisito | Datos necesarios | Horas aprox. |
|---|---|---|---|---|---|
| F1 | Mapa base de Jezero con zoom y control de capas | 🔴 MUST | R1, R2 | Tiles OPM + tiles Mars 2020 | 1 |
| F2 | Capas de elevación y pendiente (verde/amarillo/rojo) | 🔴 MUST | R2, R3 | DTM de Jezero | 2 |
| F3 | Ruta A→B con A* que evita pendientes | 🔴 MUST | R4, R6 | Grilla de pendiente | 2 |
| F4 | Panel de la caminata: distancia, desnivel, tiempo, pendiente máxima | 🔴 MUST | R4 | Salida de F3 | 1 |
| F6 | Panel de condiciones (temperatura, presión, viento, UV) | 🔴 MUST | R5 | MEDA | 1 |
| F7 | Paradas científicas con ficha | 🔴 MUST | R7 | CRISM + bibliografía | 1.5 |
| F12 | Página de fuentes y créditos dentro de la app | 🔴 MUST | Entrega | sources.js | 0.5 |
| F5 | Consumibles (O2, energía) y regla de retorno (walkback) | 🟡 SHOULD | R6 | Modelo de esfuerzo | 2 |
| F8 | Validación contra el recorrido de Perseverance | 🟡 SHOULD | Credibilidad | GeoJSON del rover | 1.5 |
| F9 | Replanificación ante emergencia (tormenta / falla) | 🟡 SHOULD | R6 | Salida de F3 y F5 | 1 |
| F10 | Control riesgo vs ciencia | 🟢 NICE | R7 | F3 + F7 | 1 |
| F11 | Ventana horaria (temperatura y luz por hora) | 🟢 NICE | R5 | MEDA por hora o Mars Climate Database | 2 |
| F13 | Capa de confianza del dato | 🟢 NICE | Madurez | Cobertura del DTM | 1 |
| F14 | Modo astronauta (vista tipo casco) | 🟢 NICE | R6 | F4 + F5 | 1.5 |
| F15 | Asistente IA sobre la ruta | 🟢 NICE | — | API de un modelo | 2 |

**Corte mínimo entregable:** F1, F2, F3, F4, F6, F7, F12.
**Versión recomendada:** lo anterior + F5, F8, F9.

---

## 4. Detalle de cada feature

### F1 — Mapa base 🔴
- Leaflet con proyección por defecto (Web Mercator). Vista inicial `[18.44, 77.45]`, zoom 11–12.
- Capa global: OpenPlanetaryMap. Capa de detalle: tiles del mapa de Mars 2020 (formato TMS → `tms: true`).
- Control de capas, marcador del sitio de aterrizaje.
- **Hecho cuando:** se ve Jezero con detalle y se pueden prender y apagar capas.

### F2 — Elevación y pendiente 🔴
- Offline: recortar el DTM, calcular pendiente en grados, exportar (a) PNG coloreado para mostrar y (b) grilla numérica para el A*.
- Colores sugeridos: 0–10° verde, 10–20° amarillo, 20–30° naranja, más de 30° rojo (no transitable). SUPUESTO: límites a justificar.
- En la app: `L.imageOverlay(png, bounds, {opacity})` con control de opacidad.
- **Hecho cuando:** la capa de pendiente calza con el relieve del mapa base (revisar el borde del delta).

### F3 — Ruta A* 🔴
- Clic para fijar inicio, paradas y destino. A* sobre la grilla en 8 direcciones.
- Costo de moverse de una celda a otra: `distancia × factor(pendiente)`; celdas con más de 30° bloqueadas.
- Correr en un Web Worker si la grilla supera ~500×500 celdas.
- Con varias paradas: A* por tramo en el orden indicado.
- **Hecho cuando:** la ruta rodea zonas rojas y se recalcula en menos de 2 segundos.

### F4 — Panel de la caminata 🔴
- Distancia total (m), subida y bajada acumuladas (m), pendiente máxima (°), tiempo estimado.
- Perfil de elevación a lo largo de la ruta (gráfico de línea).
- Velocidad por pendiente, función de Tobler: `v(km/h) = 6 · exp(−3.5 · |tan(pendiente) + 0.05|)`, multiplicada por un factor de traje (SUPUESTO: 0.5).

### F5 — Consumibles y retorno 🟡
- Energía por metro según pendiente i (fracción, no grados), Minetti et al. 2002:
  `C(i) = 280.5i⁵ − 58.7i⁴ − 76.8i³ + 51.9i² + 19.6i + 2.5` (J por kg por metro, Tierra).
- Adaptación a Marte (SUPUESTO simplificado, decirlo en la demo): multiplicar por 0.38 (gravedad) y usar masa astronauta + traje (SUPUESTO: 80 kg + 100 kg).
- Oxígeno: ~20.1 kJ por litro de O2 consumido. Mostrar barra de O2 y de energía contra capacidad del traje (SUPUESTO: autonomía de 8 h).
- **Walkback:** en cada punto de la ruta, calcular el costo de volver a la base por el camino más seguro; si supera lo que queda menos un margen (SUPUESTO: 20%), pintar el tramo de rojo y avisar.

### F6 — Condiciones 🔴
- Tarjetas: temperatura del aire mínima y máxima, presión, viento, UV, sol (día marciano) del dato.
- Semáforo "apto / precaución / no salir" con reglas simples (SUPUESTO: umbrales propios, documentados).
- Indicar siempre la fecha del dato: no es tiempo real, es el último dato publicado.

### F7 — Paradas científicas 🔴
- GeoJSON con 5 a 8 puntos: nombre, tipo (delta, carbonatos, arcillas, olivino, fondo del cráter), por qué importa, qué muestrear, misión que aporta el dato.
- Íconos por tipo y ficha al hacer clic. Botón "agregar a la ruta".

### F8 — Validación contra Perseverance 🟡
- Dibujar el recorrido real del rover. Elegir un tramo A→B, correr el A* entre esos puntos.
- Métricas: % de la ruta propia a menos de 50 m del recorrido real, distancia media entre ambas, longitud y pendiente máxima de cada una.
- Mostrar las dos líneas y una frase resumen. Aclarar que un rover y una persona tienen límites distintos.

### F9 — Emergencia 🟡
- Botón "Simular tormenta de polvo" o "Falla de traje": toma la posición actual sobre la ruta y calcula el regreso más corto y seguro; muestra tiempo y O2 restante.

### F10 a F15 — Opcionales 🟢
- **F10:** costo = `α·riesgo − (1−α)·valor científico cercano`; control deslizante α.
- **F11:** curva de temperatura por hora local y sombreado del DTM según altura del sol; recomendar hora de salida.
- **F13:** capa que marca dónde hay DTM de 1 m y dónde solo datos gruesos.
- **F14:** pantalla simplificada: próxima parada, O2, distancia de retorno, alertas.
- **F15:** chat que recibe el resumen de la ruta en JSON y responde preguntas.

### F12 — Fuentes 🔴
- Pantalla "Data & Credits" generada desde `sources.js`: dataset, misión, instrumento, institución, URL, uso.

---

## 5. Datasets: qué conseguir, dónde y para qué

| Dato | Misión / instrumento | Para qué feature | Dónde | Notas |
|---|---|---|---|---|
| Mapa base global | MGS/MOLA y otros (OpenPlanetaryMap) | F1 | https://github.com/openplanetary/opm/wiki/OPM-Basemaps | URLs de tiles listas en la wiki. Web Mercator |
| Mapa de detalle de Jezero | MRO/HiRISE (mapa Mars 2020) | F1 | https://science.nasa.gov/mission/mars-2020-perseverance/location-map/ | ⚠️ Abrir el mapa, F12 → Network → filtrar "png" y copiar el patrón de URL de los tiles. Formato TMS |
| Nombres de lugares de Jezero | Mars 2020 | F1 | `https://mars.nasa.gov/mmgis-maps/M20/Layers/M20_Placenames_175k_800dpi/{z}/{x}/{y}.png` | ⚠️ verificar. `tms: true` |
| DTM de Jezero (1 m) | MRO/HiRISE | F2, F3, F5 | USGS Astrogeology: buscar "Mars 2020 Terrain Relative Navigation HiRISE DTM Mosaic" en https://astrogeology.usgs.gov/search | ⚠️ Archivo grande. Ver sección 6 |
| DTM de Jezero (20 m) | MRO/CTX | F2, F3 (plan B) | USGS Astrogeology: "Mars 2020 Terrain Relative Navigation CTX DTM Mosaic" | Más liviano; alcanza para la demo |
| DTM alternativo | MRO/HiRISE | F2 | https://www.uahirise.org/dtm/ (buscar "Jezero") | Plan C |
| Topografía global | MGS/MOLA | Contexto, F13 | Capa de Mars Trek https://trek.nasa.gov/mars/ | ~463 m por píxel |
| Mosaico de contexto | MRO/CTX | Capa extra | https://murray-lab.caltech.edu/CTX/ o Mars Trek | ~5 m por píxel |
| Mineralogía | MRO/CRISM | F7, F10 | https://pds-geosciences.wustl.edu/missions/mro/crism.htm y capas en Mars Trek | Usar mapas publicados para ubicar los puntos a mano |
| Inercia térmica | Odyssey/THEMIS | Costo de terreno (opcional) | https://themis.mars.asu.edu/ y Mars Trek | Roca vs arena suelta |
| Clima en superficie | Mars 2020/MEDA | F6, F11 | https://pds-atmospheres.nmsu.edu/ → Mars 2020 → MEDA | Datos derivados por sol en CSV |
| Clima (plan B) | MSL/REMS (Curiosity) | F6 | Mismo nodo del PDS | Es del cráter Gale, no de Jezero: aclararlo |
| Clima por hora (modelo) | Mars Climate Database | F11 | https://www-mars.lmd.jussieu.fr/mcd_python/ | No es de NASA: citar aparte |
| Recorrido del rover | Mars 2020 | F8 | ⚠️ `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json` y `M20_waypoints.json` | Si la URL cambió: F12 → Network en el mapa de ubicación y buscar "traverse" |
| Fotos del rover | Mars 2020 | Fichas de F7 (opcional) | https://mars.nasa.gov/mars2020/multimedia/raw-images/ | Imágenes de NASA: citar |
| Hielo subterráneo | MRO/SHARAD (SWIM) | Capa extra (opcional) | https://swim.psi.edu/ | Jezero no es zona de hielo; solo contexto |

---

## 6. Datos faltantes, riesgos y pistas

| Problema | Pista o solución |
|---|---|
| El DTM de 1 m pesa varios GB | Empezar con el de CTX (20 m). O recortar sin bajar todo: `gdal_translate -projwin <xmin> <ymax> <xmax> <ymin> /vsicurl/<URL_del_tif> jezero_crop.tif`. Recorte sugerido: ~8×8 km alrededor del aterrizaje y el frente del delta |
| Grilla demasiado grande para el navegador | Remuestrear a 5–10 m: `gdalwarp -tr 10 10 -r average`. 800×800 celdas es manejable |
| El DTM viene en proyección equirectangular de Marte | `gdalwarp -t_srs "+proj=longlat +a=3396190 +b=3396190 +no_defs"` y leer los límites con `gdalinfo` para el `imageOverlay` |
| La pendiente da valores absurdos | Calcularla **antes** de pasar a grados de lat/lon (en metros), o usar `gdaldem slope -s 59274` sobre el archivo en grados |
| Longitudes 0–360 vs −180–180 | Jezero es 77.45° E en ambos sistemas; revisar igual que la capa no aparezca corrida |
| Las URLs de NASA bloquean pedidos desde otra web (CORS) | Descargar los JSON y CSV una vez y servirlos desde `/public/data`. Los tiles como imagen no tienen ese problema |
| Tiles de Mars 2020 aparecen al revés o en gris | Probar `tms: true`; revisar el zoom máximo real de la capa (`maxNativeZoom`) |
| No hay mapa de minerales listo como capa | Ubicar a mano 5–8 puntos desde publicaciones: delta occidental (arcillas), unidad marginal de carbonatos en el borde interno oeste, fondo del cráter con olivino (formación Séítah), cuello del valle Neretva. Citar los artículos |
| MEDA es difícil de leer | Plan B: tabla fija con valores típicos de Jezero tomados de reportes publicados de la misión, marcada como "representative values" con su fuente. No inventar números |
| No hay datos "en vivo" | Decirlo: "latest published data, sol N". El desafío pide el concepto de actualización, no un enlace en tiempo real |
| El modelo de esfuerzo en Marte es aproximado | Presentarlo como "first-order model", con supuestos visibles y editables en la app. Bibliografía a citar: Minetti et al. 2002 (costo de caminar en pendiente), Tobler 1993 (velocidad), datos metabólicos de las EVA de Apollo |
| La distancia de Leaflet usa el radio de la Tierra | Usar siempre la función propia con R = 3389.5 km. 1° de latitud en Marte ≈ 59.16 km |
| El rover y la ruta propia no coinciden | Es esperable: explicar las diferencias (arena, objetivos científicos, límites del vehículo) |

---

## 7. Arquitectura y estructura

```
marswalk/
├─ preprocess/                # Python, se corre una sola vez
│  ├─ 01_crop_dtm.sh          # recorte y remuestreo
│  ├─ 02_slope.py             # pendiente → slope.png + grid.bin + grid.json (bounds, filas, columnas, tamaño de celda)
│  ├─ 03_traverse.py          # recorrido del rover → GeoJSON liviano
│  └─ 04_meda.py              # CSV de MEDA → conditions.json
├─ public/data/               # salida del preprocesamiento
│  ├─ slope.png  elevation.bin  slope.bin  grid.json
│  ├─ traverse.geojson  science_stops.geojson  conditions.json
└─ src/
   ├─ config/ assumptions.js  sources.js  layers.js
   ├─ lib/ marsGeo.js (distancias)  astar.worker.js  effort.js (Tobler, Minetti, O2)  compare.js (F8)
   ├─ components/ MapView  LayerPanel  RoutePanel  ConditionsPanel  ScienceCard  Credits
   └─ App.jsx
```

- Sin backend. Deploy en Vercel o Netlify.
- Grillas numéricas como `Float32Array` binario (más liviano que JSON).
- Conversión clic → celda: interpolación lineal entre los límites de `grid.json`.

---

## 8. Pasos de construcción, en orden

**Etapa 1 — Mapa (F1)**
1. [ ] Crear proyecto Vite + React, instalar Leaflet
2. [ ] Mostrar OPM centrado en Jezero
3. [ ] Agregar tiles de detalle de Mars 2020 y nombres
4. [ ] Publicar en Vercel (tener link desde el minuto uno)

**Etapa 2 — Datos (F2)**
5. [ ] Bajar o recortar el DTM
6. [ ] Script de pendiente → `slope.png`, `slope.bin`, `elevation.bin`, `grid.json`
7. [ ] Superponer `slope.png` y verificar que calza

**Etapa 3 — Ruta (F3, F4)**
8. [ ] Clics para inicio, paradas y destino
9. [ ] A* en Web Worker
10. [ ] Panel con métricas y perfil de elevación

**Etapa 4 — Contenido (F6, F7, F12)**
11. [ ] `conditions.json` y panel de condiciones
12. [ ] `science_stops.geojson` y fichas
13. [ ] Pantalla de créditos

**Etapa 5 — Diferenciales (F5, F8, F9)**
14. [ ] Modelo de esfuerzo, barras de consumibles, walkback
15. [ ] Recorrido del rover y comparación
16. [ ] Botón de emergencia

**Etapa 6 — Entrega**
17. [ ] Pasar toda la interfaz a inglés y revisar
18. [ ] Grabar la demo (30 s) con subtítulos en inglés
19. [ ] Completar la página del proyecto y enviar

### Reparto

| Persona A — datos y lógica | Persona B — interfaz y entrega |
|---|---|
| Pasos 5, 6, 9, 14, 15 | Pasos 1–4, 7, 8, 10–13, 16–19 |

### Cronograma sugerido

| Momento | Meta |
|---|---|
| Sábado tarde | Etapas 1 y 2 |
| Sábado noche | Etapa 3 |
| Domingo mañana | Etapas 4 y 5 |
| Domingo tarde | Etapa 6, con 2 horas de margen antes del cierre |

**Regla de corte:** si el domingo al mediodía F3 no funciona, se congelan los diferenciales y se entrega el corte mínimo.

---

## 9. Supuestos (archivo `assumptions.js`)

| Supuesto | Valor inicial | Fuente o justificación a citar |
|---|---|---|
| Radio de Marte | 3389.5 km | NASA Mars Fact Sheet |
| Gravedad | 3.71 m/s² (0.38 g) | NASA Mars Fact Sheet |
| Pendiente máxima transitable | 30° | Supuesto propio; ajustar si se encuentra referencia de EVA |
| Factor de velocidad con traje | 0.5 | Supuesto propio |
| Masa astronauta + traje | 180 kg | Supuesto propio |
| Autonomía del traje | 8 h | Duración típica de una EVA |
| Margen de retorno | 20% | Supuesto propio |
| Energía por litro de O2 | 20.1 kJ | Fisiología estándar |

Mostrar estos valores en la app como editables suma transparencia.

---

## 10. Página del proyecto (en inglés)

- [ ] **Project name** y **high-level summary** (qué es, qué problema resuelve, por qué importa)
- [ ] **Link to demo** (video o diapositivas) y **link to project** (app en vivo + repositorio)
- [ ] **Detailed description:** qué hace, cómo funciona, beneficios, herramientas y lenguajes
- [ ] **NASA data:** qué datasets y cómo se usaron (tabla de la sección 5)
- [ ] **Space agency partner & other data:** Mars Climate Database, OpenPlanetaryMap, si se usaron
- [ ] **References:** datasets, artículos (Minetti 2002, Tobler 1993), librerías (Leaflet, React, GDAL), herramientas de IA
- [ ] **Use of AI:** declarar qué se generó con IA, si el formulario lo pide

### Guion del video (30 s)

| Segundos | Contenido |
|---|---|
| 0–4 | Equipo y desafío. "Planning the first human walk on Mars" |
| 4–10 | Mapa de Jezero, capas que se prenden: 4 misiones de NASA en una vista |
| 10–18 | Se traza una ruta; esquiva lo rojo; panel con tiempo y oxígeno |
| 18–24 | Comparación con Perseverance: "X% match with NASA's rover path" |
| 24–30 | Emergencia: tormenta y ruta de regreso. Cierre con nombre y link |

---

## 11. Criterios del jurado y cómo responder

| Criterio | Cómo lo cubrimos |
|---|---|
| Impacto | Seguridad del astronauta: consumibles y regla de retorno |
| Creatividad | Modelo humano y comparación con el rover, no solo un visor |
| Validez | Validación contra Perseverance y supuestos declarados |
| Relevancia | Tabla de requisitos R1–R7 cubiertos |
| Presentación | Demo de 30 s con el diferencial en los primeros 15 s |

Verificar los criterios exactos de 2026 en la Judging & Awards Guide.

---

## 12. Checklist final

- [ ] La app abre desde un link público en una ventana de incógnito
- [ ] Se usan datos de al menos 3 misiones de NASA y se nombran en pantalla
- [ ] Ruta, métricas, condiciones y paradas funcionan sin errores en consola
- [ ] Todos los textos en inglés
- [ ] Créditos completos dentro de la app y en la página del proyecto
- [ ] Demo dentro del límite, con subtítulos en inglés y link público
- [ ] Repositorio público con README (qué es, cómo correrlo, fuentes)
- [ ] Proyecto enviado antes del cierre, con captura de la confirmación