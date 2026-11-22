export function downloadCsv(filename, rows) {
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}

// Valeurs brutes : les abréviations K/M sont réservées aux graphiques.
export function reportCsvRows(report, label, currency) {
  const unit = ['revenue', 'avg'].includes(report.metric) ? currency : report.metric === 'winrate' ? '%' : 'commandes';
  return [['Groupe', label, 'Unité', 'Part (%)'], ...report.rows.map(r => [
    report.group === 'month' ? r.key : r.label, report.metric === 'winrate' ? r.value * 100 : r.value,
    unit, r.share == null ? '' : r.share * 100,
  ])];
}
