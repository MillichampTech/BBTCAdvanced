(() => {
  const jump = document.getElementById("termsJump");
  const chipsWrap = document.getElementById("termsChips");
  const printBtn = document.getElementById("termsPrintBtn");
  const printBtn2 = document.getElementById("termsPrintBtn2");
  const acc = document.getElementById("termsAccordion");
  const spacer = document.getElementById("termsJumpSpacer");

  if (!jump || !chipsWrap || !acc) return;

  const chips = Array.from(chipsWrap.querySelectorAll('a.terms-chip[href^="#"]'));
  const details = Array.from(acc.querySelectorAll("details.terms-item"));

  // Measure the *actual* injected site nav height (varies by breakpoint/fonts)
  const getHeaderOffset = () => {
    const nav = document.getElementById("site-nav");
    if (!nav) return 120;
    const rect = nav.getBoundingClientRect();
    return Math.round(rect.height + 12); // 12px breathing room under nav
  };

  // Helper: margin-bottom is NOT included in offsetHeight (but it *matters* when fixed)
  const getJumpBottomMargin = () => {
    const cs = window.getComputedStyle(jump);
    return parseFloat(cs.marginBottom) || 0;
  };

  const getJumpReserveHeight = () => {
    return jump.offsetHeight + getJumpBottomMargin();
  };

  // Recompute start position (layout can shift after fonts/nav inject)
  let jumpStartY = jump.getBoundingClientRect().top + window.scrollY;

  const updateJumpSticky = () => {
    const headerOffset = getHeaderOffset();
    const y = window.scrollY;

    // If we're not sticky, keep startY fresh (handles layout shifts)
    if (!jump.classList.contains("is-sticky")) {
      jumpStartY = jump.getBoundingClientRect().top + window.scrollY;
    }

    const container = jump.parentElement; // wrapper holding jump + accordion
    const containerRect = container.getBoundingClientRect();

    const shouldStick = (y + headerOffset) >= jumpStartY;

    if (!shouldStick) {
      jump.classList.remove("is-sticky");
      jump.style.position = "";
      jump.style.top = "";
      jump.style.left = "";
      jump.style.width = "";
      jump.style.zIndex = "";
      if (spacer) spacer.style.height = "0px";
      return;
    }

    // Fixed + aligned to container (prevents full-width jump + wobble)
    jump.classList.add("is-sticky");
    jump.style.position = "fixed";
    jump.style.top = headerOffset + "px";
    jump.style.left = containerRect.left + "px";
    jump.style.width = containerRect.width + "px";
    jump.style.zIndex = "40";

    // Reserve *height + margin-bottom* so content never sits underneath it
    if (spacer) spacer.style.height = getJumpReserveHeight() + "px";
  };

  // True accordion: only one open at a time
  const openOnly = (id) => {
    details.forEach(d => { if (d.id !== id) d.removeAttribute("open"); });
    const target = document.getElementById(id);
    if (target && target.tagName.toLowerCase() === "details") {
      target.setAttribute("open", "open");
    }
  };

  // Smooth scroll + open section on chip click
  chips.forEach(a => {
    a.addEventListener("click", (e) => {
      const id = (a.getAttribute("href") || "").replace("#", "");
      const el = document.getElementById(id);
      if (!el) return;

      e.preventDefault();
      openOnly(id);

      // Force sticky state & spacer height to be correct BEFORE calculating scroll target
      updateJumpSticky();

      const headerOffset = getHeaderOffset();

      // If user is clicking a chip, assume the jump bar will be in play during the scroll.
      const jumpOffset = getJumpReserveHeight();
      const offset = headerOffset + jumpOffset + 14;

      const targetY = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    });
  });

  // Active chip highlight
  const setActive = (id) => {
    chips.forEach(a => a.classList.toggle("is-active", a.dataset.term === id));
  };

  // IntersectionObserver for auto-highlight
  const observeTargets = details;

  const makeObserver = () => {
    const headerOffset = getHeaderOffset();
    // When sticky, allow for jump bar too so "active" updates feel correct
    const jumpOffset = jump.classList.contains("is-sticky") ? getJumpReserveHeight() : 0;
    const topPad = headerOffset + jumpOffset + 20;

    return new IntersectionObserver((entries) => {
      const topMost = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

      if (topMost && topMost.target && topMost.target.id) setActive(topMost.target.id);
    }, {
      root: null,
      rootMargin: `-${topPad}px 0px -70% 0px`,
      threshold: [0.1, 0.2, 0.35, 0.5]
    });
  };

  let io = makeObserver();
  observeTargets.forEach(t => io.observe(t));

  const rebuildObserver = () => {
    try { io.disconnect(); } catch (e) {}
    io = makeObserver();
    observeTargets.forEach(t => io.observe(t));
  };

  // When user manually opens a section: close others + set active
  details.forEach(d => {
    d.addEventListener("toggle", () => {
      if (d.open) {
        openOnly(d.id);
        setActive(d.id);
      }
    });
  });

  // Print: expand all then restore
  let prevOpen = null;

  const expandAllForPrint = () => {
    prevOpen = details.map(d => d.open);
    details.forEach(d => d.setAttribute("open", "open"));
  };

  const restoreAfterPrint = () => {
    if (!prevOpen) return;
    details.forEach((d, i) => {
      if (prevOpen[i]) d.setAttribute("open", "open");
      else d.removeAttribute("open");
    });
    prevOpen = null;
  };

  const doPrint = () => window.print();

  if (printBtn) printBtn.addEventListener("click", doPrint);
  if (printBtn2) printBtn2.addEventListener("click", doPrint);

  window.addEventListener("beforeprint", expandAllForPrint);
  window.addEventListener("afterprint", restoreAfterPrint);

  // Run
  updateJumpSticky();
  rebuildObserver();

  window.addEventListener("scroll", () => {
    updateJumpSticky();
    // Sticky state can flip; observer margins should match
    rebuildObserver();
  }, { passive: true });

  window.addEventListener("resize", () => {
    updateJumpSticky();
    rebuildObserver();
  });
})();

(() => {
  const btn = document.getElementById("backToTopBtn");
  if (!btn) return;

  const toggleVisibility = () => {
    if (window.scrollY > 500) {
      btn.classList.add("show");
    } else {
      btn.classList.remove("show");
    }
  };

  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  window.addEventListener("scroll", toggleVisibility, { passive: true });
})();
