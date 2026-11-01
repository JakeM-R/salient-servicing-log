// Writes data.json: the same Federal Register queries the page runs live, as a same-origin fallback.
import { writeFileSync } from "node:fs";
const API = "https://www.federalregister.gov/api/v1/documents.json";
const FIELDS = ["title","type","abstract","document_number","html_url","publication_date","effective_on","comments_close_on","agencies"];
const AG = { CFPB: "consumer-financial-protection-bureau", FTC: "federal-trade-commission", FCC: "federal-communications-commission" };
const FTC_QUERIES = ['"motor vehicle"', '"Holder Rule"', '"debt collection"', '"Fair Credit Reporting"'];
const FCC_QUERIES = ['"Telephone Consumer Protection"', "robocall", '"prerecorded voice"', '"artificial intelligence" calls'];
const since = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
function url(params) {
  const q = ["per_page=100", "order=newest", ...FIELDS.map(f => "fields[]=" + f)];
  for (const [k, v] of Object.entries(params)) for (const x of [].concat(v)) q.push(encodeURIComponent(k) + "=" + encodeURIComponent(x));
  return API + "?" + q.join("&");
}
const types = ["RULE", "PRORULE", "NOTICE"];
const base = { "conditions[type][]": types, "conditions[publication_date][gte]": since };
const reqs = [
  { ag: "CFPB", u: url({ ...base, "conditions[agencies][]": AG.CFPB }) },
  ...FTC_QUERIES.map(t => ({ ag: "FTC", u: url({ ...base, "conditions[agencies][]": AG.FTC, "conditions[term]": t }) })),
  ...FCC_QUERIES.map(t => ({ ag: "FCC", u: url({ ...base, "conditions[agencies][]": AG.FCC, "conditions[term]": t }) })),
];
const seen = new Set(), results = [];
for (const r of reqs) {
  const res = await fetch(r.u);
  if (!res.ok) throw new Error(r.ag + " HTTP " + res.status);
  const d = await res.json();
  for (const x of d.results || []) if (!seen.has(x.document_number)) { seen.add(x.document_number); results.push({ ...x, _ag: r.ag }); }
}
writeFileSync("data.json", JSON.stringify({ generated: new Date().toISOString(), results }));
console.log("wrote", results.length, "documents");
