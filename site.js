'use strict';
// Lê o arquivo conteudo.json (editado pelo painel /admin) e monta a página.
// Tudo entra como TEXTO (textContent): nada digitado no painel vira código.
const CATEGORIAS = { 'Ferramentas': 'ferramentas', 'Carro': 'carro', 'BBQ': 'bbq', 'Armas': 'armas', 'Casa': 'casa', 'Construção': 'construcao' };

function abrirAba(p) {
  const sec = document.getElementById('pag-' + p);
  if (!sec) return;
  document.querySelectorAll('.secao-conteudo').forEach(s => s.classList.remove('ativa'));
  sec.classList.add('ativa');
  document.querySelectorAll('.navegacao a').forEach(a => a.classList.toggle('ativo', a.dataset.pagina === p));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('[data-pagina], [data-ir]').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); abrirAba(a.dataset.pagina || a.dataset.ir); }));

const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const dataBR = s => /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';
const diaSemana = s => { const d = new Date(s.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }); return d[0].toUpperCase() + d.slice(1); };
const ytId = l => (String(l || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/) || [])[1];
function player(link, titulo) {
  const id = ytId(link); if (!id) return null;
  const f = document.createElement('iframe');
  f.src = 'https://www.youtube-nocookie.com/embed/' + id; f.title = titulo; f.loading = 'lazy';
  f.allow = 'encrypted-media; picture-in-picture; fullscreen'; f.referrerPolicy = 'strict-origin-when-cross-origin';
  return f;
}
// Só aceita links http/https (bloqueia "javascript:" e similares)
const linkSeguro = u => { try { const x = new URL(u, location.origin); return ['http:', 'https:'].includes(x.protocol) ? x.href : null; } catch { return null; } };

function artigo(p, rotulo, data) {
  const a = el('article', 'post'), c = el('div', 'post-cabecalho');
  c.append(el('span', 'categoria', p.categoria), el('span', 'data-post', data));
  a.append(c, el('h3', null, p.titulo), el('p', null, p.resumo));
  if (p.corpo) {
    const x = el('a', 'ler-mais', rotulo + ' →'); x.href = '#';
    x.addEventListener('click', e => { e.preventDefault(); abrirPost(p); }); a.append(x);
  } else {
    const l = linkSeguro(p.link);
    if (l) { const x = el('a', 'ler-mais', rotulo + ' →'); x.href = l; x.target = '_blank'; x.rel = 'noopener noreferrer'; a.append(x); }
  }
  return a;
}
// Markdown -> HTML, filtrado: só etiquetas de texto, links http/https e imagens do próprio site
const URI_OK = /^(?:(?:https?|mailto):|\/(?!\/)|#)/i;
function textoSeguro(md) {
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined')
    return String(md).split(/\n\s*\n/).map(t => t.trim()).filter(Boolean).map(t => el('p', null, t));
  DOMPurify.removeAllHooks();
  DOMPurify.addHook('afterSanitizeAttributes', n => { if (n.tagName === 'A') { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer'); } });
  const caixa = el('div');
  caixa.innerHTML = DOMPurify.sanitize(marked.parse(String(md), { gfm: true, breaks: true }), {
    ALLOWED_TAGS: ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'del', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'], ALLOWED_URI_REGEXP: URI_OK });
  return [...caixa.childNodes];
}
function abrirPost(p) {
  document.getElementById('post-categoria').textContent = p.categoria;
  document.getElementById('post-data').textContent = dataBR(p.data);
  document.getElementById('post-titulo').textContent = p.titulo;
  const corpo = document.getElementById('post-corpo'), itens = [];
  const pv = player(p.video, p.titulo);
  if (pv) { const caixa = el('div', 'video-espaco'); caixa.append(pv); itens.push(caixa); }
  itens.push(...textoSeguro(p.corpo));
  if (/^(\/(?!\/)|https:)/.test(p.imagem || '')) { const i = el('img', 'capa-post'); i.src = p.imagem; i.alt = p.titulo; itens.unshift(i); }
  corpo.replaceChildren(...itens);
  abrirAba('post');
}
function trocarPosts(caixa, itens) { if (!caixa) return; caixa.querySelectorAll('.post').forEach(n => n.remove()); caixa.append(...itens); }

async function carregar() {
  let c;
  try { const r = await fetch('conteudo.json', { cache: 'no-cache' }); if (!r.ok) return; c = await r.json(); } catch { return; }

  const v = c.video || {};
  if (v.titulo) document.getElementById('titulo-video-semana').textContent = v.titulo;
  if (v.descricao) document.getElementById('desc-video-semana').textContent = v.descricao;
  const pv = player(v.link, v.titulo || 'Vídeo da semana');
  if (pv) document.getElementById('espaco-video').replaceChildren(pv);

  const hoje = new Date().toLocaleDateString('sv-SE');
  const posts = (c.posts || []).filter(p => p && p.titulo && p.publicado !== false && String(p.data) <= hoje).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  trocarPosts(document.getElementById('lista-principal-posts'), posts.slice(0, 6).map(p => artigo(p, 'Ler completo', dataBR(p.data))));
  for (const [nome, slug] of Object.entries(CATEGORIAS)) {
    trocarPosts(document.querySelector(`#pag-${slug} .lista-posts`), posts.filter(p => p.categoria === nome).map(p => artigo(p, 'Ler completo', dataBR(p.data))));
  }

  const eventos = (c.eventos || []).filter(e => e && e.titulo && String(e.data) >= hoje).sort((a, b) => String(a.data).localeCompare(String(b.data)));
  trocarPosts(document.querySelector('#pag-eventos .lista-posts'),
    eventos.map(e => artigo({ categoria: e.categoria, titulo: e.titulo, resumo: e.descricao, link: e.link }, 'Ver detalhes', `${dataBR(e.data)} — ${diaSemana(e.data)}`)));

  const h = document.getElementById('h-eventos');
  if (h) {
    const caixa = h.parentElement, ver = caixa.querySelector('a');
    caixa.querySelectorAll('.evento').forEach(n => n.remove());
    eventos.slice(0, 3).forEach(e => {
      const d = el('div', 'evento');
      d.append(el('div', 'evento-data', `${dataBR(e.data)} — ${diaSemana(e.data)}`), el('div', 'evento-titulo', e.titulo), el('p', null, e.descricao), el('span', 'evento-tipo', e.categoria));
      caixa.insertBefore(d, ver);
    });
  }
}
carregar();
