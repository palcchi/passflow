const ORIGIN = 'https://passflow.my.id';
const NS = 'passflow';
const SCHEMA = 'passflow.website.v1';
const frameWidths = { desktop: 1440, tablet: 834, mobile: 390 };
const frameLabel = (role) => role.charAt(0).toUpperCase() + role.slice(1) + ' ' + frameWidths[role];
const frameOffset = { desktop: 0, tablet: 1600, mobile: 2600 };
const bindings = ['eventName', 'eventDescription', 'eventDate', 'venue', 'venueMap', 'logo', 'banner', 'tickets', 'register', 'myPass', 'schedule', 'speakers', 'sponsors', 'customLink', 'formSlot', 'passSlot'];
const blocks = ['Navbar', 'Hero', 'About', 'Tickets', 'Schedule', 'Speakers', 'Sponsors', 'Venue', 'FAQ', 'CTA', 'Footer'];
let session = null;
let tickets = [];
function setTickets(list) { tickets = Array.isArray(list) ? list.filter(t => t && typeof t.id === 'string' && typeof t.name === 'string').slice(0, 50) : []; figma.ui.postMessage({ type: 'tickets', tickets }); }
let mutating = false, syncing = false, blocked = false, confirmed = false, commandPending = false;
let documentId = figma.root.getSharedPluginData(NS, 'documentId');
if (!documentId) {
    documentId = 'doc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
    figma.root.setSharedPluginData(NS, 'documentId', documentId);
}
const storageKey = 'passflow.session.v2.' + documentId;
function status(state, message = '') {
    var _a;
    figma.ui.postMessage({ type: 'status', state, message, eventName: (_a = session === null || session === void 0 ? void 0 : session.eventName) !== null && _a !== void 0 ? _a : '', draftId: session === null || session === void 0 ? void 0 : session.draftId, eventId: session === null || session === void 0 ? void 0 : session.eventId });
}
function selectionState() {
    var _a, _b, _c;
    const selected = figma.currentPage.selection;
    const node = selected.length === 1 ? selected[0] : null;
    figma.ui.postMessage({
        type: 'selection',
        single: !!node,
        frame: !!node && node.type === 'FRAME' && node.parent === figma.currentPage,
        name: (_a = node === null || node === void 0 ? void 0 : node.name) !== null && _a !== void 0 ? _a : 'Nothing selected',
        binding: (_b = node === null || node === void 0 ? void 0 : node.getSharedPluginData(NS, 'binding')) !== null && _b !== void 0 ? _b : '',
        frameRole: (_c = node === null || node === void 0 ? void 0 : node.getSharedPluginData(NS, 'frame')) !== null && _c !== void 0 ? _c : ''
    });
}
function solid(hex) {
    return { type: 'SOLID', color: { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 } };
}
function hex(paints, fallback = '#ffffff') {
    const p = Array.isArray(paints) ? paints.find(p => p.type === 'SOLID' && p.visible !== false) : null;
    return (p === null || p === void 0 ? void 0 : p.type) === 'SOLID' ? '#' + [p.color.r, p.color.g, p.color.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('') : fallback;
}
function bind(node, binding, href = '') {
    node.setSharedPluginData(NS, 'binding', binding);
    node.setSharedPluginData(NS, 'href', href);
    node.setSharedPluginData(NS, 'schema', SCHEMA);
    if (!node.getSharedPluginData(NS, 'id'))
        node.setSharedPluginData(NS, 'id', node.id);
}
const inter = (style) => ({ family: 'Inter', style });
async function font(wanted, fallback) {
    try {
        await figma.loadFontAsync(wanted);
        return wanted;
    }
    catch (_a) {
        await figma.loadFontAsync(fallback);
        return fallback;
    }
}
async function theme(style) {
    const body = await font(inter('Regular'), inter('Regular')), bodyMedium = await font(inter('Medium'), body), bodyBold = await font(inter('Semi Bold'), body);
    if (style === 'festival')
        return { bg: '#0f0f10', surface: '#1c1c1f', alt: '#161618', ink: '#f6f5f0', muted: '#a3a29b', accent: '#ff5c35', accentInk: '#0f0f10', accentHover: '#ff8a66', kicker: '#c6f432', line: '#2e2e33', radius: 28, buttonRadius: 999,
            display: await font(inter('Black'), inter('Bold')), body, bodyMedium, bodyBold, upper: true, tracking: -3, heroSize: [132, 54], stickers: ['#ff5c35', '#c6f432', '#7c5cff'] };
    return { bg: '#ffffff', surface: '#ffffff', alt: '#f5f5f3', ink: '#242421', muted: '#74736d', accent: '#242421', accentInk: '#ffffff', accentHover: '#4a4a45', kicker: '#74736d', line: '#e6e5df', radius: 24, buttonRadius: 999,
        display: await font(inter('Bold'), bodyBold), body, bodyMedium, bodyBold, upper: false, tracking: -3, heroSize: [96, 46], stickers: ['#ff6b4a', '#4f7cff', '#ffc93c'] };
}
function box(name, dir, o = {}, node) {
    var _a, _b, _c, _d, _e;
    const f = (node !== null && node !== void 0 ? node : figma.createFrame());
    f.name = name;
    f.layoutMode = dir;
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = 'AUTO';
    f.itemSpacing = (_a = o.gap) !== null && _a !== void 0 ? _a : 0;
    const [py, px] = (_b = o.pad) !== null && _b !== void 0 ? _b : [0, 0];
    f.paddingTop = py;
    f.paddingBottom = py;
    f.paddingLeft = px;
    f.paddingRight = px;
    f.fills = o.fill ? [solid(o.fill)] : [];
    f.cornerRadius = (_c = o.radius) !== null && _c !== void 0 ? _c : 0;
    if (o.stroke) {
        f.strokes = [solid(o.stroke)];
        f.strokeWeight = 1;
    }
    f.primaryAxisAlignItems = (_d = o.align) !== null && _d !== void 0 ? _d : 'MIN';
    f.counterAxisAlignItems = (_e = o.cross) !== null && _e !== void 0 ? _e : 'MIN';
    f.clipsContent = false;
    return f;
}
// Fill the parent's width; `width` keeps the starting geometry sensible before Figma reflows.
function fillW(node, width) {
    node.resize(Math.max(1, width), Math.max(1, node.height));
    node.layoutSizingHorizontal = 'FILL';
    if (node.type === 'TEXT')
        node.textAutoResize = 'HEIGHT';
    else
        node.layoutSizingVertical = 'HUG';
}
function fixW(node, width) {
    node.resize(Math.max(1, width), Math.max(1, node.height));
    node.layoutSizingHorizontal = 'FIXED';
    if (node.type === 'TEXT')
        node.textAutoResize = 'HEIGHT';
    else
        node.layoutSizingVertical = 'HUG';
}
function txt(parent, chars, o) {
    const n = figma.createText();
    n.fontName = o.font;
    n.characters = chars;
    n.fontSize = o.size;
    n.fills = [solid(o.color)];
    if (o.lh)
        n.lineHeight = { unit: 'PERCENT', value: o.lh * 100 };
    if (o.ls)
        n.letterSpacing = { unit: 'PERCENT', value: o.ls };
    if (o.align)
        n.textAlignHorizontal = o.align;
    if (o.opacity !== undefined)
        n.opacity = o.opacity;
    parent.appendChild(n);
    n.textAutoResize = 'WIDTH_AND_HEIGHT';
    return n;
}
function firstText(node) {
    if (node.type === 'TEXT')
        return node;
    if ('children' in node)
        for (const child of node.children) {
            const found = firstText(child);
            if (found)
                return found;
        }
    return null;
}
const ease = { type: 'EASE_OUT' };
// Buttons are a component set (State=Default/Hover) wired with "While hovering → Change to",
// the same native pattern designers use; PassFlow turns it into a CSS hover.
async function buttons(t, style, x, y) {
    const make = (kind, state) => {
        const hover = state === 'Hover';
        const fill = kind === 'primary' ? (hover ? t.accentHover : t.accent) : kind === 'inverse' ? (hover ? t.alt : t.accentInk) : (hover ? t.ink : undefined);
        const ink = kind === 'primary' ? t.accentInk : kind === 'inverse' ? t.accent : (hover ? t.bg : t.ink);
        const c = box('State=' + state, 'HORIZONTAL', { fill, stroke: kind === 'secondary' ? t.ink : undefined, pad: [15, 26], radius: t.buttonRadius, align: 'CENTER', cross: 'CENTER' }, figma.createComponent());
        figma.currentPage.appendChild(c);
        txt(c, 'Button', { size: 17, font: t.bodyBold, color: ink });
        return c;
    };
    const result = {};
    let offset = 0;
    for (const kind of ['primary', 'secondary', 'inverse']) {
        const name = 'PassFlow ' + style + ' · ' + kind + ' button';
        const existing = figma.currentPage.children.find(n => n.type === 'COMPONENT_SET' && n.name === name);
        const reuse = existing === null || existing === void 0 ? void 0 : existing.children.find(n => n.type === 'COMPONENT' && n.name === 'State=Default');
        if (reuse) {
            result[kind] = reuse;
            continue;
        }
        const base = make(kind, 'Default'), hover = make(kind, 'Hover');
        // Figma rejects Change to until both states are variants of the same set, so combine first.
        const set = figma.combineAsVariants([base, hover], figma.currentPage);
        await base.setReactionsAsync([{ trigger: { type: 'ON_HOVER' }, actions: [{ type: 'NODE', destinationId: hover.id, navigation: 'CHANGE_TO', transition: { type: 'SMART_ANIMATE', easing: ease, duration: .18 } }] }]);
        set.name = name;
        set.layoutMode = 'HORIZONTAL';
        set.itemSpacing = 16;
        set.paddingTop = 16;
        set.paddingBottom = 16;
        set.paddingLeft = 16;
        set.paddingRight = 16;
        set.x = x;
        set.y = y + offset;
        offset += 110;
        result[kind] = base;
    }
    return result;
}
function button(parent, b, label, kind, size) {
    const i = b[kind].createInstance();
    parent.appendChild(i);
    const text = firstText(i);
    if (text) {
        text.characters = label;
        text.fontSize = size;
    }
    if (size < 16) {
        i.paddingTop = 10;
        i.paddingBottom = 10;
        i.paddingLeft = 18;
        i.paddingRight = 18;
    }
    return i;
}
function register(node) {
    node.setSharedPluginData(NS, 'binding', 'register');
    node.setSharedPluginData(NS, 'schema', SCHEMA);
    if (!node.getSharedPluginData(NS, 'id'))
        node.setSharedPluginData(NS, 'id', node.id);
}
// Marks a layer that should "Scroll to" a section; wired once the target section exists.
function scrollTo(node, block) { node.setSharedPluginData(NS, 'scrollTo', block); }
async function wireScrolls(frame) {
    const targets = new Map(frame.children.map(c => [c.getSharedPluginData(NS, 'block'), c]));
    const visit = async (node) => {
        const target = targets.get(node.getSharedPluginData(NS, 'scrollTo'));
        if (target && 'setReactionsAsync' in node)
            await node.setReactionsAsync([...node.reactions.filter(r => { var _a; return ((_a = r.trigger) === null || _a === void 0 ? void 0 : _a.type) !== 'ON_CLICK'; }), { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: target.id, navigation: 'SCROLL_TO', transition: { type: 'SCROLL_ANIMATE', easing: ease, duration: .4 } }] }]);
        if ('children' in node)
            for (const child of node.children)
                await visit(child);
    };
    for (const child of frame.children)
        await visit(child);
}
async function openLink(node, url) {
    if ('setReactionsAsync' in node)
        await node.setReactionsAsync([...node.reactions.filter(r => { var _a; return ((_a = r.trigger) === null || _a === void 0 ? void 0 : _a.type) !== 'ON_CLICK'; }), { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'URL', url, openInNewTab: true }] }]);
}
function sticker(parent, kind, color, size, x, y) {
    const s = kind === 'star' ? figma.createStar() : figma.createEllipse();
    s.name = 'Sticker';
    parent.appendChild(s);
    s.layoutPositioning = 'ABSOLUTE';
    s.resize(size, size);
    s.x = x;
    s.y = y;
    s.fills = [solid(color)];
}
function kicker(parent, t, label) {
    return txt(parent, label.toUpperCase(), { size: 13, font: t.bodyBold, color: t.kicker, ls: 12 });
}
function heading(parent, t, label, mobile, width) {
    const h = txt(parent, t.upper ? label.toUpperCase() : label, { size: mobile ? 34 : 56, font: t.display, color: t.ink, lh: 1.04, ls: t.tracking });
    fillW(h, width);
    return h;
}
function card(parent, t, name, width, dir = 'VERTICAL') {
    const c = box(name, dir, { fill: t.surface, stroke: t.line, gap: dir === 'VERTICAL' ? 10 : 16, pad: [22, 24], radius: t.radius, align: dir === 'HORIZONTAL' ? 'SPACE_BETWEEN' : 'MIN', cross: dir === 'HORIZONTAL' ? 'CENTER' : 'MIN' });
    parent.appendChild(c);
    fillW(c, width);
    return c;
}
function chip(parent, t, label, fill, ink) {
    const c = box(label, 'HORIZONTAL', { fill, stroke: fill === t.bg ? t.line : undefined, pad: [9, 16], radius: t.buttonRadius, cross: 'CENTER' });
    parent.appendChild(c);
    txt(c, label, { size: 14, font: t.bodyMedium, color: ink });
}
// The area where PassFlow renders its live sign-up form or attendee pass. Style around it freely; keep enough height.
function slotBox(parent, binding, width, height, t) {
    var _a, _b, _c;
    const slot = figma.createFrame();
    parent.appendChild(slot);
    slot.name = binding === 'formSlot' ? 'Form slot · PassFlow sign-up form' : 'Pass slot · attendee QR pass';
    slot.resize(width, height);
    slot.fills = [solid((_a = t === null || t === void 0 ? void 0 : t.alt) !== null && _a !== void 0 ? _a : '#f5f5f3')];
    slot.strokes = [solid((_b = t === null || t === void 0 ? void 0 : t.line) !== null && _b !== void 0 ? _b : '#d9d8d2')];
    slot.strokeWeight = 1;
    slot.dashPattern = [8, 6];
    slot.cornerRadius = (_c = t === null || t === void 0 ? void 0 : t.radius) !== null && _c !== void 0 ? _c : 20;
    slot.layoutMode = 'VERTICAL';
    slot.primaryAxisSizingMode = 'FIXED';
    slot.counterAxisSizingMode = 'FIXED';
    slot.primaryAxisAlignItems = 'CENTER';
    slot.counterAxisAlignItems = 'CENTER';
    if (parent.layoutMode !== 'NONE') {
        slot.layoutSizingHorizontal = 'FILL';
        slot.layoutSizingVertical = 'FIXED';
    }
    if (t)
        txt(slot, binding === 'formSlot' ? 'PassFlow sign-up form appears here' : 'Attendee QR pass appears here', { size: 15, font: t.bodyMedium, color: t.muted, align: 'CENTER' });
    bind(slot, binding);
    return slot;
}
async function block(parent, name, style, b, title = '') {
    if (style === 'blank')
        throw Error('Pick Minimal or Festival to insert ready-made sections.');
    const t = await theme(style), w = parent.width, mobile = w < 600, tablet = !mobile && w < 1100, stack = mobile || tablet, pad = mobile ? 24 : tablet ? 56 : 96, cw = w - pad * 2, D = (s) => t.upper ? s.toUpperCase() : s;
    b = b !== null && b !== void 0 ? b : await buttons(t, style, parent.x - 420, parent.y);
    if (name === 'Navbar') {
        const nav = box('Navbar', 'HORIZONTAL', { fill: t.bg, pad: [mobile ? 12 : 16, pad], align: 'SPACE_BETWEEN', cross: 'CENTER' });
        parent.insertChild(0, nav);
        fillW(nav, w);
        nav.setSharedPluginData(NS, 'sticky', 'true');
        nav.setSharedPluginData(NS, 'block', 'navbar');
        nav.setSharedPluginData(NS, 'schema', SCHEMA);
        txt(nav, 'Your event', { size: mobile ? 16 : 18, font: t.bodyBold, color: t.ink });
        if (!mobile && pageOf(parent) === 'home') {
            const links = box('Links', 'HORIZONTAL', { gap: 32, cross: 'CENTER' });
            nav.appendChild(links);
            for (const [label, target] of [['Tickets', 'tickets'], ['Schedule', 'schedule'], ['Speakers', 'speakers'], ['Venue', 'venue']])
                scrollTo(txt(links, label, { size: 15, font: t.bodyMedium, color: t.muted }), target);
        }
        register(button(nav, b, 'Register', 'primary', mobile ? 13 : 14));
        return;
    }
    const fill = ['Tickets', 'Speakers', 'Venue', 'Footer'].includes(name) ? t.alt : t.bg;
    const py = name === 'Footer' ? (mobile ? 28 : 40) : name === 'Hero' ? (mobile ? 56 : 128) : (mobile ? 64 : 112);
    const sec = box(name, 'VERTICAL', { fill, gap: mobile ? 18 : 26, pad: [py, pad] });
    parent.appendChild(sec);
    fillW(sec, w);
    sec.setSharedPluginData(NS, 'block', name.toLowerCase());
    sec.setSharedPluginData(NS, 'schema', SCHEMA);
    // Starter sections ease in on scroll; designers change or clear it under Advanced.
    if (name !== 'Footer')
        sec.setSharedPluginData(NS, 'enter', name === 'Hero' || name === 'Page header' ? 'fade' : 'up');
    if (name === 'Page header') {
        const page = pageOf(parent), ticket = page === 'ticket', pass = page === 'pass';
        kicker(sec, t, ticket ? 'Tickets' : pass ? 'Your pass' : 'Your event');
        fillW(txt(sec, D(title), { size: mobile ? 44 : 80, font: t.display, color: t.ink, lh: .98, ls: t.tracking }), cw);
        fillW(txt(sec, ticket ? 'Choose a pass below. Sign-up takes about a minute.' : pass ? 'Show this QR at the entrance. It also works offline once loaded.' : 'Write this page in Figma. Link to it from any button with Prototype → Navigate to.', { size: mobile ? 17 : 21, font: t.body, color: t.muted, lh: 1.5 }), cw);
        return;
    }
    if (name === 'Form slot' || name === 'Pass slot') {
        sec.setSharedPluginData(NS, 'enter', '');
        slotBox(sec, name === 'Form slot' ? 'formSlot' : 'passSlot', cw, mobile ? 560 : 640, t);
        return;
    }
    if (name === 'Hero') {
        const center = style === 'minimal', align = center ? 'CENTER' : 'LEFT';
        if (center)
            sec.counterAxisAlignItems = 'CENTER';
        const meta = box('Event details', 'HORIZONTAL', { gap: 10, cross: 'CENTER' });
        sec.appendChild(meta);
        chip(meta, t, '27 September 2026', style === 'festival' ? t.accent : t.bg, style === 'festival' ? t.accentInk : t.ink);
        chip(meta, t, 'Jakarta', style === 'festival' ? t.kicker : t.bg, style === 'festival' ? t.accentInk : t.ink);
        fillW(txt(sec, D('Your event starts here'), { size: mobile ? t.heroSize[1] : tablet ? Math.round(t.heroSize[0] * .72) : t.heroSize[0], font: t.display, color: t.ink, lh: .94, ls: t.tracking, align }), cw);
        const desc = txt(sec, 'A purposeful gathering. A space for new ideas, new people and a day worth remembering.', { size: mobile ? 17 : 22, font: t.body, color: t.muted, lh: 1.5, align });
        if (mobile)
            fillW(desc, cw);
        else
            fixW(desc, 640);
        const actions = box('Actions', 'HORIZONTAL', { gap: 12, cross: 'CENTER' });
        sec.appendChild(actions);
        register(button(actions, b, 'Register now', 'primary', mobile ? 15 : 17));
        scrollTo(button(actions, b, 'See schedule', 'secondary', mobile ? 15 : 17), 'schedule');
        if (!mobile || style === 'festival') {
            const size = mobile ? 34 : 60;
            t.stickers.forEach((c, i) => sticker(sec, i === 1 ? 'star' : 'circle', c, Math.round(size * (i ? 0.7 : 1)), w - pad - size * (1 + i * 1.25), (mobile ? 20 : 64) + i * Math.round(size * 0.55)));
        }
        return;
    }
    if (name === 'About') {
        kicker(sec, t, 'About');
        const row = box('About row', stack ? 'VERTICAL' : 'HORIZONTAL', { gap: stack ? 14 : 80 });
        sec.appendChild(row);
        fillW(row, cw);
        const h = txt(row, D('Why this gathering matters'), { size: mobile ? 32 : 48, font: t.display, color: t.ink, lh: 1.05, ls: t.tracking });
        const p = txt(row, 'Tell people what they will experience, who it is for and why it is worth showing up.', { size: mobile ? 17 : 21, font: t.body, color: t.muted, lh: 1.55 });
        if (stack) {
            fillW(h, cw);
            fillW(p, cw);
        }
        else {
            fixW(h, 440);
            fillW(p, cw - 520);
        }
        return;
    }
    if (name === 'Tickets') {
        kicker(sec, t, 'Tickets');
        heading(sec, t, 'Choose your pass', mobile, cw);
        // The only live block: prices and availability come from PassFlow.
        const list = box('Live tickets · from PassFlow', 'VERTICAL', { gap: 10 });
        sec.appendChild(list);
        fillW(list, cw);
        bind(list, 'tickets');
        for (const [a, c] of [['Early bird', 'IDR 150,000'], ['Regular', 'IDR 250,000'], ['VIP', 'IDR 500,000']]) {
            const row = card(list, t, a, cw, 'HORIZONTAL');
            txt(row, a, { size: mobile ? 16 : 18, font: t.bodyBold, color: t.ink });
            txt(row, c, { size: mobile ? 15 : 16, font: t.body, color: t.muted });
        }
        txt(sec, 'Live ticket names, prices and availability replace these placeholders.', { size: 13, font: t.body, color: t.muted });
        return;
    }
    if (name === 'Schedule') {
        kicker(sec, t, 'Schedule');
        heading(sec, t, 'How the day unfolds', mobile, cw);
        for (const [time, title] of [['09:00', 'Doors open'], ['10:00', 'Opening keynote'], ['13:00', 'Sessions and workshops'], ['17:00', 'Closing and networking']]) {
            const row = card(sec, t, title, cw, 'HORIZONTAL');
            txt(row, title, { size: mobile ? 16 : 18, font: t.bodyBold, color: t.ink });
            txt(row, time, { size: mobile ? 15 : 16, font: t.body, color: t.muted });
        }
        return;
    }
    if (name === 'Speakers') {
        kicker(sec, t, 'Speakers');
        heading(sec, t, 'Voices you will hear', mobile, cw);
        const grid = box('Speaker grid', mobile ? 'VERTICAL' : 'HORIZONTAL', { gap: 16 });
        sec.appendChild(grid);
        fillW(grid, cw);
        const cardW = mobile ? cw : (cw - 32) / 3;
        for (let i = 0; i < 3; i++) {
            const c = card(grid, t, 'Speaker ' + (i + 1), cardW);
            const avatar = figma.createEllipse();
            c.appendChild(avatar);
            avatar.resize(64, 64);
            avatar.fills = [solid(t.stickers[i % t.stickers.length])];
            txt(c, 'Speaker name', { size: 19, font: t.bodyBold, color: t.ink });
            txt(c, 'Role · Company', { size: 15, font: t.body, color: t.muted });
        }
        return;
    }
    if (name === 'Sponsors') {
        kicker(sec, t, 'Partners');
        heading(sec, t, 'Supported by', mobile, cw);
        const row = box('Sponsor logos', 'HORIZONTAL', { gap: 12 });
        sec.appendChild(row);
        fillW(row, cw);
        const n = mobile ? 2 : 4, tileW = (cw - 12 * (n - 1)) / n;
        for (let i = 0; i < n; i++) {
            const c = card(row, t, 'Sponsor ' + (i + 1), tileW);
            txt(c, 'Logo', { size: 15, font: t.bodyMedium, color: t.muted });
        }
        return;
    }
    if (name === 'Venue') {
        const row = box('Venue row', stack ? 'VERTICAL' : 'HORIZONTAL', { gap: stack ? 20 : 48 });
        sec.appendChild(row);
        fillW(row, cw);
        const left = box('Venue details', 'VERTICAL', { gap: 14 });
        row.appendChild(left);
        const leftW = stack ? cw : 440;
        if (stack)
            fillW(left, cw);
        else
            fixW(left, leftW);
        kicker(left, t, 'Venue');
        fillW(txt(left, D('Getting there'), { size: mobile ? 34 : 56, font: t.display, color: t.ink, lh: 1.04, ls: t.tracking }), leftW);
        fillW(txt(left, 'Venue name, City', { size: mobile ? 19 : 22, font: t.bodyBold, color: t.ink }), leftW);
        fillW(txt(left, 'Arrival details, entrances and accessibility notes can live here.', { size: 16, font: t.body, color: t.muted, lh: 1.5 }), leftW);
        await openLink(button(left, b, 'Open in Maps', 'secondary', 15), 'https://maps.google.com/?q=Jakarta');
        const map = box('Map artwork', 'VERTICAL', { fill: t.surface, stroke: t.line, radius: t.radius, align: 'CENTER', cross: 'CENTER' });
        row.appendChild(map);
        map.resize(stack ? cw : cw - leftW - 48, mobile ? 220 : 320);
        map.layoutSizingHorizontal = 'FILL';
        map.layoutSizingVertical = 'FIXED';
        txt(map, 'Place a map image here', { size: 15, font: t.body, color: t.muted });
        return;
    }
    if (name === 'FAQ') {
        kicker(sec, t, 'FAQ');
        heading(sec, t, 'Good to know', mobile, cw);
        for (const [q, a] of [['What should I bring?', 'Your event pass, ready on your phone.'], ['Where do I enter?', 'Use the gate shown in your attendee instructions.'], ['Can I transfer my ticket?', 'Contact the organizer before the event day.']]) {
            const c = card(sec, t, q, cw);
            fillW(txt(c, q, { size: mobile ? 17 : 19, font: t.bodyBold, color: t.ink }), cw - 48);
            fillW(txt(c, a, { size: 16, font: t.body, color: t.muted, lh: 1.5 }), cw - 48);
        }
        return;
    }
    if (name === 'CTA') {
        const inner = mobile ? 24 : 80;
        const c = box('Call to action', 'VERTICAL', { fill: t.accent, gap: 22, pad: [mobile ? 44 : 88, inner], radius: t.radius, cross: 'CENTER' });
        sec.appendChild(c);
        fillW(c, cw);
        fillW(txt(c, D('Ready to be there?'), { size: mobile ? 36 : 64, font: t.display, color: t.accentInk, lh: 1.02, ls: t.tracking, align: 'CENTER' }), cw - inner * 2);
        fillW(txt(c, 'Seats are limited. Secure your pass in a minute.', { size: mobile ? 16 : 19, font: t.body, color: t.accentInk, opacity: .75, align: 'CENTER' }), cw - inner * 2);
        register(button(c, b, 'Register now', 'inverse', mobile ? 15 : 17));
        return;
    }
    if (name === 'Footer') {
        const row = box('Footer row', mobile ? 'VERTICAL' : 'HORIZONTAL', { gap: 8, align: mobile ? 'MIN' : 'SPACE_BETWEEN', cross: mobile ? 'MIN' : 'CENTER' });
        sec.appendChild(row);
        fillW(row, cw);
        txt(row, '© 2026 Your event', { size: 14, font: t.body, color: t.muted });
        txt(row, 'Made with PassFlow', { size: 14, font: t.body, color: t.muted });
    }
}
async function template(style) {
    var _a;
    const t = style === 'blank' ? null : await theme(style), created = [];
    const origin = { x: Math.round(figma.viewport.center.x - 980), y: Math.round(figma.viewport.center.y) };
    const b = t ? await buttons(t, style, origin.x - 420, origin.y) : undefined;
    for (const role of ['desktop', 'tablet', 'mobile']) {
        const frame = figma.createFrame();
        figma.currentPage.appendChild(frame);
        frame.name = 'PassFlow Website · ' + frameLabel(role);
        frame.fills = [solid((_a = t === null || t === void 0 ? void 0 : t.bg) !== null && _a !== void 0 ? _a : '#ffffff')];
        frame.setSharedPluginData(NS, 'frame', role);
        frame.setSharedPluginData(NS, 'documentId', documentId);
        frame.setSharedPluginData(NS, 'schema', SCHEMA);
        frame.setSharedPluginData(NS, 'templateStyle', style);
        if (t && b) {
            frame.resize(frameWidths[role], 100);
            frame.layoutMode = 'VERTICAL';
            frame.primaryAxisSizingMode = 'AUTO';
            frame.counterAxisSizingMode = 'FIXED';
            frame.itemSpacing = 0;
            for (const name of blocks)
                await block(frame, name, style, b);
            await wireScrolls(frame);
        }
        else
            frame.resize(frameWidths[role], role === 'mobile' ? 844 : 1024);
        frame.x = origin.x + frameOffset[role];
        frame.y = origin.y;
        created.push(frame);
    }
    figma.currentPage.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
    linkBreakpoints();
    status('Changes detected', style === 'blank' ? 'Blank Desktop and Mobile frames are ready. Design freely, then mark a Register button.' : 'Starter ' + style + ' website inserted. Edit any text; links and hovers come from Figma prototype interactions.');
    selectionState();
}
const reservedPages = ['home', 'claim', 'calendar', 'opengraph-image', 'admin', 'api', 'e'];
const pageSlugOk = (v) => /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(v) && !reservedPages.includes(v);
const pageOf = (n) => ('getSharedPluginData' in n ? n.getSharedPluginData(NS, 'page') : '') || 'home';
function eventFrames() {
    return figma.currentPage.children.filter(n => n.type === 'FRAME' && n.getSharedPluginData(NS, 'documentId') === documentId);
}
// Home is required; extra pages ("ticket" or custom slugs) each need a Desktop frame and may have a Mobile one.
async function pageTemplate(style, slug) {
    var _a;
    if (!pageSlugOk(slug))
        throw Error('Name the page in lowercase, like ticket, agenda or faq.');
    const frames = eventFrames();
    if (frames.some(f => pageOf(f) === slug))
        throw Error('The "' + slug + '" page already exists on this Figma page.');
    const t = style === 'blank' ? null : await theme(style);
    const top = Math.round(Math.max(figma.viewport.center.y, ...frames.map(f => f.y + f.height)) + 200);
    const left = Math.round(frames.length ? Math.min(...frames.map(f => f.x)) : figma.viewport.center.x - 980);
    const b = t ? await buttons(t, style, left - 420, top) : undefined;
    const title = slug === 'ticket' ? 'Get your pass' : slug === 'pass' ? 'Your event pass' : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const slot = slug === 'ticket' ? 'Form slot' : slug === 'pass' ? 'Pass slot' : '';
    const created = [];
    for (const role of ['desktop', 'tablet', 'mobile']) {
        const frame = figma.createFrame();
        figma.currentPage.appendChild(frame);
        frame.name = 'PassFlow ' + (slug === 'ticket' ? 'Ticket page' : slug === 'pass' ? 'Pass page' : 'Page · ' + slug) + ' · ' + frameLabel(role);
        frame.fills = [solid((_a = t === null || t === void 0 ? void 0 : t.bg) !== null && _a !== void 0 ? _a : '#ffffff')];
        frame.setSharedPluginData(NS, 'frame', role);
        frame.setSharedPluginData(NS, 'page', slug);
        frame.setSharedPluginData(NS, 'documentId', documentId);
        frame.setSharedPluginData(NS, 'schema', SCHEMA);
        frame.setSharedPluginData(NS, 'templateStyle', style);
        if (t && b) {
            frame.resize(frameWidths[role], 100);
            frame.layoutMode = 'VERTICAL';
            frame.primaryAxisSizingMode = 'AUTO';
            frame.counterAxisSizingMode = 'FIXED';
            frame.itemSpacing = 0;
            await block(frame, 'Navbar', style, b);
            await block(frame, 'Page header', style, b, title);
            if (slot)
                await block(frame, slot, style, b);
            await block(frame, 'Footer', style, b);
            // The event name in the navbar goes back to Home, using Figma's own Navigate to.
            const home = frames.find(f => pageOf(f) === 'home' && f.getSharedPluginData(NS, 'frame') === role), brand = firstText(frame.children[0]);
            if (home && brand)
                await brand.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: home.id, navigation: 'NAVIGATE', transition: null }] }]);
        }
        else {
            frame.resize(frameWidths[role], role === 'mobile' ? 844 : 1024);
            if (slot) {
                const pad = role === 'mobile' ? 24 : 96, s = slotBox(frame, slot === 'Form slot' ? 'formSlot' : 'passSlot', frameWidths[role] - pad * 2, 640);
                s.x = pad;
                s.y = 160;
            }
        }
        frame.x = left + frameOffset[role];
        frame.y = top;
        created.push(frame);
    }
    figma.currentPage.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
    linkBreakpoints();
    status('Changes detected', slug === 'ticket' ? 'Ticket page added. The sign-up form appears in its Form slot.' : slug === 'pass' ? 'Pass page added. The attendee QR pass appears in its Pass slot.' : '"' + slug + '" page added at /e/your-event/' + slug + '. Link to it with Prototype → Navigate to.');
    selectionState();
}
// ---------- Passes: ID card, digital pass, wristband. Designed at 4 px per mm. ----------
const PX = 4;
const passSizes = { id_card: { w: 54, h: 85.6, label: 'ID card' }, digital: { w: 70, h: 120, label: 'Digital pass' }, wristband: { w: 240, h: 25, label: 'Wristband' } };
const passFields = ['name', 'photo', 'category', 'code', 'qr'];
// Attendee text gets a fixed one-line box; PassFlow shrinks long names to fit it.
function markPass(node, field) {
    node.setSharedPluginData(NS, 'passField', field);
    node.setSharedPluginData(NS, 'schema', SCHEMA);
    if (node.type === 'TEXT' && typeof node.fontSize === 'number') {
        node.textAutoResize = 'NONE';
        node.resize(node.width, Math.ceil(node.fontSize * 1.3));
    }
    return node;
}
function qrPlaceholder(parent, x, y, size) {
    const qr = rect(parent, x, y, size, size, '#ecece8', 1);
    qr.name = 'QR code · filled by PassFlow';
    qr.strokes = [solid('#c9c8c1')];
    qr.strokeWeight = 1;
    qr.dashPattern = [4, 4];
    return markPass(qr, 'qr');
}
function rect(parent, x, y, w, h, fill, radius = 0) {
    const r = figma.createRectangle();
    parent.appendChild(r);
    r.x = x * PX;
    r.y = y * PX;
    r.resize(w * PX, h * PX);
    r.fills = [solid(fill)];
    r.cornerRadius = radius * PX;
    return r;
}
function label(parent, chars, x, y, w, size, font, color, align = 'LEFT') {
    const n = figma.createText();
    parent.appendChild(n);
    n.fontName = font;
    n.characters = chars;
    n.fontSize = size * PX;
    n.fills = [solid(color)];
    n.textAlignHorizontal = align;
    n.x = x * PX;
    n.y = y * PX;
    n.resize(w * PX, n.height);
    n.textAutoResize = 'HEIGHT';
    return n;
}
// Sizes are only starting points: any width and height works, before or after the frame is created.
const MIN_MM = 10, MAX_MM = 2000;
async function passTemplate(style, kind, ticketTypeId = '', w, h) {
    var _a;
    const preset = passSizes[kind];
    if (!preset)
        throw Error('Choose ID card, Digital pass or Wristband.');
    const mm = (v, d) => Number.isFinite(v) ? Math.min(MAX_MM, Math.max(MIN_MM, Math.round(v * 10) / 10)) : d;
    const size = { label: preset.label, w: mm(w, preset.w), h: mm(h, preset.h) };
    const ticket = ticketTypeId ? tickets.find(t => t.id === ticketTypeId) : null;
    if (ticketTypeId && !ticket)
        throw Error('That ticket category is not available. Reopen the plugin to refresh categories.');
    const existing = eventFrames().find(f => f.getSharedPluginData(NS, 'pass') === kind && f.getSharedPluginData(NS, 'ticketType') === ticketTypeId);
    if (existing)
        throw Error('This page already has a ' + size.label + ' frame' + (ticket ? ' for ' + ticket.name : ' for all attendees') + '.');
    const t = style === 'blank' ? null : await theme(style);
    const frame = figma.createFrame();
    figma.currentPage.appendChild(frame);
    frame.name = 'PassFlow ' + size.label + (ticket ? ' · ' + ticket.name : '') + ' · ' + size.w + '×' + size.h + ' mm';
    frame.resize(size.w * PX, size.h * PX);
    frame.fills = [solid((_a = t === null || t === void 0 ? void 0 : t.bg) !== null && _a !== void 0 ? _a : '#ffffff')];
    frame.cornerRadius = kind === 'wristband' ? 0 : 3 * PX;
    frame.clipsContent = true;
    frame.setSharedPluginData(NS, 'pass', kind);
    frame.setSharedPluginData(NS, 'ticketType', ticketTypeId);
    frame.setSharedPluginData(NS, 'documentId', documentId);
    frame.setSharedPluginData(NS, 'schema', SCHEMA);
    const others = eventFrames().filter(f => f !== frame);
    frame.x = Math.round(others.length ? Math.max(...others.map(f => f.x + f.width)) + 200 : figma.viewport.center.x);
    frame.y = Math.round(others.length ? Math.min(...others.map(f => f.y)) : figma.viewport.center.y);
    if (t) {
        const accent = style === 'festival' ? t.accent : t.ink, ink = style === 'festival' ? t.ink : t.ink;
        if (kind === 'wristband') {
            rect(frame, 0, 0, 6, size.h, accent);
            // Wristbands are printed unclaimed, before anyone owns them: only the QR and its code are known.
            const textW = Math.max(20, size.w - 70);
            label(frame, t.upper ? 'YOUR EVENT' : 'Your event', 10, 4, textW, 6.5, t.display, ink);
            label(frame, '27 September 2026 · Jakarta', 10, 14, textW, 3.2, t.body, t.muted);
            markPass(label(frame, 'PF-000001', size.w - 60, 10, 34, 3, t.body, t.muted, 'RIGHT'), 'code');
            qrPlaceholder(frame, size.w - 22, 3.5, 18);
        }
        else {
            const card = kind === 'id_card';
            rect(frame, 0, 0, size.w, card ? 22 : 28, accent);
            label(frame, t.upper ? 'YOUR EVENT' : 'Your event', 5, card ? 6 : 8, size.w - 10, card ? 5 : 6, t.display, style === 'festival' ? t.accentInk : t.accentInk);
            label(frame, '27 September 2026 · Jakarta', 5, card ? 14.5 : 18, size.w - 10, 2.4, t.body, style === 'festival' ? t.accentInk : t.accentInk);
            const photo = figma.createEllipse();
            frame.appendChild(photo);
            photo.name = 'Attendee photo';
            photo.resize(18 * PX, 18 * PX);
            photo.x = 5 * PX;
            photo.y = (card ? 26 : 33) * PX;
            photo.fills = [solid(t.alt)];
            markPass(photo, 'photo');
            markPass(label(frame, 'Full name', 25, card ? 29 : 36, size.w - 30, card ? 3.8 : 4.6, t.bodyBold, t.ink), 'name');
            markPass(label(frame, 'VIP', 25, card ? 36 : 44, size.w - 30, 2.8, t.bodyMedium, t.muted), 'category');
            const qrSize = Math.max(15, Math.min(card ? 24 : 30, size.w - 10)), qrY = Math.max(0, size.h - qrSize - (card ? 8 : 12));
            qrPlaceholder(frame, (size.w - qrSize) / 2, qrY, qrSize);
            markPass(label(frame, 'PF-000001', 5, qrY + qrSize + 1.5, size.w - 10, 2.4, t.body, t.muted, 'CENTER'), 'code');
        }
    }
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
    status('Changes detected', size.label + ' added. Design freely; keep the QR square, at least 15 mm and clear of other layers.');
    selectionState();
}
// A pass becomes a print-resolution background plus attendee layers placed in millimetres.
async function exportPass(frame, kind, warnings) {
    const box = frame.absoluteBoundingBox;
    if (!box)
        throw Error('The pass frame has no bounds.');
    const w = frame.width / PX, h = frame.height / PX, label = passSizes[kind].label;
    if (w < MIN_MM || h < MIN_MM || w > MAX_MM || h > MAX_MM)
        throw Error(label + ' must be between ' + MIN_MM + ' and ' + MAX_MM + ' mm on each side.');
    // About 300 dpi (3× at 4 px/mm), lowered for very large frames to stay inside Figma's export limit.
    const scale = Math.min(3, 4096 / Math.max(frame.width, frame.height));
    const dynamic = frame.findAll(n => n.visible && passFields.includes(n.getSharedPluginData(NS, 'passField')));
    const layers = dynamic.slice(0, 58).map(n => {
        var _a;
        const b = (_a = n.absoluteBoundingBox) !== null && _a !== void 0 ? _a : box, field = n.getSharedPluginData(NS, 'passField'), t = n.type === 'TEXT' ? n : null;
        return { id: n.id, type: field === 'qr' ? 'qr' : field === 'photo' ? 'image' : 'text', field: field === 'qr' ? 'text' : field, text: '', src: '',
            x: (b.x - box.x) / PX, y: (b.y - box.y) / PX, width: b.width / PX, height: b.height / PX,
            fontSize: t && typeof t.fontSize === 'number' ? t.fontSize / PX : 4, color: hex(t === null || t === void 0 ? void 0 : t.fills, '#171717'), fill: '#ffffff', radius: 0,
            align: (t === null || t === void 0 ? void 0 : t.textAlignHorizontal) === 'CENTER' ? 'center' : (t === null || t === void 0 ? void 0 : t.textAlignHorizontal) === 'RIGHT' ? 'right' : 'left', locked: false, hidden: false };
    });
    if (kind === 'wristband' && layers.some(l => ['name', 'photo', 'category'].includes(l.field)))
        warnings.push('Wristband: name, photo and category print blank, because wristbands are printed before attendees claim them. Use the QR and code only.');
    const qr = layers.filter(l => l.type === 'qr');
    if (qr.length !== 1)
        warnings.push(label + ': mark exactly one QR code before publishing.');
    else if (qr[0].width < 15 || Math.abs(qr[0].width - qr[0].height) > .05)
        warnings.push(label + ': the QR must be square and at least 15 mm.');
    const clone = frame.clone();
    try {
        for (const n of clone.findAll(n => passFields.includes(n.getSharedPluginData(NS, 'passField'))))
            n.visible = false;
        let png = await clone.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } }), src = 'data:image/png;base64,' + figma.base64Encode(png);
        if (src.length > 6500000) {
            png = await clone.exportAsync({ format: 'JPG', constraint: { type: 'SCALE', value: scale } });
            src = 'data:image/jpeg;base64,' + figma.base64Encode(png);
        }
        if (src.length > 6500000)
            throw Error(label + ' artwork exceeds 5 MB. Simplify large images.');
        layers.unshift({ id: 'figma-background', type: 'image', field: 'text', text: '', src, x: 0, y: 0, width: w, height: h, fontSize: 4, color: '#171717', fill: '#ffffff', radius: 0, align: 'left', locked: true, hidden: false });
    }
    finally {
        clone.remove();
    }
    return { schema: 1, width: w, height: h, background: hex(frame.fills), foreground: '#171717', accent: '#635bff', font: 'sans', layers, sections: [] };
}
function findFrames() {
    var _a;
    const groups = new Map();
    for (const f of eventFrames()) {
        const role = f.getSharedPluginData(NS, 'frame');
        if (!frameWidths[role])
            continue;
        const g = (_a = groups.get(pageOf(f))) !== null && _a !== void 0 ? _a : { desktop: [], tablet: [], mobile: [] };
        g[role].push(f);
        groups.set(pageOf(f), g);
    }
    const passes = [];
    for (const f of figma.currentPage.children)
        if (f.type === 'FRAME' && f.getSharedPluginData(NS, 'documentId') === documentId) {
            const kind = f.getSharedPluginData(NS, 'pass');
            if (!passSizes[kind])
                continue;
            const ticketTypeId = f.getSharedPluginData(NS, 'ticketType');
            if (passes.some(p => p.kind === kind && p.ticketTypeId === ticketTypeId))
                throw Error('Keep one ' + passSizes[kind].label + ' frame per ticket category on this page.');
            passes.push({ kind, ticketTypeId, frame: f });
        }
    const home = groups.get('home');
    if (!home && passes.length && groups.size === 0)
        return { desktop: undefined, tablet: undefined, mobile: undefined, pages: [], passes };
    if (!home || home.desktop.length !== 1 || home.tablet.length > 1 || home.mobile.length > 1)
        throw Error(home || groups.size ? 'Keep exactly one Home Desktop frame and at most one Home Tablet and Mobile frame on the current page.' : 'Insert a website template or a pass first.');
    const pages = [];
    for (const [slug, g] of groups) {
        if (slug === 'home')
            continue;
        if (!pageSlugOk(slug))
            throw Error('Page "' + slug + '" needs a lowercase name like agenda or ticket.');
        if (g.desktop.length !== 1 || g.tablet.length > 1 || g.mobile.length > 1)
            throw Error('Page "' + slug + '" needs exactly one Desktop frame and at most one Tablet and Mobile frame.');
        pages.push({ slug, desktop: g.desktop[0], tablet: g.tablet[0], mobile: g.mobile[0] });
    }
    if (pages.length > 8)
        throw Error('Use at most 8 extra pages.');
    return { desktop: home.desktop[0], tablet: home.tablet[0], mobile: home.mobile[0], pages, passes };
}
function contractWarnings(frame, label) {
    const found = new Set();
    const visit = (node) => {
        const b = node.getSharedPluginData(NS, 'binding');
        if (b)
            found.add(b);
        if ('children' in node)
            for (const child of node.children)
                visit(child);
    };
    for (const child of frame.children)
        visit(child);
    const warnings = [];
    // PassFlow checks this again on Sync and refuses to publish a broken design.
    if (!found.has('register') && !found.has('tickets'))
        warnings.push(label + ': mark a Register button (or add live Tickets) before publishing.');
    return warnings;
}
function fontWeight(style) {
    const s = style.toLowerCase().replace(/[\s-]/g, '');
    for (const [key, weight] of [['thin', 100], ['extralight', 200], ['ultralight', 200], ['light', 300], ['medium', 500], ['semibold', 600], ['demibold', 600], ['extrabold', 800], ['ultrabold', 800], ['black', 900], ['heavy', 900], ['bold', 700]])
        if (s.includes(key))
            return weight;
    return 400;
}
// The web renderer accepts a short font whitelist; map Figma families onto the closest one.
// Families are passed through and loaded from Google Fonts on the web; odd names fall back to Inter.
function webFamily(family) { return /^[A-Za-z0-9][A-Za-z0-9 \-]{0,39}$/.test(family) ? family : 'Inter'; }
function hexA(paints, fallback = '') {
    var _a;
    const p = Array.isArray(paints) ? paints.find(p => p.type === 'SOLID' && p.visible !== false) : undefined;
    if (!p || p.type !== 'SOLID')
        return fallback;
    const base = '#' + [p.color.r, p.color.g, p.color.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''), a = (_a = p.opacity) !== null && _a !== void 0 ? _a : 1;
    return a < 1 ? base + Math.round(a * 255).toString(16).padStart(2, '0') : base;
}
const rgba = (c, alpha = 1) => '#' + [c.r, c.g, c.b, c.a * alpha].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
function gradientOf(paints) {
    const g = paints.find(p => p.visible !== false && (p.type === 'GRADIENT_LINEAR' || p.type === 'GRADIENT_RADIAL'));
    if (!g || (g.type !== 'GRADIENT_LINEAR' && g.type !== 'GRADIENT_RADIAL'))
        return null;
    // The gradient runs along +x in gradient space; mapped back to the layer, its direction is (d,-c).
    const [, [c, d]] = g.gradientTransform;
    return { type: g.type === 'GRADIENT_RADIAL' ? 'radial' : 'linear', angle: Math.round(Math.atan2(d, c) * 180 / Math.PI), stops: g.gradientStops.slice(0, 8).map(s => { var _a; return ({ color: rgba(s.color, (_a = g.opacity) !== null && _a !== void 0 ? _a : 1), pos: s.position }); }) };
}
async function bgOf(paints, warnings) {
    var _a;
    const p = paints.find(p => p.type === 'IMAGE' && p.visible !== false);
    if (!p || p.type !== 'IMAGE' || !p.imageHash)
        return null;
    const bytes = await ((_a = figma.getImageByHash(p.imageHash)) === null || _a === void 0 ? void 0 : _a.getBytesAsync());
    if (!bytes)
        return null;
    const mime = bytes[0] === 0x89 ? 'png' : bytes[0] === 0xff ? 'jpeg' : bytes[0] === 0x52 ? 'webp' : '';
    if (!mime || bytes.length > 5 * 1024 * 1024) {
        warnings.push('A background image is larger than 5 MB or not PNG/JPG/WebP and was skipped.');
        return null;
    }
    return { image: 'data:image/' + mime + ';base64,' + figma.base64Encode(bytes), fit: p.scaleMode === 'FIT' ? 'contain' : 'cover' };
}
function shadowsOf(node) {
    var _a;
    if (!('effects' in node))
        return [];
    const out = [];
    for (const e of node.effects)
        if (e.visible && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'))
            out.push({ x: e.offset.x, y: e.offset.y, blur: e.radius, spread: (_a = e.spread) !== null && _a !== void 0 ? _a : 0, color: rgba(e.color), inset: e.type === 'INNER_SHADOW' });
    return out.slice(0, 4);
}
function spansOf(t) {
    if (t.fontName !== figma.mixed && t.fontSize !== figma.mixed && t.fills !== figma.mixed && t.textDecoration !== figma.mixed)
        return [];
    return t.getStyledTextSegments(['fontName', 'fontSize', 'fills', 'textDecoration']).slice(0, 80).map(s => ({ start: s.start, end: s.end, weight: fontWeight(s.fontName.style), color: hexA(s.fills, ''), size: s.fontSize, italic: /italic|oblique/i.test(s.fontName.style), underline: s.textDecoration === 'UNDERLINE' }));
}
const anchorOf = (id) => 's' + id.replace(/[^a-zA-Z0-9]/g, '-');
function cssEase(e) {
    var _a;
    if (!e)
        return 'ease-out';
    if (e.type === 'CUSTOM_CUBIC_BEZIER' && e.easingFunctionCubicBezier) {
        const b = e.easingFunctionCubicBezier;
        return 'cubic-bezier(' + [b.x1, b.y1, b.x2, b.y2].map(v => +v.toFixed(3)).join(',') + ')';
    }
    return (_a = { EASE_IN: 'ease-in', EASE_OUT: 'ease-out', EASE_IN_AND_OUT: 'ease-in-out', LINEAR: 'linear' }[e.type]) !== null && _a !== void 0 ? _a : 'ease-out';
}
// Links and hovers are read from Figma's own prototype interactions, so designers need no extra steps.
async function interactions(node, warnings) {
    var _a, _b, _c, _d, _e, _f, _g;
    let reactions = 'reactions' in node ? node.reactions : [];
    if (!reactions.length && node.type === 'INSTANCE')
        reactions = (_b = (_a = (await node.getMainComponentAsync())) === null || _a === void 0 ? void 0 : _a.reactions) !== null && _b !== void 0 ? _b : [];
    const out = { url: '', scrollTo: '', hover: null };
    for (const r of reactions) {
        const trigger = (_c = r.trigger) === null || _c === void 0 ? void 0 : _c.type;
        for (const a of (_d = r.actions) !== null && _d !== void 0 ? _d : (r.action ? [r.action] : [])) {
            if (trigger === 'ON_CLICK' || trigger === 'ON_PRESS') {
                if (a.type === 'URL') {
                    const url = /^[a-z][a-z0-9+.-]*:/i.test(a.url) ? a.url : 'https://' + a.url;
                    if (/^https:\/\//i.test(url))
                        out.url = url;
                    else
                        warnings.push('Links must start with https://. "' + a.url.slice(0, 60) + '" was skipped.');
                }
                if (a.type === 'NODE' && a.navigation === 'SCROLL_TO' && a.destinationId)
                    out.scrollTo = a.destinationId;
                if (a.type === 'NODE' && a.navigation === 'NAVIGATE' && a.destinationId) {
                    const dest = await figma.getNodeByIdAsync(a.destinationId);
                    if (dest && dest.type === 'FRAME' && dest.getSharedPluginData(NS, 'documentId') === documentId)
                        out.url = 'page:' + pageOf(dest);
                    else
                        warnings.push('A Navigate to link points to a frame that is not a PassFlow page. Mark that frame as a page first.');
                }
            }
            if ((trigger === 'ON_HOVER' || trigger === 'MOUSE_ENTER') && a.type === 'NODE' && a.navigation === 'CHANGE_TO' && a.destinationId) {
                const dest = await figma.getNodeByIdAsync(a.destinationId);
                if (dest && dest.type === 'COMPONENT') {
                    const label = firstText(dest), strokes = Array.isArray(dest.strokes) ? dest.strokes : [];
                    out.hover = { fill: hex(dest.fills, ''), color: label ? hex(label.fills, '') : '', stroke: strokes.length ? hex(strokes, '') : '', opacity: dest.opacity, ms: Math.round(((_f = (_e = a.transition) === null || _e === void 0 ? void 0 : _e.duration) !== null && _f !== void 0 ? _f : .2) * 1000), ease: cssEase((_g = a.transition) === null || _g === void 0 ? void 0 : _g.easing) };
                }
            }
        }
    }
    return out;
}
async function serialize(frame, warnings) {
    const bounds = frame.absoluteBoundingBox;
    if (!bounds)
        throw Error('The frame has no bounds.');
    const nodes = [], byFigmaId = new Map(), scrollTargets = new Set();
    let visited = 0;
    async function visit(node, parentId, parentBox) {
        var _a;
        if (!node.visible)
            return;
        if (++visited > 1500)
            throw Error('Use fewer than 1,500 layers per responsive frame.');
        const box = node.absoluteBoundingBox;
        if (!box || !box.width || !box.height)
            return;
        const raw = node.getSharedPluginData(NS, 'binding'), act = await interactions(node, warnings);
        let binding = bindings.includes(raw) ? raw : null, href = binding ? node.getSharedPluginData(NS, 'href') : '';
        if (!binding && (act.url || act.scrollTo)) {
            binding = 'customLink';
            href = act.url || '#' + anchorOf(act.scrollTo);
        }
        if (act.scrollTo && !act.url)
            scrollTargets.add(act.scrollTo);
        const paints = 'fills' in node ? node.fills : undefined;
        const textNode = node.type === 'TEXT' ? node : null;
        if ('effects' in node && node.effects.some(effect => effect.visible && (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR')))
            warnings.push('Blur effects are not reproduced on the web. Review them in Preview.');
        if ('rotation' in node && Math.abs(node.rotation) > .1 && !binding)
            warnings.push('Rotated artwork is simplified. Review its position in Preview.');
        const children = 'children' in node ? node.children : null;
        if (Array.isArray(paints) && paints.some(p => p.visible !== false && (p.type === 'VIDEO' || p.type === 'GRADIENT_ANGULAR' || p.type === 'GRADIENT_DIAMOND')))
            warnings.push('Video, angular and diamond fills are simplified. Review them in Preview.');
        if ('clipsContent' in node && node.clipsContent)
            warnings.push('Clipped content is simplified. Review masks in Preview.');
        // Bound containers (buttons, live lists) take their typography from the first text inside them.
        const inner = textNode !== null && textNode !== void 0 ? textNode : (binding && 'findOne' in node ? node.findOne(n => n.type === 'TEXT') : children === null || children === void 0 ? void 0 : children.find(n => n.type === 'TEXT'));
        const typo = (inner === null || inner === void 0 ? void 0 : inner.type) === 'TEXT' ? inner : null;
        // Mixed text: the first character's style is the base; spans carry the rest.
        const baseFont = typo ? (typo.fontName !== figma.mixed ? typo.fontName : typo.characters.length ? typo.getRangeFontName(0, 1) : null) : null;
        const baseSize = typo ? (typeof typo.fontSize === 'number' ? typo.fontSize : typo.characters.length ? typo.getRangeFontSize(0, 1) : 20) : 20;
        const size = baseSize;
        const lh = typo === null || typo === void 0 ? void 0 : typo.lineHeight, ls = typo === null || typo === void 0 ? void 0 : typo.letterSpacing;
        const strokes = 'strokes' in node && Array.isArray(node.strokes) ? node.strokes : [];
        const strokeWidth = 'strokeWeight' in node && typeof node.strokeWeight === 'number' && strokes.some(p => p.visible !== false) ? node.strokeWeight : 0;
        const id = node.getSharedPluginData(NS, 'id') || node.id;
        const output = {
            id: nodes.some(n => n.id === id) ? node.id : id, parentId, type: textNode ? 'text' : 'box',
            x: box.x - parentBox.x, y: box.y - parentBox.y, width: box.width, height: box.height,
            text: textNode || binding ? (_a = typo === null || typo === void 0 ? void 0 : typo.characters) !== null && _a !== void 0 ? _a : '' : '',
            fill: hexA(paints, '#ffffff'), hasFill: Array.isArray(paints) && paints.some(p => p.visible !== false && p.type === 'SOLID'),
            color: hexA(typo ? (typo.fills !== figma.mixed ? typo.fills : typo.characters.length ? typo.getRangeFills(0, 1) : undefined) : undefined, '#171717'),
            fontSize: size,
            fontFamily: baseFont ? webFamily(baseFont.family) : 'Inter',
            fontWeight: baseFont ? fontWeight(baseFont.style) : 400,
            italic: !!baseFont && /italic|oblique/i.test(baseFont.style),
            lineHeight: lh && lh !== figma.mixed && typeof lh === 'object' ? Math.min(3, Math.max(.7, lh.unit === 'PIXELS' ? lh.value / size : lh.unit === 'PERCENT' ? lh.value / 100 : 1.2)) : 1.25,
            letterSpacing: ls && ls !== figma.mixed && typeof ls === 'object' ? (ls.unit === 'PIXELS' ? ls.value : ls.value / 100 * size) : 0,
            opacity: 'opacity' in node && typeof node.opacity === 'number' ? node.opacity : 1,
            stroke: strokeWidth ? hexA(strokes, '') : '', strokeWidth,
            sticky: parentId === null && node.getSharedPluginData(NS, 'sticky') === 'true',
            radius: 'cornerRadius' in node && typeof node.cornerRadius === 'number' ? node.cornerRadius : 0,
            align: (textNode === null || textNode === void 0 ? void 0 : textNode.textAlignHorizontal) === 'CENTER' ? 'center' : (textNode === null || textNode === void 0 ? void 0 : textNode.textAlignHorizontal) === 'RIGHT' ? 'right' : binding === 'register' || binding === 'myPass' || (binding === 'customLink' && !textNode) ? 'center' : 'left',
            image: '', binding, href, anchor: '', hover: act.hover,
            bg: children && Array.isArray(paints) ? await bgOf(paints, warnings) : null,
            gradient: children && Array.isArray(paints) ? gradientOf(paints) : null,
            shadows: shadowsOf(node), spans: textNode ? spansOf(textNode) : [],
            enter: node.getSharedPluginData(NS, 'enter')
        };
        byFigmaId.set(node.id, output);
        if ('rotation' in node && Math.abs(node.rotation) > .1 && binding)
            throw Error('Rotated dynamic layers are not supported. Remove rotation before syncing.');
        if (textNode) {
            nodes.push(output);
            return;
        }
        // Live widgets are drawn by PassFlow, so their placeholder children are not exported.
        if (binding && ['tickets', 'schedule', 'speakers', 'sponsors', 'venueMap', 'logo', 'banner'].includes(binding)) {
            nodes.push(output);
            return;
        }
        const raster = !children && (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'ELLIPSE' || node.type === 'POLYGON' || node.type === 'STAR' || (Array.isArray(paints) && paints.some(p => p.type === 'IMAGE' || p.type.startsWith('GRADIENT'))));
        if (raster) {
            const png = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
            output.type = 'image';
            output.image = 'data:image/png;base64,' + figma.base64Encode(png);
            if (output.image.length > 6500000)
                throw Error('An artwork image exceeds 5 MB. Reduce its resolution.');
            nodes.push(output);
            return;
        }
        nodes.push(output);
        if (children)
            for (const child of children)
                await visit(child, output.id, box);
    }
    for (const child of frame.children)
        await visit(child, null, bounds);
    for (const target of scrollTargets) {
        const n = byFigmaId.get(target);
        if (n)
            n.anchor = anchorOf(target);
    }
    if (nodes.length > 500)
        throw Error('Use at most 500 exported layers per frame.');
    if (frame.layoutMode !== 'NONE')
        warnings.push('Auto layout is captured at the current frame size. Compare Desktop and Mobile Preview.');
    return { width: frame.width, height: frame.height, background: hexA(frame.fills, '#ffffff').slice(0, 7), nodes };
}
async function api(path, body, token) {
    const response = await fetch(ORIGIN + '/api/figma/plugin/' + path, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, (token ? { Authorization: 'Bearer ' + token } : {})),
        body: JSON.stringify(body)
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- server JSON, fields checked by the API
    let result = {};
    try {
        result = await response.json();
    }
    catch (_a) { }
    if (!response.ok || result.error) {
        const failure = Error(result.error || 'Request failed');
        failure.issues = result.issues;
        throw failure;
    }
    return result;
}
// Select the layer an issue points at (falling back to its frame), switching page if needed.
async function focusIssue(issue) {
    var _a, _b, _c, _d, _e;
    let node = issue.nodeId ? await figma.getNodeByIdAsync(issue.nodeId) : null;
    if (!node && issue.nodeId)
        node = figma.currentPage.findOne(n => n.getSharedPluginData(NS, 'id') === issue.nodeId);
    if (!node && issue.frame) {
        const f = findFrames(), label = issue.frame, page = /^(.+) page \((Desktop|Tablet|Mobile)\)$/.exec(label);
        const role = (page ? page[2] : label).toLowerCase();
        node = page ? (_b = (_a = f.pages.find(p => p.slug === page[1])) === null || _a === void 0 ? void 0 : _a[role]) !== null && _b !== void 0 ? _b : null : (_e = (_c = f[role]) !== null && _c !== void 0 ? _c : (_d = f.passes.find(p => passSizes[p.kind].label === label)) === null || _d === void 0 ? void 0 : _d.frame) !== null && _e !== void 0 ? _e : null;
    }
    if (!node || !('visible' in node))
        return;
    let page = node;
    while (page && page.type !== 'PAGE')
        page = page.parent;
    if (page && page !== figma.currentPage)
        await figma.setCurrentPageAsync(page);
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
}
function showIssues(issues) { figma.ui.postMessage({ type: 'issues', issues }); }
async function sync() {
    var _a, _b, _c;
    if (!session) {
        status('Disconnected', 'Pair an event first.');
        return;
    }
    if (!confirmed) {
        status('Confirm event', 'Confirm this file should update ' + session.eventName + '. Pair again if this is a copy for another event.');
        return;
    }
    if (syncing || mutating)
        return;
    if (blocked)
        return;
    syncing = true;
    status('Syncing');
    try {
        const frames = findFrames(), warnings = [];
        let document = null;
        if (frames.desktop) {
            warnings.push(...contractWarnings(frames.desktop, 'Desktop'));
            if (frames.mobile)
                warnings.push(...contractWarnings(frames.mobile, 'Mobile'));
            else
                warnings.push('No Mobile frame: PassFlow will use a readable fallback on phones.');
            const pages = [];
            for (const p of frames.pages)
                pages.push({ slug: p.slug, desktop: await serialize(p.desktop, warnings), tablet: p.tablet ? await serialize(p.tablet, warnings) : null, mobile: p.mobile ? await serialize(p.mobile, warnings) : null });
            document = { schema: 3, source: 'figma', desktop: await serialize(frames.desktop, warnings), tablet: frames.tablet ? await serialize(frames.tablet, warnings) : null, mobile: frames.mobile ? await serialize(frames.mobile, warnings) : null, pages, warnings: [...new Set(warnings)] };
            if (JSON.stringify(document).length > 15000000)
                throw Error('Design exceeds 15 MB. Reduce image sizes.');
        }
        const passes = [];
        for (const p of frames.passes)
            passes.push({ kind: p.kind, ticketTypeId: p.ticketTypeId || null, document: await exportPass(p.frame, p.kind, warnings) });
        const result = await api('sync', { documentId, revision: session.revision, document, passes }, session.token);
        session.revision = result.revision;
        session.draftId = result.draftId;
        await figma.clientStorage.setAsync(storageKey, session);
        const serverWarnings = (_a = result.warnings) !== null && _a !== void 0 ? _a : [];
        showIssues(serverWarnings);
        status('Live', 'Your website and passes now show this version.' + (warnings.length ? ' ' + [...new Set(warnings)].join(' ') : ''));
        figma.notify(serverWarnings.length ? 'Live on PassFlow · ' + serverWarnings.length + ' warning' + (serverWarnings.length === 1 ? '' : 's') + ' in the plugin' : 'Live on PassFlow');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed';
        const issues = (_b = error.issues) !== null && _b !== void 0 ? _b : [];
        if (message === 'design_issues' && issues.length) {
            // Nothing was written: the live site keeps its previous version until the design is fixed.
            showIssues(issues);
            const first = (_c = issues.find(i => i.blocking)) !== null && _c !== void 0 ? _c : issues[0];
            figma.notify((first.frame ? first.frame + ': ' : '') + first.message, { error: true, timeout: 10000 });
            await focusIssue(first);
            status('Not published', 'Fix the selected layer, then press Sync. The website still shows the previous version.');
        }
        else {
            blocked = message === 'revision_conflict';
            figma.notify('Sync failed: ' + message, { error: true });
            status('Sync failed', message === 'revision_conflict' ? 'Another session changed this design. Reconnect, then sync again.' : message + ' Your Figma changes are still intact.');
        }
    }
    finally {
        syncing = false;
    }
}
// Edits never publish by themselves: Sync is the publish button.
function schedule() {
    if (session && confirmed)
        status('Changes not live', 'Press Sync to publish them to the website.');
}
figma.showUI(__html__, { width: 390, height: 760, themeColors: true });
figma.on('selectionchange', selectionState);
// dynamic-page forbids figma.on('documentchange') without loadAllPagesAsync; watch only the current page.
// ---------- Breakpoints, like Framer: Desktop → Tablet → Mobile ----------
// Content and style flow down one breakpoint at a time; layout (size, position, font size, spacing) stays per breakpoint.
// Changing a property directly on Tablet or Mobile makes it an override there, so later edits above leave it alone.
const INHERIT = ['characters', 'fills', 'strokes', 'strokeWeight', 'effects', 'visible', 'opacity', 'fontName', 'cornerRadius', 'textCase', 'textDecoration'];
const OVERRIDE = '"override"';
const readProp = (n, p) => { const v = n[p]; return v === undefined || v === figma.mixed ? null : JSON.stringify(v); };
function frameOfNode(n) {
    let c = n;
    while (c && c.parent && c.parent.type !== 'PAGE')
        c = c.parent;
    return c && c.type === 'FRAME' && c.getSharedPluginData(NS, 'documentId') === documentId ? c : null;
}
function lowerFrame(frame) {
    var _a;
    const role = frame.getSharedPluginData(NS, 'frame'), siblings = eventFrames().filter(f => pageOf(f) === pageOf(frame));
    const find = (r) => { var _a; return (_a = siblings.find(f => f.getSharedPluginData(NS, 'frame') === r)) !== null && _a !== void 0 ? _a : null; };
    return role === 'desktop' ? (_a = find('tablet')) !== null && _a !== void 0 ? _a : find('mobile') : role === 'tablet' ? find('mobile') : null;
}
// Match children by name and order among same-named siblings, so a duplicated or template-built frame lines up.
function linkTrees(a, b) {
    try {
        if (!a.getSharedPluginData(NS, 'link'))
            a.setSharedPluginData(NS, 'link', a.id);
        b.setSharedPluginData(NS, 'link', a.getSharedPluginData(NS, 'link'));
        for (const p of INHERIT) {
            const va = readProp(a, p), vb = readProp(b, p);
            if (va !== null && vb !== null)
                b.setSharedPluginData(NS, 'inh:' + p, va === vb ? vb : OVERRIDE);
        }
    }
    catch (_a) {
        return;
    } // some locked or instance layers refuse plugin data; they simply stay per-breakpoint
    if (!('children' in a) || !('children' in b))
        return;
    for (const ca of a.children) {
        const i = a.children.filter(x => x.name === ca.name && x.type === ca.type).indexOf(ca);
        const cb = b.children.filter(x => x.name === ca.name && x.type === ca.type)[i];
        if (cb)
            linkTrees(ca, cb);
    }
}
function linkBreakpoints() {
    let pairs = 0;
    for (const f of eventFrames()) {
        const role = f.getSharedPluginData(NS, 'frame');
        if (role !== 'desktop' && role !== 'tablet')
            continue;
        const lower = lowerFrame(f);
        if (lower) {
            linkTrees(f, lower);
            pairs++;
        }
    }
    return pairs;
}
async function inherit(source, props) {
    var _a;
    const frame = frameOfNode(source), lower = frame && lowerFrame(frame), link = source.getSharedPluginData(NS, 'link');
    if (!lower || !link)
        return;
    const target = lower.getSharedPluginData(NS, 'link') === link ? lower : lower.findOne(n => n.getSharedPluginData(NS, 'link') === link);
    if (!target)
        return;
    const changed = [];
    for (const p of props) {
        const value = readProp(source, p), last = target.getSharedPluginData(NS, 'inh:' + p);
        if (value === null || !(p in target) || !last || readProp(target, p) !== last)
            continue; // not linked, or overridden here
        if (target.type === 'TEXT' && ['characters', 'fontName', 'textCase', 'textDecoration'].includes(p)) {
            for (const f of target.characters.length ? target.getRangeAllFontNames(0, target.characters.length) : [target.fontName])
                await figma.loadFontAsync(f);
            if (p === 'fontName')
                await figma.loadFontAsync(JSON.parse(value));
        }
        try {
            target[p] = JSON.parse(value);
        }
        catch (_b) {
            continue;
        }
        target.setSharedPluginData(NS, 'inh:' + p, (_a = readProp(target, p)) !== null && _a !== void 0 ? _a : value);
        changed.push(p);
    }
    if (changed.length)
        await inherit(target, changed);
}
let inheriting = Promise.resolve();
function flowDown(event) {
    const work = [];
    for (const c of event.nodeChanges) {
        if (c.type !== 'PROPERTY_CHANGE' || c.origin === 'REMOTE' || c.node.removed || !('getSharedPluginData' in c.node))
            continue;
        const node = c.node, props = c.properties.filter((p) => INHERIT.includes(p));
        // Our own writes come back as events; they already match what was recorded, so they are not edits.
        if (props.length && node.getSharedPluginData(NS, 'link') && !props.every(p => node.getSharedPluginData(NS, 'inh:' + p) === readProp(node, p)))
            work.push([node, props]);
    }
    if (work.length)
        inheriting = inheriting.then(async () => { for (const [n, p] of work)
            if (!n.removed)
                await inherit(n, p); }).catch(() => { });
}
let watchedPage = null;
const onNodeChange = (event) => { if (mutating)
    return; schedule(); flowDown(event); };
function watchPage() { watchedPage === null || watchedPage === void 0 ? void 0 : watchedPage.off('nodechange', onNodeChange); watchedPage = figma.currentPage; watchedPage.on('nodechange', onNodeChange); }
watchPage();
figma.on('currentpagechange', () => {
    watchPage();
    confirmed = false;
    status(session ? 'Confirm event' : 'Disconnected', 'Current page changed. Confirm the linked event before this page can sync.');
    selectionState();
});
selectionState();
figma.ui.onmessage = async (message) => {
    var _a;
    if (syncing || commandPending) {
        status('Working', 'Wait for the current operation to finish.');
        return;
    }
    commandPending = true;
    try {
        if (message.type === 'pair') {
            const result = await api('pair', { code: message.code, documentId, fileName: figma.root.name.slice(0, 150) || 'Untitled', fileKey: (_a = figma.fileKey) !== null && _a !== void 0 ? _a : null });
            const paired = { token: result.token, documentId, eventId: result.eventId, eventName: result.eventName, revision: 0 };
            session = paired;
            await figma.clientStorage.setAsync(storageKey, paired);
            figma.root.setSharedPluginData(NS, 'eventId', paired.eventId);
            figma.root.setSharedPluginData(NS, 'eventName', paired.eventName);
            figma.root.setSharedPluginData(NS, 'schema', SCHEMA);
            blocked = false;
            confirmed = true;
            status('Connected', 'Insert a starter template, or assign existing frames in Advanced Mode.');
            try {
                setTickets((await api('sync', { documentId }, paired.token)).tickets);
            }
            catch ( /* categories refresh on next open */_b) { /* categories refresh on next open */ }
            return;
        }
        if (message.type === 'disconnect') {
            session = null;
            blocked = false;
            confirmed = false;
            await figma.clientStorage.deleteAsync(storageKey);
            status('Disconnected', 'Local authorization removed. Revoke the paired file in PassFlow to invalidate it everywhere.');
            return;
        }
        if (message.type === 'confirm') {
            if (session) {
                confirmed = true;
                blocked = false;
                status('Connected', 'This page will sync to ' + session.eventName + '.');
            }
            return;
        }
        if (message.type === 'reload') {
            if (!session)
                return;
            const state = await api('sync', { documentId }, session.token);
            session.revision = state.revision;
            session.draftId = state.draftId;
            setTickets(state.tickets);
            await figma.clientStorage.setAsync(storageKey, session);
            blocked = false;
            status('Connected', 'Reconnected. Press Sync to publish.');
            return;
        }
        if (message.type === 'sync') {
            blocked = false;
            await sync();
            return;
        }
        if (message.type === 'focus') {
            await focusIssue(message.issue);
            return;
        }
        if (message.type === 'link') {
            const pairs = linkBreakpoints();
            status(pairs ? 'Breakpoints linked' : 'Nothing to link', pairs ? 'Edits on Desktop now flow to Tablet and Mobile; Tablet edits flow to Mobile. Changes made directly on a smaller frame stay as overrides.' : 'Add a Desktop frame and a Tablet or Mobile frame first.');
            return;
        }
        mutating = true;
        if (message.type === 'template')
            await template(message.style);
        if (message.type === 'assign') {
            const node = figma.currentPage.selection[0];
            if (figma.currentPage.selection.length !== 1 || !node || !bindings.includes(message.binding))
                throw Error('Select one layer and a valid binding.');
            if (message.binding === 'customLink' && !/^(https:\/\/[^\s]+|#[a-zA-Z][\w-]*)$/.test(message.href))
                throw Error('Use an HTTPS link or a section anchor.');
            bind(node, message.binding, message.binding === 'customLink' ? message.href : '');
            status('Changes detected', 'Binding saved in metadata. Renaming this layer will not break it.');
        }
        if (message.type === 'frame') {
            if (!frameWidths[message.role])
                throw Error('Choose Desktop, Tablet or Mobile.');
            const node = figma.currentPage.selection[0];
            if (figma.currentPage.selection.length !== 1 || (node === null || node === void 0 ? void 0 : node.type) !== 'FRAME')
                throw Error('Select one top-level frame.');
            if (node.parent !== figma.currentPage)
                throw Error('Responsive frames must be top-level on the current page.');
            const page = (message.page || 'home').trim().toLowerCase();
            if (page !== 'home' && !pageSlugOk(page))
                throw Error('Use a lowercase page name like agenda, faq or ticket.');
            node.setSharedPluginData(NS, 'frame', message.role);
            node.setSharedPluginData(NS, 'page', page === 'home' ? '' : page);
            node.setSharedPluginData(NS, 'documentId', documentId);
            node.setSharedPluginData(NS, 'schema', SCHEMA);
            linkBreakpoints();
            status('Changes detected', (page === 'home' ? 'Home' : page === 'ticket' ? 'Ticket page' : page === 'pass' ? 'Pass page' : '"' + page + '" page') + ' ' + message.role + ' frame assigned.');
        }
        if (message.type === 'page')
            await pageTemplate(message.style, (message.page || '').trim().toLowerCase());
        if (message.type === 'pass')
            await passTemplate(message.style, message.kind, message.ticketTypeId || '', Number(message.w), Number(message.h));
        if (message.type === 'enter') {
            const node = figma.currentPage.selection[0];
            if (figma.currentPage.selection.length !== 1 || !node)
                throw Error('Select one layer or section.');
            if (!['', 'fade', 'up', 'scale'].includes(message.value))
                throw Error('Choose a valid animation.');
            node.setSharedPluginData(NS, 'enter', message.value);
            status('Changes detected', message.value ? 'Entrance animation set: ' + message.value + '.' : 'Entrance animation removed.');
        }
        if (message.type === 'passField') {
            const node = figma.currentPage.selection[0];
            if (figma.currentPage.selection.length !== 1 || !node)
                throw Error('Select one layer inside a pass frame.');
            let top = node;
            while (top && top.parent !== figma.currentPage)
                top = top.parent;
            if (!top || top.type !== 'FRAME' || !top.getSharedPluginData(NS, 'pass'))
                throw Error('That layer is not inside a PassFlow pass frame.');
            if (message.field && !passFields.includes(message.field))
                throw Error('Choose a valid attendee field.');
            node.setSharedPluginData(NS, 'passField', message.field);
            status('Changes detected', message.field ? 'Layer now shows the attendee ' + message.field + '.' : 'Attendee field removed; the layer is static artwork again.');
        }
        if (message.type === 'block') {
            if (!blocks.includes(message.block))
                throw Error('Choose a supported block.');
            const frame = figma.currentPage.selection[0];
            if ((frame === null || frame === void 0 ? void 0 : frame.type) !== 'FRAME')
                throw Error('Select a website frame first.');
            await block(frame, message.block, message.style);
            await wireScrolls(frame);
            status('Changes detected', message.block + ' section added.');
        }
        selectionState();
        schedule();
    }
    catch (error) {
        status('Action failed', error instanceof Error ? error.message : 'Please try again.');
    }
    finally {
        mutating = false;
        commandPending = false;
    }
};
commandPending = true;
void figma.clientStorage.getAsync(storageKey).then(async (stored) => {
    if (!(stored === null || stored === void 0 ? void 0 : stored.token)) {
        status('Disconnected', figma.root.getSharedPluginData(NS, 'eventName') ? 'This file remembers an event. Pair on this device to authorize sync.' : 'Pair an event to begin.');
        return;
    }
    session = stored;
    try {
        const result = await api('sync', { documentId }, session.token);
        session.revision = result.revision;
        session.draftId = result.draftId;
        setTickets(result.tickets);
        await figma.clientStorage.setAsync(storageKey, session);
        status('Confirm event', 'Confirm this file should update ' + session.eventName + '. Copied files should be paired again for another event.');
    }
    catch (_a) {
        blocked = true;
        status('Connection expired', 'Create a new pairing code in PassFlow and pair this file again.');
    }
}).catch(() => status('Connection unavailable', 'Device storage could not be read. Reopen the plugin.')).finally(() => { commandPending = false; });
