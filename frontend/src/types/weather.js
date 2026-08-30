/**
 * Weather Copilot - Type definitions (JavaScript JSDoc for IDE support)
 * @typedef {Object} WeatherData
 * @property {string} location - Location name
 * @property {number} temperature - Current temperature in Celsius
 * @property {string} condition - Weather condition (sunny, cloudy, rainy, etc.)
 * @property {number} feelsLike - Feels like temperature
 * @property {number} humidity - Humidity percentage
 * @property {number} windSpeed - Wind speed in km/h
 * @property {number} windDirection - Wind direction in degrees
 * @property {number} uvIndex - UV index value
 * @property {number} visibility - Visibility in km
 * @property {number} pressure - Pressure in hPa
 * @property {Object} airQuality - Air quality index
 * @property {string} sunrise - Sunrise time
 * @property {string} sunset - Sunset time
 */

/**
 * @typedef {'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'thunderstorm' | 'night' | 'foggy'} WeatherCondition
 */

/**
 * @typedef {Object} ForecastDay
 * @property {string} date - Date string
 * @property {string} day - Day name
 * @property {WeatherCondition} condition - Weather condition
 * @property {number} highTemp - High temperature
 * @property {number} lowTemp - Low temperature
 * @property {number} precipitation - Precipitation percentage
 */

/**
 * @typedef {Object} HourlyData
 * @property {string} time - Time string
 * @property {number} temp - Temperature
 * @property {WeatherCondition} condition - Weather condition
 * @property {number} precipitation - Precipitation percentage
 */

// Export empty object for module system
export default {};