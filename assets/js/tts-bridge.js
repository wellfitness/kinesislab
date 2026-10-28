// KinesisTTS — bridge unificado de Text-To-Speech.
// Prioriza el bridge nativo Android (window.AndroidTTS, expuesto desde MainActivity)
// y cae al Web Speech API estándar cuando se ejecuta en navegador / PWA.
//
// La velocidad de la voz es un ajuste GLOBAL de la aplicación, persistido en
// localStorage. Antes cada herramienta fijaba su propia velocidad a fuego
// (1.3 en flechas, colores, go-nogo y flechas reactivas; 1.1 en el reloj; 1.0
// implícito en comba) y solo boxing dejaba cambiarla. El resultado era una voz
// apresurada que no se entendía.
//
// API pública:
//   KinesisTTS.warmup()                     -> precalienta motor (llamar tras gesto del usuario)
//   KinesisTTS.speak(text, rate)            -> fire-and-forget
//   KinesisTTS.speakAndWait(text, rate)     -> Promise<void> que resuelve al terminar
//   KinesisTTS.cancel()                     -> detiene cola actual
//   KinesisTTS.isAvailable()                -> bool
//   KinesisTTS.isAndroid()                  -> bool (true cuando hay bridge nativo)
//   KinesisTTS.getConfig()                  -> { rate, lang }
//   KinesisTTS.getRate()                    -> velocidad global vigente
//   KinesisTTS.setRate(rate)                -> fija y persiste la velocidad global
//   KinesisTTS.spanishVoiceKnown()          -> true / false / null (null = aún no se sabe)
//   KinesisTTS.onSpanishVoiceChange(cb)     -> avisa cuando el estado de la voz es real
//   KinesisTTS.hasSpanishVoice()            -> bool (optimista: unknown no se cuenta como "no hay")
(function () {
  const STORAGE_KEY = 'kinesislab.tts';

  // Escala de velocidad: 1.0 es el ritmo normal de cada motor.
  // El tope de 1.3 no es caprichoso: Android documenta 0.7-1.3 como el rango
  // útil de setSpeechRate(), y por encima el motor empieza a atropellar sílabas.
  const RATE_MIN = 0.6;
  const RATE_MAX = 1.3;

  // Ritmo por defecto. Deliberadamente por debajo de 1.0: la voz es la
  // instrucción y la clienta la ejecuta en movimiento, con la atención
  // repartida entre el ejercicio y la pantalla. La palabra tiene que
  // entenderse a la primera.
  const DEFAULT_RATE = 0.9;

  const DEFAULT_LANG = 'es-ES';

  const hasAndroidBridge = !!(
    window.AndroidTTS &&
    typeof window.AndroidTTS.speak === 'function'
  );
  const hasWebSpeech = 'speechSynthesis' in window;

  function clampRate(rate) {
    if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) return DEFAULT_RATE;
    return Math.min(RATE_MAX, Math.max(RATE_MIN, rate));
  }

  // ─── Configuración global persistida ───────────────────────────────
  let config = { rate: DEFAULT_RATE, lang: DEFAULT_LANG };

  function readStoredConfig() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (typeof parsed.rate === 'number') config.rate = clampRate(parsed.rate);
      if (typeof parsed.lang === 'string' && parsed.lang) config.lang = parsed.lang;
    } catch (e) { /* sin almacenamiento: se usan los valores por defecto */ }
  }

  function persistConfig() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) { /* sin almacenamiento: el ajuste dura lo que la sesión */ }
  }

  readStoredConfig();

  // ─── Selección de voz ──────────────────────────────────────────────
  // Regla innegociable: la voz debe ser en español. Si el dispositivo no tiene
  // ninguna, se deja el campo `voice` vacío para que el motor elija por `lang`.
  // Nunca se recurre a la voz por defecto si no es española, porque una voz
  // inglesa leyendo texto en español es indistinguible de un fallo de audio.
  let webVoice = null;

  function spanishVoices(voices) {
    if (!voices || !voices.length) return [];
    return voices.filter(v => v && v.lang && v.lang.toLowerCase().indexOf('es') === 0);
  }

  function pickWebVoice() {
    if (!hasWebSpeech) return null;
    const voices = window.speechSynthesis.getVoices();
    const es = spanishVoices(voices);
    if (!es.length) return null;
    const preferred = config.lang.toLowerCase();
    return es.find(v => v.lang.toLowerCase() === preferred)
        || es.find(v => v.lang.toLowerCase() === 'es-es')
        || es[0];
  }

  // Se resuelve de forma perezosa en cada locución: en Chrome getVoices()
  // devuelve lista vacía durante la carga inicial y la llena después, así que
  // fijarla solo al arrancar dejaba la voz del sistema por defecto.
  function getWebVoice() {
    if (!webVoice) webVoice = pickWebVoice();
    return webVoice;
  }

  if (hasWebSpeech) {
    window.speechSynthesis.onvoiceschanged = function () {
      webVoice = null;
      getWebVoice();
      notifySpanishVoice();
    };
  }

  /**
   * Estado de la voz en español:
   *   true  -> hay voz en español
   *   false -> el motor está listo y NO hay voz en español
   *   null  -> todavía no se sabe (el motor no ha enlazado o las voces no han
   *            cargado). Antes de saberlo no se puede afirmar ni una cosa ni
   *            la otra, y una interfaz que lo томara como cierto anunciaría
   *            un falso positivo en cada arranque en frío.
   */
  function spanishVoiceKnown() {
    if (hasAndroidBridge) {
      try {
        if (typeof window.AndroidTTS.isReady === 'function' && !window.AndroidTTS.isReady()) return null;
        if (typeof window.AndroidTTS.isSpanishAvailable !== 'function') return null;
        return !!window.AndroidTTS.isSpanishAvailable();
      } catch (e) { return null; }
    }
    if (!hasWebSpeech) return false;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    return spanishVoices(voices).length > 0;
  }

  const spanishVoiceListeners = [];

  function notifySpanishVoice() {
    const known = spanishVoiceKnown();
    if (known === null) return;
    spanishVoiceListeners.forEach(cb => { try { cb(known); } catch (e) { /* noop */ } });
  }

  if (hasAndroidBridge) {
    // El motor de voz enlaza de forma asíncrona: se sondea hasta que esté
    // listo para poder avisar con el dato real y no antes.
    let attempts = 0;
    const poll = () => {
      if (!window.AndroidTTS) return;
      try {
        if (typeof window.AndroidTTS.isReady === 'function' && window.AndroidTTS.isReady()) {
          notifySpanishVoice();
          return;
        }
      } catch (_) {}
      if (++attempts < 50) setTimeout(poll, 200);
    };
    setTimeout(poll, 200);
  }

  function normRate(rate) {
    const base = (typeof rate === 'number' && isFinite(rate) && rate > 0) ? rate : config.rate;
    return clampRate(base);
  }

  // ─── Locución web ──────────────────────────────────────────────────
  function buildUtterance(text, rate) {
    const u = new SpeechSynthesisUtterance(text);
    const voice = getWebVoice();
    u.lang = voice ? voice.lang : config.lang;
    u.rate = normRate(rate);
    u.volume = 1;
    if (voice) u.voice = voice;
    return u;
  }

  function speakWeb(text, rate) {
    if (!hasWebSpeech) return;
    try {
      window.speechSynthesis.speak(buildUtterance(text, rate));
    } catch (e) { /* noop */ }
  }

  // Reservas de promesas en curso. Se resuelven al cancelar para que una
  // herramienta que espera la locución no se quede colgada.
  const pendingCallbacks = new Map();  // Android: id -> resolver
  const pendingWeb = new Set();        // Web: resolver
  let callbackCounter = 0;

  // Estimación generosa de duración. El español hablado real ronda 170-200 ms
  // por carácter a ritmo 1.0; con 220 ms la red de seguridad nunca resuelve la
  // promesa antes de que la voz termine, que era lo que solapaba la instrucción
  // siguiente con la anterior en comba y boxing.
  function estimateDurationMs(text, rate) {
    const chars = String(text || '').length;
    const speed = normRate(rate);
    return Math.max(2500, Math.ceil((chars * 220) / speed));
  }

  function speakWebAndWait(text, rate) {
    return new Promise((resolve) => {
      if (!hasWebSpeech) return resolve();
      let settled = false;
      let timer = null;
      const done = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        pendingWeb.delete(done);
        resolve();
      };
      pendingWeb.add(done);
      try {
        const u = buildUtterance(text, rate);
        u.onend = done;
        u.onerror = done;
        window.speechSynthesis.speak(u);
        timer = setTimeout(done, estimateDurationMs(text, rate));
      } catch (e) {
        done();
      }
    });
  }

  // Llamado desde Java vía evaluateJavascript cuando una utterance termina (o falla).
  window.__androidTTSDone = function (id) {
    const resolver = pendingCallbacks.get(id);
    if (resolver) {
      pendingCallbacks.delete(id);
      resolver();
    }
  };

  function releasePending() {
    pendingCallbacks.forEach(resolver => resolver());
    pendingCallbacks.clear();
    pendingWeb.forEach(resolver => resolver());
    pendingWeb.clear();
  }

  // Espera a que el motor de voz enlace. Si no lo hace en 2.5 s, se continúa:
  // el puente nativo decide entonces si puede locutar o no.
  function waitForEngine(callback) {
    let attempts = 0;
    const tick = () => {
      if (!window.AndroidTTS) {
        callback();
        return;
      }
      try {
        if (typeof window.AndroidTTS.isReady === 'function' && window.AndroidTTS.isReady()) {
          callback();
          return;
        }
      } catch (_) {}
      if (++attempts > 25) {
        callback();
        return;
      }
      setTimeout(tick, 100);
    };
    tick();
  }

  window.KinesisTTS = {
    isAvailable() { return hasAndroidBridge || hasWebSpeech; },
    isAndroid() { return hasAndroidBridge; },

    getConfig() { return { rate: config.rate, lang: config.lang }; },
    getRate() { return config.rate; },

    setRate(rate) {
      config.rate = clampRate(rate);
      persistConfig();
      return config.rate;
    },

    // ¿Hay una voz en español disponible en el dispositivo? Devuelve null
    // mientras todavía no se puede saber: la interfaz avisa cuando el dato
    // es real, no antes.
    spanishVoiceKnown() { return spanishVoiceKnown(); },

    // Se avisa cuando el estado de la voz en español pasa a ser conocido.
    onSpanishVoiceChange(cb) {
      if (typeof cb === 'function') spanishVoiceListeners.push(cb);
    },

    hasSpanishVoice() {
      const known = spanishVoiceKnown();
      // Desconocido no equivale a "no hay": se es optimista para no lanzar avisos falsos.
      return known === null ? true : known;
    },

    warmup() {
      if (hasAndroidBridge) {
        try {
          if (typeof window.AndroidTTS.warmup === 'function') {
            window.AndroidTTS.warmup();
            return;
          }
          window.AndroidTTS.speak('', 1.0);
        } catch (e) { /* noop */ }
        return;
      }
      if (!hasWebSpeech) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        u.lang = config.lang;
        const voice = getWebVoice();
        if (voice) u.voice = voice;
        window.speechSynthesis.speak(u);
      } catch (e) { /* noop */ }
    },

    speak(text, rate) {
      if (!text) return;
      if (hasAndroidBridge) {
        try { window.AndroidTTS.speak(String(text), normRate(rate)); } catch (e) { /* noop */ }
        return;
      }
      speakWeb(text, rate);
    },

    speakAndWait(text, rate) {
      if (!text) return Promise.resolve();
      if (hasAndroidBridge) {
        return new Promise((resolve) => {
          const id = 'klw_' + (++callbackCounter) + '_' + Date.now();
          const safetyMs = estimateDurationMs(text, rate);
          let timer = null;
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            pendingCallbacks.delete(id);
            resolve();
          };
          pendingCallbacks.set(id, done);

          const start = () => {
            try {
              window.AndroidTTS.speakWithCallback(String(text), normRate(rate), id);
            } catch (e) {
              pendingCallbacks.delete(id);
              resolve();
              return;
            }
            // El temporizador arranca cuando la locución entra en cola, no
            // antes: si el motor aún no ha enlazado, la locución se reproduce
            // más tarde y el temporizador resolvería la promesa antes de
            // tiempo, descuadrando la secuencia de la herramienta.
            timer = setTimeout(done, safetyMs);
          };

          // Se espera a que el motor esté listo (máximo 5 s) antes de encolar.
          if (typeof window.AndroidTTS.isReady === 'function' && !window.AndroidTTS.isReady()) {
            waitForEngine(start);
          } else {
            start();
          }
        });
      }
      return speakWebAndWait(text, rate);
    },

    cancel() {
      if (hasAndroidBridge) {
        try { window.AndroidTTS.cancel(); } catch (e) { /* noop */ }
      }
      if (hasWebSpeech) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
      }
      // speechSynthesis.cancel() no garantiza onend ni onerror en todos los
      // navegadores. Sin liberar aquí, la herramienta que espera la locución
      // (comba, boxing) queda bloqueada para siempre.
      releasePending();
    }
  };
})();
