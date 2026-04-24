/**
 * Exportação CSV genérica (compatível com Excel).
 * Escreve BOM UTF-8 para manter acentos, e separador `;` (padrão BR).
 */
export interface CsvExportColumn<T = any> {
  key: string
  label: string
  accessor?: (row: T) => string | number | null | undefined
}

function escapeCell(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  // Se contém separador, quebra de linha ou aspas, envolve em aspas duplas
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function getValue<T>(row: T, col: CsvExportColumn<T>): unknown {
  if (col.accessor) return col.accessor(row)
  return (row as any)?.[col.key]
}

export function useCsvExport() {
  function exportToCsv<T>(
    data: T[],
    columns: CsvExportColumn<T>[],
    fileName = 'export',
  ) {
    const header = columns.map(c => escapeCell(c.label)).join(';')
    const lines = data.map(row =>
      columns.map(col => escapeCell(getValue(row, col))).join(';'),
    )
    const csv = [header, ...lines].join('\r\n')

    // BOM UTF-8 para Excel abrir com acentos corretamente
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return { exportToCsv }
}
