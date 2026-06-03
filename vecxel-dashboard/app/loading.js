export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 bg-white rounded-2xl p-8 shadow-2xl">
        <img src="/logovecxel.jpg" alt="Vecxel Logo" className="h-20 w-auto rounded-full animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm font-medium text-slate-600">Cargando...</p>
      </div>
    </div>
  );
}
