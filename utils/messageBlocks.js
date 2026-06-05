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

const MAJOR_DISPLAY_KEYS = [
  "major_name",
  "campus",
  "min_score",
  "min_rank",
  "max_score",
  "year",
  "subject_group",
  "admission_type"
];

function layoutForColumn(key) {
  return COLUMN_LAYOUT[key] || DEFAULT_LAYOUT;
}

function formatCellValue(value) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  return String(value);
}

function parseScore(value) {
  const text = formatCellValue(value);
  if (text === "-") {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
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

function majorColumnsFromTable(columns) {
  const filtered = (columns || []).filter((col) => col.key !== "university_name");
  return buildDisplayColumns(filtered);
}

function prepareGroupMajorTable(columns, majors) {
  const displayColumns = majorColumnsFromTable(columns);
  const normalizedMajors = (majors || []).map((major) => {
    const row = {};
    MAJOR_DISPLAY_KEYS.forEach((keyName) => {
      row[keyName] = major[keyName];
    });
    return row;
  });
  const rows = buildDisplayRows(displayColumns, normalizedMajors);
  const tableWidthRpx = displayColumns.reduce((sum, col) => sum + col.widthRpx, 0);
  const bodyScrollHeightRpx = Math.min(
    Math.max(rows.length * ROW_HEIGHT_RPX, 144),
    MAX_BODY_HEIGHT_RPX
  );
  return {
    columns: displayColumns,
    rows,
    tableWidthRpx,
    bodyScrollHeightRpx
  };
}

function groupRowsClientSide(rows) {
  const buckets = new Map();
  (rows || []).forEach((row) => {
    const universityName = formatCellValue(row.university_name);
    const universityCode = formatCellValue(row.university_code);
    const key = `${universityName}\u0000${universityCode}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        universityCode,
        universityName,
        majors: []
      });
    }
    const major = {};
    MAJOR_DISPLAY_KEYS.forEach((keyName) => {
      major[keyName] = row[keyName];
    });
    buckets.get(key).majors.push(major);
  });

  return Array.from(buckets.values())
    .map((bucket) => {
      const majors = bucket.majors
        .slice()
        .sort((left, right) => parseScore(right.min_score) - parseScore(left.min_score));
      const minScore = majors.reduce((lowest, major) => {
        const score = parseScore(major.min_score);
        if (score === Number.NEGATIVE_INFINITY) {
          return lowest;
        }
        if (lowest === "-" || score < parseScore(lowest)) {
          return formatCellValue(major.min_score);
        }
        return lowest;
      }, "-");
      return {
        universityCode: bucket.universityCode,
        universityName: bucket.universityName,
        majorCount: majors.length,
        minScore,
        majors
      };
    })
    .sort((left, right) => parseScore(right.minScore) - parseScore(left.minScore));
}

function prepareSchoolGroups(table, tableIndex) {
  const apiGroups = Array.isArray(table.groups) && table.groups.length > 0
    ? table.groups
    : groupRowsClientSide(table.rows || []);
  return apiGroups.map((group, groupIndex) => {
    const rawMajors = group.majors || [];
    const majorCount = group.majorCount || rawMajors.length;
    const minScore = formatCellValue(group.minScore || group.min_score);
    const universityName = formatCellValue(group.universityName || group.university_name);
    const majorTable = prepareGroupMajorTable(table.columns || [], rawMajors);
    return {
      id: `table-${tableIndex}-group-${groupIndex}`,
      universityCode: formatCellValue(group.universityCode || group.university_code),
      universityName,
      majorCount,
      minScore,
      summary: minScore === "-"
        ? `${majorCount}个专业`
        : `${majorCount}个专业 · ${minScore}起`,
      expanded: false,
      ...majorTable
    };
  });
}

function prepareTables(tables) {
  return (tables || []).map((table, tableIndex) => {
    const title = table.title || "";
    const groups = prepareSchoolGroups(table, tableIndex);
    const useGroups = groups.length > 0;
    const displayColumns = buildDisplayColumns(table.columns || []);
    const rows = buildDisplayRows(displayColumns, table.rows || []);
    const tableWidthRpx = displayColumns.reduce((sum, col) => sum + col.widthRpx, 0);
    const rowCount = rows.length;
    const bodyScrollHeightRpx = Math.min(Math.max(rowCount * ROW_HEIGHT_RPX, 144), MAX_BODY_HEIGHT_RPX);
    return {
      id: `table-${tableIndex}`,
      title,
      tierClass: tierClassFromTitle(title),
      useGroups,
      groups,
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
  prepareTables,
  groupRowsClientSide
};
