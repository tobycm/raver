import * as Px from "pixi.js";

import "./button.css";
import "./style.css";
import { sigmoid } from "./utils";

// @ts-ignore
import { read } from "jsmediatags/dist/jsmediatags.min";
// @ts-ignore
import type { read as TRead } from "@types/jsmediatags";
import { TagType } from "jsmediatags/types";
import demos from "./demos";

alert("Epilepsy warning: This project contains flashing lights.");

const demosList = document.getElementById("demosList") as HTMLUListElement;

function handleDemoOnClick(event: MouseEvent) {
  event.preventDefault();

  const target = event.target as HTMLAnchorElement;

  const url = new URL(target.href);

  loadFile(url.pathname, target.dataset.mediatype as "video" | "audio");

  if (target.dataset.override) {
    const override = JSON.parse(target.dataset.override) as { treble?: number; bass?: number };

    console.log(override);
    console.log(treble, bass);

    if (override.treble) {
      treble = override.treble;
      trebleInput.value = treble.toString();
      trebleValue.textContent = treble.toString();
    }

    if (override.bass) {
      bass = override.bass;
      bassInput.value = bass.toString();
      bassValue.textContent = bass.toString();
    }

    updateClampedFrequencyDataLength();
  }

  return false;
}

demos.forEach((demo) => {
  const listItem = document.createElement("li");

  const anchor = document.createElement("a");
  anchor.href = demo.url;
  anchor.textContent = demo.url.split("/").pop()!;
  anchor.dataset.mediatype = demo.type;
  if (demo.override) {
    anchor.dataset.override = JSON.stringify(demo.override);
  }
  anchor.onclick = handleDemoOnClick;

  listItem.appendChild(anchor);
  demosList.appendChild(listItem);
});

async function getTags(file: string | File) {
  return new Promise<TagType>((resolve, reject) => {
    (read as typeof TRead)(file, {
      onSuccess: (tag) => resolve(tag),
      onError: (error) => reject(error),
    });
  });
}

// Create a PixiJS Application
const app = new Px.Application();
await app.init({
  width: window.innerWidth, // Full width of the window
  height: window.innerHeight, // Full height of the window
  backgroundColor: 0x0, // Light blue background
  resolution: window.devicePixelRatio || 1, // Adjust for retina displays
  resizeTo: window, // Resize the renderer to fill the window
});
document.body.appendChild(app.canvas);

const audioContext = new AudioContext();
const analyser = new AnalyserNode(audioContext, { fftSize: 2 ** 14 });
const frequencyData = new Uint8Array(analyser.frequencyBinCount);
const eachBinWidth = audioContext.sampleRate / analyser.fftSize;

let treble = 20000;
let bass = 0;

let clampedFrequencyDataLength = Math.floor((treble - bass) / eachBinWidth) + 1;

function updateClampedFrequencyDataLength() {
  clampedFrequencyDataLength = Math.floor((treble - bass) / eachBinWidth) + 1;
  console.log(clampedFrequencyDataLength);
}

updateClampedFrequencyDataLength();

const trebleInput = document.getElementById("treble") as HTMLInputElement;
const trebleValue = document.getElementById("trebleValue") as HTMLSpanElement;
trebleInput.value = treble.toString();

trebleInput.addEventListener("input", (event) => {
  treble = parseInt((event.target as HTMLInputElement).value);
  updateClampedFrequencyDataLength();

  trebleValue.textContent = treble.toString();
});

const bassInput = document.getElementById("bass") as HTMLInputElement;
const bassValue = document.getElementById("bassValue") as HTMLSpanElement;
bassInput.value = bass.toString();

bassInput.addEventListener("input", (event) => {
  bass = parseInt((event.target as HTMLInputElement).value);
  updateClampedFrequencyDataLength();

  bassValue.textContent = bass.toString();
});

const smoothingInput = document.getElementById("smoothing") as HTMLInputElement;
const smoothingValue = document.getElementById("smoothingValue") as HTMLSpanElement;
smoothingInput.value = (analyser.smoothingTimeConstant * 100).toString();

smoothingInput.addEventListener("input", (event) => {
  analyser.smoothingTimeConstant = parseInt((event.target as HTMLInputElement).value) / 100;

  smoothingValue.textContent = analyser.smoothingTimeConstant.toString();
});

let audioSource: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | undefined;

const videoElement = document.getElementById("videoPlayer") as HTMLVideoElement;
videoElement.crossOrigin = "anonymous";
videoElement.loop = true;

const albumArt = document.getElementById("albumArt") as HTMLImageElement;

const audioElement = document.getElementById("audioPlayer") as HTMLAudioElement;
audioElement.crossOrigin = "anonymous";
audioElement.loop = true;

const fileInput = document.getElementById("fileInput") as HTMLInputElement;
fileInput.addEventListener("change", async (event) => {
  // audio or video file
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  await loadFile(file);
});

async function loadFile(url: string | File, type?: "video" | "audio") {
  audioContext.resume();

  if (audioSource) audioSource.disconnect();

  const realType = url instanceof File ? (url.type.startsWith("video/") ? "video" : url.type.startsWith("audio/") ? "audio" : undefined) : type;

  if (!realType) return;

  if (realType === "video") {
    videoElement.src = url instanceof File ? URL.createObjectURL(url) : url;
    audioElement.hidden = true;
    videoElement.hidden = false;

    audioSource = audioContext.createMediaElementSource(videoElement);
  }
  if (realType === "audio") {
    audioElement.src = url instanceof File ? URL.createObjectURL(url) : url;
    videoElement.hidden = true;
    audioElement.hidden = false;
    albumArt.hidden = true;

    audioSource = audioContext.createMediaElementSource(audioElement);

    if (url instanceof File) {
      const { tags } = await getTags(url);

      if (tags.picture) {
        const { data } = tags.picture;
        const bytes = new Uint8Array(data);
        const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
        const base64String = btoa(binary);

        albumArt.src = `data:${tags.picture.format};base64,${base64String}`;
        albumArt.hidden = false;
      }
    }
  }

  audioSource!.connect(analyser);
  analyser.connect(audioContext.destination);

  if (realType === "audio") {
    audioElement.play();
  }
  if (realType === "video") {
    videoElement.play();
  }
}

const fromMicButton = document.getElementById("fromMic") as HTMLButtonElement;
fromMicButton.addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: false,
    },
  });

  audioContext.resume();

  if (audioSource) audioSource.disconnect();

  audioSource = audioContext.createMediaStreamSource(stream);
  audioSource.connect(analyser);
  analyser.connect(audioContext.destination);

  audioElement.hidden = true;
  videoElement.hidden = true;
  albumArt.hidden = true;
});

const behindStage = new Px.Container({});

app.stage.addChild(behindStage);

app.ticker.add(() => {
  analyser.getByteFrequencyData(frequencyData);

  const data = frequencyData.slice(bass / eachBinWidth, treble / eachBinWidth);

  animateLights(data);
  animateBars(data);
  renderBass(frequencyData);
  detectBeat(frequencyData);
  renderBeat();
});

const gradient = new Px.FillGradient(0, 0, window.innerWidth, window.innerHeight);

gradient.addColorStop(0, 0xff0000);
gradient.addColorStop(0.4, 0x000000);
gradient.addColorStop(0.7, 0x000000);
gradient.addColorStop(1, 0xff0000);

const bassVisualizer = new Px.Graphics().rect(0, 0, window.innerWidth, window.innerHeight).fill(gradient);

bassVisualizer.tint = 0x000000;

behindStage.addChild(bassVisualizer);

function renderBass(data: Uint8Array) {
  const bassData = data.slice(0, Math.floor(200 / eachBinWidth));

  const bassIntensity = bassData.reduce((acc, curr) => acc + curr, 0) / 255 / bassData.length;

  bassVisualizer.tint = sigmoid(bassIntensity, 10, 0.5) * 0xffffff;
}

app.renderer.on("resize", () => {
  bassVisualizer.clear().rect(0, 0, window.innerWidth, window.innerHeight).fill(gradient);
});

const lightsCount = 30;

const lights: Px.Graphics[] = [];

for (let i = 0; i < lightsCount; i++) {
  const light = new Px.Graphics({
    x: Math.random() * window.innerWidth,
    y: Math.random() * (window.innerHeight - 400),
  });

  light.circle(0, 0, 10).fill(0xffffff);

  app.stage.addChild(light);
  lights.push(light);
}

function animateLights(data: Uint8Array) {
  lights.forEach((light, i) => {
    const frequencyIndex = Math.floor((i / lights.length) * clampedFrequencyDataLength);

    const intensity = data[frequencyIndex] / 255;

    const hue = Math.floor((i / lights.length) * 360);

    light.clear().circle(0, 0, 10).fill(`hsl(${hue}, 100%, 50%)`);

    // light.tint = intensity * 0xffffff;
    light.scale.set(sigmoid(intensity, 5, 0.5) * 10);
    light.alpha = intensity;
  });
}

const barsCount = 200;
let barWidth = window.innerWidth / barsCount;

const bars: Px.Graphics[] = [];

for (let i = 0; i < barsCount; i++) {
  const hue = Math.floor((i / barsCount) * 360);

  const bar = new Px.Graphics().rect(i * barWidth, window.innerHeight - 200, barWidth, 200).fill(`hsl(${hue}, 100%, 50%)`);

  app.stage.addChild(bar);
  bars.push(bar);
}

function animateBars(data: Uint8Array) {
  bars.forEach((bar, i) => {
    const frequencyIndex = Math.floor((i / bars.length) * clampedFrequencyDataLength);

    const intensity = data[frequencyIndex] / 255;

    const hue = Math.floor((i / bars.length) * 360);

    bar
      .clear()
      .rect(i * barWidth, window.innerHeight - intensity * window.innerHeight, barWidth, intensity * window.innerHeight)
      .fill(`hsl(${hue}, 100%, 50%)`);

    bar.tint = intensity * 0xffffff;
  });
}

const HISTORY_SIZE = 5; // The number of recent amplitude values to consider
const amplitudeHistory: number[] = [];

function detectBeats(data: Uint8Array): boolean {
  // Calculate the average amplitude
  const sum = data.reduce((acc, value) => acc + value, 0);
  const average = sum / data.length;

  // Update the amplitude history
  amplitudeHistory.push(average);
  if (amplitudeHistory.length > HISTORY_SIZE) {
    amplitudeHistory.shift(); // Remove the oldest amplitude value
  }

  // Calculate the moving average and standard deviation
  const historyAverage = amplitudeHistory.reduce((a, b) => a + b, 0) / amplitudeHistory.length;
  const variance = amplitudeHistory.reduce((a, b) => a + Math.pow(b - historyAverage, 2), 0) / amplitudeHistory.length;
  const standardDeviation = Math.sqrt(variance);

  // Set a dynamic threshold based on the moving average and standard deviation
  const dynamicThreshold = historyAverage + standardDeviation * 1.7;

  return average > dynamicThreshold;
}

const theBeats: Px.Graphics[] = [];

let lastBeat = 0;

function detectBeat(data: Uint8Array) {
  if (!detectBeats(data)) return;

  const now = Date.now();
  if (now - lastBeat < 100) return;

  lastBeat = now;

  const beat = new Px.Graphics({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  })
    .circle(0, 0, 10)
    .fill(0x00aeff);

  beat.scale.set(7);

  const innerCircle = new Px.Graphics({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  })
    .circle(0, 0, 10)
    .fill(0);

  innerCircle.scale.set(4);

  beat.setMask(innerCircle);

  behindStage.addChild(beat);

  theBeats.push(beat);
}

function renderBeat() {
  const removeIndices: number[] = [];

  theBeats.forEach((beat, index) => {
    beat.scale.set(beat.scale.x * 1.1);

    beat.alpha -= 0.03;

    if (beat.alpha < 0) {
      behindStage.removeChild(beat);

      removeIndices.push(index);
    }
  });

  removeIndices.reverse().forEach((index) => theBeats.splice(index, 1));
}
