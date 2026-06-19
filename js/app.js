/* =========================================
   HTML Anything · Template Explorer — GitHub Pages Edition
   ========================================= */
(function () {
  'use strict';

  // ── GitHub Pages 配置 ──
  // 模板源文件基础路径（本地静态文件，已迁移至 templates/ 目录）
  var SKILLS_BASE = 'templates/';

  // ---------- State ----------
  var state = {
    templates: [],
    categories: [],
    scenarios: [],
    tags: [],
    search: '',
    activeCategories: new Set(),
    activeScenarios: new Set(),
    activeTags: new Set(),
    onlyExamples: false,
    onlyFeatured: false,
    sort: 'featured',
    view: 'grid',
    favorites: new Set(),
    favoritesOnly: false,
    activeTemplate: null
  };

  // ---------- Localization / Mappings ----------
  var CATEGORY_NAMES = {
    doc: '文档', resume: '简历', slides: '演示', deck: '演示',
    poster: '海报', frame: '视频帧', card: '社交卡片', social: '社交',
    prototype: '原型', landing: '落地页', dashboard: '仪表盘',
    data: '数据', report: '报告', email: '邮件', office: '办公',
    mobile: '移动', article: '文章', blog: '博客', vfx: '动效',
    video: '视频', other: '其他', finance: '财务'
  };

  var SCENARIO_NAMES = {
    marketing: '营销', product: '产品', operations: '运营',
    finance: '财务', personal: '个人', engineering: '工程',
    design: '设计', creator: '创作者', education: '教育',
    hr: '人力资源', sales: '销售', video: '视频', general: '通用'
  };

  var CATEGORY_COLORS = {
    doc:      { bg: 'linear-gradient(135deg, #f5f4ed 0%, #e8ecf4 100%)', isDark: false },
    resume:   { bg: 'linear-gradient(135deg, #f5f4ed 0%, #eef0e8 100%)', isDark: false },
    slides:   { bg: 'linear-gradient(135deg, #e8ecf4 0%, #1B365D 180%)', isDark: false },
    poster:   { bg: 'linear-gradient(135deg, #f8e8dc 0%, #efeee5 100%)', isDark: false },
    card:     { bg: 'linear-gradient(135deg, #fce8e8 0%, #f5f4ed 100%)', isDark: false },
    prototype:{ bg: 'linear-gradient(135deg, #e8ecf4 0%, #dce5d8 100%)', isDark: false },
    dashboard:{ bg: 'linear-gradient(135deg, #eef0e8 0%, #d8ded0 100%)', isDark: false },
    data:     { bg: 'linear-gradient(135deg, #e8ece8 0%, #d0d8d0 100%)', isDark: false },
    frame:    { bg: 'linear-gradient(135deg, #1f1d18 0%, #1B365D 150%)', isDark: true },
    email:    { bg: 'linear-gradient(135deg, #f4f0e8 0%, #ede8dc 100%)', isDark: false },
    office:   { bg: 'linear-gradient(135deg, #f0f0e8 0%, #e0ddc8 100%)', isDark: false },
    article:  { bg: 'linear-gradient(135deg, #f5f4ed 0%, #e8e0cc 100%)', isDark: false },
    mobile:   { bg: 'linear-gradient(135deg, #e8e8f4 0%, #d8d8f0 100%)', isDark: false },
    vfx:      { bg: 'linear-gradient(135deg, #1B365D 0%, #1f1d18 100%)', isDark: true },
    video:    { bg: 'linear-gradient(135deg, #1B365D 0%, #0a0a0a 100%)', isDark: true },
    finance:  { bg: 'linear-gradient(135deg, #e8ece8 0%, #c8d4c8 100%)', isDark: false }
  };

  // ---------- Helpers ----------
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); };

  function getCategoryName(cat) { return CATEGORY_NAMES[cat] || cat; }
  function getScenarioName(sc) { return SCENARIO_NAMES[sc] || sc; }
  function getCategoryColors(cat) {
    return CATEGORY_COLORS[cat] || { bg: 'linear-gradient(135deg, #f5f4ed 0%, #e8ecf4 100%)', isDark: false };
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function skillsUrl(id, file) { return SKILLS_BASE + id + '/' + file; }

  function showToast(msg, duration) {
    var toast = $('#toast');
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.hidden = true; }, duration || 1800);
  }

  // ---------- Favorites ----------
  var FAV_KEY = 'html-anything-explorer:favorites';

  function loadFavorites() {
    try {
      var raw = localStorage.getItem(FAV_KEY);
      if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr)) state.favorites = new Set(arr); }
    } catch (e) { /* ignore */ }
    updateFavCountUI();
  }

  function saveFavorites() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(state.favorites))); } catch (e) { /* ignore */ }
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) { state.favorites.delete(id); showToast('已取消收藏'); }
    else { state.favorites.add(id); showToast('已加入收藏 ★'); }
    saveFavorites(); updateFavCountUI(); renderTemplates();
  }

  function updateFavCountUI() { $('#favCount').textContent = String(state.favorites.size); }

  // ---------- Data Loading ----------
  function loadTemplates() {
    fetch('data/templates.json')
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (data) {
        state.templates = data.templates || [];
        state.categories = data.categories || [];
        state.scenarios = data.scenarios || [];
        state.tags = data.tags || [];
        updateHeroCounts();
        renderFilterChips();
        renderTemplates();
        $('#loadingState').hidden = true;
      })
      .catch(function (err) {
        console.error('Failed to load templates:', err);
        $('#loadingState').innerHTML = '<p style="color: var(--danger)">⚠️ 模板数据加载失败。</p>';
      });
  }

  function updateHeroCounts() {
    var count = function (arr, cat) { return arr.filter(function (t) { return t.category === cat; }).length; };
    var tpls = state.templates;
    $('#docCount').textContent = String(count(tpls, 'doc') + count(tpls, 'article') + count(tpls, 'blog'));
    $('#slidesCount').textContent = String(count(tpls, 'slides'));
    $('#posterCount').textContent = String(count(tpls, 'poster') + count(tpls, 'frame') + count(tpls, 'video') + count(tpls, 'vfx'));
    $('#protoCount').textContent = String(count(tpls, 'prototype') + count(tpls, 'landing'));
    $('#dataCount').textContent = String(count(tpls, 'data') + count(tpls, 'dashboard') + count(tpls, 'report') + count(tpls, 'finance'));
    $('#cardCount').textContent = String(count(tpls, 'card') + count(tpls, 'social') + count(tpls, 'mobile'));
    $('#templateCount').textContent = String(tpls.length);
  }

  // ---------- Filter Chips ----------
  function countByKey(arr, key) {
    var map = {};
    arr.forEach(function (t) { var k = t[key]; if (k) map[k] = (map[k] || 0) + 1; });
    return map;
  }
  function countByTag(arr) {
    var map = {};
    arr.forEach(function (t) { if (t.tags) t.tags.forEach(function (tag) { map[tag] = (map[tag] || 0) + 1; }); });
    return map;
  }

  function renderFilterChips() {
    var catCounts = countByKey(state.templates, 'category');
    var scCounts = countByKey(state.templates, 'scenario');
    var tagCounts = countByTag(state.templates);

    function renderChips(container, items, counts, type) {
      container.innerHTML = items
        .sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0); })
        .map(function (item) {
          var label = type === 'category' ? getCategoryName(item) : type === 'scenario' ? getScenarioName(item) : item;
          return '<button type="button" class="chip" data-type="' + type + '" data-value="' + escapeHtml(item) + '">' +
            escapeHtml(label) + ' <span class="chip-count">' + (counts[item] || 0) + '</span></button>';
        }).join('');
      $$('.chip', container).forEach(function (chip) {
        chip.addEventListener('click', function () { toggleFilterChip(type, chip.dataset.value, chip); });
      });
    }

    renderChips($('#categoryChips'), state.categories, catCounts, 'category');
    renderChips($('#scenarioChips'), state.scenarios, scCounts, 'scenario');

    // Tags — top 80
    var topTags = Object.entries(tagCounts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 80).map(function (e) { return e[0]; });
    renderChips($('#tagChips'), topTags, tagCounts, 'tag');

    updateChipActiveStates();
    updateFilterCounts();
  }

  function toggleFilterChip(type, value) {
    var set = type === 'category' ? state.activeCategories : type === 'scenario' ? state.activeScenarios : state.activeTags;
    if (set.has(value)) set.delete(value); else set.add(value);
    updateChipActiveStates(); updateFilterCounts(); renderTemplates();
  }

  function updateChipActiveStates() {
    ['category', 'scenario', 'tag'].forEach(function (type) {
      var set = type === 'category' ? state.activeCategories : type === 'scenario' ? state.activeScenarios : state.activeTags;
      var containerId = type === 'category' ? 'categoryChips' : type === 'scenario' ? 'scenarioChips' : 'tagChips';
      $$('#' + containerId + ' .chip').forEach(function (chip) {
        chip.classList.toggle('is-active', set.has(chip.dataset.value));
      });
    });
  }

  function updateFilterCounts() {
    $('#activeCategoryCount').textContent = state.activeCategories.size || '';
    $('#activeScenarioCount').textContent = state.activeScenarios.size || '';
    $('#activeTagCount').textContent = state.activeTags.size || '';
  }

  // ---------- Filtering + Sorting ----------
  function filterTemplates() {
    var q = state.search.trim().toLowerCase();
    var list = state.templates;

    if (q) {
      var parts = q.split(/\s+/).filter(Boolean);
      list = list.filter(function (t) {
        var haystack = [t.name, t.zh_name, t.en_name, t.description, t.category, t.scenario, t.id, (t.tags || []).join(' '), t.brief]
          .filter(Boolean).join(' ').toLowerCase();
        return parts.every(function (p) { return haystack.includes(p); });
      });
    }

    if (state.activeCategories.size) list = list.filter(function (t) { return state.activeCategories.has(t.category); });
    if (state.activeScenarios.size) list = list.filter(function (t) { return state.activeScenarios.has(t.scenario); });
    if (state.activeTags.size) list = list.filter(function (t) { return t.tags && t.tags.some(function (tag) { return state.activeTags.has(tag); }); });
    if (state.onlyExamples) list = list.filter(function (t) { return t.hasExampleHtml; });
    if (state.onlyFeatured) list = list.filter(function (t) { return t.featured || t.recommended; });
    if (state.favoritesOnly) list = list.filter(function (t) { return state.favorites.has(t.id); });

    // Sort
    var sorted = list.slice();
    switch (state.sort) {
      case 'name':
        sorted.sort(function (a, b) { return (a.zh_name || a.name).localeCompare(b.zh_name || b.name, 'zh'); }); break;
      case 'name-desc':
        sorted.sort(function (a, b) { return (b.zh_name || b.name).localeCompare(a.zh_name || a.name, 'zh'); }); break;
      case 'category':
        sorted.sort(function (a, b) {
          var c = (a.category || '').localeCompare(b.category || '');
          return c !== 0 ? c : (a.zh_name || a.name).localeCompare(b.zh_name || b.name, 'zh');
        }); break;
      default: // featured
        sorted.sort(function (a, b) {
          var av = a.featured ? 0 : a.recommended ? 1 : 2;
          var bv = b.featured ? 0 : b.recommended ? 1 : 2;
          if (av !== bv) return av - bv;
          if (a.featured && b.featured) return a.featured - b.featured;
          if (a.recommended && b.recommended) return a.recommended - b.recommended;
          return (a.zh_name || a.name).localeCompare(b.zh_name || b.name, 'zh');
        });
    }
    return sorted;
  }

  // ---------- Rendering ----------
  function renderTemplates() {
    var container = $('#templateContainer');
    var list = filterTemplates();

    container.className = 'template-grid' + (state.view === 'list' ? ' is-list' : '');

    if (list.length === 0) {
      container.innerHTML = '';
      $('#emptyState').hidden = false;
    } else {
      $('#emptyState').hidden = true;
      container.innerHTML = list.map(renderCard).join('');
      $$('.template-card', container).forEach(function (card) {
        var id = card.dataset.id;
        card.addEventListener('click', function (e) { if (!e.target.closest('.card-btn')) openModal(id); });
        var favBtn = card.querySelector('.card-btn-fav');
        if (favBtn) favBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleFavorite(id); });
      });
    }

    $('#resultCount').textContent = String(list.length);
    var sub = [];
    if (state.favoritesOnly) sub.push('仅收藏');
    if (state.search) sub.push('搜索 "' + state.search + '"');
    $('#resultSubcount').textContent = sub.length ? ' · ' + sub.join(' · ') : '';

    renderActiveFilterChips();
  }

  function renderCard(t) {
    var colors = getCategoryColors(t.category);
    var isFav = state.favorites.has(t.id);
    var featured = t.featured || t.recommended;
    var badge = featured ? '<span class="card-badge card-badge-brown">精选</span>' : '';
    var tags = (t.tags || []).slice(0, 4).map(function (tag) { return '<span class="card-tag">' + escapeHtml(tag) + '</span>'; }).join('');
    var darkClass = colors.isDark ? ' is-dark' : '';

    var exampleLink = t.hasExampleHtml
      ? '<a href="' + skillsUrl(t.id, 'example.html') + '" class="card-btn card-btn-link" target="_blank" rel="noopener" title="在新窗口打开 example.html" aria-label="打开 ' + escapeHtml(t.zh_name || t.name) + ' 的 example.html">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M14 3h7v7M10 14L21 3M21 13v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</a>'
      : '';

    var skillLink =
      '<a href="' + skillsUrl(t.id, 'SKILL.md') + '" class="card-btn card-btn-link" target="_blank" rel="noopener" title="查看 SKILL.md" aria-label="查看 ' + escapeHtml(t.zh_name || t.name) + ' 的 SKILL.md">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</a>';

    return '<article class="template-card' + (isFav ? ' is-favorite' : '') + '" data-id="' + escapeHtml(t.id) + '" tabindex="0" role="button" aria-label="查看 ' + escapeHtml(t.zh_name || t.name) + ' 详情">' +
        '<div class="card-preview' + darkClass + '" style="--preview-bg: ' + colors.bg + '">' +
          '<div class="card-preview-pattern"></div>' + badge +
          '<span class="card-preview-emoji' + darkClass + '">' + escapeHtml(t.emoji || '📄') + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-title-row"><h3 class="card-title">' + escapeHtml(t.zh_name || t.name) + '</h3></div>' +
          '<div class="card-meta"><span>' + escapeHtml(getCategoryName(t.category)) + '</span>' +
            (t.aspect_hint ? '<span class="sep">·</span><span>' + escapeHtml(t.aspect_hint) + '</span>' : '') +
          '</div>' +
          '<p class="card-description">' + escapeHtml(t.description || '') + '</p>' +
          '<div class="card-tags">' + tags + '</div>' +
          '<div class="card-footer">' +
            '<span class="card-id">' + escapeHtml(t.id) + '</span>' +
            '<div class="card-actions">' + exampleLink + skillLink +
              '<button type="button" class="card-btn card-btn-fav ' + (isFav ? 'is-fav' : '') + '" aria-label="' + (isFav ? '取消收藏' : '加入收藏') + '">' +
                (isFav ? '★ 已收藏' : '☆ 收藏') +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderActiveFilterChips() {
    var container = $('#activeFilters');
    var chips = [];
    state.activeCategories.forEach(function (v) { chips.push(['分类', v, 'category']); });
    state.activeScenarios.forEach(function (v) { chips.push(['场景', v, 'scenario']); });
    state.activeTags.forEach(function (v) { chips.push(['标签', v, 'tag']); });
    if (state.onlyExamples) chips.push(['条件', '带示例', 'examples']);
    if (state.onlyFeatured) chips.push(['条件', '仅精选', 'featured']);

    container.innerHTML = chips.map(function (item) {
      var label = item[1];
      if (item[2] === 'category') label = getCategoryName(item[1]);
      else if (item[2] === 'scenario') label = getScenarioName(item[1]);
      return '<span class="active-filter-chip">' + escapeHtml(label) +
        '<button type="button" data-type="' + escapeHtml(item[2]) + '" data-value="' + escapeHtml(item[1]) + '" aria-label="移除 ' + escapeHtml(label) + '">×</button></span>';
    }).join('');

    $$('.active-filter-chip button', container).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.dataset.type, val = btn.dataset.value;
        if (type === 'category') state.activeCategories.delete(val);
        else if (type === 'scenario') state.activeScenarios.delete(val);
        else if (type === 'tag') state.activeTags.delete(val);
        else if (type === 'examples') { state.onlyExamples = false; $('#filterExamples').checked = false; }
        else if (type === 'featured') { state.onlyFeatured = false; $('#filterFeatured').checked = false; }
        updateChipActiveStates(); updateFilterCounts(); renderTemplates();
      });
    });
  }

  function resetFilters() {
    state.activeCategories.clear(); state.activeScenarios.clear(); state.activeTags.clear();
    state.onlyExamples = false; state.onlyFeatured = false; state.search = '';
    $('#searchInput').value = ''; $('#searchClear').hidden = true;
    $('#filterExamples').checked = false; $('#filterFeatured').checked = false;
    updateChipActiveStates(); updateFilterCounts(); renderTemplates();
  }

  // ---------- Modal ----------
  function openModal(id) {
    var tpl = state.templates.find(function (t) { return t.id === id; });
    if (!tpl) return;
    state.activeTemplate = id;

    var isFav = state.favorites.has(id);
    var tagsHtml = (tpl.tags || []).map(function (tag) { return '<span class="modal-tag">' + escapeHtml(tag) + '</span>'; }).join('');
    var colors = getCategoryColors(tpl.category);
    var hasExample = tpl.hasExampleHtml;
    var darkClass = colors.isDark ? ' is-dark' : '';

    var exName = tpl.example_name || tpl.zh_name || tpl.name;
    var exFormat = tpl.example_format || (hasExample ? 'HTML / Markdown / JSON' : '—');
    var exDesc = tpl.example_desc || tpl.description || '';
    var exTagline = tpl.example_tagline || '';
    var exUrl = tpl.example_source_url || '';
    var exLabel = tpl.example_source_label || '';

    $('#modalContent').innerHTML =
      '<div class="modal-hero' + darkClass + '" style="background-image: ' + colors.bg + '">' +
        '<span class="modal-badge">' + escapeHtml(getCategoryName(tpl.category)) + '</span>' +
        '<h1>' + escapeHtml(tpl.emoji || '📄') + ' ' + escapeHtml(tpl.zh_name || tpl.name) + '</h1>' +
        '<p class="modal-subtitle">' + escapeHtml(tpl.en_name || '') + '</p>' +
        '<span class="modal-id">' + escapeHtml(tpl.id) + '</span>' +
        '<div class="modal-hero-meta">' +
          '<div class="meta-item"><span>场景</span><span>' + escapeHtml(getScenarioName(tpl.scenario)) + '</span></div>' +
          '<div class="meta-item"><span>版式</span><span>' + escapeHtml(tpl.aspect_hint || '—') + '</span></div>' +
          (tpl.featured ? '<div class="meta-item"><span>精选</span><span>★ 排名 ' + escapeHtml(String(tpl.featured)) + '</span></div>' : '') +
          (tpl.recommended ? '<div class="meta-item"><span>推荐</span><span>排名 ' + escapeHtml(String(tpl.recommended)) + '</span></div>' : '') +
          '<div class="meta-item"><span>示例</span><span>' + (hasExample ? '有 example.html' : '无') + '</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-tabs" role="tablist">' +
        '<button type="button" class="modal-tab is-active" data-tab="info" role="tab" aria-selected="true">模板详情</button>' +
        (hasExample ? '<button type="button" class="modal-tab" data-tab="example" role="tab" aria-selected="false">example.html</button>' : '') +
        '<button type="button" class="modal-tab" data-tab="skill" role="tab" aria-selected="false">SKILL.md</button>' +
      '</div>' +

      '<div class="modal-tab-panel" data-panel="info" role="tabpanel">' +
        '<div class="modal-body">' +
          '<section class="modal-section"><h3>模板说明</h3><p class="modal-short">' + escapeHtml(tpl.description || '') + '</p></section>' +
          (tagsHtml ? '<section class="modal-section"><h3>标签</h3><div class="modal-tags">' + tagsHtml + '</div></section>' : '') +
          '<section class="modal-section"><h3>示例信息</h3><div class="modal-example">' +
            (exName ? '<div class="example-row"><span class="label">示例名</span><span class="value">' + escapeHtml(exName) + '</span></div>' : '') +
            (exFormat ? '<div class="example-row"><span class="label">输入格式</span><span class="value"><code>' + escapeHtml(exFormat) + '</code></span></div>' : '') +
            (exTagline ? '<div class="example-row"><span class="label">标语</span><span class="value">' + escapeHtml(exTagline) + '</span></div>' : '') +
            (exDesc ? '<div class="example-row"><span class="label">描述</span><span class="value">' + escapeHtml(exDesc) + '</span></div>' : '') +
            (exUrl ? '<div class="example-row"><span class="label">来源</span><span class="value">' + escapeHtml(exLabel || exUrl) + '</span></div>' : '') +
          '</div></section>' +
          '<section class="modal-section"><h3>操作</h3><div class="modal-actions">' +
            '<button type="button" class="modal-action-btn is-primary" id="modalFavBtn">' + (isFav ? '★ 已收藏' : '☆ 加入收藏') + '</button>' +
            '<button type="button" class="modal-action-btn" id="modalCopyId">复制模板 ID</button>' +
          '</div></section>' +
        '</div>' +
      '</div>' +

      (hasExample ?
        '<div class="modal-tab-panel" data-panel="example" role="tabpanel" hidden>' +
          '<div class="modal-file-viewer">' +
            '<iframe src="' + skillsUrl(id, 'example.html') + '" class="modal-iframe" sandbox="allow-scripts allow-same-origin" loading="lazy" title="example.html 预览"></iframe>' +
          '</div>' +
        '</div>' : '') +

      '<div class="modal-tab-panel" data-panel="skill" role="tabpanel" hidden>' +
        '<div class="modal-file-viewer">' +
          '<pre class="modal-code"><code id="skillCode">加载中…</code></pre>' +
        '</div>' +
      '</div>';

    $('#templateModal').hidden = false;
    document.body.style.overflow = 'hidden';

    $('#modalFavBtn').addEventListener('click', function () { toggleFavorite(id); });
    $('#modalCopyId').addEventListener('click', function () {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(id).then(function () { showToast('已复制模板 ID'); });
        } else {
          var ta = document.createElement('textarea'); ta.value = id;
          ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
          showToast('已复制模板 ID');
        }
      } catch (e) { showToast('复制失败'); }
    });

    // Tab switching
    var tabs = $$('.modal-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var panelName = tab.dataset.tab;
        tabs.forEach(function (t) { t.classList.toggle('is-active', t.dataset.tab === panelName); t.setAttribute('aria-selected', String(t.dataset.tab === panelName)); });
        $$('.modal-tab-panel').forEach(function (panel) { panel.hidden = panel.dataset.panel !== panelName; });
        if (panelName === 'skill') {
          var codeEl = document.getElementById('skillCode');
          if (codeEl && codeEl.textContent === '加载中…') fetchSkillMd(id, codeEl);
        }
      });
    });
  }

  function fetchSkillMd(id, codeEl) {
    fetch(skillsUrl(id, 'SKILL.md'))
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.text(); })
      .then(function (text) { codeEl.textContent = text; })
      .catch(function (err) { codeEl.textContent = '加载失败: ' + err.message; });
  }

  function closeModal() {
    $('#templateModal').hidden = true;
    document.body.style.overflow = '';
    state.activeTemplate = null;
  }

  // ---------- Event Wiring ----------
  function wireEvents() {
    var searchInput = $('#searchInput');
    var searchClear = $('#searchClear');

    searchInput.addEventListener('input', function (e) {
      state.search = e.target.value || ''; searchClear.hidden = !state.search; renderTemplates();
    });
    searchClear.addEventListener('click', function () {
      searchInput.value = ''; state.search = ''; searchClear.hidden = true; searchInput.focus(); renderTemplates();
    });

    document.addEventListener('keydown', function (e) {
      var modalEl = document.getElementById('templateModal');
      if (modalEl && !modalEl.hidden) { if (e.key === 'Escape') { e.preventDefault(); closeModal(); } return; }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
        e.preventDefault(); e.stopPropagation();
        var si = document.getElementById('searchInput');
        if (si) { si.focus(); si.select(); }
      }
    });

    $('#filterExamples').addEventListener('change', function (e) { state.onlyExamples = e.target.checked; renderTemplates(); });
    $('#filterFeatured').addEventListener('change', function (e) { state.onlyFeatured = e.target.checked; renderTemplates(); });
    $('#resetFilters').addEventListener('click', resetFilters);
    $('#resetFromEmpty').addEventListener('click', resetFilters);
    $('#sortSelect').addEventListener('change', function (e) { state.sort = e.target.value; renderTemplates(); });

    var favNav = $('.nav-fav');
    if (favNav) {
      favNav.addEventListener('click', function (e) {
        e.preventDefault();
        state.favoritesOnly = !state.favoritesOnly;
        favNav.classList.toggle('is-active', state.favoritesOnly);
        if (state.favoritesOnly) showToast('显示收藏的模板 (' + state.favorites.size + ')');
        renderTemplates();
        if (state.favoritesOnly) {
          var target = document.getElementById('templates');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    $$('[data-close-modal]').forEach(function (el) { el.addEventListener('click', closeModal); });
  }

  // ---------- Init ----------
  function init() {
    loadFavorites(); wireEvents(); loadTemplates();

    function handleHash() {
      var hash = window.location.hash;
      if (hash && hash.length > 1) {
        var id = hash.substring(1);
        var check = function () {
          var tpl = state.templates.find(function (t) { return t.id === id; });
          if (tpl) { openModal(id); var target = document.getElementById('templates'); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          else if (state.templates.length === 0) { setTimeout(check, 200); }
        };
        check();
      }
    }

    if (window.location.hash) handleHash();
    window.addEventListener('hashchange', handleHash);

    document.addEventListener('click', function (e) {
      var link = e.target.closest('.inline-link');
      if (link && link.hash) {
        e.preventDefault();
        var id = link.hash.substring(1);
        var tpl = state.templates.find(function (t) { return t.id === id; });
        if (tpl) openModal(id);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
