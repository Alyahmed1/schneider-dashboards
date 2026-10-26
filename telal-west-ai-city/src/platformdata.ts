// The digital data platform: where the data comes from, the layers it passes through, and who uses it. Rates and sizes are sample numbers.
import type { TabId } from "./data";

export interface Source { id: string; name: string; sub: string; rate: number; gb: number; proto: string; latency: string; quality: number; feeds: TabId[] }
export const SOURCES: Source[] = [
  { id: "s1", name: "Traffic sensors", sub: "radar and loop counts", rate: 420, gb: 5.2, proto: "MQTT", latency: "180 ms", quality: 98.9, feeds: ["mobility", "home"] },
  { id: "s2", name: "Parking sensors", sub: "bay occupancy", rate: 180, gb: 1.1, proto: "LoRaWAN to MQTT", latency: "0.9 s", quality: 97.8, feeds: ["mobility", "assistant"] },
  { id: "s3", name: "CCTV analytics", sub: "events only; video stays on site", rate: 95, gb: 2.4, proto: "ONVIF + edge AI", latency: "240 ms", quality: 99.1, feeds: ["safety"] },
  { id: "s4", name: "Smart power meters", sub: "zone and building meters", rate: 310, gb: 3.0, proto: "Modbus to MQTT", latency: "1 s", quality: 99.4, feeds: ["utilities", "home"] },
  { id: "s5", name: "Water meters and flow", sub: "districts and lagoons", rate: 260, gb: 2.2, proto: "LoRaWAN, NB-IoT", latency: "5 s", quality: 98.2, feeds: ["utilities"] },
  { id: "s6", name: "Asset sensors", sub: "vibration, temperature, pressure", rate: 640, gb: 7.9, proto: "OPC UA, MQTT", latency: "0.5 s", quality: 98.6, feeds: ["assets"] },
  { id: "s7", name: "Resident app", sub: "requests and assistant", rate: 45, gb: 0.3, proto: "HTTPS", latency: "120 ms", quality: 99.7, feeds: ["assistant"] },
  { id: "s8", name: "Gates and access", sub: "passes and barriers", rate: 30, gb: 0.2, proto: "HTTPS, MQTT", latency: "150 ms", quality: 99.5, feeds: ["mobility", "safety"] },
];

export interface Layer { id: string; name: string; short: string; does: string; tech: string }
export const LAYERS: Layer[] = [
  { id: "edge", name: "Edge gateways", short: "Edge", does: "Collect, filter and time-stamp readings next to the devices. Video is analysed on site and only events leave.", tech: "MQTT broker with Node-RED or Telegraf" },
  { id: "bus", name: "Stream bus", short: "Stream", does: "Carries every reading in order, so each service can read the same data at its own pace.", tech: "Kafka or Redpanda" },
  { id: "lake", name: "Data platform", short: "Data", does: "Keeps the raw data in a lake and clean time series in a warehouse, with one definition of every dataset and automatic quality checks.", tech: "Object storage and TimescaleDB, dbt, pandera" },
  { id: "ai", name: "AI models", short: "AI", does: "Forecasts, anomaly detection, computer vision and the resident assistant, each tracked by version.", tech: "MLflow for models, Langfuse for the assistant" },
  { id: "api", name: "City API", short: "API", does: "One secured door for dashboards, the resident app and any future service, so new services never need their own pipeline.", tech: "FastAPI with token auth" },
];

export interface Service { id: string; name: string; tab?: TabId; future?: boolean; text: string }
export const SERVICES: Service[] = [
  { id: "v1", name: "Home dashboard", tab: "home", text: "The whole community on one screen." },
  { id: "v2", name: "Mobility", tab: "mobility", text: "AI traffic management and smart parking." },
  { id: "v3", name: "Utilities", tab: "utilities", text: "Energy optimization and water monitoring." },
  { id: "v4", name: "Assets", tab: "assets", text: "Predictive maintenance and work orders." },
  { id: "v5", name: "Safety", tab: "safety", text: "AI video analytics and events." },
  { id: "v6", name: "Resident assistant", tab: "assistant", text: "Chatbot and self-service portal." },
  { id: "f1", name: "Government services hub", future: true, text: "From the brief's offer list: one place for permits and public services, reading the same resident and location data." },
  { id: "f2", name: "Hospitality bookings", future: true, text: "From the brief's hospitality-driven community: hotel, clubhouse and golf bookings that use live parking and crowd data." },
  { id: "f3", name: "Remote-work hub", future: true, text: "From the brief's creator and remote-work lifestyle: desk and meeting-room booking based on live occupancy." },
  { id: "f4", name: "Smart waste collection", future: true, text: "A suggestion: fill-level sensors on bins feed the same stream and route the trucks." },
];

export interface Dataset { name: string; source: string; rows: number; fresh: number; quality: number; used: string }
export const CATALOGUE: Dataset[] = [
  { name: "traffic.counts", source: "Traffic sensors", rows: 36.3, fresh: 1.2, quality: 98.9, used: "Mobility, Home" },
  { name: "parking.bays", source: "Parking sensors", rows: 15.5, fresh: 3.4, quality: 97.8, used: "Mobility, Assistant" },
  { name: "video.events", source: "CCTV analytics", rows: 8.2, fresh: 1.8, quality: 99.1, used: "Safety" },
  { name: "power.meters", source: "Smart power meters", rows: 26.8, fresh: 2.1, quality: 99.4, used: "Utilities, Home" },
  { name: "water.flow", source: "Water meters and flow", rows: 22.5, fresh: 8.6, quality: 98.2, used: "Utilities" },
  { name: "assets.telemetry", source: "Asset sensors", rows: 55.3, fresh: 1.1, quality: 98.6, used: "Assets" },
  { name: "assets.workorders", source: "Resident app, Assets", rows: 0.02, fresh: 12.4, quality: 99.9, used: "Assets, Home" },
  { name: "residents.requests", source: "Resident app", rows: 3.9, fresh: 1.5, quality: 99.7, used: "Assistant, Assets" },
  { name: "access.passes", source: "Gates and access", rows: 2.6, fresh: 2.9, quality: 99.5, used: "Mobility, Safety" },
  { name: "zones.reference", source: "Master plan", rows: 0.0001, fresh: 86400, quality: 100, used: "Everything" },
];
