/**
 * NASA MISSION 1962 — SIMULADOR DE LANZAMIENTO ESPACIAL
 * Módulo: app.js
 * 
 * Responsabilidad: Controlador principal de la aplicación, gestión del Estado Central
 * compartido (Store reactivo con suscripción), formateo internacional en español (coma decimal),
 * navegación entre las 12 secciones, sincronización de la interfaz y eventos globales.
 * 
 * Cumplimiento estricto de reglas:
 * 1. Todos los números para presentación usan coma decimal con Intl.NumberFormat('es').
 * 2. Cálculos internos se mantienen en punto decimal flotante estándar.
 * 3. La UI no recalcula fórmulas; delega en los módulos correspondientes.
 * 4. Estado centralizado único para todas las secciones.
 */

window.App = (function () {
  'use strict';

  // =========================================================================
  // 1. FORMATEADOR INTERNACIONAL NUMÉRICO (REGLAS GLOBALES DEL PROYECTO)
  // =========================================================================

  /**
   * Formatea cualquier valor numérico para visualización en español (coma decimal).
   * Internamente los cálculos continúan operando con punto decimal.
   * 
   * @param {number} value - Número a formatear
   * @param {number} [minDecimals=2] - Mínimo de cifras decimales
   * @param {number} [maxDecimals=4] - Máximo de cifras decimales
   * @returns {string} Cadena con coma decimal (ej. "46,3273")
   */
  function formatNumber(value, minDecimals = 2, maxDecimals = 4) {
    if (value === null || value === undefined || isNaN(value)) {
      return '--';
    }
    const formatter = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals
    });
    return formatter.format(value);
  }

  // =========================================================================
  // 2. ESTADO CENTRAL COMPARTIDO (STORE CON SISTEMA DE SUSCRIPCIÓN)
  // =========================================================================

  /**
   * Parámetros oficiales del desafío de lanzamiento espacial:
   * m = 1000 kg; T = 15000 N; g = 9,81 m/s²; k = 100 kg/s (resistencia LINEAL);
   * v0 = 0 m/s; y0 = 0 m; tFinal = 20 s; h = 2 s.
   */
  const defaultState = {
    m: 1000.0,      // Masa del cohete (kg)
    T: 15000.0,     // Empuje de los motores (N)
    g: 9.81,        // Aceleración gravitatoria (m/s²)
    k: 100.0,       // Coeficiente de resistencia lineal (kg/s)
    v0: 0.0,        // Velocidad inicial (m/s)
    y0: 0.0,        // Altura inicial en plataforma (m)
    tFinal: 20.0,   // Tiempo total de simulación (s)
    h: 2.0,         // Paso de integración dt (s)
    selectedMethod: 'all',
    activeSection: 'inicio'
  };

  // Objeto de estado actual
  let state = Object.assign({}, defaultState);

  // Lista de observadores/suscriptores registrados
  const subscribers = [];

  /**
   * Obtiene una copia del estado actual.
   * @returns {Object} Estado central actual
   */
  function getState() {
    return Object.assign({}, state);
  }

  /**
   * Actualiza el estado central con nuevos parámetros y notifica a todos los suscriptores.
   * 
   * @param {Object} partialState - Nuevos valores de parámetros a fusionar
   */
  function setState(partialState) {
    const prevState = Object.assign({}, state);
    state = Object.assign({}, state, partialState);

    // Notificar a todos los módulos y componentes suscritos
    subscribers.forEach((callback) => {
      try {
        callback(state, prevState);
      } catch (err) {
        console.error('[App Store] Error en suscriptor de estado:', err);
      }
    });

    // Actualizar visualización de parámetros en la UI
    syncUIWithState();
  }

  /**
   * Registra una función callback que se ejecutará cada vez que el estado cambie.
   * 
   * @param {Function} callback - Función receptora (newState, prevState)
   * @returns {Function} Función para cancelar la suscripción
   */
  function subscribe(callback) {
    if (typeof callback === 'function') {
      subscribers.push(callback);
      // Ejecución inicial inmediata para sincronizar
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
  // 3. SINCRONIZACIÓN DE LA INTERFAZ CON EL ESTADO CENTRAL
  // =========================================================================

  /**
   * Sincroniza los valores de los inputs de control y las etiquetas numéricas
   * reflejando siempre la representación en coma decimal.
   */
  function syncUIWithState() {
    const paramInputs = [
      { id: 'input-m', key: 'm', decimals: 0 },
      { id: 'input-T', key: 'T', decimals: 0 },
      { id: 'input-g', key: 'g', decimals: 2 },
      { id: 'input-k', key: 'k', decimals: 1 },
      { id: 'input-v0', key: 'v0', decimals: 2 },
      { id: 'input-y0', key: 'y0', decimals: 1 },
      { id: 'input-tFinal', key: 'tFinal', decimals: 0 },
      { id: 'input-h', key: 'h', decimals: 2 }
    ];

    paramInputs.forEach(({ id, key, decimals }) => {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) {
        el.value = state[key];
      }

      // Elementos de visualización en tarjetas de parámetros
      const displayEl = document.getElementById(`display-${key}`);
      if (displayEl) {
        let unit = '';
        if (key === 'm') unit = ' kg';
        if (key === 'T') unit = ' N';
        if (key === 'g') unit = ' m/s²';
        if (key === 'k') unit = ' kg/s';
        if (key === 'v0') unit = ' m/s';
        if (key === 'y0') unit = ' m';
        if (key === 'tFinal') unit = ' s';
        if (key === 'h') unit = ' s';
        displayEl.textContent = formatNumber(state[key], 0, decimals) + unit;
      }
    });

    // Actualizar insignias de parámetros en la portada y modelo matemático
    const heroMassEl = document.getElementById('display-hero-m');
    if (heroMassEl) {
      heroMassEl.textContent = formatNumber(state.m, 0, 0) + ' kg';
    }

    // Sincronizar botones selectores de paso h si existen (h = 2, 1, 0.5, 0.25)
    const stepButtons = document.querySelectorAll('.step-selector-btn');
    stepButtons.forEach((btn) => {
      const btnVal = parseFloat(btn.getAttribute('data-h'));
      if (Math.abs(btnVal - state.h) < 1e-4) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    updateMathParametersDisplay();
    updateParamsTable();
    updateForcesDiagramSVG();
    updateDynamicSubstitutedEDO();
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
   * Actualiza las flechas y rótulos del diagrama interactivo de fuerzas en SVG
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

    // Actualizar textos en el SVG
    if (labelThrust) {
      labelThrust.textContent = `T = ${formatNumber(state.T, 0, 0)} N`;
    }
    if (labelGravity) {
      labelGravity.textContent = `mg = ${formatNumber(weightVal, 0, 0)} N`;
    }
    if (labelDrag) {
      labelDrag.textContent = `Fres = ${formatNumber(state.k, 0, 0)}·v N`;
    }

    // Escalar visualmente las flechas en función de T y mg
    // Longitud base normalizada entre 40px y 95px
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

    // Actualizar inspector si hay una fuerza actualmente seleccionada
    if (activeForceInspected) {
      displayForceInfo(activeForceInspected);
    }
  }

  /**
   * Actualiza dinámicamente la ecuación sustituida con los valores actuales de T, m, g, k
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

    const a0Formatted = formatNumber(a0, 2, 2);
    const betaFormatted = formatNumber(beta, 1, 3);

    container.innerHTML = `
      $$\\begin{cases} 
        \\dfrac{dy}{dt} = v \\\\[8pt] 
        \\dfrac{dv}{dt} = ${a0Formatted} - ${betaFormatted} v 
      \\end{cases}$$
    `;

    // Re-renderizar fórmula con MathJax si está activo
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([container]).catch((err) => console.warn('MathJax err:', err));
    }
  }

  /**
   * Estado y lógica del inspector interactivo de vectores de fuerza en SVG
   */
  let activeForceInspected = null;

  const forceDataMap = {
    thrust: {
      name: 'Fuerza de Empuje Propulsor',
      symbol: 'T',
      variable: 'T (Newtons)',
      direction: 'Hacia arriba (+y, sentido del movimiento)',
      getMagnitude: () => `${formatNumber(state.T, 0, 0)} N`,
      description: 'Fuerza impulsora ascendente generada por los motores cohete mediante la expulsión de gases a alta velocidad. Es la única fuerza que aporta aceleración positiva para vencer la gravedad y el rozamiento del aire.'
    },
    gravity: {
      name: 'Peso Gravitacional',
      symbol: 'F_g = m · g',
      variable: 'P = m · g (Newtons)',
      direction: 'Hacia abajo (-y, sentido contrario al ascenso)',
      getMagnitude: () => `${formatNumber(state.m * state.g, 0, 1)} N (${formatNumber(state.m, 0, 0)} kg × ${formatNumber(state.g, 2, 2)} m/s²)`,
      description: 'Atracción gravitatoria ejercida por la masa terrestre sobre el cohete. Se asume una aceleración de la gravedad constante g = 9,81 m/s² en la proximidad de la superficie.'
    },
    drag: {
      name: 'Resistencia Aerodinámica Lineal',
      symbol: 'F_{res} = k · v',
      variable: 'F_res = k · v (Newtons)',
      direction: 'Hacia abajo (-y, opuesta al vector velocidad)',
      getMagnitude: () => `${formatNumber(state.k, 0, 1)} kg/s × v(t) N`,
      description: 'Fuerza de fricción y arrastre viscoso ejercida por el aire atmosférico. Al tratarse de un modelo lineal (k · v), la fuerza de frenado crece proporcionalmente a la velocidad instantánea del vehículo.'
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

      group.addEventListener('mouseenter', () => {
        displayForceInfo(forceKey);
      });

      group.addEventListener('mouseleave', () => {
        resetForceInfo();
      });

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

  /**
   * Actualiza la tabla o bloques de valores en la sección del Modelo Matemático
   */
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
  // 4. CONTROLADORES DE EVENTOS Y VINCULACIÓN CON LA UI
  // =========================================================================

  /**
   * Vincula los controles de entrada HTML (inputs/sliders/botones) con el Estado Central.
   */
  function bindInputEvents() {
    const numericKeys = ['m', 'T', 'g', 'k', 'v0', 'y0', 'tFinal', 'h'];

    numericKeys.forEach((key) => {
      const input = document.getElementById(`input-${key}`);
      if (input) {
        input.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val)) {
            const update = {};
            update[key] = val;
            setState(update);
          }
        });
      }
    });

    // Selectores rápidos de paso h (h = 2 s, 1 s, 0,5 s, 0,25 s)
    const stepButtons = document.querySelectorAll('.step-selector-btn');
    stepButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-h'));
        if (!isNaN(val)) {
          setState({ h: val });
        }
      });
    });

    // Botón principal "INICIAR SIMULACIÓN" en portada
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

    // Botón "COMENZAR DESAFÍO" en contexto histórico
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

    // Botones de control del simulador (Lanzar, Pausar, Reiniciar)
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

    // Menú móvil
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
  // 5. NAVEGACIÓN, INDICADOR DE PROGRESO Y SCROLL SPY (12 SECCIONES)
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

  /**
   * Monitorea el desplazamiento vertical y actualiza la barra de progreso
   * y los enlaces activos de navegación en la cabecera fija.
   */
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
  // 6. RELOJ DE MISIÓN ESTILO NASA 1962 (MET: MISSION ELAPSED TIME)
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
  // 7. INICIALIZACIÓN GLOBAL DE LA APLICACIÓN
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
      window.MathJax.typesetPromise().catch((err) => console.warn('MathJax err:', err));
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
    syncUIWithState: syncUIWithState
  };
})();
