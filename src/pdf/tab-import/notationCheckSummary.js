// Shared evidence summary; each platform owns its result presentation.
export function notationCheckSummary(result){
  if(!result)return null;
  const warnings=[...new Set(result.pages.map(p=>p.notationCheckWarning).filter(Boolean))];
  if(!warnings.length&&!result.pages.some(p=>p.pairedNotation?.length))return null;
  const checks=result.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures.flatMap(m=>m.slots))).map(s=>s.notationCheck).filter(Boolean);
  return {warnings,matches:checks.filter(c=>c.status==='match').length,mismatches:checks.filter(c=>c.status==='mismatch').length};
}
