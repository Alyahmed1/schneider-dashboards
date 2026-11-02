import { motion } from "framer-motion";
import { QUALITY, qualityOk, zoneRows, type Filters } from "./data";
import { C, Chip, CountUp, rise, TONE_COLOR } from "./ui";
import { wobble } from "./live";

/** effluent quality, one measured reading per row (used in the Tertiary and disinfection popup) */
export function QualityRows({ t }: { t: number }) {
  return (
    <ul className="bench qual pop-qual">
      {QUALITY.map((q, n) => {
        const v = wobble(q.value, n + 3, t, 0.006);
        const pos = Math.max(2, Math.min(98, ((v - q.min) / (q.max - q.min)) * 100));
        const ok = qualityOk({ ...q, value: v });
        const oneSided = q.min === 0;
        return (
          <motion.li key={q.name} {...rise(n)}>
            <div className="b-name"><b>{q.name}</b><small>{oneSided ? `allowed up to ${q.max} ${q.unit}` : `allowed ${q.min} to ${q.max} ${q.unit}`}</small></div>
            <div className="b-track" role="img" aria-label={`${q.name}: ${v.toFixed(q.digits)} ${q.unit}, ${ok ? "within" : "outside"} the limit`}>
              <span className="b-zone" style={{ background: oneSided ? "linear-gradient(90deg, #dcf1e4 0%, #dcf1e4 68%, #fbf0c2 88%, #fde6e9 100%)" : "linear-gradient(90deg, #fde6e9, #fbf0c2 16%, #dcf1e4 34%, #dcf1e4 66%, #fbf0c2 84%, #fde6e9)" }} />
              <span className="q-end l">{q.min}</span>
              <span className="q-end r">{q.max}</span>
              <motion.span className="b-us" initial={{ left: "2%" }} animate={{ left: `${pos}%` }} transition={{ duration: 1.1, delay: n * 0.06, ease: [0.22, 1, 0.36, 1] }} style={{ borderColor: ok ? C.good : C.bad }} />
            </div>
            <div className="b-val"><b><CountUp value={v} decimals={q.digits} /></b><small>{q.unit}</small></div>
            <Chip tone={ok ? "good" : "bad"}>{ok ? "Within limit" : "Out of limit"}</Chip>
          </motion.li>
        );
      })}
    </ul>
  );
}

/** the supply zones with their pressure and water loss at the morning peak (used in the Supply zones popup) */
export function ZonesTable({ f, t }: { f: Filters; t: number }) {
  return (
    <div className="pop-scroll">
      <table className="tbl">
        <thead><tr><th>Zone</th><th>Flow</th><th>Pressure</th><th>Lowest</th><th>Water lost</th><th>Leaks</th></tr></thead>
        <tbody>
          {zoneRows(f).map((x, n) => (
            <tr key={x.name}>
              <td><i className={`dot dot-${x.tone}`} />{x.name}</td>
              <td><CountUp value={wobble(x.flow, n + 9, t, 0.004)} /> L/s</td>
              <td>{x.pressure.toFixed(1)} bar</td>
              <td style={{ color: x.minPressure < 2.5 ? TONE_COLOR.bad : undefined }}>{x.minPressure.toFixed(1)} bar</td>
              <td style={{ color: x.loss > 20 ? TONE_COLOR.warn : undefined }}>{x.loss.toFixed(0)} %</td>
              <td>{x.leaks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
