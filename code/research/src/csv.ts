export interface CsvRecord {
  recordNumber: number;
  values: Record<string, string>;
}

// Input is normalized UTF-8 CSV, not a vendor spreadsheet export.
export function readCsv(text: string, expectedHeaders: readonly string[]): CsvRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  const input = text.replace(/^\uFEFF/, "");

  function endField(): void {
    row.push(field.trim());
    field = "";
    closedQuote = false;
  }

  function endRow(): void {
    endField();
    if (row.some((value) => value !== "")) rows.push(row);
    row = [];
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += char;
      }
    } else if (char === ",") {
      endField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      endRow();
    } else if (char === '"' && field === "" && !closedQuote) {
      quoted = true;
    } else {
      if (char === '"' || (closedQuote && char?.trim() !== "")) {
        throw new Error(`CSV: karakter setelah/di luar tanda kutip pada posisi ${index}.`);
      }
      field += char;
    }
  }
  if (quoted) throw new Error("CSV: tanda kutip tidak ditutup.");
  if (field !== "" || row.length > 0 || closedQuote) endRow();

  const headers = rows.shift();
  if (!headers || headers.length !== expectedHeaders.length ||
      new Set(headers).size !== headers.length ||
      expectedHeaders.some((header) => !headers.includes(header))) {
    throw new Error(`CSV: header wajib: ${expectedHeaders.join(",")}`);
  }

  return rows.map((cells, index) => {
    const recordNumber = index + 2;
    if (cells.length !== headers.length) {
      throw new Error(`CSV record ${recordNumber}: jumlah kolom tidak sesuai header.`);
    }
    return {
      recordNumber,
      values: Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""])),
    };
  });
}
