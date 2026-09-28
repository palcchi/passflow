const ORIGIN = 'https://passflow.my.id';
const NS = 'passflow';
const bindings = ['eventName', 'eventDescription', 'eventDate', 'venue', 'tickets', 'register', 'myPass', 'schedule', 'customLink'];
const blocks = ['Hero', 'About', 'Tickets', 'Schedule', 'Speakers', 'Sponsors', 'Venue', 'FAQ', 'CTA', 'Footer'];
let session = null, mutating = false, syncing = false, dirty = false, blocked = false, confirmed = false, commandPending = false, timer = null;
let documentId = figma.root.getSharedPluginData(NS, 'documentId');
if (!documentId) {
    documentId = 'doc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
    figma.root.setSharedPluginData(NS, 'documentId', documentId);
}
const storageKey = 'passflow.session.v1.' + documentId;
function status(state, message = '') { var _a; figma.ui.postMessage({ type: 'status', state, message, eventName: (_a = session === null || session === void 0 ? void 0 : session.eventName) !== null && _a !== void 0 ? _a : '', draftId: session === null || session === void 0 ? void 0 : session.draftId, eventId: session === null || session === void 0 ? void 0 : session.eventId }); }
function color(hex) { return { type: 'SOLID', color: { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 } }; }
function hex(paints, fallback = '#ffffff') { const p = Array.isArray(paints) ? paints.find(p => p.type === 'SOLID' && p.visible !== false) : null; return (p === null || p === void 0 ? void 0 : p.type) === 'SOLID' ? '#' + [p.color.r, p.color.g, p.color.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('') : fallback; }
function bind(node, binding) { node.setSharedPluginData(NS, 'binding', binding); node.setSharedPluginData(NS, 'schema', '1'); node.setSharedPluginData(NS, 'id', node.id); node.name = 'PassFlow · ' + binding; }
async function text(parent, value, x, y, width, size, binding) {
    const n = figma.createText();
    n.fontName = { family: 'Inter', style: 'Regular' };
    n.characters = value;
    n.fontSize = size;
    n.fills = [color('#171717')];
    parent.appendChild(n);
    n.x = x;
    n.y = y;
    n.resize(width, Math.max(size * 1.5, 50));
    n.textAutoResize = 'HEIGHT';
    if (binding)
        bind(n, binding);
    return n;
}
async function block(parent, name, y) {
    const mobile = parent.width < 600, pad = mobile ? 24 : 80, w = parent.width, h = name === 'Hero' ? (mobile ? 560 : 620) : name === 'Footer' ? 160 : 340;
    const section = figma.createFrame();
    parent.appendChild(section);
    section.name = name;
    section.resize(w, h);
    section.x = 0;
    section.y = y;
    section.fills = [color(name === 'Hero' ? '#eeedf9' : '#ffffff')];
    section.setSharedPluginData(NS, 'block', name.toLowerCase());
    if (name === 'Hero') {
        await text(section, 'Your event starts here', pad, 70, w - pad * 2, mobile ? 42 : 72, 'eventName');
        await text(section, 'A purposeful gathering. A space for new connections.', pad, mobile ? 240 : 260, w - pad * 2, mobile ? 18 : 24, 'eventDescription');
    }
    else {
        await text(section, name, pad, 35, w - pad * 2, mobile ? 30 : 42);
        await text(section, name === 'Schedule' ? '10:00 · Doors open\n11:00 · Main session' : name === 'Speakers' ? 'Add your speakers and their stories.' : name === 'Sponsors' ? 'Your partners and sponsors' : name === 'FAQ' ? 'What should I bring?\nYour event pass, ready on your phone.' : name === 'Footer' ? 'Made for people. Designed by you.' : 'Tell your event story here.', pad, 110, w - pad * 2, mobile ? 17 : 22, name === 'About' ? 'eventDescription' : name === 'Venue' ? 'venue' : undefined);
    }
    if (name === 'Tickets') {
        const list = figma.createFrame();
        section.appendChild(list);
        list.resize(w - pad * 2, 180);
        list.x = pad;
        list.y = 110;
        list.fills = [color('#f4f4f4')];
        list.cornerRadius = 16;
        bind(list, 'tickets');
        await text(list, 'Live tickets from PassFlow', 20, 30, list.width - 40, 20);
    }
    if (name === 'CTA' || name === 'Hero') {
        const button = figma.createFrame();
        section.appendChild(button);
        button.resize(mobile ? 250 : 320, 60);
        button.x = pad;
        button.y = name === 'Hero' ? (mobile ? 440 : 460) : 230;
        button.fills = [color('#635bff')];
        button.cornerRadius = 30;
        bind(button, 'register');
        const label = await text(button, 'Register / open pass', 20, 18, button.width - 40, 20);
        label.fills = [color('#ffffff')];
    }
    return h;
}
async function template() {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const created = [];
    for (const role of ['desktop', 'mobile']) {
        const frame = figma.createFrame();
        figma.currentPage.appendChild(frame);
        frame.name = 'PassFlow website · ' + role;
        frame.resize(role === 'desktop' ? 1440 : 390, 4000);
        frame.x = figma.viewport.center.x + (role === 'desktop' ? -920 : 600);
        frame.y = figma.viewport.center.y;
        frame.fills = [color('#ffffff')];
        frame.setSharedPluginData(NS, 'frame', role);
        frame.setSharedPluginData(NS, 'documentId', documentId);
        let y = 0;
        for (const name of blocks)
            y += await block(frame, name, y);
        frame.resize(frame.width, y);
        created.push(frame);
    }
    figma.currentPage.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
    dirty = true;
    status('Changes detected', 'Starter templates inserted. Edit the Desktop and Mobile frames.');
}
function findFrames() { const all = figma.currentPage.children.filter(n => n.type === 'FRAME' && n.getSharedPluginData(NS, 'documentId') === documentId); const desktop = all.filter(n => n.getSharedPluginData(NS, 'frame') === 'desktop'), mobile = all.filter(n => n.getSharedPluginData(NS, 'frame') === 'mobile'); if (desktop.length !== 1 || mobile.length > 1)
    throw Error('Keep exactly one Desktop frame and at most one Mobile frame for this event on the current page.'); return { desktop: desktop[0], mobile: mobile[0] }; }
async function serialize(frame, warnings) {
    const bounds = frame.absoluteBoundingBox;
    if (!bounds)
        throw Error('The frame has no bounds.');
    const nodes = [];
    let visited = 0;
    async function visit(node) {
        var _a, _b;
        if (!node.visible)
            return;
        if (++visited > 1500)
            throw Error('Use fewer than 1,500 layers per responsive frame.');
        const box = node.absoluteBoundingBox;
        if (!box || !box.width || !box.height)
            return;
        const raw = node.getSharedPluginData(NS, 'binding'), binding = bindings.includes(raw) ? raw : null;
        const paints = 'fills' in node ? node.fills : undefined;
        const textNode = node.type === 'TEXT' ? node : null;
        if ('effects' in node && node.effects.some(effect => effect.visible))
            warnings.push('Layer effects are simplified. Review shadows and blurs in Preview.');
        if ('opacity' in node && node.opacity < 1)
            warnings.push('Layer opacity is simplified. Review translucent layers in Preview.');
        if ('rotation' in node && Math.abs(node.rotation) > .1 && !binding)
            warnings.push('Rotated artwork is simplified. Review its position in Preview.');
        const children = 'children' in node ? node.children : null;
        const buttonText = children === null || children === void 0 ? void 0 : children.find(n => n.type === 'TEXT');
        const id = node.getSharedPluginData(NS, 'id') || node.id;
        const output = { id: nodes.some(n => n.id === id) ? node.id : id, type: textNode ? 'text' : 'box', x: box.x - bounds.x, y: box.y - bounds.y, width: box.width, height: box.height, text: (_a = textNode === null || textNode === void 0 ? void 0 : textNode.characters) !== null && _a !== void 0 ? _a : ((buttonText === null || buttonText === void 0 ? void 0 : buttonText.type) === 'TEXT' ? buttonText.characters : ''), fill: hex(paints), color: hex((_b = textNode === null || textNode === void 0 ? void 0 : textNode.fills) !== null && _b !== void 0 ? _b : ((buttonText === null || buttonText === void 0 ? void 0 : buttonText.type) === 'TEXT' ? buttonText.fills : undefined), '#171717'), fontSize: textNode && typeof textNode.fontSize === 'number' ? textNode.fontSize : (buttonText === null || buttonText === void 0 ? void 0 : buttonText.type) === 'TEXT' && typeof buttonText.fontSize === 'number' ? buttonText.fontSize : 20, fontFamily: textNode && textNode.fontName !== figma.mixed ? textNode.fontName.family : 'Inter', radius: 'cornerRadius' in node && typeof node.cornerRadius === 'number' ? node.cornerRadius : 0, align: (textNode === null || textNode === void 0 ? void 0 : textNode.textAlignHorizontal) === 'CENTER' ? 'center' : (textNode === null || textNode === void 0 ? void 0 : textNode.textAlignHorizontal) === 'RIGHT' ? 'right' : binding === 'register' || binding === 'myPass' ? 'center' : 'left', image: '', binding, href: node.getSharedPluginData(NS, 'href') };
        if ('rotation' in node && Math.abs(node.rotation) > .1 && binding)
            throw Error('Rotated dynamic layers are not supported. Remove rotation before syncing.');
        if (textNode) {
            if (textNode.fontSize === figma.mixed || textNode.fontName === figma.mixed)
                warnings.push('Mixed text styles are simplified. Use one style per text layer.');
            nodes.push(output);
            return;
        }
        if (binding) {
            nodes.push(output);
            return;
        }
        const raster = !children && (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'ELLIPSE' || (Array.isArray(paints) && paints.some(p => p.type === 'IMAGE' || p.type.startsWith('GRADIENT'))));
        if (raster) {
            const png = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
            output.type = 'image';
            output.image = 'data:image/png;base64,' + figma.base64Encode(png);
            if (output.image.length > 450000)
                throw Error('An artwork image exceeds 450 KB. Reduce its resolution.');
            nodes.push(output);
            return;
        }
        if (Array.isArray(paints) && paints.some(p => p.visible !== false))
            nodes.push(output);
        if (children)
            for (const child of children)
                await visit(child);
    }
    for (const child of frame.children)
        await visit(child);
    if (nodes.length > 500)
        throw Error('Use at most 500 exported layers per frame.');
    return { width: frame.width, height: frame.height, background: hex(frame.fills), nodes };
}
async function api(path, body, token) {
    const response = await fetch(ORIGIN + '/api/figma/plugin/' + path, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, (token ? { Authorization: 'Bearer ' + token } : {})), body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok || result.error)
        throw Error(result.error || 'Request failed');
    return result;
}
async function sync() {
    if (!session) {
        status('Disconnected', 'Pair an event first.');
        return;
    }
    if (!confirmed) {
        status('Confirm event', 'Confirm this file should update ' + session.eventName + '. Pair again if this is a copy for another event.');
        return;
    }
    if (syncing || mutating) {
        dirty = true;
        return;
    }
    if (blocked)
        return;
    syncing = true;
    dirty = false;
    status('Syncing');
    try {
        const frames = findFrames(), warnings = [];
        const document = { schema: 2, source: 'figma', desktop: await serialize(frames.desktop, warnings), mobile: frames.mobile ? await serialize(frames.mobile, warnings) : null, warnings: [...new Set(warnings)] };
        if (JSON.stringify(document).length > 850000)
            throw Error('Design exceeds 850 KB. Reduce image sizes.');
        const result = await api('sync', { documentId, revision: session.revision, document }, session.token);
        session.revision = result.revision;
        session.draftId = result.draftId;
        await figma.clientStorage.setAsync(storageKey, session);
        status('Synced', warnings.join(' '));
    }
    catch (error) {
        dirty = true;
        const message = error instanceof Error ? error.message : 'Sync failed';
        blocked = true;
        status('Sync paused', message === 'revision_conflict' ? 'Another session changed the draft. Use Resume after reviewing the current draft.' : message + ' · Your Figma changes are still intact. Use Retry sync.');
    }
    finally {
        syncing = false;
        if (dirty && !blocked)
            schedule();
    }
}
function schedule() { dirty = true; if (confirmed)
    status('Changes detected'); if (timer)
    clearTimeout(timer); if (session && confirmed && !blocked)
    timer = setTimeout(() => { void sync(); }, 1500); }
function nodeChanged() { if (!mutating)
    schedule(); }
let watched = null;
async function watchPage() { const page = figma.currentPage; await page.loadAsync(); if (figma.currentPage !== page)
    return; watched === null || watched === void 0 ? void 0 : watched.off('nodechange', nodeChanged); watched = page; watched.on('nodechange', nodeChanged); }
figma.on('currentpagechange', () => { if (timer)
    clearTimeout(timer); confirmed = false; void watchPage().catch(() => status('Sync paused', 'Page could not be loaded. Reopen the plugin.')); status(session ? 'Confirm event' : 'Disconnected', 'Current page changed. Confirm the event before syncing this page.'); });
figma.showUI(__html__, { width: 380, height: 700, themeColors: true });
void watchPage().catch(() => status('Sync paused', 'Page could not be loaded. Reopen the plugin.'));
figma.ui.onmessage = async (message) => {
    var _a;
    if (syncing || commandPending) {
        status('Working', 'Wait for the current operation to finish.');
        return;
    }
    commandPending = true;
    try {
        if (message.type === 'pair') {
            const result = await api('pair', { code: message.code, documentId, fileName: figma.root.name, fileKey: (_a = figma.fileKey) !== null && _a !== void 0 ? _a : null });
            session = { token: result.token, documentId, eventId: result.eventId, eventName: result.eventName, revision: 0 };
            await figma.clientStorage.setAsync(storageKey, session);
            figma.root.setSharedPluginData(NS, 'eventId', session.eventId);
            figma.root.setSharedPluginData(NS, 'eventName', session.eventName);
            blocked = false;
            confirmed = true;
            status('Connected', 'Insert the starter template, or assign existing frames in Advanced Mode.');
            return;
        }
        if (message.type === 'disconnect') {
            if (timer)
                clearTimeout(timer);
            session = null;
            blocked = false;
            confirmed = false;
            await figma.clientStorage.deleteAsync(storageKey);
            status('Disconnected', 'Local session removed. Revoke the connection in PassFlow to invalidate it everywhere.');
            return;
        }
        if (message.type === 'confirm') {
            if (session) {
                confirmed = true;
                status('Connected', 'This page will sync to ' + session.eventName + '. Edit a layer or use Sync draft.');
            }
            return;
        }
        if (message.type === 'reload') {
            if (!session)
                return;
            const state = await api('sync', { documentId }, session.token);
            session.revision = state.revision;
            blocked = false;
            status('Connected', 'Draft revision refreshed. Retry sync to send your Figma design.');
            return;
        }
        if (message.type === 'sync') {
            blocked = false;
            await sync();
            return;
        }
        mutating = true;
        if (message.type === 'template')
            await template();
        if (message.type === 'assign') {
            const node = figma.currentPage.selection[0];
            if (figma.currentPage.selection.length !== 1 || !node || !bindings.includes(message.binding))
                throw Error('Select one layer and a valid binding.');
            if (message.binding === 'customLink' && !/^(https:\/\/[^\s]+|#[a-zA-Z][\w-]*)$/.test(message.href))
                throw Error('Use an HTTPS link or a section anchor.');
            bind(node, message.binding);
            node.setSharedPluginData(NS, 'href', message.binding === 'customLink' ? message.href : '');
        }
        if (message.type === 'frame') {
            if (!['desktop', 'mobile'].includes(message.role))
                throw Error('Choose Desktop or Mobile.');
            const node = figma.currentPage.selection[0];
            if (figma.currentPage.selection.length !== 1 || (node === null || node === void 0 ? void 0 : node.type) !== 'FRAME')
                throw Error('Select one top-level frame.');
            if (node.parent !== figma.currentPage)
                throw Error('Responsive frames must be on the current page, not nested.');
            node.setSharedPluginData(NS, 'frame', message.role);
            node.setSharedPluginData(NS, 'documentId', documentId);
        }
        if (message.type === 'block') {
            if (!blocks.includes(message.block))
                throw Error('Choose a supported block.');
            const frame = figma.currentPage.selection[0];
            if ((frame === null || frame === void 0 ? void 0 : frame.type) !== 'FRAME')
                throw Error('Select a website frame first.');
            await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
            const height = await block(frame, message.block, frame.height);
            frame.resize(frame.width, frame.height + height);
        }
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
void figma.clientStorage.getAsync(storageKey).then(async (stored) => { if (!(stored === null || stored === void 0 ? void 0 : stored.token)) {
    status('Disconnected', figma.root.getSharedPluginData(NS, 'eventName') ? 'This file remembers an event. Pair on this device to authorize sync.' : 'Pair an event to begin.');
    return;
} session = stored; try {
    const result = await api('sync', { documentId }, stored.token);
    session.revision = result.revision;
    session.draftId = result.draftId;
    status('Confirm event', 'Confirm this file should update ' + session.eventName + '. Copied files must be paired again for another event.');
}
catch (_a) {
    blocked = true;
    status('Connection expired', 'Create a new pairing code or revoke the old connection in PassFlow.');
} }).catch(() => status('Connection unavailable', 'Device storage could not be read. Reopen the plugin.')).finally(() => { commandPending = false; });
