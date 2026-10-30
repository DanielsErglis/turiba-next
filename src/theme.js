"use strict";

const PALETTES = {
  light: { background: "F2F8FB", card: "FFFFFF", text: "092C3D", muted: "4C6877", accent: "00587E", line: "D9E9F0" },
  dark: { background: "081923", card: "102C3B", text: "F3FAFD", muted: "A4BCC8", accent: "00AAE7", line: "244453" }
};

function themeColors(mode, Color) {
  const result = {};
  for (const key of Object.keys(PALETTES.light)) {
    result[key] = mode === "light" || mode === "dark" ? new Color(PALETTES[mode][key]) :
      Color.dynamic(new Color(PALETTES.light[key]), new Color(PALETTES.dark[key]));
  }
  return result;
}

module.exports = { PALETTES, themeColors };
