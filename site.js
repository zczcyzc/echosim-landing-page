/**
 * Shared landing-site interactions (loaded on every page):
 *  - smooth scrolling for in-page #anchor links
 *  - scroll-reveal: fades elements with `.reveal` into view as they enter the viewport
 */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08 },
);

document
  .querySelectorAll(".reveal")
  .forEach((el) => revealObserver.observe(el));

/* ─── Theme Toggler ──────────────────────────────────────────────────────── */
const initTheme = () => {
  const savedTheme = localStorage.getItem("echosim-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  updateThemeIcons();
};

const updateThemeIcons = () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
    btn.innerHTML = isDark ? "🌙" : "☀️";
  });
};

const toggleTheme = () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("echosim-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("echosim-theme", "dark");
  }
  updateThemeIcons();
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", toggleTheme);
  });

  /* ─── Mobile hamburger ─────────────────────────────────────────────────── */
  const nav = document.querySelector(".nav");
  const hamburger = document.querySelector(".nav-hamburger");
  if (nav && hamburger) {
    const close = () => {
      nav.classList.remove("is-open");
      hamburger.setAttribute("aria-expanded", "false");
    };
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      const opening = !nav.classList.contains("is-open");
      opening ? nav.classList.add("is-open") : close();
      hamburger.setAttribute("aria-expanded", String(opening));
    });
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-open") && !nav.contains(e.target)) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    document
      .querySelectorAll(".nav-mobile-link, .nav-mobile-cta")
      .forEach((el) => {
        el.addEventListener("click", close);
      });
  }

  /* ─── Hero Panel Delayed Fade-In ────────────────────────────────────────── */
  // 当背景图片加载完成后，延迟 1.5 秒渐现显示文字 Card 面板以创造高级平滑动效。
  // 若用户主动向下滑动，会提前触发渐现动画，避免首屏内容展示滞后。
  const heroImg = document.querySelector(".hero-bg .photo__img");
  const heroPanel = document.querySelector(".hero-panel");
  if (heroPanel) {
    let timer = null;
    let loaded = false;

    const triggerFadeIn = (immediate = false) => {
      if (loaded) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      const show = () => {
        heroPanel.classList.add("loaded");
        loaded = true;
        window.removeEventListener("scroll", handleScroll);
      };

      if (immediate) {
        show();
      } else {
        timer = setTimeout(show, 1500);
      }
    };

    const handleScroll = () => {
      if (window.scrollY > 5) {
        triggerFadeIn(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    if (heroImg) {
      if (heroImg.complete && heroImg.naturalWidth > 0) {
        triggerFadeIn();
      } else {
        heroImg.addEventListener("load", () => triggerFadeIn());
        heroImg.addEventListener("error", () => triggerFadeIn());
        // 兜底机制：即使网络极慢或图片加载卡住，4 秒后也会强制渐现文字 Card
        setTimeout(() => triggerFadeIn(), 4000);
      }
    } else {
      triggerFadeIn();
    }
  }


});
