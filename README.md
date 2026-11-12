# 🚀 NASA MISSION 1962: Mercury-Atlas & El Desafío del Ascenso Vertical
### Simulación Numérica, Solución Analítica y Análisis de Convergencia

**Autora:** Serrano Mamani Raquel Araceli  
**Materia / Área:** Métodos Numéricos / Física Computacional y Modelado Matemático  
**Fecha:** Noviembre 2026  
**Proyecto:** *Desafío de Lanzamiento de Cohete — Mercury Mission 1962*  

---

## 📋 Tabla de Contenidos
1. [Contexto Histórico y Misión](#-contexto-histórico-y-misión)
2. [Fundamentación Matemática y Física](#-fundamentación-matemática-y-física)
3. [Solución Analítica Exacta](#-solución-analítica-exacta)
4. [Métodos Numéricos Implementados](#-métodos-numéricos-implementados)
5. [Estructura del Proyecto y Arquitectura](#-estructura-del-proyecto-y-arquitectura)
6. [Instrucciones de Uso y Ejecución](#-instrucciones-de-uso-y-ejecución)
7. [Suite de Pruebas Automatizadas](#-suite-de-pruebas-automatizadas)
8. [Resultados Numéricos Clave](#-resultados-numéricos-clave)
9. [Créditos y Licencias](#-créditos-y-licencias)

---

## 🏛 Contexto Histórico y Misión

A inicios de la década de 1960, durante la cúspide de la carrera espacial, la NASA enfrentó el desafío monumental de colocar al primer estadounidense en órbita terrestre: la misión **Mercury-Atlas 6 (Friendship 7)**, tripulada por **John Glenn** el **20 de febrero de 1962**.

Detrás de este éxito histórico se encontraba el equipo pionero de la División de Investigación de Guía y Control en el Centro de Investigación de Langley:
- **Katherine Johnson:** Matemática extraordinaria cuyos cálculos manuales de trayectorias, ventanas de lanzamiento y órbitas elípticas de emergencia fueron requeridos personalmente por John Glenn para verificar las salidas de los nuevos ordenadores electrónicos IBM 7090 antes de autorizar el despegue.
- **Dorothy Vaughan:** Pionera informática y primera supervisora afroamericana de la NACA/NASA, quien lideró la transición del cálculo manual hacia la programación en FORTRAN de los mainframes.
- **Mary Jackson:** Primera ingeniera aeroespacial afroamericana de la NASA, experta en dinámica de fluidos y aerodinámica en túneles de viento de alta velocidad.
- Su legado colectivo fue magistralmente retratado en el libro y película ***Talentos Ocultos* (*Hidden Figures*)**.

### ⚠️ Distinción Metodológica Fundamental: Modelo Didáctico vs. Vuelo Real
Es crucial distinguir la naturaleza pedagógica de este proyecto frente a la balística espacial real:
1. **La Simulación del Desafío (Este Proyecto):** Modela el ascenso vertical en una sola dimensión ($1\text{D}$) de un cohete experimental de $1.000\text{ kg}$ sometido a arrastre atmosférico lineal ($F_d = kv$) durante sus primeros $20\text{ segundos}$ de vuelo a baja cota.
2. **La Misión Real Mercury-Atlas:** El lanzador Atlas LV-3B pesaba más de $120\text{ toneladas}$, consumía toneladas de propelente por segundo (masa fuertemente decreciente), experimentaba resistencia cuadrática compresible ($v^2$, número de Mach, presión dinámica Max-Q) y seguía una trayectoria gravitacional curvada tridimensional hasta alcanzar la velocidad orbital de $\approx 7.840\text{ m/s}$ ($28.000\text{ km/h}$). La NASA real no empleó el método de Euler para el vuelo orbital debido a su inestabilidad y acumulación de error, sino algoritmos de orden superior como **Runge-Kutta de 4º orden (RK4)**, métodos multipaso de **Adams-Bashforth / Adams-Moulton** y técnicas de perturbación orbital de **Cowell y Encke**.

---

## ⚙️ Fundamentación Matemática y Física

### 1. Fuerzas en Juego
Durante el ascenso vertical ($y \ge 0$), el cohete está sometido a tres fuerzas concurrentes:
1. **Fuerza de Empuje del Motor ($T$):** Constante y dirigida verticalmente hacia arriba ($+y$).
2. **Fuerza de Gravedad / Peso ($P = mg$):** Constante en baja atmósfera, dirigida verticalmente hacia abajo ($-y$).
3. **Fuerza de Resistencia Aerodinámica ($F_d = kv$):** Fuerza disipativa opuesta al vector velocidad.

Aplicando la **Segunda Ley de Newton**:
$$\Sigma F = T - mg - kv = m \cdot a(t) = m \frac{dv}{dt}$$

Despejando la derivada de la velocidad y expresando la posición como derivada:
$$\frac{dv}{dt} = \frac{T}{m} - g - \frac{k}{m}v$$
$$\frac{dy}{dt} = v$$

### 2. Parámetros Nominales del Desafío
* Masa inicial ($m$): $1.000\text{ kg}$
* Empuje constante ($T$): $15.000\text{ N}$
* Aceleración gravitatoria ($g$): $9{,}81\text{ m/s}^2$
* Coeficiente de arrastre lineal ($k$): $100\text{ kg/s}$
* Condiciones iniciales: $v(0) = 0\text{ m/s}$, $y(0) = 0\text{ m}$
* Intervalo de simulación: $t \in [0, 20]\text{ s}$
* Tamaño de paso inicial de estudio: $h = 2\text{ s}$

Sustituyendo los valores nominales en la ecuación diferencial:
$$\frac{dv}{dt} = \frac{15.000}{1.000} - 9{,}81 - \frac{100}{1.000}v = 15 - 9{,}81 - 0{,}1v$$
$$\frac{dv}{dt} = 5{,}19 - 0{,}1v$$

* **Aceleración inicial:** $a(0) = 5{,}19\text{ m/s}^2$
* **Velocidad terminal asintótica:** Al anularse la aceleración ($dv/dt = 0$), $v_\infty = \frac{5{,}19}{0{,}1} = 51{,}9\text{ m/s}$.

---

## 📐 Solución Analítica Exacta

### 1. Resolución por Separación de Variables
Reescribiendo la ecuación diferencial:
$$\frac{dv}{5{,}19 - 0{,}1v} = dt$$

Integrando ambos miembros:
$$\int \frac{dv}{5{,}19 - 0{,}1v} = \int dt \implies -10 \ln|5{,}19 - 0{,}1v| = t + C_1$$
$$\ln|5{,}19 - 0{,}1v| = -0{,}1t - \frac{C_1}{10} \implies 5{,}19 - 0{,}1v = A e^{-0{,}1t}$$

Aplicando la condición inicial $v(0) = 0$:
$$5{,}19 - 0{,}1(0) = A \implies A = 5{,}19$$
$$0{,}1v(t) = 5{,}19 \left(1 - e^{-0{,}1t}\right) \implies v(t) = 51{,}9 \left(1 - e^{-0{,}1t}\right)$$

### 2. Posición $y(t)$
Integrando la velocidad con respecto al tiempo:
$$y(t) = \int_0^t v(\tau) d\tau = 51{,}9 \int_0^t \left(1 - e^{-0{,}1\tau}\right) d\tau$$
$$y(t) = 51{,}9 \left[ t + \frac{e^{-0{,}1t} - 1}{0{,}1} \right] = 51{,}9t - 519 \left(1 - e^{-0{,}1t}\right)$$

### 3. Evaluación a los $20\text{ segundos}$
* **Velocidad exacta:**
  $$v(20) = 51{,}9 \left(1 - e^{-2}\right) \approx 51{,}9(1 - 0{,}13533528) \approx \mathbf{44{,}8761\text{ m/s}}$$
* **Altura exacta:**
  $$y(20) = 51{,}9(20) - 519 \left(1 - e^{-2}\right) = 1.038 - 448{,}7610 \approx \mathbf{589{,}2390\text{ m}}$$

### 4. Generalización y Tratamiento de Casos Frontera
El módulo [`js/mathematics.js`](file:///c:/Users/raque/OneDrive/Documentos/DesafioLanzamientoCohete/js/mathematics.js) implementa la solución general con parámetros libres:
$$a = \frac{T}{m} - g, \quad b = \frac{k}{m}$$
- **Caso general ($b \ne 0$):**
  $$v(t) = v_0 e^{-bt} + \frac{a}{b}\left(1 - e^{-bt}\right)$$
  $$y(t) = y_0 + \frac{v_0}{b}\left(1 - e^{-bt}\right) + \frac{a}{b}\left[t - \frac{1 - e^{-bt}}{b}\right]$$
- **Caso sin arrastre ($k = 0 \implies |b| < 10^{-12}$):**
  $$v(t) = v_0 + at, \quad y(t) = y_0 + v_0 t + \frac{1}{2}at^2$$
  *Resultado a los $20\text{ s}$ con $k=0$:* $v(20) = 103{,}8\text{ m/s}$; $y(20) = 1.038{,}0\text{ m}$ (sin `NaN` ni divisiones por cero).
- **Caso cohete sobre la plataforma ($T \le mg$):** Si el empuje es insuficiente para vencer el peso, la aceleración neta ascendente es nula y el cohete permanece en reposo ($y=0, v=0, a=0$) respetando la física de la superficie terrestre.

---

## 💻 Métodos Numéricos Implementados

### 1. Método de Euler (Regla Estricta de Simultaneidad)
Dado el vector de estado $X = [y, v]^T$, las variables se actualizan simultáneamente usando los valores del inicio del intervalo:
$$y_{n+1} = y_n + h \cdot v_n$$
$$v_{n+1} = v_n + h \cdot a_n = v_n + h \left(\frac{T}{m} - g - \frac{k}{m}v_n\right)$$

> **Nota Didáctica sobre $y(2) = 0$:**  
> Como $v(0) = 0$, la regla de simultaneidad calcula $y(2) = y(0) + 2 \cdot v(0) = 0 + 0 = 0\text{ m}$. El cohete no comienza a despegar visualmente en la posición discretizada hasta el paso siguiente, lo cual ilustra con gran claridad el error de discretización característico de Euler.

### 2. Método de Heun (Predictor-Corrector de 2º Orden)
$$\mathbf{k}_1 = \mathbf{F}(t_n, \mathbf{X}_n)$$
$$\mathbf{X}_{\text{pred}} = \mathbf{X}_n + h \cdot \mathbf{k}_1$$
$$\mathbf{k}_2 = \mathbf{F}(t_n + h, \mathbf{X}_{\text{pred}})$$
$$\mathbf{X}_{n+1} = \mathbf{X}_n + \frac{h}{2} (\mathbf{k}_1 + \mathbf{k}_2)$$
*Resultado en $t=2\text{ s}$ ($h=2$):* $v(2) = 9{,}3420\text{ m/s}$, $y(2) = 10{,}3800\text{ m}$.

### 3. Método de Runge-Kutta de 4º Orden (RK4)
$$\mathbf{k}_1 = \mathbf{F}(t_n, \mathbf{X}_n)$$
$$\mathbf{k}_2 = \mathbf{F}\left(t_n + \frac{h}{2}, \mathbf{X}_n + \frac{h}{2}\mathbf{k}_1\right)$$
$$\mathbf{k}_3 = \mathbf{F}\left(t_n + \frac{h}{2}, \mathbf{X}_n + \frac{h}{2}\mathbf{k}_2\right)$$
$$\mathbf{k}_4 = \mathbf{F}(t_n + h, \mathbf{X}_n + h\mathbf{k}_3)$$
$$\mathbf{X}_{n+1} = \mathbf{X}_n + \frac{h}{6} (\mathbf{k}_1 + 2\mathbf{k}_2 + 2\mathbf{k}_3 + \mathbf{k}_4)$$
*Resultado en $t=2\text{ s}$ ($h=2$):* $v(2) \approx 9{,}4077\text{ m/s}$ (prácticamente indistinguible de la solución exacta: error $< 0{,}0002\text{ m/s}$ en $t=20\text{ s}$).

---

## 📂 Estructura del Proyecto y Arquitectura

```text
DesafioLanzamientoCohete/
│
├── index.html                   # Interfaz interactiva principal (12 secciones integradas)
├── tests.html                   # Visor gráfico interactivo de la suite de pruebas unitarias
├── tests.js                     # Suite automatizada pura para ejecución en consola (Node.js)
├── README.md                    # Documentación técnica, académica y manual de usuario
│
├── css/
│   └── styles.css               # Estilos visuales retro-espaciales NASA 1962, consola CRT y responsive
│
└── js/
    ├── app.js                   # Coordinador central de reactividad, eventos y tablas dinámicas
    ├── mathematics.js           # Solución analítica exacta, integrales y tratamiento de límites
    ├── numerical-methods.js     # Implementación de Euler, Heun, RK4 y exportador CSV
    ├── charts.js                # Renderizado de 4 gráficas interactivas con Chart.js
    ├── simulation.js            # Motor del simulador SVG con telemetría en tiempo real
    └── evaluation.js            # Sistema evaluativo (12 reactivos), rúbrica y actas en PDF/HTML
```

### Detalle de Módulos de Software
* **`index.html`:** Estructurado en 12 secciones secuenciales:
  1. *Panel de Misión y Cabecera Histórica*
  2. *Contexto Histórico y Científicas de Langley*
  3. *Parámetros del Desafío y Formulario Interactivo*
  4. *Modelo Físico y Deducción de Ecuaciones*
  5. *Simulación con Método de Euler*
  6. *Solución Analítica Exacta y Demostración Teórica*
  7. *Desafío de Precisión y Tabla de Convergencia*
  8. *Métodos Numéricos Avanzados (Heun y RK4)*
  9. *Gráficas Comparativas y Análisis de Errores*
  10. *Simulador Animado de Lanzamiento en SVG*
  11. *Evaluación Teórico-Práctica del Cadete*
  12. *Reflexión Final, Bitácora y Conclusiones*
* **`js/mathematics.js`:** Expone `velocidadExacta(t, p)`, `alturaExacta(t, p)` y `aceleracionExacta(t, p)`. Maneja divisiones por cero con tolerancia $|b| < 10^{-12}$ y condiciones en plataforma de lanzamiento.
* **`js/numerical-methods.js`:** Algoritmos puros de integración numérica. Devuelve arreglos estructurados `{t, y, v, a}` y provee `exportSimulationToCSV()` en cumplimiento del estándar RFC 4180.
* **`js/charts.js`:** Gestiona cuatro lienzos Chart.js independientes (Velocidad, Altura, Error Absoluto de Velocidad y Error Absoluto de Altura). Destruye limpiamente instancias anteriores (`chart.destroy()`) para prevenir fugas de memoria.
* **`js/simulation.js`:** Anima la escena vectorial SVG (`#launchPadSVG`). Utiliza interpolación lineal continua entre pasos discretos rotulada visiblemente: *"Interpolación visual entre pasos; no es un cálculo nuevo"*.
* **`js/evaluation.js`:** Motor de autoevaluación interactiva con 12 reactivos clasificados en 5 tipologías. Las respuestas numéricas son calculadas dinámicamente en tiempo de ejecución. Permite descargar el acta oficial en HTML autónomo o imprimir a PDF.
* **`js/app.js`:** Enlaza el estado global, actualiza tablas de convergencia, valida entradas del usuario ($m > 0, h > 0, t \ge 0$) y gestiona la persistencia de respuestas en `sessionStorage`.

---

## 🚀 Instrucciones de Uso y Ejecución

### Opción A: Visualización Rápida en el Navegador
1. Clona o descarga el repositorio en tu equipo.
2. Abre directamente el archivo [`index.html`](file:///c:/Users/raque/OneDrive/Documentos/DesafioLanzamientoCohete/index.html) en cualquier navegador web moderno (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
3. No requiere instalación de paquetes, compilación ni servidores backend.

### Opción B: Ejecución con Servidor Local (Recomendado para desarrollo)
Si dispones de Python o Node.js:
```bash
# Con Python 3:
python -m http.server 8080

# Con Node.js (npx):
npx serve .
```
Luego abre tu navegador en `http://localhost:8080`.

---

## 🧪 Suite de Pruebas Automatizadas

El proyecto cuenta con un sistema de verificación formal dual para garantizar la precisión numérica y la solidez técnica:

### 1. Ejecución en Consola (Node.js)
Ejecuta la suite en cualquier terminal:
```bash
node tests.js
```
**Resultado de la ejecución:**
```text
================================================================================
 NASA MISSION 1962 — AUDITORÍA Y SUITE DE PRUEBAS AUTOMATIZADAS
================================================================================
...
✔ [PASS] Aceleración inicial teórica a(0) = 5,19 m/s²
✔ [PASS] Euler v(20) coincide exactamente con 46,32727993344 m/s
✔ [PASS] Euler y(20) coincide exactamente con 574,7272006656 m
✔ [PASS] Euler Iteración 1: v(2) = 10,38 m/s | y(2) = 0,00 m (Simultaneidad)
✔ [PASS] Solución Analítica v(20) ≈ 44,8761 m/s | y(20) ≈ 589,2390 m
✔ [PASS] Convergencia lineal O(h): err(h=1)/err(h=2) ≈ 0,5 (reducción del 50,8%)
✔ [PASS] Heun v(2) = 9,3420 m/s | y(2) = 10,3800 m
✔ [PASS] RK4 error final < 0,003 m/s (0,000221 m/s)
✔ [PASS] Frontera k = 0 sin NaN: v(20) = 103,8 m/s | y(20) = 1038,0 m
✔ [PASS] Plataforma T = 5000 N: y = 0, v = 0, a = 0 (sin penetración de suelo)

================================================================================
 RESULTADO FINAL DE LA SUITE DE PRUEBAS:
 Pruebas ejecutadas: 27
 Superadas: 27 (100%)
 Falladas:  0
================================================================================
```

### 2. Visor Gráfico en Navegador
Abre [`tests.html`](file:///c:/Users/raque/OneDrive/Documentos/DesafioLanzamientoCohete/tests.html) en tu navegador para inspeccionar cada prueba de manera interactiva con indicadores de estado e insignias visuales.

---

## 📊 Resultados Numéricos Clave

### Tabla de Convergencia del Método de Euler a los $20\text{ segundos}$

| Paso $h$ | Iteraciones | Velocidad $v(20)$ [m/s] | Error Velocidad [m/s] | Altura $y(20)$ [m] | Error Altura [m] | Cumple Criterio de Precisión ($E_v < 0{,}5; E_y < 5$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **$2{,}00\text{ s}$** | 10 | $46{,}3273$ | $1{,}4512$ | $574{,}7272$ | $14{,}5118$ | ✘ Insuficiente |
| **$1{,}00\text{ s}$** | 20 | $45{,}5902$ | $0{,}7141$ | $582{,}0983$ | $7{,}1407$ | ✘ Insuficiente |
| **$0{,}50\text{ s}$** | 40 | $45{,}2302$ | $0{,}3541$ | $585{,}6978$ | $3{,}5412$ | ✔ **Precisión alcanzada** |
| **$0{,}25\text{ s}$** | 80 | $45{,}0524$ | $0{,}1763$ | $587{,}4757$ | $1{,}7633$ | ✔ **Precisión alcanzada** |
| **Exacta** | $\infty$ | **$44{,}8761$** | **$0{,}0000$** | **$589{,}2390$** | **$0{,}0000$** | — Referencia Teórica — |

### Conclusiones Principales
1. **Comprobación del Orden de Convergencia:** Al dividir el paso $h$ entre 2 ($2 \to 1 \to 0{,}5 \to 0{,}25$), el error absoluto se reduce aproximadamente a la mitad ($50{,}8\%$). Esto confirma empíricamente que el método de Euler es de **primer orden global $\mathcal{O}(h)$**.
2. **Superioridad de los Métodos de Orden Superior:** Con el mismo paso de $h = 2\text{ s}$, el método de **RK4** alcanza un error de velocidad de tan solo $0{,}000221\text{ m/s}$ frente a los $1{,}4512\text{ m/s}$ de Euler, lo que representa una ganancia de precisión de más de 6.000 veces.
3. **Lección de Ingeniería Aeroespacial:** Los cálculos de vuelo y trayectorias espaciales tripuladas no admiten márgenes de error acumulados por métodos de bajo orden con pasos grandes; de haberse empleado Euler con $h=2\text{ s}$ en una reentrada atmosférica o inserción orbital, las desviaciones de cientos de metros habrían resultado en una catástrofe para la misión.

---

## 📜 Créditos y Licencias

* **Desarrollo y Autoría:** Serrano Mamani Raquel Araceli.
* **Fotografías Históricas:**
  - *Katherine Johnson en NASA Langley (1966):* NASA / Wikimedia Commons (Dominio Público).
  - *Centro de Control de Operaciones del Proyecto Mercury en Cabo Cañaveral (1962):* NASA / Wikimedia Commons (Dominio Público).
  - *Despegue del Atlas LV-3B con Friendship 7 (20/02/1962):* NASA / Wikimedia Commons (Dominio Público).
* **Bibliotecas de Terceros (CDN):**
  - [MathJax v3](https://www.mathjax.org/): Motor de renderizado tipográfico para fórmulas matemáticas TeX/LaTeX.
  - [Chart.js v4](https://www.chartjs.org/): Motor de renderizado para visualización de datos en `<canvas>`.
* **Licencia de Código:** Proyecto de código abierto con fines académicos y pedagógicos bajo Licencia MIT.

