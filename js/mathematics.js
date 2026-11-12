/**
 * NASA MISSION 1962 — SIMULADOR DE LANZAMIENTO ESPACIAL
 * Módulo: mathematics.js
 * 
 * Responsabilidad: Modelado analítico y funciones matemáticas puras.
 * Regla de arquitectura: Todos los cálculos analíticos y leyes físicas residen aquí.
 * La interfaz de usuario nunca recalcula estas fórmulas por su cuenta.
 * 
 * Modelo Físico: Resistencia LINEAL F_res = k * v (no cuadrática)
 *   m * dv/dt = T - m*g - k*v
 *   dv/dt = T/m - g - (k/m)*v = 5,19 - 0,1*v
 *   dy/dt = v
 * 
 * Solución analítica formal con separación de variables:
 *   dv/dt = 5,19 - 0,1v
 *   dv / (5,19 - 0,1v) = dt
 *   -10 ln|5,19 - 0,1v| = t + C  ==>  5,19 - 0,1v = C * e^(-0,1t)
 *   Con v(0) = 0: C = 5,19  ==>  v(t) = 51,9 * (1 - e^(-0,1t))
 *   y(t) = \int v dt, con y(0) = 0:
 *   y(t) = 51,9*t - 519 * (1 - e^(-0,1t))
 * 
 * A los 20 segundos:
 *   v(20) = 51,9 * (1 - e^(-2)) = 44,8761 m/s
 *   y(20) = 51,9*(20) - 519 * (1 - e^(-2)) = 1038 - 448,7610 = 589,2390 m
 * 
 * Internamente los cálculos operan con precisión de punto flotante estándar (punto decimal).
 */

window.Mathematics = (function () {
  'use strict';

  /**
   * Calcula la fuerza de resistencia aerodinámica lineal.
   * F_res = k * v
   * 
   * @param {number} k - Coeficiente de resistencia lineal (kg/s)
   * @param {number} v - Velocidad vertical instantánea (m/s)
   * @returns {number} Fuerza de resistencia en Newtons
   */
  function calculateDragForce(k, v) {
    return (k || 0) * (v || 0);
  }

  /**
   * Calcula la fuerza neta vertical que actúa sobre el cohete (+y hacia arriba).
   * F_neta = T - m*g - k*v
   * 
   * @param {number} m - Masa del cohete (kg)
   * @param {number} T - Empuje de los motores (N)
   * @param {number} g - Aceleración de la gravedad (m/s²)
   * @param {number} k - Coeficiente de resistencia lineal (kg/s)
   * @param {number} v - Velocidad instantánea vertical (m/s)
   * @returns {number} Fuerza neta en Newtons
   */
  function calculateNetForce(m, T, g, k, v) {
    const fGravity = (m || 0) * (g || 0);
    const fDrag = calculateDragForce(k, v);
    return (T || 0) - fGravity - fDrag;
  }

  /**
   * Calcula la aceleración instantánea a = dv/dt = T/m - g - (k/m)*v.
   * Con los datos del desafío: dv/dt = 5,19 - 0,1*v
   * 
   * @param {number} m - Masa del cohete (kg)
   * @param {number} T - Empuje (N)
   * @param {number} g - Gravedad (m/s²)
   * @param {number} k - Coeficiente lineal (kg/s)
   * @param {number} v - Velocidad instantánea (m/s)
   * @returns {number} Aceleración instantánea en m/s²
   */
  function calculateAcceleration(m, T, g, k, v) {
    if (!m || m <= 0) return 0;
    const fNet = calculateNetForce(m, T, g, k, v);
    return fNet / m;
  }

  /**
   * Calcula la velocidad límite o terminal en ascenso impulsado con resistencia lineal:
   * v_inf = (T - m*g) / k = (15000 - 9810) / 100 = 51,9 m/s
   * 
   * @param {number} m - Masa (kg)
   * @param {number} T - Empuje (N)
   * @param {number} g - Gravedad (m/s²)
   * @param {number} k - Coeficiente lineal (kg/s)
   * @returns {number} Velocidad terminal asintótica en m/s
   */
  function calculateTerminalVelocity(m, T, g, k) {
    if (!k || k <= 0) return Infinity;
    const netStatic = (T || 0) - (m || 0) * (g || 0);
    return netStatic / k;
  }

  /**
   * Función analítica independiente: velocidadExacta(t, p)
   * Solución generalizada con a = T/m - g y b = k/m:
   * - Si b != 0: v(t) = v0 * e^(-bt) + (a/b) * (1 - e^(-bt))
   * - Si b == 0: v(t) = v0 + a * t
   * Con tolerancia |b| < 1e-12 para el caso b = 0.
   * Aplica condición de reposo en plataforma si T <= mg y el cohete está en el suelo.
   * 
   * @param {number} t - Tiempo en segundos (t >= 0)
   * @param {Object} p - Parámetros { m, T, g, k, v0, y0 }
   * @returns {number} Velocidad exacta en m/s
   */
  function velocidadExacta(t, p) {
    const params = p || {};
    const m = params.m !== undefined ? params.m : 1000.0;
    const T = params.T !== undefined ? params.T : 15000.0;
    const g = params.g !== undefined ? params.g : 9.81;
    const k = params.k !== undefined ? params.k : 100.0;
    const v0 = params.v0 !== undefined ? params.v0 : 0.0;
    const y0 = params.y0 !== undefined ? Math.max(0.0, params.y0) : 0.0;

    if (!m || m <= 0) return 0.0;

    // Condición de plataforma: si está sobre la plataforma sin velocidad de ascenso y el empuje no vence al peso
    if (y0 <= 0 && v0 <= 0 && T <= m * g) {
      return 0.0;
    }

    if (t <= 0) return v0;

    const a = (T / m) - g;
    const b = k / m;

    // Caso b = 0 (tolerancia para ausencia de resistencia aerodinámica k = 0)
    if (Math.abs(b) < 1e-12) {
      const y = y0 + v0 * t + 0.5 * a * t * t;
      if (y <= 0 && T <= m * g) {
        return 0.0;
      }
      const v = v0 + a * t;
      return Number(v.toFixed(10));
    }

    const expTerm = Math.exp(-b * t);
    const oneMinusExp = 1.0 - expTerm;
    const y = y0 + (v0 / b) * oneMinusExp + (a / b) * (t - (oneMinusExp / b));
    if (y <= 0 && T <= m * g) {
      return 0.0;
    }

    const v = v0 * expTerm + (a / b) * oneMinusExp;
    return Number(v.toFixed(10));
  }

  /**
   * Función analítica independiente: alturaExacta(t, p)
   * Solución generalizada con a = T/m - g y b = k/m:
   * - Si b != 0: y(t) = y0 + (v0/b) * (1 - e^(-bt)) + (a/b) * [t - (1 - e^(-bt))/b]
   * - Si b == 0: y(t) = y0 + v0 * t + 0.5 * a * t^2
   * Aplica restricción y >= 0 si el modelo lo requiere (plataforma de lanzamiento).
   * 
   * @param {number} t - Tiempo en segundos (t >= 0)
   * @param {Object} p - Parámetros { m, T, g, k, v0, y0 }
   * @returns {number} Altura exacta en metros
   */
  function alturaExacta(t, p) {
    const params = p || {};
    const m = params.m !== undefined ? params.m : 1000.0;
    const T = params.T !== undefined ? params.T : 15000.0;
    const g = params.g !== undefined ? params.g : 9.81;
    const k = params.k !== undefined ? params.k : 100.0;
    const v0 = params.v0 !== undefined ? params.v0 : 0.0;
    const y0 = params.y0 !== undefined ? Math.max(0.0, params.y0) : 0.0;

    if (!m || m <= 0) return y0;

    // Condición de reposo en plataforma: si está sobre la plataforma sin velocidad de ascenso y T <= mg
    if (y0 <= 0 && v0 <= 0 && T <= m * g) {
      return 0.0;
    }

    if (t <= 0) return y0;

    const a = (T / m) - g;
    const b = k / m;

    let y;
    // Caso b = 0 (MRUV simple sin resistencia del aire)
    if (Math.abs(b) < 1e-12) {
      y = y0 + v0 * t + 0.5 * a * t * t;
    } else {
      const expTerm = Math.exp(-b * t);
      const oneMinusExp = 1.0 - expTerm;
      y = y0 + (v0 / b) * oneMinusExp + (a / b) * (t - (oneMinusExp / b));
    }

    // Condición física de plataforma: no penetra el suelo (y >= 0)
    const yClamped = Math.max(0.0, y);
    return Number(yClamped.toFixed(10));
  }

  /**
   * Función analítica independiente: aceleracionExacta(t, p)
   * Derivada temporal de la velocidad analítica:
   *   a(t) = dv/dt = a - b * v(t) = (T/m - g) - (k/m) * v(t)
   * Devuelve 0 mientras el cohete permanezca en reposo sobre la plataforma con T <= mg.
   * 
   * @param {number} t - Tiempo en segundos (t >= 0)
   * @param {Object} p - Parámetros { m, T, g, k, v0, y0 }
   * @returns {number} Aceleración analítica en m/s²
   */
  function aceleracionExacta(t, p) {
    const params = p || {};
    const m = params.m !== undefined ? params.m : 1000.0;
    const T = params.T !== undefined ? params.T : 15000.0;
    const g = params.g !== undefined ? params.g : 9.81;
    const k = params.k !== undefined ? params.k : 100.0;
    const v0 = params.v0 !== undefined ? params.v0 : 0.0;
    const y0 = params.y0 !== undefined ? Math.max(0.0, params.y0) : 0.0;

    if (!m || m <= 0) return 0.0;

    // Condición de reposo en plataforma inicial
    if (y0 <= 0 && v0 <= 0 && T <= m * g) {
      return 0.0;
    }

    const v = velocidadExacta(t, params);
    const y = alturaExacta(t, params);

    // Condición de plataforma: en reposo sobre la torre de lanzamiento
    if (y <= 0 && v <= 0 && T <= m * g) {
      return 0.0;
    }

    const a = (T / m) - g;
    const b = k / m;
    const acc = a - b * v;
    return Number(acc.toFixed(10));
  }

  /**
   * Alias de compatibilidad hacia atrás para evaluar la velocidad exacta
   */
  function evaluateAnalyticalVelocity(t, params) {
    return velocidadExacta(t, params);
  }

  /**
   * Alias de compatibilidad hacia atrás para evaluar la altura exacta
   */
  function evaluateAnalyticalAltitude(t, params) {
    return alturaExacta(t, params);
  }

  /**
   * Genera la serie temporal completa de la solución analítica de referencia.
   * Si tFinal no es múltiplo de h, ajusta el último punto para evaluar exactamente en tFinal.
   * 
   * @param {Object} params - { m, T, g, k, v0, y0, tFinal, h }
   * @returns {Array<Object>} Serie temporal [{ n, t, y, v, a }, ...]
   */
  function calculateAnalyticalSolution(params) {
    const p = params || {};
    const tFinal = (p.tFinal !== undefined && p.tFinal > 0) ? p.tFinal : 20.0;
    const baseH = (p.h !== undefined && p.h > 0) ? Math.min(p.h, tFinal) : 2.0;
    const series = [];

    let t = 0.0;
    let n = 0;
    const EPS = 1e-9;

    while (t < tFinal - EPS) {
      const v = velocidadExacta(t, p);
      const y = alturaExacta(t, p);
      const a = aceleracionExacta(t, p);

      series.push({
        n: n,
        t: Number(t.toFixed(6)),
        y: y,
        v: v,
        a: a
      });

      n++;
      if (t + baseH > tFinal + EPS) {
        t = tFinal;
      } else {
        t = Number((t + baseH).toFixed(6));
      }
    }

    // Punto final exacto en tFinal
    const vFin = velocidadExacta(tFinal, p);
    const yFin = alturaExacta(tFinal, p);
    const aFin = aceleracionExacta(tFinal, p);

    series.push({
      n: n,
      t: Number(tFinal.toFixed(6)),
      y: yFin,
      v: vFin,
      a: aFin
    });

    return series;
  }

  // API pública expuesta
  return {
    velocidadExacta: velocidadExacta,
    alturaExacta: alturaExacta,
    aceleracionExacta: aceleracionExacta,
    calculateDragForce: calculateDragForce,
    calculateNetForce: calculateNetForce,
    calculateAcceleration: calculateAcceleration,
    calculateTerminalVelocity: calculateTerminalVelocity,
    evaluateAnalyticalVelocity: evaluateAnalyticalVelocity,
    evaluateAnalyticalAltitude: evaluateAnalyticalAltitude,
    calculateAnalyticalSolution: calculateAnalyticalSolution
  };
})();
