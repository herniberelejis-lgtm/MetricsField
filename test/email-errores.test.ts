import { describe, expect, it } from "vitest";
import { explicarErrorEmail } from "@/lib/email";

describe("explicarErrorEmail", () => {
  it("usuario o contraseña rechazados: explica la contraseña de aplicación", () => {
    const m = explicarErrorEmail({ code: "EAUTH", responseCode: 535, response: "535-5.7.8 Username and Password not accepted" });
    expect(m).toContain("contraseña de aplicación");
    expect(m).toContain("535-5.7.8");
  });
  it("no conecta: revisar host y puerto", () => {
    expect(explicarErrorEmail({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" })).toContain("smtp.gmail.com y 587");
  });
  it("remitente no permitido: EMAIL_FROM tiene que ser la casilla de SMTP_USER", () => {
    expect(explicarErrorEmail({ code: "EENVELOPE", responseCode: 553, response: "553 sender not allowed" })).toContain("EMAIL_FROM");
  });
});
