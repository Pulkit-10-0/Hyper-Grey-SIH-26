import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const SKILL_DIR = "C:\\Users\\Admin\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.904.11930\\skills\\presentations";
const workspaceDir = "D:\\sih-2026\\Hyper-Grey-SIH-26";
const TMP_DIR = path.join(workspaceDir, "00-submission", "pitch-deck", "slide-01", ".build");
const FINAL_PPTX = path.join(workspaceDir, "00-submission", "pitch-deck", "slide-01", "output", "SeaNergy-slide-01-our-solution-v9.pptx");
const imagePath = path.join(workspaceDir, "08-media", "illustrations", "slide-01-auv-sonar-concept.png");
const RUNTIME_PYTHON = "C:\\Users\\Admin\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href);
await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });

const W = 1920, H = 1080;
const pres = Presentation.create({ slideSize: { width: W, height: H } });
const slide = pres.slides.add();
slide.background.fill = "#FFFFFF";
const FONT = "Arial";
const navy = "#173447", teal = "#087C8C", muted = "#4D6573";

function addText(value, x, y, w, h, size, color, bold = false, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: FONT,
    fontSize: size,
    bold,
    color,
    autoFit: "none",
    wrap: "square",
    verticalAlignment: "top",
    insets: { left: 0, right: 0, top: 0, bottom: 0 },
    ...options,
  };
  return shape;
}

const hero = await fs.readFile(imagePath);
slide.images.add({ blob: hero, contentType: "image/png", alt: "Conceptual AUV sonar illustration", fit: "cover", position: { left: 0, top: 0, width: W, height: 310 } });
addText("SeaNergy", 88, 63, 1100, 105, 76, "#FFFFFF", true);
addText("Every Ping, Purpose-Built.", 93, 164, 1300, 65, 35, "#D6F5F6");
addText("SIH 2026   |   PS 26058   |   TEAM HYPER GREY", 95, 256, 970, 31, 21, "#89D7DB", true);

addText("PROPOSED SOLUTION", 90, 341, 700, 40, 24, teal, true);
addText(
  "SeaNergy is a proposed software-defined sonar payload for AUVs. Live water data will guide a bounded controller as it selects frequency, bandwidth, duration and waveform for each ping. Onboard synthesis and timed transfer will feed a DAC, filter, power stage and transducer, while a separate receiver and local console will show the returned signal and decision trace. The finished system aims to balance range, detail and battery use as conditions change.",
  90, 385, 1740, 137, 30, navy,
);

addText("FOUR PRODUCT STRENGTHS", 90, 548, 820, 43, 27, teal, true);
const features = [
  ["Adaptive waveform library", "Temperature, salinity, turbidity, pH and depth inform LFM, geometric and phase-coded pulse choices for changing missions."],
  ["Bounded decision engine", "Acoustic physics, electrical limits and a per-ping energy budget keep each selected waveform feasible and explainable."],
  ["Autonomous transmitter hardware", "Onboard synthesis, timed DMA transfer, DAC, filtering and driver form the proposed signal path inside the AUV."],
  ["Inspectable TX and RX", "A local console reveals pulse choices and power data; the receiver displays waveforms and spectra for validation."],
];
const featureY = [610, 710, 810, 910];
for (let i = 0; i < features.length; i++) {
  const [heading, body] = features[i];
  const y = featureY[i];
  addText(heading, 90, y, 840, 36, 26, navy, true);
  addText(body, 90, y + 37, 840, 62, 22, muted);
}

addText("WHY THE NEED?", 1000, 548, 840, 43, 27, teal, true);
addText(
  "PS 26058 calls for physical, low-power sonar hardware that adapts in real time. Changing water alters sound speed and signal loss, so one fixed ping cannot balance range, detail and energy everywhere. AUV battery and CPU limits make each transmit decision consequential.",
  1000, 592, 840, 145, 24, navy,
);

addText("FIXED SOUND SPEED CREATES RANGE ERROR", 1000, 733, 840, 40, 26, teal, true);
const table = slide.tables.add({
  rows: 4,
  columns: 3,
  left: 1000,
  top: 775,
  width: 840,
  height: 226,
  columnWidths: [330, 240, 270],
  values: [
    ["WATER CHANGE", "SPEED SHIFT", "ERROR AT 100 m*"],
    ["+1 °C temperature", "+4.5 m/s", "30 cm"],
    ["+1 ppt salinity", "+1.3 m/s", "9 cm"],
    ["+100 m depth", "+1.7 m/s", "11 cm"],
  ],
});
table.styleOptions = { headerRow: true, bandedRows: false };
table.borders.assign({ style: "solid", fill: "#BCD5DC", width: 1 });
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 3; c++) {
    const cell = table.getCell(r, c);
    cell.fill = r === 0 ? "#17485A" : (r % 2 ? "#F1F8F9" : "#FFFFFF");
    cell.text.style = {
      typeface: FONT,
      fontSize: r === 0 ? 18 : (c === 0 ? 20 : 25),
      bold: r === 0 || c > 0,
      color: r === 0 ? "#FFFFFF" : navy,
      alignment: c === 0 ? "left" : "center",
      autoFit: "none",
      wrap: "square",
      insets: { left: 10, right: 8, top: 6, bottom: 5 },
    };
  }
}

addText("*Illustrative 100 m range error with a fixed 1,500 m/s assumption, using NOAA sensitivities. SeaNergy architecture shown as proposed.", 90, 1035, 1750, 30, 18, "#647883");
slide.speakerNotes.textFrame.setText(
  "This slide presents the proposed full SeaNergy product, not a claim of an integrated validated build. Source handoff: 00-submission/pitch-deck/source-briefs/SeaNergy-SIH-2026-slide-authoring-brief.txt. Physical PS 26058 requirements are recorded in 00-submission/compliance-matrix/compliance-matrix.pdf. The current RevB 100 x 100 mm two-layer PCB design contains a nominal 40 kHz bench TX path and separate RX path, but has no parallel sonar DAC and has not been manufactured or water-tested (01-hardware/README.md). The ESP-IDF payload source contains constrained candidate selection, DDS, windows and DMA-capable I80 transfer, but needs the DAC/analog path and instrument trace to validate adaptive physical sonar output (02-firmware/README.md and src/components). LFM, geometric and phase-coded modes here refer to the proposed full product; do not identify them as measured output of the RevB board. The 100-500 kHz synthetic study is a separate product/model configuration (05-models/README.md). The table's approximate sound-speed sensitivities are from NOAA, https://repository.library.noaa.gov/view/noaa/44869/noaa_44869_DS1.pdf. NOAA NCEI describes the echo-ranging relationship: https://www.ngdc.noaa.gov/mgg/fliers/84mgg18.html. The third column uses a true 100 m range and uniform actual speeds 1504.5, 1501.3 or 1501.7 m/s against fixed assumed 1500 m/s: estimated range = 1500 * 100 / actual speed. Rounded absolute errors are 30, 9 and 11 cm. These are illustrative physics estimates, not SeaNergy measurements. The AUV hero image is a generated concept illustration."
);

const candidatePath = path.join(TMP_DIR, "slide-01-candidate.pptx");
await (await PresentationFile.exportPptx(pres)).save(candidatePath);
const preview = await pres.export({ slide, format: "png", scale: 1 });
await fs.writeFile(path.join(TMP_DIR, "slide-01-preview.png"), new Uint8Array(await preview.arrayBuffer()));
const layout = await slide.export({ format: "layout" });
await fs.writeFile(path.join(TMP_DIR, "slide-01-layout.json"), await layout.text());

const result = await finalizePresentation({
  explicitTotalSlideCount: 1,
  requiredNativeTableOwnerSlides: [1],
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "18288000,10287000", "--validate-heading-fit", "--require-native-table-slide", "1"],
  fontPolicy: { basis: "design", families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(TMP_DIR, "slide-01-validation-v9.json"),
});
console.log(JSON.stringify({ final: FINAL_PPTX, result }, null, 2));
