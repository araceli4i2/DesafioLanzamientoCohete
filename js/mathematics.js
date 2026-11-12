/**
 * NASA MISSION 1962 — SIMULADOR DE LANZAMIENTO ESPACIAL
 * Módulo: mathematics.js
 * 
 * Responsabilidad: Modelado analítico y funciones matemáticas puras.
 * Regla de arquitectura: Todos los cálculos analíticos y leyes físicas residen aquí.
 * La interfaz de usuario nunca debe recalcular estas fórmulas por su cuenta.
 * 
 * Modelo Físico: Resistencia LINEAL F_res = k * v (no cuadrática)
 *   m * dv/dt = T - m*g - k*v
 *   dv/dt = T/m - g - (k/m)*v = 5,19 - 0,1*v
 *   dy/dt = v
 *   Solución analítica de referencia:
 *     v(t) = 51,9 * (1 - e^(-0,1*t))
 *     y(t) = 51,9*t - 519 * (1 - e^(-0,1*t))
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
   * Evalúa la velocidad analítica exacta en el instante t:
   * Para v0 = 0: v(t) = v_inf * (1 - e^(-beta * t))
   * En general: v(t) = v_inf * (1 - e^(-beta * t)) + v0 * e^(-beta * t)
   * con v_inf = (T - m*g)/k  y  beta = k/m
   * 
   * @param {number} t - Tiempo en segundos (t >= 0)
   * @param {Object} params - { m, T, g, k, v0, y0 }
   * @returns {number} Velocidad analítica exacta en m/s
   */
  function evaluateAnalyticalVelocity(t, params) {
    const m = params.m || 1000;
    const T = params.T || 15000;
    const g = params.g || 9.81;
    const k = params.k || 100;
    const v0 = params.v0 || 0;

    if (t <= 0) return v0;

    const beta = k / m;
    const netStatic = T - m * g;

    if (Math.abs(beta) < 1e-12) {
      // Caso sin resistencia (MRUV simple)
      const a0 = netStatic / m;
      return v0 + a0 * t;
    }

    const vInf = netStatic / k;
    const expTerm = Math.exp(-beta * t);

    return vInf * (1 - expTerm) + v0 * expTerm;
  }

  /**
   * Evalúa la altura analítica exacta en el instante t:
   * y(t) = y0 + v_inf * t - ((v_inf - v0) / beta) * (1 - e^(-beta * t))
   * Con los datos canónicos: y(t) = 51,9 * t - 519 * (1 - e^(-0,1*t))
   * 
   * @param {number} t - Tiempo en segundos (t >= 0)
   * @param {Object} params - { m, T, g, k, v0, y0 }
   * @returns {number} Altura analítica exacta en metros
   */
  function evaluateAnalyticalAltitude(t, params) {
    const m = params.m || 1000;
    const T = params.T || 15000;
    const g = params.g || 9.81;
    const k = params.k || 100;
    const v0 = params.v0 || 0;
    const y0 = params.y0 || 0;

    if (t <= 0) return y0;

    const beta = k / m;
    const netStatic = T - m * g;

    if (Math.abs(beta) < 1e-12) {
      const a0 = netStatic / m;
      return y0 + v0 * t + 0.5 * a0 * t * t;
    }

    const vInf = netStatic / k;
    const expTerm = Math.exp(-beta * t);

    return y0 + vInf * t - ((vInf - v0) / beta) * (1 - expTerm);
  }

  /**
   * Genera la serie temporal completa de la solución analítica de referencia.
   * Si tFinal no es múltiplo de h, ajusta el último punto para evaluar exactamente en tFinal.
   * 
   * @param {Object} params - { m, T, g, k, v0, y0, tFinal, h }
   * @returns {Array<Object>} Serie temporal [{ n, t, y, v, a }, ...]
   */
  function calculateAnalyticalSolution(params) {
    const tFinal = params.tFinal !== undefined ? params.tFinal : 20.0;
    const baseH = params.h !== undefined ? params.h : 2.0;
    const series = [];

    let t = 0.0;
    let n = 0;
    const EPS = 1e-9;

    while (t < tFinal - EPS) {
      const v = evaluateAnalyticalVelocity(t, params);
      const y = evaluateAnalyticalAltitude(t, params);
      const a = calculateAcceleration(params.m, params.T, params.g, params.k, v);

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
    const vFin = evaluateAnalyticalVelocity(tFinal, params);
    const yFin = evaluateAnalyticalAltitude(tFinal, params);
    const aFin = calculateAcceleration(params.m, params.T, params.g, params.k, vFin);

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
    calculateDragForce: calculateDragForce,
    calculateNetForce: calculateNetForce,
    calculateAcceleration: calculateAcceleration,
    calculateTerminalVelocity: calculateTerminalVelocity,
    evaluateAnalyticalVelocity: evaluateAnalyticalVelocity,
    evaluateAnalyticalAltitude: evaluateAnalyticalAltitude,
    calculateAnalyticalSolution: calculateAnalyticalSolution
  };
})();
