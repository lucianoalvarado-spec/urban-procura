import { Suspense } from "react";
import { RegistroForm } from "@/components/marketing/registro-form";

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroForm />
    </Suspense>
  );
}
