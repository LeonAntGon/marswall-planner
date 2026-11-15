# Marswalk Planner — Cráter Jezero

Una aplicación web estática para el NASA Space Apps Challenge 2026. Construye una vista en capas del cráter Jezero, el sitio de aterrizaje de Perseverance (18.4447 N, 77.4508 E), y crecerá hasta convertirse en un planificador de caminatas extravehiculares (EVA) con enrutamiento consciente de pendientes, consumibles humanos, clima y paradas científicas.

## Demo en vivo

- **Demostración en video (30 s):** https://youtu.be/VOB8qgboYEg
- **Aplicación desplegada:** https://marswall-planner.vercel.app/

## Equipo

| Rol | GitHub |
|-----|--------|
| Miembro del equipo | https://github.com/Hearly98 |
| Miembro del equipo | https://github.com/LeonAntGon |

## Datos y recursos de la NASA utilizados

El proyecto utiliza los siguientes datos y recursos de la NASA y agencias espaciales asociadas:

| Texto del enlace | URL del enlace |
|------------------|----------------|
| Mars 2020 Terrain Relative Navigation CTX DTM Mosaic (20 m) | https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic |
| Archivo raw CTX DTM (20 m) | https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif |
| Traverso de Perseverance (JSON) Mars 2020 | https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json |
| Puntos de ruta de Perseverance (JSON) Mars 2020 | https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json |
| Capas de mapa de capas de ubicación (MMGIS) Mars 2020 | https://mars.nasa.gov/maps/location/api/configure/get?mission=M20 |
| Página del mapa de ubicación Mars 2020 | https://science.nasa.gov/mission/mars-2020-perseverance/location-map/ |
| Capa de baldosa HiRISE en escala de grises (25 cm) | https://mars.nasa.gov/mmgis-maps/M20/Layers/JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120/{z}/{x}/{y}.png |
| Capa de baldosa HiRISE a color (25 cm) | https://mars.nasa.gov/mmgis-maps/M20/Layers/M20_HiRISE_RGB_mosaic_25cm_v4p2/{z}/{x}/{y}.png |
| Capa de baldosa de nombres de lugares M20 | https://mars.nasa.gov/mmgis-maps/M20/Layers/M20_Placenames_175k_800dpi/{z}/{x}/{y}.png |
| Baldosas de sombreado MOLA OPM (Mars Global Surveyor) | https://s3.us-east-2.amazonaws.com/opmmarstiles/hillshade-tiles/{z}/{x}/{y}.png |
| Hoja de datos de Marte de la NASA (radio y gravedad) | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html |
| Coordenadas del sitio de aterrizaje del cráter Jezero | https://science.nasa.gov/mission/mars-2020-perseverance/location-map/ |
| Datos ambientales MEDA Mars 2020 | https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/ |
| Ciencia de la NASA — Campaña #2: El Frente del Delta | https://science.nasa.gov/blog/campaign-2-the-delta-front |
| Ciencia de la NASA — Perseverance Celebra un Año Marciano en Jezero | https://science.nasa.gov/blog/a-lap-around-the-sun-perseverance-celebrates-one-martian-year-at-jezero/ |
| NASA — Perseverance Estudia los Vientos Salvajes del Cráter Jezero | https://www.nasa.gov/solar-system/nasas-perseverance-studies-the-wild-winds-of-jezero-crater/ |

El registro de fuentes completo también está en `src/config/sources.js`, representado por el botón **Data & Credits** en la barra superior, junto con la tabla de supuestos.

## Divulgación de contenido generado por IA

Algunas imágenes y texto en este repositorio (incluidas capturas de pantalla y gráficos del README) fueron generadas o asistidas con herramientas de IA (un asistente de programación Kilo). Se usaron para acelerar la innovación y la creatividad; la idea central —planificar caminatas seguras en Marte con datos reales de la NASA— es original del equipo. No se generó ni modificó ninguna marca, logo, bandera o identificador de misión de la NASA mediante IA.

## Estado actual

F1 (mapa base), F2 (superposición de pendiente), F3 (ruta A*), F4 (métricas de caminata), F5 (consumibles, tiempo de ida y vuelta y caminata de regreso), F6 (condiciones), F7 (paradas científicas), F8 (comparación con el recorrido del rover), F9 (regreso de emergencia) y F12 (Datos y Créditos) están implementados.

- Barra superior slim oscura y mapa Leaflet de pantalla completa.
- Capa base predeterminada: **Jezero HiRISE color (25 cm)** en zoom 12, con un respaldo permanente de Marte OPM debajo.
- Capas disponibles: mapa base OPM v0.1, sombreado MOLA, Jezero HiRISE color (25 cm) y nombres de lugares M20.
- Barra lateral de planificador colapsable a la izquierda y tarjeta de capas de mapa a la derecha con controles de capa base, pendiente, recorrido y nombres de lugares.
- `L.circleMarker` en el sitio de aterrizaje con el popup “Octavia E. Butler Landing (Perseverance, Mars 2020)”.
- Los diagnósticos de baldosas están disponibles solo con `?debug=1`; la UI normal no tiene panel de estado de baldosas.
- Superposición de pendiente F2 (600×600 celdas, 12×12 km) con transparencia por debajo de 10°, opacidad predeterminada del 55 %, leyenda de colores y estadística de pendiente máxima.
- Planificador de rutas F3/F4: establecer inicio/paradas/destino, A* con pendientes superiores a 30° bloqueadas, métricas de ruta y un perfil de elevación SVG.
- Consumibles F5: barras de energía y O2, un slider de Consumibles al inicio (20–100 %, predeterminado 100 %), energía de parada científica y una comprobación de caminata de regreso de Dijkstra inversa con advertencia de punto de no retorno.
- Tiempo de ida y vuelta F5: caminata de ida + tiempo en paradas + caminata de regreso a lo largo de la ruta de caminata de regreso, verificado contra la duración EVA de 8 h y la ventana de luz diurna de 6 h.
- Panel de condiciones F6 desde MEDA: temperatura de todo el sol, mínimo de la ventana EVA (09:00–15:00 LMST) para el estado, presión como información solo, radiación solar y viento.
- F7 seis paradas científicas con tarjetas de detalle y **Agregar a la ruta**.
- F8 capa de recorrido de Perseverance (línea D5 recortada) y una comparación de función pura: media/mediana/máximo de distancia y cobertura dentro de 50/100/200 m. También muestre `slope.bin` cada 20 m y compara media/mediana/máximo de pendiente y el porcentaje por encima de 10°/20° para el recorrido del rover y nuestra ruta.
- Regreso de emergencia F9: slider de posición, marcador, camino de menor energía desde `costToBase`/predecesores, consumibles de regreso y estado OK/NO SUFICIENTE.
- Paso UX/UI: stepper Inicio/Destino/Paradas científicas, presets, resumen de caminata, acordeones de supuestos de misión y validación, chip/drawer de condiciones, barra lateral responsiva y leyenda de ruta.
- La navegación del mapa está bloqueada a la grid más 30 % de relleno; las capas de baldosas tienen `noWrap`, la vista inicial ajusta a la grid, y el zoom mínimo es el ajuste al área acolchada (sin vista planetaria completa).
- El modal F12 Datos y Créditos se genera desde `sources.js` y `assumptions.js`, con insignias assumed/sourced.
- La instancia del mapa se expone a través de `MapContext` para características futuras.

### Limitaciones conocidas

- Las capas de detalle M20 solo cubren el área de Jezero. Fuera de esa cobertura el mapa está en blanco, y el cuadro de estado lo indica.
- El sombreado MOLA OPM tiene baldosas nativas solo en el zoom 0–6; Leaflet escala z6 en la vista de Jezero. Hay un botón **Global overview** disponible para contexto planetario OPM.
- Las baldosas de detalle M20 son TMS. Las solicitudes XYZ devuelven 403, por lo que `tms: true` es requerido.
- La superposición de nombres de lugares está recortada al rectángulo de baldosa z12 medido porque el bounding box nominal de MMGIS incluye baldosas que devuelven 403.
- La superposición de pendiente y el planificador de rutas comparten el cultivo D1 de 12×12 km. Los puntos fuera de él son rechazados con un mensaje.
- F6 usa los últimos datos publicados de MEDA, no clima en tiempo real; el estado usa la temperatura mínima de la ventana EVA, la presión es solo información, y el viento está excluido.
- Las coordenadas de F7 son aproximadas; provienen del punto de ruta D5 en cada sol de ancla.
- F5 es un modelo de primer orden Minetti con un escalado de gravedad marciana de primer orden (3.71/9.81). No es un modelo de fisiología EVA validado.
- F8 compara contra un recorrido recortado a la grid de 12×12 km y simplificado porque el archivo recortado superó los 500 kB. El rover es una comprobación de cordura, no verdad de fondo: ruedas, peligros y objetivos científicos imponen diferentes restricciones.
- F9 sigue el camino de caminata de regreso de menor energía desde la posición seleccionada; no es una nueva búsqueda de tiempo óptimo.
- Las bandas de color, el factor de velocidad del traje, los umbrales de estado F6, los consumibles F5, la configuración de comparación F8 y la posición predeterminada F9 son supuestos del proyecto documentados en `src/config/assumptions.js`.

## Capturas de pantalla

No hay capturas de pantalla de la aplicación comprometidas en este repositorio aún. Una miniatura de YouTube está disponible en `public/youtube-thumbnail.png`. Para agregar capturas de pantalla al README, captura la aplicación en ejecución en `http://localhost:5173/` y coloca archivos PNG en `docs/screenshots/` o `public/`, luego refiéralos aquí.

## Inicio rápido

```bash
npm install
npm run dev
```

La aplicación se ejecuta en `http://localhost:5173/`. La superposición de pendiente necesita los archivos preprocesados F2; ya están presentes en `public/data/`. Para regenerarlos:

```powershell
python -m ensurepip --upgrade
python -m pip install rasterio
python preprocess/02_slope.py
```

Consulta `COMMANDS.md` para cada comando (configuración, desarrollo, construcción, verificación de baldosas, descarga de datos, preprocesamiento F2 y solución de problemas).

Construcción de producción:

```bash
npm run build
npm run preview
```

Verificación de baldosas (sonda cada capa en `src/config/layers.js` en el sitio de aterrizaje, zoom 6–19):

```bash
npm run check:tiles
```

Pruebas unitarias (Node.js integrado `node:test`, sin dependencias):

```bash
npm test
```

El script usa solo el `fetch` integrado de Node, duerme entre solicitudes, e imprime el estado HTTP, tipo de contenido, tamaño en bytes y dimensiones PNG para cada baldosa.

## Capas y fuentes del mapa

| Capa | Tipo | Predeterminada | Rango verificado | Fuente |
|------|------|-------------|------------------|--------|
| Mapa base OPM v0.1 | base | no | HTTP 200 z6–19 | OpenPlanetaryMap |
| Sombreado MOLA | base | no | HTTP 200 solo z6; 404 z7+ | NASA/MOLA, baldosas OPM |
| Jezero HiRISE en escala de grises (25 cm) | base | **sí** | HTTP 200 z0–18; 403 z19 | NASA Mars 2020 MMGIS |
| Jezero HiRISE a color (25 cm) | base | no | HTTP 200 z10–18; 403 fuera | NASA Mars 2020 MMGIS / pista del foro Posit |
| Nombres de lugares M20 | superposición | **sí** | HTTP 200 z4–18; 403 fuera | NASA Mars 2020 MMGIS |
| Pendiente (20 m) | superposición de imagen | **sí** | cultivo 600×600, 12×12 km | CTX DTM 20 m D1 |
| Recorrido de Perseverance | línea GeoJSON | **sí** | D5 recortado a 12×12 km | NASA/JPL-Caltech D5 |

Todas las capas de baldosas usan `noWrap: true`. El mapa está limitado a la grid de 12×12 km más 30 % de relleno, se abre ajustada a la grid, y no puede hacer zoom a una vista planetaria completa.

El registro de fuentes completo está en `src/config/sources.js`. El botón **Data & Credits** en la barra superior lo representa, junto con la tabla de supuestos.

## Usando el planificador de rutas

1. Haz clic en **Set start**, luego haz clic en el mapa.
2. Haz clic en **Add stop** para cada parada científica intermedia, luego haz clic en el mapa.
3. Haz clic en **Set destination**, luego haz clic en el mapa.
4. Haz clic en **Plan route**.

El panel de ruta muestra distancia, ascenso, descenso, pendiente máxima y la estimación de tiempo Tobler (con el factor de velocidad del traje asumido). Un SVG pequeño muestra el perfil de elevación. Las pendientes superiores a 30° y las celdas NoData están bloqueadas. Los puntos fuera de la grid de ruta de 12×12 km son rechazados con un mensaje.

Las paradas científicas son los seis marcadores numerados en el mapa. Haz clic en uno para abrir su tarjeta, luego **Add to route** para agregarlo como parada.

### Consumibles y caminata de regreso

El panel de ruta incluye un slider **Consumables at start** (20–100 %, predeterminado 100 %). Escala la capacidad de energía y O2 y la comprobación de caminata de regreso. Cada parada en la ruta añade 30 minutos de energía metabólica nominal (540 kJ) desde ese vértice en adelante.

Las barras de energía y O2 muestran valores usados, de capacidad y restantes. Un campo de costo a la base de Dijkstra inverso se calcula en un Web Worker; los segmentos de ruta inseguros se dibujan en rojo y el panel muestra el primer **punto de no retorno** con su energía restante, costo de regreso y margen.

El modelo F5 es de primer orden: costo de caminata Minetti 2002, 180 kg de tripulación + traje, y un escalado de gravedad marciana de primer orden (3.71/9.81). No es un modelo de fisiología EVA validado.

### Tiempo de ida y vuelta

El panel de ruta muestra el tiempo de caminata de ida, tiempo en paradas, y tiempo de caminata de regreso a base a lo largo del camino de caminata de regreso. Su suma se verifica contra la duración EVA asumida de 8 h y la ventana de luz diurna de 6 h (09:00–15:00 LMST); cualquier exceso se muestra como una advertencia visible.

### Comparación con Perseverance (F8)

Usa el interruptor **Perseverance traverse** en la parte inferior del mapa para mostrar u ocultar la línea D5 recortada. Con una ruta en pantalla, **Compare with Perseverance** informa media, mediana y distancia máxima al recorrido y el porcentaje de nuestra ruta dentro de 50, 100 y 200 m. También compara nuestra longitud con la longitud recorrida del rover entre los puntos de ruta más cercanos, muestra el ratio rover/nuestra longitud y señala que la longitud del rover incluye desvíos científicos y exploración.

El resultado también tiene una **tabla de pendientes Recorrido del rover vs nuestra ruta**: pendiente media, pendiente mediana, % por encima de 10°, % por encima de 20° y pendiente máxima, muestreada desde `slope.bin` cada 20 m. El botón **Landing → Three Forks (sol 674)** ejecuta esa ruta y su comparación en un clic.

El rover es una comprobación de cordura, no verdad de fondo: sus ruedas, peligros y objetivos científicos imponen diferentes restricciones.

### Regreso de emergencia (F9)

Cuando existe una ruta, el slider **Position along route** coloca un marcador magenta en la ruta. **Emergency: return to base** sigue el camino de predecesores desde ese punto hasta la base, lo dibuja con rayas en magenta, e informa distancia de regreso, tiempo de caminata, energía/O2 necesario y restante, y un estado **OK / NOT ENOUGH**. **Cancel emergency** elimina el camino de regreso.

## Cómo regenerar los datos

`preprocess/raw/` está git-ignorado, así que un clon reciente no contiene los conjuntos de datos de origen. Descarga estos archivos desde las URLs en `docs/DATASETS.md`:

| Archivo raw local | Conjunto de datos |
|---|---|
| `preprocess/raw/jezero_ctx_dtm_20m.tif` | CTX DTM 20 m D1 |
| `preprocess/raw/jezero_ctx_ortho_6m.tif` | CTX orthoimage 6 m D4 |
| `preprocess/raw/M20_traverse.json` | Traverso D5 |
| `preprocess/raw/M20_waypoints.json` | Puntos de ruta D5 |
| `preprocess/raw/meda/WE__1859...DER_PS...P01.CSV` | MEDA presión, sol 1859 D6 |
| `preprocess/raw/meda/WE__1859...CAL_ATS...P01.CSV` | MEDA temperatura del aire, sol 1859 D6 |
| `preprocess/raw/meda/WE__1859...CAL_RDS...P01.CSV` | MEDA radiación, sol 1859 D6 |
| `preprocess/raw/meda/WE__0313...DER_WS...P02.CSV` | MEDA viento, sol 313 D6 |

Los comandos `curl` exactos para todos los archivos están en `COMMANDS.md`.

Luego ejecuta el preprocesamiento y la aplicación:

```powershell
python -m ensurepip --upgrade
python -m pip install rasterio
python preprocess/02_slope.py
python preprocess/04_meda.py
python preprocess/03_science_stops.py
python preprocess/05_traverse.py
npm install
npm run dev
```

`public/data/` está versionado porque la aplicación sirve esos archivos procesados directamente. `preprocess/raw/` permanece local.

## Estado de los datos

Las descargas raw están en `preprocess/raw/` y están git-ignoradas:

| Archivo | Conjunto de datos | Bytes | Verificación |
|---|---|---:|---|
| `jezero_ctx_dtm_20m.tif` | CTX DTM 20 m D1 | 9,662,387 | TIFF, 1596 × 1512, float32 |
| `jezero_ctx_ortho_6m.tif` | CTX ortho 6 m D4 | 36,269,402 | TIFF, 5322 × 5040, 8-bit |
| `M20_traverse.json` | Traverso D5 | 1,723,218 | GeoJSON, 559 features |
| `M20_waypoints.json` | Puntos de ruta D5 | 603,126 | GeoJSON, 708 features |

Metadatos D1: Equirectangular Mars 2000 Sphere IAU, R = 3,396,190 m, 20 m/px, lon 77.160465–77.698975 E, lat 18.211027–18.721194 N, elevación −2710.70 a −1515.54 m, NoData −3.4028e38. El sitio de aterrizaje está dentro del ráster.

Los archivos procesados F2 están en `public/data/` e incluidos en la construcción de producción:

| Archivo | Tamaño | Contenido |
|---|---:|---|
| `slope.png` | 20,130 B | Superposición RGBA de pendiente, 600×600 |
| `slope.bin` | 1,440,000 B | Cuadrícula Float32 de pendiente, 600×600 |
| `elevation.bin` | 1,440,000 B | Cuadrícula Float32 de elevación, 600×600 |
| `grid.json` | 2,806 B | límites, forma, tamaño de celda, NoData, bandas y estadísticas |
| `conditions.json` | 3,698 B | Condiciones MEDA F6, 24 promedios horarios ATS, viento sol 313 |
| `science_stops.geojson` | 6,661 B | Seis paradas científicas aproximadas F7 |
| `traverse.geojson` | 107,593 B | Traverso D5 recortado y simplificado F8 |
| `waypoints.geojson` | 152,143 B | 517 puntos de ruta D5 dentro de la grid F8 |

El cultivo es lon 77.2775475–77.4799947 E, lat 18.3638751–18.5663223 N. NoData es 0 %. Estadísticas de pendiente: min 0.0058°, max 37.7237°, media 5.8571°; el 18.37 % de las celdas están por encima de 10°, el 2.78 % por encima de 20°, y el 0.0381 % por encima de 30°. La elevación en el cultivo es −2621.00 a −1741.16 m. Todas las celdas de las seis paradas F7 son válidas (no NoData).

El traverso raw D5 es 1,010,195 B después del recorte, por encima del umbral de 500 kB; `preprocess/05_traverse.py` lo simplifica a 107,593 B con una tolerancia de 5 m. Los puntos de ruta mantienen `sol` y `dist_total_m` para la comparación de longitud del rover.

## Prerrequisitos de preprocesamiento

F1 no necesita Python. F2/F6/F7 sí. En esta máquina Windows:

- Python 3.13.5, NumPy 2.2.2 y Pillow 11.1.0 están presentes.
- `pip` y `rasterio` 1.5.2 están instalados.
- La CLI de GDAL es opcional y aún falta.

Instala o actualiza las herramientas de Python:

```powershell
python -m ensurepip --upgrade
python -m pip install rasterio
python -c "import rasterio; print(rasterio.__version__)"
```

Regenera los datos derivados:

```powershell
python preprocess/02_slope.py
python preprocess/04_meda.py
python preprocess/03_science_stops.py
python preprocess/05_traverse.py
```

Los CSVs raw de MEDA deben estar presentes en `preprocess/raw/meda/`; los comandos de descarga están en `COMMANDS.md`.

GDAL solo se necesita para la salida literal de `gdalinfo -stats` o futuros flujos de trabajo de GDAL:

```powershell
winget install --id GISInternals.GDAL -e --accept-source-agreements --accept-package-agreements
```

Abre una nueva terminal después y verifica `gdalinfo --version`. QGIS LTR es una alternativa (`winget install --id OSGeo.QGIS_LTR -e`) e incluye GDAL en su shell OSGeo4W.

## Estructura del proyecto

```
COMMANDS.md            Cada comando de configuración/ejecución/construcción/verificación/preprocesamiento.
docs/                  Referencia de requisitos y conjuntos de datos.
preprocess/            Canalización Python offline: 02_slope, 03_science_stops, 04_meda, 05_traverse.
preprocess/raw/        Descargas raw git-ignoradas, incluyendo CSV de MEDA.
public/data/           Salidas procesadas F2/F6/F7/F8 servidas por la aplicación.
scripts/check_tiles.mjs  npm run check:tiles.
src/config/            capas, fuentes, supuestos, presets y bandas de pendiente.
src/context/           MapContext y RouteContext.
src/lib/               distancias marsGeo, cargador de grid, A*, trabajador walkback, esfuerzo, comparar y stubs.
src/components/        MapView, SlopePanel, RoutePanel, ConditionsPanel, ScienceStops, ScienceCard, TraverseLayer, Credits.
```

## Geometría marciana

Todas las distancias geográficas pasan por `src/lib/marsGeo.js`, usando el radio medio de Marte **3389.5 km**. `map.distance()` y `L.control.scale` de Leaflet están basados en la Tierra y no deben usarse.

## Próximo paso

F1–F9 y F12 están implementados. F10, F11, F13, F14 y F15 no se han iniciado.
El repositorio está inicializado en GitHub (LeonAntGon/marswall-planner) con confirmaciones en `main`. Trabajo pendiente: despliegue público (Vercel/Netlify) y la lista de verificación de envío del NASA Space Apps.