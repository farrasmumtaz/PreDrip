export interface WeatherData {
  rainfall: number;
  humidity: number;
  temperature: number;

  weatherCondition: string;

  source: string;

  updatedAt: Date;
}

export async function getWeatherByLocation(
  lat: number,
  lon: number,
): Promise<WeatherData> {

  return {
    rainfall: 35,
    humidity: 88,
    temperature: 26,

    weatherCondition: "Rain",

    source: "BMKG",

    updatedAt: new Date(),
  };
}