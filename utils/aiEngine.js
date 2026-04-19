const CATEGORY_MAP = {
  tech:      ['bug','code','error','api','deploy','javascript','python','database','server','crash','git','react','node'],
  design:    ['ui','ux','figma','color','layout','font','logo','design','css','responsive','wireframe'],
  career:    ['job','resume','interview','salary','promotion','linkedin','career','hire','portfolio'],
  health:    ['pain','doctor','symptom','medicine','mental','anxiety','stress','sleep','diet','workout'],
  legal:     ['contract','law','legal','rights','court','lawyer','sue','agreement','dispute'],
  finance:   ['money','invest','budget','debt','loan','tax','bank','savings','income','expense'],
  education: ['study','exam','course','learn','university','school','tutor','homework','assignment'],
};
const URGENCY_TRIGGERS = ['urgent','asap','immediately','deadline','critical','emergency','help now','today','right now'];
const detectCategory = (text) => {
  const lower = text.toLowerCase();
  let bestMatch = 'other', bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestMatch = cat; }
  }
  return bestMatch;
};
const extractTags = (text, max = 5) => {
  const stopWords = new Set(['the','is','a','an','and','or','but','in','on','at','to','for','with','this','i','my','we','it','be','have','do']);
  return [...new Set(text.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w)))].slice(0, max);
};
const detectUrgency = (text) => URGENCY_TRIGGERS.some(t => text.toLowerCase().includes(t)) ? 'high' : 'medium';
const improveText = (text) => text.trim().replace(/\s+/g,' ').replace(/(^\w|\.\s+\w)/g, c => c.toUpperCase());
const generateSummary = (title, description) => `Request: "${title}". ${description.split(/[.!?]/)[0].trim()}.`;
module.exports = { detectCategory, extractTags, detectUrgency, improveText, generateSummary };
