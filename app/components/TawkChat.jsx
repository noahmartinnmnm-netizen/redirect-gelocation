import { useEffect } from "react";

const TAWK_SRC = "https://embed.tawk.to/6af498bba60c2e3c44754917/1k75n987n";

export function TawkChat() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.querySelector(`script[src="${TAWK_SRC}"]`)) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement("script");
    script.async = true;
    script.src = TAWK_SRC;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  }, []);

  return null;
}
