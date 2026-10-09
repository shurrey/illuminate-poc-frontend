import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: [".next/**", "out/**", "infra/**", "next-env.d.ts"] },
  {
    rules: {
      // Hydrating from localStorage and resetting on prop changes set state in effects throughout;
      // reported as warnings until those components are reworked.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;
