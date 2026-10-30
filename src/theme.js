"use strict";

const PALETTES = {
  light: { background: "F1F8FC", card: "DDEFF7", text: "073044", muted: "4F6C7B", accent: "006486", roomText: "00587E", line: "B8DEEE" },
  dark: { background: "062D3E", card: "0E4D67", text: "F7FCFF", muted: "ADC9D6", accent: "42CFF5", roomText: "FFFFFF", line: "00AAE7" }
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
