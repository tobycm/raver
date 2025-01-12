import * as Px from "pixi.js";

import "./button.css";
import "./style.css";
import { sigmoid } from "./utils";

// @ts-ignore
import { read } from "jsmediatags/dist/jsmediatags.min";
// @ts-ignore
import type { read as TRead } from "@types/jsmediatags";
import { TagType } from "jsmediatags/types";

async function getTags(file: File) {
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

  if (audioSource) audioSource.disconnect();

  if (file.type.startsWith("video/")) {
    videoElement.src = URL.createObjectURL(file);
    audioElement.hidden = true;
    videoElement.hidden = false;

    audioSource = audioContext.createMediaElementSource(videoElement);
  }
  if (file.type.startsWith("audio/")) {
    audioElement.src = URL.createObjectURL(file);
    videoElement.hidden = true;
    audioElement.hidden = false;
    albumArt.hidden = true;

    audioSource = audioContext.createMediaElementSource(audioElement);

    const { tags } = await getTags(file);

    console.log(tags);

    if (tags.picture) {
      const { data } = tags.picture;
      const bytes = new Uint8Array(data);
      const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
      const base64String = btoa(binary);

      albumArt.src = `data:${tags.picture.format};base64,${base64String}`;
      albumArt.hidden = false;
    }
  }

  audioSource!.connect(analyser);
  analyser.connect(audioContext.destination);

  if (file.type.startsWith("audio/")) {
    audioElement.play();
  }
  if (file.type.startsWith("video/")) {
    videoElement.play();
  }
});

const fromMicButton = document.getElementById("fromMic") as HTMLButtonElement;
fromMicButton.addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: false,
    },
  });

  if (audioSource) audioSource.disconnect();

  audioSource = audioContext.createMediaStreamSource(stream);
  audioSource.connect(analyser);
  analyser.connect(audioContext.destination);
});

app.ticker.add(() => {
  analyser.getByteFrequencyData(frequencyData);

  const data = frequencyData.slice(bass / eachBinWidth, treble / eachBinWidth);

  animateLights(data);
  animateBars(data);
  renderBass(frequencyData);
});

const gradient = new Px.FillGradient(0, 0, window.innerWidth, window.innerHeight);

gradient.addColorStop(0, 0xff0000);
gradient.addColorStop(0.4, 0x000000);
gradient.addColorStop(0.7, 0x000000);
gradient.addColorStop(1, 0xff0000);

const bassVisualizer = new Px.Graphics().rect(0, 0, window.innerWidth, window.innerHeight).fill(gradient);

bassVisualizer.tint = 0x000000;

app.stage.addChild(bassVisualizer);

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
