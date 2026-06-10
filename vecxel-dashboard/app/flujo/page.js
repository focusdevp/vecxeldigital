import IntegrationFlowSimulator from "../IntegrationFlowSimulator";

export default function FlujoPage() {
  return (
    <div className="p-8">
      <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">Sección Flujo</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Flujo de Integración en Tiempo Real</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Visualiza el recorrido de los datos desde el origen hasta la confirmación de sincronización en el SAC Connector.
            </p>
          </div>
        </div>
      </div>
      <IntegrationFlowSimulator />
    </div>
  );
}
