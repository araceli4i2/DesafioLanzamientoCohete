/**
 * NASA MISSION 1962 — SIMULADOR DE LANZAMIENTO ESPACIAL
 * Módulo: evaluation.js
 * 
 * Responsabilidad: Motor interactivo y funcional de evaluación académica para la
 * verificación del ascenso del cohete experimental.
 * 
 * Misión Oficial:
 * "El equipo de control de la NASA necesita verificar el ascenso de un cohete
 * experimental. Debes calcular la velocidad y la altura mediante Euler, comparar
 * con la solución analítica y justificar la precisión del método".
 * 
 * Actividades del desafío:
 * A) Identificar fuerzas
 * B) Construir la ecuación diferencial
 * C) Calcular a mano las 3 primeras iteraciones de Euler
 * D) Obtener la solución analítica
 * E) Comparar Euler, Heun y RK4
 * F) Analizar errores
 * G) Interpretación física
 * 
 * Tipos de pregunta:
 * - Selección múltiple
 * - Verdadero o Falso
 * - Numéricas (con tolerancia configurable y cálculos dinámicos basados en los algoritmos del proyecto)
 * - De interpretación física y matemática
 * - Completar fórmulas
 * 
 * Sistema de Puntuación y Rúbrica Oficial:
 * - 100 puntos internos totales.
 * - Equivalente directo sobre 20 puntos.
 * - Agrupación en 6 criterios de la rúbrica oficial (18 puntos automáticos):
 *   1. Modelo matemático (3 pts) - Actividades A y B
 *   2. Método de Euler (4 pts) - Actividad C
 *   3. Solución analítica (3 pts) - Actividad D
 *   4. Tabla y errores (3 pts) - Actividad F
 *   5. Gráficas y simulación (3 pts) - Actividad E
 *   6. Interpretación y conclusiones (2 pts) - Actividad G
 *   + 2 puntos de presentación y defensa evaluados por el docente (Total: 20 pts).
 * 
 * Niveles y Desbloqueos de Competencia:
 * - Principiante (< 50%): Identifica fuerzas
 * - Intermedio (50% - 69%): Resuelve iteraciones de Euler
 * - Avanzado (70% - 89%): Compara métodos y errores
 * - Experto (90% - 100%): Modifica parámetros y justifica
 * 
 * Informe descargable:
 * - Campo obligatorio para nombre del estudiante (nunca fijo).
 * - Fecha y hora de emisión, tiempo empleado, desglose de rúbrica.
 * - Descarga directa como HTML imprimible autónomo o impresión PDF mediante window.print.
 */

window.EvaluationModule = (function () {
  'use strict';

  // Configuración de los 6 criterios de la rúbrica oficial
  const RUBRIC_CRITERIA = {
    modelo_matematico: {
      id: 'modelo_matematico',
      name: 'Modelo matemático',
      activities: 'A, B',
      maxPoints: 3.0,
      description: 'Identificación de fuerzas en el DCL y formulación de la EDO desacoplada.'
    },
    metodo_euler: {
      id: 'metodo_euler',
      name: 'Método de Euler',
      activities: 'C',
      maxPoints: 4.0,
      description: 'Cálculo de iteraciones manuales con regla de simultaneidad temporal.'
    },
    solucion_analitica: {
      id: 'solucion_analitica',
      name: 'Solución analítica',
      activities: 'D',
      maxPoints: 3.0,
      description: 'Integración analítica de la EDO y evaluación continua exacta.'
    },
    tabla_errores: {
      id: 'tabla_errores',
      name: 'Tabla y errores',
      activities: 'F',
      maxPoints: 3.0,
      description: 'Análisis de convergencia de orden 1 y justificación de sobreestimación.'
    },
    graficas_simulacion: {
      id: 'graficas_simulacion',
      name: 'Gráficas y simulación',
      activities: 'E',
      maxPoints: 3.0,
      description: 'Comparación rigurosa de órdenes de precisión entre Euler, Heun y RK4.'
    },
    interpretacion_conclusiones: {
      id: 'interpretacion_conclusiones',
      name: 'Interpretación y conclusiones',
      activities: 'G',
      maxPoints: 2.0,
      description: 'Comprensión física del régimen terminal y del error inicial de Euler.'
    }
  };

  // Banco estructurado de las 12 preguntas que cubren las Actividades A a G (Suma: 100 puntos)
  const QUESTION_BANK = [
    // ------------------------------------------------------------------------
    // ACTIVIDAD A: IDENTIFICAR FUERZAS (Criterio: Modelo matemático - 8 pts)
    // ------------------------------------------------------------------------
    {
      id: 'q1',
      activity: 'A',
      activityTitle: 'Actividad A: Identificar fuerzas',
      rubricKey: 'modelo_matematico',
      title: 'Fuerzas que actúan sobre el cohete Atlas',
      type: 'multiple_choice',
      points: 8,
      prompt: 'Durante la fase propulsada con fricción aerodinámica en ascenso vertical, ¿cuáles son las fuerzas que actúan sobre el cohete y cuáles son sus signos vectoriales respecto al eje vertical positivo (+y hacia arriba)?',
      options: [
        { id: 'opt_a', text: 'Empuje T (+), Peso P = mg (-), y Fuerza de arrastre F_d = -kv (-)' },
        { id: 'opt_b', text: 'Empuje T (+), Peso P = mg (+), y Fuerza de arrastre F_d = -kv (-)' },
        { id: 'opt_c', text: 'Empuje T (-), Peso P = mg (-), y Fuerza de arrastre F_d = +kv (+)' },
        { id: 'opt_d', text: 'Únicamente Empuje T (+) y Peso P = mg (-), pues la fricción es despreciable' }
      ],
      correctAnswer: 'opt_a',
      explanation: 'El empuje del motor T impulsa el cohete verticalmente hacia arriba (+), mientras que la gravedad atrae la masa hacia el centro terrestre en sentido opuesto (-mg) y la resistencia viscosa del aire F_d = -k·v se opone en todo momento al sentido del movimiento (-kv).',
      procedure: '1. Eje coordenado: vertical ascendente (+y hacia arriba).\n2. Fuerza motora: T > 0 (ascendente).\n3. Peso gravitatorio: -mg (descendente).\n4. Resistencia aerodinámica lineal: -k·v (descendente, opuesta al avance).\nΣF = T - mg - k·v.'
    },

    // ------------------------------------------------------------------------
    // ACTIVIDAD B: CONSTRUIR LA ECUACIÓN DIFERENCIAL (Criterio: Modelo matemático - 8 pts)
    // ------------------------------------------------------------------------
    {
      id: 'q2',
      activity: 'B',
      activityTitle: 'Actividad B: Construir la ecuación diferencial',
      rubricKey: 'modelo_matematico',
      title: 'Sistema de EDOs desacoplado de primer orden',
      type: 'formula_choice',
      points: 8,
      prompt: 'Aplicando la Segunda Ley de Newton (ΣF = m·a = m·dv/dt) y la cinemática de posición (dy/dt = v), ¿cuál es el sistema de ecuaciones diferenciales ordinarias desacoplado que modela el vuelo?',
      options: [
        { id: 'form_a', text: 'dv/dt = (T/m) - g - (k/m)·v   y   dy/dt = v' },
        { id: 'form_b', text: 'dv/dt = (T - g)/m - k·v   y   dy/dt = v·t' },
        { id: 'form_c', text: 'dv/dt = (T/m) + g - (k/m)·v   y   dy/dt = a·t' },
        { id: 'form_d', text: 'dv/dt = T - m·g - k·v   y   dy/dt = v²' }
      ],
      correctAnswer: 'form_a',
      explanation: 'Al dividir la suma de fuerzas ΣF = T - mg - kv entre la masa inercial m, se despeja la aceleración instantánea dv/dt = T/m - g - (k/m)v. Por definición cinemática de velocidad, dy/dt = v.',
      procedure: 'm · (dv/dt) = T - m·g - k·v\nDividiendo entre m:\ndv/dt = (T/m) - g - (k/m)·v\nPor definición de velocidad:\ndy/dt = v.\nVector de estado: X = [y, v]ᵀ.'
    },

    // ------------------------------------------------------------------------
    // ACTIVIDAD C: CALCULAR A MANO LAS 3 PRIMERAS ITERACIONES DE EULER (Criterio: Euler - 22 pts)
    // ------------------------------------------------------------------------
    {
      id: 'q3',
      activity: 'C',
      activityTitle: 'Actividad C: Iteraciones manuales de Euler',
      rubricKey: 'metodo_euler',
      title: 'Iteración 1: Velocidad v₁ en t = h',
      type: 'numeric',
      points: 8,
      tolerance: 0.15,
      unit: 'm/s',
      prompt: 'Con las condiciones iniciales (t₀ = 0 s, v₀ = 0 m/s, y₀ = 0 m) y el paso h activo, calcula la velocidad en la primera iteración v₁ (a t = h s) aplicando el método de Euler explícito.',
      getExpected: function (p) {
        if (window.NumericalMethods && typeof window.NumericalMethods.solveEuler === 'function') {
          const s = window.NumericalMethods.solveEuler(p);
          if (s && s.length > 1) return s[1].v;
        }
        const a0 = p.T / p.m - p.g - (p.k / p.m) * p.v0;
        return p.v0 + p.h * a0;
      },
      getDynamicHint: function (p) {
        const a0 = p.T / p.m - p.g - (p.k / p.m) * p.v0;
        return `Paso activo: h = ${p.h} s. Fórmula: v₁ = v₀ + h · a₀, con a₀ = ${p.T}/${p.m} - ${p.g} = ${a0.toFixed(2)} m/s².`;
      },
      explanation: 'En el paso 1 de Euler, la aceleración inicial es a₀ = T/m - g - (k/m)v₀. Al partir del reposo (v₀ = 0), a₀ = T/m - g. Luego la velocidad se actualiza como v₁ = v₀ + h·a₀.',
      procedure: function (p) {
        const a0 = p.T / p.m - p.g - (p.k / p.m) * p.v0;
        const v1 = p.v0 + p.h * a0;
        return `1. Aceleración en t=0 s: a₀ = ${p.T}/${p.m} - ${p.g} - (${p.k}/${p.m})·(${p.v0}) = ${a0.toFixed(4)} m/s².\n2. Velocidad en t=${p.h} s: v₁ = ${p.v0} + (${p.h}) · (${a0.toFixed(4)}) = ${v1.toFixed(4)} m/s.`;
      }
    },
    {
      id: 'q4',
      activity: 'C',
      activityTitle: 'Actividad C: Iteraciones manuales de Euler',
      rubricKey: 'metodo_euler',
      title: 'Iteración 2: Altura y₂ en t = 2h',
      type: 'numeric',
      points: 8,
      tolerance: 0.25,
      unit: 'm',
      prompt: 'Calcula la altura y₂ en la segunda iteración (en t = 2h s) con Euler explícito. Recuerda aplicar la regla de simultaneidad usando la velocidad anterior v₁ calculada en el paso 1 (y₁ = y₀ + h·v₀ = 0 m).',
      getExpected: function (p) {
        if (window.NumericalMethods && typeof window.NumericalMethods.solveEuler === 'function') {
          const s = window.NumericalMethods.solveEuler(p);
          if (s && s.length > 2) return s[2].y;
        }
        const a0 = p.T / p.m - p.g - (p.k / p.m) * p.v0;
        const v1 = p.v0 + p.h * a0;
        const y1 = p.y0 + p.h * p.v0;
        return y1 + p.h * v1;
      },
      getDynamicHint: function (p) {
        return `Fórmula de simultaneidad: y₂ = y₁ + h · v₁ (donde y₁ = 0 m y v₁ es la velocidad del paso 1).`;
      },
      explanation: 'La regla de simultaneidad exige actualizar y₂ usando la altura previa y₁ y la velocidad anterior v₁: y₂ = y₁ + h·v₁. Como y₁ = 0 m en Euler al partir del reposo, y₂ = h·v₁.',
      procedure: function (p) {
        let v1 = 10.38, y1 = 0, y2 = 20.76;
        if (window.NumericalMethods && typeof window.NumericalMethods.solveEuler === 'function') {
          const s = window.NumericalMethods.solveEuler(p);
          if (s && s.length > 2) {
            v1 = s[1].v;
            y1 = s[1].y;
            y2 = s[2].y;
          }
        }
        return `1. Altura en paso 1: y₁ = ${y1.toFixed(2)} m.\n2. Velocidad en paso 1: v₁ = ${v1.toFixed(4)} m/s.\n3. y₂ = y₁ + h · v₁ = ${y1.toFixed(2)} + (${p.h}) · (${v1.toFixed(4)}) = ${y2.toFixed(4)} m.`;
      }
    },
    {
      id: 'q5',
      activity: 'C',
      activityTitle: 'Actividad C: Iteraciones manuales de Euler',
      rubricKey: 'metodo_euler',
      title: 'Iteración 3: Velocidad v₃ en t = 3h',
      type: 'numeric',
      points: 6,
      tolerance: 0.35,
      unit: 'm/s',
      prompt: 'Calcula la velocidad v₃ en la tercera iteración de Euler (a t = 3h s). Debes evaluar la aceleración a₂ en t = 2h usando la velocidad v₂ del paso anterior: v₃ = v₂ + h·a₂.',
      getExpected: function (p) {
        if (window.NumericalMethods && typeof window.NumericalMethods.solveEuler === 'function') {
          const s = window.NumericalMethods.solveEuler(p);
          if (s && s.length > 3) return s[3].v;
        }
        return 25.3272;
      },
      getDynamicHint: function (p) {
        return `Fórmula: v₃ = v₂ + h · [T/m - g - (k/m)·v₂].`;
      },
      explanation: 'A medida que el cohete gana velocidad, la resistencia aerodinámica kv₂/m incrementa y la aceleración neta disminuye. v₃ se obtiene acumulando h·a₂ sobre v₂.',
      procedure: function (p) {
        let v2 = 18.684, a2 = 3.3216, v3 = 25.3272;
        if (window.NumericalMethods && typeof window.NumericalMethods.solveEuler === 'function') {
          const s = window.NumericalMethods.solveEuler(p);
          if (s && s.length > 3) {
            v2 = s[2].v;
            a2 = s[2].a;
            v3 = s[3].v;
          }
        }
        return `1. Velocidad previa en t=${2*p.h} s: v₂ = ${v2.toFixed(4)} m/s.\n2. Aceleración en t=${2*p.h} s: a₂ = ${p.T}/${p.m} - ${p.g} - (${p.k}/${p.m})·(${v2.toFixed(4)}) = ${a2.toFixed(4)} m/s².\n3. v₃ = ${v2.toFixed(4)} + (${p.h}) · (${a2.toFixed(4)}) = ${v3.toFixed(4)} m/s.`;
      }
    },

    // ------------------------------------------------------------------------
    // ACTIVIDAD D: OBTENER LA SOLUCIÓN ANALÍTICA (Criterio: Solución analítica - 17 pts)
    // ------------------------------------------------------------------------
    {
      id: 'q6',
      activity: 'D',
      activityTitle: 'Actividad D: Solución analítica exacta',
      rubricKey: 'solucion_analitica',
      title: 'Resolución por separación de variables',
      type: 'multiple_choice',
      points: 8,
      prompt: 'Al resolver la ecuación dv/dt = a - bv (con a = T/m - g y b = k/m > 0) sujeta a v(0) = 0 mediante separación de variables e integración formal, ¿cuál es la deducción analítica correcta?',
      options: [
        { id: 'sol_a', text: 'dv/(a - bv) = dt  =>  -(1/b) ln|a - bv| = t + C  =>  v(t) = (a/b)·(1 - e^(-bt))' },
        { id: 'sol_b', text: 'dv/(a - bv) = dt  =>  ln|a - bv| = b·t + C  =>  v(t) = a·t - b·t²/2' },
        { id: 'sol_c', text: 'dv = (a - bv) dt  =>  v(t) = a·e^(bt) + C' },
        { id: 'sol_d', text: '(a - bv) dv = dt  =>  a·v - b·v²/2 = t + C' }
      ],
      correctAnswer: 'sol_a',
      explanation: 'Separando variables dv/(a - bv) = dt e integrando ambos miembros resulta -(1/b)ln|a - bv| = t + C. Despejando la exponencial e imponiendo v(0) = 0 se obtiene la solución analítica cerrada v(t) = (a/b)(1 - e^(-bt)).',
      procedure: '1. Separación: dv / (a - bv) = dt.\n2. Integración: -(1/b) ln(a - bv) = t + C₁.\n3. Despeje exponencial: a - bv = A·e^(-bt).\n4. Condición v(0) = 0 => a - 0 = A => A = a.\n5. v(t) = (a/b)·(1 - e^(-bt)).'
    },
    {
      id: 'q7',
      activity: 'D',
      activityTitle: 'Actividad D: Solución analítica exacta',
      rubricKey: 'solucion_analitica',
      title: 'Evaluación numérica exacta a t = t_final',
      type: 'numeric',
      points: 9,
      tolerance: 0.25,
      unit: 'm/s',
      prompt: 'Utilizando la solución analítica continua v(t) = (a/b)·(1 - e^(-bt)), calcula el valor exacto de la velocidad al tiempo final de la misión (t = t_final).',
      getExpected: function (p) {
        if (window.Mathematics && typeof window.Mathematics.velocidadExacta === 'function') {
          return window.Mathematics.velocidadExacta(p.tFinal, p);
        }
        const a = p.T / p.m - p.g;
        const b = p.k / p.m;
        return (a / b) * (1 - Math.exp(-b * p.tFinal));
      },
      getDynamicHint: function (p) {
        const a = p.T / p.m - p.g;
        const b = p.k / p.m;
        return `Tiempo final: t = ${p.tFinal} s. Parámetros: a = ${a.toFixed(2)} m/s², b = ${b.toFixed(2)} s⁻¹.`;
      },
      explanation: 'La función velocidadExacta(tFinal, params) evalúa con precisión continua la solución cerrada para cualquier instante de tiempo.',
      procedure: function (p) {
        const a = p.T / p.m - p.g;
        const b = p.k / p.m;
        const vExact = window.Mathematics && typeof window.Mathematics.velocidadExacta === 'function'
          ? window.Mathematics.velocidadExacta(p.tFinal, p)
          : (a / b) * (1 - Math.exp(-b * p.tFinal));
        return `1. a = ${p.T}/${p.m} - ${p.g} = ${a.toFixed(4)} m/s².\n2. b = ${p.k}/${p.m} = ${b.toFixed(4)} s⁻¹.\n3. v(${p.tFinal}) = (${a.toFixed(4)} / ${b.toFixed(4)}) · (1 - e^(-${b.toFixed(4)} · ${p.tFinal})) = ${vExact.toFixed(4)} m/s.`;
      }
    },

    // ------------------------------------------------------------------------
    // ACTIVIDAD E: COMPARAR EULER, HEUN Y RK4 (Criterio: Gráficas y simulación - 17 pts)
    // ------------------------------------------------------------------------
    {
      id: 'q8',
      activity: 'E',
      activityTitle: 'Actividad E: Comparación de métodos numéricos',
      rubricKey: 'graficas_simulacion',
      title: 'Órdenes de convergencia y evaluaciones por paso',
      type: 'multiple_choice',
      points: 17,
      prompt: 'Al contrastar los algoritmos numéricos implementados (Euler, Heun y Runge-Kutta 4to Orden), ¿cuál afirmación describe con rigor sus órdenes de error global y su costo de evaluación por paso?',
      options: [
        { id: 'meth_a', text: 'Euler es de 1er orden O(h) (1 eval. de f); Heun es predictor-corrector de 2do orden O(h²) (2 evals.); RK4 es de 4to orden O(h⁴) (4 evals. ponderadas y menor error global).' },
        { id: 'meth_b', text: 'Todos los métodos tienen el mismo orden de error O(h) y solo difieren en cómo interpolan visualmente los gráficos.' },
        { id: 'meth_c', text: 'RK4 tiene orden O(h) y Euler tiene orden O(h⁴) porque evalúa la tangente al inicio del intervalo.' },
        { id: 'meth_d', text: 'Heun es más exacto que RK4 porque no requiere calcular pendientes intermedias.' }
      ],
      correctAnswer: 'meth_a',
      explanation: 'Euler realiza 1 evaluación de f por paso con error global proporcional a h (O(h)); Heun realiza 2 evaluaciones (predictor k₁ y corrector k₂) con error O(h²); RK4 pondera 4 derivadas intermedias (k₁..k₄) logrando un error global O(h⁴), lo que le permite coincidir con la solución analítica con diferencias insignificantes.',
      procedure: '1. Euler: k₁ = f(t, X) => O(h) global (1 llamada a f).\n2. Heun: k₁ = f(t, X), k₂ = f(t+h, X+h·k₁) => O(h²) global (2 llamadas).\n3. RK4: k₁..k₄ promediados con pesos (1, 2, 2, 1)/6 => O(h⁴) global (4 llamadas).'
    },

    // ------------------------------------------------------------------------
    // ACTIVIDAD F: ANALIZAR ERRORES (Criterio: Tabla y errores - 16 pts)
    // ------------------------------------------------------------------------
    {
      id: 'q9',
      activity: 'F',
      activityTitle: 'Actividad F: Análisis de errores y convergencia',
      rubricKey: 'tabla_errores',
      title: 'Comportamiento del error al dividir el paso h entre 2',
      type: 'true_false',
      points: 8,
      prompt: 'En el método de Euler, al dividir el paso de integración h a la mitad (por ejemplo de h = 2 s a h = 1 s, o de h = 1 s a h = 0,5 s), el error absoluto global al final de la simulación se reduce aproximadamente a la mitad.',
      options: [
        { id: 'true', text: 'Verdadero (V)' },
        { id: 'false', text: 'Falso (F)' }
      ],
      correctAnswer: 'true',
      explanation: 'El método de Euler es de primer orden (convergencia lineal, error global E_global ≈ C·h¹). Al sustituir h por h/2, el nuevo error global es E(h/2) ≈ C·(h/2) = E/2.',
      procedure: 'Error global Euler: E(h) = C · h¹\nCociente de reducción: E(h/2) / E(h) = (C · h/2) / (C · h) = 1/2 = 0,5.\nComprobación en el desafío con datos originales: a h=2 el error de velocidad es 1,4512 m/s; a h=1 es 0,7141 m/s (reducción del 50,8%).'
    },
    {
      id: 'q10',
      activity: 'F',
      activityTitle: 'Actividad F: Análisis de errores y convergencia',
      rubricKey: 'tabla_errores',
      title: 'Razón matemática de la sobreestimación de Euler en velocidad',
      type: 'multiple_choice',
      points: 8,
      prompt: 'En las gráficas de velocidad vs tiempo, la curva calculada con el método de Euler siempre se sitúa por encima de la solución analítica exacta (sobreestima la velocidad). ¿A qué propiedad matemática de la función velocidad se debe esto?',
      options: [
        { id: 'err_a', text: 'La función velocidad es cóncava hacia abajo (v\'\'(t) < 0), de modo que la recta tangente trazada al inicio del paso siempre queda por encima de la curva real.' },
        { id: 'err_b', text: 'La aceleración de la gravedad g disminuye automáticamente con la altitud en el modelo.' },
        { id: 'err_c', text: 'El consumo de combustible incrementa la masa total del cohete en la simulación.' },
        { id: 'err_d', text: 'El método de Euler utiliza derivadas de orden fraccionario en su formulación.' }
      ],
      correctAnswer: 'err_a',
      explanation: 'Como dv/dt = a - bv, la segunda derivada es d²v/dt² = -b(dv/dt) < 0 mientras el cohete acelere positivamente. Al ser estrictamente cóncava hacia abajo, la aproximación por recta tangente en t_n evalúa con una aceleración inicial mayor a la real en el resto del intervalo, sobreestimando la velocidad calculada.',
      procedure: '1. Aceleración: v\'(t) = a - b·v > 0 (ascenso propulsado).\n2. Curvatura: v\'\'(t) = -b · v\'(t) < 0 (función cóncava).\n3. Expansión de Taylor: v(t+h) = v(t) + h·v\'(t) + (h²/2)·v\'\'(ξ).\n4. Como v\'\'(ξ) < 0, la recta de Euler v(t) + h·v\'(t) > v(t+h).'
    },

    // ------------------------------------------------------------------------
    // ACTIVIDAD G: INTERPRETACIÓN FÍSICA (Criterio: Interpretación y conclusiones - 12 pts)
    // ------------------------------------------------------------------------
    {
      id: 'q11',
      activity: 'G',
      activityTitle: 'Actividad G: Interpretación física y régimen terminal',
      rubricKey: 'interpretacion_conclusiones',
      title: 'Velocidad terminal teórica del cohete',
      type: 'numeric',
      points: 6,
      tolerance: 0.15,
      unit: 'm/s',
      prompt: 'Calcula la velocidad terminal teórica (v_terminal) que alcanzaría el cohete si el empuje se mantuviera indefinidamente, es decir, cuando la resistencia del aire equilibra exactamente la fuerza neta motora y la aceleración se anula (dv/dt = 0).',
      getExpected: function (p) {
        return (p.T - p.m * p.g) / p.k;
      },
      getDynamicHint: function (p) {
        return `Condición de equilibrio: dv/dt = 0 => T - m·g - k·v_term = 0 => v_term = (T - m·g) / k.`;
      },
      explanation: 'En el régimen terminal, la fuerza propulsora T se equilibra exactamente con el peso P = mg y la fricción F_d = kv_term. La fuerza neta y la aceleración se anulan (a = 0), estabilizando la velocidad en v_term = (T - mg)/k.',
      procedure: function (p) {
        const vTerm = (p.T - p.m * p.g) / p.k;
        return `1. Condición de equilibrio: dv/dt = 0 => T - m·g - k·v_term = 0.\n2. Despeje algebraico: v_term = (T - m·g) / k = (${p.T} - ${p.m} · ${p.g}) / ${p.k} = ${vTerm.toFixed(4)} m/s.`;
      }
    },
    {
      id: 'q12',
      activity: 'G',
      activityTitle: 'Actividad G: Interpretación física y régimen terminal',
      rubricKey: 'interpretacion_conclusiones',
      title: 'Interpretación física de y(2 s) = 0 m en Euler',
      type: 'true_false',
      points: 6,
      prompt: 'Con el método de Euler y paso h = 2 s, la altura en t = 2 s resulta exactamente y(2) = 0 m. Esto significa físicamente que los motores del cohete Atlas permanecen apagados o inoperativos durante los dos primeros segundos.',
      options: [
        { id: 'true', text: 'Verdadero (V)' },
        { id: 'false', text: 'Falso (F)' }
      ],
      correctAnswer: 'false',
      explanation: 'Falso. Los motores entregan su empuje nominal completo desde t = 0 s y la aceleración es positiva (a₀ = 5,19 m/s²). El valor y(2) = 0 m es exclusivamente un error de discretización del método de Euler, pues proyecta la posición usando la velocidad al inicio del paso: y₁ = y₀ + h·v₀ = 0 + 2·0 = 0 m.',
      procedure: 'Fórmula de Euler para la posición: y₁ = y₀ + h · v₀\nComo v₀ = 0 m/s: y₁ = 0 + h · 0 = 0 m.\nFísicamente el vehículo sí acelera (a₀ > 0); su velocidad real en t=2 es v ≈ 9,41 m/s y su altitud real es y ≈ 9,72 m.'
    }
  ];

  // Estado interno reactivo del módulo de evaluación
  const evalState = {
    containerId: 'quiz-container',
    studentName: '',
    startTime: null,
    timerInterval: null,
    elapsedSeconds: 0,
    isSubmitted: false,
    studentAnswers: {}, // id_pregunta -> valor respuesta
    evaluationResults: null
  };

  /**
   * Limpia y formatea la entrada numérica del estudiante (admite coma y punto decimal).
   * 
   * @param {*} val - Valor introducido por el estudiante
   * @returns {number} Número decimal o NaN
   */
  function parseStudentNumber(val) {
    if (val === null || val === undefined) return NaN;
    const str = String(val).trim().replace(/\s+/g, '').replace(',', '.');
    return parseFloat(str);
  }

  /**
   * Inicia el temporizador de la misión de evaluación.
   */
  function startEvaluationTimer() {
    if (evalState.timerInterval) {
      clearInterval(evalState.timerInterval);
    }
    evalState.startTime = Date.now() - (evalState.elapsedSeconds * 1000);
    evalState.timerInterval = setInterval(() => {
      if (!evalState.isSubmitted) {
        evalState.elapsedSeconds = Math.floor((Date.now() - evalState.startTime) / 1000);
        updateTimerDisplay();
      }
    }, 1000);
  }

  /**
   * Actualiza el visor visual del temporizador en pantalla.
   */
  function updateTimerDisplay() {
    const elTimer = document.getElementById('eval-timer-display');
    if (!elTimer) return;
    const mins = Math.floor(evalState.elapsedSeconds / 60);
    const secs = evalState.elapsedSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    elTimer.textContent = formatted;
  }

  /**
   * Determina el nivel de competencia y los desbloqueos según el porcentaje de aciertos.
   * 
   * @param {number} percentage - Porcentaje de aciertos (0 a 100)
   * @returns {Object} Información del nivel y estados de desbloqueo
   */
  function calculateProficiencyLevel(percentage) {
    const levels = [
      {
        id: 'principiante',
        name: 'Principiante',
        minPct: 0,
        unlockText: 'Identifica fuerzas',
        badge: 'NIVEL 1',
        description: 'Comprensión básica del diagrama de cuerpo libre y los parámetros de vuelo.'
      },
      {
        id: 'intermedio',
        name: 'Intermedio',
        minPct: 50,
        unlockText: 'Resuelve iteraciones de Euler',
        badge: 'NIVEL 2',
        description: 'Capacidad para ejecutar iteraciones manuales con regla de simultaneidad.'
      },
      {
        id: 'avanzado',
        name: 'Avanzado',
        minPct: 70,
        unlockText: 'Compara métodos y errores',
        badge: 'NIVEL 3',
        description: 'Dominio de órdenes de convergencia (Heun, RK4) y análisis de truncamiento.'
      },
      {
        id: 'experto',
        name: 'Experto',
        minPct: 90,
        unlockText: 'Modifica parámetros y justifica',
        badge: 'NIVEL 4',
        description: 'Maestría en análisis asintótico, estabilidad numérica y física del lanzamiento.'
      }
    ];

    let currentLevel = levels[0];
    levels.forEach((lvl) => {
      if (percentage >= lvl.minPct) {
        currentLevel = lvl;
      }
    });

    return {
      current: currentLevel,
      allLevels: levels.map((lvl) => ({
        ...lvl,
        isUnlocked: percentage >= lvl.minPct,
        isCurrent: lvl.id === currentLevel.id
      }))
    };
  }

  /**
   * Procesa y califica las respuestas del estudiante con los algoritmos matemáticos del proyecto.
   * 
   * @returns {Object|null} Resultados detallados de la evaluación
   */
  function evaluateStudentAnswers(optionalAnswers) {
    if (optionalAnswers && typeof optionalAnswers === 'object') {
      if (optionalAnswers.studentName) {
        evalState.studentName = String(optionalAnswers.studentName).trim();
      }
      Object.keys(optionalAnswers).forEach((k) => {
        if (k !== 'studentName') {
          evalState.studentAnswers[k] = optionalAnswers[k];
        }
      });
    }

    // Validar que el nombre del estudiante haya sido introducido (obligatorio)
    const nameInput = document.getElementById('eval-student-name');
    const inputVal = (nameInput && nameInput.value.trim().length > 0) ? nameInput.value.trim() : evalState.studentName.trim();

    if (!inputVal || inputVal.length < 2) {
      if (nameInput) {
        nameInput.focus();
        nameInput.classList.add('input-error-pulse');
        setTimeout(() => nameInput.classList.remove('input-error-pulse'), 1800);
      }
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('ATENCIÓN: Es obligatorio escribir tu nombre completo antes de calificar o emitir el acta de evaluación.');
      }
      return null;
    }

    evalState.studentName = inputVal;
    evalState.isSubmitted = true;
    if (evalState.timerInterval) {
      clearInterval(evalState.timerInterval);
    }

    const appParams = window.App ? window.App.getState() : {
      m: 1000, T: 15000, g: 9.81, k: 100, v0: 0, y0: 0, tFinal: 20, h: 2
    };

    let totalPointsEarned = 0;
    let correctCount = 0;
    const questionFeedback = [];

    // Calificar cada pregunta
    QUESTION_BANK.forEach((q) => {
      const studentRaw = evalState.studentAnswers[q.id];
      let isCorrect = false;
      let pointsAwarded = 0;
      let expectedDisplay = '';
      let studentDisplay = '';

      if (q.type === 'numeric') {
        const expectedVal = q.getExpected(appParams);
        const studentVal = parseStudentNumber(studentRaw);
        const tol = q.tolerance !== undefined ? q.tolerance : 0.2;
        expectedDisplay = `${expectedVal.toFixed(2)} ${q.unit || ''}`;
        studentDisplay = isNaN(studentVal) ? 'Sin respuesta' : `${studentVal.toFixed(2)} ${q.unit || ''}`;

        if (!isNaN(studentVal)) {
          const absDiff = Math.abs(studentVal - expectedVal);
          const relDiff = Math.abs(expectedVal) > 1e-6 ? absDiff / Math.abs(expectedVal) : absDiff;
          if (absDiff <= tol || relDiff <= 0.02) {
            isCorrect = true;
          }
        }
      } else {
        // Opción múltiple, V/F o fórmula
        studentDisplay = studentRaw ? String(studentRaw) : 'Sin respuesta';
        expectedDisplay = q.correctAnswer;

        if (studentRaw && studentRaw === q.correctAnswer) {
          isCorrect = true;
        }

        // Obtener texto amigable de la opción elegida
        const optFound = q.options ? q.options.find(o => o.id === studentRaw) : null;
        if (optFound) studentDisplay = optFound.text;
        const optCorrect = q.options ? q.options.find(o => o.id === q.correctAnswer) : null;
        if (optCorrect) expectedDisplay = optCorrect.text;
      }

      if (isCorrect) {
        pointsAwarded = q.points;
        totalPointsEarned += q.points;
        correctCount++;
      }

      const procedureText = typeof q.procedure === 'function' ? q.procedure(appParams) : q.procedure;

      questionFeedback.push({
        id: q.id,
        activity: q.activity,
        activityTitle: q.activityTitle,
        rubricKey: q.rubricKey,
        title: q.title,
        prompt: q.prompt,
        type: q.type,
        maxPoints: q.points,
        pointsAwarded: pointsAwarded,
        isCorrect: isCorrect,
        studentAnswer: studentDisplay,
        expectedAnswer: expectedDisplay,
        explanation: q.explanation,
        procedure: procedureText
      });
    });

    // Puntuación interna sobre 100 y escala sobre 20
    const score100 = Math.round(totalPointsEarned * 10) / 10;
    const score20 = Math.round((totalPointsEarned / 100) * 20 * 100) / 100;
    const percentage = Math.round((correctCount / QUESTION_BANK.length) * 1000) / 10;

    // Calcular el desglose por los 6 criterios de la rúbrica oficial (18 pts automáticos)
    const rubricBreakdown = {};
    let totalAutomaticRubricPoints = 0;

    Object.keys(RUBRIC_CRITERIA).forEach((key) => {
      const crit = RUBRIC_CRITERIA[key];
      const critQuestions = questionFeedback.filter(q => q.rubricKey === key);
      const critMaxPts = critQuestions.reduce((acc, q) => acc + q.maxPoints, 0);
      const critEarnedPts = critQuestions.reduce((acc, q) => acc + q.pointsAwarded, 0);
      const ratio = critMaxPts > 0 ? (critEarnedPts / critMaxPts) : 0;
      const rubricEarned = Math.round(ratio * crit.maxPoints * 100) / 100;

      rubricBreakdown[key] = {
        name: crit.name,
        activities: crit.activities,
        description: crit.description,
        maxRubricPoints: crit.maxPoints,
        earnedRubricPoints: rubricEarned,
        rawEarned: critEarnedPts,
        rawMax: critMaxPts,
        percentage: Math.round(ratio * 100)
      };

      totalAutomaticRubricPoints += rubricEarned;
    });

    totalAutomaticRubricPoints = Math.round(totalAutomaticRubricPoints * 100) / 100;

    // Determinar nivel de competencia alcanzado y desbloqueos
    const proficiency = calculateProficiencyLevel(percentage);

    const results = {
      studentName: evalState.studentName,
      date: new Date().toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
      elapsedSeconds: evalState.elapsedSeconds,
      timeFormatted: `${Math.floor(evalState.elapsedSeconds / 60)} min ${evalState.elapsedSeconds % 60} s`,
      totalQuestions: QUESTION_BANK.length,
      correctCount: correctCount,
      incorrectCount: QUESTION_BANK.length - correctCount,
      percentage: percentage,
      score100: score100,
      score20: score20,
      automaticRubricPoints: totalAutomaticRubricPoints,
      teacherPresentationPoints: 2.0, // A evaluar por el docente
      rubricBreakdown: rubricBreakdown,
      proficiency: proficiency,
      feedback: questionFeedback,
      simulationParams: { ...appParams }
    };

    evalState.evaluationResults = results;

    // Renderizar resultados en pantalla y habilitar botones de informe
    renderEvaluationInterface();

    // Scroll suave hacia el panel de resultados
    const resEl = document.getElementById('eval-results-container');
    if (resEl) {
      resEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Re-renderizar expresiones MathJax
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise().catch(() => {});
    }

    return results;
  }

  /**
   * Restablece el formulario de evaluación para permitir un nuevo intento académico.
   */
  function resetEvaluation() {
    evalState.isSubmitted = false;
    evalState.studentAnswers = {};
    evalState.evaluationResults = null;
    evalState.elapsedSeconds = 0;
    startEvaluationTimer();
    renderEvaluationInterface();

    const quizWrap = document.getElementById(evalState.containerId);
    if (quizWrap) {
      quizWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Descarga el acta oficial de evaluación en formato HTML imprimible y autónomo.
   */
  function downloadHtmlReport() {
    if (!evalState.evaluationResults) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Debes completar y calificar la evaluación antes de descargar el acta.');
      }
      return;
    }

    const r = evalState.evaluationResults;
    const sanitizedName = r.studentName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '_');

    let rubricRowsHtml = '';
    Object.keys(r.rubricBreakdown).forEach((k) => {
      const c = r.rubricBreakdown[k];
      rubricRowsHtml += `
        <tr>
          <td><strong>${c.name}</strong><br><span style="font-size: 8pt; color: #555;">${c.description}</span></td>
          <td style="text-align: center;">${c.activities}</td>
          <td style="text-align: center;">${c.maxRubricPoints.toFixed(1)} pts</td>
          <td style="text-align: center; font-weight: bold; color: #0284c7;">${c.earnedRubricPoints.toFixed(2)} pts</td>
          <td style="text-align: center;">${c.percentage}%</td>
        </tr>
      `;
    });

    let questionsRowsHtml = '';
    r.feedback.forEach((q, idx) => {
      const statusBadge = q.isCorrect
        ? '<span style="color: #16a34a; font-weight: bold;">✔ CORRECTO</span>'
        : '<span style="color: #dc2626; font-weight: bold;">✘ INCORRECTO</span>';
      questionsRowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; vertical-align: top;">${idx + 1}</td>
          <td style="padding: 8px; vertical-align: top;">
            <strong>${q.title}</strong><br>
            <span style="font-size: 8.5pt; color: #475569;">${q.prompt}</span><br>
            <div style="margin-top: 4px; font-size: 8pt; background: #f8fafc; padding: 4px; border-left: 2px solid #0284c7;">
              <strong>Procedimiento:</strong><br>${q.procedure.replace(/\n/g, '<br>')}
            </div>
          </td>
          <td style="padding: 8px; vertical-align: top; font-size: 8.5pt;">${q.studentAnswer}</td>
          <td style="padding: 8px; vertical-align: top; font-size: 8.5pt; color: #0369a1;">${q.expectedAnswer}</td>
          <td style="padding: 8px; vertical-align: top; text-align: center;">${statusBadge}<br><small>${q.pointsAwarded}/${q.maxPoints} pts</small></td>
        </tr>
      `;
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acta Oficial de Evaluación — ${r.studentName}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 30px; color: #0f172a; line-height: 1.5; font-size: 10pt; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .nasa-badge { font-size: 13pt; font-weight: bold; color: #0369a1; letter-spacing: 1px; }
    .doc-title { font-size: 16pt; font-weight: 800; margin: 4px 0; color: #0f172a; }
    .meta-box { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 9pt; }
    .mission-box { background: #eff6ff; border-left: 4px solid #0284c7; padding: 10px 14px; margin-bottom: 20px; font-style: italic; font-size: 9pt; color: #1e3a8a; }
    .score-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px; text-align: center; }
    .score-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #ffffff; }
    .score-val { font-size: 18pt; font-weight: bold; color: #0284c7; }
    .score-lbl { font-size: 8pt; text-transform: uppercase; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 8.5pt; text-transform: uppercase; }
    td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9pt; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 45px; page-break-inside: avoid; }
    .sig-line { border-top: 1px solid #0f172a; padding-top: 8px; text-align: center; font-size: 9pt; }
    @media print { body { margin: 15mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="nasa-badge">NASA MISSION 1962 — ASIGNATURA MÉTODOS NUMÉRICOS</div>
      <div class="doc-title">ACTA OFICIAL DE EVALUACIÓN DE COMPETENCIAS</div>
      <div style="font-size: 8.5pt; color: #64748b;">Facultad de Ingeniería • Escuela de Ciencias de la Computación</div>
    </div>
    <div style="text-align: right; font-size: 8.5pt;">
      <strong>Fecha:</strong> ${r.date}<br>
      <strong>Tiempo:</strong> ${r.timeFormatted}
    </div>
  </div>

  <div class="mission-box">
    <strong>Misión Académica:</strong> "El equipo de control de la NASA necesita verificar el ascenso de un cohete experimental. Debes calcular la velocidad y la altura mediante Euler, comparar con la solución analítica y justificar la precisión del método".
  </div>

  <div class="meta-box">
    <div><strong>Estudiante Evaluado:</strong> ${r.studentName}</div>
    <div><strong>Nivel Consolidado:</strong> ${r.proficiency.current.name.toUpperCase()} (${r.proficiency.current.unlockText})</div>
    <div><strong>Aciertos:</strong> ${r.correctCount} / ${r.totalQuestions} (${r.percentage}%)</div>
    <div><strong>Condiciones:</strong> m=${r.simulationParams.m}kg, T=${r.simulationParams.T}N, g=${r.simulationParams.g}m/s², k=${r.simulationParams.k}kg/s, h=${r.simulationParams.h}s</div>
  </div>

  <div class="score-summary">
    <div class="score-card">
      <div class="score-val">${r.score100} <span style="font-size: 11pt;">/ 100</span></div>
      <div class="score-lbl">Puntuación Interna</div>
    </div>
    <div class="score-card">
      <div class="score-val">${r.score20.toFixed(2)} <span style="font-size: 11pt;">/ 20</span></div>
      <div class="score-lbl">Nota Equivalente (sobre 20)</div>
    </div>
    <div class="score-card">
      <div class="score-val">${r.automaticRubricPoints.toFixed(2)} <span style="font-size: 11pt;">/ 18</span></div>
      <div class="score-lbl">Rúbrica Automática</div>
    </div>
    <div class="score-card">
      <div class="score-val">+ 2,0 <span style="font-size: 11pt;">pts</span></div>
      <div class="score-lbl">Presentación Docente</div>
    </div>
  </div>

  <h3 style="font-size: 11pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">1. Desglose por Criterios de la Rúbrica Oficial (18 Puntos Automáticos)</h3>
  <table>
    <thead>
      <tr>
        <th>Criterio de Evaluación</th>
        <th style="text-align: center;">Actividades</th>
        <th style="text-align: center;">Ponderación</th>
        <th style="text-align: center;">Puntaje Obtenido</th>
        <th style="text-align: center;">Acierto</th>
      </tr>
    </thead>
    <tbody>
      ${rubricRowsHtml}
      <tr style="background: #f8fafc; font-weight: bold;">
        <td colspan="2">TOTAL EVALUACIÓN AUTOMÁTICA</td>
        <td style="text-align: center;">18,0 pts</td>
        <td style="text-align: center; color: #0284c7;">${r.automaticRubricPoints.toFixed(2)} pts</td>
        <td style="text-align: center;">${Math.round((r.automaticRubricPoints/18)*100)}%</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size: 8pt; color: #64748b; font-style: italic; margin-top: -15px; margin-bottom: 25px;">
    * Nota reglamentaria: Los 2,0 puntos restantes correspondientes a la Presentación Oral y Sustentación Técnica son evaluados directamente por el docente en clase.
  </p>

  <h3 style="font-size: 11pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">2. Detalle de Respuestas y Procedimientos</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 25px;">#</th>
        <th>Pregunta y Procedimiento Teórico</th>
        <th style="width: 140px;">Tu Respuesta</th>
        <th style="width: 140px;">Respuesta Correcta</th>
        <th style="width: 110px; text-align: center;">Calificación</th>
      </tr>
    </thead>
    <tbody>
      ${questionsRowsHtml}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-line">
      <strong>${r.studentName}</strong><br>
      Firma del Estudiante
    </div>
    <div class="sig-line">
      <strong>Comité Docente de Métodos Numéricos</strong><br>
      Firma y Sello del Evaluador
    </div>
  </div>
</body>
</html>`;

    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return htmlContent;
    }

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Acta_Evaluacion_NASA_${sanitizedName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return htmlContent;
  }

  /**
   * Abre el cuadro de diálogo de impresión del navegador formateado para imprimir o guardar como PDF.
   */
  function printEvaluationReport() {
    if (!evalState.evaluationResults) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Debes completar y calificar la evaluación antes de imprimir el informe.');
      }
      return;
    }
    window.print();
  }

  /**
   * Actualiza el contador de preguntas contestadas en tiempo real.
   */
  function updateAnsweredCount() {
    const elCount = document.getElementById('eval-answered-count');
    if (!elCount) return;
    const answered = Object.keys(evalState.studentAnswers).filter(k => {
      const v = evalState.studentAnswers[k];
      return v !== null && v !== undefined && String(v).trim().length > 0;
    }).length;
    elCount.textContent = answered;
  }

  /**
   * Renderiza la interfaz gráfica completa del módulo dentro del contenedor designado.
   */
  function renderEvaluationInterface() {
    const container = document.getElementById(evalState.containerId);
    if (!container) return;

    const appParams = window.App ? window.App.getState() : {
      m: 1000, T: 15000, g: 9.81, k: 100, v0: 0, y0: 0, tFinal: 20, h: 2
    };

    const isSubmitted = evalState.isSubmitted;
    const res = evalState.evaluationResults;

    let html = `
      <!-- 1. Tarjeta de Misión Oficial -->
      <div class="eval-mission-card">
        <div class="mission-tag-row">
          <span class="badge-mission-nasa">MISIÓN OFICIAL DE EVALUACIÓN</span>
          <span class="mission-code-badge">CÓDIGO: NASA-MN-1962</span>
        </div>
        <p class="mission-quote-text">
          «El equipo de control de la NASA necesita verificar el ascenso de un cohete experimental. Debes calcular la velocidad y la altura mediante Euler, comparar con la solución analítica y justificar la precisión del método».
        </p>
      </div>

      <!-- 2. Barra de Identidad del Estudiante y Cronómetro -->
      <div class="eval-student-bar">
        <div class="student-name-field">
          <label for="eval-student-name" class="student-label">
            <span>Nombre y Apellidos del Estudiante:</span>
            <span class="required-indicator">*</span>
          </label>
          <input type="text" id="eval-student-name" class="eval-input-text"
            placeholder="Ejemplo: Katherine Johnson (Obligatorio para calificar)"
            value="${evalState.studentName}"
            ${isSubmitted ? 'readonly' : ''} />
        </div>

        <div class="eval-meta-deck">
          <div class="eval-timer-pill" title="Tiempo transcurrido en la evaluación">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>TIEMPO: <strong id="eval-timer-display">00:00</strong></span>
          </div>

          <div class="eval-progress-pill">
            <span>Respondidas: <strong id="eval-answered-count">0</strong> / ${QUESTION_BANK.length}</span>
          </div>
        </div>
      </div>
    `;

    // 3. Panel de Resultados y Rúbrica (Si ya fue entregado y calificado)
    if (isSubmitted && res) {
      let rubricRows = '';
      Object.keys(res.rubricBreakdown).forEach((k) => {
        const c = res.rubricBreakdown[k];
        rubricRows += `
          <tr>
            <td>
              <div class="rubric-crit-name">${c.name}</div>
              <div class="rubric-crit-desc">${c.description}</div>
            </td>
            <td class="text-center">${c.activities}</td>
            <td class="text-center">${c.maxRubricPoints.toFixed(1)} pts</td>
            <td class="text-center font-bold highlight-cyan">${c.earnedRubricPoints.toFixed(2)} pts</td>
            <td class="text-center">${c.percentage}%</td>
          </tr>
        `;
      });

      let levelsHtml = '';
      res.proficiency.allLevels.forEach((lvl) => {
        const isUnlocked = lvl.isUnlocked;
        const isCurrent = lvl.isCurrent;
        levelsHtml += `
          <div class="eval-level-badge-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current-active' : ''}">
            <div class="level-badge-top">
              <span class="level-badge-tag">${lvl.badge}</span>
              <span class="level-status-icon">${isUnlocked ? '✔ DESBLOQUEADO' : '🔒 BLOQUEADO'}</span>
            </div>
            <div class="level-badge-title">${lvl.name}</div>
            <div class="level-badge-unlock">${lvl.unlockText}</div>
            <div class="level-badge-desc">${lvl.description}</div>
          </div>
        `;
      });

      html += `
        <div id="eval-results-container" class="eval-results-dashboard">
          <div class="results-header-banner">
            <div class="results-title-group">
              <span class="status-dot-green"></span>
              <h3 class="results-main-title">EVALUACIÓN CALIFICADA EXITOSAMENTE</h3>
            </div>
            <div class="results-meta-pill">Fecha de emisión: ${res.date} • Duración: ${res.timeFormatted}</div>
          </div>

          <!-- Tarjetas de Puntuación Principal -->
          <div class="eval-score-cards-grid">
            <div class="eval-score-card">
              <div class="score-card-lbl">Puntuación Interna</div>
              <div class="score-card-val cyan-glow">${res.score100} <span class="score-card-den">/ 100</span></div>
              <div class="score-card-sub">${res.correctCount} correctas de ${res.totalQuestions} (${res.percentage}%)</div>
            </div>

            <div class="eval-score-card highlight-card">
              <div class="score-card-lbl">Nota Académica Equivalente</div>
              <div class="score-card-val amber-glow">${res.score20.toFixed(2)} <span class="score-card-den">/ 20</span></div>
              <div class="score-card-sub">Escala reglamentaria universitaria</div>
            </div>

            <div class="eval-score-card">
              <div class="score-card-lbl">Rúbrica Automática</div>
              <div class="score-card-val green-glow">${res.automaticRubricPoints.toFixed(2)} <span class="score-card-den">/ 18</span></div>
              <div class="score-card-sub">6 criterios evaluados en el sistema</div>
            </div>

            <div class="eval-score-card">
              <div class="score-card-lbl">Evaluación Docente</div>
              <div class="score-card-val sky-glow">+ 2,00 <span class="score-card-den">pts</span></div>
              <div class="score-card-sub">Presentación y defensa técnica en clase</div>
            </div>
          </div>

          <!-- Rúbrica Oficial Desglosada (18 Puntos) -->
          <div class="eval-rubric-section">
            <div class="rubric-header-title">RÚBRICA OFICIAL DE EVALUACIÓN (18 PUNTOS AUTOMÁTICOS)</div>
            <div class="table-responsive-wrapper">
              <table class="eval-rubric-table">
                <thead>
                  <tr>
                    <th>Criterio de Evaluación</th>
                    <th class="text-center">Actividades</th>
                    <th class="text-center">Puntaje Máximo</th>
                    <th class="text-center">Puntaje Obtenido</th>
                    <th class="text-center">% Cumplimiento</th>
                  </tr>
                </thead>
                <tbody>
                  ${rubricRows}
                  <tr class="rubric-total-row">
                    <td colspan="2">TOTAL EVALUACIÓN AUTOMÁTICA DEL SISTEMA</td>
                    <td class="text-center">18,0 pts</td>
                    <td class="text-center highlight-cyan font-bold">${res.automaticRubricPoints.toFixed(2)} pts</td>
                    <td class="text-center">${Math.round((res.automaticRubricPoints/18)*100)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="rubric-clarification-note">
              <strong>Nota Pedagógica:</strong> Los 2 puntos de presentación los evalúa el docente directamente en la sustentación oral presencial (Total acumulable: 20 puntos).
            </div>
          </div>

          <!-- Árbol de Niveles y Desbloqueos de Competencia -->
          <div class="eval-levels-section">
            <div class="rubric-header-title">DESBLOQUEO DE NIVELES DE COMPETENCIA</div>
            <div class="eval-levels-grid">
              ${levelsHtml}
            </div>
          </div>
        </div>
      `;
    }

    // 4. Lista interactiva de preguntas (Agrupadas en sus 12 tarjetas)
    html += '<div class="eval-questions-list">';

    QUESTION_BANK.forEach((q, idx) => {
      const qNum = idx + 1;
      const userAns = evalState.studentAnswers[q.id];
      const fb = res ? res.feedback.find(f => f.id === q.id) : null;

      let cardClass = 'eval-question-card';
      if (fb) {
        cardClass += fb.isCorrect ? ' card-correct' : ' card-incorrect';
      }

      html += `
        <div id="card-${q.id}" class="${cardClass}">
          <div class="eval-q-header">
            <div class="eval-q-title-row">
              <span class="eval-q-activity-badge">${q.activityTitle}</span>
              <span class="eval-q-rubric-badge">${RUBRIC_CRITERIA[q.rubricKey].name}</span>
            </div>
            <div class="eval-q-points-badge">${q.points} pts</div>
          </div>

          <div class="eval-q-title">${qNum}. ${q.title}</div>
          <div class="eval-q-prompt">${q.prompt}</div>
      `;

      // Renderizar zona de entrada según el tipo de pregunta
      if (q.type === 'numeric') {
        const hintText = typeof q.getDynamicHint === 'function' ? q.getDynamicHint(appParams) : '';
        html += `
          <div class="eval-numeric-input-group">
            <div class="numeric-input-wrap">
              <input type="text" class="eval-numeric-input" data-qid="${q.id}"
                placeholder="Escribe tu resultado numérico"
                value="${userAns !== undefined && userAns !== null ? userAns : ''}"
                ${isSubmitted ? 'readonly' : ''} />
              <span class="eval-numeric-unit-addon">${q.unit || ''}</span>
            </div>
            ${hintText ? `<div class="eval-dynamic-hint">${hintText}</div>` : ''}
          </div>
        `;
      } else {
        // multiple_choice, formula_choice, true_false
        html += '<div class="eval-options-list">';
        q.options.forEach((opt) => {
          const isChecked = userAns === opt.id;
          html += `
            <label class="eval-option-label ${isChecked ? 'selected' : ''}">
              <input type="radio" name="ans_${q.id}" class="eval-option-radio"
                value="${opt.id}" data-qid="${q.id}"
                ${isChecked ? 'checked' : ''}
                ${isSubmitted ? 'disabled' : ''} />
              <span class="eval-option-text">${opt.text}</span>
            </label>
          `;
        });
        html += '</div>';
      }

      // Zona de retroalimentación detallada (Visible tras calificar)
      if (fb) {
        const statusClass = fb.isCorrect ? 'correct' : 'incorrect';
        const statusIcon = fb.isCorrect ? '✔' : '✘';
        const statusText = fb.isCorrect ? 'RESPUESTA CORRECTA' : 'RESPUESTA INCORRECTA';

        html += `
          <div class="eval-feedback-panel ${statusClass}">
            <div class="feedback-banner">
              <span class="feedback-icon">${statusIcon}</span>
              <span class="feedback-status-title">${statusText}</span>
              <span class="feedback-score-awarded">+${fb.pointsAwarded} / ${fb.maxPoints} pts</span>
            </div>

            <div class="feedback-answers-comparison">
              <div><strong>Tu respuesta:</strong> <span class="ans-user">${fb.studentAnswer}</span></div>
              <div><strong>Respuesta correcta:</strong> <span class="ans-expected">${fb.expectedAnswer}</span></div>
            </div>

            <div class="feedback-explanation">
              <strong>Explicación matemática:</strong> ${fb.explanation}
            </div>

            <div class="feedback-procedure">
              <strong>Procedimiento paso a paso:</strong>
              <pre class="procedure-pre">${fb.procedure}</pre>
            </div>
          </div>
        `;
      }

      html += '</div>'; // Fin eval-question-card
    });

    html += '</div>'; // Fin eval-questions-list

    // 5. Barra de Acciones y Botones de Descarga
    html += `
      <div class="eval-actions-bar">
        <div class="eval-primary-buttons">
          ${!isSubmitted ? `
            <button type="button" id="btn-submit-evaluation" class="btn-eval-action btn-submit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polyline points="20 6 9 17 4 12"/></svg>
              ENTREGAR Y CALIFICAR EVALUACIÓN
            </button>
          ` : `
            <button type="button" id="btn-reset-evaluation" class="btn-eval-action btn-retry">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              REINTENTAR / NUEVO INTENTO
            </button>
          `}
        </div>

        <div class="eval-report-buttons">
          <button type="button" id="btn-download-html-report" class="btn-eval-report btn-html" ${!isSubmitted ? 'disabled' : ''}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            DESCARGAR ACTA (HTML)
          </button>
          <button type="button" id="btn-print-report" class="btn-eval-report btn-pdf" ${!isSubmitted ? 'disabled' : ''}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            IMPRIMIR / GUARDAR PDF
          </button>
        </div>
      </div>

      <!-- Contenedor Oculto para Impresión Oficial Directa (window.print) -->
      <div id="printable-evaluation-report" class="printable-report-container" style="display: none;"></div>
    `;

    container.innerHTML = html;

    // Vincular controladores de eventos interactivos
    bindEvaluationEvents();
    updateTimerDisplay();
    updateAnsweredCount();
  }

  /**
   * Vincula los eventos de clic, input y cambio a los elementos del DOM.
   */
  function bindEvaluationEvents() {
    // 1. Campo de texto para nombre del estudiante
    const nameInput = document.getElementById('eval-student-name');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        evalState.studentName = e.target.value;
      });
    }

    // 2. Entradas numéricas
    const numInputs = document.querySelectorAll('.eval-numeric-input');
    numInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const qid = e.target.getAttribute('data-qid');
        evalState.studentAnswers[qid] = e.target.value;
        updateAnsweredCount();
      });
    });

    // 3. Opciones radio (selección múltiple, V/F, fórmulas)
    const radioInputs = document.querySelectorAll('.eval-option-radio');
    radioInputs.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const qid = e.target.getAttribute('data-qid');
        evalState.studentAnswers[qid] = e.target.value;

        // Actualizar clase visual 'selected' en el contenedor label
        const group = document.querySelectorAll(`input[name="${e.target.name}"]`);
        group.forEach(r => {
          if (r.closest('.eval-option-label')) {
            r.closest('.eval-option-label').classList.remove('selected');
          }
        });
        if (e.target.closest('.eval-option-label')) {
          e.target.closest('.eval-option-label').classList.add('selected');
        }

        updateAnsweredCount();
      });
    });

    // 4. Botón Entregar / Calificar
    const btnSubmit = document.getElementById('btn-submit-evaluation');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        evaluateStudentAnswers();
      });
    }

    // 5. Botón Reintentar
    const btnReset = document.getElementById('btn-reset-evaluation');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        resetEvaluation();
      });
    }

    // 6. Botones de Informe
    const btnDownloadHtml = document.getElementById('btn-download-html-report');
    if (btnDownloadHtml) {
      btnDownloadHtml.addEventListener('click', () => {
        downloadHtmlReport();
      });
    }

    const btnPrint = document.getElementById('btn-print-report');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        printEvaluationReport();
      });
    }
  }

  /**
   * Sincroniza dinámicamente las pistas y cálculos esperados si cambian los parámetros de simulación.
   * 
   * @param {Object} state - Estado central de la aplicación
   */
  function syncWithState(state) {
    // Si aún no ha sido entregada, refrescar la interfaz para mantener las pistas alineadas
    if (!evalState.isSubmitted && document.getElementById(evalState.containerId)) {
      renderEvaluationInterface();
    }
  }

  /**
   * Inicializa el módulo de evaluación interactiva.
   * 
   * @param {string} containerId - ID del contenedor HTML de evaluación
   */
  function initEvaluation(containerId) {
    evalState.containerId = containerId || 'quiz-container';
    startEvaluationTimer();
    renderEvaluationInterface();
  }

  // API pública expuesta
  return {
    initEvaluation: initEvaluation,
    evaluateStudentAnswers: evaluateStudentAnswers,
    resetEvaluation: resetEvaluation,
    syncWithState: syncWithState,
    downloadHtmlReport: downloadHtmlReport,
    printEvaluationReport: printEvaluationReport,
    getQuestions: function () {
      return QUESTION_BANK;
    },
    getEvaluationResults: function () {
      return evalState.evaluationResults;
    },
    getRubricCriteria: function () {
      return RUBRIC_CRITERIA;
    }
  };
})();
