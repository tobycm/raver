import * as Px from "pixi.js";

import "./button.css";
import "./style.css";
import { sigmoid } from "./utils";

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
const analyser = new AnalyserNode(audioContext, { fftSize: 2 ** 13 });
const frequencyData = new Uint8Array(analyser.frequencyBinCount);
const eachBinWidth = audioContext.sampleRate / analyser.fftSize;

let treble = 15000;
let bass = 0;

let clampedFrequencyDataLength = Math.floor((treble - bass) / eachBinWidth);

function updateClampedFrequencyDataLength() {
  clampedFrequencyDataLength = Math.floor((treble - bass) / eachBinWidth);
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

let audioSource: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | undefined;

const videoElement = document.getElementById("videoPlayer") as HTMLVideoElement;
videoElement.crossOrigin = "anonymous";
videoElement.loop = true;

const audioElement = document.getElementById("audioPlayer") as HTMLAudioElement;
audioElement.crossOrigin = "anonymous";
audioElement.loop = true;

const fileInput = document.getElementById("fileInput") as HTMLInputElement;
fileInput.addEventListener("change", (event) => {
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

    audioSource = audioContext.createMediaElementSource(audioElement);
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

    light.clear();

    light.circle(0, 0, 10).fill(`hsl(${hue}, 100%, 50%)`);

    light.tint = intensity * 0xffffff;
    light.scale.set(sigmoid(intensity, 5, 0.5) * 10);
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

    bar.clear();

    bar
      .rect(i * barWidth, window.innerHeight - intensity * window.innerHeight, barWidth, intensity * window.innerHeight)
      .fill(`hsl(${hue}, 100%, 50%)`);

    bar.tint = intensity * 0xffffff;
  });
}
