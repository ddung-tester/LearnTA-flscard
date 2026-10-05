const http = require('node:http');
const state = { deckStatus: 0, cardStatus: 0, failFinish: false, reviewCount: 250, registrations: 0, requests: [], sessions: [], quizzes: [], answers: {} };
const cards = ['apple','pear','banana','grape'].map((word, i) => ({ id: i + 1, deck_id: 1, term_en: word, meaning_vi: ['t\u00e1o','l\u00ea','chu\u1ed1i','nho'][i], example_sentence: `I like ${word}.`, part_of_speech: 'noun', pronunciation: '/', is_favorite: false, mastery_level: 0 }));
let user = { id: 700, name: 'Phase 2 local fixture', email: 'local@example.test' };
const progress = new Map();
const baseReviews = () => Array.from({ length: state.reviewCount }, (_, i) => ({ card_id: 1001 + i, deck_id: 1, deck_title: 'Phase 2 test', word: `review${1001+i}`, meaning: 'test', level: 0, review_count: 0, next_review_at: new Date().toISOString() }));
const deck = () => ({ id: 1, user_id: user.id, title: 'Phase 2 test', card_count: 4, description: '', is_public: false });
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5188');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const url = new URL(req.url, 'http://127.0.0.1:8081'); const path = url.pathname.replace(/^\/api/, '');
  const send = (data, status = 200) => { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(data)); };
  if (path === '/__test') { if (req.method === 'POST') Object.assign(state, body); return send(state); }
  state.requests.push({ path, method: req.method, query: Object.fromEntries(url.searchParams), body });
  if (path === '/auth/register') { user = { id: 701 + state.registrations++, name: body.name, email: body.email }; progress.clear(); return send({ user, token: `fixture-${user.id}` }); }
  if (path === '/auth/me') return send({ user });
  if (path === '/auth/login') return send({ user, token: `fixture-${user.id}` });
  if (path === '/users/settings') return send({});
  if (path === '/users/stats') return send({ current_streak: 0, total_xp: state.sessions.reduce((a,s) => a+(s.ended_at?s.xp_earned:0),0), longest_streak: 0 });
  if (path === '/decks') return send([deck()]);
  if (path === '/decks/1') return state.deckStatus ? send({message:'Deck unavailable'}, state.deckStatus) : send(deck());
  if (path === '/decks/1/cards') return state.cardStatus ? send({message:'Cards unavailable'}, state.cardStatus) : send(cards.map(c => ({...c, ...(progress.has(c.id) ? {mastery_level: progress.get(c.id).level, review_count:progress.get(c.id).review_count} : {})})));
  if (path.includes('/quiz-results/latest')) return send(null);
  if (path.includes('/courses') || path.includes('/roadmaps')) return send([]);
  if (path === '/mistakes') return send([]);
  if (path.startsWith('/mistakes')) return send({});
  if (path === '/reviews' || path === '/reviews/due') {
    const all = [...baseReviews(), ...progress.values()].filter(c => path !== '/reviews/due' || c.level === 0);
    const offset = Number(url.searchParams.get('offset') || 0); const limit = Number(url.searchParams.get('limit') || 100);
    return send(all.slice(offset,offset+limit));
  }
  if (path === '/reviews/bulk') return send({ reviews: body.items || [], synced_count: (body.items||[]).length });
  if (path === '/study-sessions/summary') {
    const done = state.sessions.filter(s => s.ended_at); const total = done.reduce((a,s)=>a+s.total,0); const correct = done.reduce((a,s)=>a+s.correct,0);
    return send({ total_sessions: done.length, total_cards_studied: total, average_accuracy: total ? Math.round(correct*100/total):0, total_duration_seconds:0, total_xp_earned: correct*10, last_7_days_activity:[], mode_breakdown:[], recent_sessions: done });
  }
  if (path === '/study-sessions' && req.method === 'GET') return send(state.sessions);
  if (path === '/study-sessions' && req.method === 'POST') { const s = {...body, id:state.sessions.length+1, started_at:new Date().toISOString()};state.sessions.push(s);return send(s); }
  const finish = path.match(/^\/study-sessions\/(\d+)\/finish$/);
  if (finish) { if(state.failFinish) return send({ message:'Local test 503' },503); const s = state.sessions.find(s=>s.id === Number(finish[1])); Object.assign(s,body,{ended_at: s.ended_at||new Date().toISOString()}); return send(s); }
  const answers = path.match(/^\/study-sessions\/(\d+)\/answers$/);
  if (answers) {
    const existing = state.answers[answers[1]] ||= [];
    for (const answer of body.answers) {
      if (existing.some(a=>a.card_id===answer.card_id)) continue;
      existing.push(answer); const c = cards.find(c=>c.id === answer.card_id); const prev = progress.get(c.id);
      progress.set(c.id,{ card_id:c.id, deck_id:1, word:c.term_en, meaning:c.meaning_vi, level:Math.max(0,Math.min(5,(prev?.level||0)+(answer.is_correct?1:-1))), review_count:(prev?.review_count||0)+1, next_review_at:new Date().toISOString() });
    }
    return send({inserted_count:existing.length, answers:existing});
  }
  if (path === '/quiz-results') { state.quizzes.push(body);return send({...body,id:state.quizzes.length}); }
  return send({});
}).listen(8081,'127.0.0.1',()=>console.log('Phase2 fixture 8081: RAM only, no database or AI'));
