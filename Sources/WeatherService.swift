import Foundation

/// Current observations and forecast estimates are separate, timestamped sources.
@MainActor final class WeatherService {
    private let network: NetworkService
    private var stationCache: [String: [(id: String, name: String, distance: Double)]] = [:]
    init(network: NetworkService) { self.network = network }
    static func fresh(_ timestamp: TimeInterval, now: Date = Date(), maxAge: TimeInterval = 5400) -> Bool {
        timestamp.isFinite && now.timeIntervalSince1970 - timestamp <= maxAge && timestamp - now.timeIntervalSince1970 <= 900
    }
    static func celsius(_ value: Double, unit: String) -> Double { unit == "Fahrenheit" ? value * 9 / 5 + 32 : value }
    static func distance(_ a: Double, _ b: Double, _ c: Double, _ d: Double) -> Double {
        let r = Double.pi / 180, lat = (c-a)*r, lon = (d-b)*r
        let h = pow(sin(lat/2),2) + cos(a*r)*cos(c*r)*pow(sin(lon/2),2)
        return 6371 * 2 * asin(min(1,sqrt(h)))
    }
    func forecast(_ prefs: [String: Any]) async throws -> [String: Any] {
        guard let latitude = prefs["latitude"] as? Double, let longitude = prefs["longitude"] as? Double,
              latitude.isFinite, longitude.isFinite, (-90...90).contains(latitude), (-180...180).contains(longitude) else { throw DashboardError.message("Choose a matching city in Weather settings first.") }
        let unit = prefs["unit"] as? String ?? "Fahrenheit"
        let url = "https://api.open-meteo.com/v1/forecast?latitude=\(latitude)&longitude=\(longitude)&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=\(unit == "Celsius" ? "celsius" : "fahrenheit")&timezone=auto&forecast_days=6&timeformat=unixtime"
        guard var data = try await network.fetch(url) as? [String: Any], var current = data["current"] as? [String: Any], let time = current["time"] as? Double,
              let temperature = current["temperature_2m"] as? Double, temperature.isFinite, Self.fresh(time),
              let currentUnits = data["current_units"] as? [String: Any], currentUnits["temperature_2m"] as? String == (unit == "Celsius" ? "°C" : "°F"),
              let daily = data["daily"] as? [String: Any], let days = daily["time"] as? [Double], let highs = daily["temperature_2m_max"] as? [Double], let lows = daily["temperature_2m_min"] as? [Double], let codes = daily["weather_code"] as? [Int],
              days.count >= 6, highs.count == days.count, lows.count == days.count, codes.count == days.count, highs.allSatisfy(\.isFinite), lows.allSatisfy(\.isFinite),
              abs(days[0]-Date().timeIntervalSince1970) < 90000 else { throw DashboardError.message("The weather provider returned stale or incomplete data. Try refreshing shortly.") }
        var source: [String: Any] = ["kind": "model", "name": "Open-Meteo model estimate", "timestamp": time, "url": "https://open-meteo.com/en/docs", "forecast": "Open-Meteo"]
        if prefs["currentSource"] as? String != "Forecast model", let observed = await observation(latitude, longitude) {
            current["temperature_2m"] = Self.celsius(observed.temperature, unit: unit)
            current["time"] = observed.timestamp
            current["weather_code"] = NSNull()
            current["description"] = observed.description.isEmpty ? "Observed temperature" : observed.description
            source = ["kind": "observation", "name": observed.name, "station": observed.id, "distanceKm": observed.distance, "timestamp": observed.timestamp, "url": "https://api.weather.gov/stations/\(observed.id)/observations/latest", "forecast": "Open-Meteo"]
        }
        data["current"] = current; data["source"] = source; data["retrievedAt"] = Date().timeIntervalSince1970
        return data
    }
    private func observation(_ latitude: Double, _ longitude: Double) async -> (id: String, name: String, temperature: Double, timestamp: Double, description: String, distance: Double)? {
        // NWS observations are US-only. Other regions retain the explicitly labelled model estimate.
        guard (18...72).contains(latitude), (-180 ... -60).contains(longitude) else { return nil }
        let key = String(format: "%.3f,%.3f", latitude, longitude)
        do {
            if stationCache[key] == nil {
                guard let point = try await network.fetch("https://api.weather.gov/points/\(latitude),\(longitude)") as? [String: Any],
                      let properties = point["properties"] as? [String: Any], let stationsURL = properties["observationStations"] as? String,
                      let stations = try await network.fetch(stationsURL) as? [String: Any], let features = stations["features"] as? [[String: Any]] else { return nil }
                stationCache[key] = features.compactMap { feature in
                    guard let properties = feature["properties"] as? [String: Any], let id = properties["stationIdentifier"] as? String, id.range(of: "^[A-Za-z0-9]{3,12}$", options: .regularExpression) != nil,
                          let name = properties["name"] as? String, let geometry = feature["geometry"] as? [String: Any], let coordinates = geometry["coordinates"] as? [Double], coordinates.count == 2 else { return nil }
                    return (id, name, Self.distance(latitude, longitude, coordinates[1], coordinates[0]))
                }.filter { $0.distance <= 40 }.sorted { $0.distance < $1.distance }
            }
            for station in (stationCache[key] ?? []).prefix(4) {
                guard let object = try? await network.fetch("https://api.weather.gov/stations/\(station.id)/observations/latest") as? [String: Any],
                      let properties = object["properties"] as? [String: Any], let timestamp = properties["timestamp"] as? String,
                      let date = ISO8601DateFormatter().date(from: timestamp), Self.fresh(date.timeIntervalSince1970),
                      let quantity = properties["temperature"] as? [String: Any], quantity["unitCode"] as? String == "wmoUnit:degC",
                      let value = quantity["value"] as? Double, value.isFinite, (-90...65).contains(value) else { continue }
                return (station.id, station.name, value, date.timeIntervalSince1970, properties["textDescription"] as? String ?? "", station.distance)
            }
        } catch { return nil }
        return nil
    }
}
