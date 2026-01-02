let snd;

// FX chain
let lpf, dist, drive, comp, rev;

// FFT taps
let fftIn, fftOut;

// Amplitude meters (debug)
let ampIn, ampOut;

// Recorder
let recorder, recordedFile;
let isRecording = false;
let canSaveAudio = false;

// UI sliders
let cutoffSlider, distSlider, threshSlider, ratioSlider, reverbSlider, masterSlider;

// UI buttons
let playBtn, stopBtn, recBtn, recStopBtn, saveWavBtn;

// Preset UI
let presetNameInput, presetSelect, presetSaveBtn, presetUpdateBtn, presetDeleteBtn;

const PRESET_KEY = "ex1_presets_v1";

function preload() {
  snd = loadSound("demo.wav");
}

function setup() {
  createCanvas(900, 520);
  textSize(14);

  // --- FX nodes ---
  lpf = new p5.LowPass();
  dist = new p5.Distortion(0.0);
  drive = new p5.Gain();
  comp = new p5.Compressor();
  rev = new p5.Reverb();

  // --- Route: snd -> LPF -> Dist -> Drive -> Comp -> Reverb -> soundOut ---
  snd.disconnect();
  snd.connect(lpf);
  lpf.connect(dist);
  dist.connect(drive);
  drive.connect(comp);

  // reverb attaches to comp and outputs to main output bus
  comp.disconnect();
  rev.process(comp, 2.5, 2.0);

  // Defaults
  lpf.freq(20000);
  drive.amp(2.5);
  rev.drywet(0.0);
  comp.attack(0.003);
  comp.release(0.25);
  outputVolume(0.8);

  // --- FFT taps ---
  fftIn = new p5.FFT(0.9, 1024);
  fftOut = new p5.FFT(0.9, 1024);
  fftIn.setInput(snd);   // pre-effects
  fftOut.setInput();     // post-effects (soundOut)

  // --- Amplitude meters ---
  ampIn = new p5.Amplitude();
  ampOut = new p5.Amplitude();
  ampIn.setInput(snd);
  ampOut.setInput();     // soundOut

  // --- Recorder ---
  recorder = new p5.SoundRecorder();
  recorder.setInput();   // record soundOut
  recordedFile = new p5.SoundFile();

  // --- Transport buttons ---
  playBtn = createButton("Play");
  playBtn.position(20, 20);
  playBtn.mousePressed(() => {
    userStartAudio();
    if (!snd.isPlaying()) snd.play();
  });

  stopBtn = createButton("Stop");
  stopBtn.position(80, 20);
  stopBtn.mousePressed(() => snd.stop());

  recBtn = createButton("● Record");
  recBtn.position(150, 20);
  recBtn.mousePressed(() => {
    userStartAudio();
    if (isRecording) return;

    recordedFile = new p5.SoundFile();
    canSaveAudio = false;
    recorder.record(recordedFile);
    isRecording = true;
  });

  recStopBtn = createButton("■ Stop");
  recStopBtn.position(230, 20);
  recStopBtn.mousePressed(() => {
    if (!isRecording) return;
    recorder.stop();
    isRecording = false;
    setTimeout(() => (canSaveAudio = true), 200);
  });

  saveWavBtn = createButton("Save WAV");
  saveWavBtn.position(290, 20);
  saveWavBtn.mousePressed(() => {
    if (!canSaveAudio) return;
    saveSound(recordedFile, "processed.wav");
  });

  // --- Sliders (created here, positioned in draw) ---
  cutoffSlider = createSlider(80, 20000, 20000, 1);
  cutoffSlider.style("width", "260px");

  distSlider = createSlider(0, 1, 0, 0.01);
  distSlider.style("width", "260px");

  threshSlider = createSlider(-80, 0, -24, 1);
  threshSlider.style("width", "260px");

  ratioSlider = createSlider(1, 20, 6, 0.5);
  ratioSlider.style("width", "260px");

  reverbSlider = createSlider(0, 1, 0.0, 0.01);
  reverbSlider.style("width", "260px");

  masterSlider = createSlider(0, 1, 0.8, 0.01);
  masterSlider.style("width", "260px");

  // --- Preset UI (Sound Library) ---
  presetNameInput = createInput("");
  presetNameInput.attribute("placeholder", "Preset name");
  presetNameInput.position(650, 60);
  presetNameInput.size(220);

  presetSaveBtn = createButton("Save new");
  presetSaveBtn.position(650, 90);
  presetSaveBtn.mousePressed(saveNewPreset);

  presetSelect = createSelect();
  presetSelect.position(650, 130);
  presetSelect.size(220);
  presetSelect.changed(loadSelectedPreset);

  presetUpdateBtn = createButton("Update selected");
  presetUpdateBtn.position(650, 160);
  presetUpdateBtn.mousePressed(updateSelectedPreset);

  presetDeleteBtn = createButton("Delete selected");
  presetDeleteBtn.position(650, 190);
  presetDeleteBtn.mousePressed(deleteSelectedPreset);

  refreshPresetDropdown();
}

function draw() {
  background(245);

  // Read controls
  const cutoff = cutoffSlider.value();
  const distAmt = distSlider.value();
  const thresh = threshSlider.value();
  const ratio = ratioSlider.value();
  const revMix = reverbSlider.value();
  const vol = masterSlider.value();

  // Apply FX
  lpf.freq(cutoff);

  const eps = 0.001;
  if (distAmt <= eps) {
    dist.drywet(0);
    dist.set(0, "2x");
  } else {
    dist.drywet(1);
    dist.set(distAmt, "2x");
  }

  comp.threshold(thresh);
  comp.ratio(ratio);
  rev.drywet(revMix);
  outputVolume(vol);

  // ---- Labels + slider positions ----
  const labelX = 20;
  const sliderX = 260;
  const sliderYOffset = -12;

  const rowCutoffY = 70;
  const rowDistY = 95;
  const rowThreshY = 120;
  const rowRatioY = 145;
  const rowRevY = 170;
  const rowVolY = 195;

  fill(20);
  noStroke();
  text(isRecording ? "RECORDING..." : (canSaveAudio ? "Ready to save WAV" : "Not recording"), 20, 55);

  text(`LPF cutoff: ${cutoff} Hz`, labelX, rowCutoffY);
  text(`Distortion: ${distAmt.toFixed(2)}`, labelX, rowDistY);
  text(`Comp threshold: ${thresh} dB`, labelX, rowThreshY);
  text(`Comp ratio: ${ratio.toFixed(1)}:1`, labelX, rowRatioY);
  text(`Reverb mix: ${revMix.toFixed(2)}`, labelX, rowRevY);
  text(`Master volume: ${vol.toFixed(2)}`, labelX, rowVolY);

  cutoffSlider.position(sliderX, rowCutoffY + sliderYOffset);
  distSlider.position(sliderX, rowDistY + sliderYOffset);
  threshSlider.position(sliderX, rowThreshY + sliderYOffset);
  ratioSlider.position(sliderX, rowRatioY + sliderYOffset);
  reverbSlider.position(sliderX, rowRevY + sliderYOffset);
  masterSlider.position(sliderX, rowVolY + sliderYOffset);

  // ---- Spectra ----
  text("Spectrum IN (pre-effects)", 20, 245);
  drawSpectrum(fftIn.analyze(), 20, 255, 560, 70);

  text("Spectrum OUT (post-effects)", 20, 340);
  drawSpectrum(fftOut.analyze(), 20, 350, 560, 70);

  // ---- Amp meters ----
  const aIn = ampIn.getLevel();
  const aOut = ampOut.getLevel();
  fill(20);
  text(`Amp IN:  ${aIn.toFixed(3)}`, 20, 445);
  text(`Amp OUT: ${aOut.toFixed(3)}`, 20, 465);
  drawAmpBar(120, 435, 200, 12, aIn * 4);
  drawAmpBar(120, 457, 200, 12, aOut * 4);

  // ---- Preset panel labels (drawn on canvas) ----
  fill(20);
  text("Sound Library (Presets)", 650, 40);
  text("Type a name and Save new.", 650, 235);
  text("Select a preset to load.", 650, 255);
  text("Update overwrites selected.", 650, 275);
}

// -------------------- Presets --------------------

function getPresetObjectFromSliders() {
  return {
    cutoff: cutoffSlider.value(),
    dist: distSlider.value(),
    thresh: threshSlider.value(),
    ratio: ratioSlider.value(),
    reverb: reverbSlider.value(),
    master: masterSlider.value(),
    savedAt: new Date().toISOString()
  };
}

function applyPresetToSliders(p) {
  cutoffSlider.value(p.cutoff);
  distSlider.value(p.dist);
  threshSlider.value(p.thresh);
  ratioSlider.value(p.ratio);
  reverbSlider.value(p.reverb);
  masterSlider.value(p.master);
}

function loadPresets() {
  const raw = localStorage.getItem(PRESET_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function savePresets(arr) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(arr));
}

function refreshPresetDropdown() {
  const presets = loadPresets();

  presetSelect.elt.innerHTML = ""; // clear options
  presetSelect.option("-- select preset --", "");

  for (const p of presets) {
    presetSelect.option(p.name, p.id);
  }
}

function saveNewPreset() {
  const name = presetNameInput.value().trim();
  if (!name) return;

  const presets = loadPresets();
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  presets.push({
    id,
    name,
    settings: getPresetObjectFromSliders()
  });

  savePresets(presets);
  presetNameInput.value("");
  refreshPresetDropdown();
  presetSelect.value(id);
}

function loadSelectedPreset() {
  const id = presetSelect.value();
  if (!id) return;

  const presets = loadPresets();
  const p = presets.find(x => x.id === id);
  if (!p) return;

  applyPresetToSliders(p.settings);
}

function updateSelectedPreset() {
  const id = presetSelect.value();
  if (!id) return;

  const presets = loadPresets();
  const idx = presets.findIndex(x => x.id === id);
  if (idx < 0) return;

  presets[idx].settings = getPresetObjectFromSliders();
  savePresets(presets);
  refreshPresetDropdown();
  presetSelect.value(id);
}

function deleteSelectedPreset() {
  const id = presetSelect.value();
  if (!id) return;

  let presets = loadPresets();
  presets = presets.filter(x => x.id !== id);
  savePresets(presets);

  refreshPresetDropdown();
  presetSelect.value("");
}

// -------------------- Drawing helpers --------------------

function drawSpectrum(arr, x, y, w, h) {
  push();
  translate(x, y);

  stroke(0);
  noFill();
  rect(0, 0, w, h);

  noStroke();
  fill(0);

  const n = arr.length;
  for (let i = 0; i < n; i += 8) {
    const mag = arr[i] / 255;
    const bx = map(i, 0, n, 0, w);
    const bh = mag * h;
    rect(bx, h - bh, 2, bh);
  }

  pop();
}

function drawAmpBar(x, y, w, h, v) {
  const vv = constrain(v, 0, 1);
  stroke(0);
  noFill();
  rect(x, y, w, h);
  noStroke();
  fill(0);
  rect(x, y, w * vv, h);
}
