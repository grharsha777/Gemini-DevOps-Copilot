export function FloatingShapes() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl animate-float blur-xl" />
      <div
        className="absolute top-40 right-20 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-primary/20 rounded-full animate-float blur-xl"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="absolute bottom-32 left-1/4 w-28 h-28 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl animate-float blur-xl"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute bottom-20 right-1/3 w-36 h-36 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full animate-float blur-xl"
        style={{ animationDelay: "3s" }}
      />
    </div>
  );
}
