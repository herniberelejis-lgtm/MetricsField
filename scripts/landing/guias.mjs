// Guías del sitio público: una por cada tema que MetricsField quiere
// explicar mejor que nadie. Reglas para escribirlas (las mismas del
// producto): nada de cifras inventadas, citar a Google o a Mercado Libre
// cuando se habla de sus reglas, "desde que" y no "gracias a", y cada guía
// tiene que servir aunque el lector nunca nos compre nada.
//
// html de cada sección: HTML ya armado (solo etiquetas simples). Las
// preguntas frecuentes van también como FAQPage en los datos estructurados.

export const ACTUALIZADO = "2026-10-23";

export const GUIAS = [
  {
    slug: "como-conseguir-resenas-en-google",
    tema: "Reseñas en Google",
    titulo: "Cómo conseguir más reseñas en Google (sin romper las reglas)",
    h1: "Cómo conseguir más reseñas en Google, sin romper las reglas",
    descripcion:
      "Por qué las reseñas de Google influyen en tu visibilidad, cómo pedirlas en el momento justo, qué prohíbe Google y cómo medir si funciona.",
    lead: "Las reseñas son lo primero que mira alguien que todavía no te conoce, y Google las usa para decidir a quién mostrar. Pedirlas bien es un hábito, no una campaña.",
    resumen: [
      "Google dice que la cantidad de reseñas y la calificación influyen en el ranking local.",
      "El mejor momento para pedirla es cuando el cliente está contento y todavía en el local.",
      "Está prohibido pagar o premiar reseñas y pedírselas solo a quien está conforme.",
      "Responder todas, buenas y malas, también cuenta.",
    ],
    secciones: [
      {
        h2: "Por qué las reseñas mueven la aguja",
        html: `<p>Google explica en su ayuda de Perfil de Empresa que los resultados locales se ordenan por tres factores: <strong>relevancia</strong>, <strong>distancia</strong> y <strong>prominencia</strong>. Las reseñas entran en la prominencia: según Google, la cantidad de reseñas y la calificación influyen en el ranking local, y más reseñas y valoraciones positivas pueden mejorarlo.</p>
<p>Además del algoritmo está la persona: entre dos lugares parecidos y cerca, casi todo el mundo elige el que tiene más reseñas recientes y mejor puntaje. Una ficha con 12 reseñas de hace dos años compite mal contra una con 300 del último mes.</p>`,
      },
      {
        h2: "El momento justo: pedirla antes de que el cliente se vaya",
        html: `<p>La mayoría de los clientes contentos no deja reseña porque nadie se la pidió o porque, cuando se acuerdan, ya están en otra cosa. Lo que más funciona es acortar el camino:</p>
<ol><li><strong>Pedirla en persona</strong>, al cobrar o al entregar, con una frase corta: "¿Nos dejás una reseña en Google? Nos ayuda mucho".</li>
<li><strong>Que el link esté a un toque</strong>: un cartel NFC o un QR en el mostrador que abra directo la ventana de reseña, sin buscar el local ni iniciar sesión de nuevo.</li>
<li><strong>Que todo el equipo lo haga</strong>, no solo el dueño. Las tarjetas personales por empleado ayudan a que cada uno lo tome como propio.</li>
<li><strong>Medirlo</strong>: cuántas veces se usa el cartel y cuántas reseñas llegan después. Sin medición, "pedimos reseñas" no se puede mejorar.</li></ol>`,
      },
      {
        h2: "Lo que Google prohíbe (y te puede costar la ficha)",
        html: `<p class="aviso">Las políticas de contenido de Google para reseñas prohíben ofrecer o aceptar dinero, descuentos o regalos a cambio de reseñas, y también <strong>pedir reseñas solo a los clientes conformes</strong> o desanimar las negativas (lo que en inglés se llama <em>review gating</em>).</p>
<p>En la práctica: no sortees nada entre quienes dejan reseña, no armes un formulario que mande a Google solo a los que ponen 5 estrellas y no publiques reseñas falsas ni de empleados. Google puede borrar reseñas, bloquear la recepción de nuevas o mostrar una advertencia en la ficha. El camino que funciona es el mismo para todos los clientes: el mismo link, sin filtros.</p>`,
      },
      {
        h2: "Responder todas: buenas, malas y las que son solo estrellas",
        html: `<p>Responder demuestra que hay alguien del otro lado, y la respuesta la leen los próximos clientes, no solo el autor. Algunas reglas simples:</p>
<ul><li>Agradecé por el nombre y mencioná algo concreto de lo que dijo.</li>
<li>A una mala, respondé rápido, sin discutir en público, y ofrecé seguir por privado.</li>
<li>No copies la misma respuesta en todas: se nota y no suma.</li>
<li>Una reseña de 1★ se compensa con varias de 5★: cuántas depende de tu promedio (la calculadora de abajo lo cuenta).</li></ul>`,
      },
      {
        h2: "Cómo saber si está funcionando",
        html: `<p>Tres números alcanzan para empezar: <strong>reseñas nuevas por semana</strong>, <strong>calificación</strong> y <strong>cuántas personas te vieron en Google</strong> (vistas de la ficha). Si las reseñas suben y las vistas acompañan, vas bien. Mirá también <em>qué</em> dicen: los temas que se repiten en las quejas son la lista de cosas para arreglar.</p>`,
      },
    ],
    calc: "resenas",
    faq: [
      ["¿Puedo regalar algo a cambio de una reseña en Google?", "No. Las políticas de Google prohíben ofrecer dinero, descuentos, regalos o cualquier incentivo a cambio de reseñas. Lo que sí podés hacer es pedirla a todos tus clientes por igual y hacerlo fácil."],
      ["¿Está mal pedir reseñas solo a los clientes contentos?", "Sí. Google prohíbe pedir reseñas de forma selectiva solo a quienes están conformes o desanimar las negativas. El mismo pedido tiene que llegarle a todos."],
      ["¿Cuántas reseñas necesito para aparecer en Google Maps?", "No hay un número mágico: el ranking local combina relevancia, distancia y prominencia. Más reseñas y mejor calificación ayudan a la prominencia, y la constancia (reseñas recientes) pesa tanto como el total."],
      ["¿Sirve un cartel NFC o QR para pedir reseñas?", "Sirve porque acorta el camino: el cliente acerca el celular y se abre la ventana para calificar. Lo importante es que lleve a todos al mismo lugar, sin filtrar por calificación."],
    ],
    relacionadas: ["posicionamiento-en-google-maps", "seo-local-posicionamiento-web", "ciclo-de-vida-del-cliente"],
    producto: { href: "/reputacion", nombre: "MetricsField Reputación", texto: "Carteles NFC/QR que llevan directo a tu reseña de Google, y un panel con toques, reseñas, respuestas sugeridas y qué dicen tus clientes." },
  },
  {
    slug: "posicionamiento-en-google-maps",
    tema: "Google Maps",
    titulo: "Posicionamiento en Google Maps: cómo aparecer primero",
    h1: "Posicionamiento en Google Maps: cómo aparecer cuando te buscan cerca",
    descripcion:
      "Qué tiene en cuenta Google para ordenar los negocios en Maps (relevancia, distancia y prominencia) y una lista de tareas concretas para tu Perfil de Empresa.",
    lead: "Cuando alguien busca \"parrilla cerca\" o \"veterinaria en Nueva Córdoba\", Google arma una lista corta de negocios. Estar en esa lista es, para un local, más importante que tener página web.",
    resumen: [
      "Google ordena por relevancia, distancia y prominencia.",
      "La distancia no la controlás; la relevancia y la prominencia sí.",
      "Un perfil completo y actualizado es la base de todo lo demás.",
      "Reseñas constantes y respuestas rápidas suman prominencia.",
    ],
    secciones: [
      {
        h2: "Los tres factores que usa Google",
        html: `<p>Según la ayuda oficial de Perfil de Empresa de Google, los resultados locales se basan en:</p>
<table><thead><tr><th>Factor</th><th>Qué significa</th><th>Qué podés hacer</th></tr></thead><tbody>
<tr><td>Relevancia</td><td>Qué tan bien coincide tu perfil con lo que se busca.</td><td>Categoría principal correcta, categorías secundarias, servicios y descripción con las palabras que usa tu cliente.</td></tr>
<tr><td>Distancia</td><td>Qué tan lejos estás de quien busca o del lugar buscado.</td><td>Dirección exacta y bien ubicada en el mapa. No se puede "mejorar" de otra forma.</td></tr>
<tr><td>Prominencia</td><td>Qué tan conocido es tu negocio.</td><td>Reseñas (cantidad y calificación), respuestas, menciones en otros sitios y tu web.</td></tr>
</tbody></table>`,
      },
      {
        h2: "Lista de tareas para tu Perfil de Empresa",
        html: `<ol><li><strong>Verificá el perfil</strong> y asegurate de que la dirección y el pin en el mapa estén bien.</li>
<li><strong>Elegí bien la categoría principal</strong>: es la que más pesa en la relevancia. "Parrilla" no es lo mismo que "Restaurante".</li>
<li><strong>Horarios reales</strong>, incluidos feriados. Un local que figura abierto y está cerrado se gana malas reseñas.</li>
<li><strong>Fotos propias y recientes</strong> del frente, el interior y los productos.</li>
<li><strong>Servicios, productos y atributos</strong> completos (accesible, delivery, pago con tarjeta, etc.).</li>
<li><strong>Mismo nombre, dirección y teléfono</strong> en todos lados: tu web, redes, directorios.</li>
<li><strong>Reseñas de forma constante</strong> y respuesta a cada una.</li></ol>`,
      },
      {
        h2: "Qué no hacer",
        html: `<ul><li>Agregar palabras clave al nombre del negocio ("Juan Parrilla Mejor Asado Córdoba"): va contra las pautas de Google y puede suspender el perfil.</li>
<li>Crear fichas duplicadas o direcciones falsas para "estar en más barrios".</li>
<li>Comprar reseñas o premiarlas.</li></ul>`,
      },
      {
        h2: "Cómo medirlo sin inventar un ranking",
        html: `<p>La posición exacta en Maps cambia según quién busca, desde dónde y con qué palabras, así que un "puesto número 3" fijo no existe. Lo que sí se puede medir con datos de Google: <strong>cuántas personas vieron tu ficha</strong> (en Maps y en la Búsqueda), <strong>cuántas pidieron cómo llegar</strong>, <strong>cuántas llamaron</strong> y <strong>con qué palabras te encontraron</strong>. Si esas cifras crecen frente al mismo período del año anterior, tu visibilidad creció.</p>`,
      },
    ],
    calc: "resenas",
    faq: [
      ["¿Cuánto tarda en mejorar mi posición en Google Maps?", "Depende de la competencia de tu zona y del punto de partida. Los cambios en el perfil (categoría, horarios, fotos) se reflejan en días o semanas; la prominencia por reseñas se construye de forma constante, mes a mes."],
      ["¿Necesito página web para aparecer en Google Maps?", "No es obligatorio: el Perfil de Empresa alcanza para aparecer. Una web propia con tu nombre, dirección y teléfono coherentes ayuda a la prominencia y a la relevancia."],
      ["¿Se puede pagar para aparecer primero en Maps?", "Existen anuncios pagos que aparecen marcados como tales. La posición orgánica no se compra: depende de relevancia, distancia y prominencia."],
    ],
    relacionadas: ["como-conseguir-resenas-en-google", "seo-local-posicionamiento-web", "geo-aparecer-en-respuestas-de-ia"],
    producto: { href: "/reputacion", nombre: "MetricsField Reputación", texto: "Mide tus vistas en Google, pedidos de cómo llegar, llamadas y las palabras con las que te encuentran, junto con tus reseñas." },
  },
  {
    slug: "seo-local-posicionamiento-web",
    tema: "SEO local",
    titulo: "SEO local y posicionamiento web para comercios: guía paso a paso",
    h1: "SEO local y posicionamiento web para comercios: por dónde empezar",
    descripcion:
      "Qué es el SEO local, en qué se diferencia del posicionamiento web general y una ruta de 6 pasos para que tu negocio aparezca cuando lo buscan en tu ciudad.",
    lead: "El SEO local es lograr que te encuentren quienes buscan lo que vendés en tu zona. Para un comercio, empieza en Google Maps y sigue en tu web, no al revés.",
    resumen: [
      "SEO local = aparecer en búsquedas con intención de lugar (\"cerca\", un barrio, una ciudad).",
      "La base es el Perfil de Empresa de Google; la web suma relevancia y prominencia.",
      "Nombre, dirección y teléfono idénticos en todos lados.",
      "Contenido útil que responda lo que tu cliente pregunta.",
    ],
    secciones: [
      {
        h2: "SEO local vs. SEO general",
        html: `<p>El posicionamiento web "general" compite por búsquedas sin lugar ("cómo elegir zapatillas"); el local, por búsquedas donde la ubicación importa ("zapatería en Alberdi", "abierto ahora"). Para la segunda, Google mezcla resultados del mapa con resultados web, y el Perfil de Empresa suele aparecer arriba de todo.</p>`,
      },
      {
        h2: "Ruta de 6 pasos",
        html: `<ol><li><strong>Perfil de Empresa completo</strong> (ver la <a href="/guias/posicionamiento-en-google-maps">guía de Google Maps</a>).</li>
<li><strong>Una web rápida y clara</strong>: qué vendés, dónde estás, horarios, cómo contactarte. Que cargue bien en el celular.</li>
<li><strong>Una página por servicio o línea de producto</strong>, con el lenguaje de tu cliente.</li>
<li><strong>Datos estructurados</strong> (schema.org <code>LocalBusiness</code>) con nombre, dirección, horarios y teléfono, para que los buscadores los lean sin adivinar.</li>
<li><strong>Coherencia de datos</strong> en redes, directorios y marketplaces.</li>
<li><strong>Reseñas y menciones</strong>: cuanto más se habla de vos en lugares confiables, más prominencia.</li></ol>`,
      },
      {
        h2: "Contenido que trae clientes, no solo visitas",
        html: `<p>Escribí para las preguntas que te hacen en el mostrador: precios orientativos, cómo funciona un servicio, qué conviene elegir. Esas páginas posicionan y además llegan con el cliente ya informado. Medilo por consultas y ventas, no solo por visitas.</p>`,
      },
      {
        h2: "Qué medir",
        html: `<ul><li>Vistas de la ficha de Google, llamadas y pedidos de cómo llegar.</li>
<li>Búsquedas con las que te encontraron, separando las que incluyen tu nombre de las que no: las segundas son gente que te descubrió sin conocerte.</li>
<li>Consultas que llegan desde la web.</li></ul>`,
      },
    ],
    faq: [
      ["¿Qué es el SEO local?", "Es el conjunto de prácticas para aparecer en búsquedas con intención de lugar, como \"cerca de mí\" o el nombre de un barrio. Combina el Perfil de Empresa de Google, la web propia, la coherencia de datos y las reseñas."],
      ["¿El SEO local sirve si vendo solo online?", "Sirve si tenés local, retiro en persona o atendés una zona. Si vendés en todo el país, pesa más el SEO general y, en marketplaces, las reglas de cada plataforma."],
      ["¿Cuánto cuesta el posicionamiento web?", "Lo básico (perfil completo, web clara, coherencia de datos, pedir reseñas) se puede hacer con tiempo propio. Lo que cuesta es la constancia: medir y mejorar todos los meses."],
    ],
    relacionadas: ["posicionamiento-en-google-maps", "geo-aparecer-en-respuestas-de-ia", "como-conseguir-resenas-en-google"],
    producto: { href: "/reputacion", nombre: "MetricsField Reputación", texto: "Te muestra las búsquedas con las que te encontraron y cuántas personas te descubrieron sin conocerte." },
  },
  {
    slug: "geo-aparecer-en-respuestas-de-ia",
    tema: "GEO e IA",
    titulo: "GEO: cómo aparecer en ChatGPT, Gemini y Perplexity",
    h1: "GEO: cómo aparecer cuando le preguntan a una IA por tu rubro",
    descripcion:
      "Qué es la optimización para motores generativos (GEO), en qué se parece y en qué no al SEO, y qué podés hacer hoy para que los asistentes de IA te recomienden.",
    lead: "Cada vez más gente le pregunta a un asistente de IA \"¿dónde como un buen asado en Córdoba?\". GEO es trabajar para que tu negocio sea una de las respuestas.",
    resumen: [
      "GEO = Generative Engine Optimization: optimizar para respuestas de IA.",
      "Los asistentes arman su respuesta con información pública: tu web, reseñas, directorios, notas.",
      "Datos claros, consistentes y verificables son la base.",
      "Medirlo exige preguntar seguido y anotar si aparecés.",
    ],
    secciones: [
      {
        h2: "Qué es GEO",
        html: `<p>El término se popularizó a partir de un trabajo académico de 2023 sobre cómo los motores generativos eligen y citan fuentes. La idea es simple: si una IA responde con una lista de lugares o de productos, estar en esa lista vale tanto como estar primero en Google.</p>`,
      },
      {
        h2: "Qué hace que una IA te mencione",
        html: `<ul><li><strong>Información clara sobre vos</strong> en tu web: qué hacés, para quién, dónde, precios orientativos, horarios.</li>
<li><strong>Coherencia</strong>: el mismo nombre, dirección y datos en tu web, tu Perfil de Empresa y los directorios.</li>
<li><strong>Reseñas abundantes y recientes</strong>: son una de las fuentes públicas más ricas sobre un negocio.</li>
<li><strong>Menciones en sitios confiables</strong>: notas, guías, listas de tu ciudad.</li>
<li><strong>Datos estructurados</strong> (schema.org) y páginas que respondan preguntas concretas.</li></ul>`,
      },
      {
        h2: "llms.txt y otras ayudas técnicas",
        html: `<p>Existe una propuesta llamada <code>llms.txt</code>: un archivo en la raíz del sitio que resume en texto plano qué es tu negocio y cuáles son tus páginas importantes, pensado para modelos de lenguaje. Es una propuesta, no un estándar obligatorio, pero es barato de hacer y no tiene contras. Este sitio publica el suyo en <a href="/llms.txt">/llms.txt</a>.</p>`,
      },
      {
        h2: "Cómo medirlo",
        html: `<p>No hay un panel oficial de "posición en ChatGPT". Lo honesto es armar una lista corta de preguntas que haría tu cliente ("mejor parrilla en Nueva Córdoba", "veterinaria abierta los domingos en Córdoba"), hacerlas cada mes en los asistentes más usados y anotar si aparecés y con qué datos. La tendencia de varios meses dice más que una sola respuesta.</p>`,
      },
    ],
    faq: [
      ["¿GEO reemplaza al SEO?", "No. Comparten la base: información clara, coherente y confiable sobre tu negocio. Lo que cambia es dónde aparecés: en una respuesta generada en lugar de una lista de links."],
      ["¿Puedo pagar para que ChatGPT me recomiende?", "No hay una forma de pagar por aparecer en las respuestas orgánicas de los asistentes. Lo que funciona es ser una buena fuente: datos claros, reseñas y menciones confiables."],
      ["¿Qué es llms.txt?", "Una propuesta de archivo de texto en la raíz del sitio que resume qué hace tu negocio y cuáles son tus páginas clave, pensado para modelos de lenguaje. No es un estándar oficial, pero es simple de publicar."],
    ],
    relacionadas: ["seo-local-posicionamiento-web", "como-conseguir-resenas-en-google", "posicionamiento-en-google-maps"],
    producto: { href: "/reputacion", nombre: "MetricsField Reputación", texto: "En el plan Premium registramos cada mes si los principales asistentes de IA te recomiendan." },
  },
  {
    slug: "rentabilidad-real-mercado-libre",
    tema: "Mercado Libre",
    titulo: "Ganancia real de una venta en Mercado Libre: cómo calcularla",
    h1: "Cómo calcular la ganancia real de una venta en Mercado Libre",
    descripcion:
      "Todo lo que se descuenta de una venta en Mercado Libre (comisión, envío, publicidad, impuestos) y cómo calcular tu margen real, con calculadora.",
    lead: "Facturar no es ganar. Entre comisión, envío, publicidad e impuestos, una venta que parece buena puede dejar muy poco, o hacerte perder plata sin que lo notes.",
    resumen: [
      "Ganancia real = precio − comisión − cargo fijo − envío − publicidad − impuestos − costo.",
      "La comisión depende de la categoría y del tipo de publicación.",
      "La publicidad hay que repartirla entre las ventas que generó.",
      "Mirarlo venta por venta muestra los productos que pierden plata.",
    ],
    secciones: [
      {
        h2: "Qué se descuenta de cada venta",
        html: `<table><thead><tr><th>Concepto</th><th>De qué depende</th></tr></thead><tbody>
<tr><td>Comisión por venta</td><td>Categoría del producto y tipo de publicación (por ejemplo, Clásica o Premium). Mercado Libre publica la tabla vigente.</td></tr>
<tr><td>Cargo fijo</td><td>Se aplica a productos por debajo de cierto precio. El umbral y el monto cambian; revisalos en la tabla oficial.</td></tr>
<tr><td>Envío</td><td>Lo que pagás vos del envío (por ejemplo, cuando ofrecés envío gratis) y la logística, como Full.</td></tr>
<tr><td>Publicidad</td><td>Lo que gastaste en Product Ads, repartido entre las ventas.</td></tr>
<tr><td>Impuestos y retenciones</td><td>Ingresos Brutos, retenciones e IVA según tu condición fiscal.</td></tr>
<tr><td>Costo del producto</td><td>Lo que te costó la unidad, con el flete hasta tu depósito.</td></tr>
</tbody></table>
<p class="aviso">Los porcentajes y montos de Mercado Libre cambian. Tomá siempre los de tu cuenta o los de la tabla oficial vigente: los de esta guía y la calculadora son de ejemplo.</p>`,
      },
      {
        h2: "La cuenta, paso a paso",
        html: `<ol><li>Partí del <strong>precio de venta</strong>.</li>
<li>Restá la <strong>comisión</strong> (precio × porcentaje) y el <strong>cargo fijo</strong> si corresponde.</li>
<li>Restá lo que pagás de <strong>envío</strong>.</li>
<li>Restá la <strong>publicidad</strong> asignada a esa venta.</li>
<li>Restá <strong>impuestos y retenciones</strong>.</li>
<li>Restá el <strong>costo</strong> del producto. Lo que queda es tu ganancia real; dividida por el precio, tu margen real.</li></ol>`,
      },
      {
        h2: "Los errores más comunes",
        html: `<ul><li>Mirar solo la facturación del mes, sin restar lo que se llevó la plataforma.</li>
<li>No cargar el costo de algún producto: sus ventas parecen todas ganancia.</li>
<li>Olvidar las devoluciones y las ventas canceladas.</li>
<li>Repartir la publicidad mal: un producto puede vender mucho solo porque lo empujan los anuncios.</li>
<li>No mirar las publicaciones dadas de baja que siguen teniendo ventas en el historial.</li></ul>`,
      },
      {
        h2: "De la cuenta a la decisión",
        html: `<p>Con el margen real por producto podés decidir qué subir de precio, qué dejar de publicitar, qué conviene mandar a Full y qué conviene dejar de vender. Esa es la diferencia entre "vendo mucho" y "gano bien".</p>`,
      },
    ],
    calc: "ml",
    faq: [
      ["¿Cuánto cobra Mercado Libre por vender?", "Cobra una comisión que depende de la categoría y del tipo de publicación, más un cargo fijo en productos por debajo de cierto precio. Los valores cambian: consultá la tabla oficial vigente o los cargos de tu cuenta."],
      ["¿Cómo sé si un producto me hace perder plata?", "Calculando su ganancia real venta por venta: precio menos comisión, cargo fijo, envío, publicidad, impuestos y costo. Si el resultado es negativo de forma sostenida, ese producto te cuesta plata."],
      ["¿La publicidad de Mercado Libre conviene?", "Conviene si la ganancia de las ventas que genera supera lo que gastás. Para saberlo hay que mirar ganancia neta, no solo ventas."],
    ],
    relacionadas: ["clientes-recurrentes", "fidelizacion-de-clientes", "ciclo-de-vida-del-cliente"],
    producto: { href: "/retail", nombre: "MetricsField Retail", texto: "Conecta tu cuenta de Mercado Libre y calcula sola la ganancia real de cada venta, producto por producto." },
  },
  {
    slug: "fidelizacion-de-clientes",
    tema: "Fidelización",
    titulo: "Fidelización de clientes para comercios: qué funciona",
    h1: "Fidelización de clientes: cómo lograr que vuelvan (y saber quiénes son)",
    descripcion:
      "Por qué fidelizar es más barato que conseguir clientes nuevos, qué programas de fidelización funcionan en comercios y cómo medir si un cliente vuelve.",
    lead: "Un cliente que vuelve ya te conoce, compra con más confianza y recomienda. Fidelizar es diseñar razones para volver y poder medir que vuelven.",
    resumen: [
      "Fidelizar empieza por saber quién compra y cada cuánto vuelve.",
      "Los programas simples (sellos, puntos, beneficios) funcionan si son claros.",
      "Sin datos, un programa de fidelización es solo un descuento.",
      "La métrica clave: qué parte de tus clientes vuelve en un período.",
    ],
    secciones: [
      {
        h2: "Por qué conviene fidelizar",
        html: `<p>Conseguir un cliente nuevo cuesta: publicidad, descuentos, tiempo. Un cliente que vuelve ya pasó por todo eso. Por eso pequeños aumentos en la cantidad de clientes que vuelven pueden mover mucho la ganancia: cada visita extra se apoya en una relación que ya existe. La calculadora de esta página te muestra cuánto vale, en tu caso, un cliente que vuelve.</p>`,
      },
      {
        h2: "Tipos de programas que funcionan",
        html: `<table><thead><tr><th>Programa</th><th>Cómo funciona</th><th>Para quién</th></tr></thead><tbody>
<tr><td>Sellos</td><td>"La 10.ª es gratis". Fácil de entender.</td><td>Cafeterías, lavaderos, peluquerías.</td></tr>
<tr><td>Puntos</td><td>Cada compra suma; los puntos se canjean.</td><td>Comercios con tickets variables.</td></tr>
<tr><td>Niveles</td><td>Beneficios crecientes según cuánto comprás.</td><td>Clientes frecuentes de alto valor.</td></tr>
<tr><td>Beneficios por hito</td><td>Cumpleaños, aniversario, primera visita del mes.</td><td>Cualquier rubro; refuerza la relación.</td></tr>
</tbody></table>`,
      },
      {
        h2: "Lo que hace que un programa falle",
        html: `<ul><li>Reglas confusas o premios inalcanzables.</li>
<li>Tarjetas de cartón que se pierden o apps que nadie descarga.</li>
<li>No saber quién es quién: sin identificar al cliente, no hay relación posible.</li>
<li>No medir: si no sabés cuántos vuelven, no sabés si el programa sirve.</li></ul>`,
      },
      {
        h2: "Cómo medir la fidelización",
        html: `<ul><li><strong>Tasa de recompra</strong>: qué parte de tus clientes volvió a comprar en un período (por ejemplo, 60 días).</li>
<li><strong>Frecuencia</strong>: cada cuánto vuelve un cliente promedio.</li>
<li><strong>Valor del cliente en el tiempo</strong>: cuánto deja un cliente mientras sigue viniendo.</li>
<li><strong>Clientes dormidos</strong>: los que venían y dejaron de venir, para hablarles antes de perderlos.</li></ul>`,
      },
    ],
    calc: "cliente",
    faq: [
      ["¿Qué es la fidelización de clientes?", "Es el conjunto de acciones para que un cliente vuelva a comprar y elija tu negocio sobre otros. Incluye la experiencia, los programas de beneficios y la comunicación después de la compra."],
      ["¿Cuál es el mejor programa de fidelización para un comercio chico?", "Uno simple: sellos o puntos con reglas claras, que el cliente lleve siempre encima (por ejemplo, en la billetera del celular) y que te permita saber quién vuelve."],
      ["¿Cómo sé si mi programa de fidelización funciona?", "Mirá la tasa de recompra y la frecuencia antes y después de lanzarlo, y comparalas con el mismo período del año anterior para descontar la temporada."],
    ],
    relacionadas: ["tarjeta-de-fidelidad-google-wallet", "clientes-recurrentes", "crm-gestion-de-clientes"],
    producto: { href: "/loyalty", nombre: "MetricsField Loyalty", texto: "Club de beneficios con tarjeta en Google Wallet, sellos o puntos y canje en el mostrador. En etapa piloto." },
  },
  {
    slug: "tarjeta-de-fidelidad-google-wallet",
    tema: "Wallet",
    titulo: "Tarjeta de fidelidad en Google Wallet y Apple Wallet",
    h1: "Tarjeta de fidelidad en Google Wallet: el club de tu negocio en la billetera del celular",
    descripcion:
      "Qué es una tarjeta de fidelidad digital en Google Wallet o Apple Wallet, por qué funciona mejor que el cartón o una app propia y qué hace falta para tener una.",
    lead: "La billetera del celular ya está en el bolsillo de tus clientes. Una tarjeta de fidelidad ahí no se pierde, no ocupa lugar y no pide descargar nada.",
    resumen: [
      "Google Wallet y Apple Wallet admiten tarjetas de fidelidad (pases).",
      "El cliente la guarda con un toque, sin instalar una app.",
      "La tarjeta puede mostrar sellos o puntos y actualizarse sola.",
      "El comercio identifica al cliente y sabe cuándo vuelve.",
    ],
    secciones: [
      {
        h2: "Qué es un pase de fidelidad",
        html: `<p>Google Wallet y Apple Wallet permiten guardar tarjetas de fidelidad digitales, además de tarjetas de pago y entradas. El negocio emite un pase con su marca; el cliente lo agrega con un botón ("Agregar a Google Wallet") y queda guardado en el celular, listo para mostrar en el mostrador.</p>`,
      },
      {
        h2: "Por qué funciona mejor que el cartón o una app propia",
        html: `<table><thead><tr><th></th><th>Cartón</th><th>App propia</th><th>Billetera del celular</th></tr></thead><tbody>
<tr><td>Hay que descargar algo</td><td>No</td><td>Sí</td><td>No</td></tr>
<tr><td>Se pierde</td><td>Seguido</td><td>Se borra</td><td>Rara vez</td></tr>
<tr><td>Sabés quién es el cliente</td><td>No</td><td>Sí</td><td>Sí</td></tr>
<tr><td>Se actualiza sola</td><td>No</td><td>Sí</td><td>Sí</td></tr>
</tbody></table>`,
      },
      {
        h2: "Qué hace falta para tener una",
        html: `<ol><li>Definir el beneficio: sellos, puntos o niveles, con reglas claras.</li>
<li>Una forma de alta rápida: un QR o un cartel NFC en el mostrador.</li>
<li>Un sistema que emita los pases, sume sellos y valide canjes sin que nadie haga trampa.</li>
<li>Cuidado de los datos personales: pedir solo lo necesario y con consentimiento.</li></ol>`,
      },
    ],
    calc: "cliente",
    faq: [
      ["¿Mis clientes necesitan instalar una app para usar una tarjeta en Google Wallet?", "No. Google Wallet viene en la mayoría de los Android, y el cliente agrega la tarjeta con un botón desde el navegador."],
      ["¿Funciona en iPhone?", "Apple Wallet también admite tarjetas de fidelidad. Cada billetera tiene su propio formato de pase."],
      ["¿Puedo ver quién usa la tarjeta?", "Sí: a diferencia del cartón, cada pase está asociado a un cliente, así que podés saber quién volvió y cuándo, siempre con su consentimiento."],
    ],
    relacionadas: ["fidelizacion-de-clientes", "clientes-recurrentes", "crm-gestion-de-clientes"],
    producto: { href: "/loyalty", nombre: "MetricsField Loyalty", texto: "Tarjeta de tu club en Google Wallet, alta con un toque y canje con QR de un solo uso. Buscamos comercios piloto." },
  },
  {
    slug: "clientes-recurrentes",
    tema: "Clientes recurrentes",
    titulo: "Clientes recurrentes: cómo medirlos y aumentarlos",
    h1: "Clientes recurrentes: cómo medirlos y cómo lograr que sean más",
    descripcion:
      "Cómo calcular la tasa de clientes recurrentes y el valor de un cliente en el tiempo, y qué acciones concretas aumentan la recompra en comercios y tiendas online.",
    lead: "Saber cuántos de tus clientes vuelven es la diferencia entre crecer y llenar un balde agujereado: si no vuelven, cada mes empezás de cero.",
    resumen: [
      "Tasa de recompra = clientes que volvieron ÷ clientes del período.",
      "Valor del cliente = margen por compra × compras por mes × meses.",
      "Identificar al cliente es condición para medir.",
      "Hablarle al que dejó de venir antes de que sea tarde.",
    ],
    secciones: [
      {
        h2: "Las dos cuentas que importan",
        html: `<p><strong>Tasa de recompra</strong>: de los clientes que compraron en un período, cuántos volvieron a comprar en el siguiente. Por ejemplo, de 200 clientes de septiembre, si 70 volvieron en octubre, la tasa es 35%.</p>
<p><strong>Valor del cliente en el tiempo</strong>: cuánta ganancia deja mientras sigue viniendo. La calculadora de abajo lo estima con tu ticket, tu margen, la frecuencia y cuántos meses suele quedarse.</p>`,
      },
      {
        h2: "Qué aumenta la recompra",
        html: `<ul><li><strong>Una buena primera experiencia</strong>: el que se fue molesto no vuelve, y además lo cuenta.</li>
<li><strong>Una razón para volver</strong>: un beneficio claro (sellos, puntos, algo en la próxima visita).</li>
<li><strong>Recordatorios oportunos</strong>: cuando corresponde reponer, cuando hace mucho que no viene.</li>
<li><strong>Responder</strong>: reseñas, consultas y reclamos rápido.</li></ul>`,
      },
      {
        h2: "En Mercado Libre",
        html: `<p>En un marketplace la relación es con la plataforma, no con vos. Aun así podés trabajar la recompra con buena atención en las preguntas, envíos cumplidos, seguidores de tu tienda y promociones a quienes ya te compraron dentro de las herramientas que ofrece Mercado Libre.</p>`,
      },
    ],
    calc: "cliente",
    faq: [
      ["¿Qué es un cliente recurrente?", "Es un cliente que vuelve a comprar después de su primera compra. La tasa de recompra mide qué parte de tus clientes lo hace en un período."],
      ["¿Cuál es una buena tasa de recompra?", "Depende mucho del rubro: una cafetería y una mueblería no se comparan. Lo útil es medir la tuya y compararla contra vos mismo, mes a mes y año contra año."],
      ["¿Cómo calculo el valor de un cliente?", "Multiplicá tu margen por compra por la cantidad de compras por mes y por los meses que suele seguir viniendo. Es una estimación para decidir cuánto invertir en que vuelva."],
    ],
    relacionadas: ["fidelizacion-de-clientes", "crm-gestion-de-clientes", "ciclo-de-vida-del-cliente"],
    producto: { href: "/loyalty", nombre: "MetricsField Loyalty", texto: "Identifica a tus clientes con una tarjeta en la billetera del celular y mide quién vuelve y cada cuánto." },
  },
  {
    slug: "crm-gestion-de-clientes",
    tema: "Gestión de clientes",
    titulo: "CRM para comercios y pymes: qué necesitás de verdad",
    h1: "Sistema de gestión de clientes para comercios: qué necesitás de verdad",
    descripcion:
      "Qué es un CRM, qué datos de clientes conviene guardar en un comercio o una pyme, cómo empezar simple y cómo cuidar los datos personales.",
    lead: "Un CRM no es un software caro: es saber quiénes son tus clientes, qué compraron, qué opinaron y cuándo conviene volver a hablarles.",
    resumen: [
      "CRM = gestión de la relación con el cliente.",
      "Empezá por pocos datos útiles, no por un sistema enorme.",
      "Juntá en un lugar compras, visitas, opiniones y contacto.",
      "Datos personales: solo lo necesario y con consentimiento.",
    ],
    secciones: [
      {
        h2: "Qué datos conviene tener",
        html: `<table><thead><tr><th>Dato</th><th>Para qué sirve</th></tr></thead><tbody>
<tr><td>Contacto (con consentimiento)</td><td>Avisos, beneficios, recordatorios.</td></tr>
<tr><td>Visitas o compras</td><td>Frecuencia, recompra, clientes dormidos.</td></tr>
<tr><td>Opiniones y reseñas</td><td>Qué valora y qué le molesta.</td></tr>
<tr><td>Beneficios usados</td><td>Qué lo hace volver.</td></tr>
</tbody></table>`,
      },
      {
        h2: "Empezar simple",
        html: `<ol><li>Elegí una forma de identificar al cliente que no lo canse (una tarjeta en el celular, su número de cliente).</li>
<li>Registrá visitas o compras de forma automática siempre que puedas.</li>
<li>Mirá una vez por semana: quién volvió, quién dejó de venir, qué dijeron.</li>
<li>Actuá sobre eso: un beneficio, un mensaje, una mejora.</li></ol>`,
      },
      {
        h2: "Cuidar los datos personales",
        html: `<p>En Argentina, la Ley 25.326 de Protección de Datos Personales regula cómo se recolectan y usan. Lo mínimo: pedir solo lo necesario, decir para qué, obtener consentimiento, guardar los datos de forma segura y permitir que la persona los consulte o pida borrarlos.</p>`,
      },
    ],
    faq: [
      ["¿Qué es un CRM?", "Customer Relationship Management: un sistema para gestionar la relación con tus clientes, con sus datos de contacto, compras, visitas y opiniones en un solo lugar."],
      ["¿Un comercio chico necesita un CRM?", "Necesita lo que hace un CRM: saber quiénes son sus clientes y cuándo vuelven. Puede empezar con algo simple, como un club de beneficios que registre las visitas."],
      ["¿Qué datos de mis clientes puedo guardar?", "Los necesarios para el fin que informás, con consentimiento y cuidándolos según la Ley 25.326 de Protección de Datos Personales."],
    ],
    relacionadas: ["clientes-recurrentes", "fidelizacion-de-clientes", "ciclo-de-vida-del-cliente"],
    producto: { href: "/loyalty", nombre: "MetricsField Loyalty", texto: "Tus clientes, sus visitas y sus beneficios en un solo lugar, con alta por consentimiento." },
  },
  {
    slug: "ciclo-de-vida-del-cliente",
    tema: "Ciclo del cliente",
    titulo: "Ciclo de vida del cliente: de Google a la recompra",
    h1: "El ciclo completo del cliente: te encuentra, te elige, compra, vuelve y te recomienda",
    descripcion:
      "Las cinco etapas del ciclo de vida del cliente en un comercio, qué métrica mirar en cada una y qué herramienta la mueve: SEO, reseñas, rentabilidad y fidelización.",
    lead: "Cada etapa del cliente deja un dato. Mirarlas juntas muestra dónde se pierde la gente y dónde conviene poner el esfuerzo este mes.",
    resumen: [
      "Te encuentran → te eligen → compran → vuelven → te recomiendan.",
      "Cada etapa tiene una métrica propia.",
      "El cuello de botella es donde se pierde más gente.",
      "La recomendación (reseñas) alimenta de nuevo el comienzo.",
    ],
    secciones: [
      {
        h2: "Las cinco etapas y qué medir",
        html: `<table><thead><tr><th>Etapa</th><th>Qué pasa</th><th>Qué medir</th></tr></thead><tbody>
<tr><td>1. Te encuentran</td><td>Te buscan en Google, Maps o una IA.</td><td>Vistas de la ficha, búsquedas sin tu nombre, menciones en IA.</td></tr>
<tr><td>2. Te eligen</td><td>Comparan reseñas, fotos, precio.</td><td>Calificación, reseñas recientes, pedidos de cómo llegar, llamadas.</td></tr>
<tr><td>3. Compran</td><td>La venta, en el local o online.</td><td>Ventas, ticket y, sobre todo, ganancia real.</td></tr>
<tr><td>4. Vuelven</td><td>Segunda, tercera compra.</td><td>Tasa de recompra, frecuencia, clientes dormidos.</td></tr>
<tr><td>5. Te recomiendan</td><td>Dejan una reseña, traen a otro.</td><td>Reseñas nuevas, menciones, referidos.</td></tr>
</tbody></table>`,
      },
      {
        h2: "Encontrar el cuello de botella",
        html: `<p>Si mucha gente te ve pero pocos piden cómo llegar, el problema está en "te eligen" (reseñas, fotos, horarios). Si venden mucho pero ganan poco, está en "compran" (costos y comisiones). Si compran una vez y no vuelven, está en "vuelven". Mejorar la etapa más débil rinde más que empujar la que ya anda bien.</p>`,
      },
      {
        h2: "Cómo se conecta todo",
        html: `<p>Las reseñas cierran el círculo: un cliente contento que deja su reseña ayuda a que el próximo te encuentre y te elija. Por eso conviene mirar el ciclo entero y no cada herramienta por separado.</p>`,
      },
    ],
    faq: [
      ["¿Qué es el ciclo de vida del cliente?", "Es el recorrido de un cliente desde que te descubre hasta que vuelve a comprar y te recomienda. En un comercio se puede resumir en cinco etapas: te encuentran, te eligen, compran, vuelven y te recomiendan."],
      ["¿Qué etapa conviene mejorar primero?", "La que más gente pierde. Medí cada etapa con su métrica y empezá por la más débil."],
      ["¿Cómo se relacionan las reseñas con la recompra?", "Un cliente que vuelve y está contento es el que más probablemente deje una reseña, y esa reseña ayuda a que nuevos clientes te encuentren y te elijan."],
    ],
    relacionadas: ["como-conseguir-resenas-en-google", "rentabilidad-real-mercado-libre", "fidelizacion-de-clientes"],
    producto: { href: "/", nombre: "MetricsField", texto: "Reputación, Retail y Loyalty: una herramienta para cada etapa del ciclo, con los datos conectados." },
  },
];
