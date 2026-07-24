"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      <Card>
        <CardHeader title="Iniciar sesión" subtitle="Entra a tu cuenta de Urban Procura" />
        <CardBody>
          <form onSubmit={enviar} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Correo
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tucorreo@empresa.pe"
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Contraseña
              <input
                type="password"
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="••••••••"
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="mt-1 rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)]"
            >
              Iniciar sesión
            </button>
          </form>
          <p className="mt-4 text-xs text-slate-400">
            Modo demo: no hay autenticación real todavía. Cualquier correo y contraseña te llevan
            al perfil de muestra.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-medium text-[var(--brand-600)] hover:underline">
              Crear una gratis
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
