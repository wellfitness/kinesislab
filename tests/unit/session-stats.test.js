import { describe, it, expect, beforeEach } from 'vitest';

describe('SessionStats.users', () => {
  it('arranca sin usuarios y sin activo', () => {
    expect(window.SessionStats.users.list()).toEqual([]);
    expect(window.SessionStats.users.active()).toBeNull();
  });

  it('setActive crea y activa', () => {
    window.SessionStats.users.setActive('Elena');
    expect(window.SessionStats.users.list()).toEqual(['Elena']);
    expect(window.SessionStats.users.active()).toBe('Elena');
  });

  it('no duplica al re-setActive del mismo nombre', () => {
    window.SessionStats.users.setActive('Elena');
    window.SessionStats.users.setActive('Alex');
    window.SessionStats.users.setActive('Elena');
    expect(window.SessionStats.users.list()).toEqual(['Elena', 'Alex']);
    expect(window.SessionStats.users.active()).toBe('Elena');
  });

  it('ignora valores invalidos', () => {
    window.SessionStats.users.setActive('');
    window.SessionStats.users.setActive(null);
    window.SessionStats.users.setActive(undefined);
    window.SessionStats.users.setActive(42);
    window.SessionStats.users.setActive('   ');
    expect(window.SessionStats.users.list()).toEqual([]);
    expect(window.SessionStats.users.active()).toBeNull();
  });

  it('remove borra usuario y promueve el siguiente activo', () => {
    window.SessionStats.users.setActive('Elena');
    window.SessionStats.users.setActive('Alex');
    window.SessionStats.users.remove('Alex');
    expect(window.SessionStats.users.list()).toEqual(['Elena']);
    expect(window.SessionStats.users.active()).toBe('Elena');
  });

  it('remove del activo deja al primer usuario restante como activo', () => {
    window.SessionStats.users.setActive('Elena');
    window.SessionStats.users.setActive('Alex');
    window.SessionStats.users.remove('Elena');
    expect(window.SessionStats.users.active()).toBe('Alex');
  });
});

describe('SessionStats.session', () => {
  beforeEach(() => {
    window.SessionStats.users.setActive('Elena');
  });

  it('start arranca, inProgress devuelve true', () => {
    window.SessionStats.session.start('go-nogo', {});
    expect(window.SessionStats.session.inProgress()).toBe(true);
  });

  it('end con sesion vacia devuelve summary null', () => {
    window.SessionStats.session.start('go-nogo', {});
    const { summary } = window.SessionStats.session.end();
    expect(summary).toBeNull();
    expect(window.SessionStats.session.inProgress()).toBe(false);
  });

  it('end con 10 trials produce summary con totales y accuracy 100%', () => {
    window.SessionStats.session.start('go-nogo', { duration: 60 });
    for (let i = 0; i < 10; i++) {
      window.SessionStats.session.recordTrial({ stimulus: 'go', rt: 400 + i * 10, correct: true });
    }
    const { summary } = window.SessionStats.session.end();
    expect(summary.total).toBe(10);
    expect(summary.accuracy).toBe(1);
    expect(summary.rtMedian).toBeGreaterThanOrEqual(400);
    expect(summary.rtMedian).toBeLessThanOrEqual(500);
    expect(summary.toolId).toBe('go-nogo');
    expect(summary.config.duration).toBe(60);
    expect(summary.segments).toHaveLength(3);
  });

  it('abort descarta sin guardar', () => {
    window.SessionStats.session.start('go-nogo', {});
    window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    window.SessionStats.session.abort();
    expect(window.SessionStats.session.inProgress()).toBe(false);
    expect(window.SessionStats.history.getRecent('go-nogo')).toHaveLength(0);
  });

  it('sesion con menos de 5 trials NO se persiste', () => {
    window.SessionStats.session.start('go-nogo', {});
    for (let i = 0; i < 4; i++) {
      window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    }
    window.SessionStats.session.end();
    expect(window.SessionStats.history.getRecent('go-nogo')).toHaveLength(0);
  });

  it('sesion con 5+ trials SI se persiste', () => {
    window.SessionStats.session.start('go-nogo', {});
    for (let i = 0; i < 5; i++) {
      window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    }
    window.SessionStats.session.end();
    expect(window.SessionStats.history.getRecent('go-nogo')).toHaveLength(1);
  });

  it('clasifica errores por tipo', () => {
    window.SessionStats.session.start('go-nogo', {});
    window.SessionStats.session.recordTrial({ correct: false, errorType: 'commission' });
    window.SessionStats.session.recordTrial({ correct: false, errorType: 'commission' });
    window.SessionStats.session.recordTrial({ correct: false, errorType: 'omission' });
    window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    const { summary } = window.SessionStats.session.end();
    expect(summary.errors.commission).toBe(2);
    expect(summary.errors.omission).toBe(1);
    expect(summary.errors.other).toBe(0);
  });

  it('modo voz (trials sin correct) deja accuracy en null pero total cuenta', () => {
    window.SessionStats.session.start('fluency', {});
    for (let i = 0; i < 6; i++) {
      window.SessionStats.session.recordTrial({ stimulus: 'animal' });
    }
    const { summary } = window.SessionStats.session.end();
    expect(summary.accuracy).toBeNull();
    expect(summary.total).toBe(6);
  });

  it('recordTrial sin sesion en curso no rompe', () => {
    expect(() => {
      window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    }).not.toThrow();
  });
});

describe('SessionStats.history', () => {
  beforeEach(() => {
    window.SessionStats.users.setActive('Elena');
    // 3 sesiones consecutivas con rt crecientes (la primera es la mejor)
    for (let s = 0; s < 3; s++) {
      window.SessionStats.session.start('go-nogo', {});
      for (let i = 0; i < 6; i++) {
        window.SessionStats.session.recordTrial({ correct: true, rt: 300 + s * 50 });
      }
      window.SessionStats.session.end();
    }
  });

  it('getRecent devuelve las sesiones (mas reciente primero)', () => {
    const recent = window.SessionStats.history.getRecent('go-nogo');
    expect(recent).toHaveLength(3);
    expect(recent[0].rtMedian).toBe(400); // s=2 → 300+100
    expect(recent[2].rtMedian).toBe(300); // s=0
  });

  it('getRecent respeta el limite n', () => {
    expect(window.SessionStats.history.getRecent('go-nogo', 2)).toHaveLength(2);
  });

  it('getBest devuelve la sesion mas rapida (rtMedian menor)', () => {
    const best = window.SessionStats.history.getBest('go-nogo', 'rtMedian');
    expect(best.rtMedian).toBe(300);
  });

  it('getAverage promedia rtMedian', () => {
    const avg = window.SessionStats.history.getAverage('go-nogo', 'rtMedian');
    expect(avg).toBe(350); // (300+350+400)/3
  });

  it('sin usuario activo devuelve vacio/null', () => {
    window.SessionStats.users.remove('Elena');
    expect(window.SessionStats.history.getRecent('go-nogo')).toEqual([]);
    expect(window.SessionStats.history.getBest('go-nogo', 'rtMedian')).toBeNull();
    expect(window.SessionStats.history.getAverage('go-nogo', 'rtMedian')).toBeNull();
  });
});

describe('SessionStats.ranking', () => {
  beforeEach(() => {
    window.SessionStats.users.setActive('Elena');
    window.SessionStats.session.start('go-nogo', {});
    for (let i = 0; i < 6; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 350 });
    window.SessionStats.session.end();

    window.SessionStats.users.setActive('Alex');
    window.SessionStats.session.start('go-nogo', {});
    for (let i = 0; i < 6; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 280 });
    window.SessionStats.session.end();
  });

  it('getTop ordena por rtMedian ascendente (menor = mejor)', () => {
    const top = window.SessionStats.ranking.getTop('go-nogo', 'rtMedian', 5);
    expect(top).toHaveLength(2);
    expect(top[0].user).toBe('Alex');
    expect(top[0].value).toBe(280);
    expect(top[1].user).toBe('Elena');
    expect(top[1].value).toBe(350);
  });

  it('respeta el limite n', () => {
    expect(window.SessionStats.ranking.getTop('go-nogo', 'rtMedian', 1)).toHaveLength(1);
  });
});

describe('SessionStats.feedbackPhrase', () => {
  it('devuelve "Sesion completada" si falta data', () => {
    expect(window.SessionStats.feedbackPhrase(null)).toBe('Sesión completada');
    expect(window.SessionStats.feedbackPhrase({})).toBe('Sesión completada');
    expect(window.SessionStats.feedbackPhrase({ segments: [] })).toBe('Sesión completada');
  });

  it('detecta mejora grande en RT + accuracy', () => {
    const summary = {
      segments: [
        { count: 5, accuracy: 0.6, rtMedian: 500 },
        { count: 5, accuracy: 0.7, rtMedian: 450 },
        { count: 5, accuracy: 0.8, rtMedian: 400 }
      ]
    };
    expect(window.SessionStats.feedbackPhrase(summary)).toBe('¡Has mejorado mucho durante la sesión!');
  });

  it('detecta mejora solo en RT', () => {
    const summary = {
      segments: [
        { count: 5, accuracy: 0.8, rtMedian: 500 },
        { count: 5, accuracy: 0.8, rtMedian: 450 },
        { count: 5, accuracy: 0.8, rtMedian: 400 }
      ]
    };
    expect(window.SessionStats.feedbackPhrase(summary)).toBe('Respondes cada vez más rápido');
  });

  it('rendimiento constante cuando no hay deltas significativos', () => {
    const summary = {
      segments: [
        { count: 5, accuracy: 0.8, rtMedian: 400 },
        { count: 5, accuracy: 0.8, rtMedian: 405 },
        { count: 5, accuracy: 0.8, rtMedian: 410 }
      ]
    };
    expect(window.SessionStats.feedbackPhrase(summary)).toBe('Rendimiento constante toda la sesión');
  });
});

describe('SessionStats.backup', () => {
  beforeEach(() => {
    window.SessionStats.users.setActive('Elena');
    window.SessionStats.session.start('go-nogo', {});
    for (let i = 0; i < 6; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    window.SessionStats.session.end();
  });

  it('build devuelve snapshot con version y datos', () => {
    const data = window.SessionStats.backup.build();
    expect(data.kineslabBackup).toBe(true);
    expect(data.version).toBe(1);
    expect(data.users).toContain('Elena');
    expect(data.activeUser).toBe('Elena');
    expect(data.sessions.Elena['go-nogo']).toHaveLength(1);
    expect(typeof data.exportedAt).toBe('string');
  });
});

describe('SessionStats.tools', () => {
  it('activeTools lista las herramientas con sesiones guardadas', () => {
    window.SessionStats.users.setActive('Elena');
    window.SessionStats.session.start('go-nogo', {});
    for (let i = 0; i < 6; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    window.SessionStats.session.end();

    window.SessionStats.session.start('flechas', {});
    for (let i = 0; i < 6; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    window.SessionStats.session.end();

    const activos = window.SessionStats.tools.activeTools();
    expect(activos).toContain('go-nogo');
    expect(activos).toContain('flechas');
  });
});

describe('SessionStats.comparison y mejoras de Fase 1', () => {
  beforeEach(() => {
    window.SessionStats.users.setActive('Elena');
  });

  it('end(extraConfig) persiste propiedades adicionales en localStorage', () => {
    window.SessionStats.session.start('memoria', { pairs: 3 });
    for (let i = 0; i < 3; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 400 });
    const res = window.SessionStats.session.end({ matched: 3, totalPairs: 3, efficiency: '100', minTrials: 3 });
    expect(res.summary.config.matched).toBe(3);
    expect(res.summary.config.efficiency).toBe('100');

    const recent = window.SessionStats.history.getRecent('memoria');
    expect(recent).toHaveLength(1);
    expect(recent[0].config.matched).toBe(3);
    expect(recent[0].config.efficiency).toBe('100');
  });

  it('minTrials permite guardar sesiones con 3 trials', () => {
    window.SessionStats.session.start('boxing', { minTrials: 3 });
    for (let i = 0; i < 3; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 350 });
    const res = window.SessionStats.session.end();
    expect(res.summary).not.toBeNull();
    expect(window.SessionStats.history.getRecent('boxing')).toHaveLength(1);
  });

  it('detecta nuevo record personal cuando se supera la mejor marca previa', () => {
    window.SessionStats.session.start('go-nogo', {});
    for (let i = 0; i < 5; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 400 });
    const first = window.SessionStats.session.end();
    // Primera sesion no tiene record previo que superar
    expect(first.comparison.improvedVsBest).toBeFalsy();

    // Segunda sesion mas rapida (320 ms < 400 ms)
    window.SessionStats.session.start('go-nogo', {});
    for (let i = 0; i < 5; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 320 });
    const second = window.SessionStats.session.end();
    expect(second.comparison.improvedVsBest).toBe(true);
    expect(second.comparison.personalBest.rtMedian).toBe(400);

    // Tercera sesion mas lenta (380 ms > 320 ms)
    window.SessionStats.session.start('go-nogo', {});
    for (let i = 0; i < 5; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 380 });
    const third = window.SessionStats.session.end();
    expect(third.comparison.improvedVsBest).toBe(false);
  });

  it('soporta metricas donde mayor es mejor como accuracy', () => {
    window.SessionStats.session.start('matrix', { primaryMetric: 'accuracy', minTrials: 3 });
    window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    window.SessionStats.session.recordTrial({ correct: false, rt: 300 });
    const s1 = window.SessionStats.session.end();
    expect(s1.comparison.metric).toBe('accuracy');

    // Segunda sesion con mejor precision (100% > 67%)
    window.SessionStats.session.start('matrix', { primaryMetric: 'accuracy', minTrials: 3 });
    for (let i = 0; i < 3; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    const s2 = window.SessionStats.session.end();
    expect(s2.comparison.improvedVsBest).toBe(true);

    const best = window.SessionStats.history.getBest('matrix', 'accuracy');
    expect(best.accuracy).toBe(1);
  });

  it('soporta ies donde menor puntuacion es mejor', () => {
    window.SessionStats.session.start('search', { primaryMetric: 'ies' });
    // rt=500, acc=1 -> ies=500
    for (let i = 0; i < 5; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 500 });
    window.SessionStats.session.end();

    // rt=300, acc=1 -> ies=300 (mejor)
    window.SessionStats.session.start('search', { primaryMetric: 'ies' });
    for (let i = 0; i < 5; i++) window.SessionStats.session.recordTrial({ correct: true, rt: 300 });
    const s2 = window.SessionStats.session.end();
    expect(s2.comparison.improvedVsBest).toBe(true);

    const best = window.SessionStats.history.getBest('search', 'ies');
    expect(best.ies).toBe(300);
  });
});
