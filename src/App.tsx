import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const readTheme = (): Theme => {
  try { return localStorage.getItem("telal-theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
};

const ZONES = [
  ["Apartments", "--z-apartments"], ["School", "--z-school"], ["Villas", "--z-villas"], ["Golf course", "--z-golf"],
  ["Hotel", "--z-hotel"], ["Commercial", "--z-commercial"], ["Hospital", "--z-hospital"], ["Future plan", "--z-future"],
] as const;
const BRAND = [["Cream", "--bg"], ["Green ink", "--ink"], ["Gold", "--gold"], ["Water", "--water"], ["Good", "--good"], ["Warning", "--warn"], ["Alarm", "--bad"], ["Info", "--info"]] as const;
/** the numbers printed in the brief, nothing else */
const FACTS = [["380", "Feddan, total"], ["80%", "Residential"], ["20%", "Mixed-use"], ["304", "Feddan residential"], ["76", "Feddan commercial"]];

/** Phase 0: only shows the theme tokens, the brief's logo and cover still, so the look can be approved before anything is built */
export default function App() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("telal-theme", theme); } catch { /* theme just is not remembered */ }
  }, [theme]);

  return (
    <div className="p0">
      <div className="p0-top">
        <img className="p0-logo" src="/pre-logo.png" alt="PRE Group" />
        <button className="p0-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
      <div className="p0-eyebrow">Our vision</div>
      <h1>Telal <em>West</em></h1>
      <div className="p0-sub">AI City command center · Phase 0 token check</div>
      <div className="p0-hero"><img src="/cover-still.jpg" alt="Aerial view of lagoons and golf course" /></div>

      <h3>Facts from the brief</h3>
      <div className="p0-facts">{FACTS.map(([v, l]) => <div className="fact" key={l}><b>{v}</b><span>{l}</span></div>)}</div>

      <h3>Brand colours</h3>
      <div className="p0-grid">{BRAND.map(([n, v]) => <div className="sw" key={n}><i style={{ background: `var(${v})` }} /><span><b>{n}</b>{v}</span></div>)}</div>

      <h3>Zoning colours</h3>
      <div className="p0-grid">{ZONES.map(([n, v]) => <div className="sw" key={n}><i style={{ background: `var(${v})` }} /><span><b>{n}</b>{v}</span></div>)}</div>

      <p className="p0-note">Images are AI-generated and are presented for concept illustration only.</p>
    </div>
  );
}
