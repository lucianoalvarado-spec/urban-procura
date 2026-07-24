"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PLANES } from "@/lib/plan";
import { setPlan } from "@/lib/state/plan-store";
import { setDatosEmpresa } from "@/lib/state/empresa-store";
import { crearRnpVacio, type PlanComercial } from "@/lib/data/types";
import type { RnpResultado } from "@/app/api/rnp/route";

function esPlanValido(value: string | null): value is PlanComercial {
  return PLANES.some((plan) => plan.id === value);
}

function esRucValido(value: string): boolean {
  return /^\d{11}$/.test(value);
}

function esCorreoValido(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

type Paso = "ruc" | "contacto" | "cuenta";

export function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planInicial = searchParams.get("plan");

  const [paso, setPaso] = useState<Paso>("ruc");
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanComercial>(
    esPlanValido(planInicial) ? planInicial : "free"
  );

  // Paso 1: RUC → RNP del OSCE
  const [ruc, setRuc] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [rnp, setRnp] = useState<RnpResultado | null>(null);
  const [razonSocialManual, setRazonSocialManual] = useState("");

  // Paso 2: correo + teléfono
  const [correo, setCorreo] = useState("");
  const [correoError, setCorreoError] = useState<string | null>(null);
  const [codigoEnviado, setCodigoEnviado] = useState<string | null>(null);
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const [correoVerificado, setCorreoVerificado] = useState(false);
  const [telefono, setTelefono] = useState("");

  // Paso 3: contraseña
  const [contrasena, setContrasena] = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const buscarRuc = async () => {
    if (!esRucValido(ruc)) return;
    setBuscando(true);
    setRnp(null);
    try {
      const res = await fetch(`/api/rnp?ruc=${ruc}`);
      const data = (await res.json()) as RnpResultado;
      setRnp(data);
    } catch {
      setRnp({
        disponible: false,
        encontrado: false,
        ruc,
        mensaje: "No pudimos conectarnos con el RNP del OSCE ahora mismo. Completa tus datos manualmente.",
      });
    } finally {
      setBuscando(false);
    }
  };

  const continuarDesdeRuc = () => {
    if (!rnp) return;
    setPaso("contacto");
  };

  const enviarCodigo = () => {
    if (!esCorreoValido(correo)) {
      setCorreoError("Ingresa un correo válido.");
      return;
    }
    setCorreoError(null);
    setCodigoEnviado(generarCodigo());
    setCorreoVerificado(false);
    setCodigoIngresado("");
  };

  const continuarDesdeContacto = () => {
    if (!correoVerificado || telefono.trim().length < 6) return;
    setPaso("cuenta");
  };

  const crearCuenta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceptaTerminos) return;

    const razonSocial =
      rnp?.encontrado && rnp.razonSocial ? rnp.razonSocial : razonSocialManual.trim();

    const rnpEstado = crearRnpVacio();
    if (rnp?.encontrado) {
      rnpEstado.vigente = Boolean(rnp.habilitado);
      rnpEstado.especialidades = rnp.especialidades ?? [];
      rnpEstado.capacidadMaximaGeneral = rnp.capacidadMaximaContratacion ?? null;
    }

    setDatosEmpresa({
      ruc,
      razonSocial,
      nombreComercial: razonSocial,
      representanteLegal: "",
      dniRepresentante: "",
      correo,
      telefono,
      direccion: "",
      rnp: rnpEstado,
      experiencia: [],
      personalClave: [],
      equipamiento: [],
      documentosRepositorio: [],
    });
    setPlan(planSeleccionado);
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      <Card>
        <CardHeader
          title="Crear cuenta"
          subtitle={
            paso === "ruc"
              ? "Paso 1 de 3 · Identifica tu empresa por RUC"
              : paso === "contacto"
                ? "Paso 2 de 3 · Datos de contacto"
                : "Paso 3 de 3 · Contraseña y plan"
          }
        />
        <CardBody>
          {paso === "ruc" && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                RUC de tu empresa
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={ruc}
                    onChange={(e) => {
                      setRuc(e.target.value.replace(/\D/g, ""));
                      setRnp(null);
                    }}
                    placeholder="20601234567"
                    className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!esRucValido(ruc) || buscando}
                    onClick={buscarRuc}
                    className="shrink-0 rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {buscando ? "Buscando…" : "Buscar en OSCE"}
                  </button>
                </div>
              </label>
              <p className="text-xs text-slate-400">
                Consultamos el Registro Nacional de Proveedores (RNP) del OSCE en tiempo real para
                autocompletar tu razón social y especialidades.
              </p>

              {rnp?.encontrado && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <p className="font-semibold text-emerald-800">{rnp.razonSocial}</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {rnp.habilitado ? "RNP vigente" : "RNP no vigente"} ·{" "}
                    {rnp.aptoContratar ? "apto para contratar" : "no apto para contratar"}
                  </p>
                  {rnp.especialidades && rnp.especialidades.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rnp.especialidades.map((esp) => (
                        <span
                          key={esp}
                          className="rounded-full bg-white px-2 py-0.5 text-[11px] text-emerald-700"
                        >
                          {esp}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={continuarDesdeRuc}
                    className="mt-3 rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)]"
                  >
                    Sí, esta es mi empresa — continuar
                  </button>
                </div>
              )}

              {rnp && !rnp.encontrado && (
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-slate-600">
                  <p>{rnp.mensaje}</p>
                  <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Razón social
                    <input
                      type="text"
                      value={razonSocialManual}
                      onChange={(e) => setRazonSocialManual(e.target.value)}
                      placeholder="Mi Empresa S.A.C."
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={razonSocialManual.trim().length === 0}
                    onClick={continuarDesdeRuc}
                    className="mt-3 rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continuar con estos datos
                  </button>
                </div>
              )}
            </div>
          )}

          {paso === "contacto" && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Correo
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => {
                      setCorreo(e.target.value);
                      setCorreoVerificado(false);
                      setCodigoEnviado(null);
                    }}
                    placeholder="tucorreo@empresa.pe"
                    className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={enviarCodigo}
                    className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
                  >
                    Enviar código
                  </button>
                </div>
                {correoError && <span className="text-xs text-red-600">{correoError}</span>}
              </label>

              {codigoEnviado && !correoVerificado && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs text-slate-600">
                  <p>
                    Modo demo: no enviamos un correo real. Tu código de verificación es{" "}
                    <strong className="font-mono">{codigoEnviado}</strong>.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={codigoIngresado}
                      onChange={(e) => setCodigoIngresado(e.target.value.replace(/\D/g, ""))}
                      placeholder="Código de 6 dígitos"
                      className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCorreoVerificado(codigoIngresado === codigoEnviado)}
                      className="shrink-0 rounded-lg bg-[var(--brand-600)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)]"
                    >
                      Verificar
                    </button>
                  </div>
                  {codigoIngresado.length === 6 && codigoIngresado !== codigoEnviado && (
                    <p className="mt-1 text-red-600">Código incorrecto.</p>
                  )}
                </div>
              )}

              {correoVerificado && (
                <p className="text-xs font-medium text-emerald-600">Correo verificado ✓</p>
              )}

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Teléfono de contacto
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+51 987 654 321"
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
                />
              </label>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPaso("ruc")}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  ← Atrás
                </button>
                <button
                  type="button"
                  disabled={!correoVerificado || telefono.trim().length < 6}
                  onClick={continuarDesdeContacto}
                  className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {paso === "cuenta" && (
            <form onSubmit={crearCuenta} className="flex flex-col gap-5">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Contraseña
                <input
                  type="password"
                  required
                  minLength={6}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
                />
              </label>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Elige tu plan</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PLANES.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlanSeleccionado(plan.id)}
                      className={`rounded-lg border p-3 text-left text-xs transition-colors ${
                        planSeleccionado === plan.id
                          ? "border-[var(--brand-500)] bg-[var(--brand-50)]"
                          : "border-[var(--border)] hover:bg-[var(--surface-muted)]"
                      }`}
                    >
                      <p className="font-semibold text-[var(--foreground)]">
                        {plan.nombre} · {plan.precio}
                      </p>
                      <p className="mt-0.5 text-slate-500">{plan.resumen}</p>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)]"
                />
                <span>
                  Acepto los{" "}
                  <Link href="/terminos" target="_blank" className="font-medium text-[var(--brand-600)] hover:underline">
                    Términos y Condiciones
                  </Link>{" "}
                  y el{" "}
                  <Link href="/legal" target="_blank" className="font-medium text-[var(--brand-600)] hover:underline">
                    Aviso legal
                  </Link>
                  .
                </span>
              </label>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPaso("contacto")}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  ← Atrás
                </button>
                <button
                  type="submit"
                  disabled={!aceptaTerminos}
                  className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Crear cuenta
                </button>
              </div>
            </form>
          )}

          <p className="mt-5 text-xs text-slate-400">
            Modo demo: la contraseña no se valida contra ningún backend todavía. El RUC y los
            datos del RNP sí se consultan en tiempo real contra el OSCE.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-[var(--brand-600)] hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
