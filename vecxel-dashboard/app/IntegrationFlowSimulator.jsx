"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Globe,
  Server,
  Database,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const flowSteps = [
  {
    title: "Origen de Datos",
    subtitle: "Petición API desde la web",
    icon: Globe,
  },
  {
    title: "Middleware / SAC Connector",
    subtitle: "Recibe, transforma y valida la información",
    icon: Server,
  },
  {
    title: "Registro en SAC",
    subtitle: "Guardado final en el sistema administrativo",
    icon: Database,
  },
  {
    title: "Respuesta de Éxito",
    subtitle: "Sincronización completa y confirmada",
    icon: CheckCircle2,
  },
];

const initialStatuses = flowSteps.map(() => "inactive");

export default function IntegrationFlowSimulator() {
  const [stepStatus, setStepStatus] = useState(initialStatuses);
  const [activeMessage, setActiveMessage] = useState("Haz clic en el botón para ejecutar la simulación.");
  const [running, setRunning] = useState(false);
  const [inventoryDelta, setInventoryDelta] = useState(0);
  const timers = useRef([]);
  const payloadCount = 50;

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  const setStatus = (index, status) => {
    setStepStatus((current) => {
      const next = [...current];
      next[index] = status;
      return next;
    });
  };

  const resetFlow = () => {
    setStepStatus(initialStatuses);
    setActiveMessage("Haz clic en el botón para ejecutar la simulación.");
    setInventoryDelta(0);
  };

  const runSimulation = () => {
    if (running) return;

    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(true);
    resetFlow();
    setActiveMessage("Iniciando flujo de integración...");

    const sequence = [
      { step: 0, label: "Enviando solicitud al origen de datos...", duration: 1200 },
      { step: 1, label: "Procesando en SAC Connector...", duration: 1500 },
      { step: 2, label: "Registrando en el sistema administrativo...", duration: 1300 },
      { step: 3, label: "Finalizando sincronización...", duration: 1000 },
    ];

    sequence.forEach((item, index) => {
      const previous = index - 1;
      const delay = sequence.slice(0, index).reduce((acc, current) => acc + current.duration, 0);

      timers.current.push(
        setTimeout(() => {
          if (previous >= 0) {
            setStatus(previous, "done");
          }
          setStatus(item.step, "running");
          setActiveMessage(item.label);
        }, delay)
      );
    });

    const totalDelay = sequence.reduce((acc, item) => acc + item.duration, 0);

    timers.current.push(
      setTimeout(() => {
        setStatus(3, "done");
        setActiveMessage("¡Sincronización Exitosa!");
        setInventoryDelta(payloadCount);
        setRunning(false);
      }, totalDelay)
    );
  };

  return (
    <section className="rounded-[2.5rem] border border-slate-800 bg-slate-950/95 shadow-[0_40px_120px_-80px_rgba(0,0,0,0.8)] p-6 mb-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="lg:w-[38%] rounded-[2rem] border border-slate-800 bg-slate-900/95 p-6 shadow-xl shadow-cyan-500/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">Simulador de Flujo</p>
              <h2 className="mt-3 text-3xl font-semibold text-white leading-tight">Simulador de Procesamiento de Datos</h2>
            </div>
            <div className="rounded-3xl border border-cyan-700/50 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200">
              Estilo n8n
            </div>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-5 shadow-inner shadow-slate-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Payload</p>
                <p className="mt-2 text-3xl font-semibold text-white">{payloadCount}</p>
                <p className="text-sm text-slate-400">productos nuevos</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-slate-800/90 text-cyan-400 shadow-xl shadow-cyan-500/10">
                <Sparkles size={32} />
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-400">
              Visualiza el viaje de los datos desde el origen hasta la confirmación final, con nodos conectores inspirados en un flujo de automatización.
            </p>
          </div>

          <button
            type="button"
            onClick={runSimulation}
            disabled={running}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-[1.75rem] bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play size={18} />
            Correr Ejemplo: Cargar Inventario
          </button>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Estado actual</p>
              <p className="mt-3 text-base font-semibold text-white">{activeMessage}</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Inventario actualizado</p>
              <p className="mt-3 text-base font-semibold text-emerald-400">+{inventoryDelta} items</p>
            </div>
          </div>
        </div>

        <div className="lg:w-[62%] rounded-[2rem] border border-slate-800 bg-slate-900/95 p-6 shadow-xl shadow-slate-950/20">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-950/80 text-cyan-300 shadow-lg shadow-cyan-500/10">
              <ArrowRight size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Visualizador del Flujo</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Flujo de integración estilo gráfico</h3>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/90 px-4 py-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center lg:justify-between">
              {flowSteps.map((step, index) => {
                const status = stepStatus[index];
                const active = status === "running";
                const done = status === "done";
                const StepIcon = step.icon;

                return (
                  <div key={step.title} className="relative">
                    <div className={`group relative overflow-hidden rounded-[1.75rem] border p-5 shadow-2xl transition ${
                      done
                        ? "border-emerald-400/30 bg-emerald-500/5 text-emerald-200"
                        : active
                        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
                        : "border-slate-800 bg-slate-950/90 text-slate-300"
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-slate-950 opacity-70" />
                      <div className="relative flex items-start gap-4">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.5rem] border ${
                          done
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                            : active
                            ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300"
                            : "border-slate-800 bg-slate-950/80 text-slate-400"
                        }`}>
                          {active ? <Loader2 className="animate-spin" size={22} /> : <StepIcon size={22} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{step.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">{step.subtitle}</p>
                        </div>
                      </div>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-900">
                        <div className={`h-full rounded-full transition-all duration-700 ${
                          done ? "w-full bg-emerald-400" : active ? "w-3/4 bg-cyan-400" : "w-0 bg-cyan-400"
                        }`} />
                      </div>
                      <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
                        done ? "bg-emerald-500/10 text-emerald-300" : active ? "bg-cyan-500/10 text-cyan-300" : "bg-slate-800 text-slate-500"
                      }`}>
                        {done ? "Completado" : active ? "En proceso" : "En espera"}
                      </span>
                    </div>

                    {index < flowSteps.length - 1 && (
                      <div className="pointer-events-none absolute left-full top-1/2 ml-4 flex h-10 w-20 -translate-y-1/2 items-center justify-center lg:block">
                        <div className="relative flex h-2 w-full items-center justify-center rounded-full bg-slate-800">
                          <div className="absolute left-0 h-2 w-full rounded-full bg-gradient-to-r from-cyan-500/80 to-slate-700/50" />
                        </div>
                        <div className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/20 bg-slate-950/90 text-cyan-300 shadow-xl shadow-cyan-500/10">
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
