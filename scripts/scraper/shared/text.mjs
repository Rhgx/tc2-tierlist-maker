export function cleanText(value) {
  return String(value || "")
    .replace(/\[[^\]]*edit[^\]]*\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function textWithBreaks(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll("script, style, .mw-editsection, sup").forEach((node) => node.remove());
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return clone.textContent.split("\n").map(cleanText).filter(Boolean);
}

export function cellText(element) {
  if (!element) return "";
  const clone = element.cloneNode(true);
  clone.querySelectorAll("script, style, .mw-editsection, sup, img").forEach((node) => node.remove());
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return clone.textContent.split("\n").map(cleanText).filter(Boolean).join(" | ");
}

export function normalizeName(value) {
  return cleanText(value).replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export function getHeadingText(element) {
  return cleanText(element.querySelector(".mw-headline")?.textContent || element.textContent);
}

export function tableToGrid(table) {
  const grid = [];
  const spans = [];
  const rows = [...table.querySelectorAll("tr")];

  rows.forEach((row, rowIndex) => {
    const gridRow = [];
    let colIndex = 0;

    while (spans[colIndex]) {
      gridRow[colIndex] = spans[colIndex].cell;
      spans[colIndex].remaining -= 1;
      if (spans[colIndex].remaining <= 0) spans[colIndex] = null;
      colIndex += 1;
    }

    [...row.children].forEach((cell) => {
      while (spans[colIndex]) {
        gridRow[colIndex] = spans[colIndex].cell;
        spans[colIndex].remaining -= 1;
        if (spans[colIndex].remaining <= 0) spans[colIndex] = null;
        colIndex += 1;
      }

      const colspan = Number(cell.getAttribute("colspan") || 1);
      const rowspan = Number(cell.getAttribute("rowspan") || 1);
      for (let i = 0; i < colspan; i += 1) {
        gridRow[colIndex + i] = cell;
        if (rowspan > 1) spans[colIndex + i] = { cell, remaining: rowspan - 1 };
      }
      colIndex += colspan;
    });

    while (spans[colIndex]) {
      gridRow[colIndex] = spans[colIndex].cell;
      spans[colIndex].remaining -= 1;
      if (spans[colIndex].remaining <= 0) spans[colIndex] = null;
      colIndex += 1;
    }

    grid[rowIndex] = gridRow;
  });

  return grid;
}
