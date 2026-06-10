"use client";

import L from "leaflet";

import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface FloodMapProps {
  latitude: number;
  longitude: number;
  riskLevel: string;

  reports: {
    id: string;
    latitude: number;
    longitude: number;
    waterLevel: number;
  }[];
}

export default function FloodMap({
  latitude,
  longitude,
  riskLevel,
  reports,
}: FloodMapProps) {

  const riskColor =
    riskLevel === "BAHAYA"
      ? "red"
      : riskLevel === "WASPADA"
      ? "orange"
      : "green";

  return (
    <MapContainer
  center={[latitude, longitude]}
  zoom={14}
  style={{
    height: "500px",
    width: "100%",
    borderRadius: "16px",
  }}
>
  <TileLayer
    attribution="OpenStreetMap"
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />

  {/* Marker Lokasi User */}
  <Marker position={[latitude, longitude]}>
    <Popup>
      Lokasi Anda
    </Popup>
  </Marker>

  {/* Lingkaran Risiko */}
  <Circle
    center={[latitude, longitude]}
    radius={500}
    pathOptions={{
      color: riskColor,
      fillColor: riskColor,
      fillOpacity: 0.25,
    }}
  />

  {/* Marker Laporan Warga */}
  {reports.map((report) => (
    <Marker
      key={report.id}
      position={[
        report.latitude,
        report.longitude,
      ]}
    >
      <Popup>
        <strong>Laporan Warga</strong>

        <br />

        Tinggi Air:
        {" "}
        {report.waterLevel}
        {" "}
        cm
      </Popup>
    </Marker>
  ))}
</MapContainer>
  );
}