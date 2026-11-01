// DraftSim prototype. Sample data only; ponytail: logistic survival + need bonus stand in for the real engine.
const DATA = `Jahmyr Gibbs|RB|DET|1
Christian McCaffrey|RB|SF|2
Ja'Marr Chase|WR|CIN|3
Breece Hall|RB|NYJ|4
Jonathan Taylor|RB|IND|5
Malik Nabers|WR|NYG|6
Brian Thomas Jr.|WR|JAX|7
Nico Collins|WR|HOU|8
Derrick Henry|RB|BAL|9
Ashton Jeanty|RB|LV|10
Josh Allen|QB|BUF|11
Lamar Jackson|QB|BAL|12
De'Von Achane|RB|MIA|13
Josh Jacobs|RB|GB|14
Garrett Wilson|WR|NYJ|15
A.J. Brown|WR|PHI|16
Tyreek Hill|WR|MIA|17
Trey McBride|TE|ARI|18
Brock Bowers|TE|LV|19
Jaxon Smith-Njigba|WR|SEA|20
Kyren Williams|RB|LAR|21
Drake London|WR|ATL|22
Jalen Hurts|QB|PHI|23
Saquon Barkley|RB|PHI|24
CeeDee Lamb|WR|DAL|25
Justin Jefferson|WR|MIN|26
Bijan Robinson|RB|ATL|27.4
Puka Nacua|WR|LAR|29.5
Bucky Irving|RB|TB|33
James Cook|RB|BUF|36
Jayden Daniels|QB|WAS|38
Amon-Ra St. Brown|WR|DET|40
George Kittle|TE|SF|42
Terry McLaurin|WR|WAS|44
Ladd McConkey|WR|LAC|46
Alvin Kamara|RB|NO|47
Kenneth Walker|RB|SEA|48
DJ Moore|WR|CHI|50
Patrick Mahomes|QB|KC|52
Tee Higgins|WR|CIN|54
Joe Burrow|QB|CIN|55
Zay Flowers|WR|BAL|57
Chuba Hubbard|RB|CAR|58
Rome Odunze|WR|CHI|60
Sam LaPorta|TE|DET|62
Travis Etienne|RB|JAX|64
Davante Adams|WR|LAR|68
Rashee Rice|WR|KC|72
Isiah Pacheco|RB|KC|74
Courtland Sutton|WR|DEN|82
Rhamondre Stevenson|RB|NE|78
Jordan Addison|WR|MIN|88
Hockenson|TE|MIN|80
Dak Prescott|QB|DAL|85
Mark Andrews|TE|BAL|90
Baker Mayfield|QB|TB|92
Chris Godwin|WR|TB|94
Tucker Kraft|TE|GB|96
Jakobi Meyers|WR|LV|98
Jaylen Warren|RB|PIT|99
Aaron Jones|RB|MIN|100
Kyler Murray|QB|ARI|101
Tyler Warren|TE|IND|103
Calvin Ridley|WR|TEN|104
Dalton Kincaid|TE|BUF|105
Zach Charbonnet|RB|SEA|106
Caleb Williams|QB|CHI|107
Javonte Williams|RB|DAL|108
Tyjae Spears|RB|TEN|110
Brock Purdy|QB|SF|111
Evan Engram|TE|DEN|112
Jared Goff|QB|DET|115`.split('\n').map((l, i) => { const [n, pos, t, adp] = l.split('|'); return { id: i, n: n === 'Hockenson' ? 'T.J. Hockenson' : n, pos, t, adp: +adp }; });
const POSN = { QB: 'quarterback', RB: 'running back', WR: 'wide receiver', TE: 'tight end' };
const REQ = { QB: 1, RB: 2, WR: 2, TE: 1 };
const GLOSS = [['ADP', 'Average draft position: where players usually get picked. A lower number means picked earlier.'], ['Snake draft', 'The pick order reverses every round, so whoever picks last in one round picks first in the next.'], ['PPR', 'Points per reception: every catch scores a point, so pass-catchers are worth more.'], ['Flex', 'One extra starting spot that any running back, wide receiver or tight end can fill.'], ['Still here at my pick', 'Our estimate of the chance a player has not been taken by the time it is your turn again.']];
const ICON = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', grid: '<rect x="3" y="3" width="18" height="18"/><path d="M3 9h18M9 3v18"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.4-1 .9-1 1.700M12 17v.1"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.650 1.650 0 0 0 .33 1.820l.06.06a2 2 0 1 1-2.830 2.830l-.06-.06a1.650 1.650 0 0 0-1.820-.33 1.650 1.650 0 0 0-1 1.510V21a2 2 0 1 1-4 0v-.09A1.650 1.650 0 0 0 9 19.400a1.650 1.650 0 0 0-1.820.33l-.06.06a2 2 0 1 1-2.830-2.830l.06-.06A1.650 1.650 0 0 0 4.680 15a1.650 1.650 0 0 0-1.510-1H3a2 2 0 1 1 0-4h.09A1.650 1.650 0 0 0 4.600 9a1.650 1.650 0 0 0-.33-1.820l-.06-.06a2 2 0 1 1 2.830-2.830l.06.06A1.650 1.650 0 0 0 9 4.680a1.650 1.650 0 0 0 1-1.510V3a2 2 0 1 1 4 0v.09a1.650 1.650 0 0 0 1 1.510 1.650 1.650 0 0 0 1.820-.33l.06-.06a2 2 0 1 1 2.830 2.830l-.06.06A1.650 1.650 0 0 0 19.400 9a1.650 1.650 0 0 0 1.510 1H21a2 2 0 1 1 0 4h-.09a1.650 1.650 0 0 0-1.510 1z"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', check: '<path d="M4 12l5 5L20 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', fwd: '<path d="M5 5l7 7-7 7M13 5l7 7-7 7"/>', x: '<path d="M5 5l14 14M19 5L5 19"/>'
};
const ic = (k, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">${ICON[k]}</svg>`;
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const S = { teams: 12, slot: 3, rounds: 6, picks: [], mode: 'beginner', exp: null, app: null, mock: false, held: new Set(), prev: {}, prevTop: [], msg: '', sleeper: false, copied: false, su: { step: 1 } };
const teamOf = (o, T = S.teams) => { const r = Math.ceil(o / T), i = (o - 1) % T; return r % 2 ? i + 1 : T - i; };
const total = () => S.teams * S.rounds, cur = () => S.picks.length + 1, done = () => cur() > total();
const nextMine = from => { for (let o = from; o <= total(); o++) if (teamOf(o) === S.slot) return o; return null; };
const taken = () => new Set(S.picks.map(p => p.id)), byId = id => DATA[id];
const mine = () => S.picks.filter(p => p.team === S.slot).map(p => byId(p.id));
function resetDemo() { S.teams = 12; S.slot = 3; S.rounds = 6; S.mock = false; S.held.clear(); S.prev = {}; S.prevTop = []; S.msg = ''; S.picks = Array.from({ length: 26 }, (_, i) => ({ o: i + 1, team: teamOf(i + 1), id: i })); }
resetDemo();

const sigmoid = x => 1 / (1 + Math.exp(-x));
const target = () => (teamOf(cur()) === S.slot ? nextMine(cur() + 1) : nextMine(cur()));
const survive = (p, t) => t == null ? null : Math.min(.99, Math.max(.01, sigmoid((p.adp - t) / 8)));
const pctTxt = s => s == null ? '--' : String(Math.round(s * 100)).padStart(2, '0') + '%';
function openCount(pos, list = mine()) { return Math.max(0, REQ[pos] - list.filter(p => p.pos === pos).length); }
function flexOpen(list = mine()) { return ['RB', 'WR', 'TE'].reduce((a, k) => a + Math.max(0, list.filter(p => p.pos === k).length - REQ[k]), 0) < 1; }
function score(p, list = mine()) { const o = openCount(p.pos, list); return -p.adp + (o ? 8 * o : (p.pos !== 'QB' && p.pos !== 'TE' && flexOpen(list)) ? 0 : -12); }
function ranked(list = mine()) { const t = taken(); return DATA.filter(p => !t.has(p.id)).sort((a, b) => score(b, list) - score(a, list)); }
function recs() { // top pick, then one risky (may not last) and one safe (likely still here) alternate at other positions
  const r = ranked(), top = r[0], t = target(), rest = r.filter(p => p.pos !== top.pos), sv = p => survive(p, t) ?? 1;
  const risky = rest.find(p => sv(p) < .35) || rest[0];
  const safe = rest.find(p => p.pos !== risky.pos && sv(p) >= .5) || rest.find(p => p !== risky);
  return [top, risky, safe].filter(Boolean);
}
function why(p, i) {
  const o = openCount(p.pos), have = mine().filter(q => q.pos === p.pos).length;
  if (i === 0) return o ? `Best ${POSN[p.pos]} left. ${have ? `You still need ${o} more.` : `You have no ${p.pos} yet.`}` : 'Best player left by our ranking.';
  return o ? `Fills your open ${p.pos} spot.` : 'Good value if you want depth.';
}
function logPick(id, team) { const o = cur(); S.picks.push({ o, team: team ?? teamOf(o), id }); S.msg = `Logged #${o} ${byId(id).n} for Team ${team ?? teamOf(o)}.`; }
function bot() { logPick(DATA.filter(p => !taken().has(p.id)).sort((a, b) => a.adp - b.adp)[0].id); S.msg = ''; }
function untilMine() { while (!done() && teamOf(cur()) !== S.slot) bot(); S.msg = 'Other teams picked. You are on the clock.'; }
function finishDemo() { while (!done()) { if (teamOf(cur()) === S.slot) logPick(ranked()[0].id); else bot(); } S.msg = ''; }

/* ---------- views ---------- */
const hdr = () => `<header class="top"><a class="brand" href="#/" aria-label="DraftSim home"><img src="assets/mark-light.svg" alt=""><span>DraftSim</span></a>
 <div class="seg" role="group" aria-label="Mode"><button data-a="setmode" data-v="beginner" aria-pressed="${S.mode !== 'pro'}">Beginner</button><button data-a="setmode" data-v="pro" aria-pressed="${S.mode === 'pro'}">Pro</button></div>
 <a class="ibtn" href="#/settings" aria-label="Settings">${ic('gear')}</a></header>`;
const tabs = r => `<nav class="tabs" aria-label="Main">${[['draft', 'Draft', 'clock'], ['board', 'Board', 'grid'], ['team', 'My Team', 'user']].map(([k, l, i]) => `<a href="#/${k}" ${r === k ? 'aria-current="page"' : ''}>${ic(i)}${l}</a>`).join('')}<button data-a="help">${ic('help')}Help</button></nav>`;
const tote = (p, t, sm = '', id = p.id) => { const s = survive(p, t), v = pctTxt(s), ch = S.prev[id] != null && S.prev[id] !== v; S.prev[id] = v; return `<div class="tote ${sm} ${ch ? 'tick' : ''}" role="img" aria-label="${s == null ? 'No later pick' : Math.round(s * 100) + ' percent chance still here at pick ' + t}"><b>${v}</b><small>${t ? 'here at #' + t : 'last pick'}</small></div>`; };

function tableHtml(t) {
  const rows = ranked().slice(0, 12);
  const h = `<h2 class="sec"><span>Best available</span></h2><table class="tbl"><thead><tr><th>#</th><th>Player</th><th>Pos</th><th class="num">ADP</th><th class="num">Here${t ? ' at #' + t : ''}</th></tr></thead><tbody>${rows.map((p, i) => `<tr class="${S.held.has(p.id) ? 'hatch-ink' : ''}"><td>${i + 1}</td><td class="nm"><button data-a="open" data-id="${p.id}">${esc(p.n)}</button></td><td>${p.pos} ${p.t}</td><td class="num">${p.adp}</td><td class="num"><span class="pct ${S.prev[p.id] !== pctTxt(survive(p, t)) ? 'tick' : ''}">${pctTxt(survive(p, t))}</span></td></tr>`).join('')}</tbody></table>`;
  rows.forEach(p => S.prev[p.id] = pctTxt(survive(p, t)));
  return h;
}
function draftView() {
  const o = cur(), onClock = teamOf(o) === S.slot, t = target(), R = recs(), top = R[0], m = mine();
  const need = ['QB', 'RB', 'WR', 'TE'].filter(k => openCount(k)).map(k => k + (openCount(k) > 1 ? ` x${openCount(k)}` : '')).join(', ') || 'nothing, you are set';
  const slots = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'], used = [], fill = slots.map(s => { const idx = m.findIndex((p, i) => !used.includes(i) && (s === 'FLEX' ? ['RB', 'WR', 'TE'].includes(p.pos) : p.pos === s)); if (idx >= 0) used.push(idx); return idx >= 0 ? m[idx] : null; });
  const nowTop = R.map(p => p.id);
  nowTop.filter((id, i) => S.prevTop.length && S.prevTop[i] !== id && !S.prevTop.slice(0, i).includes(id)).forEach(id => S.held.add(id)); S.prevTop = nowTop;
  const held = id => S.held.has(id) ? '<span class="tag">Moved up</span>' : '';
  const last3 = S.picks.slice(-3).reverse(), s0 = p => survive(p, t);
  const ctl = onClock
    ? `<button class="tbtn" data-a="log">${ic('plus', 18)}I picked someone else</button><button class="tbtn" data-a="undo" ${S.picks.length ? '' : 'disabled'}>${ic('undo', 18)}Undo</button>`
    : `<button class="tbtn" data-a="log" ${done() ? 'disabled' : ''}>${ic('plus', 18)}Log Team ${teamOf(o)}'s pick</button><button class="tbtn" data-a="undo" ${S.picks.length ? '' : 'disabled'}>${ic('undo', 18)}Undo</button><button class="tbtn" data-a="ff" ${done() ? 'disabled' : ''}>${ic('fwd', 18)}To my pick</button>`;
  const alt = (p, i) => { const s = s0(p), risky = s != null && s < .35, safe = s != null && s >= .5; return `<button class="line ${risky ? 'hatch-ink' : ''}" data-a="open" data-id="${p.id}"><div class="row"><div class="grow"><span class="pn">${esc(p.n)} <span class="meta" style="display:inline">${p.pos} · ${p.t}</span></span><p>${held(p.id)}${risky ? `<span class="tag">Unlikely at #${t}</span>` : safe ? '<span class="tag">Safe to wait</span>' : ''}${why(p, i + 1)}</p></div>${tote(p, t, 'sm')}</div></button>`; };
  const pick = done() ? `<div class="pad"><h1>Draft complete</h1><p class="lead">Every pick is in.</p><a class="btn" style="margin-top:16px" href="#/team">See my team</a></div>` : `<div class="pick"><div class="row"><div class="grow"><button class="plain pn" data-a="open" data-id="${top.id}">${esc(top.n)}</button><span class="meta">${held(top.id)}${top.pos} · ${top.t}</span></div>${tote(top, t)}</div>
  <p class="why">${why(top, 0)}</p>
  <button class="btn" data-a="take" data-id="${top.id}" ${onClock ? '' : 'disabled'}>${onClock ? 'Take this player' : `Waiting for your turn (${nextMine(o) - o} picks away)`}</button>
  <p class="hint">${onClock ? "Then tap 'I took him' in your app." : 'Log the other teams’ picks and this updates.'}</p></div>
 <h2 class="sec"><span>Also consider</span></h2>${R.slice(1).map((p, i) => alt(p, i)).join('')}`;
  return `${hdr()}<main class="panes">
 <div class="status"><div class="clock"><span>Round ${Math.ceil(o / S.teams)} · Pick ${o}</span>${done() ? '' : onClock ? "<i>You're on the clock</i>" : `<i class="wait">Team ${teamOf(o)} is picking</i>`}${S.mock ? '<i class="wait">Practice</i>' : ''}</div>
 <div class="sub"><span>${S.teams}-team snake · PPR</span><span>${S.app === 'sleeper' && S.sleeper ? 'Synced · Sleeper · 3s ago' : 'Manual entry'}</span></div>
 <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:8px">${ctl}</div><p class="msg" role="status">${esc(S.msg)}</p></div>
 <div class="pane-pick">${pick}</div>
 <div class="pane-table">${done() ? '' : tableHtml(t)}</div>
 <div class="pane-roster"><h2 class="sec"><span>My roster</span><span>Hatched = still open</span></h2>
 <div class="ros">${slots.map((s, i) => `<div class="${fill[i] ? 'have' : 'need hatch-ink'}">${s}<span>${fill[i] ? esc(fill[i].n.split(' ').pop()) : 'open'}</span></div>`).join('')}</div><p class="needs">You still need: <b>${need}</b></p></div>
 <div class="pane-taken"><h2 class="sec"><span>Just taken</span></h2><div class="rec">${last3.map(p => `<div><em>#${p.o}</em><span class="nm">${esc(byId(p.id).n)}</span><span>${byId(p.id).pos}</span><span class="tag gone">Gone</span></div>`).join('')}</div>
 <p class="smp">Sample data, not real rankings.</p></div></main>${tabs('draft')}`;
}

function boardView() {
  const T = S.teams, pk = new Map(S.picks.map(p => [p.o, p])), c = cur();
  const head = `<tr><th scope="col"><span class="sr" style="position:absolute;left:-9999px">Round</span></th>${Array.from({ length: T }, (_, i) => `<th scope="col" class="${i + 1 === S.slot ? 'me' : ''}">${i + 1 === S.slot ? 'YOU' : 'T' + (i + 1)}</th>`).join('')}</tr>`;
  const rows = Array.from({ length: S.rounds }, (_, r) => `<tr><th scope="row">R${r + 1}</th>${Array.from({ length: T }, (_, t) => { const o = r * T + ((r + 1) % 2 ? t + 1 : T - t), p = pk.get(o), pl = p && byId(p.id); const lab = `${r + 1}.${String(o - r * T).padStart(2, '0')}`; return `<td class="cell ${pl ? pl.pos : ''} ${(r + 1) % 2 ? '' : ''} ${p && p.team === S.slot ? 'mine' : (!p && teamOf(o) === S.slot ? 'mine' : '')} ${o === c ? 'cur' : ''}" ${o === c ? 'aria-current="step"' : ''}>${pl ? `<b>${esc(pl.n.replace(/ Jr\.$/, '').split(' ').pop())}</b><small>${pl.pos} · ${lab}</small>` : `<small>${lab}</small>`}</td>`; }).join('')}</tr>`).join('');
  return `${hdr()}<main><div class="pad" style="padding-bottom:0"><h1>Draft board</h1><p class="lead">${S.picks.length} of ${total()} picks made. Your slots are outlined.</p></div>
 <div class="bwrap" tabindex="0" role="region" aria-label="Draft board, scrollable"><table class="board" style="--r:${S.rounds};min-width:${44 + T * 80}px"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
 <div class="legend"><span><i class="cell RB"></i>RB</span><span><i class="cell WR"></i>WR</span><span><i class="cell TE"></i>TE</span><span><i class="cell QB"></i>QB</span><span><i style="outline:3px solid var(--teal);outline-offset:-3px;background:#fff"></i>Your slot</span></div>
 <p class="smp">Sample data. Snake order: the direction flips each round.</p></main>${tabs('board')}`;
}

function teamView() {
  const m = mine(), slots = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'], used = [];
  const fill = slots.map(s => { const idx = m.findIndex((p, i) => !used.includes(i) && (s === 'FLEX' ? ['RB', 'WR', 'TE'].includes(p.pos) : p.pos === s)); if (idx >= 0) used.push(idx); return idx >= 0 ? m[idx] : null; });
  const bench = m.filter((p, i) => !used.includes(i)), pickNo = p => S.picks.find(x => x.id === p.id).o;
  const val = m.reduce((a, p) => a + (pickNo(p) - p.adp), 0), grade = !done() ? 'TBD' : val >= 20 ? 'A' : val >= 8 ? 'B+' : val >= 0 ? 'B' : 'C+';
  const miss = slots.filter((s, i) => !fill[i]), best = [...m].sort((a, b) => (pickNo(b) - b.adp) - (pickNo(a) - a.adp))[0];
  const line = (s, p) => `<div class="slot ${p ? '' : 'hatch-ink'}"><b>${s}</b><span class="grow">${p ? esc(p.n) + `<small>${p.pos} · ${p.t}</small>` : 'Open'}</span><em>${p ? '#' + pickNo(p) : ''}</em></div>`;
  return `${hdr()}<main><div class="pad" style="padding-bottom:12px"><h1>My team</h1><p class="lead">${done() ? 'Your draft is complete.' : `Draft in progress: ${S.picks.length} of ${total()} picks made.`}</p></div>
 <div class="grade"><div class="tote" role="img" aria-label="Grade ${grade}"><b>${grade}</b><small>Draft grade</small></div><p style="flex:1;font-size:15px">${done() ? 'Based on how much value you took compared to where players usually go.' : 'Finish the draft to get your grade.'}</p></div>
 <div class="slots" style="margin-top:16px">${slots.map((s, i) => line(s, fill[i])).join('')}${bench.map(p => line('BN', p)).join('')}</div>
 ${m.length ? `<ul class="list" style="margin-top:16px"><li><b>Strength:</b> ${best ? `${esc(best.n)} at #${pickNo(best)} ${pickNo(best) - best.adp > 0 ? 'was good value' : 'was right on target'} (players like him usually go around #${best.adp}).` : 'Nothing yet.'}</li><li><b>Watch out:</b> ${miss.length ? `Open starting spots: ${miss.join(', ')}. Fill them from the best available.` : 'Every starting spot is filled.'}</li></ul>` : ''}
 <div class="foot" style="margin:20px 16px 0">${done() ? `<button class="btn alt" data-a="copy">${S.copied ? 'Link copied' : 'Copy link'}</button>` : `<button class="btn" data-a="finish">Finish draft (demo)</button>`}</div><p class="smp">Sample data.</p></main>${tabs('team')}`;
}

const homeView = () => `${hdr()}<main class="pad"><h1>Draft the best team, without the guesswork.</h1><p class="lead">Works next to any fantasy app. Tell us your league and we show who to pick, and why.</p>
 <a class="btn" style="margin-top:20px" href="#/setup/2" data-a="start">Set up my draft</a>
 <p class="hint">NFL for now. Premier League, NBA and MLS are coming.</p>
 <a class="resume" href="#/draft"><div style="flex:1"><b class="f" style="font-size:20px;text-transform:uppercase">Resume your draft</b><div class="meta" style="font-family:Public Sans;font-weight:400;letter-spacing:0">NFL · ${S.teams} teams · Round ${Math.ceil(cur() / S.teams)}, pick ${cur()}</div></div>${ic('fwd')}</a>
 <a class="resume" style="margin-top:0;border-top:1px solid var(--rule)" href="#/setup/2" data-a="mock"><div style="flex:1"><b class="f" style="font-size:20px;text-transform:uppercase">Practice a mock draft</b><div class="meta" style="font-family:Public Sans;font-weight:400;letter-spacing:0">Rehearse against bots, no pressure.</div></div>${ic('fwd')}</a>
 <p class="smp" style="margin-inline:0">Sample data for this prototype.</p></main>`;

const opt = (k, v, t, sub = '') => `<button class="opt" data-a="set" data-k="${k}" data-v="${v}" aria-pressed="${S[k] === v}"><span><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="tick">${ic('check')}</span></button>`;
function setupView(step) {
  const stepper = (k, min, max) => `<div class="step"><button data-a="step" data-k="${k}" data-d="-1" aria-label="Fewer">-</button><output>${S[k]}</output><button data-a="step" data-k="${k}" data-d="1" aria-label="More">+</button></div>`;
  const P = {
    2: `<h1>How well do you know fantasy?</h1><div class="opts">${opt('exp', 'never', 'I’ve never played', 'We pick the settings and explain everything')}${opt('exp', 'bit', 'I’ve played a bit', 'Plain language, with shortcuts')}${opt('exp', 'pro', 'I play every year', 'Dense tables, no hand-holding')}</div>`,
    3: `<h1>Which app is your league on?</h1><div class="opts">${[['espn', 'ESPN'], ['yahoo', 'Yahoo'], ['sleeper', 'Sleeper', 'Can sync picks live'], ['other', 'Other'], ['idk', 'I don’t know', 'We’ll use standard rules']].map(a => opt('app', a[0], a[1], a[2])).join('')}</div>
      ${S.app === 'sleeper' ? `<label class="field"><span>Sleeper username</span><input type="text" id="sl" autocomplete="off" placeholder="your_username" value="${S.sleeper ? 'sample_manager' : ''}"></label><button class="btn alt" style="margin-top:12px" data-a="connect">Connect</button>${S.sleeper ? '<p class="note" role="status">Connected. Found “Office League”: 12 teams, you pick 3rd. Settings imported.</p>' : ''}` : ''}`,
    4: `<h1>Quick setup</h1><p class="lead">We use standard rules for your app. Two questions:</p><div class="field"><span>How many teams?</span>${stepper('teams')}</div><div class="field"><span>What pick number are you?</span>${stepper('slot')}<p class="hint">If you don’t know yet, we’ll guess the middle and you can change it.</p></div>`
  }[step];
  return `${hdr()}<main class="pad"><div class="prog" aria-label="Step ${step - 1} of 3">${[1, 2, 3, 4].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>${P}<div class="foot"><a class="btn alt" href="#/${step === 2 ? '' : 'setup/' + (step - 1)}">Back</a>${step < 4 ? `<a class="btn" href="#/setup/${step + 1}" ${(step === 2 && !S.exp) || (step === 3 && !S.app) ? 'aria-disabled="true" data-a="nope"' : ''}>Next</a>` : '<button class="btn" data-a="go">Start drafting</button>'}</div></main>`;
}
const settingsView = () => `${hdr()}<main class="pad"><h1>Settings</h1><h2 class="h2">Mode</h2><div class="opts">${opt('mode', 'beginner', 'Beginner', 'One top pick, plain-language reasons')}${opt('mode', 'pro', 'Pro', 'Ranked table with ADP and odds')}</div>
 <h2 class="h2">League rules</h2><dl class="kv"><dt>Teams</dt><dd>${S.teams}</dd><dt>Your pick</dt><dd>#${S.slot}</dd><dt>Format</dt><dd>Snake, PPR</dd><dt>Lineup</dt><dd>QB, 2 RB, 2 WR, TE, Flex</dd><dt>Rounds</dt><dd>${S.rounds}</dd></dl>
 <button class="btn alt" data-a="reset">Reset demo draft</button><p class="smp" style="margin-inline:0">Prototype: rules are fixed to standard.</p></main>${tabs('')}`;

function playerSheet(id) {
  const p = byId(id), t = target(), onClock = teamOf(cur()) === S.slot, s = survive(p, t), i = recs().findIndex(r => r.id === id);
  return `<div class="sheet"><header><h1>${esc(p.n)}</h1><button class="ibtn" data-a="close" aria-label="Close">${ic('x')}</button></header>
 <div class="row"><dl class="kv grow" style="margin:0"><dt>Position</dt><dd>${p.pos}, ${POSN[p.pos]}</dd><dt>Team</dt><dd>${p.t}</dd><dt>ADP</dt><dd>${p.adp}</dd></dl>${tote(p, t, '', 's' + p.id)}</div>
 <p class="why">${i >= 0 ? why(p, i) : openCount(p.pos) ? `You still need a ${p.pos}.` : `You already have your ${p.pos} starters.`} ${s != null ? `About ${Math.round(s * 100)}% chance he is still here at pick ${t}.` : ''}</p>
 <button class="btn" data-a="take" data-id="${id}" ${onClock && !done() ? '' : 'disabled'}>Take this player</button>
 ${onClock || done() ? '' : `<button class="btn alt" style="margin-top:8px" data-a="loga" data-id="${id}">Mark as taken by Team ${teamOf(cur())}</button>`}</div>`;
}
function logSheet(q = '') {
  const t = taken(), list = DATA.filter(p => !t.has(p.id) && p.n.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.adp - b.adp).slice(0, 12);
  return `<div class="sheet"><header><h1>${teamOf(cur()) === S.slot ? 'Log my pick' : 'Log pick #' + cur()}</h1><button class="ibtn" data-a="close" aria-label="Close">${ic('x')}</button></header><p class="hint" style="margin:0 0 8px">${teamOf(cur()) === S.slot ? 'Use this if you took someone other than our suggestion. Tap the player.' : `Taken by Team ${teamOf(cur())}. Tap the player.`}</p>
  <label class="field" style="margin:0"><span>Search players</span><input type="search" id="q" autocomplete="off" value="${esc(q)}" placeholder="Name"></label>
  <div class="res" id="res">${list.map(p => `<button data-a="loga" data-id="${p.id}">${esc(p.n)}<span>${p.pos} · ${p.t} · ADP ${p.adp}</span></button>`).join('') || '<p class="hint" style="padding:8px">No match.</p>'}</div></div>`;
}
const helpSheet = () => `<div class="sheet"><header><h1>Help</h1><button class="ibtn" data-a="close" aria-label="Close">${ic('x')}</button></header><dl>${GLOSS.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>`;

/* ---------- render + events ---------- */
function route() {
  const h = location.hash.replace(/^#\/?/, ''), [r, a] = h.split('/');
  document.body.classList.toggle('wide', r === 'board' || r === 'draft'); document.body.dataset.mode = S.mode;
  const html = { '': homeView, draft: draftView, board: boardView, team: teamView, settings: settingsView, setup: () => setupView(+a || 2) }[r];
  $('#app').innerHTML = (html || homeView)();
  window.scrollTo(0, 0);
}
const rerender = () => { const y = scrollY; const x = document.querySelector('.bwrap')?.scrollLeft; route(); scrollTo(0, y); if (x) document.querySelector('.bwrap').scrollLeft = x; };
const sheet = html => { const d = $('#sheet'); d.innerHTML = html; if (!d.open) d.showModal(); };
const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, id = +b.dataset.id;
  if (a === 'nope') return e.preventDefault();
  if (a === 'setmode') { S.mode = b.dataset.v; rerender(); }
  if (a === 'open') { S.held.delete(id); sheet(playerSheet(id)); }
  if (a === 'take') { closeSheet(); logPick(id); rerender(); }
  if (a === 'loga') { closeSheet(); logPick(id); rerender(); }
  if (a === 'log') sheet(logSheet()), $('#q').focus();
  if (a === 'undo') { const p = S.picks.pop(); S.msg = p ? `Undid #${p.o} ${byId(p.id).n}.` : ''; rerender(); }
  if (a === 'ff') { untilMine(); rerender(); }
  if (a === 'finish') { finishDemo(); rerender(); }
  if (a === 'help') sheet(helpSheet());
  if (a === 'close') closeSheet();
  if (a === 'reset') { resetDemo(); rerender(); }
  if (a === 'copy') { navigator.clipboard?.writeText(location.href).catch(() => { }); S.copied = true; rerender(); }
  if (a === 'start') { S.mock = false; }
  if (a === 'mock') { S.mock = true; }
  if (a === 'set') { S[b.dataset.k] = b.dataset.v; if (b.dataset.k === 'exp') S.mode = b.dataset.v === 'pro' ? 'pro' : 'beginner'; if (b.dataset.k === 'app') S.sleeper = false; rerender(); }
  if (a === 'step') { const k = b.dataset.k, d = +b.dataset.d; S[k] = k === 'teams' ? Math.min(14, Math.max(8, S.teams + d)) : Math.min(S.teams, Math.max(1, S.slot + d)); S.slot = Math.min(S.slot, S.teams); rerender(); }
  if (a === 'connect') { S.sleeper = true; S.teams = 12; S.slot = 3; rerender(); }
  if (a === 'go') { const mock = S.mock; S.rounds = Math.min(6, Math.floor(DATA.length / S.teams)); S.picks = []; S.held.clear(); S.prev = {}; S.prevTop = []; S.msg = mock ? 'Practice draft: bots pick for other teams.' : ''; S.mock = mock; location.hash = '#/draft'; }
});
document.addEventListener('input', e => { if (e.target.id === 'q') { const v = e.target.value; sheet(logSheet(v)); const q = $('#q'); q.focus(); q.setSelectionRange(v.length, v.length); } });
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
addEventListener('hashchange', route); route();
