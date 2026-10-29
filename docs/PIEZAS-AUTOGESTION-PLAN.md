# Piezas autogestionadas: dueños, revendedores y cambios — planteo y decisión

Contexto: el primer revendedor de Mercado Libre (Facundo, Villa Allende) no
podía cambiar a dónde lleva una pieza después de activarla. #228 lo destrabó
(pantalla "esta pieza la configuraste vos", edición en un paso, PIN nuevo),
pero sigue siendo poco práctico para alguien que maneja muchas piezas. Este
documento formula el problema completo, refuta las ideas que fueron
apareciendo y deja la decisión que se construye.

## 1. El problema

Una pieza (sticker, standee, tarjeta) tiene una URL fija
`app.metricsfield.com/t/<código>` grabada en el QR y en el chip. Se vende
suelta por Mercado Libre, sin configurar. Quien la compra la configura
escaneándola. A partir de ahí, **cualquiera** que la escanee va directo a la
reseña de Google del negocio elegido — sin pantallas intermedias (regla del
producto).

Quién la compra:

| Tipo | Piezas | Qué necesita |
|---|---|---|
| Dueño de local | 1–3, un negocio | Activarla una vez y olvidarse. Cambiarla quizás nunca. |
| Revendedor / instalador | 10–100+, muchos negocios | Mostrarla en cada local (cambiarla en segundos, muchas veces por día), configurarla para el local que la compra y **entregarla** (que deje de ser suya). Ver todas sus piezas juntas. |
| Dueño con varios locales | 3–20, varios negocios propios | Como el revendedor pero sin entregar. |

Ninguno quiere "el software" (panel de reputación). Quieren que la pieza
lleve al lugar correcto.

## 2. Variables y restricciones

- **El comprador es anónimo.** Mercado Libre no nos da sus datos y no podemos
  usarlos (regla del canal). No hay cuenta.
- **La URL de la pieza no se puede cambiar** (está impresa/grabada) y al
  escanearla tiene que ir directo a Google para el cliente final. No se puede
  agregar una pantalla intermedia para todos.
- **No sabemos si el código viene impreso** a la vista: el lote se exporta
  como URLs para la imprenta. No podemos depender de que alguien lo tipee.
- **Navegadores:** la cámara del iPhone abre Safari; la de Android, Chrome. Los
  lectores de QR de terceros y WhatsApp/Instagram abren su navegador interno,
  que no comparte nada con el principal.
- **Safari borra el almacenamiento escrito por JavaScript** (localStorage) de
  un sitio que no se usó en 7 días (ITP). Las cookies que pone el servidor
  (`Set-Cookie` HttpOnly, primer nivel) no tienen ese tope. #228 usa
  localStorage: a un dueño de local que no vuelve en una semana se le olvida.
- **Seguridad:** el código de la pieza no es secreto (está en el QR, cualquiera
  lo ve). Lo único secreto es el PIN (4–8 dígitos, con límites contra fuerza
  bruta: 5/15 min por IP+pieza, 10/h y 30/día por pieza).
- **Límites que molestan al revendedor:** esos mismos 10 cambios por hora y 30
  por día por pieza frenan a quien hace demos con una misma pieza toda la
  tarde. Están para frenar a quien adivina PINs, no a quien ya demostró
  conocerlo.
- **Toques:** hoy, cuando el dueño escanea su propia pieza para probarla o
  mostrarla, se cuenta como un toque. En demos infla los números.
- **Costo de Google:** cada cambio usa Autocomplete (barato, por sesión) y un
  detalle del lugar. Con límites por IP y por pieza, acotado.
- **Esquema de base:** cualquier columna nueva hay que correrla a mano en Neon y
  el código tiene que andar igual si todavía no se corrió.
- **No romper lo que anda:** activación, redirección directa, edición con PIN,
  admin (asignar, PIN nuevo), aviso semanal, piezas de agencia, Loyalty,
  pruebas de permisos (43) y tests (233).

## 3. Alternativas y refutaciones

### A. Un link `/editar` + PIN por pieza (lo de #228)
Funciona, pero con 30 piezas son 30 links y 30 PINs. **Descartada como
solución principal** (queda como respaldo: el link del mensaje de entrega).

### B. Cuenta con mail y código de acceso
El estándar de la competencia (Zappycards, HotLabel, Popl, QR dinámicos): una
cuenta con todas las tarjetas.
- A favor: sirve desde cualquier dispositivo, sobrevive a perder el celular.
- En contra: pedirle el mail a un dueño de local que solo quiere activarla es
  fricción; mails que no llegan o mal escritos; hay que crear una tabla nueva
  (migración) y un sistema de sesiones; el usuario lo vive como "otra cuenta
  más", justo lo que no quiere. Para el caso real de hoy (un revendedor que
  trabaja desde su celular) resuelve algo que no le duele.
- **Postergada**: es el paso natural cuando exista el programa de revendedores
  (ahí sí hay una relación con nosotros y un mail que importa).

### C. Dos formatos: "para mi negocio" vs "para revender" (pregunta al activar)
- A favor: cada uno ve solo lo suyo.
- **Refutación:** obliga a clasificarse a alguien que no sabe en qué categoría
  está (el dueño con 3 locales, el que compra una para probar y después
  revende); una elección equivocada lo deja en el camino incorrecto y hay que
  explicar cómo cambiarse; duplica pantallas y casos a probar; y todo lo que el
  revendedor necesita le sirve también al dueño cuando le hace falta. Una
  pregunta más en la activación es justo la fricción que queremos sacar.
- **Mejor:** un solo camino donde las herramientas aparecen **cuando hacen
  falta** (divulgación progresiva). El dueño de un local nunca ve nada nuevo;
  el que tiene varias piezas ve "Mis piezas"; el botón "Entregar" aparece donde
  se cambia la pieza, como opción secundaria.

### D. Llavero en el celular (cookie del servidor) — **elegida**
El celular que activó una pieza, o que puso bien su PIN una vez, queda
autorizado para esa pieza. Es lo que el usuario ya entiende: "desde mi
celular la manejo".
- Durable: cookie HttpOnly puesta por el servidor (no la borra el tope de 7
  días de Safari), válida un año, se renueva en cada uso.
- Sin secretos nuevos ni tabla nueva: la autorización de cada pieza es
  `HMAC(clave = hash del PIN de la pieza, mensaje = código)`. Solo el servidor
  puede calcularla, y **cambiar el PIN invalida automáticamente todos los
  celulares autorizados** (perder el celular → el equipo pone un PIN nuevo y el
  celular perdido deja de servir; entregar la pieza → el revendedor pierde el
  control solo).
- El servidor sabe que es el dueño **antes** de responder: no cuenta el toque
  y muestra la pantalla del dueño sin depender de JavaScript.
- Límite de tamaño: ~120 piezas por cookie; se usan hasta 3 cookies (≈360
  piezas por celular). Suficiente para hoy; la cuenta con mail (B) es el paso
  siguiente si alguien lo supera.
- En contra: es por navegador. Mitigación: "Sumar una pieza a este celular"
  (ver abajo) y el link de respaldo.

## 4. Diseño elegido

**Escanear la propia pieza** (celular autorizado): pantalla
"Esta pieza es tuya" → `Cambiar a dónde lleva` · `Ir a la reseña (como un
cliente)` · `Entregársela a otro negocio` · `Ver todas mis piezas`. No cuenta
como toque. Cualquier otro celular: directo a Google, como siempre.

**Cambiar** (`/t/<código>/editar`): con el celular autorizado no pide PIN —
buscar el negocio, tocarlo, listo. Sin autorización, pide el PIN una vez y
autoriza al celular. Límites altos para celulares autorizados (no hay PIN que
adivinar); los de siempre para el camino con PIN.

**Mis piezas** (`/mis-piezas`): la lista de piezas de este celular con a dónde
lleva cada una y los toques de la semana; en cada una `Cambiar` y `Entregar`.
Se llega desde la pantalla del dueño, desde "¡Listo!" y guardándola en
favoritos.

**Sumar una pieza a este celular** (sin tipear códigos): en Mis piezas, el botón
"Sumar una pieza" deja el celular "esperando" 10 minutos; se escanea la pieza
con la cámara y, en vez de ir a Google, pide su PIN y la suma. Si la pieza está
libre, abre la activación. Sirve para el celular nuevo, para el navegador
equivocado y para las piezas que se activaron antes de esto.

**Entregársela a otro negocio**: genera un PIN nuevo (lo puede cambiar), borra
el contacto del aviso semanal del dueño anterior, la saca del llavero y arma
el mensaje para mandarle al dueño nuevo por WhatsApp (link de `/editar` + PIN).
Al cambiar el PIN, ningún otro celular la sigue controlando.

**Compatibilidad**: las piezas marcadas en localStorage por #228 siguen
mostrando la pantalla del dueño y pasan al llavero la primera vez que se pone
el PIN. Activación, edición con PIN, admin y piezas de agencia no cambian.

## 5. Riesgos y cómo se cubren

| Riesgo | Cobertura |
|---|---|
| Robo/pérdida del celular | PIN nuevo desde el admin invalida el llavero. |
| Cookie copiada | Solo sirve para esa pieza y hasta que cambie el PIN; HttpOnly + Secure + SameSite=Lax. |
| Revendedor entrega y sigue controlando | Entregar cambia el PIN → su autorización deja de valer. |
| Fuerza bruta del PIN | Mismos límites que hoy en todo camino que reciba un PIN (activar no cambia; editar, sumar y entregar con PIN). |
| Demos que inflan toques | El dueño autorizado no cuenta toques. |
| Bot de WhatsApp leyendo la pieza | El bot no tiene cookie → ve la redirección normal, la miniatura no cambia. |
| "Modo sumar" abierto y escanea un cliente | El modo es solo de ese celular (cookie), dura 10 min y se cierra al usarse. |
| Pieza pasada a un cliente de agencia | El llavero solo vale para piezas autogestionadas sin cliente. |

## 6. Pruebas

- Unitarias del llavero (firmar, verificar, PIN cambiado invalida, tamaño y
  partición en cookies, datos corruptos) y del modo sumar.
- E2E del revendedor en el navegador: activar 3 piezas para 3 negocios, Mis
  piezas las muestra, cambiar sin PIN, demos seguidas sin límite, entregar
  (PIN nuevo, sale de la lista, el celular deja de controlarla, el PIN nuevo
  funciona en otro celular), sumar una pieza vieja con PIN, cliente sin cookie
  va directo a Google y su toque cuenta, el del dueño no.
- `prueba-permisos` (43) + casos nuevos: sin llavero no se puede cambiar sin
  PIN; llavero de otra pieza no sirve; llavero viejo después de cambiar el PIN
  no sirve; entregar sin autorización falla.
- `tsc`, lint, tests, build.
