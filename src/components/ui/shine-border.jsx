import { cn } from "../../lib/utils"

export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#000000",
  className,
  children,
  onClick,
}) {
  const colors = Array.isArray(color) ? color.join(",") : color;
  
  return (
    <div
      onClick={onClick}
      style={{
        "--border-radius": `${borderRadius}px`,
        "--border-width": `${borderWidth}px`,
        "--duration": `${duration}s`,
        "--shine-colors": colors,
        position: "relative",
        borderRadius: `${borderRadius}px`,
        padding: "1rem",
        minHeight: "60px",
        minWidth: "300px",
        cursor: "pointer",
      }}
      className={cn("shine-border-wrapper", className)}
    >
      <div
        className="shine-border-effect"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: `${borderRadius}px`,
          padding: `${borderWidth}px`,
          background: `radial-gradient(transparent, transparent, ${colors}, transparent, transparent)`,
          backgroundSize: "300% 300%",
          animation: `shine ${duration}s infinite linear`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
