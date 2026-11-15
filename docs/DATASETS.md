# DATASETS — Marswalk Planner (Jezero)

Ficha de cada dataset: qué es, link directo, tamaño, formato, qué feature alimenta, cómo bajarlo y procesarlo, y cómo comprobar que quedó bien.

**Estado de verificación** (14 nov 2026):
- ✅ = nombre, URL y tamaño confirmados en la página oficial del producto (vía búsqueda web).
- 🔶 = URL confirmada por varias fuentes, pero no la descargué yo.
- ⚠️ = inferido o de memoria: comprobar antes de usar.
Ninguna descarga fue probada desde mi entorno (sin acceso a internet para bajar archivos). Anotar el resultado real en `used.txt`.

Nombres de archivo locales: los crudos van en `preprocess/raw/` (no se suben al repo); los procesados en `public/data/`.

---

## Resumen: qué bajar y en qué orden

| Orden | Dataset | Tamaño | Feature | Prioridad |
|---|---|---|---|---|
| 1 | D1 DTM CTX 20 m (TRN) | 9.3 MB | F2, F3, F4, F5 | 🔴 imprescindible |
| 2 | D5 Recorrido de Perseverance | pocos MB | F8, F7 | 🔴 imprescindible |
| 3 | D4 Ortoimagen CTX 6 m | 35 MB | F1 (respaldo de mapa de detalle) | 🟡 recomendado |
| 4 | D6 MEDA (clima) | CSV chicos por sol | F6, F11 | 🔴 imprescindible |
| 5 | D7 Mineralogía (papers + mapa geológico) | — | F7, F10 | 🔴 imprescindible (manual) |
| 6 | D2 DTM CTX 20 m cráter completo | 87 MB | F2 ampliado | 🟢 opcional |
| 7 | D3 DTM HiRISE 1 m | 1.8 GB | F2 en alta resolución, F13 | 🟢 opcional |

**Decisión recomendada:** construir todo con D1 (9.3 MB). Solo si sobra tiempo, pasar a D3 en un recorte chico.

---

## D1 — DTM CTX 20 m, Mars 2020 TRN ✅ (el principal)

- **Nombre oficial:** Mars 2020 Terrain Relative Navigation CTX DTM Mosaic
- **Misión / instrumento:** Mars Reconnaissance Orbiter / CTX
- **Qué es:** modelo de elevación (altura de cada punto del terreno), 20 m por píxel
- **Página:** https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic
- **Archivo:** https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif
- **Tamaño / formato:** 9.3 MB, GeoTIFF, proyección equirectangular de Marte
- **Cobertura aprox.:** lat 18.21 a 18.72 N, lon 77.16 a 77.70 E (incluye aterrizaje y delta occidental)
- **Licencia / cita:** CC0. DOI 10.5066/P906QQT8. Fergason et al. 2020 (LPSC 51, abstract 2020)
- **Archivo local:** `preprocess/raw/jezero_ctx_dtm_20m.tif`
- **Alimenta:** F2 (pendiente), F3 (A*), F4 (perfil de elevación), F5 (esfuerzo)

**Procesamiento:**
```bash
# 1. Bajar
curl -L -o preprocess/raw/jezero_ctx_dtm_20m.tif "<URL del archivo>"
# 2. Inspeccionar (proyección, tamaño, valor sin dato)
gdalinfo -stats preprocess/raw/jezero_ctx_dtm_20m.tif
# 3. Pendiente en grados (el archivo está en metros, así que no hace falta factor de escala)
gdaldem slope preprocess/raw/jezero_ctx_dtm_20m.tif preprocess/raw/slope_20m.tif
# 4. Pasar a lat/lon de Marte para superponer en Leaflet
gdalwarp -t_srs "+proj=longlat +a=3396190 +b=3396190 +no_defs" -r bilinear \
  preprocess/raw/slope_20m.tif preprocess/raw/slope_ll.tif
gdalwarp -t_srs "+proj=longlat +a=3396190 +b=3396190 +no_defs" -r bilinear \
  preprocess/raw/jezero_ctx_dtm_20m.tif preprocess/raw/elev_ll.tif
# 5. gdalinfo de los *_ll.tif -> esquinas (bounds) para grid.json
```
Después, `02_slope.py` lee los `*_ll.tif` y escribe `slope.png`, `slope.bin`, `elevation.bin` y `grid.json`.

**Comprobaciones:**
- `gdalinfo` muestra alturas negativas del orden de −2000 a −2700 m (Jezero está bajo el nivel de referencia). ⚠️ valores de memoria: lo importante es que no sean cero ni absurdos.
- Hay un valor "NoData": tratarlo como celda bloqueada en el A*.
- Con 20 m por celda y ~30 km de lado son ~1500×1500 celdas. Para el A* recortar a la zona de trabajo (~10×10 km → 500×500).
- La pendiente a 20 m suaviza rocas y escarpes chicos: decirlo en la demo ("slope over 20 m baselines").
- Al superponer `slope.png`, el frente del delta debe verse como una franja amarilla/roja curva al oeste del aterrizaje.

**Leaflet y la proyección:** Web Mercator estira el norte-sur. Para un `imageOverlay` de ~0.5° de alto a 18° de latitud el error es de pocos metros a decenas de metros; aceptable para la demo. Si se nota el corrimiento, reproyectar el PNG a Mercator con `gdalwarp -t_srs "+proj=merc +a=3396190 +b=3396190"`.

---

## D2 — DTM CTX 20 m, cráter completo ✅ (opcional)

- **Nombre oficial:** Mars 2020 Science Investigation CTX DEM Mosaic
- **Página:** https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic
- **Archivo:** https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif
- **Tamaño:** 87 MB · **Cobertura:** lat 17.58 a 19.29 N, lon 76.99 a 78.58 E (todo el cráter y el borde)
- **Cita:** Calef (autor principal); Mangold et al. 2021, Science, DOI 10.1126/science.abl4051
- **Archivo local:** `preprocess/raw/jezero_crater_ctx_dem_20m.tif`
- **Cuándo usarlo:** si quieren rutas hasta el borde del cráter (donde está hoy el rover) o que F8 cubra todo el recorrido. Mismo procesamiento que D1.

## D3 — DTM HiRISE 1 m ✅ página / ⚠️ URL directa (opcional)

- **Nombre oficial:** Mars 2020 Terrain Relative Navigation HiRISE DTM Mosaic
- **Página:** https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic
- **Archivo (⚠️ inferido del identificador del producto; confirmar con el botón Download de la página):**
  https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif
- **Tamaño:** 1.8 GB · **Resolución:** 1 m
- **Archivo local:** `preprocess/raw/jezero_hirise_dtm_1m_crop.tif`
- **No bajarlo entero.** Recortar por red una ventana de ~3×3 km y remuestrear a 5 m:
```bash
gdalwarp -te <xmin> <ymin> <xmax> <ymax> -tr 5 5 -r average \
  /vsicurl/<URL> preprocess/raw/jezero_hirise_dtm_1m_crop.tif
```
  (las coordenadas `-te` van en metros de la proyección del archivo; obtenerlas con `gdalinfo /vsicurl/<URL>`)
- **Extra:** el producto "Mars Sample Return TRN HiRISE DTM and Orthoimage Mosaics" (5.3 GB, zip) incluye un mosaico de **confianza** → sirve para F13. https://astrogeology.usgs.gov/search/map/mars-sample-return-terrain-relative-navigation-hirise-dtm-mosaic

## D4 — Ortoimagen CTX 6 m ✅ (respaldo del mapa de detalle)

- **Nombre oficial:** Mars 2020 Terrain Relative Navigation Context Camera Orthorectified Image Mosaic
- **Página:** https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_context_camera_orthorectified_image_mosaic
- **Archivo:** https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif
- **Tamaño:** 35 MB · escala de grises, 6 m por píxel · misma cobertura que D1
- **Archivo local:** `preprocess/raw/jezero_ctx_ortho_6m.tif` → `public/data/ortho.jpg`
- **Para qué:** si no consiguen la URL de tiles de detalle del mapa de Mars 2020, esta imagen se convierte a JPG (`gdal_translate -of JPEG -outsize 4096 0`) y se muestra con `L.imageOverlay`. Calza exacto con D1 porque son del mismo producto.
- **Versión HiRISE 25 cm:** existe (6.9 GB), no la necesitan.

## D5 — Recorrido de Perseverance 🔶

- **Fuente:** NASA/JPL-Caltech, mapa "Where is Perseverance" (MMGIS)
- **Archivos (GeoJSON):**
  - Recorrido: https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json
  - Puntos de parada: https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json
  - Helicóptero (opcional): `.../json/m20_heli_flight_path.json` y `.../json/m20_heli_waypoints.json`
- **Contenido:** el recorrido viene en muchos tramos cortos etiquetados por sol; los waypoints traen sol y orientación del rover (yaw, pitch, roll). Coordenadas en lon/lat, utilizables directo en Leaflet (GeoJSON usa orden [lon, lat]).
- **Archivos locales:** `public/data/traverse.geojson`, `public/data/waypoints.geojson`
- **Alimenta:** F8 (validación), F7 (ubicar paradas científicas por sol), F1 (capa "ruta del rover")
- **Importante:** el servidor no permite pedidos desde otra web (sin cabeceras CORS). Descargar con `curl` y guardar en `public/data/`; no cargar en vivo desde el navegador.
- **Pista:** la configuración completa del mapa (incluye las URLs de las capas de tiles) está en ⚠️ `https://mars.nasa.gov/maps/location/api/configure/get?mission=M20`. Si abre, ahí figura la URL del mapa base de detalle que falta en `layers.js`.
- **Comprobaciones:** el primer punto cae junto a 18.4446 N, 77.4509 E (aterrizaje). El archivo de recorrido puede pesar varios MB: simplificarlo (`03_traverse.py`, quedarse con sol + coordenadas).

## D6 — Clima: MEDA (Perseverance) ✅ ubicación / ⚠️ nombres de archivo

- **Nombre oficial:** Mars 2020 Mars Environmental Dynamics Analyzer (MEDA) bundle, PDS Atmospheres Node
- **Entrada:** https://pds-atmospheres.nmsu.edu/ → Mars 2020 → MEDA
- **Directorio de la versión más reciente que encontré:** https://pds.nasa.gov/data/pds4/releases/atmos/mars2020_meda-20260811/ (leer `readme.txt`)
- **Formato:** tablas CSV, un archivo por sensor y por sol; cada uno con su etiqueta XML que explica las columnas
- **Colecciones a usar:**
  - `data_derived_env`: presión, humedad, viento, temperatura del suelo (nivel recomendado por el readme)
  - `data_calibrated_env`: temperatura del aire (ATS) y radiación (RDS) cuando no hay nivel derivado
- **Qué bajar:** 1 a 3 soles recientes de: presión (PS), temperatura del aire (ATS), viento (WS), radiación/UV (RDS). ⚠️ las siglas y nombres exactos de archivo verlos en el directorio; usar siempre la versión más alta de cada archivo.
- **Advertencias del readme:** hay huecos de datos; columnas vacías significan dato no confiable. El sensor de viento sufrió daños en 2022 (⚠️ de memoria): si no hay viento reciente, usar soles anteriores y decirlo.
- **Archivo local:** `preprocess/raw/meda/*.csv` → `public/data/conditions.json`
- **Estructura de salida:** `{ sol, earthDate, tempMinC, tempMaxC, pressurePa, windMs, uv, hourly: [{lmst, tempC, pressurePa}], source }`
- **Alimenta:** F6 (panel), F11 (curva horaria)
- **Plan B (si se complica):** reportes de clima de la misión en https://science.nasa.gov/mission/mars-2020-perseverance/ (buscar "weather"); cargar valores a mano citando sol y fuente. No inventar números.
- **Plan C:** REMS de Curiosity (mismo nodo PDS); es otro cráter (Gale): aclararlo.

## D7 — Mineralogía y paradas científicas (manual) ✅ bibliografía

No hay una capa de minerales lista para Leaflet. Se arma a mano `science_stops.geojson` con 5 a 8 puntos.

**Fuentes para citar y ubicar:**
- Horgan et al. 2020, "The mineral diversity of Jezero crater", Icarus. DOI 10.1016/j.icarus.2019.113526 → unidad de **carbonatos marginales** en el borde interno, cerca del valle de entrada y el delta oeste (datos CRISM)
- Brown et al. 2020, "Olivine-Carbonate Mineralogy of the Jezero Crater Region", JGR Planets. DOI 10.1029/2019JE006011 → asociación **olivino-carbonato** (CRISM + THEMIS). Versión abierta: https://arxiv.org/abs/1904.11414
- Mangold et al. 2021, Science. DOI 10.1126/science.abl4051 → sistema **delta-lago**
- Mapa geológico del USGS de Jezero, SIM 3464 (Stack et al. 2020): unidades con polígonos; buscar "SIM 3464" en https://pubs.usgs.gov ⚠️
- Datos CRISM crudos: https://pds-geosciences.wustl.edu/missions/mro/crism.htm (no hace falta procesarlos)

**Truco para las coordenadas (evita inventarlas):** usar D5. Perseverance ya visitó y muestreó estos lugares; se toma la posición del rover en el sol correspondiente desde `waypoints.geojson`.

| Parada | Por qué importa | Soles aproximados ⚠️ |
|---|---|---|
| Fondo del cráter (Máaz) | Rocas ígneas, datación | 100–200 |
| Séítah | Rocas ricas en olivino alteradas por agua | 200–290 |
| Frente del delta | Sedimentos finos de lago, mejor lugar para biofirmas | 420–580 |
| Three Forks | Depósito de tubos de muestras | 650–690 |
| Cima del delta | Bloques arrastrados por inundaciones | 700–900 |
| Unidad marginal | Carbonatos de posible origen lacustre | 900–1100 |
| Neretva Vallis (Bright Angel) | Posibles biofirmas reportadas en 2024–2025 | 1180–1220 |

⚠️ Los rangos de soles son de memoria: confirmar cada uno con las notas de misión de NASA antes de fijar el punto, y anotar la fuente en `used.txt`.

**Propiedades de cada punto:** `name, type, minerals, whyItMatters, whatToSample, missionData (ej. "MRO/CRISM + Mars 2020"), sol, reference (DOI)`.

## D8 — Mapas base (tiles) 🔶

| Capa | URL | Nota |
|---|---|---|
| OPM Mars basemap v0.1 | `https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-1/all/{z}/{x}/{y}.png` | Global, con nombres. De la wiki de OPM |
| OPM hillshade (MOLA) | `https://s3.us-east-2.amazonaws.com/opmmarstiles/hillshade-tiles/{z}/{x}/{y}.png` | Global, relief. TMS (`tms: true`). Native tiles only z0-z6; z7+ returns 404. |
| Nombres de Jezero (M20) | `https://mars.nasa.gov/mmgis-maps/M20/Layers/M20_Placenames_175k_800dpi/{z}/{x}/{y}.png` | TMS (`tms: true`). NASA MMGIS nominal bounds: lat 17.821-18.918, lon 76.837-78.154. Verified 2026-11-14: HTTP 200 image/png at z4-z18, HTTP 403 at z0-z3 and z19. The tile service returns 403 outside the actual label rectangle, so the app clips to the measured z12 rectangle (x 2927-2936, yTMS 2260-2266); minZoom 4, maxNativeZoom 18. |
| D8c Jezero HiRISE grayscale, 25 cm | `https://mars.nasa.gov/mmgis-maps/M20/Layers/JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120/{z}/{x}/{y}.png` | TMS. Found in NASA MMGIS configuration. Verified 2026-11-14: HTTP 200 image/png at z0-z18, HTTP 403 at z19. minZoom 0, maxNativeZoom 18. Used as the F1 default base at zoom 12. |
| D8d Jezero HiRISE color, 25 cm | `https://mars.nasa.gov/mmgis-maps/M20/Layers/M20_HiRISE_RGB_mosaic_25cm_v4p2/{z}/{x}/{y}.png` | TMS. Found in a Posit Community forum thread (about 3 years old) and confirmed in NASA MMGIS configuration. Verified 2026-11-14: HTTP 403 at z0-z9, HTTP 200 image/png at z10-z18, HTTP 403 at z19. minZoom 10, maxNativeZoom 18. |
| Mars Trek (WMTS) | https://trek.nasa.gov/mars/ | Proyección distinta (EPSG:4326): usar solo para descargar capas como imagen |

Wiki de OPM: https://github.com/openplanetary/opm/wiki/OPM-Basemaps

F1 tile check (2026-11-14): `npm run check:tiles` probes the landing site at z6-z19. All M20 layers are TMS; XYZ row requests return 403, confirming the scheme. The M20 detail layers only cover the Jezero area; outside it they are blank. D8c is the default F1 base at zoom 12; OPM remains available in the layer control.

## D9 — Datos de apoyo (opcionales)

| Dato | Fuente | Uso |
|---|---|---|
| Inercia térmica (THEMIS, Odyssey) | https://themis.mars.asu.edu/ y Mars Trek | Distinguir roca de arena en el costo del A* |
| Mapa de pendientes ya calculado por USGS | "Topographic Slopes of Mars 2020 Landing Site Jezero West" en https://astrogeology.usgs.gov/search/map/mars-2020-jezero-crater-landing-site-products | Comparar con nuestra pendiente (pendiente sobre 20 m) |
| Clima por hora, modelo | Mars Climate Database https://www-mars.lmd.jussieu.fr/mcd_python/ | F11. No es NASA: citar aparte |
| Fotos del rover | https://mars.nasa.gov/mars2020/multimedia/raw-images/ | Fichas de F7 |
| Constantes de Marte | NASA Mars Fact Sheet https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html | Radio, gravedad |

## Fórmulas y referencias no-dataset

| Qué | Referencia | Uso |
|---|---|---|
| Costo energético de caminar en pendiente | Minetti et al. 2002, J. Appl. Physiol. 93:1039 | F5 |
| Velocidad de marcha según pendiente | Tobler 1993, "Three presentations on geographical analysis and modeling" | F4 |
| A* | Hart, Nilsson, Raphael 1968 | F3 |

---

## Archivos finales en `public/data/`

| Archivo | Sale de | Lo usa |
|---|---|---|
| `grid.json` | D1 | F2, F3, F4, F5 |
| `elevation.bin`, `slope.bin` | D1 | F3, F4, F5 |
| `slope.png` | D1 | F2 |
| `ortho.jpg` (opcional) | D4 | F1 |
| `traverse.geojson`, `waypoints.geojson` | D5 | F8 |
| `conditions.json` | D6 | F6, F11 |
| `science_stops.geojson` | D7 + D5 | F7, F10 |

F2 status (2026-11-14): `slope.png`, `slope.bin`, `elevation.bin` and `grid.json` exist in `public/data/`. The crop is 600x600 cells (12x12 km) at lon 77.2775475-77.4799947 E, lat 18.3638751-18.5663223 N. NoData is 0%; slope min/max/mean = 0.0058/37.7237/5.8571 degrees; above 10/20/30 degrees = 18.3739%/2.7789%/0.0381%. All six F7 stop cells are valid. The literal `gdalinfo -stats` output is pending GDAL CLI installation; rasterio 1.5.2 reads the same GeoTIFF.

F6 status (2026-11-14): `conditions.json` (3,698 B) was generated from PS/ATS/RDS sol 1859 and WS sol 313. Full-sol temperature is -83.094 to -21.066 C; the 09:00-15:00 LMST EVA window has a minimum of -62.846 C, 24 hourly ATS means and a final UI status of GO. Pressure is information only; wind is shown separately and excluded from the status. The RDS label has no UV-band column; `RDS_TOP_7` is shown as "Solar radiation (MEDA RDS)" without UV conversion.

F7 status (2026-11-14): `science_stops.geojson` (6,661 B) has 6 approximate stops derived from D5 waypoints. Sols used: 180 (Maaz), 200 (Séítah), 441 (Delta front), 674 (Three Forks), 909 (Margin unit), 1210 (Bright Angel). All six points are inside the 12x12 km grid.

F8 status (2026-11-15): `preprocess/05_traverse.py` clipped D5 to the grid. `traverse.geojson` has 402 features and is 107,593 B after the required simplification (1,010,195 B before, above the 500 kB threshold). `waypoints.geojson` has 517 waypoints and is 152,143 B. Direct comparison results: Landing -> Three Forks mean 400.2 m / median 358.7 m / max 869.8 m, within 50/100/200 m = 5.3/13.7/32.8%, our 2.59 km vs rover 13.94 km; Landing -> Bright Angel mean 159.2 m / median 109.1 m / max 630.4 m, within = 18.9/47.2/73.2%, our 9.52 km vs rover 27.38 km (nearest end waypoint sol 1189; sol 1210 is 27.43 km). Slope table (20 m samples): Three Forks rover mean/median/max 4.90/3.41/19.88 deg, >10/20 deg 14.5/0.0%; route 2.01/1.72/6.73 deg, 0.0/0.0%. Bright Angel rover 4.90/3.41/19.88 deg, 14.5/0.0%; route 2.54/2.09/15.77 deg, 1.0/0.0%. Rover/our length ratio 5.38x and 2.88x. Rover length includes science detours and exploration.

## Herramientas necesarias (Persona A)

- GDAL (`gdalinfo`, `gdalwarp`, `gdaldem`, `gdal_translate`). En Windows lo más simple es instalar QGIS (trae GDAL en "OSGeo4W Shell") o usar conda: `conda install -c conda-forge gdal rasterio`.
- Python 3 con `numpy`, `rasterio`, `pillow`.
- QGIS también sirve para abrir el DTM y ver a ojo que todo calza antes de programar.
