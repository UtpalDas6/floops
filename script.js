// ============================================================
// Mobile nav toggle (always runs, no animation dependency)
// ============================================================
const navToggle = document.getElementById("navToggle");
const mobileMenu = document.getElementById("mobileMenu");

navToggle.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

mobileMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// ============================================================
// Nav shrink on scroll (IntersectionObserver sentinel, no
// scroll-event listener needed)
// ============================================================
const nav = document.getElementById("siteNav");
const navSentinel = document.getElementById("navSentinel");
new IntersectionObserver(
  ([entry]) => nav.classList.toggle("is-scrolled", !entry.isIntersecting),
  { threshold: 0 }
).observe(navSentinel);

// ============================================================
// Scroll reveal via IntersectionObserver (no scroll listeners)
// Covers everything still wearing the plain .reveal class.
// ============================================================
const revealEls = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
);
revealEls.forEach((el) => revealObserver.observe(el));

// ============================================================
// Waitlist form: front-end only, no backend wired up
// ============================================================
const form = document.getElementById("waitlistForm");
const note = document.getElementById("waitlistNote");
const submitBtn = document.getElementById("waitlistSubmit");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email");
  if (!email.checkValidity()) {
    note.textContent = "Enter a valid email address.";
    note.classList.remove("is-success");
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = "You're on the list";
  email.disabled = true;
  note.textContent = "We will only email you once, when the first drop opens.";
  note.classList.add("is-success");
});

// ============================================================
// Motion layer (GSAP). Everything below is progressive
// enhancement: if the CDN is blocked, or the visitor prefers
// reduced motion, the page already looks complete without it
// (see the html.js-anim gate in style.css).
// ============================================================
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const gsapReady = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

if (gsapReady && !prefersReducedMotion) {
  document.documentElement.classList.add("js-anim");
  gsap.registerPlugin(ScrollTrigger);

  // ---------- Hero entrance timeline ----------
  // .line's FROM state is set here (not in CSS) because GSAP can't
  // reliably decompose a percentage-based translateY back out of a
  // computed transform matrix - percentages only round-trip correctly
  // when GSAP owns both the FROM and TO state.
  gsap.set(".line", { yPercent: 110 });

  const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });
  heroTl
    .to(".line", { yPercent: 0, duration: 0.9, stagger: 0.1 })
    .to("#heroSubtext", { opacity: 1, y: 0, duration: 0.6 }, "-=0.5")
    .to(".hero__actions", { opacity: 1, y: 0, duration: 0.6 }, "-=0.45")
    .to(
      ".hero__visual svg",
      { opacity: 1, scale: 1, rotate: 0, duration: 1, ease: "back.out(1.6)" },
      "-=0.7"
    )
    .to(".hero__glow", { opacity: 1, duration: 0.8 }, "-=0.6");

  // ---------- Magnetic buttons ----------
  document.querySelectorAll(".btn--magnetic").forEach((btn) => {
    const xTo = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3" });

    btn.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const rect = btn.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      xTo(relX * 0.35);
      yTo(relY * 0.6);
    });

    btn.addEventListener("pointerleave", () => {
      xTo(0);
      yTo(0);
    });

    btn.addEventListener("pointerdown", () => gsap.to(btn, { scale: 0.96, duration: 0.12 }));
    btn.addEventListener("pointerup", () => gsap.to(btn, { scale: 1, duration: 0.25, ease: "back.out(2)" }));
  });

  // ---------- Hero product cursor tilt ----------
  const heroTilt = document.getElementById("heroTilt");
  if (heroTilt && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    // GSAP's JS API names the 3D rotation axes rotationX/rotationY (the
    // CSS property is rotateX/rotateY) - using the CSS names silently
    // no-ops the tween instead of erroring.
    const rotateX = gsap.quickTo(heroTilt, "rotationX", { duration: 0.6, ease: "power3" });
    const rotateY = gsap.quickTo(heroTilt, "rotationY", { duration: 0.6, ease: "power3" });

    document.querySelector(".hero__visual").addEventListener("pointermove", (e) => {
      const rect = heroTilt.getBoundingClientRect();
      const relX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const relY = (e.clientY - rect.top - rect.height / 2) / rect.height;
      rotateY(relX * 18);
      rotateX(relY * -18);
    });

    document.querySelector(".hero__visual").addEventListener("pointerleave", () => {
      rotateX(0);
      rotateY(0);
    });
  }

  // ---------- Bento: staggered entrance + spotlight tracking ----------
  gsap.from(".bento__cell", {
    scrollTrigger: { trigger: ".bento", start: "top 80%" },
    opacity: 0,
    y: 32,
    scale: 0.94,
    duration: 0.7,
    stagger: 0.12,
    ease: "back.out(1.5)",
  });

  document.querySelectorAll(".bento__cell").forEach((cell) => {
    cell.addEventListener("pointermove", (e) => {
      const rect = cell.getBoundingClientRect();
      cell.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      cell.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });
  });

  // ---------- Tech diagrams: draw-on outline + fade the rest ----------
  const drawOutline = (selector, rowSelector) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const length = el.getTotalLength();
    gsap.set(el, { strokeDasharray: length, strokeDashoffset: length });
    gsap.to(el, {
      scrollTrigger: { trigger: rowSelector, start: "top 75%" },
      strokeDashoffset: 0,
      duration: 1.4,
      ease: "power2.inOut",
    });
    gsap.to(`${rowSelector} .draw-after`, {
      scrollTrigger: { trigger: rowSelector, start: "top 75%" },
      opacity: 1,
      duration: 0.6,
      delay: 1,
    });
  };
  drawOutline("#foamOutline", ".tech__row:not(.tech__row--reverse)");

  const knitOutline = document.getElementById("knitOutline");
  if (knitOutline) {
    const perim = knitOutline.getTotalLength();
    gsap.set(knitOutline, { strokeDasharray: perim, strokeDashoffset: perim });
    gsap.set("#knitGrid", { opacity: 0 });
    const knitTl = gsap.timeline({
      scrollTrigger: { trigger: ".tech__row--reverse", start: "top 75%" },
    });
    knitTl
      .to(knitOutline, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" })
      .to("#knitGrid", { opacity: 1, duration: 0.6 }, "-=0.2");
  }

  // ---------- Count-up stats ----------
  document.querySelectorAll(".count-up").forEach((el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const counter = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          val: target,
          duration: 1.3,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(counter.val) + suffix;
          },
        });
      },
    });
  });

  // ---------- Lifestyle parallax ----------
  const lifestyleImg = document.getElementById("lifestyleImg");
  if (lifestyleImg) {
    gsap.to(lifestyleImg, {
      yPercent: 10,
      ease: "none",
      scrollTrigger: {
        trigger: ".lifestyle",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  }
} else {
  // No animation layer: make sure count-up spans show their real values
  // and draw-on SVGs render fully, since their JS-driven states never run.
  document.querySelectorAll(".count-up").forEach((el) => {
    el.textContent = el.dataset.count + (el.dataset.suffix || "");
  });
}

// ============================================================
// Mix Your Match: sole + strap roulette.
// Works with or without GSAP - animated slot-reel spin when
// available, instant swap otherwise. Never gated behind the
// js-anim class because the feature itself (not just its
// polish) is the point.
// ============================================================
(() => {
  const soleStripEl = document.getElementById("soleStrip");
  const strapStripEl = document.getElementById("strapStrip");
  if (!soleStripEl || !strapStripEl) return;

  const SOLE_PALETTE = [
    { name: "Jet", hex: "#191916" },
    { name: "Fog", hex: "#3a3a38" },
    { name: "Sand", hex: "#c9bfa0" },
    { name: "Clay", hex: "#8a4a34" },
    { name: "Ink", hex: "#1c2430" },
  ];
  const STRAP_PALETTE = [
    { name: "Ember", hex: "#ff4d1c" },
    { name: "Volt", hex: "#d6ff3f" },
    { name: "Cobalt", hex: "#2b5fd9" },
    { name: "Rose", hex: "#e8536f" },
    { name: "Moss", hex: "#3c5c46" },
    { name: "Bone", hex: "#e8e3d3" },
  ];

  const SWATCH_H = 76;
  const LOOPS = 6;

  const relativeLuminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const readableText = (hex) => (relativeLuminance(hex) > 0.42 ? "#0d0d0c" : "#f6f5f2");

  const buildStrip = (stripEl, palette) => {
    for (let loop = 0; loop < LOOPS; loop++) {
      palette.forEach((color) => {
        const swatch = document.createElement("div");
        swatch.className = "reel__swatch";
        swatch.textContent = color.name;
        swatch.style.background = color.hex;
        swatch.style.color = readableText(color.hex);
        stripEl.appendChild(swatch);
      });
    }
  };
  buildStrip(soleStripEl, SOLE_PALETTE);
  buildStrip(strapStripEl, STRAP_PALETTE);

  // Lands on an instance of `index` from the LAST palette cycle, so a spin
  // always travels several full loops first. Centers that swatch in the
  // 3-swatch-tall window (middle slot = one swatch height from the top).
  const offsetFor = (index, paletteLength) => {
    const position = (LOOPS - 1) * paletteLength + index;
    return SWATCH_H * (1 - position);
  };

  const previewSole = document.getElementById("previewSole");
  const previewStrap = document.getElementById("previewStrap");
  const previewToeLoop = document.getElementById("previewToeLoop");
  const previewThumbLoop = document.getElementById("previewThumbLoop");
  const previewBadge = document.getElementById("previewBadge");
  const readout = document.getElementById("mixReadout");
  const spinBtn = document.getElementById("spinBtn");

  const updatePreview = (sole, strap) => {
    // Flat-SVG fallback (shown if the 3D module fails to init, e.g. no WebGL).
    previewSole.style.fill = sole.hex;
    previewStrap.style.fill = strap.hex;
    previewToeLoop.style.stroke = strap.hex;
    previewThumbLoop.style.stroke = strap.hex;
    // The badge always sits on a fixed near-black circle (not the strap),
    // so its text needs contrast against THAT constant background, not
    // against strap.hex - a light strap would otherwise get near-black
    // text on a near-black circle and disappear.
    previewBadge.style.fill = "#f6f5f2";
    readout.textContent = `${sole.name} sole, ${strap.name} strap`;

    // 3D module bridge. mixmatch-3d.js is a module script (always deferred,
    // runs after this classic script), so the last-known value is stashed
    // on window in case the module initializes after this fires - it reads
    // window.__floopsPreviewColors on init, then subscribes to this event
    // for everything after. Covers both load orders.
    window.__floopsPreviewColors = { sole: sole.hex, strap: strap.hex };
    window.dispatchEvent(new CustomEvent("floops3d:colors", { detail: window.__floopsPreviewColors }));
  };

  const canAnimate = () =>
    typeof window.gsap !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Setting the strip's initial position through gsap.set (when GSAP is
  // present) rather than a raw style.transform matters: GSAP tracks its
  // own internal transform cache, and a later gsap.to() only animates
  // smoothly from a state GSAP itself established.
  const applyReel = (stripEl, index, paletteLength, opts = {}) => {
    const { animate = false, duration = 1.6, delay = 0, onComplete } = opts;
    const offset = offsetFor(index, paletteLength);
    if (canAnimate()) {
      if (animate) {
        gsap.to(stripEl, { y: offset, duration, delay, ease: "power4.out", onComplete });
      } else {
        gsap.set(stripEl, { y: offset });
      }
    } else {
      stripEl.style.transform = `translateY(${offset}px)`;
      if (onComplete) onComplete();
    }
  };

  let soleIndex = Math.floor(Math.random() * SOLE_PALETTE.length);
  let strapIndex = Math.floor(Math.random() * STRAP_PALETTE.length);
  applyReel(soleStripEl, soleIndex, SOLE_PALETTE.length);
  applyReel(strapStripEl, strapIndex, STRAP_PALETTE.length);
  updatePreview(SOLE_PALETTE[soleIndex], STRAP_PALETTE[strapIndex]);

  spinBtn.addEventListener("click", () => {
    spinBtn.disabled = true;
    spinBtn.setAttribute("aria-busy", "true");
    const nextSole = Math.floor(Math.random() * SOLE_PALETTE.length);
    const nextStrap = Math.floor(Math.random() * STRAP_PALETTE.length);
    const animate = canAnimate();

    if (animate) readout.textContent = "Spinning…";

    applyReel(soleStripEl, nextSole, SOLE_PALETTE.length, { animate, duration: 1.6 });
    applyReel(strapStripEl, nextStrap, STRAP_PALETTE.length, {
      animate,
      duration: 1.9,
      delay: 0.15,
      onComplete: () => {
        soleIndex = nextSole;
        strapIndex = nextStrap;
        updatePreview(SOLE_PALETTE[soleIndex], STRAP_PALETTE[strapIndex]);
        spinBtn.disabled = false;
        spinBtn.removeAttribute("aria-busy");
      },
    });
  });

  // ============================================================
  // Drag-to-spin: each reel can also be dragged directly (mouse,
  // touch, or pen) instead of only via the Spin button. Follows the
  // pointer 1:1 while dragging, then snaps to the nearest swatch
  // through the same applyReel() the button spin uses, so both
  // paths animate and update state identically.
  // ============================================================
  const makeReelDraggable = (stripEl, palette, getIndex, onSettle) => {
    const windowEl = stripEl.parentElement;
    // Keep the strip a couple of swatches shy of its rendered ends
    // (0..LOOPS*palette.length-1) so a drag can never reveal blank
    // space past the last rendered loop.
    const maxY = SWATCH_H * (1 - 1);
    const minY = SWATCH_H * (1 - (LOOPS * palette.length - 2));
    const cycleHeight = SWATCH_H * palette.length;
    let dragging = false;
    let startClientY = 0;
    let startY = 0;

    windowEl.addEventListener("pointerdown", (e) => {
      if (spinBtn.disabled) return; // a button spin is already animating this strip
      dragging = true;
      try {
        windowEl.setPointerCapture(e.pointerId);
      } catch {
        // Ignore - dragging still works via the window-level listeners below.
      }
      windowEl.classList.add("is-dragging");
      startClientY = e.clientY;
      startY = canAnimate() ? gsap.getProperty(stripEl, "y") : offsetFor(getIndex(), palette.length);
      if (canAnimate()) gsap.killTweensOf(stripEl);
    });

    windowEl.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      let y = startY + (e.clientY - startClientY);
      // Wrap by a full palette cycle instead of clamping: the pattern
      // repeats every cycleHeight, so this jump is visually seamless but
      // keeps the pointer always in sync with the strip - clamping instead
      // would freeze the strip at the edge while the pointer kept moving,
      // creating a dead zone that had to be dragged back through before
      // reverse direction did anything (the "not circular" bug).
      while (y > maxY) {
        y -= cycleHeight;
        startY -= cycleHeight;
      }
      while (y < minY) {
        y += cycleHeight;
        startY += cycleHeight;
      }
      if (canAnimate()) gsap.set(stripEl, { y });
      else stripEl.style.transform = `translateY(${y}px)`;
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      windowEl.classList.remove("is-dragging");
      try {
        if (windowEl.hasPointerCapture(e.pointerId)) windowEl.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore - capture may never have been acquired.
      }
      const y = canAnimate() ? gsap.getProperty(stripEl, "y") : offsetFor(getIndex(), palette.length);
      const position = Math.round(1 - y / SWATCH_H);
      const index = ((position % palette.length) + palette.length) % palette.length;
      applyReel(stripEl, index, palette.length, {
        animate: canAnimate(),
        duration: 0.35,
        onComplete: () => onSettle(index),
      });
    };
    windowEl.addEventListener("pointerup", endDrag);
    windowEl.addEventListener("pointercancel", endDrag);
  };

  makeReelDraggable(soleStripEl, SOLE_PALETTE, () => soleIndex, (index) => {
    soleIndex = index;
    updatePreview(SOLE_PALETTE[soleIndex], STRAP_PALETTE[strapIndex]);
  });
  makeReelDraggable(strapStripEl, STRAP_PALETTE, () => strapIndex, (index) => {
    strapIndex = index;
    updatePreview(SOLE_PALETTE[soleIndex], STRAP_PALETTE[strapIndex]);
  });
})();
