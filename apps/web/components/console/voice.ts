"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * The person's voice in, the presence's voice out, in the browser. Nothing here reaches a model: a recording is sent to our own
 * door (`/api/moment/turn`), a sentence is played from our own door (`/api/moment/clip`). Both are bounded: 30 seconds of
 * recording, one sentence at a time.
 */
export const MAX_RECORDING_MS = 30_000;
const MIN_RECORDING_MS = 500;
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"] as const;

/** The first recording format this browser has that Orazaka's voice turn takes (WebM or Ogg/Opus), or null. */
export function recordingFormat(): string | null {
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export type TalkState = "idle" | "recording";
export type TalkProblem = "denied" | "short" | "unsupported" | null;

/** Hold to talk: `start` opens the microphone, `stop` (or 30 s) sends what was recorded, `cancel` forgets it. */
export function useHoldToTalk(onRecorded: (audio: Blob) => void) {
  const [state, setState] = useState<TalkState>("idle");
  const [problem, setProblem] = useState<TalkProblem>(null);
  // What the browser can do is read where it runs: false while rendering on the server, so the markup matches at hydration.
  const supported = useSyncExternalStore(
    () => () => undefined,
    () => recordingFormat() !== null,
    () => false,
  );
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wantsStop = useRef(false);
  const keep = useRef(true);
  const latest = useRef(onRecorded);

  useEffect(() => {
    latest.current = onRecorded;
  }, [onRecorded]);

  const release = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
    recorder.current = null;
  }, []);

  const stop = useCallback(() => {
    wantsStop.current = true;
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);
  const cancel = useCallback(() => {
    keep.current = false;
    stop();
  }, [stop]);

  const start = useCallback(async () => {
    if (recorder.current) return;
    const format = recordingFormat();
    if (!format) {
      setProblem("unsupported");
      return;
    }
    setProblem(null);
    wantsStop.current = false;
    keep.current = true;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setProblem("denied");
      return;
    }
    const rec = new MediaRecorder(stream, { mimeType: format });
    recorder.current = rec;
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const took = Date.now() - startedAt.current;
      const audio = new Blob(chunks.current, { type: format });
      release();
      setState("idle");
      if (!keep.current) return;
      if (took < MIN_RECORDING_MS) setProblem("short");
      else latest.current(audio);
    };
    startedAt.current = Date.now();
    rec.start();
    setState("recording");
    timer.current = setTimeout(stop, MAX_RECORDING_MS);
    // The key or finger was released while the microphone was still opening: stop at once.
    if (wantsStop.current) stop();
  }, [release, stop]);

  useEffect(
    () => () => {
      keep.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
    },
    [release],
  );

  return { state, problem, supported, start, stop, cancel };
}

const BARS = 24;

/**
 * The presence's voice: the sentences of an answer played one after the other, from our own door. While it speaks, `peaks` follow
 * the sound (a bar per band of the real signal, ten times a second) so the Waveform and, later, the face move with what is
 * heard; `muted` keeps the captions and the answer and drops only the sound.
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const queue = useRef<string[]>([]);
  const current = useRef<HTMLAudioElement | null>(null);
  const context = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const frame = useRef<ReturnType<typeof setInterval> | null>(null);
  const energy = useRef(0);
  const mutedRef = useRef(false);

  const measure = useCallback(() => {
    const node = analyser.current;
    if (!node) return;
    const data = new Uint8Array(node.frequencyBinCount);
    node.getByteFrequencyData(data);
    const per = Math.max(1, Math.floor(data.length / BARS));
    const bars = Array.from({ length: BARS }, (_, i) => {
      let sum = 0;
      for (let j = 0; j < per; j++) sum += data[i * per + j] ?? 0;
      return sum / per / 255;
    });
    energy.current = bars.reduce((a, b) => a + b, 0) / BARS;
    setPeaks(bars);
  }, []);

  const finish = useCallback(() => {
    if (frame.current) clearInterval(frame.current);
    frame.current = null;
    energy.current = 0;
    current.current = null;
    setSpeaking(false);
    setPeaks([]);
  }, []);

  const advance = useRef<() => void>(() => undefined);
  const next = useCallback(() => {
    const href = queue.current.shift();
    if (!href || mutedRef.current) {
      queue.current = [];
      finish();
      return;
    }
    const audio = new Audio(href);
    current.current = audio;
    try {
      context.current ??= new AudioContext();
      const source = context.current.createMediaElementSource(audio);
      analyser.current = context.current.createAnalyser();
      analyser.current.fftSize = 256;
      source.connect(analyser.current);
      analyser.current.connect(context.current.destination);
    } catch {
      analyser.current = null;
    }
    const again = () => advance.current();
    audio.onended = again;
    audio.onerror = again;
    setSpeaking(true);
    if (!frame.current) frame.current = setInterval(measure, 100);
    void audio.play().catch(again);
  }, [finish, measure]);
  useEffect(() => {
    advance.current = next;
  }, [next]);

  const play = useCallback(
    (hrefs: string[]) => {
      queue.current = [...queue.current, ...hrefs];
      if (!current.current && !mutedRef.current) next();
    },
    [next],
  );
  const silence = useCallback(() => {
    queue.current = [];
    current.current?.pause();
    finish();
  }, [finish]);
  const mute = useCallback(
    (on: boolean) => {
      mutedRef.current = on;
      setMuted(on);
      if (on) silence();
    },
    [silence],
  );

  useEffect(
    () => () => {
      queue.current = [];
      current.current?.pause();
      if (frame.current) clearInterval(frame.current);
      void context.current?.close().catch(() => undefined);
    },
    [],
  );

  return { speaking, peaks, energy, muted, mute, play, silence };
}
