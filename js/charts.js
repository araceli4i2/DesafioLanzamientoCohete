/**
 * NASA MISSION 1962 — SIMULADOR DE LANZAMIENTO ESPACIAL
 * Módulo: charts.js
 * 
 * Responsabilidad: Inicialización, configuración y actualización reactiva de las
 * cuatro gráficas científicas independientes mediante la librería Chart.js:
 *   1. Velocidad vs Tiempo: v(t) [m/s vs s] (Analítica continua, Euler, Heun, RK4).
 *   2. Altura vs Tiempo: y(t) [m vs s] (Analítica continua, Euler, Heun, RK4).
 *   3. Error Absoluto de Velocidad vs Tiempo: |v_exacta - v_num| [m/s vs s].
 *   4. Error Absoluto de Altura vs Tiempo: |y_exacta - y_num| [m vs s].
 * 
 * Reglas de visualización:
 * - Curva analítica generada con alta densidad (paso dt <= 0.1 s) para verse suave y continua.
 * - Métodos numéricos representados con sus puntos de paso discretos reales (pointRadius > 0).
 * - Tooltips enriquecidos con formato numérico en español (coma decimal) y unidades físicas.
 * - Prevención estricta de instancias duplicadas (destrucción explícita antes de recrear/actualizar).
 * - Verificación condicionada del comportamiento de Euler (sobreestimación de v, subestimación de y).
 */

window.ChartsManager = (function () {
  'use strict';

  // Almacén de instancias activas de Chart.js para las 4 gráficas independientes
  const chartInstances = {
    velocity: null,
    altitude: null,
    errorV: null,
    errorY: null
  };

  // Estado de visibilidad reactiva de los 4 métodos
  const methodVisibility = {
    analytical: true,
    euler: true,
    heun: true,
    rk4: true
  };

  /**
   * Paleta cromática oficial retro-científica NASA 1962
   */
  const themeColors = {
    analytical: '#00E5FF',       // Cian eléctrico / Solución exacta de referencia
    analyticalFill: 'rgba(0, 229, 255, 0.08)',
    euler: '#FF6B00',            // Naranja intenso Mercury / Euler de 1er orden
    heun: '#FBBF24',             // Ámbar dorado / Heun de 2do orden
    rk4: '#10B981',              // Verde esmeralda / Runge-Kutta 4
    grid: 'rgba(56, 189, 248, 0.12)',
    axisTick: '#94A3B8',
    axisTitle: '#E2E8F0',
    tooltipBg: 'rgba(6, 14, 32, 0.95)',
    tooltipBorder: 'rgba(56, 189, 248, 0.35)'
  };

  /**
   * Genera la serie analítica exacta con alta densidad de puntos (dt <= 0.1 s)
   * para representar una curva continua suave en Chart.js.
   * 
   * @param {Object} params - Parámetros del estado { m, T, g, k, v0, y0, tFinal }
   * @param {number} [targetDt=0.1] - Paso de muestreo temporal deseado
   * @returns {Object} { velocity: Array<{x, y}>, altitude: Array<{x, y}> }
   */
  function computeDenseAnalyticalSeries(params, targetDt = 0.1) {
    const p = params || {};
    const tFinal = (p.tFinal !== undefined && p.tFinal > 0) ? p.tFinal : 20.0;
    const dt = Math.max(0.02, Math.min(targetDt, tFinal / 100)); // Garantiza entre 100 y 1000 puntos

    const pointsV = [];
    const pointsY = [];

    const EPS = 1e-9;
    let t = 0.0;

    while (t < tFinal - EPS) {
      const v = window.Mathematics ? window.Mathematics.velocidadExacta(t, p) : 0;
      const y = window.Mathematics ? window.Mathematics.alturaExacta(t, p) : 0;

      pointsV.push({ x: Number(t.toFixed(4)), y: v });
      pointsY.push({ x: Number(t.toFixed(4)), y: y });

      t += dt;
    }

    // Asegurar exactamente el punto final tFinal
    const vFin = window.Mathematics ? window.Mathematics.velocidadExacta(tFinal, p) : 0;
    const yFin = window.Mathematics ? window.Mathematics.alturaExacta(tFinal, p) : 0;
    pointsV.push({ x: Number(tFinal.toFixed(4)), y: vFin });
    pointsY.push({ x: Number(tFinal.toFixed(4)), y: yFin });

    return {
      velocity: pointsV,
      altitude: pointsY
    };
  }

  /**
   * Destruye de forma segura todas las instancias activas de Chart.js para
   * liberar canvas y memoria, evitando el error "Canvas is already in use".
   */
  function destroyAllCharts() {
    Object.keys(chartInstances).forEach((key) => {
      if (chartInstances[key]) {
        try {
          chartInstances[key].destroy();
        } catch (e) {
          console.warn(`[ChartsManager] Error al destruir gráfica ${key}:`, e);
        }
        chartInstances[key] = null;
      }
    });
  }

  /**
   * Configuración de opciones base común para las gráficas científicas
   * 
   * @param {string} xTitle - Título del eje X
   * @param {string} yTitle - Título del eje Y
   * @param {string} unit - Unidad física para el tooltip
   * @returns {Object} Opciones de Chart.js
   */
  function getBaseChartOptions(xTitle, yTitle, unit) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 350
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            color: themeColors.axisTitle,
            font: {
              family: "'JetBrains Mono', monospace",
              size: 11
            }
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: themeColors.tooltipBg,
          titleColor: themeColors.analytical,
          bodyColor: '#F8FAFC',
          borderColor: themeColors.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          titleFont: {
            family: "'JetBrains Mono', monospace",
            size: 11,
            weight: 'bold'
          },
          bodyFont: {
            family: "'JetBrains Mono', monospace",
            size: 11
          },
          callbacks: {
            title: function (items) {
              if (!items || !items.length) return '';
              const tVal = items[0].parsed.x;
              const formattedT = window.App ? window.App.formatNumber(tVal, 2, 2) : tVal.toFixed(2);
              return `Tiempo t = ${formattedT} s`;
            },
            label: function (context) {
              const label = context.dataset.label || '';
              const yVal = context.parsed.y;
              const formattedVal = window.App ? window.App.formatNumber(yVal, 2, 4) : yVal.toFixed(4);
              return ` ${label}: ${formattedVal} ${unit}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: xTitle,
            color: themeColors.axisTitle,
            font: {
              family: "'JetBrains Mono', monospace",
              size: 12,
              weight: 'bold'
            }
          },
          ticks: {
            color: themeColors.axisTick,
            font: {
              family: "'JetBrains Mono', monospace",
              size: 10
            },
            callback: function (val) {
              return window.App ? window.App.formatNumber(val, 0, 1) : val;
            }
          },
          grid: {
            color: themeColors.grid,
            borderColor: 'rgba(56, 189, 248, 0.3)'
          }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: yTitle,
            color: themeColors.axisTitle,
            font: {
              family: "'JetBrains Mono', monospace",
              size: 12,
              weight: 'bold'
            }
          },
          ticks: {
            color: themeColors.axisTick,
            font: {
              family: "'JetBrains Mono', monospace",
              size: 10
            },
            callback: function (val) {
              return window.App ? window.App.formatNumber(val, 0, 2) : val;
            }
          },
          grid: {
            color: themeColors.grid,
            borderColor: 'rgba(56, 189, 248, 0.3)'
          }
        }
      }
    };
  }

  /**
   * Construye los datasets para la Gráfica 1: Velocidad vs Tiempo v(t)
   * 
   * @param {Object} denseAnalytical - Puntos continuos { velocity }
   * @param {Array} euler - Puntos discretos de Euler
   * @param {Array} heun - Puntos discretos de Heun
   * @param {Array} rk4 - Puntos discretos de RK4
   * @returns {Array<Object>} Datasets de Chart.js
   */
  function buildVelocityDatasets(denseAnalytical, euler, heun, rk4) {
    const datasets = [];

    // 1. Solución Analítica Continua
    if (methodVisibility.analytical && denseAnalytical && denseAnalytical.velocity) {
      datasets.push({
        label: 'Analítica Exacta',
        data: denseAnalytical.velocity,
        borderColor: themeColors.analytical,
        backgroundColor: themeColors.analyticalFill,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.2,
        fill: false
      });
    }

    // 2. Método de Euler (1er orden)
    if (methodVisibility.euler && euler) {
      datasets.push({
        label: 'Euler (1er orden)',
        data: euler.map(pt => ({ x: pt.t, y: pt.v })),
        borderColor: themeColors.euler,
        backgroundColor: themeColors.euler,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    // 3. Método de Heun (2do orden)
    if (methodVisibility.heun && heun) {
      datasets.push({
        label: 'Heun (2do orden)',
        data: heun.map(pt => ({ x: pt.t, y: pt.v })),
        borderColor: themeColors.heun,
        backgroundColor: themeColors.heun,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    // 4. Método RK4 (4to orden)
    if (methodVisibility.rk4 && rk4) {
      datasets.push({
        label: 'Runge-Kutta 4 (RK4)',
        data: rk4.map(pt => ({ x: pt.t, y: pt.v })),
        borderColor: themeColors.rk4,
        backgroundColor: themeColors.rk4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    return datasets;
  }

  /**
   * Construye los datasets para la Gráfica 2: Altura vs Tiempo y(t)
   * 
   * @param {Object} denseAnalytical - Puntos continuos { altitude }
   * @param {Array} euler - Puntos discretos de Euler
   * @param {Array} heun - Puntos discretos de Heun
   * @param {Array} rk4 - Puntos discretos de RK4
   * @returns {Array<Object>} Datasets de Chart.js
   */
  function buildAltitudeDatasets(denseAnalytical, euler, heun, rk4) {
    const datasets = [];

    // 1. Solución Analítica Continua
    if (methodVisibility.analytical && denseAnalytical && denseAnalytical.altitude) {
      datasets.push({
        label: 'Analítica Exacta',
        data: denseAnalytical.altitude,
        borderColor: themeColors.analytical,
        backgroundColor: themeColors.analyticalFill,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.2,
        fill: false
      });
    }

    // 2. Método de Euler (1er orden)
    if (methodVisibility.euler && euler) {
      datasets.push({
        label: 'Euler (1er orden)',
        data: euler.map(pt => ({ x: pt.t, y: pt.y })),
        borderColor: themeColors.euler,
        backgroundColor: themeColors.euler,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    // 3. Método de Heun (2do orden)
    if (methodVisibility.heun && heun) {
      datasets.push({
        label: 'Heun (2do orden)',
        data: heun.map(pt => ({ x: pt.t, y: pt.y })),
        borderColor: themeColors.heun,
        backgroundColor: themeColors.heun,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    // 4. Método RK4 (4to orden)
    if (methodVisibility.rk4 && rk4) {
      datasets.push({
        label: 'Runge-Kutta 4 (RK4)',
        data: rk4.map(pt => ({ x: pt.t, y: pt.y })),
        borderColor: themeColors.rk4,
        backgroundColor: themeColors.rk4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    return datasets;
  }

  /**
   * Construye los datasets para la Gráfica 3: Error Absoluto de Velocidad |v_exacta - v_num|
   * 
   * @param {Array} euler - Puntos discretos de Euler
   * @param {Array} heun - Puntos discretos de Heun
   * @param {Array} rk4 - Puntos discretos de RK4
   * @param {Object} params - Parámetros del modelo
   * @returns {Array<Object>} Datasets de Chart.js
   */
  function buildErrorVDatasets(euler, heun, rk4, params) {
    const datasets = [];

    // 1. Error de Euler
    if (methodVisibility.euler && euler) {
      datasets.push({
        label: 'Error Euler: |v_exact - v_Euler|',
        data: euler.map(pt => {
          const vEx = window.Mathematics ? window.Mathematics.velocidadExacta(pt.t, params) : 0;
          return { x: pt.t, y: Math.abs(vEx - pt.v) };
        }),
        borderColor: themeColors.euler,
        backgroundColor: themeColors.euler,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    // 2. Error de Heun
    if (methodVisibility.heun && heun) {
      datasets.push({
        label: 'Error Heun: |v_exact - v_Heun|',
        data: heun.map(pt => {
          const vEx = window.Mathematics ? window.Mathematics.velocidadExacta(pt.t, params) : 0;
          return { x: pt.t, y: Math.abs(vEx - pt.v) };
        }),
        borderColor: themeColors.heun,
        backgroundColor: themeColors.heun,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    // 3. Error de RK4
    if (methodVisibility.rk4 && rk4) {
      datasets.push({
        label: 'Error RK4: |v_exact - v_RK4|',
        data: rk4.map(pt => {
          const vEx = window.Mathematics ? window.Mathematics.velocidadExacta(pt.t, params) : 0;
          return { x: pt.t, y: Math.abs(vEx - pt.v) };
        }),
        borderColor: themeColors.rk4,
        backgroundColor: themeColors.rk4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    return datasets;
  }

  /**
   * Construye los datasets para la Gráfica 4: Error Absoluto de Altura |y_exacta - y_num|
   * 
   * @param {Array} euler - Puntos discretos de Euler
   * @param {Array} heun - Puntos discretos de Heun
   * @param {Array} rk4 - Puntos discretos de RK4
   * @param {Object} params - Parámetros del modelo
   * @returns {Array<Object>} Datasets de Chart.js
   */
  function buildErrorYDatasets(euler, heun, rk4, params) {
    const datasets = [];

    // 1. Error de Euler
    if (methodVisibility.euler && euler) {
      datasets.push({
        label: 'Error Euler: |y_exact - y_Euler|',
        data: euler.map(pt => {
          const yEx = window.Mathematics ? window.Mathematics.alturaExacta(pt.t, params) : 0;
          return { x: pt.t, y: Math.abs(yEx - pt.y) };
        }),
        borderColor: themeColors.euler,
        backgroundColor: themeColors.euler,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    // 2. Error de Heun
    if (methodVisibility.heun && heun) {
      datasets.push({
        label: 'Error Heun: |y_exact - y_Heun|',
        data: heun.map(pt => {
          const yEx = window.Mathematics ? window.Mathematics.alturaExacta(pt.t, params) : 0;
          return { x: pt.t, y: Math.abs(yEx - pt.y) };
        }),
        borderColor: themeColors.heun,
        backgroundColor: themeColors.heun,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    // 3. Error de RK4
    if (methodVisibility.rk4 && rk4) {
      datasets.push({
        label: 'Error RK4: |y_exact - y_RK4|',
        data: rk4.map(pt => {
          const yEx = window.Mathematics ? window.Mathematics.alturaExacta(pt.t, params) : 0;
          return { x: pt.t, y: Math.abs(yEx - pt.y) };
        }),
        borderColor: themeColors.rk4,
        backgroundColor: themeColors.rk4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false
      });
    }

    return datasets;
  }

  /**
   * Calcula el conjunto completo de métricas cuantitativas para las tarjetas de telemetría.
   * 
   * @param {Object} params - Parámetros del modelo
   * @returns {Object} Métricas calculadas
   */
  function computeChartMetrics(params) {
    const p = params || {};
    const tFinal = (p.tFinal !== undefined && p.tFinal > 0) ? p.tFinal : 20.0;
    const h = (p.h !== undefined && p.h > 0) ? p.h : 2.0;

    const vFinalExact = window.Mathematics ? window.Mathematics.velocidadExacta(tFinal, p) : 0;
    const yFinalExact = window.Mathematics ? window.Mathematics.alturaExacta(tFinal, p) : 0;

    const sEuler = window.NumericalMethods ? window.NumericalMethods.solveEuler(p) : [];
    const sHeun = window.NumericalMethods ? window.NumericalMethods.solveHeun(p) : [];
    const sRK4 = window.NumericalMethods ? window.NumericalMethods.solveRK4(p) : [];

    const lastEuler = sEuler.length ? sEuler[sEuler.length - 1] : { v: 0, y: 0 };
    const lastHeun = sHeun.length ? sHeun[sHeun.length - 1] : { v: 0, y: 0 };
    const lastRK4 = sRK4.length ? sRK4[sRK4.length - 1] : { v: 0, y: 0 };

    const errEulerV = Math.abs(vFinalExact - lastEuler.v);
    const errEulerY = Math.abs(yFinalExact - lastEuler.y);

    const errHeunV = Math.abs(vFinalExact - lastHeun.v);
    const errHeunY = Math.abs(yFinalExact - lastHeun.y);

    const errRK4V = Math.abs(vFinalExact - lastRK4.v);
    const errRK4Y = Math.abs(yFinalExact - lastRK4.y);

    // Error máximo registrado en toda la trayectoria entre todos los métodos
    let maxErrorV = 0;
    let maxErrorY = 0;
    let maxErrorMethod = 'Euler';

    sEuler.forEach((pt) => {
      const vEx = window.Mathematics ? window.Mathematics.velocidadExacta(pt.t, p) : 0;
      const yEx = window.Mathematics ? window.Mathematics.alturaExacta(pt.t, p) : 0;
      const ev = Math.abs(vEx - pt.v);
      const ey = Math.abs(yEx - pt.y);
      if (ev > maxErrorV) maxErrorV = ev;
      if (ey > maxErrorY) {
        maxErrorY = ey;
        maxErrorMethod = 'Euler';
      }
    });

    // Determinar el método más preciso con los parámetros actuales
    // Basado en el menor error final de altitud
    let bestMethodName = 'Runge-Kutta 4 (RK4)';
    let bestMethodOrder = 'Orden 4';
    let bestErrV = errRK4V;
    let bestErrY = errRK4Y;

    if (errHeunY < errRK4Y && errHeunV < errRK4V) {
      bestMethodName = 'Método de Heun';
      bestMethodOrder = 'Orden 2';
      bestErrV = errHeunV;
      bestErrY = errHeunY;
    } else if (errEulerY < errRK4Y && errEulerY < errHeunY) {
      bestMethodName = 'Método de Euler';
      bestMethodOrder = 'Orden 1';
      bestErrV = errEulerV;
      bestErrY = errEulerY;
    }

    const iterationsCount = sEuler.length > 0 ? (sEuler.length - 1) : Math.ceil(tFinal / h);

    return {
      tFinal: tFinal,
      h: h,
      vFinalExact: vFinalExact,
      yFinalExact: yFinalExact,
      euler: { v: lastEuler.v, y: lastEuler.y, errV: errEulerV, errY: errEulerY },
      heun: { v: lastHeun.v, y: lastHeun.y, errV: errHeunV, errY: errHeunY },
      rk4: { v: lastRK4.v, y: lastRK4.y, errV: errRK4V, errY: errRK4Y },
      maxErrorV: maxErrorV,
      maxErrorY: maxErrorY,
      maxErrorMethod: maxErrorMethod,
      bestMethodName: bestMethodName,
      bestMethodOrder: bestMethodOrder,
      bestErrV: bestErrV,
      bestErrY: bestErrY,
      iterationsCount: iterationsCount
    };
  }

  /**
   * Evalúa la condición física de Euler para verificar si efectivamente sobreestima
   * la velocidad y subestima la altura con los parámetros actuales.
   * 
   * @param {Object} params - Parámetros del modelo
   * @returns {Object} { isOverestimatingV, isUnderestimatingY, isFullyConfirmed, details }
   */
  function evaluateEulerOverUnderCondition(params) {
    const p = params || {};
    const sEuler = window.NumericalMethods ? window.NumericalMethods.solveEuler(p) : [];
    if (!sEuler || sEuler.length < 2) {
      return { isOverestimatingV: false, isUnderestimatingY: false, isFullyConfirmed: false, details: '' };
    }

    // Comprobar los pasos intermedios t > 0
    let countOverV = 0;
    let countUnderY = 0;
    const testPoints = sEuler.slice(1);

    testPoints.forEach((pt) => {
      const vEx = window.Mathematics ? window.Mathematics.velocidadExacta(pt.t, p) : 0;
      const yEx = window.Mathematics ? window.Mathematics.alturaExacta(pt.t, p) : 0;
      if (pt.v >= vEx - 1e-5) countOverV++;
      if (pt.y <= yEx + 1e-5) countUnderY++;
    });

    const isOverestimatingV = countOverV === testPoints.length;
    const isUnderestimatingY = countUnderY === testPoints.length;
    const isFullyConfirmed = isOverestimatingV && isUnderestimatingY;

    return {
      isOverestimatingV: isOverestimatingV,
      isUnderestimatingY: isUnderestimatingY,
      isFullyConfirmed: isFullyConfirmed,
      countOverV: countOverV,
      countUnderY: countUnderY,
      totalPoints: testPoints.length
    };
  }

  /**
   * Inicializa o actualiza reactivamente las cuatro gráficas independientes.
   * Destruye las instancias previas de forma limpia antes de instanciar de nuevo.
   * 
   * @param {Object} params - Parámetros actuales del estado central
   * @param {Object} [customVisibility] - Visibilidad opcional { analytical, euler, heun, rk4 }
   * @returns {Object} Métricas de la telemetría
   */
  function updateAllCharts(params, customVisibility) {
    if (typeof window.Chart === 'undefined') {
      console.warn('[ChartsManager] Librería Chart.js no encontrada en window.');
      return null;
    }

    const p = params || (window.App ? window.App.getState() : {});

    if (customVisibility) {
      Object.assign(methodVisibility, customVisibility);
    }

    // 1. Obtener series de datos
    const denseAnalytical = computeDenseAnalyticalSeries(p, 0.1);
    const sEuler = window.NumericalMethods ? window.NumericalMethods.solveEuler(p) : [];
    const sHeun = window.NumericalMethods ? window.NumericalMethods.solveHeun(p) : [];
    const sRK4 = window.NumericalMethods ? window.NumericalMethods.solveRK4(p) : [];

    // 2. Destruir instancias existentes antes de recrear
    destroyAllCharts();

    // 3. Crear Gráfica 1: Velocidad vs Tiempo
    const canvasV = document.getElementById('chart-velocity');
    if (canvasV) {
      const ctxV = canvasV.getContext('2d');
      const vDatasets = buildVelocityDatasets(denseAnalytical, sEuler, sHeun, sRK4);
      const vOptions = getBaseChartOptions('Tiempo t (s)', 'Velocidad v (m/s)', 'm/s');
      chartInstances.velocity = new window.Chart(ctxV, {
        type: 'line',
        data: { datasets: vDatasets },
        options: vOptions
      });
    }

    // 4. Crear Gráfica 2: Altura vs Tiempo
    const canvasY = document.getElementById('chart-altitude');
    if (canvasY) {
      const ctxY = canvasY.getContext('2d');
      const yDatasets = buildAltitudeDatasets(denseAnalytical, sEuler, sHeun, sRK4);
      const yOptions = getBaseChartOptions('Tiempo t (s)', 'Altitud y (m)', 'm');
      chartInstances.altitude = new window.Chart(ctxY, {
        type: 'line',
        data: { datasets: yDatasets },
        options: yOptions
      });
    }

    // 5. Crear Gráfica 3: Error Absoluto de Velocidad
    const canvasErrV = document.getElementById('chart-error-v');
    if (canvasErrV) {
      const ctxErrV = canvasErrV.getContext('2d');
      const errVDatasets = buildErrorVDatasets(sEuler, sHeun, sRK4, p);
      const errVOptions = getBaseChartOptions('Tiempo t (s)', 'Error |v_exact - v_num| (m/s)', 'm/s');
      chartInstances.errorV = new window.Chart(ctxErrV, {
        type: 'line',
        data: { datasets: errVDatasets },
        options: errVOptions
      });
    }

    // 6. Crear Gráfica 4: Error Absoluto de Altura
    const canvasErrY = document.getElementById('chart-error-y');
    if (canvasErrY) {
      const ctxErrY = canvasErrY.getContext('2d');
      const errYDatasets = buildErrorYDatasets(sEuler, sHeun, sRK4, p);
      const errYOptions = getBaseChartOptions('Tiempo t (s)', 'Error |y_exact - y_num| (m)', 'm');
      chartInstances.errorY = new window.Chart(ctxErrY, {
        type: 'line',
        data: { datasets: errYDatasets },
        options: errYOptions
      });
    }

    // 7. Retornar métricas
    return computeChartMetrics(p);
  }

  /**
   * Cambia la visibilidad de un método individual y actualiza las gráficas.
   * 
   * @param {string} methodKey - 'analytical' | 'euler' | 'heun' | 'rk4'
   * @param {boolean} isVisible - Estado visible
   * @param {Object} [params] - Parámetros opcionales del modelo
   */
  function setMethodVisibility(methodKey, isVisible, params) {
    if (methodVisibility.hasOwnProperty(methodKey)) {
      methodVisibility[methodKey] = Boolean(isVisible);
      const p = params || (window.App ? window.App.getState() : {});
      updateAllCharts(p);
    }
  }

  /**
   * Obtiene una copia del estado de visibilidad actual de los métodos.
   * @returns {Object}
   */
  function getMethodVisibility() {
    return Object.assign({}, methodVisibility);
  }

  // API pública expuesta
  return {
    themeColors: themeColors,
    computeDenseAnalyticalSeries: computeDenseAnalyticalSeries,
    computeChartMetrics: computeChartMetrics,
    evaluateEulerOverUnderCondition: evaluateEulerOverUnderCondition,
    updateAllCharts: updateAllCharts,
    destroyAllCharts: destroyAllCharts,
    setMethodVisibility: setMethodVisibility,
    getMethodVisibility: getMethodVisibility
  };
})();
