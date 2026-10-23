// Demostraciones de cada servicio (scripts/landing/demos.mjs arma el HTML).
// Usa GSAP + ScrollTrigger, copiados en assets/vendor porque la CSP de la
// landing solo permite scripts del propio dominio.
//
// Escritorio: las escenas pasan a una columna fija a la derecha y cada una
// se anima cuando su paso llega al centro de la pantalla. Celular: cada
// escena se anima una vez, al aparecer debajo de su texto. Con movimiento
// reducido o si GSAP no carga, se ven quietas en su estado final.
(function () {
  "use strict";
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var escritorio = window.matchMedia("(min-width: 981px)").matches;

  function formato(v, dec) {
    return new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
  }

  // Cuenta de un número a otro (data-contar-a, data-desde, data-dec, data-suf).
  function contar(tl, els, pos) {
    Array.prototype.forEach.call(els, function (el) {
      var fin = Number(el.getAttribute("data-contar-a"));
      var desde = Number(el.getAttribute("data-desde") || 0);
      var dec = Number(el.getAttribute("data-dec") || 0);
      var suf = el.getAttribute("data-suf") || "";
      var o = { v: desde };
      tl.call(function () { el.textContent = formato(desde, dec) + suf; }, null, 0);
      tl.to(o, { v: fin, duration: 1.2, ease: "power2.out", onUpdate: function () { el.textContent = formato(o.v, dec) + suf; } }, pos);
    });
  }

  // Texto que aparece letra por letra (data-tipear).
  function tipear(tl, els, pos) {
    Array.prototype.forEach.call(els, function (el, i) {
      var texto = el.getAttribute("data-tipear");
      var o = { n: 0 };
      tl.call(function () { el.textContent = ""; }, null, 0);
      tl.to(o, { n: texto.length, duration: 0.5, ease: "none", onUpdate: function () { el.textContent = texto.slice(0, Math.round(o.n)); } }, i === 0 ? pos : ">");
    });
  }

  var aparecer = { autoAlpha: 0, y: 18, duration: 0.5, ease: "power3.out" };
  function de(extra) { return Object.assign({}, aparecer, extra); }

  // Una función por escena: recibe el selector acotado a la escena y su timeline.
  var ESCENAS = {
    "rep-problema": function (q, tl) {
      tl.from(q(".ficha"), de({ y: 30, stagger: 0.25 }));
      contar(tl, q("[data-contar-a]"), 0.3);
      tl.from(q(".globo"), { scale: 0.6, autoAlpha: 0, duration: 0.5, ease: "back.out(2)" }, "-=0.3");
    },
    "rep-toque": function (q, tl) {
      tl.from(q(".standee-mini"), de({ x: -20 }))
        .from(q(".tel"), { x: 120, rotation: 10, autoAlpha: 0, duration: 0.9, ease: "power3.out" }, "-=0.2")
        .fromTo(q(".onda"), { scale: 0.5, autoAlpha: 0.9 }, { scale: 2.4, autoAlpha: 0, duration: 1, stagger: 0.3, ease: "power2.out" }, "-=0.2")
        .from(q(".pant-google > *"), de({ y: 10, duration: 0.35, stagger: 0.08 }), "-=0.8")
        .from(q(".g-estrellas i"), { scale: 0, duration: 0.3, stagger: 0.1, ease: "back.out(3)" }, "-=0.3")
        .to(q(".g-btn"), { scale: 0.92, duration: 0.15, yoyo: true, repeat: 1 });
    },
    "rep-panel": function (q, tl) {
      tl.from(q(".d-kpi"), de({ stagger: 0.12 }));
      contar(tl, q(".d-kpi [data-contar-a]"), 0.2);
      tl.from(q(".resena-nueva"), de({ x: 50, y: 0, duration: 0.6 }), 0.6)
        .from(q(".r-sugerida"), de({ y: 10 }), ">-0.1")
        .fromTo(q(".tipeo"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.6, ease: "none" });
    },
    "rep-gana": function (q, tl) {
      tl.from(q(".ad"), de({ stagger: 0.15 }));
      contar(tl, q(".ad [data-contar-a]"), 0.2);
      tl.from(q(".linea-caja"), de({}), 0.3)
        .fromTo(q(".linea"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.4, ease: "power1.inOut" }, 0.5);
    },
    "ret-problema": function (q, tl) {
      tl.from(q(".aviso-venta"), { y: -30, autoAlpha: 0, duration: 0.6, ease: "back.out(1.6)" })
        .from(q(".pregunta-grande span"), de({}), "+=0.2")
        .from(q(".signo"), { scale: 0, duration: 0.4, ease: "back.out(3)" }, "-=0.2")
        .to(q(".signo"), { scale: 1.12, duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut" });
    },
    "ret-cascada": function (q, tl) {
      tl.from(q(".cg-fila"), { autoAlpha: 0, x: -10, duration: 0.35, stagger: 0.28 })
        .from(q(".cg-pista i"), {
          scaleX: 0,
          duration: 0.5,
          stagger: 0.28,
          ease: "power2.out",
          transformOrigin: function (i, el) { return el.closest(".menos") ? "right center" : "left center"; },
        }, 0.1);
    },
    "ret-productos": function (q, tl) {
      tl.from(q("tbody tr"), de({ x: -20, y: 0, stagger: 0.15 }))
        .from(q(".barrita"), { scaleX: 0, transformOrigin: "left center", duration: 0.5, stagger: 0.15 }, 0.2)
        .fromTo(q(".pierde td"), { backgroundColor: "rgba(244,184,134,0)" }, { backgroundColor: "rgba(244,184,134,0.28)", duration: 0.35, yoyo: true, repeat: 3 }, "+=0.2")
        .from(q(".pill-mal"), { scale: 0, duration: 0.35, ease: "back.out(3)" }, "<");
    },
    "ret-gana": function (q, tl) {
      tl.from(q(".bm-col i"), { scaleY: 0, transformOrigin: "bottom center", duration: 0.5, stagger: 0.14, ease: "power2.out" })
        .from(q(".bm-marca"), de({ y: -10 }), 0.45);
    },
    "loy-problema": function (q, tl) {
      tl.fromTo(q(".persona"), { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.07 })
        .to(q(".persona:not(.vuelve)"), { opacity: 0.18, duration: 0.6, stagger: 0.05 }, "+=0.3")
        .from(q(".pregunta-grande span"), de({}), "-=0.2")
        .from(q(".signo"), { scale: 0, duration: 0.4, ease: "back.out(3)" }, "-=0.2");
    },
    "loy-alta": function (q, tl) {
      tl.from(q(".tel"), de({ y: 30 }))
        .from(q(".pant-club > *"), de({ y: 10, duration: 0.35, stagger: 0.12 }), "-=0.2")
        .from(q(".consent .check"), { scale: 0, duration: 0.3, ease: "back.out(3)" })
        .to(q(".g-btn.wallet"), { scale: 0.92, duration: 0.15, yoyo: true, repeat: 1 })
        .from(q(".pase"), { yPercent: 130, duration: 0.7, ease: "power3.out" })
        .from(q(".pase-sellos i.lleno"), { scale: 0, duration: 0.3, stagger: 0.12, ease: "back.out(3)" });
    },
    "loy-canje": function (q, tl) {
      tl.from(q(".tel"), de({ y: 30 }))
        .from(q(".pase-sellos i:nth-child(n+4)"), { scale: 0, duration: 0.25, stagger: 0.1, ease: "back.out(3)" })
        .from(q(".qr"), { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: "back.out(2)" })
        .from(q(".qr i.n"), { autoAlpha: 0, duration: 0.3, stagger: { amount: 0.4, from: "random" } }, "<")
        .from(q(".qr-txt"), de({ y: 6 }))
        .from(q(".canjeado"), { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: "back.out(2)" }, "+=0.4");
    },
    "loy-gana": function (q, tl) {
      tl.from(q(".d-kpi"), de({ stagger: 0.12 }));
      contar(tl, q(".d-kpi [data-contar-a]"), 0.2);
      tl.from(q(".bm-col i"), { scaleY: 0, transformOrigin: "bottom center", duration: 0.45, stagger: 0.08 }, 0.5);
    },
    "int-pregunta": function (q, tl) {
      tl.from(q(".burbuja"), { autoAlpha: 0, y: 16, scale: 0.95, duration: 0.45, stagger: 0.5, ease: "back.out(1.6)" });
    },
    "int-cuenta": function (q, tl) {
      tl.from(q(".mc-t, .mc-campos label"), de({ stagger: 0.1 }));
      tipear(tl, q("[data-tipear]"), 0.4);
      tl.from(q(".mc-res"), de({}), ">0.1");
      contar(tl, q(".mc-res [data-contar-a]"), "<");
    },
    "int-decision": function (q, tl) {
      tl.from(q(".plan-t"), de({}))
        .from(q(".plan-item"), de({ x: -20, y: 0, stagger: 0.3 }))
        .from(q(".plan-item .check"), { scale: 0, duration: 0.3, stagger: 0.3, ease: "back.out(3)" }, 0.5);
    },
  };

  Array.prototype.forEach.call(document.querySelectorAll("[data-historia]"), function (historia) {
    var pasos = Array.prototype.slice.call(historia.querySelectorAll(".paso"));
    var escenas = pasos.map(function (p) { return p.querySelector(".escena"); });
    var animaciones = escenas.map(function (e) {
      var tl = gsap.timeline({ paused: true });
      var armar = ESCENAS[e.getAttribute("data-escena")];
      if (armar && !quieto) armar(gsap.utils.selector(e), tl);
      return tl;
    });

    if (escritorio) {
      var escenario = historia.querySelector(".escenario-in");
      escenas.forEach(function (e) { escenario.appendChild(e); });
      historia.classList.add("armada");
      var activo = -1;
      var activar = function (i) {
        if (i === activo) return;
        activo = i;
        pasos.forEach(function (p, j) { p.classList.toggle("activo", j === i); });
        escenas.forEach(function (e, j) { e.classList.toggle("activa", j === i); });
        animaciones[i].restart();
      };
      // Antes de llegar, la primera escena ya se ve (quieta) en su lugar.
      pasos[0].classList.add("activo");
      escenas[0].classList.add("activa");
      animaciones[0].progress(1);
      pasos.forEach(function (p, i) {
        ScrollTrigger.create({
          trigger: p,
          start: "top 55%",
          end: "bottom 45%",
          onToggle: function (self) { if (self.isActive) activar(i); },
        });
      });
      if (!quieto) {
        gsap.to(historia.querySelector(".escenario-avance i"), {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: historia.querySelector(".historia-pasos"), start: "top 55%", end: "bottom 45%", scrub: true },
        });
      }
    } else if (!quieto) {
      escenas.forEach(function (e, i) {
        ScrollTrigger.create({ trigger: e, start: "top 85%", once: true, onEnter: function () { animaciones[i].restart(); } });
      });
    }
  });
})();
