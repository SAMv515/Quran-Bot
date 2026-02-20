const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const config = require("../config.json");

async function getPageWithWhiteBackground(pageNumber) {
  const filePath = path.join(config.quranPagesFolder, `${pageNumber}.png`);
  if (!fs.existsSync(filePath)) return null;

  const img = await loadImage(filePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  return canvas.toBuffer("image/png");
}

module.exports = {
  getPageWithWhiteBackground
};
