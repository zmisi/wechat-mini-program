const INDEX_COLUMN_KEY = "_index";

const COLUMN_LAYOUT = {
  [INDEX_COLUMN_KEY]: { widthRpx: 72, align: "center", wrap: false },
  university_name: { widthRpx: 168, align: "left", wrap: false },
  major_name: { widthRpx: 240, align: "left", wrap: true },
  campus: { widthRpx: 128, align: "left", wrap: false },
  min_score: { widthRpx: 96, align: "left", wrap: false },
  min_rank: { widthRpx: 112, align: "left", wrap: false },
  max_score: { widthRpx: 96, align: "left", wrap: false },
  year: { widthRpx: 80, align: "left", wrap: false },
  subject_group: { widthRpx: 96, align: "left", wrap: false },
  admission_type: { widthRpx: 104, align: "left", wrap: false }
};

const DEFAULT_LAYOUT = { widthRpx: 120, align: "left", wrap: false };
const ROW_HEIGHT_RPX = 72;
const MAX_BODY_HEIGHT_RPX = 560;

function layoutForColumn(key) {
  return COLUMN_LAYOUT[key] || DEFAULT_LAYOUT;
}

function formatCellValue(value) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  return String(value);
}

function buildDisplayColumns(columns) {
  const indexColumn = {
    key: INDEX_COLUMN_KEY,
    label: "序号",
    ...layoutForColumn(INDEX_COLUMN_KEY)
  };
  const dataColumns = (columns || []).map((col) => ({
    key: col.key,
    label: col.label,
    ...layoutForColumn(col.key)
  }));
  return [indexColumn].concat(dataColumns);
}

function buildDisplayRows(displayColumns, rows) {
  return (rows || []).map((row, rowIndex) => ({
    id: rowIndex,
    cells: displayColumns.map((col) => {
      const value = col.key === INDEX_COLUMN_KEY
        ? String(rowIndex + 1)
        : formatCellValue(row[col.key]);
      return {
        value,
        widthRpx: col.widthRpx,
        align: col.align,
        wrap: col.wrap
      };
    })
  }));
}

function tierClassFromTitle(title) {
  if (!title) {
    return "";
  }
  if (title.startsWith("冲")) {
    return "tier-reach";
  }
  if (title.startsWith("稳")) {
    return "tier-steady";
  }
  if (title.startsWith("保")) {
    return "tier-safe";
  }
  return "";
}

function prepareTables(tables) {
  return (tables || []).map((table, tableIndex) => {
    const displayColumns = buildDisplayColumns(table.columns || []);
    const rows = buildDisplayRows(displayColumns, table.rows || []);
    const tableWidthRpx = displayColumns.reduce((sum, col) => sum + col.widthRpx, 0);
    const rowCount = rows.length;
    const bodyScrollHeightRpx = Math.min(Math.max(rowCount * ROW_HEIGHT_RPX, 144), MAX_BODY_HEIGHT_RPX);
    const title = table.title || "";
    return {
      id: `table-${tableIndex}`,
      title,
      tierClass: tierClassFromTitle(title),
      columns: displayColumns,
      rows,
      bodyScrollHeightRpx,
      tableWidthRpx
    };
  });
}

function normalizeMessage(row) {
  const tables = Array.isArray(row.tables) ? row.tables : [];
  return {
    id: row.id,
    role: row.role,
    text: row.text || "",
    tables: prepareTables(tables),
    hasTables: tables.length > 0
  };
}

function normalizeMessages(rows) {
  return (rows || [])
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map(normalizeMessage);
}

module.exports = {
  normalizeMessage,
  normalizeMessages,
  prepareTables
};
