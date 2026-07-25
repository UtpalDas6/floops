// ============================================================
// 3D preview for the Mix Your Match roulette. Extrudes the exact
// sole/strap path data used by the flat SVGs elsewhere on the page,
// so the 3D object matches the brand's illustration language instead
// of being a separate, disconnected asset.
//
// Plain classic script (not type="module") on purpose: ES module
// script fetches are blocked by CORS when the page is opened via
// file:// (no server), which is how this whole site is meant to be
// opened. Three.js r128 still ships a UMD build + classic-script
// OrbitControls, so this works identically over file:// and https.
//
// Bridges to script.js via a tiny event + last-known-value pair on
// window (see the "Color sync bridge" section below), so color
// updates apply correctly regardless of script load order.
// ============================================================
(() => {
  const canvas = document.getElementById("previewCanvas");
  const stage = document.getElementById("previewStage");
  const hint = document.getElementById("viewerHint");

  if (!canvas || !stage || typeof THREE === "undefined" || typeof THREE.OrbitControls === "undefined") return;

  try {
    init();
  } catch (err) {
    console.warn("3D preview unavailable, using the flat SVG fallback.", err);
  }

  function buildSoleShape() {
    const cx = 160;
    const cy = 300;
    const pt = (x, y) => new THREE.Vector2(x - cx, -(y - cy));
    const shape = new THREE.Shape();
    const start = pt(160, 18);
    shape.moveTo(start.x, start.y);
    const curves = [
      [205, 18, 238, 55, 250, 110],
      [262, 165, 268, 225, 250, 290],
      [238, 335, 232, 375, 245, 420],
      [258, 465, 250, 520, 210, 555],
      [190, 573, 175, 582, 160, 585],
      [145, 582, 130, 573, 110, 555],
      [70, 520, 62, 465, 75, 420],
      [88, 375, 82, 335, 70, 290],
      [52, 225, 58, 165, 70, 110],
      [82, 55, 115, 18, 160, 18],
    ];
    curves.forEach(([x1, y1, x2, y2, x, y]) => {
      const c1 = pt(x1, y1);
      const c2 = pt(x2, y2);
      const end = pt(x, y);
      shape.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
    });
    return shape;
  }

  // A stadium/pill: width 250, height 92, radius 46 (= half height, so
  // the two ends are perfect semicircles joined by straight sides).
  //
  // This is deliberately a plain flat extrusion, not bent or swept.
  // Two earlier attempts at a dramatic arch both broke: hand-displacing
  // vertices by their X position sheared the pill's curved end caps
  // (their vertices span a range of positions at a given "X slice",
  // so a formula keyed only on X treats them inconsistently); sweeping
  // a cross-section along a curve via ExtrudeGeometry's extrudePath
  // produced an unpredictable Frenet-frame orientation that blew the
  // strap's proportions up into an oversized wing. A flat strap can't
  // shear or mis-orient - correctness beat ambition here. It's
  // positioned low enough (see strapBaseZ below) to stay embedded in
  // the sole along its whole length instead of an arch with clearance.
  function buildStrapShape() {
    const w = 250;
    const r = 46;
    const halfLen = w / 2 - r;
    const shape = new THREE.Shape();
    shape.absarc(halfLen, 0, r, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-halfLen, r);
    shape.absarc(-halfLen, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
    shape.lineTo(halfLen, -r);
    return shape;
  }

  // Centered rounded rectangle, used as the outer/inner boundary of the toe
  // loop's frame (a ring, not a solid tab, so a toe can actually pass
  // through it once this stands up on its edge).
  function roundedRectShape(w, h, r) {
    const x = -w / 2;
    const y = -h / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
  }

  // Sculpts a flat extruded slab into a footbed: domes the top surface
  // (higher in the middle, tapering toward the edges) and adds toe
  // spring (extra lift near the toe end, shape-space Y > 0). Without
  // this the sole is a uniform-thickness slab - a bar of soap, not
  // something a foot could rest in.
  function sculptSole(geometry, depth) {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const halfW = (bbox.max.x - bbox.min.x) / 2;
    const halfL = (bbox.max.y - bbox.min.y) / 2;
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Smooth 0->1 weight by how close this vertex is to the top face,
      // so the bevel rings between bottom and top get a gradient instead
      // of a hard crease at some cutoff height.
      const zWeight = THREE.MathUtils.clamp((v.z - depth * 0.25) / (depth * 0.75), 0, 1);
      if (zWeight <= 0) continue;
      const nx = v.x / halfW;
      const ny = v.y / halfL;
      const domeFalloff = Math.max(0, 1 - (nx * nx + ny * ny * 0.35));
      let bump = domeFalloff * 11;
      const toeT = THREE.MathUtils.clamp((ny - 0.5) / 0.5, 0, 1); // ramps up toward the toe end (+Y)
      bump += toeT * toeT * 24;
      v.z += bump * zWeight;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  function badgeTexture() {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0d0d0c";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f6f5f2";
    ctx.font = "700 64px Anton, Archivo, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("F", size / 2, size / 2 + 6);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function init() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // ---------- Group: sole + strap + badge ----------
    const group = new THREE.Group();

    const extrudeSettings = {
      depth: 40,
      bevelEnabled: true,
      bevelThickness: 6,
      bevelSize: 6,
      bevelSegments: 3,
      curveSegments: 24,
    };
    const soleGeo = new THREE.ExtrudeGeometry(buildSoleShape(), extrudeSettings);
    sculptSole(soleGeo, extrudeSettings.depth);
    const soleMat = new THREE.MeshStandardMaterial({ color: 0x191916, roughness: 0.7, metalness: 0.04 });
    const soleMesh = new THREE.Mesh(soleGeo, soleMat);
    group.add(soleMesh);

    // The domed sole's surface height varies from ~44 (near the strap's
    // ends, minimal dome bump) to ~55 (dome peak at center) - an 11-unit
    // range matching sculptSole's bump amplitude, and that peak sits right
    // under the badge (strap center is near the dome's origin). strapBaseZ
    // (the flat strap's bottom) stays below the low end so it never floats
    // clear of the surface at the ends, and depth is tall enough that the
    // top clears the dome PEAK with a real margin - not just past it, or
    // the badge sinks into the sole exactly where it should read as the
    // logo centerpiece.
    const strapDepth = 18;
    const strapBaseZ = 42;
    const strapGeo = new THREE.ExtrudeGeometry(buildStrapShape(), {
      depth: strapDepth,
      bevelEnabled: true,
      bevelThickness: 3,
      bevelSize: 3,
      bevelSegments: 2,
      curveSegments: 16,
    });
    // DoubleSide: the toe loop's TubeGeometry is swept along a closed
    // rectangular path (straight edges + sharp corners), where
    // computeFrenetFrames can flip its normal/binormal on those segments.
    // Single-sided culling then hides the flipped faces, leaving most of
    // the loop invisible. Shared by strap+both loops; harmless for the
    // strap itself since its back faces are never seen.
    const strapMat = new THREE.MeshStandardMaterial({ color: 0xff4d1c, roughness: 0.45, metalness: 0.08, side: THREE.DoubleSide });
    const strapMesh = new THREE.Mesh(strapGeo, strapMat);

    // Two loops of the same webbing, both children of strapMesh (same local
    // frame buildStrapShape used: x = along the strap's length, y = across
    // it, z = strap's own "up", all pre-rotation) so they inherit the
    // strap's position/rotation.z for free and share strapMat so the
    // color-sync bridge recolors them too.

    // Both loops lie in local X-Z (x=along the strap's length, z=up,
    // y=0 constant) instead of standing crosswise - that's the same plane
    // the strap's own length and "up" axes span, so the rings read as
    // running along the strap instead of twisted across it. Each one's
    // bottom sits exactly at the strap's top surface (z=strapDepth, no
    // added clearance) so it's grounded rather than floating with daylight
    // underneath, and their inner edges sit right at the badge's edge
    // (radius 20) so the run reads as one connected chain - toe loop,
    // badge, thumb loop - instead of three separate floating islands.

    // Thumb loop: a ring on the strap's -X side, inner edge touching the
    // badge. THREE.TorusGeometry lies flat in local XY by default (hole
    // axis Z); rotating 90deg about X swaps the hole axis to Y (across the
    // strap) and puts the ring's own plane in X-Z, parallel to the strap.
    const thumbR = 30;
    const thumbTube = 5;
    const thumbHalf = thumbR + thumbTube;
    const thumbLoopGeo = new THREE.TorusGeometry(thumbR, thumbTube, 12, 24);
    const thumbLoopMesh = new THREE.Mesh(thumbLoopGeo, strapMat);
    thumbLoopMesh.rotation.x = Math.PI / 2;
    thumbLoopMesh.position.set(65, 38, strapDepth + thumbHalf-10);
    strapMesh.add(thumbLoopMesh);

    // Toe loop: a longer rectangular ring on the strap's +X side, inner
    // edge touching the badge, sized for four toes rather than one thumb.
    // Built from roundedRectShape's outline swept into a round-
    // cross-section tube (a flat extruded frame only reads correctly
    // face-on, and this 3/4 camera doesn't sit face-on to it), with points
    // placed directly in local X-Z so it's parallel to the strap without
    // needing the thumb ring's extra rotation.
    // On a real foot, local x (across the strap) is medial-lateral and
    // local y (across the strap's own narrow footprint) is the toe-heel
    // direction. A loop toes actually pass through needs to span the
    // foot's WIDTH (x, so it stays long along that axis) but sit centered
    // on the foot's centerline (x=0) and pushed toward the toe edge (+y)
    // - not parked off to one side at the same front-back line as the
    // strap and badge, which is anatomically just "beside the instep,"
    // nowhere near where toes are. y=38 clears the badge's r=20 footprint
    // (its nearest point ends up ~32 from center) while staying inside the
    // pill's flat run, whose y half-width is a constant 46.
    const toeW = 120;
    const toeH = 40;
    const toeTube = 6;
    const toeHalfHeight = toeH / 2 + toeTube;
    const toeOutline = roundedRectShape(toeW, toeH, 6)
      .getPoints(24)
      .map((p) => new THREE.Vector3(p.x, 0, p.y));
    const toeCurve = new THREE.CatmullRomCurve3(toeOutline, true);
    const toeLoopGeo = new THREE.TubeGeometry(toeCurve, 64, toeTube, 8, true);
    const toeLoopMesh = new THREE.Mesh(toeLoopGeo, strapMat);
    toeLoopMesh.position.set(-35, 38, strapDepth + toeHalfHeight-10);
    strapMesh.add(toeLoopMesh);
    // Strap center in SVG space is (160, 196); sole-space centers on (160, 300),
    // so the strap sits above sole-space origin by (300 - 196) = 104.
    strapMesh.position.set(0, 104, strapBaseZ);
    strapMesh.rotation.z = Math.PI * (9 / 180); // matches the flat SVG's -9deg (sign flips with the Y-axis flip shared by buildSoleShape/buildStrapShape)
    group.add(strapMesh);

    const badgeGeo = new THREE.CircleGeometry(20, 32);
    const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTexture(), transparent: true });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.position.set(0, 104, strapBaseZ + strapDepth + 3.5);
    group.add(badgeMesh);

    // Bigger invisible tap target over the badge (visually a 20-radius
    // circle is a tiny hit area, especially on touch) - transparent so it
    // never renders, but Object3D.raycast still tests it since visible
    // stays true.
    const badgeHitGeo = new THREE.CircleGeometry(45, 24);
    const badgeHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const badgeHitMesh = new THREE.Mesh(badgeHitGeo, badgeHitMat);
    badgeHitMesh.position.copy(badgeMesh.position);
    badgeHitMesh.position.z += 0.5;
    group.add(badgeHitMesh);

    // Lay the object down: shape-space Z (extrusion thickness) becomes
    // world Y (up), so it reads as a sole resting on a surface rather
    // than a flat icon facing the camera edge-on.
    group.rotation.x = -Math.PI / 2;
    // The path data is in raw SVG units (sole radius ~290), which put the
    // required camera distance (~1200) way past the default far plane
    // (100) - the object was being clipped entirely, invisible. Scaling
    // down first brings it into a normal scene-unit range. This must
    // happen BEFORE the box/center/sphere math below: position is a
    // parent-space translation applied on top of scale, so centering
    // against a box computed pre-scale would offset it by the wrong
    // (unscaled) amount once scale is applied afterward.
    group.scale.setScalar(0.02);
    scene.add(group);

    // Center and frame the camera to fit, now that scale is final.
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const fitDistance = (sphere.radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.35;

    // Weighted toward X (the shape's width axis) rather than Z (the
    // toe-to-heel length axis): a camera sitting mostly along Z looks
    // almost straight down the long axis and foreshortens the sole
    // into an unreadable blob. This gives a 3/4 side profile instead.
    camera.position.set(fitDistance * 0.72, fitDistance * 0.42, fitDistance * 0.48);
    camera.lookAt(0, 0, 0);

    // ---------- Lighting ----------
    // Hemisphere carries most of the exposure; key/fill stay low and exist
    // only to give the extrusion's bevels a little directional shading
    // definition. Values above ~0.35 on the key light blew the material
    // out to near-white regardless of its base color (verified by
    // disabling them and confirming the base color rendered correctly).
    scene.add(new THREE.HemisphereLight(0x8891a3, 0x14100c, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.3);
    key.position.set(sphere.radius * 2, sphere.radius * 3, sphere.radius * 2);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xff8a5c, 0.12);
    fill.position.set(-sphere.radius * 2, sphere.radius, -sphere.radius);
    scene.add(fill);

    // ---------- Controls ----------
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = fitDistance * 0.55;
    controls.maxDistance = fitDistance * 1.9;
    controls.minPolarAngle = Math.PI * 0.15;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.rotateSpeed = 0.7;
    controls.autoRotate = !prefersReducedMotion();
    controls.autoRotateSpeed = 1.4;

    let idleTimer = null;
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      if (hint) hint.style.opacity = "0";
      clearTimeout(idleTimer);
    });
    controls.addEventListener("end", () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        controls.autoRotate = !prefersReducedMotion();
      }, 2200);
    });

    // ---------- Modular snap: tap the F badge to unclip/reclip the strap ----------
    // Demonstrates the real product mechanism (sole and strap snap apart at
    // the badge) rather than just being a color visualizer.
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let detached = false;

    const hitsBadge = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      return raycaster.intersectObject(badgeHitMesh).length > 0;
    };

    canvas.addEventListener("click", (e) => {
      if (!hitsBadge(e.clientX, e.clientY)) return;
      detached = !detached;
      const gsapReady = typeof gsap !== "undefined";
      if (gsapReady) {
        gsap.killTweensOf(strapMesh.position);
        gsap.killTweensOf(badgeMesh.scale);
        gsap.to(badgeMesh.scale, { x: 1.25, y: 1.25, z: 1.25, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.out" });
      }
      if (detached) {
        const target = { y: 88, z: strapBaseZ + 55 };
        if (gsapReady) gsap.to(strapMesh.position, { ...target, duration: 0.5, ease: "back.out(1.8)" });
        else strapMesh.position.set(strapMesh.position.x, target.y, target.z);
      } else {
        const target = { y: 104, z: strapBaseZ };
        if (gsapReady) gsap.to(strapMesh.position, { ...target, duration: 0.55, ease: "elastic.out(1, 0.6)" });
        else strapMesh.position.set(strapMesh.position.x, target.y, target.z);
      }
    });

    // Pointer affordance: swap the grab cursor for a pointer while hovering
    // the badge's tap target (only when not actively dragging - e.buttons
    // stays 0 during a plain hover, letting CSS's :active grabbing rule win
    // during a real drag).
    canvas.addEventListener("pointermove", (e) => {
      if (e.buttons !== 0) return;
      canvas.style.cursor = hitsBadge(e.clientX, e.clientY) ? "pointer" : "";
    });

    // ---------- Resize ----------
    const resize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    new ResizeObserver(resize).observe(stage);
    resize();

    // ---------- Render loop, paused when off-screen ----------
    let running = true;
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) requestAnimationFrame(tick);
    }).observe(stage);

    function tick() {
      if (!running) return;
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();

    canvas.classList.add("is-ready");

    // ---------- Color sync bridge ----------
    // script.js owns the roulette pick logic and may run before or after
    // this script depending on cache/network timing, so the last-known
    // color pair is stashed on window; this reads it once on init, then
    // subscribes to the event for everything after.
    const applyColors = ({ sole, strap }) => {
      if (sole) soleMat.color.set(sole);
      if (strap) strapMat.color.set(strap);
    };
    if (window.__floopsPreviewColors) applyColors(window.__floopsPreviewColors);
    window.addEventListener("floops3d:colors", (e) => applyColors(e.detail));
  }
})();
