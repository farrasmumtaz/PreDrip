"use client";

import { useEffect } from "react";
import L from "leaflet";

import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import {
  greenIcon,
  orangeIcon,
  redIcon,
} from "./icons";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Report {
  id: string;
  latitude: number;
  longitude: number;
  waterLevel: number;
}

interface FloodMapProps {
  latitude: number;
  longitude: number;
  riskLevel: string;
  reports: Report[];
}

function FitBounds({
  latitude,
  longitude,
  reports,
}: {
  latitude: number;
  longitude: number;
  reports: Report[];
}): React.ReactElement | null {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      [latitude, longitude],

      ...reports.map(
        (report) =>
          [
            report.latitude,
            report.longitude,
          ] as [number, number],
      ),
    ];

    const bounds = L.latLngBounds(points);

    map.fitBounds(bounds, {
      padding: [50, 50],
    });
  }, [map, latitude, longitude, reports]);

  return null;
}

export default function FloodMap({
  latitude,
  longitude,
  riskLevel,
  reports,
}: FloodMapProps): React.ReactElement {
  const riskColor =
    riskLevel === "BAHAYA"
      ? "red"
      : riskLevel === "WASPADA"
      ? "orange"
      : "green";

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={12}
      style={{
        height: "500px",
        width: "100%",
        borderRadius: "16px",
      }}
    >
      <FitBounds
        latitude={latitude}
        longitude={longitude}
        reports={reports}
      />

      <TileLayer
        attribution="OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Lokasi User */}
      <Marker
        position={[latitude, longitude]}
      >
        <Popup>
          <strong>Lokasi Anda</strong>
        </Popup>
      </Marker>

      {/* Area Risiko */}
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
      {reports.map((report) => {
        const icon =
          report.waterLevel > 100
            ? redIcon
            : report.waterLevel > 50
            ? orangeIcon
            : greenIcon;

        return (
          <Marker
            key={report.id}
            position={[
              report.latitude,
              report.longitude,
            ]}
            icon={icon}
          >
            <Popup>
              <strong>
                Laporan Warga
              </strong>

              <br />

              Tinggi Air:
              {" "}
              {report.waterLevel}
              cm

              <br />

              Latitude:
              {" "}
              {report.latitude}

              <br />

              Longitude:
              {" "}
              {report.longitude}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}