// Google Analytics en el portal del cliente, para saber qué secciones se
// usan. Solo se carga si está NEXT_PUBLIC_GA_ID (ver .env.example).
//
// El código de acceso viaja en la URL (/portal/<codigo>) y es la única
// credencial del portal: nunca le llega a Google. La dirección que se
// reporta lo reemplaza por "codigo", tanto en la página como en la de
// origen. Por eso el flujo de GA tiene que tener apagadas las vistas por
// cambios del historial (medición mejorada): esas usarían la URL real.
//
// Un script inline con el nonce de la CSP (middleware.ts) carga gtag.js; con
// 'strict-dynamic' lo que ese script agrega también queda permitido.

const MASCARA = String.raw`/\/portal\/[^/?#]+/`;

function codigoGtag(gaId: string, comercio: string): string {
  const id = JSON.stringify(gaId);
  return `(function(){
var m=${MASCARA};
function limpia(u){return u?u.replace(m,"/portal/codigo"):u;}
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
var s=document.createElement("script");
s.async=true;
s.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(${id});
document.head.appendChild(s);
var ubicacion=limpia(location.origin+location.pathname+location.search);
gtag("js",new Date());
gtag("config",${id},{send_page_view:false,page_location:ubicacion,page_referrer:limpia(document.referrer),page_title:"Portal"});
gtag("event","page_view",{comercio:${JSON.stringify(comercio)}});
window.addEventListener("portal:panel",function(e){
gtag("event","ver_panel",{panel:String(e.detail),comercio:${JSON.stringify(comercio)}});
});
})();`;
}

export default function AnaliticaPortal({
  gaId,
  nonce,
  comercio,
}: {
  gaId: string;
  nonce: string | undefined;
  comercio: string;
}) {
  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: codigoGtag(gaId, comercio) }}
    />
  );
}
