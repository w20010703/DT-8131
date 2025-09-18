/* Ontology Fullscreen Graph — Dating App x Tamagotchi
   - Nodes: User, VirtualPet, Match, AppSystem, OfflineMeeting
   - Edges: owns, is paired with, managed by, facilitates, requires, participates in, enables
   - Features: hover tooltip, click focus, labels, typed colors, radial layout, clean fullscreen lifecycle
*/

let fsScene, fsCamera, fsRenderer, fsControls;
let fsContainer, animationId;
let nodes = [];
let links = [];
let nodeMeshes = [];
let linkLines = [];
let labelSprites = [];
let raycaster, mouse = new THREE.Vector2(), hovered = null, focused = null;
let tooltip;

// Color palette (neutral, readable)
const COLORS = {
  User: 0x3a86ff,
  VirtualPet: 0xffbe0b,
  Match: 0xfb5607,
  AppSystem: 0x8338ec,
  OfflineMeeting: 0x2a9d8f,
  Edge: 0x111111,
  Background: 0xf0f0f0
};

// Ontology graph data
const ontologyGraph = {
  nodes: [
    { id: "User_A", type: "User", label: "User A", size: 0.5 },
    { id: "User_B", type: "User", label: "User B", size: 0.5 },
    { id: "VirtualPet", type: "VirtualPet", label: "Virtual Pet", size: 0.6 },
    { id: "Match", type: "Match", label: "Match", size: 0.55 },
    { id: "AppSystem", type: "AppSystem", label: "App System", size: 0.65 },
    { id: "OfflineMeeting", type: "OfflineMeeting", label: "Offline Meeting", size: 0.6 }
  ],
  links: [
    { source: "User_A", target: "VirtualPet", label: "owns" },
    { source: "User_A", target: "Match", label: "is paired with" },
    { source: "User_B", target: "Match", label: "is paired with" },

    { source: "VirtualPet", target: "AppSystem", label: "managed by" },
    { source: "AppSystem", target: "Match", label: "facilitates" },

    { source: "Match", target: "OfflineMeeting", label: "requires" },
    { source: "User_A", target: "OfflineMeeting", label: "participates in" },
    { source: "User_B", target: "OfflineMeeting", label: "participates in" },

    { source: "OfflineMeeting", target: "VirtualPet", label: "enables pet retrieval" },
    { source: "OfflineMeeting", target: "User_A", label: "icebreaker context" },
    { source: "OfflineMeeting", target: "User_B", label: "icebreaker context" }
  ]
};

// Lifecycle
window.addEventListener('load', () => {
  const btn = document.getElementById('fullscreen-btn');
  if (btn) btn.addEventListener('click', enterFullscreen);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fsContainer && fsContainer.style.display === 'block') {
      exitFullscreen();
    }
  });
});

// Init
function initFullscreen() {
  // Container
  fsContainer = document.createElement('div');
  fsContainer.className = 'fullscreen-canvas';
  Object.assign(fsContainer.style, {
    position: 'fixed', inset: '0', background: '#000', display: 'none', zIndex: '9999'
  });
  document.body.appendChild(fsContainer);

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'fullscreen-threejs-canvas';
  canvas.tabIndex = 0;
  Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
  fsContainer.appendChild(canvas);

  // Back button
  const backButton = document.createElement('button');
  backButton.className = 'back-button';
  backButton.textContent = '← Back to Main';
  Object.assign(backButton.style, {
    position: 'absolute',
    top: '16px', left: '16px',
    padding: '8px 12px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    cursor: 'pointer',
    zIndex: '10000'
  });
  backButton.onclick = exitFullscreen;
  fsContainer.appendChild(backButton);

  // Tooltip
  tooltip = document.createElement('div');
  Object.assign(tooltip.style, {
    position: 'absolute',
    padding: '6px 8px',
    background: 'rgba(0,0,0,0.75)',
    color: '#fff',
    fontSize: '12px',
    borderRadius: '6px',
    pointerEvents: 'none',
    transform: 'translate(-50%, -120%)',
    opacity: '0',
    transition: 'opacity 120ms ease'
  });
  fsContainer.appendChild(tooltip);

  // Scene
  fsScene = new THREE.Scene();
  fsScene.background = new THREE.Color(COLORS.Background);

  // Camera
  fsCamera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);
  fsCamera.position.set(5.5, 4.5, 7.5);

  // Renderer
  fsRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  fsRenderer.setSize(window.innerWidth, window.innerHeight);
  fsRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  fsRenderer.shadowMap.enabled = false;

  // Controls
  fsControls = new THREE.OrbitControls(fsCamera, fsRenderer.domElement);
  fsControls.enableDamping = true;
  fsControls.dampingFactor = 0.1;
  fsControls.enablePan = true;
  fsControls.minDistance = 2;
  fsControls.maxDistance = 30;

  // Raycaster
  raycaster = new THREE.Raycaster();
  fsRenderer.domElement.addEventListener('mousemove', onMouseMove);
  fsRenderer.domElement.addEventListener('click', onClick);

  // Build graph
  createOntologyGraph();

  // Lighting
  addLighting();

  // Animate
  animate();

  // Resize
  window.addEventListener('resize', onResize);
}

function createOntologyGraph() {
  // Simple radial layout by type "rings"
  // ring 0 center = AppSystem
  // ring 1 = Match + VirtualPet
  // ring 2 = User A + User B + OfflineMeeting
  const byType = {
    AppSystem: [],
    Match: [],
    VirtualPet: [],
    User: [],
    OfflineMeeting: []
  };

  ontologyGraph.nodes.forEach(n => {
    byType[n.type]?.push(n);
  });

  // Positions
  const positions = {};
  const center = new THREE.Vector3(0, 0, 0);

  // Ring 0 (center): AppSystem
  placeInCircle(byType.AppSystem, 0.0, 0.0);

  // Ring 1: Match + VirtualPet
  placeInCircle([...byType.Match, ...byType.VirtualPet], 2.0, 0.4);

  // Ring 2: Users + OfflineMeeting
  placeInCircle([...byType.User, ...byType.OfflineMeeting], 3.8, 0.6);

  function placeInCircle(arr, radius, yJitter) {
    if (!arr || arr.length === 0) return;
    const step = (Math.PI * 2) / arr.length;
    arr.forEach((n, i) => {
      const a = i * step;
      const px = center.x + Math.cos(a) * radius;
      const pz = center.z + Math.sin(a) * radius;
      const py = (Math.random() - 0.5) * yJitter;
      n.position = new THREE.Vector3(px, py, pz);
    });
  }

  // Create node meshes + labels
  const sphereGeo = new THREE.SphereGeometry(1, 24, 24);

  ontologyGraph.nodes.forEach(n => {
    const color = COLORS[n.type] || 0x666666;
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.4, metalness: 0.05
    });

    const mesh = new THREE.Mesh(sphereGeo, mat);
    const radius = (n.size || 0.5);
    mesh.scale.setScalar(radius);
    mesh.position.copy(n.position || new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 6
    ));
    mesh.userData = { id: n.id, type: n.type, label: n.label, size: radius };
    mesh.castShadow = false; mesh.receiveShadow = false;

    fsScene.add(mesh);
    nodeMeshes.push(mesh);
    nodes.push(n);

    // Label sprite
    const sprite = makeTextSprite(n.label);
    sprite.position.copy(mesh.position.clone().add(new THREE.Vector3(0, radius + 0.25, 0)));
    fsScene.add(sprite);
    labelSprites.push({ sprite, targetMesh: mesh });
  });

  // Create edges
  ontologyGraph.links.forEach(l => {
    const a = nodeMeshes.find(m => m.userData.id === l.source);
    const b = nodeMeshes.find(m => m.userData.id === l.target);
    if (!a || !b) return;

    const geom = new THREE.BufferGeometry().setFromPoints([a.position, b.position]);
    const mat = new THREE.LineBasicMaterial({ color: COLORS.Edge, transparent: true, opacity: 0.6 });
    const line = new THREE.Line(geom, mat);
    line.userData = { label: l.label, source: l.source, target: l.target };
    fsScene.add(line);
    linkLines.push(line);

    // Edge label halfway
    const mid = a.position.clone().lerp(b.position, 0.5);
    const edgeLabel = makeTextSprite(l.label, { fontSize: 12, fill: '#333' });
    edgeLabel.position.copy(mid).add(new THREE.Vector3(0, 0.12, 0));
    fsScene.add(edgeLabel);
    labelSprites.push({ sprite: edgeLabel, targetMesh: null, follow: [a, b] });
  });
}

function addLighting() {
  const amb = new THREE.AmbientLight(0xffffff, 0.6);
  fsScene.add(amb);

  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(4, 6, 3);
  fsScene.add(dir);
}

function makeTextSprite(text, opts = {}) {
  const {
    font = '12px "Helvetica Neue", Arial, sans-serif',
    fontSize = 14,
    fill = '#000',
    paddingX = 12,
    paddingY = 6
  } = opts;

  // Canvas
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');

  ctx.font = `${fontSize}px "Helvetica Neue", Arial, sans-serif`;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + paddingX * 2;
  const h = fontSize + paddingY * 2;

  c.width = nextPow2(w);
  c.height = nextPow2(h);

  // BG for readability
  const r = 6;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  roundRect(ctx, (c.width - w)/2, (c.height - h)/2, w, h, r);
  ctx.fill();

  // Text
  ctx.font = `${fontSize}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = fill;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const spr = new THREE.Sprite(mat);
  // Scale sprite to readable size in world units
  const scale = 0.015; // tweak for density
  spr.scale.set(c.width * scale, c.height * scale, 1);
  return spr;

  function nextPow2(v) {
    let p = 1; while (p < v) p <<= 1; return p;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }
}

function animate() {
  animationId = requestAnimationFrame(animate);

  // Make edge labels face camera & track midpoints
  labelSprites.forEach(({ sprite, targetMesh, follow }) => {
    if (targetMesh) {
      // Keep label above node
      sprite.position.lerp(
        targetMesh.position.clone().add(new THREE.Vector3(0, (targetMesh.userData?.size || 0.5) + 0.25, 0)),
        0.2
      );
    } else if (follow && follow.length === 2) {
      const mid = follow[0].position.clone().lerp(follow[1].position, 0.5);
      sprite.position.lerp(mid.add(new THREE.Vector3(0, 0.12, 0)), 0.3);
    }
    // face camera
    sprite.quaternion.copy(fsCamera.quaternion);
  });

  // Subtle focus pulse
  if (focused) {
    const t = performance.now() * 0.004;
    const s = focused.userData.size * (1 + Math.sin(t) * 0.03);
    focused.scale.setScalar(s);
  }

  fsControls.update();
  fsRenderer.render(fsScene, fsCamera);
}

function onResize() {
  if (!fsRenderer) return;
  fsCamera.aspect = window.innerWidth / window.innerHeight;
  fsCamera.updateProjectionMatrix();
  fsRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
  if (!fsRenderer) return;
  const rect = fsRenderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, fsCamera);
  const intersects = raycaster.intersectObjects(nodeMeshes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    if (hovered !== hit) {
      if (hovered && hovered !== focused) setNodeEmissive(hovered, 0);
      hovered = hit;
      if (hovered !== focused) setNodeEmissive(hovered, 0.5);
    }
    showTooltip(e.clientX, e.clientY, nodeTooltipText(hit));
  } else {
    if (hovered && hovered !== focused) setNodeEmissive(hovered, 0);
    hovered = null;
    hideTooltip();
  }
}

function onClick(e) {
  if (!fsRenderer) return;
  const rect = fsRenderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, fsCamera);
  const intersects = raycaster.intersectObjects(nodeMeshes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    focusNode(hit);
  } else {
    clearFocus();
  }
}

function focusNode(mesh) {
  if (focused && focused !== hovered) setNodeEmissive(focused, 0);
  focused = mesh;
  setNodeEmissive(focused, 0.9);

  // Ease camera towards a nice view
  const target = mesh.position.clone();
  const offset = new THREE.Vector3(1.8, 1.2, 1.8);
  const dest = target.clone().add(offset);
  smoothCameraTo(dest, target, 350);
}

function clearFocus() {
  if (focused) setNodeEmissive(focused, 0);
  focused = null;
}

function setNodeEmissive(mesh, intensity) {
  const mat = mesh.material;
  // approximate glow by brightening color via emissive
  if (!mat.emissive) mat.emissive = new THREE.Color(0x000000);
  mat.emissive.setScalar(intensity);
}

function nodeTooltipText(mesh) {
  const d = mesh.userData || {};
  // Short, studio-friendly copy
  const lines = [
    `<b>${d.label || d.id}</b>`,
    `<i>Type:</i> ${d.type}`,
    tipForType(d.type, d.label)
  ].filter(Boolean);
  return lines.join('<br/>');

  function tipForType(type, label) {
    switch (type) {
      case 'User': return 'Passive->Active via shared pet + offline nudge.';
      case 'VirtualPet': return '“Visits” match; retrieval requires offline meet.';
      case 'Match': return 'Pairing based on prefs + feasibility.';
      case 'AppSystem': return 'Assigns pet, manages “visit,” tracks meetup.';
      case 'OfflineMeeting': return 'Icebreaker context + pet handoff moment.';
      default: return '';
    }
  }
}

function showTooltip(x, y, html) {
  tooltip.innerHTML = html;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.style.opacity = '1';
}
function hideTooltip() { tooltip.style.opacity = '0'; }

function smoothCameraTo(destPos, lookAt, durationMs = 300) {
  const startPos = fsCamera.position.clone();
  const startLook = fsControls.target.clone();
  const start = performance.now();

  function step() {
    const t = Math.min(1, (performance.now() - start) / durationMs);
    const ease = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; // easeInOutQuad
    fsCamera.position.lerpVectors(startPos, destPos, ease);
    fsControls.target.lerpVectors(startLook, lookAt, ease);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Public controls
function enterFullscreen() {
  if (!fsContainer) initFullscreen();
  fsContainer.style.display = 'block';
  document.body.style.overflow = 'hidden';
  const canvas = document.getElementById('fullscreen-threejs-canvas');
  canvas && canvas.focus();
}

function exitFullscreen() {
  if (!fsContainer) return;
  fsContainer.style.display = 'none';
  document.body.style.overflow = 'auto';
  if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
}

function disposeFullscreenResources() {
  if (fsScene) fsScene.clear();
  if (fsRenderer) fsRenderer.dispose();
  if (fsControls) fsControls.dispose();

  window.removeEventListener('resize', onResize);
  if (fsRenderer?.domElement) {
    fsRenderer.domElement.removeEventListener('mousemove', onMouseMove);
    fsRenderer.domElement.removeEventListener('click', onClick);
  }
}

// (Optional) Export functions to window if needed elsewhere
window.enterOntologyFullscreen = enterFullscreen;
window.exitOntologyFullscreen = exitFullscreen;
window.disposeOntologyFullscreen = disposeFullscreenResources;