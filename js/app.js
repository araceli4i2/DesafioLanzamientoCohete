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

    // Actualizar la Sección 5 (Método de Euler)
    if (validation.isValid) {
      updateEulerSection();
    }
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

    // 7. Botones de control del simulador (Lanzar, Pausar, Reiniciar)
    const btnLaunch = document.getElementById('btn-sim-launch');
    const btnPause = document.getElementById('btn-sim-pause');
    const btnReset = document.getElementById('btn-sim-reset');

    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => {
        if (window.Simulation) {
          window.Simulation.startSimulation();
        }
      });
    }

    if (btnPause) {
      btnPause.addEventListener('click', () => {
        if (window.Simulation) {
          window.Simulation.pauseSimulation();
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (window.Simulation) {
          window.Simulation.resetSimulation();
        }
      });
    }

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
    updateEulerSection: updateEulerSection
  };
})();
