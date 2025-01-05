import * as Px from "pixi.js";

import { hsl } from "color-convert";

import "./style.css";

// Create a PixiJS Application
const app = new Px.Application();
await app.init({
  width: window.innerWidth, // Full width of the window
  height: window.innerHeight, // Full height of the window
  backgroundColor: 0x1e1e1e, // Light blue background
  resolution: window.devicePixelRatio || 1, // Adjust for retina displays
});
document.body.appendChild(app.canvas);

const audioContext = new AudioContext();
const analyser = new AnalyserNode(audioContext, { fftSize: 512 });
const frequencyData = new Uint8Array(analyser.frequencyBinCount);

let audioSource: MediaElementAudioSourceNode | undefined;

const audioInput = document.getElementById("audio") as HTMLInputElement;
audioInput.addEventListener("change", (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const audio = new Audio(URL.createObjectURL(file));
  audio.crossOrigin = "anonymous";
  audio.loop = true;
  audio.play();

  if (audioSource) audioSource.disconnect();

  audioSource = audioContext.createMediaElementSource(audio);
  audioSource.connect(analyser);
  analyser.connect(audioContext.destination);
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

  const micSource = audioContext.createMediaStreamSource(stream);
  micSource.connect(analyser);
  analyser.connect(audioContext.destination);
});

// const scene = new Px.Container();
// app.stage.addChild(scene);

const lights: Px.Graphics[] = [];

for (let i = 0; i < 64; i++) {
  const light = new Px.Graphics({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
  });

  light.circle(0, 0, 10).fill(0xffffff);

  app.stage.addChild(light);
  lights.push(light);
}

function animateLights() {
  analyser.getByteFrequencyData(frequencyData);

  lights.forEach((light, i) => {
    const frequencyIndex = i % frequencyData.length;
    const frequency = (48000 / frequencyData.length) * frequencyIndex;
    const intensity = frequencyData[frequencyIndex] / 255;

    const hue = (i / frequencyData.length) * 360;
    const color = hsl.rgb([hue, 100, 50]);

    light.clear();

    light.circle(0, 0, 10).fill(color);

    light.tint = intensity * 0xffffff;
    light.scale.set(intensity * 2);
  });
}

app.ticker.add(animateLights);
