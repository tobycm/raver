interface Demo {
  url: string;
  type: "audio" | "video";
  override?: {
    treble?: number;
    bass?: number;
  };
}

const demos: Demo[] = [
  {
    url: "./demos/N!GHT - Level Up! (Official Music Video ｜ MiSide) [jQLyNVbSaW8].webm",
    type: "video",
    override: {
      treble: 18000,
    },
  },
  {
    url: "./demos/My Time - Bo En - Latchezar Dimitrov.mp3",
    type: "audio",
    override: {
      treble: 5000,
    },
  },
  {
    url: "./demos/Kesha - Your Love Is My Drug LOFI REMIX [gYIGH0b7Q-k].mp3",
    type: "audio",
    override: {
      treble: 5000,
    },
  },
  {
    url: "./demos/Mitsukiyo - Our home.mp3",
    type: "audio",
    override: {
      treble: 5000,
    },
  },
  {
    url: "./demos/Infected Mushroom - Guitarmass - Diversity.mp3",
    type: "audio",
    override: {
      treble: 18000,
    },
  },
];

export default demos;
