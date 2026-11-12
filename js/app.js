/**
 * NASA MISSION 1962 — SIMULADOR DE LANZAMIENTO ESPACIAL
 * Módulo: app.js
 * 
 * Responsabilidad: Controlador principal de la aplicación, gestión del Estado Central
 * compartido (Store reactivo con suscripción), formateo internacional en español (coma decimal),
 * validación rigurosa de parámetros, sincronización bidireccional de la interfaz, integración
 * del Método de Euler (tabla dinámica, tarjetas de la Pregunta 1, desglose didáctico, CSV)
 * y navegación entre las 12 secciones del desafío.
 * 
 * Reglas globales del proyecto:
 * 1. Todos los números mostrados en pantalla usan coma decimal vía Intl.NumberFormat('es-ES').
 * 2. Los cálculos internos se realizan en punto flotante estándar (punto decimal).
 * 3. La interfaz no recalcula fórmulas por su cuenta; delega en mathematics.js y numerical-methods.js.
 * 4. Estado centralizado único y compartido para todas las secciones.
 */

window.App = (function () {
  'use strict';

  // =========================================================================
  // 1. FORMATEADOR INTERNACIONAL NUMÉRICO (ESPAÑOL / COMA DECIMAL)
  // =========================================================================

  /**
   * Formatea cualquier valor numérico para visualización en español (coma decimal).
   * 
   * @param {number} value - Número a formatear
   * @param {number} [minDecimals=2] - Mínimo de decimales
   * @param {number} [maxDecimals=4] - Máximo de decimales
   * @returns {string} Cadena formateada en español (ej. "46,3273")
   */
  function formatNumber(value, minDecimals = 2, maxDecimals = 4) {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '--';
    }
    const formatter = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals
    });
    return formatter.format(value);
  }

  // =========================================================================
  // 2. ESTADO CENTRAL COMPARTIDO (STORE REACTIVO)
  // =========================================================================

  /**
   * Parámetros oficiales canónicos del desafío de lanzamiento espacial:
   * m = 1000 kg; T = 15000 N; g = 9,81 m/s²; k = 100 kg/s (resistencia LINEAL);
   * v0 = 0 m/s; y0 = 0 m; tFinal = 20 s; h = 2 s.
   */
  const defaultState = {
    m: 1000.0,      // Masa del cohete (kg)
    T: 15000.0,     // Empuje de los motores (N)
    g: 9.81,        // Aceleración de la gravedad (m/s²)
    k: 100.0,       // Coeficiente de resistencia lineal (kg/s)
    v0: 0.0,        // Velocidad inicial (m/s)
    y0: 0.0,        // Altura inicial en plataforma (m)
    tFinal: 20.0,   // Tiempo total de vuelo (s)
    h: 2.0,         // Paso de integración (s)
    selectedMethod: 'euler',
    activeSection: 'inicio'
  };

  let state = Object.assign({}, defaultState);
  const subscribers = [];

  // Almacén de última serie calculada de Euler y estado de la UI
  let currentEulerSeries = [];
  let isEulerProcedureVisible = true;

  /**
   * Obtiene una copia del estado central actual.
   * @returns {Object} Estado central
   */
  function getState() {
    return Object.assign({}, state);
  }

  /**
   * Actualiza el estado central con nuevos parámetros y notifica a los suscriptores.
   * 
   * @param {Object} partialState - Parámetros a actualizar
   */
  function setState(partialState) {
    const prevState = Object.assign({}, state);
    state = Object.assign({}, state, partialState);

    // Notificar a observadores
    subscribers.forEach((callback) => {
      try {
        callback(state, prevState);
      } catch (err) {
        console.error('[App Store] Error en suscriptor de estado:', err);
      }
    });

    // Sincronizar todos los elementos de la interfaz
    syncUIWithState();
  }

  /**
   * Registra un callback reactivo que escucha cambios del estado.
   * 
   * @param {Function} callback - Función receptora (newState, prevState)
   * @returns {Function} Función para cancelar suscripción
   */
  function subscribe(callback) {
    if (typeof callback === 'function') {
      subscribers.push(callback);
      callback(state, state);
    }
    return function unsubscribe() {
      const index = subscribers.indexOf(callback);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  // =========================================================================
  // 3. MOTOR DE VALIDACIÓN UNIVERSAL DE PARÁMETROS
  // =========================================================================

  /**
   * Valida rigurosamente las entradas numéricas según las reglas del desafío:
   * 1. masa > 0
   * 2. h > 0
   * 3. tiempo final > 0
   * 4. h <= tFinal
   * 5. valores finitos, sin NaN ni división por cero
   * 6. advertencia si T < m*g (el cohete no despegaría y altura acotada a y >= 0)
   * 
   * @param {Object} params - Parámetros a validar
   * @returns {Object} { isValid: boolean, errors: Object, warnings: Array<string> }
   */
  function validateParameters(params) {
    const errors = {};
    const warnings = [];

    const m = params.m;
    const T = params.T;
    const g = params.g;
    const k = params.k;
    const v0 = params.v0;
    const y0 = params.y0;
    const tFinal = params.tFinal;
    const h = params.h;

    // Validación de masa
    if (m === undefined || m === null || isNaN(m) || !Number.isFinite(m)) {
      errors.m = 'La masa debe ser un valor numérico finito.';
    } else if (m <= 0) {
      errors.m = 'La masa debe ser estrictamente mayor a 0 kg.';
    }

    // Validación de empuje
    if (T === undefined || T === null || isNaN(T) || !Number.isFinite(T)) {
      errors.T = 'El empuje debe ser un número finito.';
    } else if (T < 0) {
      errors.T = 'El empuje propulsor no puede ser negativo.';
    }

    // Validación de gravedad
    if (g === undefined || g === null || isNaN(g) || !Number.isFinite(g)) {
      errors.g = 'La gravedad debe ser un número finito.';
    } else if (g < 0) {
      errors.g = 'La gravedad no puede ser negativa.';
    }

    // Validación de resistencia lineal
    if (k === undefined || k === null || isNaN(k) || !Number.isFinite(k)) {
      errors.k = 'La resistencia debe ser un número finito.';
    } else if (k < 0) {
      errors.k = 'El coeficiente k no puede ser negativo.';
    }

    // Validación de condiciones iniciales
    if (v0 === undefined || v0 === null || isNaN(v0) || !Number.isFinite(v0)) {
      errors.v0 = 'La velocidad inicial debe ser un número finito.';
    }
    if (y0 === undefined || y0 === null || isNaN(y0) || !Number.isFinite(y0)) {
      errors.y0 = 'La altitud inicial debe ser un número finito.';
    } else if (y0 < 0) {
      errors.y0 = 'La altitud inicial no puede ser inferior a 0 m (nivel del suelo).';
    }

    // Validación de tiempo final
    if (tFinal === undefined || tFinal === null || isNaN(tFinal) || !Number.isFinite(tFinal)) {
      errors.tFinal = 'El tiempo final debe ser un número finito.';
    } else if (tFinal <= 0) {
      errors.tFinal = 'El tiempo final debe ser estrictamente mayor a 0 s.';
    }

    // Validación de paso h
    if (h === undefined || h === null || isNaN(h) || !Number.isFinite(h)) {
      errors.h = 'El paso h debe ser un número finito.';
    } else if (h <= 0) {
      errors.h = 'El paso de integración h debe ser estrictamente mayor a 0 s.';
    } else if (Number.isFinite(tFinal) && h > tFinal) {
      errors.h = `El paso h (${formatNumber(h, 2, 2)} s) no puede superar el tiempo final (${formatNumber(tFinal, 0, 0)} s).`;
    }

    // Advertencia de no despegue: T < m*g
    if (Number.isFinite(m) && Number.isFinite(T) && Number.isFinite(g) && m > 0) {
      const weight = m * g;
      if (T < weight) {
        warnings.push(`Advertencia: El empuje actual (T = ${formatNumber(T, 0, 0)} N) es menor que el peso del cohete (mg = ${formatNumber(weight, 0, 1)} N). El cohete no despegará de la plataforma.`);
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  // =========================================================================
  // 4. SINCRONIZACIÓN DE LA INTERFAZ CON EL ESTADO CENTRAL
  // =========================================================================

  /**
   * Sincroniza todos los inputs, displays numéricos, tablas, diagramas y advertencias.
   */
  function syncUIWithState() {
    const validation = validateParameters(state);

    // Lista de parámetros controlados
    const paramDefs = [
      { key: 'm', decimals: 0, unit: ' kg' },
      { key: 'T', decimals: 0, unit: ' N' },
      { key: 'g', decimals: 2, unit: ' m/s²' },
      { key: 'k', decimals: 1, unit: ' kg/s' },
      { key: 'v0', decimals: 2, unit: ' m/s' },
      { key: 'y0', decimals: 1, unit: ' m' },
      { key: 'tFinal', decimals: 0, unit: ' s' },
      { key: 'h', decimals: 2, unit: ' s' }
    ];

    paramDefs.forEach(({ key, decimals, unit }) => {
      // 1. Sincronizar inputs de la Sección 5 (Euler)
      const inputEuler = document.getElementById(`input-euler-${key}`);
      if (inputEuler && document.activeElement !== inputEuler) {
        inputEuler.value = state[key];
      }
      const displayEuler = document.getElementById(`display-euler-${key}`);
      if (displayEuler) {
        displayEuler.textContent = formatNumber(state[key], 0, decimals) + unit;
      }
      const errorEuler = document.getElementById(`error-euler-${key}`);
      if (errorEuler) {
        if (validation.errors[key]) {
          errorEuler.textContent = validation.errors[key];
          if (inputEuler) inputEuler.classList.add('input-has-error');
        } else {
          errorEuler.textContent = '';
          if (inputEuler) inputEuler.classList.remove('input-has-error');
        }
      }

      // 2. Sincronizar inputs de la Sección 10 (Simulador)
      const inputSim = document.getElementById(`input-${key}`);
      if (inputSim && document.activeElement !== inputSim) {
        inputSim.value = state[key];
      }
      const displaySim = document.getElementById(`display-${key}`);
      if (displaySim) {
        displaySim.textContent = formatNumber(state[key], 0, decimals) + unit;
      }
    });

    // Advertencia de no despegue (T < mg) en Sección 5
    const liftoffWarningEl = document.getElementById('euler-liftoff-warning');
    if (liftoffWarningEl) {
      const weight = state.m * state.g;
      if (state.T < weight) {
        liftoffWarningEl.style.display = 'flex';
        liftoffWarningEl.querySelector('.warning-text').innerHTML = `
          <strong>ADVERTENCIA DE VUELO:</strong> El empuje de los motores ($T = ${formatNumber(state.T, 0, 0)}\\text{ N}$) es inferior al peso gravitatorio del cohete ($mg = ${formatNumber(weight, 0, 1)}\\text{ N}$). El vehículo no puede despegar. La aceleración vertical se anula en reposo y la altura permanece limitada a $y \\ge 0\\text{ m}$.
        `;
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise([liftoffWarningEl]).catch(() => {});
        }
      } else {
        liftoffWarningEl.style.display = 'none';
      }
    }

    // Sincronizar botones de paso h (h = 2, 1, 0.5, 0.25)
    const stepButtons = document.querySelectorAll('.step-selector-btn');
    stepButtons.forEach((btn) => {
      const btnVal = parseFloat(btn.getAttribute('data-h'));
      if (Math.abs(btnVal - state.h) < 1e-4) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Insignia en el hero
    const heroMassEl = document.getElementById('display-hero-m');
    if (heroMassEl) {
      heroMassEl.textContent = formatNumber(state.m, 0, 0) + ' kg';
    }

    // Actualizar secciones dependientes
    updateMathParametersDisplay();
    updateParamsTable();
    updateForcesDiagramSVG();
    updateDynamicSubstitutedEDO();

    // Actualizar la Sección 5 (Euler), Sección 6 (Analítica), Sección 7 (Precisión), Sección 8 (Heun/RK4), Sección 9 (Gráficas), Sección 10 (Simulador) y Sección 12 (Reflexión)
    if (validation.isValid) {
      updateEulerSection();
      updatePrecisionSection();
      updateHeunRK4Section();
      updateChartsSection();
      updateReflectionSection();

      if (window.Simulation && typeof window.Simulation.syncWithState === 'function') {
        window.Simulation.syncWithState(state);
      }

      if (window.EvaluationModule && typeof window.EvaluationModule.syncWithState === 'function') {
        window.EvaluationModule.syncWithState(state);
      }
    }

    // Re-renderizado reactivo continuo de MathJax tras cada actualización
    scheduleMathJaxTypeset();
  }

  let mathjaxDebounceTimer = null;

  /**
   * Re-renderiza las expresiones matemáticas de MathJax de forma reactiva y con debounce.
   * Se ejecuta tras cada actualización del estado o de los contenedores dinámicos.
   */
  function scheduleMathJaxTypeset() {
    if (!window.MathJax || typeof window.MathJax.typesetPromise !== 'function') return;
    if (mathjaxDebounceTimer) {
      clearTimeout(mathjaxDebounceTimer);
    }
    mathjaxDebounceTimer = setTimeout(() => {
      try {
        const dynamicTargets = [
          document.getElementById('math-params-summary'),
          document.getElementById('dynamic-substituted-edo'),
          document.getElementById('euler-liftoff-warning'),
          document.getElementById('euler-steps-container'),
          document.getElementById('solucion-analitica'),
          document.getElementById('desafio-precision'),
          document.getElementById('heun-rk4'),
          document.getElementById('graficas-errores'),
          document.getElementById('simulador-lanzamiento'),
          document.getElementById('evaluacion'),
          document.getElementById('reflexion-conclusiones')
        ].filter(Boolean);

        if (window.MathJax.typesetClear && dynamicTargets.length > 0) {
          try {
            window.MathJax.typesetClear(dynamicTargets);
          } catch (e) {
            // Ignorar si typesetClear no está disponible
          }
        }

        if (dynamicTargets.length > 0) {
          window.MathJax.typesetPromise(dynamicTargets).catch(() => {});
        } else {
          window.MathJax.typesetPromise().catch(() => {});
        }
      } catch (err) {
        console.warn('[App] Error al re-renderizar MathJax:', err);
      }
    }, 60);
  }

  /**
   * Actualiza la tabla formal de parámetros en la sección 4
   */
  function updateParamsTable() {
    const elM = document.getElementById('tbl-val-m');
    const elT = document.getElementById('tbl-val-T');
    const elG = document.getElementById('tbl-val-g');
    const elK = document.getElementById('tbl-val-k');
    const elV0 = document.getElementById('tbl-val-v0');
    const elY0 = document.getElementById('tbl-val-y0');
    const elTf = document.getElementById('tbl-val-tFinal');
    const elH = document.getElementById('tbl-val-h');

    if (elM) elM.textContent = formatNumber(state.m, 0, 0);
    if (elT) elT.textContent = formatNumber(state.T, 0, 0);
    if (elG) elG.textContent = formatNumber(state.g, 2, 2);
    if (elK) elK.textContent = formatNumber(state.k, 0, 1);
    if (elV0) elV0.textContent = formatNumber(state.v0, 2, 2);
    if (elY0) elY0.textContent = formatNumber(state.y0, 2, 2);
    if (elTf) elTf.textContent = `0 a ${formatNumber(state.tFinal, 0, 0)}`;
    if (elH) elH.textContent = formatNumber(state.h, 2, 2);
  }

  /**
   * Actualiza el diagrama interactivo de fuerzas en SVG
   */
  function updateForcesDiagramSVG() {
    const labelThrust = document.getElementById('label-thrust');
    const labelGravity = document.getElementById('label-gravity');
    const labelDrag = document.getElementById('label-drag');

    const arrowLineThrust = document.getElementById('arrow-line-thrust');
    const arrowHeadThrust = document.getElementById('arrow-head-thrust');
    const arrowLineGravity = document.getElementById('arrow-line-gravity');
    const arrowHeadGravity = document.getElementById('arrow-head-gravity');

    const weightVal = state.m * state.g;

    if (labelThrust) {
      labelThrust.textContent = `T = ${formatNumber(state.T, 0, 0)} N`;
    }
    if (labelGravity) {
      labelGravity.textContent = `mg = ${formatNumber(weightVal, 0, 0)} N`;
    }
    if (labelDrag) {
      labelDrag.textContent = `Fres = ${formatNumber(state.k, 0, 0)}·v N`;
    }

    if (arrowLineThrust && arrowHeadThrust) {
      const thrustScale = Math.min(95, Math.max(40, (state.T / 15000) * 75));
      const yEndThrust = 115 - thrustScale;
      arrowLineThrust.setAttribute('y2', yEndThrust);
      arrowHeadThrust.setAttribute('points', `140,${yEndThrust - 8} 133,${yEndThrust + 6} 147,${yEndThrust + 6}`);
      if (labelThrust) {
        labelThrust.setAttribute('y', yEndThrust + 5);
      }
    }

    if (arrowLineGravity && arrowHeadGravity) {
      const gravityScale = Math.min(95, Math.max(35, (weightVal / 9810) * 70));
      const yEndGravity = 175 + gravityScale;
      arrowLineGravity.setAttribute('y2', yEndGravity);
      arrowHeadGravity.setAttribute('points', `133,${yEndGravity + 8} 127,${yEndGravity - 6} 139,${yEndGravity - 6}`);
      if (labelGravity) {
        labelGravity.setAttribute('y', yEndGravity);
      }
    }

    if (activeForceInspected) {
      displayForceInfo(activeForceInspected);
    }
  }

  /**
   * Actualiza la ecuación diferencial sustituida con los parámetros del estado
   */
  function updateDynamicSubstitutedEDO() {
    const container = document.getElementById('dynamic-substituted-edo');
    if (!container) return;

    const m = state.m || 1000;
    const T = state.T || 15000;
    const g = state.g || 9.81;
    const k = state.k || 100;

    const a0 = (T / m) - g;
    const beta = k / m;

    container.innerHTML = `
      $$\\begin{cases} 
        \\dfrac{dy}{dt} = v \\\\[8pt] 
        \\dfrac{dv}{dt} = ${formatNumber(a0, 2, 2)} - ${formatNumber(beta, 1, 3)} v 
      \\end{cases}$$
    `;

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([container]).catch(() => {});
    }
  }

  /**
   * Inspector de vectores de fuerzas
   */
  let activeForceInspected = null;
  const forceDataMap = {
    thrust: {
      name: 'Fuerza de Empuje Propulsor',
      symbol: 'T',
      variable: 'T (Newtons)',
      direction: 'Hacia arriba (+y, sentido del movimiento)',
      getMagnitude: () => `${formatNumber(state.T, 0, 0)} N`,
      description: 'Fuerza impulsora ascendente generada por los motores cohete mediante la expulsión de masa de escape a alta velocidad. Es la única fuerza que aporta aceleración positiva para vencer la gravedad y el rozamiento del aire.'
    },
    gravity: {
      name: 'Peso Gravitacional',
      symbol: 'F_g = m · g',
      variable: 'P = m · g (Newtons)',
      direction: 'Hacia abajo (-y, sentido contrario al ascenso)',
      getMagnitude: () => `${formatNumber(state.m * state.g, 0, 1)} N (${formatNumber(state.m, 0, 0)} kg × ${formatNumber(state.g, 2, 2)} m/s²)`,
      description: 'Atracción gravitatoria terrestre ejercida sobre la masa del cohete. Se asume uniforme con g = 9,81 m/s².'
    },
    drag: {
      name: 'Resistencia Aerodinámica Lineal',
      symbol: 'F_{res} = k · v',
      variable: 'F_res = k · v (Newtons)',
      direction: 'Hacia abajo (-y, opuesta al vector velocidad)',
      getMagnitude: () => `${formatNumber(state.k, 0, 1)} kg/s × v(t) N`,
      description: 'Fuerza de frenado viscoso debida al arrastre del aire. Crece en forma directamente proporcional a la velocidad instantánea del vehículo.'
    }
  };

  function displayForceInfo(forceKey) {
    const data = forceDataMap[forceKey];
    if (!data) return;

    const titleEl = document.getElementById('inspector-force-name');
    const symbolEl = document.getElementById('inspector-force-symbol');
    const descEl = document.getElementById('inspector-force-desc');
    const metaBox = document.getElementById('inspector-force-meta');
    const varEl = document.getElementById('meta-var');
    const valEl = document.getElementById('meta-val');
    const dirEl = document.getElementById('meta-dir');

    if (titleEl) titleEl.textContent = data.name;
    if (symbolEl) symbolEl.textContent = `[${data.symbol}]`;
    if (descEl) descEl.textContent = data.description;
    if (varEl) varEl.textContent = data.variable;
    if (valEl) valEl.textContent = data.getMagnitude();
    if (dirEl) dirEl.textContent = data.direction;
    if (metaBox) metaBox.style.display = 'flex';
  }

  function resetForceInfo() {
    if (activeForceInspected) {
      displayForceInfo(activeForceInspected);
      return;
    }
    const titleEl = document.getElementById('inspector-force-name');
    const symbolEl = document.getElementById('inspector-force-symbol');
    const descEl = document.getElementById('inspector-force-desc');
    const metaBox = document.getElementById('inspector-force-meta');

    if (titleEl) titleEl.textContent = 'INSPECTOR DE VECTORES DE FUERZA';
    if (symbolEl) symbolEl.textContent = '(Interactúa con el gráfico)';
    if (descEl) descEl.textContent = 'Pasa el cursor o pulsa sobre cualquiera de las 3 flechas vectoriales en el diagrama para examinar su formulación física, sentido en el eje vertical y magnitud instantánea.';
    if (metaBox) metaBox.style.display = 'none';
  }

  function setupForceInspectorInteraction() {
    const forceGroups = document.querySelectorAll('.force-arrow-group');
    forceGroups.forEach((group) => {
      const forceKey = group.getAttribute('data-force');
      group.addEventListener('mouseenter', () => displayForceInfo(forceKey));
      group.addEventListener('mouseleave', () => resetForceInfo());
      group.addEventListener('click', () => {
        forceGroups.forEach((g) => g.classList.remove('active'));
        if (activeForceInspected === forceKey) {
          activeForceInspected = null;
          resetForceInfo();
        } else {
          activeForceInspected = forceKey;
          group.classList.add('active');
          displayForceInfo(forceKey);
        }
      });
    });
  }

  function updateMathParametersDisplay() {
    const summaryEl = document.getElementById('math-params-summary');
    if (!summaryEl) return;

    summaryEl.innerHTML = `
      <div class="param-badge"><span class="badge-label">Masa ($m$):</span> <span class="badge-value">${formatNumber(state.m, 0, 0)} kg</span></div>
      <div class="param-badge"><span class="badge-label">Empuje ($T$):</span> <span class="badge-value">${formatNumber(state.T, 0, 0)} N</span></div>
      <div class="param-badge"><span class="badge-label">Gravedad ($g$):</span> <span class="badge-value">${formatNumber(state.g, 2, 2)} m/s²</span></div>
      <div class="param-badge"><span class="badge-label">Resistencia lineal ($k$):</span> <span class="badge-value">${formatNumber(state.k, 0, 1)} kg/s</span></div>
      <div class="param-badge"><span class="badge-label">Paso inicial ($h$):</span> <span class="badge-value">${formatNumber(state.h, 0, 2)} s</span></div>
      <div class="param-badge"><span class="badge-label">Tiempo final ($t_f$):</span> <span class="badge-value">${formatNumber(state.tFinal, 0, 0)} s</span></div>
    `;
  }

  // =========================================================================
  // 5. CONTROLADOR Y RENDERIZADORES DE LA SECCIÓN 5: MÉTODO DE EULER
  // =========================================================================

  /**
   * Ejecuta el Método de Euler y actualiza la tabla dinámica, las tarjetas de la
   * Pregunta 1 del desafío y el procedimiento didáctico paso a paso.
   */
  function updateEulerSection() {
    if (!window.NumericalMethods || typeof window.NumericalMethods.solveEuler !== 'function') {
      console.warn('[App] NumericalMethods.solveEuler no está disponible.');
      return;
    }

    // Cálculo del método numérico
    currentEulerSeries = window.NumericalMethods.solveEuler(state);

    // 1. Renderizar tabla dinámica de pasos
    renderEulerTable(currentEulerSeries);

    // 2. Renderizar tarjetas de la Pregunta 1
    renderEulerQuestion1Cards(currentEulerSeries, state);

    // 3. Renderizar procedimiento didáctico
    renderEulerDidacticProcedure(currentEulerSeries, state);

    // 4. Actualizar etiqueta resumen de pasos
    const stepInfoEl = document.getElementById('euler-table-step-info');
    if (stepInfoEl) {
      const totalSteps = currentEulerSeries.length - 1;
      stepInfoEl.textContent = `TOTAL PASOS: ${totalSteps} (h = ${formatNumber(state.h, 2, 2)} s | tf = ${formatNumber(state.tFinal, 0, 0)} s)`;
    }

    // 5. Actualizar la Sección 6: Solución Analítica y Tabla Comparativa
    updateAnalyticalSection(currentEulerSeries);
  }

  /**
   * Renderiza el cuerpo de la tabla dinámica de Euler con formato en coma decimal.
   * Aplica las reglas pedagógicas:
   * 1. La última fila lleva la etiqueta 'Fin de simulación'.
   * 2. No se habla de régimen terminal a menos que la aceleración sea inferior al 1 % de la inicial.
   * 3. Si tFinal no es múltiplo de h, se indica mediante una nota visible bajo la tabla.
   * 
   * @param {Array<Object>} series - Serie de pasos de Euler
   */
  function renderEulerTable(series) {
    const tbody = document.getElementById('euler-table-body');
    if (!tbody || !series || !series.length) return;

    const initialAcc = Math.abs((state.T / (state.m || 1000)) - state.g);
    const terminalThreshold = 0.01 * initialAcc; // Menos del 1 % de la aceleración inicial

    const rowsHtml = series.map((step, idx) => {
      let statusBadge = '';
      const isLastStep = (idx === series.length - 1);

      if (isLastStep) {
        // Regla 1: Cambiar la etiqueta de la última fila por "Fin de simulación"
        statusBadge = '<span class="flight-status-badge badge-status-end">Fin de simulación</span>';
      } else if (step.n === 0) {
        statusBadge = '<span class="flight-status-badge badge-status-launch">Despegue T=0</span>';
      } else if (state.T < (state.m * state.g) && step.y === 0) {
        statusBadge = '<span class="flight-status-badge badge-status-pad">En Plataforma</span>';
      } else if (terminalThreshold > 0 && Math.abs(step.a) < terminalThreshold) {
        // Regla 1: Solo "Régimen Terminal" si la aceleración es menor al 1 % de la inicial
        statusBadge = '<span class="flight-status-badge badge-status-terminal">Régimen Terminal</span>';
      } else {
        statusBadge = '<span class="flight-status-badge badge-status-ascent">Ascenso Impulsado</span>';
      }

      return `
        <tr>
          <td class="col-step">${step.n}</td>
          <td class="col-numeric">${formatNumber(step.t, 2, 2)}</td>
          <td class="col-numeric">${formatNumber(step.v, 4, 4)}</td>
          <td class="col-numeric">${formatNumber(step.y, 4, 4)}</td>
          <td class="col-numeric">${formatNumber(step.a, 4, 4)}</td>
          <td style="text-align: right;">${statusBadge}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Regla 2: Nota visible bajo la tabla cuando tFinal no es múltiplo de h
    const lastStep = series[series.length - 1];
    const isStepAdjusted = lastStep && (lastStep.isLastStepAdjusted || (Math.abs(state.tFinal % state.h) > 1e-4));
    const adaptiveNoteEl = document.getElementById('euler-adaptive-step-note');
    const adaptiveContentEl = document.getElementById('euler-adaptive-step-content');

    if (adaptiveNoteEl && adaptiveContentEl) {
      if (isStepAdjusted) {
        adaptiveNoteEl.style.display = 'flex';
        const lastDt = lastStep.h;
        adaptiveContentEl.innerHTML = `
          <strong>AJUSTE DE PASO FINAL:</strong> Dado que el tiempo final ($t_f = ${formatNumber(state.tFinal, 0, 2)}\\text{ s}$) no es múltiplo exacto del paso $h = ${formatNumber(state.h, 0, 2)}\\text{ s}$, el último paso ($n = ${lastStep.n}$) se redujo automáticamente a un intervalo más corto de $\\Delta t = ${formatNumber(lastDt, 2, 2)}\\text{ s}$ para concluir exactamente en el límite de simulación $t = ${formatNumber(state.tFinal, 2, 2)}\\text{ s}$.
        `;
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise([adaptiveNoteEl]).catch(() => {});
        }
      } else {
        adaptiveNoteEl.style.display = 'none';
      }
    }
  }

  /**
   * Busca el valor más preciso en la serie para un tiempo determinado tTarget.
   */
  function findSeriesPointAtTime(series, targetT) {
    if (!series || !series.length) return null;
    const exact = series.find(p => Math.abs(p.t - targetT) < 1e-4);
    if (exact) return exact;

    // Si no está exacto y targetT está dentro del rango, interpolar
    const maxT = series[series.length - 1].t;
    if (targetT > maxT) return null;

    for (let i = 0; i < series.length - 1; i++) {
      if (series[i].t <= targetT && series[i + 1].t >= targetT) {
        const p0 = series[i];
        const p1 = series[i + 1];
        const frac = (targetT - p0.t) / (p1.t - p0.t);
        return {
          t: targetT,
          v: p0.v + frac * (p1.v - p0.v),
          y: p0.y + frac * (p1.y - p0.y),
          isInterpolated: true
        };
      }
    }
    return null;
  }

  /**
   * Actualiza las tarjetas de respuesta a la Pregunta 1 del desafío
   * (velocidad a 2 s, 4 s, 10 s, 20 s y altitud a 20 s).
   */
  function renderEulerQuestion1Cards(series, params) {
    const elV2 = document.getElementById('q1-val-v2');
    const elV4 = document.getElementById('q1-val-v4');
    const elV10 = document.getElementById('q1-val-v10');
    const elV20 = document.getElementById('q1-val-v20');
    const elY20 = document.getElementById('q1-val-y20');

    const subV2 = document.getElementById('q1-sub-v2');
    const subV4 = document.getElementById('q1-sub-v4');
    const subV10 = document.getElementById('q1-sub-v10');
    const subV20 = document.getElementById('q1-sub-v20');
    const subY20 = document.getElementById('q1-sub-y20');

    const p2 = findSeriesPointAtTime(series, 2.0);
    const p4 = findSeriesPointAtTime(series, 4.0);
    const p10 = findSeriesPointAtTime(series, 10.0);
    const p20 = findSeriesPointAtTime(series, 20.0);

    if (elV2) {
      if (p2) {
        elV2.innerHTML = `${formatNumber(p2.v, 4, 4)} <span class="q1-card-unit">m/s</span>`;
        if (subV2) subV2.textContent = p2.isInterpolated ? 'Interpolado (paso no coincide)' : 'Paso n exacto en t = 2 s';
      } else {
        elV2.innerHTML = `-- <span class="q1-card-unit">m/s</span>`;
        if (subV2) subV2.textContent = 'Fuera del rango de simulación';
      }
    }

    if (elV4) {
      if (p4) {
        elV4.innerHTML = `${formatNumber(p4.v, 4, 4)} <span class="q1-card-unit">m/s</span>`;
        if (subV4) subV4.textContent = p4.isInterpolated ? 'Interpolado (paso no coincide)' : 'Paso n exacto en t = 4 s';
      } else {
        elV4.innerHTML = `-- <span class="q1-card-unit">m/s</span>`;
        if (subV4) subV4.textContent = 'Fuera del rango de simulación';
      }
    }

    if (elV10) {
      if (p10) {
        elV10.innerHTML = `${formatNumber(p10.v, 4, 4)} <span class="q1-card-unit">m/s</span>`;
        if (subV10) subV10.textContent = p10.isInterpolated ? 'Interpolado' : 'Paso n exacto en t = 10 s';
      } else {
        elV10.innerHTML = `-- <span class="q1-card-unit">m/s</span>`;
        if (subV10) subV10.textContent = 'Fuera del rango de simulación';
      }
    }

    if (elV20) {
      if (p20) {
        elV20.innerHTML = `${formatNumber(p20.v, 4, 4)} <span class="q1-card-unit">m/s</span>`;
        if (subV20) subV20.textContent = p20.isInterpolated ? 'Interpolado' : 'Velocidad al final del horizonte';
      } else {
        elV20.innerHTML = `-- <span class="q1-card-unit">m/s</span>`;
        if (subV20) subV20.textContent = 'Fuera del rango de simulación';
      }
    }

    if (elY20) {
      if (p20) {
        elY20.innerHTML = `${formatNumber(p20.y, 4, 4)} <span class="q1-card-unit">m</span>`;
        if (subY20) subY20.textContent = 'Pregunta 2: Altitud a los 20 s';
      } else {
        elY20.innerHTML = `-- <span class="q1-card-unit">m</span>`;
        if (subY20) subY20.textContent = 'Fuera del rango de simulación';
      }
    }
  }

  /**
   * Renderiza el desglose didáctico del procedimiento paso a paso para cada iteración.
   */
  function renderEulerDidacticProcedure(series, params) {
    const container = document.getElementById('euler-steps-container');
    if (!container || !series || series.length < 2) return;

    if (!window.NumericalMethods || typeof window.NumericalMethods.generateAllEulerSteps !== 'function') {
      return;
    }

    const stepsData = window.NumericalMethods.generateAllEulerSteps(series, params);

    // Limitamos a los primeros 12 pasos para mantener una navegación ágil en pantallas pequeñas si h es muy pequeño
    const maxStepsToRender = Math.min(stepsData.length, 12);
    const visibleSteps = stepsData.slice(0, maxStepsToRender);

    const cardsHtml = visibleSteps.map((step) => {
      const calloutClass = step.isDiscretizationCallout ? 'style="border-color: var(--electric-blue);"' : '';

      return `
        <article class="euler-step-card" ${calloutClass}>
          <div class="step-card-header">
            <span class="step-card-title">ITERACIÓN PASO n = ${step.n} ➔ n+1 = ${step.nextN}</span>
            <span class="step-card-interval">Intervalo [${formatNumber(step.t0, 2, 2)} s, ${formatNumber(step.t1, 2, 2)} s] (Δt = ${formatNumber(step.h, 2, 2)} s)</span>
          </div>
          <div class="step-card-body">
            <div class="step-calcs-grid">
              <!-- Cálculo de Aceleración -->
              <div class="step-calc-box">
                <div class="step-calc-label">1. Aceleración en t = ${formatNumber(step.t0, 2, 2)} s</div>
                <div class="step-calc-formula">$$a_n = \\frac{T}{m} - g - \\frac{k}{m}v_n$$</div>
                <div class="step-calc-subst">$$${step.substA}$$</div>
              </div>

              <!-- Actualización de Velocidad -->
              <div class="step-calc-box">
                <div class="step-calc-label">2. Actualización de Velocidad</div>
                <div class="step-calc-formula">$$v_{n+1} = v_n + h \\cdot a_n$$</div>
                <div class="step-calc-subst">$$${step.substV}$$</div>
              </div>

              <!-- Actualización de Altura -->
              <div class="step-calc-box">
                <div class="step-calc-label">3. Actualización de Posición (Altura)</div>
                <div class="step-calc-formula">$$y_{n+1} = y_n + h \\cdot v_n$$</div>
                <div class="step-calc-subst">$$${step.substY}$$</div>
              </div>
            </div>

            <!-- Interpretación Física -->
            <div class="step-interpretation-box">
              <strong>Interpretación física:</strong> ${step.interpretation}
            </div>
          </div>
        </article>
      `;
    }).join('');

    let noticeMore = '';
    if (stepsData.length > maxStepsToRender) {
      noticeMore = `
        <div style="text-align: center; padding: 1rem; color: var(--text-dim); font-family: var(--font-mono); font-size: 0.82rem;">
          Mostrando los primeros ${maxStepsToRender} de ${stepsData.length} pasos didácticos. Puedes descargar la tabla completa en formato CSV.
        </div>
      `;
    }

    container.innerHTML = cardsHtml + noticeMore;

    // Procesar expresiones matemáticas MathJax
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([container]).catch(() => {});
    }
  }

  /**
   * Actualiza la Sección 6: Solución Analítica.
   * Calcula los valores exactos, actualiza las tarjetas métricas de contraste y llena
   * la tabla comparativa punto a punto Euler vs. Exacta con error absoluto y relativo en cada instante.
   * 
   * @param {Array<Object>} [eulerSeries] - Serie temporal de Euler (opcional, usa currentEulerSeries)
   */
  function updateAnalyticalSection(eulerSeries) {
    if (!window.Mathematics) return;

    const series = eulerSeries || currentEulerSeries;
    if (!series || !series.length) return;

    const p = state;
    const tFinal = p.tFinal || 20.0;

    // 1. Valores analíticos exactos evaluados en tFinal (ej. t = 20 s)
    const vExactFin = window.Mathematics.velocidadExacta(tFinal, p);
    const yExactFin = window.Mathematics.alturaExacta(tFinal, p);
    const vInf = window.Mathematics.calculateTerminalVelocity(p.m, p.T, p.g, p.k);

    const lastEuler = series[series.length - 1];
    const diffV = lastEuler ? lastEuler.v - vExactFin : 0;
    const diffY = lastEuler ? lastEuler.y - yExactFin : 0;
    const relErrY = yExactFin > 0 ? (Math.abs(diffY) / yExactFin) * 100 : 0;

    // 2. Actualizar tarjetas métricas de referencia
    const elV20 = document.getElementById('exact-val-v20');
    const elY20 = document.getElementById('exact-val-y20');
    const elVinf = document.getElementById('exact-val-vinf');
    const elRelY = document.getElementById('exact-val-rely');

    if (elV20) {
      elV20.innerHTML = `${formatNumber(vExactFin, 4, 4)} <span class="q1-card-unit">m/s</span>`;
      const card = elV20.closest('.q1-metric-card');
      const sub = card ? card.querySelector('.q1-card-sub') : null;
      if (sub && lastEuler) {
        const sign = diffV >= 0 ? '+' : '';
        sub.textContent = `Euler: ${formatNumber(lastEuler.v, 4, 4)} m/s (Error: ${sign}${formatNumber(diffV, 4, 4)} m/s)`;
      }
    }

    if (elY20) {
      elY20.innerHTML = `${formatNumber(yExactFin, 4, 4)} <span class="q1-card-unit">m</span>`;
      const card = elY20.closest('.q1-metric-card');
      const sub = card ? card.querySelector('.q1-card-sub') : null;
      if (sub && lastEuler) {
        const sign = diffY >= 0 ? '+' : '';
        sub.textContent = `Euler: ${formatNumber(lastEuler.y, 4, 4)} m (Error: ${sign}${formatNumber(diffY, 4, 4)} m)`;
      }
    }

    if (elVinf) {
      const card = elVinf.closest('.q1-metric-card');
      const sub = card ? card.querySelector('.q1-card-sub') : null;
      if (!isFinite(vInf) || isNaN(vInf) || p.k <= 0) {
        elVinf.innerHTML = `No aplicable <span class="q1-card-unit">(k = 0)</span>`;
        if (sub) sub.textContent = 'Sin resistencia: aceleración constante indefinida';
      } else {
        elVinf.innerHTML = `${formatNumber(vInf, 4, 4)} <span class="q1-card-unit">m/s</span>`;
        if (sub) sub.textContent = 'Asíntota teórica cuando t ➔ ∞';
      }
    }

    if (elRelY) {
      const card = elRelY.closest('.q1-metric-card');
      const sub = card ? card.querySelector('.q1-card-sub') : null;
      if (yExactFin === 0 && (!lastEuler || lastEuler.y === 0)) {
        elRelY.innerHTML = `0,00 <span class="q1-card-unit">%</span>`;
        if (sub) sub.textContent = 'Sin discrepancia: reposo sobre plataforma';
      } else {
        elRelY.innerHTML = `${formatNumber(relErrY, 2, 2)} <span class="q1-card-unit">%</span>`;
        if (sub) {
          sub.textContent = `Discrepancia global en y (${formatNumber(Math.abs(diffY), 4, 4)} m con h = ${formatNumber(p.h, 2, 2)} s)`;
        }
      }
    }

    // 3. Info de la tabla comparativa
    const tableInfoEl = document.getElementById('analytical-table-step-info');
    if (tableInfoEl) {
      tableInfoEl.textContent = `CONTRASTE PUNTO A PUNTO (TOTAL: ${series.length} INSTANTES | h = ${formatNumber(p.h, 2, 2)} s)`;
    }

    // 4. Renderizar filas de la tabla comparativa: Euler vs. Exacta
    const tbody = document.getElementById('analytical-comparison-table-body');
    if (!tbody) return;

    const rowsHtml = series.map((step) => {
      const t = step.t;
      const vE = step.v;
      const yE = step.y;

      const vX = window.Mathematics.velocidadExacta(t, p);
      const yX = window.Mathematics.alturaExacta(t, p);

      const errV = Math.abs(vE - vX);
      const errY = Math.abs(yE - yX);
      const relYStep = yX > 0 ? (errY / yX) * 100 : 0;

      return `
        <tr>
          <td class="col-step">${step.n}</td>
          <td class="col-numeric">${formatNumber(t, 2, 2)}</td>
          <td class="col-numeric">${formatNumber(vE, 4, 4)}</td>
          <td class="col-numeric" style="color: var(--sky-blue);">${formatNumber(vX, 4, 4)}</td>
          <td class="col-numeric" style="color: var(--electric-blue); font-weight: 600;">${formatNumber(errV, 4, 4)}</td>
          <td class="col-numeric">${formatNumber(yE, 4, 4)}</td>
          <td class="col-numeric" style="color: var(--sky-blue);">${formatNumber(yX, 4, 4)}</td>
          <td class="col-numeric" style="color: var(--mission-orange); font-weight: 600;">${formatNumber(errY, 4, 4)}</td>
          <td class="col-numeric" style="text-align: right; color: var(--mission-amber); font-weight: bold;">${formatNumber(relYStep, 2, 2)} %</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;
  }

  /**
   * Actualiza la Sección 7: Desafío de Precisión Numérica y Convergencia.
   * - Calcula iteraciones dinámicamente: Math.round(tFinal / h)
   * - Evalúa a t = 20 s con Euler y solución analítica
   * - Actualiza tarjetas con velocidad y altura a los 20 s
   * - Verifica los 2 requisitos de tolerancia (Katherine Johnson):
   *     1. Error de velocidad < 0,5 m/s
   *     2. Error de altura < 5 m
   * - Muestra mensaje condicional ("La precisión todavía es insuficiente. Prueba un paso menor" vs "Precisión alcanzada")
   * - Renderiza la tabla de convergencia para h = 2, 1, 0,5, 0,25 más fila Exacta
   * 
   * @param {number} [customH] - Paso de integración a evaluar (opcional, usa state.h)
   */
  function updatePrecisionSection(customH) {
    if (!window.NumericalMethods || typeof window.NumericalMethods.getPrecisionChallengeData !== 'function') {
      return;
    }

    const currentH = (customH !== undefined) ? customH : state.h;
    const data = window.NumericalMethods.getPrecisionChallengeData(state, currentH);
    if (!data) return;

    const tFinal = data.tFinal;
    const vExact = data.vExact;
    const yExact = data.yExact;
    const stepsData = data.stepsData;
    const activeStep = data.activeStep;

    // 1. Actualizar horizonte en badge
    const horizonBadge = document.getElementById('precision-horizon-badge');
    if (horizonBadge) {
      horizonBadge.textContent = `TIEMPO FINAL: ${formatNumber(tFinal, 0, 0)} s`;
    }

    // 2. Actualizar tarjetas selectoras de paso e iteraciones dinámicas
    const stepCards = document.querySelectorAll('.precision-step-card');
    stepCards.forEach((card) => {
      const cardH = parseFloat(card.getAttribute('data-h'));
      const isActive = Math.abs(cardH - activeStep.h) < 1e-4;
      if (isActive) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }

      // Conteo dinámico de iteraciones: Math.round(tFinal / cardH)
      const iters = Math.round(tFinal / cardH);
      const iterEl = card.querySelector('.precision-step-iter');
      if (iterEl) {
        iterEl.textContent = `${iters} iteraciones`;
      }
    });

    // 3. Etiqueta de paso activo
    const activeStepLabel = document.getElementById('precision-active-step-label');
    if (activeStepLabel) {
      activeStepLabel.textContent = `EVALUANDO PASO ACTIVO: h = ${formatNumber(activeStep.h, 2, 2)} s`;
    }

    // 4. Tarjetas de resultados a los 20 s (Euler vs Exacta)
    const elV20 = document.getElementById('precision-val-v20');
    const subV20 = document.getElementById('precision-sub-v20');
    const elY20 = document.getElementById('precision-val-y20');
    const subY20 = document.getElementById('precision-sub-y20');

    if (elV20) {
      elV20.innerHTML = `${formatNumber(activeStep.vEuler, 4, 4)} <span class="q1-card-unit">m/s</span>`;
    }
    if (subV20) {
      subV20.textContent = `Exacta: ${formatNumber(vExact, 4, 4)} m/s (Error: ${formatNumber(activeStep.errV, 4, 4)} m/s)`;
    }

    if (elY20) {
      elY20.innerHTML = `${formatNumber(activeStep.yEuler, 4, 4)} <span class="q1-card-unit">m</span>`;
    }
    if (subY20) {
      subY20.textContent = `Exacta: ${formatNumber(yExact, 4, 4)} m (Error: ${formatNumber(activeStep.errY, 4, 4)} m)`;
    }

    // 5. Dos indicadores de requisito de Katherine Johnson
    const badgeV = document.getElementById('req-v-badge');
    const valV = document.getElementById('req-v-value');
    const statusV = document.getElementById('req-v-status');

    if (badgeV && valV && statusV) {
      if (activeStep.passV) {
        badgeV.textContent = '✔';
        badgeV.className = 'req-badge-circle req-pass';
        statusV.textContent = '✔ Tolerancia alcanzada (< 0,5 m/s)';
        statusV.style.color = '#10b981';
      } else {
        badgeV.textContent = '✘';
        badgeV.className = 'req-badge-circle req-fail';
        statusV.textContent = '✘ Tolerancia superada (≥ 0,5 m/s)';
        statusV.style.color = '#ef4444';
      }
      valV.textContent = `Error: ${formatNumber(activeStep.errV, 4, 4)} m/s`;
    }

    const badgeY = document.getElementById('req-y-badge');
    const valY = document.getElementById('req-y-value');
    const statusY = document.getElementById('req-y-status');

    if (badgeY && valY && statusY) {
      if (activeStep.passY) {
        badgeY.textContent = '✔';
        badgeY.className = 'req-badge-circle req-pass';
        statusY.textContent = '✔ Tolerancia alcanzada (< 5 m)';
        statusY.style.color = '#10b981';
      } else {
        badgeY.textContent = '✘';
        badgeY.className = 'req-badge-circle req-fail';
        statusY.textContent = '✘ Tolerancia superada (≥ 5 m)';
        statusY.style.color = '#ef4444';
      }
      valY.textContent = `Error: ${formatNumber(activeStep.errY, 4, 4)} m`;
    }

    // 6. Banner de Dictamen Global del Desafío
    const banner = document.getElementById('precision-verdict-banner');
    const bannerIcon = document.getElementById('precision-verdict-icon');
    const bannerTitle = document.getElementById('precision-verdict-title');
    const bannerDesc = document.getElementById('precision-verdict-desc');

    if (banner && bannerTitle) {
      if (activeStep.allPass) {
        banner.className = 'precision-banner banner-success';
        if (bannerIcon) bannerIcon.textContent = '🚀';
        bannerTitle.textContent = 'Precisión alcanzada';
        if (bannerDesc) {
          bannerDesc.textContent = `Los dos requisitos de Katherine Johnson se han cumplido: Error en velocidad (${formatNumber(activeStep.errV, 4, 4)} m/s < 0,5 m/s) y error en altitud (${formatNumber(activeStep.errY, 4, 4)} m < 5 m). La trayectoria es apta para la verificación de vuelo.`;
        }
      } else {
        banner.className = 'precision-banner banner-warning';
        if (bannerIcon) bannerIcon.textContent = '⚠️';
        bannerTitle.textContent = 'La precisión todavía es insuficiente. Prueba un paso menor';
        if (bannerDesc) {
          const failReasons = [];
          if (!activeStep.passV) failReasons.push(`velocidad (${formatNumber(activeStep.errV, 4, 4)} m/s ≥ 0,5 m/s)`);
          if (!activeStep.passY) failReasons.push(`altitud (${formatNumber(activeStep.errY, 4, 4)} m ≥ 5 m)`);
          bannerDesc.textContent = `Con h = ${formatNumber(activeStep.h, 2, 2)} s las desviaciones en ${failReasons.join(' y ')} impiden validar la trayectoria para el programa Mercury.`;
        }
      }
    }

    // 7. Tabla de convergencia global
    const tbody = document.getElementById('precision-convergence-table-body');
    if (!tbody) return;

    let rowsHtml = stepsData.map((s) => {
      const isActive = Math.abs(s.h - activeStep.h) < 1e-4;
      const activeClass = isActive ? ' class="row-active-step"' : '';
      const badgeClass = s.allPass ? 'status-nominal' : 'status-ascent';
      const badgeText = s.allPass ? '✔ Cumplido' : '✘ Insuficiente';

      return `
        <tr${activeClass}>
          <td class="col-step" style="font-weight: 700;">${formatNumber(s.h, 2, 2)} s</td>
          <td class="col-numeric">${formatNumber(s.vEuler, 4, 4)}</td>
          <td class="col-numeric" style="color: var(--electric-blue); font-weight: 600;">${formatNumber(s.errV, 4, 4)}</td>
          <td class="col-numeric">${formatNumber(s.yEuler, 4, 4)}</td>
          <td class="col-numeric" style="color: var(--mission-orange); font-weight: 600;">${formatNumber(s.errY, 4, 4)}</td>
          <td class="col-numeric" style="text-align: right;">
            <span class="flight-status-badge ${badgeClass}">${badgeText}</span>
          </td>
        </tr>
      `;
    }).join('');

    // Fila Exacta
    rowsHtml += `
      <tr style="background: rgba(14, 165, 233, 0.08); font-weight: bold;">
        <td class="col-step" style="color: var(--sky-blue); font-weight: 700;">Exacta</td>
        <td class="col-numeric" style="color: var(--sky-blue);">${formatNumber(vExact, 4, 4)}</td>
        <td class="col-numeric" style="color: var(--text-dim);">0,0000</td>
        <td class="col-numeric" style="color: var(--sky-blue);">${formatNumber(yExact, 4, 4)}</td>
        <td class="col-numeric" style="color: var(--text-dim);">0,0000</td>
        <td class="col-numeric" style="text-align: right;">
          <span class="flight-status-badge badge-status-end">Referencia</span>
        </td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
  }

  let activeMethodFilter = 'all';

  /**
   * Actualiza la Sección 8: Métodos de Heun y Runge-Kutta 4 (RK4).
   * - Resuelve el sistema acoplado con vector de estado X = [y, v] simultáneamente para Euler, Heun, RK4 y Exacta.
   * - Comprobación canónica a t = 2 s (Heun v=9,342, y=10,38 ; RK4 v≈9,4076).
   * - Renderiza la tabla comparativa multi-método: Tiempo | Euler (v, y) | Heun (v, y) | RK4 (v, y) | Analítica (v, y).
   * - Aplica los botones de selección y filtros (Euler, Heun, RK4, Todos).
   */
  function updateHeunRK4Section() {
    if (!window.NumericalMethods || typeof window.NumericalMethods.solveAllMethods !== 'function') {
      return;
    }

    const allData = window.NumericalMethods.solveAllMethods(state);
    if (!allData || !allData.rows) return;

    // 1. Info del paso temporal activo
    const stepInfoEl = document.getElementById('multi-method-table-step-info');
    if (stepInfoEl) {
      stepInfoEl.textContent = `PASO ACTIVO: h = ${formatNumber(state.h, 2, 2)} s | TOTAL INSTANTES: ${allData.rows.length}`;
    }

    // 2. Comprobación canónica a t = 2 s
    const check2 = allData.checkAtT2;
    if (check2) {
      const elEulerV = document.getElementById('t2-val-euler-v');
      const elEulerY = document.getElementById('t2-val-euler-y');
      const elDiffEuler = document.getElementById('t2-diff-euler');

      const elHeunV = document.getElementById('t2-val-heun-v');
      const elHeunY = document.getElementById('t2-val-heun-y');
      const elDiffHeun = document.getElementById('t2-diff-heun');

      const elRk4V = document.getElementById('t2-val-rk4-v');
      const elRk4Y = document.getElementById('t2-val-rk4-y');
      const elDiffRk4 = document.getElementById('t2-diff-rk4');

      const elExactV = document.getElementById('t2-val-exact-v');
      const elExactY = document.getElementById('t2-val-exact-y');

      const vEx = check2.exact.v;
      const yEx = check2.exact.y;

      if (elEulerV) elEulerV.textContent = `${formatNumber(check2.euler.v, 4, 4)} m/s`;
      if (elEulerY) elEulerY.textContent = `${formatNumber(check2.euler.y, 4, 4)} m`;
      if (elDiffEuler) {
        const errY = check2.euler.y - yEx;
        elDiffEuler.textContent = `Error en y: ${errY >= 0 ? '+' : ''}${formatNumber(errY, 4, 4)} m (Euler asume v₀=0 en todo el intervalo)`;
      }

      if (elHeunV) elHeunV.textContent = `${formatNumber(check2.heun.v, 4, 4)} m/s`;
      if (elHeunY) elHeunY.textContent = `${formatNumber(check2.heun.y, 4, 4)} m`;
      if (elDiffHeun) {
        const errY = check2.heun.y - yEx;
        elDiffHeun.textContent = `v(2) = ${formatNumber(check2.heun.v, 4, 4)} m/s y y(2) = ${formatNumber(check2.heun.y, 4, 4)} m (Error y: ${errY >= 0 ? '+' : ''}${formatNumber(errY, 4, 4)} m)`;
      }

      if (elRk4V) elRk4V.textContent = `${formatNumber(check2.rk4.v, 4, 4)} m/s`;
      if (elRk4Y) elRk4Y.textContent = `${formatNumber(check2.rk4.y, 4, 4)} m`;
      if (elDiffRk4) {
        const errY = check2.rk4.y - yEx;
        elDiffRk4.textContent = `v(2) ≈ ${formatNumber(check2.rk4.v, 4, 4)} m/s (Discrepancia menor a 0,002 m frente a la exacta)`;
      }

      if (elExactV) elExactV.textContent = `${formatNumber(vEx, 4, 4)} m/s`;
      if (elExactY) elExactY.textContent = `${formatNumber(yEx, 4, 4)} m`;
    }

    // 3. Renderizar filas de la tabla comparativa multi-método
    const tbody = document.getElementById('multi-method-table-body');
    if (!tbody) return;

    const rowsHtml = allData.rows.map((row) => {
      return `
        <tr>
          <td class="col-step" style="font-weight: 700; text-align: center;">${formatNumber(row.t, 2, 2)}</td>
          <td class="col-numeric col-euler" style="color: var(--sky-blue);">${formatNumber(row.euler.v, 4, 4)}</td>
          <td class="col-numeric col-euler" style="color: var(--sky-blue);">${formatNumber(row.euler.y, 4, 4)}</td>
          <td class="col-numeric col-heun" style="color: var(--mission-amber);">${formatNumber(row.heun.v, 4, 4)}</td>
          <td class="col-numeric col-heun" style="color: var(--mission-amber);">${formatNumber(row.heun.y, 4, 4)}</td>
          <td class="col-numeric col-rk4" style="color: #10b981; font-weight: 600;">${formatNumber(row.rk4.v, 4, 4)}</td>
          <td class="col-numeric col-rk4" style="color: #10b981; font-weight: 600;">${formatNumber(row.rk4.y, 4, 4)}</td>
          <td class="col-numeric col-exact" style="color: var(--mission-orange); font-weight: bold;">${formatNumber(row.exact.v, 4, 4)}</td>
          <td class="col-numeric col-exact" style="color: var(--mission-orange); font-weight: bold;">${formatNumber(row.exact.y, 4, 4)}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // 4. Aplicar filtro activo a la tabla
    const tableEl = document.getElementById('multi-method-comparison-table');
    if (tableEl) {
      tableEl.classList.remove('filter-euler', 'filter-heun', 'filter-rk4', 'filter-all');
      tableEl.classList.add(`filter-${activeMethodFilter}`);
    }

    // 5. Sincronizar botones de filtro
    const filterButtons = document.querySelectorAll('.btn-method-tab');
    filterButtons.forEach((btn) => {
      const method = btn.getAttribute('data-method');
      if (method === activeMethodFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // =========================================================================
  // 5.5 SECCIÓN 9: GRÁFICAS Y ANÁLISIS DE ERROR (CHART.JS)
  // =========================================================================

  /**
   * Actualiza la sección 9 (Gráficas y Errores):
   * 1. Sincroniza inputs y botones de paso inline (h, tFinal).
   * 2. Delega en ChartsManager.updateAllCharts(state) para renderizar las 4 gráficas independientes.
   * 3. Actualiza las 6 tarjetas de telemetría numérica con valores calculados.
   * 4. Evalúa la condición física de Euler y genera la observación pedagógica.
   * 5. Genera la interpretación automática delimitada a este modelo y parámetros.
   */
  function updateChartsSection() {
    if (!window.ChartsManager) return;

    // 1. Sincronizar controles inline de la sección de gráficas
    const inputChartH = document.getElementById('input-chart-h');
    const inputChartTf = document.getElementById('input-chart-tFinal');

    if (inputChartH && document.activeElement !== inputChartH) {
      inputChartH.value = state.h;
    }
    if (inputChartTf && document.activeElement !== inputChartTf) {
      inputChartTf.value = state.tFinal;
    }

    // Botones rápidos de paso h en la barra de gráficas
    const chartStepBtns = document.querySelectorAll('.btn-chart-h');
    chartStepBtns.forEach((btn) => {
      const btnH = parseFloat(btn.getAttribute('data-h'));
      if (Math.abs(btnH - state.h) < 1e-4) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. Renderizar o actualizar las 4 gráficas independientes vía ChartsManager
    const metrics = window.ChartsManager.updateAllCharts(state);
    if (!metrics) return;

    // 3. Actualizar las 6 tarjetas métricas
    const elVFinal = document.getElementById('metric-chart-v-final');
    const elVFinalSub = document.getElementById('metric-chart-v-final-sub');
    const elYFinal = document.getElementById('metric-chart-y-final');
    const elYFinalSub = document.getElementById('metric-chart-y-final-sub');
    const elMaxErr = document.getElementById('metric-chart-max-error');
    const elMaxErrSub = document.getElementById('metric-chart-max-error-sub');
    const elFinErr = document.getElementById('metric-chart-final-error');
    const elFinErrSub = document.getElementById('metric-chart-final-error-sub');
    const elBest = document.getElementById('metric-chart-best-method');
    const elBestSub = document.getElementById('metric-chart-best-method-sub');
    const elIter = document.getElementById('metric-chart-iterations');
    const elIterSub = document.getElementById('metric-chart-iterations-sub');

    if (elVFinal) elVFinal.textContent = `${formatNumber(metrics.vFinalExact, 2, 2)} m/s`;
    if (elVFinalSub) elVFinalSub.textContent = `Exacta en t = ${formatNumber(metrics.tFinal, 0, 0)} s (Euler: ${formatNumber(metrics.euler.v, 2, 2)} m/s)`;

    if (elYFinal) elYFinal.textContent = `${formatNumber(metrics.yFinalExact, 2, 2)} m`;
    if (elYFinalSub) elYFinalSub.textContent = `Exacta en t = ${formatNumber(metrics.tFinal, 0, 0)} s (Euler: ${formatNumber(metrics.euler.y, 2, 2)} m)`;

    if (elMaxErr) elMaxErr.textContent = `${formatNumber(metrics.maxErrorY, 2, 4)} m`;
    if (elMaxErrSub) elMaxErrSub.textContent = `Máxima desviación de altitud registrada (${metrics.maxErrorMethod})`;

    if (elFinErr) elFinErr.textContent = `${formatNumber(metrics.euler.errV, 2, 4)} m/s`;
    if (elFinErrSub) elFinErrSub.textContent = `Euler: ${formatNumber(metrics.euler.errV, 2, 4)} m/s | RK4: ${formatNumber(metrics.rk4.errV, 4, 6)} m/s`;

    if (elBest) elBest.textContent = metrics.bestMethodName;
    if (elBestSub) elBestSub.textContent = `Error residual en v: ${formatNumber(metrics.bestErrV, 4, 6)} m/s (${metrics.bestMethodOrder})`;

    if (elIter) elIter.textContent = `${metrics.iterationsCount} pasos`;
    if (elIterSub) elIterSub.textContent = `N = ${metrics.iterationsCount} con h = ${formatNumber(metrics.h, 2, 2)} s`;

    // 4. Observación pedagógica condicionada sobre el Método de Euler
    const eulerCond = window.ChartsManager.evaluateEulerOverUnderCondition(state);
    const eulerObsBox = document.getElementById('euler-over-under-observation');

    if (eulerObsBox) {
      if (eulerCond.isFullyConfirmed) {
        eulerObsBox.innerHTML = `
          <div class="euler-obs-header">
            <span class="euler-obs-badge">PROPIEDAD NUMÉRICA VERIFICADA</span>
            <h4 class="euler-obs-title">Observación Pedagógica: Comportamiento Asimétrico de Euler</h4>
          </div>
          <div class="euler-obs-body">
            <p>
              <strong>Euler sobreestima la velocidad</strong> (usa la pendiente de aceleración al inicio del intervalo, cuando el empuje neto es máximo antes de crecer la resistencia) y <strong>subestima la altura</strong> (usa la velocidad al inicio del intervalo, cuando el vehículo aún no ha acelerado).
            </p>
            <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #cbd5e1;">
              <em>Verificación cuantitativa con los parámetros actuales:</em> En los <strong>${eulerCond.totalPoints} pasos</strong> evaluados ($t > 0$), se cumple sin excepción que $v_{\\text{Euler}}(t) > v_{\\text{exacta}}(t)$ (desviación final de $+${formatNumber(metrics.euler.errV, 2, 4)}\\text{ m/s}$) e $y_{\\text{Euler}}(t) < y_{\\text{exacta}}(t)$ (desviación final de $-${formatNumber(metrics.euler.errY, 2, 4)}\\text{ m}$).
            </p>
          </div>
        `;
      } else {
        eulerObsBox.innerHTML = `
          <div class="euler-obs-header">
            <span class="euler-obs-badge" style="background: rgba(245, 158, 11, 0.2); color: var(--mission-amber); border-color: rgba(245, 158, 11, 0.5);">COMPORTAMIENTO BAJO PARÁMETROS ALTERADOS</span>
            <h4 class="euler-obs-title">Comportamiento Dinámico del Método de Euler</h4>
          </div>
          <div class="euler-obs-body">
            <p>
              Con la configuración actual de parámetros, la derivada de aceleración o el perfil de velocidad se han modificado respecto al régimen de ascenso estándar: Euler sobreestima la velocidad en <strong>${eulerCond.countOverV} de ${eulerCond.totalPoints}</strong> instantes y subestima la altura en <strong>${eulerCond.countUnderY} de ${eulerCond.totalPoints}</strong> instantes.
            </p>
          </div>
        `;
      }
    }

    // 5. Interpretación automática contextualizada (sin universalizar superioridad)
    const interpContainer = document.getElementById('charts-auto-interpretation');
    if (interpContainer) {
      interpContainer.innerHTML = `
        <p>
          Para el modelo propulsor lineal analizado ($m = ${formatNumber(state.m, 0, 0)}\\text{ kg}$, $T = ${formatNumber(state.T, 0, 0)}\\text{ N}$, $k = ${formatNumber(state.k, 0, 1)}\\text{ kg/s}$) en el intervalo $t \\in [0, ${formatNumber(state.tFinal, 0, 0)}]\\text{ s}$ con paso $h = ${formatNumber(state.h, 2, 2)}\\text{ s}$:
        </p>
        <ul style="margin: 0.5rem 0 0.85rem 1.25rem; line-height: 1.65;">
          <li>
            <strong style="color: #10B981;">${metrics.bestMethodName}:</strong> Registra la menor discrepancia global con la solución analítica, alcanzando un error final en velocidad de $|e_v| = ${formatNumber(metrics.rk4.errV, 4, 6)}\\text{ m/s}$ y en altura de $|e_y| = ${formatNumber(metrics.rk4.errY, 4, 6)}\\text{ m}$. Su error de truncamiento local $O(h^5)$ amortigua notablemente la curvatura no lineal.
          </li>
          <li>
            <strong style="color: #FBBF24;">Método de Heun (2º orden):</strong> El mecanismo predictor-corrector promedia las pendientes en los extremos de cada subintervalo, reduciendo el error a $|e_v| = ${formatNumber(metrics.heun.errV, 4, 4)}\\text{ m/s}$ y $|e_y| = ${formatNumber(metrics.heun.errY, 2, 4)}\\text{ m}$ (más de un orden de magnitud inferior a Euler).
          </li>
          <li>
            <strong style="color: #FF8F3D;">Método de Euler (1er orden):</strong> Acumula el mayor error por discretización, con $|e_v| = ${formatNumber(metrics.euler.errV, 2, 4)}\\text{ m/s}$ y $|e_y| = ${formatNumber(metrics.euler.errY, 2, 4)}\\text{ m}$.
          </li>
        </ul>
        <div class="epistemological-disclaimer">
          <strong>Delimitación metodológica estricta:</strong> Esta conclusión comparativa se limita rigurosamente a este modelo físico con los parámetros y paso evaluados. En el análisis numérico computacional, ningún método es universalmente superior bajo cualquier circunstancia: algoritmos de orden elevado como RK4 requieren 4 evaluaciones de la función derivada por paso frente a 1 sola en Euler; además, ante sistemas rígidos (stiff) o discontinuidades físicas (como el cese abrupto de empuje por agotamiento de combustible), métodos implícitos o esquemas multipaso con control adaptativo resultan más idóneos.
        </div>
      `;
    }
  }

  // =========================================================================
  // 5.7 SECCIÓN 12: REFLEXIÓN PEDAGÓGICA Y CONCLUSIONES DEL DESAFÍO
  // =========================================================================

  const REFLECTION_QUESTIONS = [
    {
      id: '1',
      title: '1. ¿Por qué era importante verificar los cálculos antes de enviar astronautas al espacio?'
    },
    {
      id: '2',
      title: '2. ¿Qué riesgos existirían al utilizar un tamaño de paso demasiado grande?'
    },
    {
      id: '3',
      title: '3. ¿Por qué una aproximación puede parecer razonable y aun así acumular errores importantes?'
    },
    {
      id: '4',
      title: '4. ¿Qué variables reales del lanzamiento no fueron consideradas en nuestro modelo?'
    },
    {
      id: '5',
      title: '5. ¿Por qué el cálculo de una trayectoria lunar requiere un modelo mucho más complejo que el ascenso vertical de este ejercicio?'
    }
  ];

  /**
   * Actualiza dinámicamente las tarjetas métricas y textos de la Sección 12 (Reflexión y Conclusiones)
   * según los parámetros activos de la simulación.
   */
  function updateReflectionSection() {
    if (typeof document === 'undefined') return;

    let vEuler = 46.32727993344;
    let yEuler = 574.7272006656;
    let vExact = 44.8760988;
    let yExact = 589.239031;

    if (window.NumericalMethods && typeof window.NumericalMethods.solveEuler === 'function') {
      const eulerSeries = window.NumericalMethods.solveEuler(state);
      if (eulerSeries && eulerSeries.length > 0) {
        const last = eulerSeries[eulerSeries.length - 1];
        vEuler = last.v;
        yEuler = last.y;
      }
    }

    if (window.Mathematics && typeof window.Mathematics.velocidadExacta === 'function') {
      vExact = window.Mathematics.velocidadExacta(state.tFinal, state);
      yExact = window.Mathematics.alturaExacta(state.tFinal, state);
    }

    const errV = Math.abs(vExact - vEuler);
    const errY = Math.abs(yExact - yEuler);

    const elVEuler = document.getElementById('conclusion-dyn-v-euler');
    const elYEuler = document.getElementById('conclusion-dyn-y-euler');
    const elVExact = document.getElementById('conclusion-dyn-v-exact');
    const elYExact = document.getElementById('conclusion-dyn-y-exact');
    const elErrV = document.getElementById('conclusion-dyn-err-v');
    const elErrY = document.getElementById('conclusion-dyn-err-y');

    if (elVEuler) elVEuler.innerHTML = `${formatNumber(vEuler, 2, 4)} <span class="metric-unit">m/s</span>`;
    if (elYEuler) elYEuler.textContent = `Altitud: ${formatNumber(yEuler, 2, 4)} m`;

    if (elVExact) elVExact.innerHTML = `${formatNumber(vExact, 2, 4)} <span class="metric-unit">m/s</span>`;
    if (elYExact) elYExact.textContent = `Altitud: ${formatNumber(yExact, 2, 4)} m`;

    if (elErrV) elErrV.innerHTML = `+${formatNumber(errV, 2, 4)} <span class="metric-unit">m/s</span>`;
    if (elErrY) elErrY.innerHTML = `-${formatNumber(errY, 2, 4)} <span class="metric-unit">m</span>`;
  }

  /**
   * Guarda una respuesta de reflexión individual en sessionStorage.
   * 
   * @param {string} qid - Número de la pregunta (1 a 5)
   * @param {boolean} showFlash - Si debe mostrar retroalimentación animada en el botón
   * @param {HTMLElement} btnElement - Elemento botón presionado
   */
  function saveSingleReflection(qid, showFlash, btnElement) {
    if (typeof document === 'undefined') return;
    const textarea = document.getElementById(`reflection-q${qid}`);
    const statusEl = document.getElementById(`status-reflection-q${qid}`);
    if (!textarea) return;

    const textVal = textarea.value.trim();
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(`nasa_reflection_q${qid}`, textVal);
      }
    } catch (e) {
      // Ignorar restricciones locales de almacenamiento
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (statusEl) {
      statusEl.textContent = `Guardado en sesión ✔ (${timeStr})`;
      statusEl.classList.add('status-saved');
    }

    if (showFlash && btnElement) {
      btnElement.classList.add('btn-saved-flash');
      const origText = btnElement.innerHTML;
      btnElement.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;"><polyline points="20 6 9 17 4 12"/></svg>
        ¡GUARDADO! ✔
      `;
      setTimeout(() => {
        btnElement.classList.remove('btn-saved-flash');
        btnElement.innerHTML = origText;
      }, 1500);
    }
  }

  /**
   * Genera el documento de texto consolidado con las 5 respuestas y las conclusiones.
   * 
   * @returns {string} Texto formateado
   */
  function generateReflectionsTextDocument() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const studentNameEl = typeof document !== 'undefined' ? document.getElementById('eval-student-name') : null;
    const studentName = studentNameEl && studentNameEl.value.trim().length > 0
      ? studentNameEl.value.trim()
      : 'Estudiante de Métodos Numéricos';

    let text = '================================================================================\n';
    text += ' NASA MISSION 1962 — SIMULADOR BALÍSTICO MEDIANTE MÉTODOS NUMÉRICOS\n';
    text += ' SECCIÓN 12: RESPUESTAS DE REFLEXIÓN CRÍTICA Y CONCLUSIONES DEL DESAFÍO\n';
    text += '================================================================================\n\n';
    text += `ESTUDIANTE: ${studentName}\n`;
    text += `FECHA Y HORA: ${dateStr}\n`;
    text += `PARÁMETROS DEL COHETE: Masa=${state.m} kg, Empuje=${state.T} N, g=${state.g} m/s², k=${state.k} kg/s, Paso h=${state.h} s, tFinal=${state.tFinal} s\n\n`;
    text += '--------------------------------------------------------------------------------\n';
    text += 'RESPUESTAS DE ANÁLISIS CRÍTICO DEL ESTUDIANTE\n';
    text += '--------------------------------------------------------------------------------\n\n';

    REFLECTION_QUESTIONS.forEach((q) => {
      const textarea = typeof document !== 'undefined' ? document.getElementById(`reflection-q${q.id}`) : null;
      const val = textarea && textarea.value.trim().length > 0
        ? textarea.value.trim()
        : '[Respuesta aún no redactada en la sesión]';

      text += `PREGUNTA ${q.id}:\n${q.title}\n\n`;
      text += `RESPUESTA:\n${val}\n\n`;
      text += '--------------------------------------------------------------------------------\n\n';
    });

    text += '================================================================================\n';
    text += 'CONCLUSIÓN DEL DESAFÍO:\n';
    text += 'con h = 2 s, Euler da 46,3273 m/s y 574,7272 m a los 20 s; la solución exacta da\n';
    text += '44,8761 m/s y 589,2390 m. La diferencia demuestra que no basta con obtener un\n';
    text += 'resultado numérico: hay que evaluar su error y decidir si cumple la precisión requerida.\n\n';
    text += 'IDEA CENTRAL DE LA PELÍCULA (HIDDEN FIGURES / TALENTOS OCULTOS):\n';
    text += 'El valor de las matemáticas en decisiones críticas, trasladado al aula como ecuaciones\n';
    text += 'diferenciales convertidas en resultados verificables, interpretados físicamente y con sus\n';
    text += 'limitaciones.\n';
    text += '================================================================================\n';

    return text;
  }

  /**
   * Copia las 5 respuestas y conclusiones al portapapeles del sistema.
   * 
   * @param {HTMLElement} btnElement - Botón que disparó la acción
   */
  function copyReflectionsToClipboard(btnElement) {
    const text = generateReflectionsTextDocument();
    const successFeedback = () => {
      if (btnElement) {
        btnElement.classList.add('copied-success');
        const origHtml = btnElement.innerHTML;
        btnElement.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polyline points="20 6 9 17 4 12"/></svg>
          ¡COPIADO! ✔
        `;
        setTimeout(() => {
          btnElement.classList.remove('copied-success');
          btnElement.innerHTML = origHtml;
        }, 2200);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(successFeedback).catch(() => {
        fallbackCopyText(text, successFeedback);
      });
    } else {
      fallbackCopyText(text, successFeedback);
    }
  }

  /**
   * Mecanismo alternativo para copiar texto en navegadores donde clipboard API esté restringido.
   */
  function fallbackCopyText(text, callback) {
    if (typeof document === 'undefined') return;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      if (callback) callback();
    } catch (e) {
      alert('Por favor, selecciona y copia el texto manualmente.');
    }
    document.body.removeChild(ta);
  }

  /**
   * Descarga las 5 respuestas en un archivo de texto .txt.
   */
  function downloadReflectionsTextFile() {
    const text = generateReflectionsTextDocument();
    const studentNameEl = typeof document !== 'undefined' ? document.getElementById('eval-student-name') : null;
    const studentName = studentNameEl && studentNameEl.value.trim().length > 0
      ? studentNameEl.value.trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '_').replace(/\s+/g, '_')
      : 'Estudiante';

    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof document === 'undefined') {
      return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reflexiones_NASA_1962_${studentName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Inicializa la persistencia en sesión y los eventos interactivos de la Sección 12.
   */
  function initReflectionSection() {
    if (typeof document === 'undefined') return;

    // 1. Cargar respuestas previas almacenadas en la sesión (sin backend)
    REFLECTION_QUESTIONS.forEach((q) => {
      const textarea = document.getElementById(`reflection-q${q.id}`);
      const statusEl = document.getElementById(`status-reflection-q${q.id}`);
      if (!textarea) return;

      try {
        if (typeof sessionStorage !== 'undefined') {
          const saved = sessionStorage.getItem(`nasa_reflection_q${q.id}`);
          if (saved !== null && saved !== undefined && saved.length > 0) {
            textarea.value = saved;
            if (statusEl) {
              statusEl.textContent = 'Guardado en sesión ✔';
              statusEl.classList.add('status-saved');
            }
          }
        }
      } catch (err) {
        // Ignorar restricciones locales de sessionStorage si existieran
      }

      // Auto-guardado en input/blur con debounce
      let debounceSave = null;
      textarea.addEventListener('input', () => {
        if (statusEl) {
          statusEl.textContent = 'Modificado (sin guardar)...';
          statusEl.classList.remove('status-saved');
        }
        if (debounceSave) clearTimeout(debounceSave);
        debounceSave = setTimeout(() => {
          saveSingleReflection(q.id, false);
        }, 1200);
      });
    });

    // 2. Vincular botones individuales de guardar respuesta
    const saveBtns = document.querySelectorAll('.btn-save-reflection');
    saveBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const qid = btn.getAttribute('data-qid');
        saveSingleReflection(qid, true, btn);
      });
    });

    // 3. Botón para copiar las 5 respuestas al portapapeles
    const btnCopy = document.getElementById('btn-copy-reflections');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        copyReflectionsToClipboard(btnCopy);
      });
    }

    // 4. Botón para descargar las 5 respuestas como archivo de texto (.txt)
    const btnDownload = document.getElementById('btn-download-reflections');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        downloadReflectionsTextFile();
      });
    }

    // 5. Renderizar métricas numéricas dinámicas iniciales
    updateReflectionSection();
  }

  // =========================================================================
  // 6. CONTROLADORES DE EVENTOS Y VINCULACIÓN CON LA UI
  // =========================================================================

  /**
   * Vincula los controles de entrada HTML (inputs, botones y selectores) con el Estado Central.
   */
  function bindInputEvents() {
    const numericKeys = ['m', 'T', 'g', 'k', 'v0', 'y0', 'tFinal', 'h'];

    // 1. Inputs de la Sección 5 (Euler)
    numericKeys.forEach((key) => {
      const inputEuler = document.getElementById(`input-euler-${key}`);
      if (inputEuler) {
        inputEuler.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          const update = {};
          update[key] = isNaN(val) ? 0 : val;
          setState(update);
        });
      }
    });

    // 2. Inputs de la Sección 10 (Simulador)
    numericKeys.forEach((key) => {
      const inputSim = document.getElementById(`input-${key}`);
      if (inputSim) {
        inputSim.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          const update = {};
          update[key] = isNaN(val) ? 0 : val;
          setState(update);
        });
      }
    });

    // 3. Selectores rápidos de paso h (h = 2 s, 1 s, 0,5 s, 0,25 s)
    const stepButtons = document.querySelectorAll('.step-selector-btn');
    stepButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-h'));
        if (!isNaN(val) && val > 0) {
          setState({ h: val });
        }
      });
    });

    // 3b. Selectores de paso del Desafío de Precisión (Sección 7)
    const precisionCards = document.querySelectorAll('.precision-step-card');
    precisionCards.forEach((card) => {
      card.addEventListener('click', () => {
        const val = parseFloat(card.getAttribute('data-h'));
        if (!isNaN(val) && val > 0) {
          setState({ h: val });
        }
      });
    });

    // 3c. Botones selectores de método en Sección 8 (Euler, Heun, RK4, Todos)
    const methodTabs = document.querySelectorAll('.btn-method-tab');
    methodTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const method = tab.getAttribute('data-method');
        if (method) {
          activeMethodFilter = method;
          updateHeunRK4Section();
        }
      });
    });

    // 3d. Controles interactivos de la Sección 9 (Gráficas y Errores)
    const methodToggleKeys = [
      { id: 'toggle-method-analytical', chip: 'chip-analytical', key: 'analytical' },
      { id: 'toggle-method-euler', chip: 'chip-euler', key: 'euler' },
      { id: 'toggle-method-heun', chip: 'chip-heun', key: 'heun' },
      { id: 'toggle-method-rk4', chip: 'chip-rk4', key: 'rk4' }
    ];

    methodToggleKeys.forEach(({ id, chip, key }) => {
      const toggleEl = document.getElementById(id);
      const chipEl = document.getElementById(chip);
      if (toggleEl) {
        toggleEl.addEventListener('change', (e) => {
          const isChecked = e.target.checked;
          if (chipEl) {
            if (isChecked) {
              chipEl.classList.add('active');
            } else {
              chipEl.classList.remove('active');
            }
          }
          if (window.ChartsManager) {
            window.ChartsManager.setMethodVisibility(key, isChecked, state);
          }
        });
      }
    });

    // Input inline de paso h en la barra de gráficas
    const inputChartH = document.getElementById('input-chart-h');
    if (inputChartH) {
      inputChartH.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          setState({ h: val });
        }
      });
    }

    // Botones rápidos de paso h en la barra de gráficas
    const chartStepBtns = document.querySelectorAll('.btn-chart-h');
    chartStepBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-h'));
        if (!isNaN(val) && val > 0) {
          setState({ h: val });
        }
      });
    });

    // Input inline de tiempo final tFinal en la barra de gráficas
    const inputChartTf = document.getElementById('input-chart-tFinal');
    if (inputChartTf) {
      inputChartTf.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          setState({ tFinal: val });
        }
      });
    }

    // Botón de restablecimiento de vista a parámetros canónicos
    const btnChartResetView = document.getElementById('btn-chart-reset-view');
    if (btnChartResetView) {
      btnChartResetView.addEventListener('click', () => {
        setState({
          m: 1000.0,
          T: 15000.0,
          g: 9.81,
          k: 100.0,
          v0: 0.0,
          y0: 0.0,
          tFinal: 20.0,
          h: 2.0
        });
        methodToggleKeys.forEach(({ id, chip, key }) => {
          const toggleEl = document.getElementById(id);
          const chipEl = document.getElementById(chip);
          if (toggleEl) toggleEl.checked = true;
          if (chipEl) chipEl.classList.add('active');
          if (window.ChartsManager) window.ChartsManager.setMethodVisibility(key, true);
        });
      });
    }

    // 4. Botones de acción de la Sección 5 (Euler)
    const btnEulerCalc = document.getElementById('btn-euler-calculate');
    if (btnEulerCalc) {
      btnEulerCalc.addEventListener('click', () => {
        updateEulerSection();
        btnEulerCalc.style.transform = 'scale(0.97)';
        setTimeout(() => { btnEulerCalc.style.transform = ''; }, 150);
      });
    }

    const btnEulerReset = document.getElementById('btn-euler-reset');
    if (btnEulerReset) {
      btnEulerReset.addEventListener('click', () => {
        setState({
          m: 1000.0,
          T: 15000.0,
          g: 9.81,
          k: 100.0,
          v0: 0.0,
          y0: 0.0,
          tFinal: 20.0,
          h: 2.0
        });
      });
    }

    const btnEulerToggleSteps = document.getElementById('btn-euler-toggle-steps');
    const eulerProcedurePanel = document.getElementById('euler-procedure-panel');
    if (btnEulerToggleSteps && eulerProcedurePanel) {
      btnEulerToggleSteps.addEventListener('click', () => {
        isEulerProcedureVisible = !isEulerProcedureVisible;
        if (isEulerProcedureVisible) {
          eulerProcedurePanel.style.display = 'block';
          btnEulerToggleSteps.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Ocultar Procedimiento
          `;
        } else {
          eulerProcedurePanel.style.display = 'none';
          btnEulerToggleSteps.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Mostrar Procedimiento
          `;
        }
      });
    }

    const btnEulerDownloadCsv = document.getElementById('btn-euler-download-csv');
    if (btnEulerDownloadCsv) {
      btnEulerDownloadCsv.addEventListener('click', () => {
        if (window.NumericalMethods && typeof window.NumericalMethods.downloadEulerCSV === 'function') {
          if (!currentEulerSeries || !currentEulerSeries.length) {
            currentEulerSeries = window.NumericalMethods.solveEuler(state);
          }
          window.NumericalMethods.downloadEulerCSV(currentEulerSeries, state);
        }
      });
    }

    // 5. Botón principal "INICIAR SIMULACIÓN" en portada
    const btnHeroStart = document.getElementById('btn-hero-start');
    if (btnHeroStart) {
      btnHeroStart.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSection = document.getElementById('simulador-lanzamiento');
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // 6. Botón "COMENZAR DESAFÍO" en contexto histórico
    const btnStartChallenge = document.getElementById('btn-start-challenge');
    if (btnStartChallenge) {
      btnStartChallenge.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSection = document.getElementById('planteamiento-problema');
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // 7. Botones de control del simulador: gestionados y vinculados en Simulation.initSimulationSVG

    // 8. Menú móvil
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (mobileMenuToggle && navLinks) {
      mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('nav-open');
      });

      navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('nav-open');
        });
      });
    }
  }

  // =========================================================================
  // 7. NAVEGACIÓN, INDICADOR DE PROGRESO Y SCROLL SPY (12 SECCIONES)
  // =========================================================================

  const SECTION_IDS = [
    'inicio',
    'contexto-historico',
    'planteamiento-problema',
    'modelo-matematico',
    'metodo-euler',
    'solucion-analitica',
    'desafio-precision',
    'heun-rk4',
    'graficas-errores',
    'simulador-lanzamiento',
    'evaluacion',
    'reflexion-conclusiones'
  ];

  function setupScrollSpy() {
    const progressBar = document.getElementById('reading-progress-bar');
    const navItems = document.querySelectorAll('.nav-link');

    function onScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progressPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
      }

      const scrollPosition = scrollTop + 160;

      let currentSectionId = SECTION_IDS[0];
      for (let i = 0; i < SECTION_IDS.length; i++) {
        const sectionEl = document.getElementById(SECTION_IDS[i]);
        if (sectionEl) {
          const top = sectionEl.offsetTop;
          const height = sectionEl.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            currentSectionId = SECTION_IDS[i];
            break;
          }
        }
      }

      navItems.forEach((link) => {
        const href = link.getAttribute('href');
        if (href === `#${currentSectionId}`) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // =========================================================================
  // 8. RELOJ DE MISIÓN ESTILO NASA 1962 (MET: MISSION ELAPSED TIME)
  // =========================================================================

  function startMissionClock() {
    const clockEl = document.getElementById('mission-clock');
    if (!clockEl) return;

    let baseSeconds = 0;
    setInterval(() => {
      baseSeconds++;
      const hrs = String(Math.floor(baseSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((baseSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(baseSeconds % 60).padStart(2, '0');
      clockEl.textContent = `MET +${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  // =========================================================================
  // 9. INICIALIZACIÓN GLOBAL DE LA APLICACIÓN
  // =========================================================================

  function init() {
    console.log('[App] NASA MISSION 1962 — Inicializando simulador con parámetros del desafío.');
    
    bindInputEvents();
    setupScrollSpy();
    syncUIWithState();
    setupForceInspectorInteraction();
    startMissionClock();

    // Inicializar contenedor SVG de simulación si está disponible
    if (window.Simulation && typeof window.Simulation.initSimulationSVG === 'function') {
      window.Simulation.initSimulationSVG('rocket-svg-container');
    }

    // Inicializar módulo de evaluación si está disponible
    if (window.EvaluationModule && typeof window.EvaluationModule.initEvaluation === 'function') {
      window.EvaluationModule.initEvaluation('quiz-container');
    }

    // Inicializar sección 12 de reflexión y conclusiones
    initReflectionSection();

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise().catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    getState: getState,
    setState: setState,
    subscribe: subscribe,
    formatNumber: formatNumber,
    validateParameters: validateParameters,
    syncUIWithState: syncUIWithState,
    updateEulerSection: updateEulerSection,
    updateAnalyticalSection: updateAnalyticalSection,
    updatePrecisionSection: updatePrecisionSection,
    updateHeunRK4Section: updateHeunRK4Section,
    updateChartsSection: updateChartsSection,
    updateReflectionSection: updateReflectionSection,
    initReflectionSection: initReflectionSection
  };
})();
