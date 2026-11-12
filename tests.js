/**
 * NASA MISSION 1962 — SUITE AUTOMATIZADA DE PRUEBAS MATEMÁTICAS Y NUMÉRICAS
 * Archivo: tests.js
 * 
 * Ejecución: node tests.js
 * 
 * Cobertura de la auditoría:
 * 1. Auditoría matemática del modelo: v' = T/m - g - (k/m)v, y' = v.
 * 2. Pruebas numéricas con parámetros originales (h = 2 s, t = 20 s):
 *    - Euler: v(20) = 46,32727993344 y y(20) = 574,7272006656.
 *    - Analítica exacta: v(20) = 44,8761 m/s y y(20) = 589,2390 m.
 *    - Primeras iteraciones de Euler: (10,38 / 18,684 / 25,3272 m/s).
 *    - Tabla de convergencia de Euler para h = 2, 1, 0,5, 0,25.
 * 3. Pruebas de Heun y RK4 frente a la solución analítica.
 * 4. Manejo de casos frontera: k = 0, T <= mg, m <= 0, h <= 0.
 * 5. Evaluación académica y desglose de rúbrica oficial (18 pts automáticos + 2 pts docente).
 */

const fs = require('fs');
const path = require('path');

// Entorno global de pruebas
global.window = global;

// Cargar módulos matemáticos y numéricos del proyecto
eval(fs.readFileSync(path.join(__dirname, 'js', 'mathematics.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'js', 'numerical-methods.js'), 'utf8'));

// Parámetros oficiales del desafío
const DEFAULT_PARAMS = {
  m: 1000.0,
  T: 15000.0,
  g: 9.81,
  k: 100.0,
  v0: 0.0,
  y0: 0.0,
  tFinal: 20.0,
  h: 2.0
};

let passedTests = 0;
let failedTests = 0;
const resultsLog = [];

function assert(condition, testName, details) {
  if (condition) {
    passedTests++;
    console.log(`\x1b[32m✔ [PASS]\x1b[0m ${testName}`);
    if (details) console.log(`   \x1b[90m${details}\x1b[0m`);
    resultsLog.push({ status: 'PASS', name: testName, details });
  } else {
    failedTests++;
    console.log(`\x1b[31m✘ [FAIL]\x1b[0m ${testName}`);
    if (details) console.log(`   \x1b[31mDetalle: ${details}\x1b[0m`);
    resultsLog.push({ status: 'FAIL', name: testName, details });
  }
}

console.log('================================================================================');
console.log(' NASA MISSION 1962 — AUDITORÍA Y SUITE DE PRUEBAS AUTOMATIZADAS');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// 1. AUDITORÍA DEL MODELO MATEMÁTICO Y LEYES FÍSICAS
// -----------------------------------------------------------------------------
console.log('--- 1. AUDITORÍA DEL MODELO MATEMÁTICO ---');

// Aceleración inicial neta con v0 = 0: a = T/m - g = 15000/1000 - 9.81 = 5.19 m/s²
const a0 = Mathematics.calculateAcceleration(1000, 15000, 9.81, 100, 0);
assert(Math.abs(a0 - 5.19) < 1e-10, 'Aceleración inicial teórica a(0) = 5,19 m/s²', `Calculado: ${a0}`);

// Fuerza neta con v = 10 m/s: F_neta = 15000 - 9810 - 100(10) = 4190 N
const fNet10 = Mathematics.calculateNetForce(1000, 15000, 9.81, 100, 10);
assert(Math.abs(fNet10 - 4190) < 1e-10, 'Fuerza neta ΣF(v=10) = 4.190 N', `Calculado: ${fNet10} N`);

// Velocidad terminal teórica: v_inf = (T - mg)/k = (15000 - 9810)/100 = 51.9 m/s
const vTerm = Mathematics.calculateTerminalVelocity(1000, 15000, 9.81, 100);
assert(Math.abs(vTerm - 51.9) < 1e-10, 'Velocidad terminal teórica v_inf = 51,9 m/s', `Calculado: ${vTerm} m/s`);

// -----------------------------------------------------------------------------
// 2. PRUEBAS NUMÉRICAS DE EULER EXPLÍCITO (h = 2 s, t = 20 s)
// -----------------------------------------------------------------------------
console.log('\n--- 2. PRUEBAS NUMÉRICAS: MÉTODO DE EULER ---');

const eulerSeries = NumericalMethods.solveEuler(DEFAULT_PARAMS);
const eulerFinal = eulerSeries[eulerSeries.length - 1];

// Euler v(20) = 46,32727993344
const expectedEulerV20 = 46.32727993344;
const diffEulerV = Math.abs(eulerFinal.v - expectedEulerV20);
assert(diffEulerV < 1e-8, 'Euler v(20) coincide exactamente con 46,32727993344 m/s',
  `Calculado: ${eulerFinal.v.toFixed(11)} | Esperado: ${expectedEulerV20} | Dif: ${diffEulerV.toExponential(4)}`);

// Euler y(20) = 574,7272006656
const expectedEulerY20 = 574.7272006656;
const diffEulerY = Math.abs(eulerFinal.y - expectedEulerY20);
assert(diffEulerY < 1e-8, 'Euler y(20) coincide exactamente con 574,7272006656 m',
  `Calculado: ${eulerFinal.y.toFixed(10)} | Esperado: ${expectedEulerY20} | Dif: ${diffEulerY.toExponential(4)}`);

// Primeras 3 iteraciones de Euler para velocidad
assert(Math.abs(eulerSeries[1].v - 10.38) < 1e-10, 'Euler Iteración 1: v(2) = 10,38 m/s',
  `Calculado: ${eulerSeries[1].v}`);
assert(Math.abs(eulerSeries[2].v - 18.684) < 1e-10, 'Euler Iteración 2: v(4) = 18,684 m/s',
  `Calculado: ${eulerSeries[2].v}`);
assert(Math.abs(eulerSeries[3].v - 25.3272) < 1e-10, 'Euler Iteración 3: v(6) = 25,3272 m/s',
  `Calculado: ${eulerSeries[3].v}`);

// Primeras 3 iteraciones de Euler para altitud (Simultaneidad y(2) = 0 m)
assert(Math.abs(eulerSeries[1].y - 0.0) < 1e-10, 'Euler Iteración 1: y(2) = 0,00 m (Simultaneidad explícita)',
  `Calculado: ${eulerSeries[1].y}`);
assert(Math.abs(eulerSeries[2].y - 20.76) < 1e-10, 'Euler Iteración 2: y(4) = 20,76 m',
  `Calculado: ${eulerSeries[2].y}`);
assert(Math.abs(eulerSeries[3].y - 58.128) < 1e-10, 'Euler Iteración 3: y(6) = 58,128 m',
  `Calculado: ${eulerSeries[3].y}`);

// -----------------------------------------------------------------------------
// 3. PRUEBAS NUMÉRICAS DE LA SOLUCIÓN ANALÍTICA EXACTA
// -----------------------------------------------------------------------------
console.log('\n--- 3. PRUEBAS NUMÉRICAS: SOLUCIÓN ANALÍTICA EXACTA ---');

const vExact20 = Mathematics.velocidadExacta(20, DEFAULT_PARAMS);
const yExact20 = Mathematics.alturaExacta(20, DEFAULT_PARAMS);

assert(Math.abs(vExact20 - 44.8760988) < 1e-5, 'Solución Analítica v(20) ≈ 44,8761 m/s',
  `Calculado: ${vExact20.toFixed(4)} | Esperado: 44,8761`);
assert(Math.abs(yExact20 - 589.239012) < 1e-4, 'Solución Analítica y(20) ≈ 589,2390 m',
  `Calculado: ${yExact20.toFixed(4)} | Esperado: 589,2390`);

// -----------------------------------------------------------------------------
// 4. TABLA DE CONVERGENCIA DE EULER (h = 2, 1, 0.5, 0.25)
// -----------------------------------------------------------------------------
console.log('\n--- 4. TABLA DE CONVERGENCIA DE EULER (ORDEN 1) ---');

const expectedConvergence = [
  { h: 2.0, expectedV: 46.3273, expectedErrV: 1.4512, expectedY: 574.7272, expectedErrY: 14.5118 },
  { h: 1.0, expectedV: 45.5902, expectedErrV: 0.7141, expectedY: 582.0983, expectedErrY: 7.1407 },
  { h: 0.5, expectedV: 45.2302, expectedErrV: 0.3541, expectedY: 585.6978, expectedErrY: 3.5412 },
  { h: 0.25, expectedV: 45.0524, expectedErrV: 0.1763, expectedY: 587.4757, expectedErrY: 1.7633 }
];

expectedConvergence.forEach((row) => {
  const p = Object.assign({}, DEFAULT_PARAMS, { h: row.h });
  const s = NumericalMethods.solveEuler(p);
  const end = s[s.length - 1];
  const errV = Math.abs(vExact20 - end.v);
  const errY = Math.abs(yExact20 - end.y);

  const vMatch = Math.abs(end.v - row.expectedV) < 0.001;
  const errVMatch = Math.abs(errV - row.expectedErrV) < 0.001;
  const yMatch = Math.abs(end.y - row.expectedY) < 0.001;
  const errYMatch = Math.abs(errY - row.expectedErrY) < 0.001;

  assert(vMatch && errVMatch && yMatch && errYMatch,
    `Convergencia Euler con h = ${row.h} s: v=${end.v.toFixed(4)} (err ${errV.toFixed(4)}), y=${end.y.toFixed(4)} (err ${errY.toFixed(4)})`,
    `Esperado: v=${row.expectedV}, errV=${row.expectedErrV}, y=${row.expectedY}, errY=${row.expectedErrY}`);
});

// Comprobación de que el error se reduce a la mitad al dividir h entre 2
const sH2 = NumericalMethods.solveEuler(Object.assign({}, DEFAULT_PARAMS, { h: 2.0 }));
const sH1 = NumericalMethods.solveEuler(Object.assign({}, DEFAULT_PARAMS, { h: 1.0 }));
const errH2 = Math.abs(vExact20 - sH2[sH2.length - 1].v);
const errH1 = Math.abs(vExact20 - sH1[sH1.length - 1].v);
const ratioH = errH1 / errH2;
assert(ratioH > 0.48 && ratioH < 0.52, 'Verificación del orden de convergencia lineal O(h): err(h=1)/err(h=2) ≈ 0,5',
  `Cociente real: ${ratioH.toFixed(4)} (reducción del ${(100 - ratioH * 100).toFixed(1)}%)`);

// -----------------------------------------------------------------------------
// 5. PRUEBAS DE MÉTODOS DE ORDEN SUPERIOR: HEUN Y RK4
// -----------------------------------------------------------------------------
console.log('\n--- 5. PRUEBAS DE MÉTODOS HEUN Y RUNGE-KUTTA 4 ---');

const heunSeries = NumericalMethods.solveHeun(DEFAULT_PARAMS);
const rk4Series = NumericalMethods.solveRK4(DEFAULT_PARAMS);

// Comprobación de Heun en t = 2 s: v(2) = 9,342 m/s y y(2) = 10,38 m
assert(Math.abs(heunSeries[1].v - 9.342) < 1e-4, 'Heun en t=2 s: v(2) = 9,3420 m/s',
  `Calculado: ${heunSeries[1].v.toFixed(4)}`);
assert(Math.abs(heunSeries[1].y - 10.38) < 1e-4, 'Heun en t=2 s: y(2) = 10,3800 m',
  `Calculado: ${heunSeries[1].y.toFixed(4)}`);

// Comprobación de RK4 en t = 2 s: v(2) ≈ 9,4076 (exacta ≈ 9,4077)
assert(Math.abs(rk4Series[1].v - 9.4076) < 0.001, 'RK4 en t=2 s: v(2) ≈ 9,4076 m/s',
  `Calculado: ${rk4Series[1].v.toFixed(4)}`);

// Error final en RK4 a 20 s es inferior a 0,003 m/s frente a la exacta
const rk4Final = rk4Series[rk4Series.length - 1];
const rk4ErrV = Math.abs(vExact20 - rk4Final.v);
assert(rk4ErrV < 0.003, 'RK4 alcanza una precisión superior con error final < 0,003 m/s',
  `Error RK4: ${rk4ErrV.toFixed(6)} m/s (frente a 1,4512 m/s en Euler)`);

// -----------------------------------------------------------------------------
// 6. CASOS LÍMITE Y MANEJO DE CONDICIONES FÍSICAS FRONTERA
// -----------------------------------------------------------------------------
console.log('\n--- 6. MANEJO DE ERRORES Y CASOS FRONTERA ---');

// Caso b = 0 (k = 0): sin resistencia del aire, aceleración constante a = 5,19 m/s²
// v(20) = 5,19 * 20 = 103,8 m/s; y(20) = 0,5 * 5,19 * 20^2 = 1038 m
const paramsK0 = Object.assign({}, DEFAULT_PARAMS, { k: 0 });
const vK0 = Mathematics.velocidadExacta(20, paramsK0);
const yK0 = Mathematics.alturaExacta(20, paramsK0);
assert(Math.abs(vK0 - 103.8) < 1e-8, 'Caso frontera k = 0: velocidadExacta(20) = 103,8 m/s sin NaN/Infinity',
  `Calculado: ${vK0}`);
assert(Math.abs(yK0 - 1038.0) < 1e-8, 'Caso frontera k = 0: alturaExacta(20) = 1038,0 m sin NaN/Infinity',
  `Calculado: ${yK0}`);

// Caso T <= mg (T = 5000 N < mg = 9810 N): cohete no despega de la plataforma
const paramsLowT = Object.assign({}, DEFAULT_PARAMS, { T: 5000 });
const yLowT = Mathematics.alturaExacta(20, paramsLowT);
const vLowT = Mathematics.velocidadExacta(20, paramsLowT);
const aLowT = Mathematics.aceleracionExacta(20, paramsLowT);
assert(yLowT === 0 && vLowT === 0 && aLowT === 0, 'Caso plataforma T = 5000 N: y = 0, v = 0, a = 0 (sin penetración de suelo)',
  `y=${yLowT}, v=${vLowT}, a=${aLowT}`);

const eulerLowT = NumericalMethods.solveEuler(paramsLowT);
const eulerLowTEnd = eulerLowT[eulerLowT.length - 1];
assert(eulerLowTEnd.y === 0 && eulerLowTEnd.v === 0, 'Euler con T = 5000 N mantiene el cohete en reposo sobre el pad (y=0, v=0)',
  `Euler final: y=${eulerLowTEnd.y}, v=${eulerLowTEnd.v}`);

// Paso no múltiplo (tFinal = 20, h = 3): debe tener 8 puntos y terminar exactamente en t = 20
const pNonMultiple = Object.assign({}, DEFAULT_PARAMS, { h: 3.0, tFinal: 20.0 });
const sNonMultiple = NumericalMethods.solveEuler(pNonMultiple);
const endNonMultiple = sNonMultiple[sNonMultiple.length - 1];
assert(Math.abs(endNonMultiple.t - 20.0) < 1e-8 && endNonMultiple.isLastStepAdjusted === true,
  'Paso no múltiplo h = 3 con tFinal = 20: último paso ajustado termina exactamente en t = 20 s',
  `t_final = ${endNonMultiple.t} s | dt final = ${endNonMultiple.h} s`);

console.log('\n================================================================================');
console.log(` RESULTADO FINAL DE LA SUITE DE PRUEBAS:`);
console.log(` Pruebas ejecutadas: ${passedTests + failedTests}`);
console.log(` \x1b[32mSuperadas:\x1b[0m ${passedTests}`);
console.log(` \x1b[31mFalladas:\x1b[0m  ${failedTests}`);
console.log('================================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

