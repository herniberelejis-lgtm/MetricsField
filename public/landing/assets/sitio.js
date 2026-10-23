// Sitio público de MetricsField: menú del celular, demo por pestañas,
// carrito de piezas y las calculadoras de "Intel". Archivo propio (no
// inline) porque la CSP de la landing solo permite scripts del dominio.
// Todo es opcional: sin JavaScript la página se lee entera igual.
(function () {
  "use strict";

  var dinero = function (v) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);
  };
  var numero = function (v, dec) {
    return new Intl.NumberFormat("es-AR", { maximumFractionDigits: dec || 0, minimumFractionDigits: dec || 0 }).format(v);
  };
  var leer = function (form, nombre) {
    var el = form.elements[nombre];
    if (!el) return NaN;
    return parseFloat(String(el.value).replace(",", "."));
  };

  document.documentElement.classList.add("js");
  var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- movimiento: secciones que entran y puertas animadas ----
  // Cada puerta muestra una vista mínima de su producto que se arma al
  // entrar en pantalla y se vuelve a armar al pasar el mouse.
  function contar(el) {
    var fin = Number(el.getAttribute("data-contar")) || 0;
    if (quieto) { el.textContent = numero(fin); return; }
    var t0 = null;
    function paso(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / 1100);
      el.textContent = numero(Math.round(fin * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }
  function animar(puerta) {
    puerta.classList.remove("on");
    void puerta.offsetWidth; // reinicia las animaciones CSS
    puerta.classList.add("on");
    Array.prototype.forEach.call(puerta.querySelectorAll("[data-contar]"), contar);
  }
  var animables = document.querySelectorAll("[data-animar]");
  var revelables = document.querySelectorAll("[data-revelar]");
  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        if (e.target.hasAttribute("data-animar")) animar(e.target);
        else e.target.classList.add("visto");
      });
    }, { threshold: 0.15 });
    Array.prototype.forEach.call(animables, function (el) { obs.observe(el); });
    Array.prototype.forEach.call(revelables, function (el) { obs.observe(el); });
  } else {
    Array.prototype.forEach.call(revelables, function (el) { el.classList.add("visto"); });
  }
  Array.prototype.forEach.call(animables, function (puerta) {
    puerta.addEventListener("mouseenter", function () { if (!quieto) animar(puerta); });
  });

  // ---- menú del celular ----
  var botonMenu = document.querySelector("[data-menu]");
  var menu = document.querySelector("[data-menu-movil]");
  if (botonMenu && menu) {
    botonMenu.addEventListener("click", function () {
      var abierto = menu.classList.toggle("abierto");
      botonMenu.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
  }

  // ---- demo por pestañas (datos de ejemplo, lo dice la propia demo) ----
  var demos = {
    reputacion: { barras: [32, 47, 39, 68, 82, 74, 94], k: "Reputación en Google", t: "La opinión aparece mientras todavía importa.", x: "Toques al cartel, reseñas nuevas, qué valoran y qué hay que responder hoy.", al: "Toques al cartel", a: "148", bl: "Terminan en reseña", b: "62%" },
    retail: { barras: [58, 44, 63, 51, 72, 66, 80], k: "Rentabilidad en Mercado Libre", t: "Facturar más no siempre es ganar más.", x: "Comisión, envío, publicidad, impuestos y costo del producto, venta por venta.", al: "Ventas del mes", a: "324", bl: "Margen real", b: "18,4%" },
    loyalty: { barras: [20, 28, 35, 41, 50, 57, 66], k: "Fidelización · piloto", t: "Una visita puede convertirse en una relación.", x: "Tarjeta en la billetera del celular, beneficios claros y quién vuelve y cada cuánto.", al: "Clientes en el club", a: "286", bl: "Vuelven en 60 días", b: "41%" },
    intel: { barras: [70, 55, 82, 64, 90, 76, 60], k: "Intel · herramientas gratis", t: "Los números que conviene saber antes de decidir.", x: "Cuántas reseñas te faltan, cuánto ganás de verdad por venta y cuánto vale un cliente que vuelve.", al: "Calculadoras", a: "3", bl: "Guías", b: "10" }
  };
  var tabs = document.querySelectorAll("[data-demo]");
  Array.prototype.forEach.call(tabs, function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(tabs, function (x) {
        x.setAttribute("aria-selected", x === b ? "true" : "false");
      });
      var d = demos[b.getAttribute("data-demo")];
      if (!d) return;
      var poner = function (sel, txt) {
        var el = document.querySelector(sel);
        if (el) el.textContent = txt;
      };
      poner("[data-demo-kicker]", d.k);
      poner("[data-demo-title]", d.t);
      poner("[data-demo-text]", d.x);
      poner("[data-metric-a-label]", d.al);
      poner("[data-metric-a]", d.a);
      poner("[data-metric-b-label]", d.bl);
      poner("[data-metric-b]", d.b);
      Array.prototype.forEach.call(document.querySelectorAll(".chart .bar"), function (barra, i) {
        if (d.barras[i] !== undefined) barra.style.height = d.barras[i] + "%";
      });
    });
  });

  // ---- pedido: piezas NFC y software (se coordina por WhatsApp; acá no se
  // cobra nada). Cada producto tiene cantidad; el software no suma al total
  // de pago único porque es mensual o una prueba gratis. ----
  var drawer = document.querySelector("[data-drawer]");
  var back = document.querySelector("[data-backdrop]");
  var cart = [];
  var datos = {};
  try {
    var guardado = JSON.parse(localStorage.getItem("mf-carrito") || "[]");
    if (Array.isArray(guardado)) {
      guardado.forEach(function (x) {
        // Compatible con el formato anterior ({ name, price }, una fila por unidad).
        var nombre = x.nombre || x.name;
        if (!nombre) return;
        var ya = cart.filter(function (y) { return y.nombre === nombre; })[0];
        if (ya) ya.cant += x.cant || 1;
        else cart.push({ nombre: nombre, precio: Number(x.precio != null ? x.precio : x.price) || 0, tipo: x.tipo || "pieza", detalle: x.detalle || "", cant: x.cant || 1 });
      });
    }
    datos = JSON.parse(localStorage.getItem("mf-pedido-datos") || "{}") || {};
  } catch (e) {
    cart = [];
  }
  function guardar() {
    try {
      localStorage.setItem("mf-carrito", JSON.stringify(cart));
    } catch (e) {}
    dibujar();
  }
  var piezas = function () { return cart.filter(function (x) { return x.tipo !== "servicio"; }); };
  var servicios = function () { return cart.filter(function (x) { return x.tipo === "servicio"; }); };
  var totalPiezas = function () { return piezas().reduce(function (s, x) { return s + x.precio * x.cant; }, 0); };

  function boton(texto, etiqueta, accion) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = texto;
    b.setAttribute("aria-label", etiqueta);
    b.addEventListener("click", accion);
    return b;
  }
  function fila(x) {
    var f = document.createElement("div");
    f.className = "cart-row";
    var info = document.createElement("div");
    var nombre = document.createElement("b");
    nombre.textContent = x.nombre;
    var precio = document.createElement("small");
    precio.textContent = x.tipo === "servicio" ? x.detalle : dinero(x.precio) + " c/u";
    info.appendChild(nombre);
    info.appendChild(document.createElement("br"));
    info.appendChild(precio);
    f.appendChild(info);
    var acciones = document.createElement("div");
    acciones.className = "cart-acciones";
    if (x.tipo !== "servicio") {
      acciones.appendChild(boton("−", "Uno menos de " + x.nombre, function () {
        x.cant -= 1;
        if (x.cant < 1) cart.splice(cart.indexOf(x), 1);
        guardar();
      }));
      var cant = document.createElement("span");
      cant.className = "cart-cant";
      cant.textContent = String(x.cant);
      cant.setAttribute("aria-label", x.cant + " unidades");
      acciones.appendChild(cant);
      acciones.appendChild(boton("+", "Uno más de " + x.nombre, function () {
        x.cant += 1;
        guardar();
      }));
    }
    acciones.appendChild(boton("Quitar", "Quitar " + x.nombre, function () {
      cart.splice(cart.indexOf(x), 1);
      guardar();
    }));
    f.appendChild(acciones);
    return f;
  }
  function grupo(caja, titulo, items) {
    if (!items.length) return;
    var h = document.createElement("p");
    h.className = "cart-grupo";
    h.textContent = titulo;
    caja.appendChild(h);
    items.forEach(function (x) { caja.appendChild(fila(x)); });
  }
  function mensaje() {
    var l = ["Hola MetricsField, quiero hacer este pedido:"];
    if (piezas().length) {
      l.push("", "Piezas NFC + QR");
      piezas().forEach(function (x) { l.push("• " + x.cant + " × " + x.nombre + " — " + dinero(x.precio * x.cant)); });
      l.push("Total piezas: " + dinero(totalPiezas()) + " (pago único; IVA y envío a confirmar)");
    }
    if (servicios().length) {
      l.push("", "Software");
      servicios().forEach(function (x) { l.push("• " + x.nombre + (x.detalle ? " — " + x.detalle : "")); });
    }
    var d = [["Nombre", datos.nombre], ["Comercio", datos.comercio], ["Ciudad", datos.ciudad]].filter(function (p) { return p[1]; });
    if (d.length) {
      l.push("", "Mis datos");
      d.forEach(function (p) { l.push(p[0] + ": " + p[1]); });
    }
    return l.join("\n");
  }
  function dibujar() {
    var unidades = cart.reduce(function (s, x) { return s + x.cant; }, 0);
    Array.prototype.forEach.call(document.querySelectorAll("[data-cart-count]"), function (e) {
      e.textContent = String(unidades);
    });
    var caja = document.querySelector("[data-cart-items]");
    if (!caja) return;
    caja.textContent = "";
    if (!cart.length) {
      var vacio = document.createElement("p");
      vacio.className = "muted";
      vacio.textContent = "Todavía no agregaste nada. Sumá piezas desde la tienda o el software que quieras probar.";
      caja.appendChild(vacio);
    }
    grupo(caja, "Piezas NFC + QR · pago único", piezas());
    grupo(caja, "Software", servicios());
    var total = document.querySelector("[data-cart-total]");
    if (total) total.textContent = dinero(totalPiezas());
    var wa = document.querySelector("[data-cart-wa]");
    if (wa) {
      wa.href = "https://wa.me/5493515191716?text=" + encodeURIComponent(mensaje());
      wa.classList.toggle("apagado", !cart.length);
      wa.setAttribute("aria-disabled", cart.length ? "false" : "true");
    }
  }
  // Datos opcionales de quien pide: viajan en el mensaje de WhatsApp.
  Array.prototype.forEach.call(document.querySelectorAll("[data-pedido]"), function (input) {
    var campo = input.getAttribute("data-pedido");
    if (datos[campo]) input.value = datos[campo];
    input.addEventListener("input", function () {
      datos[campo] = input.value.trim().slice(0, 80);
      try {
        localStorage.setItem("mf-pedido-datos", JSON.stringify(datos));
      } catch (e) {}
      dibujar();
    });
  });
  var waBtn = document.querySelector("[data-cart-wa]");
  waBtn && waBtn.addEventListener("click", function (e) {
    if (!cart.length) e.preventDefault();
  });
  function abrir() {
    if (!drawer) return;
    drawer.classList.add("open");
    back && back.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
    var cerrar = drawer.querySelector("[data-cart-close]");
    cerrar && cerrar.focus();
  }
  function cerrarCarrito() {
    if (!drawer) return;
    drawer.classList.remove("open");
    back && back.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-cart-open]"), function (b) {
    b.addEventListener("click", abrir);
  });
  var cerrarBtn = document.querySelector("[data-cart-close]");
  cerrarBtn && cerrarBtn.addEventListener("click", cerrarCarrito);
  back && back.addEventListener("click", cerrarCarrito);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") cerrarCarrito();
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-add]"), function (b) {
    b.addEventListener("click", function () {
      var nombre = b.getAttribute("data-add");
      var tipo = b.getAttribute("data-tipo") || "pieza";
      // Las dos formas de pagar el panel (mensual o 3 meses) no van juntas.
      var reemplaza = b.getAttribute("data-reemplaza");
      if (reemplaza) cart = cart.filter(function (y) { return y.nombre !== reemplaza; });
      var ya = cart.filter(function (y) { return y.nombre === nombre; })[0];
      if (ya && tipo !== "servicio") ya.cant += 1;
      else if (!ya) cart.push({ nombre: nombre, precio: Number(b.getAttribute("data-price")) || 0, tipo: tipo, detalle: b.getAttribute("data-detalle") || "", cant: 1 });
      guardar();
      // El software se pide por WhatsApp: se abre el pedido para que se vea el botón.
      if (tipo === "servicio") abrir();
      var t = document.querySelector("[data-toast]");
      if (t) {
        t.textContent = tipo === "servicio" ? "Sumado a tu pedido" : "Agregado al carrito";
        t.classList.add("show");
        setTimeout(function () { t.classList.remove("show"); }, 1300);
      }
    });
  });
  dibujar();

  // ---- calculadoras de Intel ----
  // Cada una vive en un <form data-calc="..."> y escribe en su [data-salida].
  // Las cuentas están explicadas al lado de cada calculadora, en la página.
  var calculos = {
    // Cuántas reseñas de 5★ seguidas hacen falta para que Google muestre
    // la calificación objetivo. Google muestra el promedio redondeado a un
    // decimal: para ver 4,7 alcanza con llegar a 4,65.
    resenas: function (f) {
      var r = leer(f, "rating"), n = leer(f, "cantidad"), obj = leer(f, "objetivo");
      if (!(r >= 1 && r <= 5) || !(n >= 1) || !(obj > 1 && obj <= 5)) return null;
      var minimo = Math.min(obj - 0.05, 4.95);
      // El 1e-9 evita que un error de coma flotante (120,0000001) sume una reseña.
      var faltan = r >= minimo ? 0 : Math.ceil((n * (minimo - r)) / (5 - minimo) - 1e-9);
      var compensa = r < 5 ? (r - 1) / (5 - r) : null;
      return {
        grande: faltan === 0 ? "Ya llegaste" : numero(faltan) + " reseñas de 5★",
        tono: faltan === 0 ? "bien" : "",
        texto: (faltan === 0
          ? "Con tu promedio actual Google ya muestra " + numero(obj, 1) + "★."
          : "seguidas te faltan para que Google muestre " + numero(obj, 1) + "★ (hoy: " + numero(r, 1) + "★ con " + numero(n) + " reseñas).") +
          (compensa !== null ? " Cada reseña de 1★ se compensa con unas " + numero(Math.ceil(compensa)) + " de 5★." : "")
      };
    },
    // Ganancia real de una venta en Mercado Libre: lo que queda después de
    // comisión, cargo fijo, envío, publicidad, impuestos y costo.
    ml: function (f) {
      var precio = leer(f, "precio"), costo = leer(f, "costo"), com = leer(f, "comision") / 100, fijo = leer(f, "fijo") || 0,
        envio = leer(f, "envio") || 0, ads = leer(f, "ads") || 0, imp = (leer(f, "impuestos") || 0) / 100;
      if (!(precio > 0) || !(costo >= 0) || !(com >= 0)) return null;
      var descuentos = precio * com + fijo + envio + ads + precio * imp;
      var ganancia = precio - costo - descuentos;
      var margen = ganancia / precio;
      return {
        grande: dinero(ganancia),
        tono: ganancia >= 0 ? "bien" : "mal",
        texto: "de ganancia real por venta (" + numero(margen * 100, 1) + "% del precio). Mercado Libre y los impuestos se llevan " +
          dinero(descuentos) + " antes de tu costo." + (ganancia < 0 ? " Esta venta te hace perder plata." : "")
      };
    },
    // Cuánto vale un cliente que vuelve, y cuánto suma que vuelvan algunos
    // más: margen por visita × visitas por mes × meses que sigue viniendo.
    cliente: function (f) {
      var ticket = leer(f, "ticket"), margen = leer(f, "margen") / 100, visitas = leer(f, "visitas"), meses = leer(f, "meses"),
        clientes = leer(f, "clientes") || 0;
      if (!(ticket > 0) || !(margen > 0) || !(visitas > 0) || !(meses > 0)) return null;
      var valor = ticket * margen * visitas * meses;
      var extra = clientes > 0 ? Math.round(clientes * 0.1) * valor : 0;
      return {
        grande: dinero(valor),
        tono: "bien",
        texto: "de ganancia deja cada cliente que vuelve en todo ese tiempo." +
          (clientes > 0 ? " Si de tus " + numero(clientes) + " clientes nuevos por mes vuelve un 10% más, son " + dinero(extra) + " más por cada mes de clientes nuevos." : "")
      };
    }
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-calc]"), function (f) {
    var fn = calculos[f.getAttribute("data-calc")];
    var salida = f.querySelector("[data-salida]");
    if (!fn || !salida) return;
    var actualizar = function () {
      var r = fn(f);
      var grande = salida.querySelector(".grande");
      var texto = salida.querySelector("p");
      if (!r) {
        grande.textContent = "—";
        grande.className = "grande";
        texto.textContent = "Completá los datos para ver el resultado.";
        return;
      }
      grande.textContent = r.grande;
      grande.className = "grande" + (r.tono ? " " + r.tono : "");
      texto.textContent = r.texto;
    };
    f.addEventListener("input", actualizar);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      actualizar();
    });
    actualizar();
  });
})();
