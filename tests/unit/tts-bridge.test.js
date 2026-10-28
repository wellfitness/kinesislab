import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
// Permite apuntar a otra versión del bridge para comprobar que estas
// pruebas detectan los defectos que corrigieron.
const BRIDGE_PATH = process.env.KINESIS_BRIDGE || resolve(ROOT, 'assets/js/tts-bridge.js');
const BRIDGE = readFileSync(BRIDGE_PATH, 'utf8');

// Voz española: el orden importa. Primero una voz es-MX, después la es-ES y
// al final la voz por defecto en inglés.
const VOICES = [
  { name: 'Microsoft Sabina', lang: 'es-MX', default: false },
  { name: 'Microsoft Laura', lang: 'es-ES', default: false },
  { name: 'Microsoft David', lang: 'en-US', default: true }
];

const SOLO_INGLES = [{ name: 'Microsoft David', lang: 'en-US', default: true }];

/**
 * Instala un speechSynthesis falso. autoEnd:false reproduce el caso real de
 * Chrome, que al cancelar una locución no dispara ni onend ni onerror.
 */
function installSpeech(voices, { autoEnd = true } = {}) {
  const spoken = [];
  const fake = {
    spoken,
    cancelled: 0,
    getVoices: () => voices,
    speak(u) {
      spoken.push(u);
      if (autoEnd) setTimeout(() => { if (typeof u.onend === 'function') u.onend(); }, 0);
    },
    cancel() { fake.cancelled++; }
  };
  window.speechSynthesis = fake;
  window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  return fake;
}

function loadBridge() {
  delete window.KinesisTTS;
  new Function(BRIDGE)();
  return window.KinesisTTS;
}

beforeEach(() => {
  try { localStorage.clear(); } catch (_) { /* sin almacenamiento */ }
  delete window.AndroidTTS;
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
});

describe('KinesisTTS · selección de voz', () => {
  it('elige la voz es-ES aunque haya otra variante es-* antes en la lista', () => {
    const speech = installSpeech(VOICES);
    const tts = loadBridge();
    tts.speak('Salto básico');
    expect(speech.spoken[0].voice.lang).toBe('es-ES');
  });

  it('no recurre a una voz no española cuando el dispositivo no tiene ninguna', () => {
    const speech = installSpeech(SOLO_INGLES);
    const tts = loadBridge();
    tts.speak('Salto básico');
    // Sin voz en español se deja el campo vacío para que el motor elija por
    // idioma. Una voz inglesa leyendo texto en español es ininteligible.
    expect(speech.spoken[0].voice).toBeUndefined();
    expect(speech.spoken[0].lang).toBe('es-ES');
  });

  it('el idioma de la locución coincide con el de la voz elegida', () => {
    const speech = installSpeech(VOICES);
    const tts = loadBridge();
    tts.speak('Salto básico');
    expect(speech.spoken[0].lang).toBe(speech.spoken[0].voice.lang);
  });

  it('detecta que el dispositivo no tiene voz en español', () => {
    installSpeech(SOLO_INGLES);
    const tts = loadBridge();
    expect(tts.hasSpanishVoice()).toBe(false);
  });

  it('detecta que el dispositivo sí tiene voz en español', () => {
    installSpeech(VOICES);
    const tts = loadBridge();
    expect(tts.hasSpanishVoice()).toBe(true);
  });

  it('no afirma nada sobre la voz española mientras el motor no ha arrancado', () => {
    // Estado desconocido: la interfaz no debe lanzar un aviso falso en cada
    // arranque en frío, ni ocultarlo de forma definitiva.
    installSpeech([]);
    const tts = loadBridge();
    expect(tts.spanishVoiceKnown()).toBeNull();
  });

  it('informa de que no hay voz española cuando las voces ya cargaron', () => {
    installSpeech(SOLO_INGLES);
    const tts = loadBridge();
    expect(tts.spanishVoiceKnown()).toBe(false);
  });

  it('informa de que hay voz española cuando las voces ya cargaron', () => {
    installSpeech(VOICES);
    const tts = loadBridge();
    expect(tts.spanishVoiceKnown()).toBe(true);
  });

  it('avisa a quien se suscriba cuando el estado de la voz pasa a ser conocido', () => {
    const speech = installSpeech([]);
    const tts = loadBridge();
    const estados = [];
    tts.onSpanishVoiceChange(v => estados.push(v));

    // Simula que las voces terminan de cargar.
    speech.getVoices = () => VOICES;
    window.speechSynthesis.onvoiceschanged();

    expect(estados).toEqual([true]);
  });

  it('en Android no afirma nada sobre la voz española hasta que el motor enlaza', () => {
    window.AndroidTTS = {
      speak: () => {}, speakWithCallback: () => {}, cancel: () => {},
      isReady: () => false,
      isSpanishAvailable: () => false
    };
    const tts = loadBridge();
    expect(tts.spanishVoiceKnown()).toBeNull();
  });

  it('en Android informa de que no hay voz española cuando el motor ya está listo', () => {
    window.AndroidTTS = {
      speak: () => {}, speakWithCallback: () => {}, cancel: () => {},
      isReady: () => true,
      isSpanishAvailable: () => false
    };
    const tts = loadBridge();
    expect(tts.spanishVoiceKnown()).toBe(false);
  });
});

describe('KinesisTTS · velocidad', () => {
  it('habla más despacio que el ritmo normal por defecto', () => {
    const speech = installSpeech(VOICES);
    const tts = loadBridge();
    tts.speak('Salto básico');
    expect(speech.spoken[0].rate).toBeLessThan(1);
    expect(speech.spoken[0].rate).toBeGreaterThanOrEqual(0.6);
  });

  it('el ajuste de velocidad se guarda y se aplica a la locución', () => {
    const speech = installSpeech(VOICES);
    const tts = loadBridge();
    tts.setRate(0.7);
    tts.speak('Salto básico');
    expect(speech.spoken[0].rate).toBe(0.7);
  });

  it('el ajuste de velocidad sobrevive a la recarga', () => {
    installSpeech(VOICES);
    loadBridge().setRate(0.7);
    expect(loadBridge().getRate()).toBe(0.7);
  });

  it('la velocidad se mantiene dentro del rango útil del motor', () => {
    installSpeech(VOICES);
    const tts = loadBridge();
    expect(tts.setRate(9)).toBeLessThanOrEqual(1.3);
    expect(tts.setRate(0.1)).toBeGreaterThanOrEqual(0.6);
  });

  it('en Android aplica la velocidad global al puente nativo', () => {
    const calls = [];
    window.AndroidTTS = {
      speak: (text, rate) => calls.push({ text, rate }),
      speakWithCallback: () => {},
      cancel: () => {}
    };
    const tts = loadBridge();
    tts.setRate(0.8);
    tts.speak('Salto básico');
    expect(calls[0]).toEqual({ text: 'Salto básico', rate: 0.8 });
  });
});

describe('KinesisTTS · locución encadenada', () => {
  it('speakAndWait resuelve cuando la locución termina', async () => {
    installSpeech(VOICES);
    const tts = loadBridge();
    await expect(tts.speakAndWait('Salto básico')).resolves.toBeUndefined();
  });

  it('speakAndWait no se queda colgada si el motor no avisa del final', async () => {
    installSpeech(VOICES, { autoEnd: false });
    const tts = loadBridge();
    const pending = tts.speakAndWait('Salto básico');
    tts.cancel();
    await expect(pending).resolves.toBeUndefined();
  });
});

describe('velocidad de voz en las herramientas', () => {
  const toolsDir = resolve(ROOT, 'src/herramientas/vanilla/tools');

  it('ninguna herramienta fija la velocidad de la voz a fuego', () => {
    const offenders = [];
    for (const dir of readdirSync(toolsDir)) {
      const file = resolve(toolsDir, dir, `${dir}.js`);
      if (!existsSync(file)) continue;
      const code = readFileSync(file, 'utf8');
      const re = /KinesisTTS\.speak(?:AndWait)?\(\s*[^,)]+,\s*([0-9.]+)/g;
      let m;
      while ((m = re.exec(code)) !== null) {
        if (Number(m[1]) > 1) offenders.push(`${dir}.js: ${m[0]}`);
      }
    }
    expect(offenders, 'la velocidad la gobierna el ajuste global del bridge').toEqual([]);
  });
});
