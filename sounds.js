'use strict';
/* =========================================================
   SOUND EFFECTS – generated in the browser (Web Audio API).
   No audio files needed. The AudioContext is created on the
   first sound, which happens after a click (browsers require it).
   ========================================================= */
const SFX = (() => {
    let ctx = null, master = null, noiseBuf = null;
    const rnd = (a, b) => a + Math.random() * (b - a);

    function getCtx() {
        try {
            if (!ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return null;
                ctx = new AC();
                master = ctx.createGain();
                master.gain.value = 0.6;
                master.connect(ctx.destination);
            }
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        } catch (e) { return null; }
    }

    function getNoiseBuffer(c) {
        if (!noiseBuf) {
            noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
            const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        return noiseBuf;
    }

    // A single soft tone with a short envelope (optional pitch slide)
    function tone(c, { freq, freq2 = null, type = 'sine', start = 0, dur = 0.2, vol = 0.25 }) {
        const t0 = c.currentTime + start;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t0);
        if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + dur + 0.05);
    }

    // Filtered noise that sweeps in pitch: the "whoosh" of a card or a swing
    function swish(c, f1, f2, dur, vol, start = 0) {
        const t0 = c.currentTime + start;
        const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
        s.buffer = getNoiseBuffer(c);
        f.type = 'bandpass'; f.Q.value = 1.2;
        f.frequency.setValueAtTime(f1, t0);
        f.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        s.connect(f); f.connect(g); g.connect(master);
        s.start(t0, Math.random() * 0.3); s.stop(t0 + dur + 0.05);
    }

    /* ---------- ambient loops (very quiet background) ---------- */
    const loops = {};
    function startLoop(name, build) {
        if (loops[name]) return;
        const c = getCtx();
        if (!c) return;
        try { loops[name] = build(c); } catch (e) { /* ignore audio errors */ }
    }
    function stopLoop(name) {
        const l = loops[name];
        if (!l) return;
        try { l.stop(); } catch (e) { /* already stopped */ }
        delete loops[name];
    }
    function loopNoise(c, type, freq, gainValue) {
        const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
        s.buffer = getNoiseBuffer(c); s.loop = true;
        f.type = type; f.frequency.value = freq;
        g.gain.value = gainValue;
        s.connect(f); f.connect(g); g.connect(master);
        s.start(c.currentTime, Math.random() * 0.5);
        return { s, f, g };
    }

    // steady rain
    function buildRain(c) {
        const { s } = loopNoise(c, 'lowpass', 1200, 0.035);
        return { stop() { s.stop(); } };
    }

    // gentle wind: low rumble that slowly swells and fades
    function buildWind(c) {
        const { s, g } = loopNoise(c, 'lowpass', 450, 0.02);
        const lfo = c.createOscillator(), lfoGain = c.createGain();
        lfo.frequency.value = 0.12;
        lfoGain.gain.value = 0.012;
        lfo.connect(lfoGain); lfoGain.connect(g.gain);
        lfo.start();
        return { stop() { s.stop(); lfo.stop(); } };
    }

    // grass with small critters moving: soft rustle plus tiny random steps
    function buildGrass(c) {
        const { s } = loopNoise(c, 'bandpass', 3000, 0.01);
        let alive = true, timer = null;
        const step = () => {
            if (!alive) return;
            const n = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < n; i++) {
                tone(c, { freq: rnd(260, 520), freq2: rnd(200, 380), dur: 0.07, vol: 0.025, start: i * 0.09 });
            }
            timer = setTimeout(step, rnd(900, 2200));
        };
        step();
        return { stop() { alive = false; clearTimeout(timer); s.stop(); } };
    }

    const SOUNDS = {
        // confirm button: short bright pop
        confirm(c) {
            tone(c, { freq: 660, freq2: 880, dur: 0.12, vol: 0.25 });
        },
        // pass the conversation: two gentle rising notes
        next(c) {
            tone(c, { freq: 523, type: 'triangle', dur: 0.12, vol: 0.22 });
            tone(c, { freq: 659, type: 'triangle', start: 0.08, dur: 0.15, vol: 0.22 });
        },
        // cutting wood: a short wood "tok"
        chop(c) {
            swish(c, 1600, 700, 0.08, 0.5);
            tone(c, { freq: 200, freq2: 110, dur: 0.1, vol: 0.35 });
        },
        // upgrade bought: quick rising arpeggio
        upgrade(c) {
            [523, 659, 784, 1046].forEach((f, i) =>
                tone(c, { freq: f, type: 'triangle', start: i * 0.08, dur: 0.18, vol: 0.25 }));
        },
        // memory: correct pair (brighter whoosh + small chime)
        match(c) {
            swish(c, 900, 2600, 0.18, 0.35);
            tone(c, { freq: 1047, start: 0.1, dur: 0.15, vol: 0.12 });
        },
        // memory: wrong pair (same whoosh, lower and duller)
        miss(c) {
            swish(c, 700, 1400, 0.16, 0.3);
        },
        // an animal is getting hungry: soft "hm-hm"
        hungry(c) {
            tone(c, { freq: 330, freq2: 300, dur: 0.25, vol: 0.18 });
            tone(c, { freq: 330, freq2: 300, start: 0.3, dur: 0.25, vol: 0.18 });
        },
        // water leaking into the boat: a few soft bubbles
        leak(c) {
            tone(c, { freq: 300, freq2: 600, dur: 0.12, vol: 0.18 });
            tone(c, { freq: 340, freq2: 680, start: 0.1, dur: 0.12, vol: 0.16 });
            tone(c, { freq: 280, freq2: 560, start: 0.2, dur: 0.14, vol: 0.14 });
        },
        // an animal died: gentle falling notes (not scary)
        animalDown(c) {
            tone(c, { freq: 440, freq2: 330, type: 'triangle', dur: 0.35, vol: 0.2 });
            tone(c, { freq: 370, freq2: 277, type: 'triangle', start: 0.35, dur: 0.4, vol: 0.18 });
        },
        // make plank: three quick saw strokes
        plank(c) {
            swish(c, 1800, 1800, 0.06, 0.3, 0);
            swish(c, 1800, 1800, 0.06, 0.3, 0.07);
            swish(c, 1800, 1800, 0.06, 0.3, 0.14);
        },
        // bail water: a scoop with a splash and small bubbles
        bail(c) {
            swish(c, 1200, 400, 0.35, 0.4);
            tone(c, { freq: 400, freq2: 700, start: 0.15, dur: 0.1, vol: 0.14 });
            tone(c, { freq: 420, freq2: 760, start: 0.25, dur: 0.1, vol: 0.12 });
        },
        // fish: a light "plop" into the water
        fish(c) {
            tone(c, { freq: 500, freq2: 250, dur: 0.2, vol: 0.3 });
            swish(c, 2000, 800, 0.15, 0.2);
        },
    };

    return {
        play(name) {
            const c = getCtx();
            if (!c || !SOUNDS[name]) return;
            try { SOUNDS[name](c); } catch (e) { /* ignore audio errors */ }
        },
        // ambient loops (start/stop by name)
        rainOn() { startLoop('rain', buildRain); },
        rainOff() { stopLoop('rain'); },
        windOn() { startLoop('wind', buildWind); },
        windOff() { stopLoop('wind'); },
        grassOn() { startLoop('grass', buildGrass); },
        grassOff() { stopLoop('grass'); },
        ambientOff() { Object.keys(loops).forEach(stopLoop); },
    };
})();
