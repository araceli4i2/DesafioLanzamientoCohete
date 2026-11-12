/**
 * NASA MISSION 1962 — SIMULADOR DE LANZAMIENTO ESPACIAL
 * Módulo: simulation.js
 * 
 * Responsabilidad: Orquestación del motor de animación visual en SVG, bucle
 * desacoplado mediante requestAnimationFrame, interpolación lineal continua de
 * estados discretos, ajuste dinámico de escala vertical, controles de reproducción
 * y sincronización reactiva de telemetría con estética retro de Cabo Cañaveral.
 * 
 * Reglas de diseño del desafío:
 * 1. Vinculación estricta con los cálculos numéricos: y(t) y v(t) se obtienen
 *    exclusivamente de las series numéricas calculadas (Euler, Heun, RK4 o Analítica).
 * 2. Suavizado por interpolación lineal entre nodos calculados, con etiqueta visible:
 *    "Interpolación visual entre pasos; no es un cálculo nuevo".
 * 3. Aviso pedagógico en Euler con h = 2 s: explica por qué el cohete permanece
 *    en y = 0 m durante los primeros 2 s (error de discretización y1 = y0 + h*v0 = 0).
 * 4. Escala vertical adaptativa según y_max para garantizar visibilidad permanente.
 * 5. Separación modular estricta: reloj de animación, cálculo numérico y renderizado SVG.
 */

window.Simulation = (function () {
  'use strict';

  // Configuración del viewport SVG
  const SVG_CONFIG = {
    viewWidth: 540,
    viewHeight: 600,
    groundY: 520,      // Posición Y de la plataforma de despegue
    topClearanceY: 125 // Altura Y máxima a la que llega la tobera del cohete en y_max
  };

  // Estado interno del motor de simulación
  const simState = {
    isRunning: false,
    isPaused: false,
    currentTime: 0.0,
    playbackSpeed: 1.0,
    selectedMethod: 'euler', // 'euler' | 'heun' | 'rk4' | 'analytical'
    trajectoryPoints: [],
    maxAltitude: 589.24,
    tFinal: 20.0,
    h: 2.0,
    animationFrameId: null,
    lastTimestamp: 0,
    isStepAdvancing: false
  };

  /**
   * Obtiene la serie completa de puntos { t, y, v, a } según el método seleccionado
   * y los parámetros actuales del estado central.
   * 
   * @param {Object} params - Parámetros { m, T, g, k, v0, y0, tFinal, h }
   * @param {string} method - 'euler' | 'heun' | 'rk4' | 'analytical'
   * @returns {Array<Object>} Puntos temporales calculados
   */
  function computeTrajectory(params, method) {
    const p = params || (window.App ? window.App.getState() : {});
    let series = [];

    if (method === 'heun') {
      series = window.NumericalMethods ? window.NumericalMethods.solveHeun(p) : [];
    } else if (method === 'rk4') {
      series = window.NumericalMethods ? window.NumericalMethods.solveRK4(p) : [];
    } else if (method === 'analytical') {
      series = window.Mathematics ? window.Mathematics.calculateAnalyticalSolution(p) : [];
    } else {
      // Método de Euler por defecto
      series = window.NumericalMethods ? window.NumericalMethods.solveEuler(p) : [];
    }

    return series;
  }

  /**
   * Evalúa el estado interpolado linealmente en cualquier instante temporal continuo t.
   * 
   * @param {number} t - Tiempo en segundos
   * @returns {Object} { t, y, v, a, stepIndex, alpha, isInterpolated }
   */
  function getInterpolatedState(t) {
    const pts = simState.trajectoryPoints;
    if (!pts || pts.length === 0) {
      return { t: 0, y: 0, v: 0, a: 0, stepIndex: 0, alpha: 0, isInterpolated: false };
    }

    const clampedT = Math.max(0, Math.min(t, simState.tFinal));

    // Si está en el instante inicial
    if (clampedT <= pts[0].t) {
      return {
        t: pts[0].t,
        y: pts[0].y,
        v: pts[0].v,
        a: pts[0].a,
        stepIndex: 0,
        alpha: 0,
        isInterpolated: false
      };
    }

    // Si está en el instante final
    const last = pts[pts.length - 1];
    if (clampedT >= last.t) {
      return {
        t: last.t,
        y: last.y,
        v: last.v,
        a: last.a,
        stepIndex: pts.length - 1,
        alpha: 1,
        isInterpolated: false
      };
    }

    // Búsqueda del subintervalo [t_k, t_{k+1}]
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      if (clampedT >= p0.t && clampedT <= p1.t) {
        const dt = p1.t - p0.t;
        const alpha = dt > 1e-9 ? (clampedT - p0.t) / dt : 0;
        const y = p0.y + alpha * (p1.y - p0.y);
        const v = p0.v + alpha * (p1.v - p0.v);
        const a = p0.a + alpha * (p1.a - p0.a);

        const isExactNode = alpha < 1e-4 || Math.abs(alpha - 1) < 1e-4;

        return {
          t: clampedT,
          y: y,
          v: v,
          a: a,
          stepIndex: i,
          alpha: alpha,
          isInterpolated: !isExactNode
        };
      }
    }

    return {
      t: last.t,
      y: last.y,
      v: last.v,
      a: last.a,
      stepIndex: pts.length - 1,
      alpha: 1,
      isInterpolated: false
    };
  }

  /**
   * Transforma la altura física y(t) en metros a la coordenada vertical del SVG en píxeles.
   * Ajusta dinámicamente la escala para que el cohete siempre permanezca visible.
   * 
   * @param {number} altitude - Altura física en metros
   * @returns {number} Coordenada Y en el SVG
   */
  function altitudeToSvgY(altitude) {
    const yMax = Math.max(1.0, simState.maxAltitude);
    const flightHeightPx = SVG_CONFIG.groundY - SVG_CONFIG.topClearanceY;
    const clampedAlt = Math.max(0, altitude);
    const ratio = Math.min(1.0, clampedAlt / yMax);
    return SVG_CONFIG.groundY - (ratio * flightHeightPx);
  }

  /**
   * Actualiza las marcas y etiquetas de la regla de altitud en el SVG
   * según la altura máxima alcanzada en la simulación actual.
   */
  function updateRulerScale() {
    if (typeof document === 'undefined') return;
    const yMax = Math.max(1.0, simState.maxAltitude);
    const quarters = [1.0, 0.75, 0.5, 0.25, 0.0];
    const ids = ['ruler-lbl-100', 'ruler-lbl-75', 'ruler-lbl-50', 'ruler-lbl-25', 'ruler-lbl-0'];

    quarters.forEach((q, idx) => {
      const el = document.getElementById(ids[idx]);
      if (el) {
        const altVal = q * yMax;
        const formatted = window.App ? window.App.formatNumber(altVal, 0, 0) : Math.round(altVal);
        el.textContent = `${formatted}m`;
      }
    });

    // Actualizar indicador de altura máxima en el panel
    const telemMaxAlt = document.getElementById('telem-max-alt');
    if (telemMaxAlt) {
      telemMaxAlt.textContent = window.App ? `${window.App.formatNumber(yMax, 1, 1)} m` : `${yMax.toFixed(1)} m`;
    }
  }

  /**
   * Renderiza el estado visual del cohete, llamas, humo, cursor y avisos para el tiempo t dado.
   * 
   * @param {number} time - Tiempo continuo actual de la animación
   */
  function renderFrame(time) {
    const state = getInterpolatedState(time);
    if (typeof document === 'undefined') return;
    const rocketSvgY = altitudeToSvgY(state.y);

    // 1. Mover el grupo del cohete en el SVG
    const rocketGroup = document.getElementById('svg-rocket-group');
    if (rocketGroup) {
      rocketGroup.setAttribute('transform', `translate(310, ${rocketSvgY.toFixed(2)})`);
    }

    // 2. Mover el cursor indicador de altura en la regla
    const altCursor = document.getElementById('svg-alt-cursor');
    const cursorText = document.getElementById('cursor-alt-text');
    if (altCursor) {
      altCursor.setAttribute('transform', `translate(62, ${rocketSvgY.toFixed(2)})`);
    }
    if (cursorText) {
      const fmtY = window.App ? window.App.formatNumber(state.y, 0, 1) : state.y.toFixed(1);
      cursorText.textContent = `${fmtY}m`;
    }

    // 3. Gestionar llamas del motor y humo
    const flameGroup = document.getElementById('svg-thruster-flame');
    const smokeGroup = document.getElementById('svg-smoke-group');
    const flameOuter = document.getElementById('flame-outer');
    const flameInner = document.getElementById('flame-inner');

    const isEngineFiring = simState.isRunning && !simState.isPaused && time < simState.tFinal;
    const isAtRestOnPad = state.y <= 0.001;

    if (flameGroup) {
      if (isEngineFiring) {
        flameGroup.setAttribute('opacity', '1');
        // Oscilación realista del chorro propulsor según aceleración
        const jitter = 0.85 + Math.random() * 0.3;
        const accelFactor = Math.max(0.6, Math.min(1.4, state.a / 5.19));
        const flameLength = 55 * jitter * accelFactor;
        const innerLength = 35 * jitter * accelFactor;

        if (flameOuter) flameOuter.setAttribute('points', `-10,0 0,${flameLength.toFixed(1)} 10,0`);
        if (flameInner) flameInner.setAttribute('points', `-5,0 0,${innerLength.toFixed(1)} 5,0`);
      } else {
        flameGroup.setAttribute('opacity', '0');
      }
    }

    if (smokeGroup) {
      if (isEngineFiring && isAtRestOnPad) {
        smokeGroup.setAttribute('opacity', '0.85');
      } else if (isEngineFiring && state.y < 50) {
        const smokeFade = Math.max(0, 1 - state.y / 50);
        smokeGroup.setAttribute('opacity', smokeFade.toFixed(2));
      } else {
        smokeGroup.setAttribute('opacity', '0');
      }
    }

    // 4. Retracción del brazo umbilical de la torre tras el despegue
    const umbilicalArm = document.getElementById('svg-umbilical-arm');
    if (umbilicalArm) {
      if (state.y > 0.5) {
        umbilicalArm.setAttribute('transform', 'rotate(-30, 253, 380)');
      } else {
        umbilicalArm.removeAttribute('transform');
      }
    }

    // 5. Aviso especial del Método de Euler (y(2 s) = 0 m)
    const eulerWarningEl = document.getElementById('sim-euler-zero-warning');
    if (eulerWarningEl) {
      const isEulerActive = simState.selectedMethod === 'euler';
      const isFirstInterval = time > 0 && time <= 2.05 && simState.h >= 1.9;
      const isAltitudeZero = state.y <= 0.01;

      if (isEulerActive && isFirstInterval && isAltitudeZero) {
        eulerWarningEl.style.display = 'flex';
      } else {
        eulerWarningEl.style.display = 'none';
      }
    }

    // 6. Actualizar las lecturas de telemetría numérica en tiempo real
    updateTelemetryReadouts(state);
  }

  /**
   * Actualiza las tarjetas numéricas de telemetría en el panel derecho.
   * 
   * @param {Object} point - { t, y, v, a }
   */
  function updateTelemetryReadouts(point) {
    const elAlt = document.getElementById('telem-altitude');
    const elVel = document.getElementById('telem-velocity');
    const elAcc = document.getElementById('telem-accel');
    const elTime = document.getElementById('telem-time');
    const elStatus = document.getElementById('telem-status');
    const elMethod = document.getElementById('telem-method');
    const elStep = document.getElementById('telem-step');

    const fmt = window.App ? window.App.formatNumber : (v, d) => v.toFixed(d);

    if (elAlt) elAlt.innerHTML = `${fmt(point.y, 2, 2)} <span style="font-size: 0.85rem; color: var(--text-dim);">m</span>`;
    if (elVel) elVel.innerHTML = `${fmt(point.v, 2, 2)} <span style="font-size: 0.85rem; color: var(--text-dim);">m/s</span>`;
    if (elAcc) elAcc.innerHTML = `${fmt(point.a, 2, 2)} <span style="font-size: 0.85rem; color: var(--text-dim);">m/s²</span>`;
    if (elTime) elTime.innerHTML = `${fmt(point.t, 2, 2)} <span style="font-size: 0.85rem; color: var(--text-dim);">s</span>`;

    if (elStep) {
      elStep.textContent = `h = ${fmt(simState.h, 2, 2)} s`;
    }

    if (elMethod) {
      const methodLabels = {
        euler: 'Euler (1º orden)',
        heun: 'Heun (2º orden)',
        rk4: 'Runge-Kutta 4 (RK4)',
        analytical: 'Analítica Exacta'
      };
      elMethod.textContent = methodLabels[simState.selectedMethod] || 'Euler';
    }

    if (elStatus) {
      if (point.t <= 0.001) {
        elStatus.textContent = 'LISTO EN PLATAFORMA';
        elStatus.style.color = 'var(--terminal-green)';
      } else if (point.t >= simState.tFinal - 0.001) {
        elStatus.textContent = 'FIN DE SIMULACIÓN (BURNOUT)';
        elStatus.style.color = 'var(--sky-blue)';
      } else if (simState.isPaused) {
        elStatus.textContent = 'MISIÓN EN PAUSA';
        elStatus.style.color = 'var(--mission-amber)';
      } else if (simState.selectedMethod === 'euler' && point.t <= 2.0 && point.y <= 0.01) {
        elStatus.textContent = 'ERROR DISCRETIZACIÓN (y = 0 m)';
        elStatus.style.color = 'var(--mission-orange)';
      } else {
        elStatus.textContent = 'PROPULSIÓN ASCENDENTE';
        elStatus.style.color = 'var(--electric-blue)';
      }
    }
  }

  /**
   * Bucle desacoplado de animación en tiempo real (requestAnimationFrame).
   * 
   * @param {DOMHighResTimeStamp} timestamp - Marca de tiempo del navegador
   */
  function animationLoop(timestamp) {
    if (!simState.isRunning) return;

    if (!simState.lastTimestamp) {
      simState.lastTimestamp = timestamp;
    }

    const elapsedSeconds = (timestamp - simState.lastTimestamp) / 1000;
    simState.lastTimestamp = timestamp;

    if (!simState.isPaused) {
      // Avanzar tiempo de simulación según la velocidad de reproducción visual
      simState.currentTime += elapsedSeconds * simState.playbackSpeed;

      if (simState.currentTime >= simState.tFinal) {
        simState.currentTime = simState.tFinal;
        simState.isRunning = false;
        simState.isPaused = false;
      }
    }

    // Renderizar gráfico del instante actual
    renderFrame(simState.currentTime);

    if (simState.isRunning) {
      simState.animationFrameId = requestAnimationFrame(animationLoop);
    } else {
      updatePlayControlsUI();
    }
  }

  /**
   * Actualiza los textos y estados de los botones de control de vuelo.
   */
  function updatePlayControlsUI() {
    if (typeof document === 'undefined') return;
    const btnLaunch = document.getElementById('btn-sim-launch');
    const btnPause = document.getElementById('btn-sim-pause');

    if (btnPause) {
      if (simState.isRunning && simState.isPaused) {
        btnPause.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          CONTINUAR
        `;
        btnPause.classList.add('active-paused');
      } else {
        btnPause.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          PAUSAR
        `;
        btnPause.classList.remove('active-paused');
      }
    }

    if (btnLaunch) {
      if (simState.isRunning && !simState.isPaused) {
        btnLaunch.classList.add('running-active');
      } else {
        btnLaunch.classList.remove('running-active');
      }
    }
  }

  /**
   * Inicia o reanuda el vuelo del cohete.
   */
  function startSimulation() {
    if (simState.currentTime >= simState.tFinal) {
      // Si ya finalizó, reiniciar desde t = 0
      simState.currentTime = 0.0;
    }

    simState.isRunning = true;
    simState.isPaused = false;
    simState.lastTimestamp = 0;

    updatePlayControlsUI();

    if (simState.animationFrameId) {
      cancelAnimationFrame(simState.animationFrameId);
    }
    simState.animationFrameId = requestAnimationFrame(animationLoop);
  }

  /**
   * Pausa la animación manteniendo la posición actual del cohete.
   */
  function pauseSimulation() {
    if (!simState.isRunning) return;
    simState.isPaused = true;
    updatePlayControlsUI();
    renderFrame(simState.currentTime);
  }

  /**
   * Reanuda la animación si estaba pausada.
   */
  function resumeSimulation() {
    if (simState.isRunning && simState.isPaused) {
      simState.isPaused = false;
      simState.lastTimestamp = 0;
      updatePlayControlsUI();
    } else {
      startSimulation();
    }
  }

  /**
   * Alterna entre pausar y continuar.
   */
  function togglePauseSimulation() {
    if (!simState.isRunning) {
      startSimulation();
      return;
    }
    if (simState.isPaused) {
      resumeSimulation();
    } else {
      pauseSimulation();
    }
  }

  /**
   * Reinicia la simulación al estado inicial en la plataforma de lanzamiento.
   */
  function resetSimulation() {
    simState.isRunning = false;
    simState.isPaused = false;
    simState.currentTime = 0.0;
    simState.lastTimestamp = 0;

    if (simState.animationFrameId) {
      cancelAnimationFrame(simState.animationFrameId);
      simState.animationFrameId = null;
    }

    updatePlayControlsUI();
    renderFrame(0.0);
  }

  /**
   * Avanza la simulación exactamente un paso discreto (h) de integración.
   */
  function stepForward() {
    // Si estaba corriendo en bucle continuo, pausar
    if (simState.isRunning && !simState.isPaused) {
      simState.isPaused = true;
    }

    const currentT = simState.currentTime;
    const pts = simState.trajectoryPoints;
    if (!pts || pts.length === 0) return;

    // Buscar el siguiente punto de paso t_k > currentT + 1e-4
    let targetT = simState.tFinal;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].t > currentT + 1e-4) {
        targetT = pts[i].t;
        break;
      }
    }

    simState.currentTime = targetT;
    simState.isRunning = targetT < simState.tFinal;
    simState.isPaused = true;

    updatePlayControlsUI();
    renderFrame(simState.currentTime);
  }

  /**
   * Configura la velocidad de reproducción visual (0.5x, 1x, 2x, 4x).
   * 
   * @param {number} speed - Factor multiplicativo
   */
  function setPlaybackSpeed(speed) {
    const validSpeeds = [0.5, 1.0, 2.0, 4.0];
    if (validSpeeds.includes(speed)) {
      simState.playbackSpeed = speed;

      // Sincronizar botones de velocidad en la interfaz si el DOM está disponible
      if (typeof document !== 'undefined') {
        const speedBtns = document.querySelectorAll('.btn-sim-speed');
        speedBtns.forEach((btn) => {
          const btnSpeed = parseFloat(btn.getAttribute('data-speed'));
          if (Math.abs(btnSpeed - speed) < 1e-3) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    }
  }

  /**
   * Cambia el método numérico de cálculo para el vuelo del cohete.
   * 
   * @param {string} method - 'euler' | 'heun' | 'rk4' | 'analytical'
   */
  function setSimulationMethod(method) {
    simState.selectedMethod = method;

    // Sincronizar botones de método si el DOM está disponible
    if (typeof document !== 'undefined') {
      const methodBtns = document.querySelectorAll('.btn-sim-method');
      methodBtns.forEach((btn) => {
        const btnMethod = btn.getAttribute('data-method');
        if (btnMethod === method) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Recalcular trayectoria y reiniciar posición
    const state = window.App ? window.App.getState() : {};
    syncWithState(state);
  }

  /**
   * Sincroniza el simulador con el estado central cuando los parámetros cambian.
   * Recalcula la trayectoria del método seleccionado, ajusta la escala y reinicia el cohete.
   * 
   * @param {Object} state - Parámetros del modelo { m, T, g, k, v0, y0, tFinal, h }
   */
  function syncWithState(state) {
    const p = state || (window.App ? window.App.getState() : {});
    simState.tFinal = (p.tFinal !== undefined && p.tFinal > 0) ? p.tFinal : 20.0;
    simState.h = (p.h !== undefined && p.h > 0) ? p.h : 2.0;

    // 1. Recalcular trayectoria con las funciones matemáticas oficiales
    simState.trajectoryPoints = computeTrajectory(p, simState.selectedMethod);

    // 2. Determinar la altura máxima de la serie para ajustar la escala vertical
    let maxAlt = 0;
    simState.trajectoryPoints.forEach((pt) => {
      if (pt.y > maxAlt) maxAlt = pt.y;
    });

    // Si no despega (T <= mg), mantener escala visual fija de 100 m
    simState.maxAltitude = maxAlt > 1.0 ? maxAlt : 100.0;

    // 3. Actualizar la regla graduada del SVG
    updateRulerScale();

    // 4. Reiniciar el reloj y posicionar en pad
    resetSimulation();
  }

  /**
   * Inicializa el contenedor SVG y enlaza los eventos de control de simulación.
   * 
   * @param {string} containerId - ID del contenedor SVG
   */
  function initSimulationSVG(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`[Simulation] Contenedor SVG "${containerId}" no localizado.`);
      return;
    }

    // Cargar datos iniciales
    const appState = window.App ? window.App.getState() : {};
    syncWithState(appState);

    // Vincular botones de control de vuelo
    const btnLaunch = document.getElementById('btn-sim-launch');
    const btnPause = document.getElementById('btn-sim-pause');
    const btnStep = document.getElementById('btn-sim-step');
    const btnReset = document.getElementById('btn-sim-reset');

    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => {
        startSimulation();
      });
    }

    if (btnPause) {
      btnPause.addEventListener('click', () => {
        togglePauseSimulation();
      });
    }

    if (btnStep) {
      btnStep.addEventListener('click', () => {
        stepForward();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        resetSimulation();
      });
    }

    // Vincular botones de velocidad
    const speedBtns = document.querySelectorAll('.btn-sim-speed');
    speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.getAttribute('data-speed'));
        if (!isNaN(speed)) {
          setPlaybackSpeed(speed);
        }
      });
    });

    // Vincular botones de selección de método
    const methodBtns = document.querySelectorAll('.btn-sim-method');
    methodBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const method = btn.getAttribute('data-method');
        if (method) {
          setSimulationMethod(method);
        }
      });
    });

    // Renderizar fotograma inicial en reposo
    renderFrame(0.0);
  }

  // API pública expuesta
  return {
    initSimulationSVG: initSimulationSVG,
    startSimulation: startSimulation,
    pauseSimulation: pauseSimulation,
    resumeSimulation: resumeSimulation,
    togglePauseSimulation: togglePauseSimulation,
    resetSimulation: resetSimulation,
    stepForward: stepForward,
    setPlaybackSpeed: setPlaybackSpeed,
    setSimulationMethod: setSimulationMethod,
    syncWithState: syncWithState,
    renderFrame: renderFrame,
    getInterpolatedState: getInterpolatedState,
    getSimulationState: function () {
      return Object.assign({}, simState);
    }
  };
})();
