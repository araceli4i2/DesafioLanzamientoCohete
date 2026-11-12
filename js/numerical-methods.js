/**
 * NASA MISSION 1962 — SIMULADOR DE LANZAMIENTO ESPACIAL
 * Módulo: numerical-methods.js
 * 
 * Responsabilidad: Algoritmos de integración numérica para EDOs de valor inicial.
 * Implementa los métodos de Euler, Heun (Predictor-Corrector) y Runge-Kutta 4 (RK4),
 * así como los cálculos de discrepancias y errores globales/locales para el modelo lineal:
 *   dv/dt = T/m - g - (k/m)*v = 5,19 - 0,1*v
 *   dy/dt = v
 * 
 * Regla fundamental del Método de Euler Explícito:
 *   v_{n+1} = v_n + h * a(v_n) = v_n + h * (T/m - g - (k/m)*v_n)
 *   y_{n+1} = y_n + h * v_n
 * 
 * REGLA CRÍTICA DE SIMULTANEIDAD:
 * Se usan SIEMPRE los valores del paso anterior (v_n, y_n) para actualizar ambas variables
 * a la vez. NUNCA se debe utilizar la velocidad recién calculada v_{n+1} para calcular
 * la altura y_{n+1} del mismo paso (eso constituiría el método de Euler-Cromer).
 * 
 * REGLA DE PASO FINAL ADAPTATIVO:
 * Si tFinal no es múltiplo de h, el último paso es más corto (dt = tFinal - t_n)
 * finalizando exactamente en tFinal.
 * 
 * Regla de arquitectura: Este módulo es una librería numérica pura.
 * No manipula directamente elementos del DOM (la vista delega en app.js).
 */

window.NumericalMethods = (function () {
  'use strict';

  /**
   * Evalúa la aceleración vertical instantánea:
   *   a = dv/dt = T/m - g - (k/m)*v
   * 
   * Si el cohete está sobre la plataforma (y <= 0) en reposo (v <= 0)
   * y el empuje T es menor que el peso m*g, la plataforma ejerce una fuerza normal
   * que anula la aceleración negativa, manteniendo a = 0 y el cohete en reposo.
   * 
   * @param {number} v - Velocidad actual en m/s
   * @param {Object} params - { m, T, g, k }
   * @param {number} [y=0] - Altura actual en metros
   * @returns {number} Aceleración neta en m/s²
   */
  function evalAcceleration(v, params, y = 0) {
    const m = (params && params.m !== undefined) ? params.m : 1000.0;
    const T = (params && params.T !== undefined) ? params.T : 15000.0;
    const g = (params && params.g !== undefined) ? params.g : 9.81;
    const k = (params && params.k !== undefined) ? params.k : 100.0;

    if (!m || m <= 0) return 0;

    // Condición de plataforma: Si T < m*g y el cohete está en reposo en el suelo, no penetra el piso
    const weight = m * g;
    if (y <= 0 && v <= 0 && T <= weight) {
      return 0.0;
    }

    if (window.Mathematics && typeof window.Mathematics.calculateAcceleration === 'function') {
      return window.Mathematics.calculateAcceleration(m, T, g, k, v);
    }

    return (T / m) - g - (k / m) * v;
  }

  /**
   * Resuelve el sistema mediante el Método de Euler Explícito estándar.
   * Si tFinal no es múltiplo de h, el último paso se ajusta para terminar exactamente en tFinal.
   * 
   * Fórmulas:
   *   y_{n+1} = y_n + h * v_n
   *   v_{n+1} = v_n + h * a_n
   *   con a_n = T/m - g - (k/m)*v_n
   * 
   * @param {Object} params - { m, T, g, k, v0, y0, tFinal, h }
   * @returns {Array<Object>} Serie temporal [{ n, t, y, v, a, prevY, prevV, prevA, h, isLastStepAdjusted }, ...]
   */
  function solveEuler(params) {
    const p = params || {};
    const m = p.m !== undefined ? p.m : 1000.0;
    const T = p.T !== undefined ? p.T : 15000.0;
    const g = p.g !== undefined ? p.g : 9.81;
    const k = p.k !== undefined ? p.k : 100.0;
    const v0 = p.v0 !== undefined ? p.v0 : 0.0;
    const y0 = p.y0 !== undefined ? Math.max(0, p.y0) : 0.0;
    const tFinal = (p.tFinal !== undefined && p.tFinal > 0) ? p.tFinal : 20.0;
    const baseH = (p.h !== undefined && p.h > 0) ? Math.min(p.h, tFinal) : 2.0;

    let t = 0.0;
    let y = y0;
    let v = (T < m * g && y <= 0 && v0 <= 0) ? 0.0 : v0;
    let a = evalAcceleration(v, { m, T, g, k }, y);

    const series = [{
      n: 0,
      t: 0.0,
      y: y,
      v: v,
      a: a,
      prevY: y,
      prevV: v,
      prevA: a,
      h: baseH,
      isLastStepAdjusted: false
    }];

    const EPS = 1e-9;
    let stepIndex = 0;

    while (t < tFinal - EPS) {
      stepIndex++;
      let dt = baseH;
      let isAdjusted = false;

      // Si el paso nominal sobrepasa tFinal, se ajusta al remanente exacto
      if (t + dt > tFinal + EPS) {
        dt = tFinal - t;
        isAdjusted = true;
      }

      const currentY = y;
      const currentV = v;
      const currentA = a;

      // REGLA FUNDAMENTAL DE EULER EXPLÍCITO:
      // Se evalúan ambas actualizaciones usando los valores del paso anterior (currentY, currentV, currentA)
      let nextY = currentY + dt * currentV;
      if (nextY < 0) nextY = 0; // limitación física a la plataforma (y >= 0)

      let nextV = currentV + dt * currentA;
      if (nextY === 0 && nextV < 0) nextV = 0; // reposo sobre la torre

      const nextT = Number((t + dt).toFixed(6));
      const nextA = evalAcceleration(nextV, { m, T, g, k }, nextY);

      y = nextY;
      v = nextV;
      t = nextT;
      a = nextA;

      series.push({
        n: stepIndex,
        t: t,
        y: y,
        v: v,
        a: a,
        prevY: currentY,
        prevV: currentV,
        prevA: currentA,
        h: dt,
        isLastStepAdjusted: isAdjusted
      });
    }

    return series;
  }

  /**
   * Genera el detalle didáctico formal para una iteración específica de Euler (paso n -> n+1).
   * Contiene fórmula teórica, sustitución numérica con los parámetros activos,
   * resultado matemático e interpretación física rigurosa.
   * 
   * @param {Object} step - Paso actual (n+1)
   * @param {Object} prevStep - Paso previo (n)
   * @param {Object} params - Parámetros { m, T, g, k, h }
   * @returns {Object} Ficha didáctica estructurada
   */
  function generateEulerStepProcedure(step, prevStep, params) {
    const m = params.m || 1000;
    const T = params.T || 15000;
    const g = params.g || 9.81;
    const k = params.k || 100;
    const h = step.h || 2.0;

    const n = prevStep.n;
    const t0 = prevStep.t;
    const t1 = step.t;
    const v0 = prevStep.v;
    const y0 = prevStep.y;
    const a0 = prevStep.a;
    const v1 = step.v;
    const y1 = step.y;
    const a1 = step.a;

    const netThrustOverM = T / m;
    const dragCoeffOverM = k / m;
    const aInitial = Math.abs(netThrustOverM - g);
    const aPercent = aInitial > 0 ? (a1 / aInitial) * 100 : 0;
    const isTerminalStrict = aInitial > 0 && (Math.abs(a1) < 0.01 * aInitial);

    let interpretation = '';
    let isDiscretizationCallout = false;

    if (n === 0) {
      isDiscretizationCallout = true;
      interpretation = `Al inicio del lanzamiento (t = 0 s), el cohete parte del reposo absoluto (v₀ = 0 m/s), por lo que la resistencia aerodinámica es nula (Fres = 0 N). La aceleración resulta máxima: a₀ = 5,19 m/s². Durante los primeros ${h.toFixed(2).replace('.', ',')} segundos el empuje acelera el vehículo hasta v₁ = ${v1.toFixed(4).replace('.', ',')} m/s. Sin embargo, como el método de Euler calcula la nueva altitud multiplicando el paso h por la velocidad inicial del intervalo (v₀ = 0 m/s), se obtiene y₁ = 0,00 m. Esto representa el error de discretización del método explícito en el primer paso (el cohete sí está en movimiento ascendente, pero Euler toma la velocidad previa).`;
    } else if (n === 1) {
      interpretation = `Con una velocidad acumulada de v₁ = ${v0.toFixed(4).replace('.', ',')} m/s, el cohete experimenta resistencia del aire proporcional a su rapidez (Fres = ${(k * v0).toFixed(1).replace('.', ',')} N). La aceleración efectiva se reduce de 5,19 a ${a0.toFixed(4).replace('.', ',')} m/s². En este segundo intervalo, la altura se incrementa en ${h.toFixed(2).replace('.', ',')} × v₁ = ${(h * v0).toFixed(4).replace('.', ',')} m, alcanzando una altitud calculada de y₂ = ${y1.toFixed(4).replace('.', ',')} m.`;
    } else if (n === 2) {
      interpretation = `La velocidad continúa ascendiendo hasta ${v1.toFixed(4).replace('.', ',')} m/s. A medida que la rapidez crece, la fuerza de arrastre disipa mayor parte del empuje neto, por lo que la aceleración decae a ${a1.toFixed(4).replace('.', ',')} m/s². La trayectoria gana altitud aceleradamente llegando a ${y1.toFixed(4).replace('.', ',')} m.`;
    } else if (step.isLastStepAdjusted) {
      interpretation = `Último paso de la simulación con ajuste de paso temporal (Δt = ${h.toFixed(2).replace('.', ',')} s en lugar del paso nominal de ${params.h || 2} s) para concluir con exactitud en el horizonte tf = ${t1.toFixed(2).replace('.', ',')} s. La velocidad final alcanzada es ${v1.toFixed(4).replace('.', ',')} m/s y la altitud acumulada es ${y1.toFixed(4).replace('.', ',')} m (aceleración remanente: ${a1.toFixed(4).replace('.', ',')} m/s², equivalente al ${aPercent.toFixed(1).replace('.', ',')}% de la aceleración inicial).`;
    } else if (t1 >= (params.tFinal || 20) - 1e-4) {
      if (isTerminalStrict) {
        interpretation = `Paso final de la simulación (t = ${t1.toFixed(2).replace('.', ',')} s). La aceleración se ha reducido a ${a1.toFixed(4).replace('.', ',')} m/s² (menos del 1 % de la inicial), alcanzando el régimen de velocidad terminal v_inf = 51,90 m/s donde las fuerzas están prácticamente equilibradas.`;
      } else {
        interpretation = `Paso final de la simulación (t = ${t1.toFixed(2).replace('.', ',')} s). El cohete finaliza con velocidad v = ${v1.toFixed(4).replace('.', ',')} m/s y altitud y = ${y1.toFixed(4).replace('.', ',')} m. La aceleración remanente es a = ${a1.toFixed(4).replace('.', ',')} m/s² (${aPercent.toFixed(1).replace('.', ',')}% de la aceleración inicial). Dado que la aceleración supera el 1 % de la inicial, el vehículo continúa en ascenso impulsado sin haber alcanzado el régimen terminal estricto.`;
      }
    } else {
      interpretation = `En el intervalo [${t0.toFixed(2).replace('.', ',')} s, ${t1.toFixed(2).replace('.', ',')} s], la aceleración instantánea desciende progresivamente debido al incremento del arrastre viscoso lineal. La velocidad aumenta a un ritmo decreciente y la altitud acumulada alcanza ${y1.toFixed(4).replace('.', ',')} m.`;
    }

    return {
      n: n,
      nextN: step.n,
      t0: t0,
      t1: t1,
      h: h,
      v0: v0,
      y0: y0,
      a0: a0,
      v1: v1,
      y1: y1,
      a1: a1,
      formulaA: 'a_n = \\frac{T}{m} - g - \\frac{k}{m} v_n',
      substA: `a_${n} = \\frac{${T}}{${m}} - ${g.toFixed(2)} - \\frac{${k}}{${m}}(${v0.toFixed(4)}) = ${netThrustOverM.toFixed(2)} - ${g.toFixed(2)} - ${(dragCoeffOverM * v0).toFixed(4)} = ${a0.toFixed(4)}\\text{ m/s}^2`,
      formulaV: 'v_{n+1} = v_n + h \\cdot a_n',
      substV: `v_{${step.n}} = ${v0.toFixed(4)} + ${h.toFixed(2)} \\cdot (${a0.toFixed(4)}) = ${v1.toFixed(4)}\\text{ m/s}`,
      formulaY: 'y_{n+1} = y_n + h \\cdot v_n',
      substY: `y_{${step.n}} = ${y0.toFixed(4)} + ${h.toFixed(2)} \\cdot (${v0.toFixed(4)}) = ${y1.toFixed(4)}\\text{ m}`,
      interpretation: interpretation,
      isDiscretizationCallout: isDiscretizationCallout
    };
  }

  /**
   * Genera el conjunto completo de procedimientos didácticos para toda la serie calculada.
   * 
   * @param {Array<Object>} series - Serie de Euler obtenida con solveEuler
   * @param {Object} params - Parámetros { m, T, g, k, h }
   * @returns {Array<Object>} Lista de fichas didácticas
   */
  function generateAllEulerSteps(series, params) {
    if (!series || series.length < 2) return [];
    const procedures = [];
    for (let i = 1; i < series.length; i++) {
      procedures.push(generateEulerStepProcedure(series[i], series[i - 1], params));
    }
    return procedures;
  }

  /**
   * Genera la cadena de texto en formato CSV con la tabla del método de Euler.
   * 
   * @param {Array<Object>} series - Serie calculada con solveEuler
   * @param {Object} params - Parámetros de la simulación
   * @returns {string} Contenido CSV en texto plano
   */
  function exportEulerCSV(series, params) {
    if (!series || !series.length) return '';
    const p = params || {};
    const lines = [];

    lines.push('# NASA MISSION 1962 - SIMULADOR DE LANZAMIENTO ESPACIAL');
    lines.push('# METODO DE EULER EXPLICITO - TABLA DE TRAYECTORIA Y VELOCIDAD');
    lines.push(`# Parametros: m=${p.m || 1000} kg; T=${p.T || 15000} N; g=${p.g || 9.81} m/s^2; k=${p.k || 100} kg/s; h=${p.h || 2} s; tFinal=${p.tFinal || 20} s`);
    lines.push('Paso (n);Tiempo (s);Velocidad (m/s);Altura (m);Aceleracion (m/s^2)');

    series.forEach((step) => {
      const tStr = step.t.toFixed(4).replace('.', ',');
      const vStr = step.v.toFixed(6).replace('.', ',');
      const yStr = step.y.toFixed(6).replace('.', ',');
      const aStr = step.a.toFixed(6).replace('.', ',');
      lines.push(`${step.n};${tStr};${vStr};${yStr};${aStr}`);
    });

    return lines.join('\r\n');
  }

  /**
   * Dispara en el navegador la descarga de la tabla de Euler como archivo .csv.
   * 
   * @param {Array<Object>} series - Serie calculada
   * @param {Object} params - Parámetros actuales
   */
  function downloadEulerCSV(series, params) {
    const csvData = exportEulerCSV(series, params);
    if (!csvData) return;

    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const hVal = (params && params.h) ? String(params.h).replace('.', '_') : '2';
    link.setAttribute('href', url);
    link.setAttribute('download', `mision_1962_euler_paso_h${hVal}s.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Resuelve el sistema mediante el Método de Heun (Euler Mejorado - Orden 2).
   * Adaptado con paso final exacto si tFinal no es múltiplo de h.
   * 
   * @param {Object} params - { m, T, g, k, v0, y0, tFinal, h }
   * @returns {Array<Object>} Puntos de trayectoria [{ n, t, y, v, a }, ...]
   */
  function solveHeun(params) {
    const p = params || {};
    const m = p.m !== undefined ? p.m : 1000.0;
    const T = p.T !== undefined ? p.T : 15000.0;
    const g = p.g !== undefined ? p.g : 9.81;
    const k = p.k !== undefined ? p.k : 100.0;
    const v0 = p.v0 !== undefined ? p.v0 : 0.0;
    const y0 = p.y0 !== undefined ? Math.max(0, p.y0) : 0.0;
    const tFinal = (p.tFinal !== undefined && p.tFinal > 0) ? p.tFinal : 20.0;
    const baseH = (p.h !== undefined && p.h > 0) ? Math.min(p.h, tFinal) : 2.0;

    let t = 0.0;
    let y = y0;
    let v = (T < m * g && y <= 0 && v0 <= 0) ? 0.0 : v0;
    let a = evalAcceleration(v, { m, T, g, k }, y);

    const series = [{
      n: 0,
      t: 0.0,
      y: y,
      v: v,
      a: a,
      h: baseH,
      isLastStepAdjusted: false
    }];

    const EPS = 1e-9;
    let stepIndex = 0;

    while (t < tFinal - EPS) {
      stepIndex++;
      let dt = baseH;
      let isAdjusted = false;

      if (t + dt > tFinal + EPS) {
        dt = tFinal - t;
        isAdjusted = true;
      }

      // Pendientes al inicio (k1)
      const k1_y = v;
      const k1_v = evalAcceleration(v, { m, T, g, k }, y);

      // Predictores (Euler)
      let vPred = v + dt * k1_v;
      let yPred = Math.max(0, y + dt * k1_y);
      if (yPred === 0 && vPred < 0) vPred = 0;

      // Pendientes en el punto predicho (k2)
      const k2_y = vPred;
      const k2_v = evalAcceleration(vPred, { m, T, g, k }, yPred);

      // Corrector: promedio de pendientes
      let nextY = Math.max(0, y + (dt / 2.0) * (k1_y + k2_y));
      let nextV = v + (dt / 2.0) * (k1_v + k2_v);
      if (nextY === 0 && nextV < 0) nextV = 0;

      const nextT = Number((t + dt).toFixed(6));
      const nextA = evalAcceleration(nextV, { m, T, g, k }, nextY);

      y = nextY;
      v = nextV;
      t = nextT;
      a = nextA;

      series.push({
        n: stepIndex,
        t: t,
        y: y,
        v: v,
        a: a,
        h: dt,
        isLastStepAdjusted: isAdjusted
      });
    }

    return series;
  }

  /**
   * Resuelve el sistema mediante Runge-Kutta de 4to Orden (RK4).
   * Adaptado con paso final exacto si tFinal no es múltiplo de h.
   * 
   * @param {Object} params - { m, T, g, k, v0, y0, tFinal, h }
   * @returns {Array<Object>} Puntos de trayectoria [{ n, t, y, v, a }, ...]
   */
  function solveRK4(params) {
    const p = params || {};
    const m = p.m !== undefined ? p.m : 1000.0;
    const T = p.T !== undefined ? p.T : 15000.0;
    const g = p.g !== undefined ? p.g : 9.81;
    const k = p.k !== undefined ? p.k : 100.0;
    const v0 = p.v0 !== undefined ? p.v0 : 0.0;
    const y0 = p.y0 !== undefined ? Math.max(0, p.y0) : 0.0;
    const tFinal = (p.tFinal !== undefined && p.tFinal > 0) ? p.tFinal : 20.0;
    const baseH = (p.h !== undefined && p.h > 0) ? Math.min(p.h, tFinal) : 2.0;

    let t = 0.0;
    let y = y0;
    let v = (T < m * g && y <= 0 && v0 <= 0) ? 0.0 : v0;
    let a = evalAcceleration(v, { m, T, g, k }, y);

    const series = [{
      n: 0,
      t: 0.0,
      y: y,
      v: v,
      a: a,
      h: baseH,
      isLastStepAdjusted: false
    }];

    const EPS = 1e-9;
    let stepIndex = 0;

    while (t < tFinal - EPS) {
      stepIndex++;
      let dt = baseH;
      let isAdjusted = false;

      if (t + dt > tFinal + EPS) {
        dt = tFinal - t;
        isAdjusted = true;
      }

      // Etapa 1
      const k1_y = v;
      const k1_v = evalAcceleration(v, { m, T, g, k }, y);

      // Etapa 2
      const v2 = v + 0.5 * dt * k1_v;
      const y2 = Math.max(0, y + 0.5 * dt * k1_y);
      const k2_y = v2;
      const k2_v = evalAcceleration(v2, { m, T, g, k }, y2);

      // Etapa 3
      const v3 = v + 0.5 * dt * k2_v;
      const y3 = Math.max(0, y + 0.5 * dt * k2_y);
      const k3_y = v3;
      const k3_v = evalAcceleration(v3, { m, T, g, k }, y3);

      // Etapa 4
      const v4 = v + dt * k3_v;
      const y4 = Math.max(0, y + dt * k3_y);
      const k4_y = v4;
      const k4_v = evalAcceleration(v4, { m, T, g, k }, y4);

      // Combinación ponderada de RK4
      let nextY = Math.max(0, y + (dt / 6.0) * (k1_y + 2.0 * k2_y + 2.0 * k3_y + k4_y));
      let nextV = v + (dt / 6.0) * (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v);
      if (nextY === 0 && nextV < 0) nextV = 0;

      const nextT = Number((t + dt).toFixed(6));
      const nextA = evalAcceleration(nextV, { m, T, g, k }, nextY);

      y = nextY;
      v = nextV;
      t = nextT;
      a = nextA;

      series.push({
        n: stepIndex,
        t: t,
        y: y,
        v: v,
        a: a,
        h: dt,
        isLastStepAdjusted: isAdjusted
      });
    }

    return series;
  }

  /**
   * Calcula los errores absoluto, relativo y cuadrático medio respecto a la solución analítica.
   * 
   * @param {Array<Object>} numericalPoints - Serie calculada con el método numérico
   * @param {Array<Object>} analyticalPoints - Serie exacta analítica
   * @returns {Object} Resumen de métricas y serie de errores
   */
  function calculateErrors(numericalPoints, analyticalPoints) {
    if (!numericalPoints || !analyticalPoints) return null;

    const count = Math.min(numericalPoints.length, analyticalPoints.length);
    const detailedErrors = [];

    let sumSqErrY = 0.0;
    let sumSqErrV = 0.0;
    let maxErrY = 0.0;
    let maxErrV = 0.0;

    for (let i = 0; i < count; i++) {
      const pNum = numericalPoints[i];
      const pExact = analyticalPoints[i];

      const errY = Math.abs(pNum.y - pExact.y);
      const errV = Math.abs(pNum.v - pExact.v);

      const relErrY = pExact.y !== 0 ? (errY / Math.abs(pExact.y)) * 100 : 0;
      const relErrV = pExact.v !== 0 ? (errV / Math.abs(pExact.v)) * 100 : 0;

      sumSqErrY += errY * errY;
      sumSqErrV += errV * errV;

      if (errY > maxErrY) maxErrY = errY;
      if (errV > maxErrV) maxErrV = errV;

      detailedErrors.push({
        n: pNum.n,
        t: pNum.t,
        yNum: pNum.y,
        yExact: pExact.y,
        errY: errY,
        relErrY: relErrY,
        vNum: pNum.v,
        vExact: pExact.v,
        errV: errV,
        relErrV: relErrV
      });
    }

    const last = detailedErrors[detailedErrors.length - 1] || {};

    return {
      details: detailedErrors,
      rmseY: Math.sqrt(sumSqErrY / count),
      rmseV: Math.sqrt(sumSqErrV / count),
      maxErrorY: maxErrY,
      maxErrorV: maxErrV,
      finalErrorY: last.errY || 0,
      finalErrorV: last.errV || 0,
      finalRelErrorY: last.relErrY || 0,
      finalRelErrorV: last.relErrV || 0
    };
  }

  /**
   * Analiza el comportamiento del error global en función del paso de integración h
   * (evaluando los pasos h = 2 s, 1 s, 0,5 s, 0,25 s requeridos).
   * 
   * @param {Array<number>} stepSizes - Lista de valores de h
   * @param {Object} baseParams - Parámetros base { m, T, g, k, v0, y0, tFinal }
   * @returns {Array<Object>} Comparativa por paso h
   */
  function analyzeConvergence(stepSizes, baseParams) {
    const steps = stepSizes || [2.0, 1.0, 0.5, 0.25];
    const results = [];

    steps.forEach((hVal) => {
      const p = Object.assign({}, baseParams, { h: hVal });

      const solExact = window.Mathematics ? window.Mathematics.calculateAnalyticalSolution(p) : [];
      const solEuler = solveEuler(p);
      const solHeun = solveHeun(p);
      const solRK4 = solveRK4(p);

      const errEuler = calculateErrors(solEuler, solExact);
      const errHeun = calculateErrors(solHeun, solExact);
      const errRK4 = calculateErrors(solRK4, solExact);

      const lastEuler = solEuler[solEuler.length - 1];
      const lastExact = solExact && solExact.length ? solExact[solExact.length - 1] : { y: 0, v: 0 };

      results.push({
        h: hVal,
        totalSteps: solEuler.length - 1,
        eulerFinalY: lastEuler ? lastEuler.y : 0,
        eulerFinalV: lastEuler ? lastEuler.v : 0,
        exactFinalY: lastExact ? lastExact.y : 0,
        exactFinalV: lastExact ? lastExact.v : 0,
        eulerErrY: errEuler ? errEuler.finalErrorY : 0,
        eulerRelErrY: errEuler ? errEuler.finalRelErrorY : 0,
        eulerErrV: errEuler ? errEuler.finalErrorV : 0,
        heunErrY: errHeun ? errHeun.finalErrorY : 0,
        rk4ErrY: errRK4 ? errRK4.finalErrorY : 0
      });
    });

    return results;
  }

  /**
   * Obtiene los datos estructurados para el Desafío de Precisión (Sección 7):
   * Para los 4 pasos representativos [2, 1, 0.5, 0.25], calcula:
   * - Número dinámico de iteraciones: Math.round(tFinal / h)
   * - Velocidad y altura a tFinal con Euler y con la solución analítica
   * - Errores absolutos en velocidad y altura
   * - Verificación de los dos requisitos de tolerancia:
   *     1. Error de velocidad < 0,5 m/s
   *     2. Error de altura < 5 m
   * - Estado global (Precisión alcanzada vs Insuficiente)
   * 
   * @param {Object} params - Parámetros { m, T, g, k, v0, y0, tFinal, h }
   * @param {number} [activeH] - Paso actualmente seleccionado
   * @returns {Object} { stepsData, activeStep, vExact, yExact, tFinal }
   */
  function getPrecisionChallengeData(params, activeH) {
    const p = params || {};
    const tFinal = (p.tFinal !== undefined && p.tFinal > 0) ? p.tFinal : 20.0;
    const stepSizes = [2.0, 1.0, 0.5, 0.25];
    const currentH = (activeH !== undefined) ? activeH : (p.h || 2.0);

    const vExact = window.Mathematics ? window.Mathematics.velocidadExacta(tFinal, p) : 44.8761;
    const yExact = window.Mathematics ? window.Mathematics.alturaExacta(tFinal, p) : 589.2390;

    const stepsData = stepSizes.map((hVal) => {
      const iterations = Math.round(tFinal / hVal);
      const series = solveEuler(Object.assign({}, p, { h: hVal, tFinal: tFinal }));
      const last = series[series.length - 1] || { v: 0, y: 0 };

      const vEuler = last.v;
      const yEuler = last.y;
      const errV = Math.abs(vEuler - vExact);
      const errY = Math.abs(yEuler - yExact);

      // Requisitos de tolerancia de Katherine Johnson
      const passV = errV < 0.5;
      const passY = errY < 5.0;
      const allPass = passV && passY;

      return {
        h: hVal,
        iterations: iterations,
        vEuler: vEuler,
        yEuler: yEuler,
        errV: errV,
        errY: errY,
        passV: passV,
        passY: passY,
        allPass: allPass,
        isActive: Math.abs(hVal - currentH) < 1e-4
      };
    });

    const activeStep = stepsData.find(s => s.isActive) || stepsData[0];

    return {
      tFinal: tFinal,
      vExact: vExact,
      yExact: yExact,
      stepsData: stepsData,
      activeStep: activeStep
    };
  }

  // API pública expuesta
  return {
    evalAcceleration: evalAcceleration,
    solveEuler: solveEuler,
    generateEulerStepProcedure: generateEulerStepProcedure,
    generateAllEulerSteps: generateAllEulerSteps,
    exportEulerCSV: exportEulerCSV,
    downloadEulerCSV: downloadEulerCSV,
    solveHeun: solveHeun,
    solveRK4: solveRK4,
    calculateErrors: calculateErrors,
    analyzeConvergence: analyzeConvergence,
    getPrecisionChallengeData: getPrecisionChallengeData
  };
})();
