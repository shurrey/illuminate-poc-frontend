"use client";

/**
 * Blackboard Illuminate brand wordmark.
 * "Blackboard" in bold + "Illuminate" in regular weight,
 * styled to match the Blackboard brand identity.
 */
export function BrandLogo({ height = 20, variant = "light" }: { height?: number; variant?: "light" | "dark" }) {
  const color = variant === "light" ? "#ffffff" : "#1a1a2e";

  return (
    <div className="flex items-center gap-1.5" style={{ height }}>
      {/* Bb icon mark */}
      <div
        className="rounded-md flex items-center justify-center font-bold"
        style={{
          width: height,
          height: height,
          backgroundColor: variant === "light" ? "#ffffff" : "#1a1a2e",
          color: variant === "light" ? "#1a1a2e" : "#ffffff",
          fontSize: height * 0.5,
          lineHeight: 1,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        Bb
      </div>
      {/* Wordmark */}
      <span
        className="whitespace-nowrap leading-none"
        style={{
          color,
          fontSize: height * 0.75,
          fontFamily: "'Poppins', sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        <span className="font-bold">Blackboard</span>
        <span className="font-normal opacity-70 ml-1">Illuminate</span>
      </span>
    </div>
  );
}
