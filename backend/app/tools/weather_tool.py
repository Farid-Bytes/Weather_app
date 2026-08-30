"""Groq tool/function declaration for `get_weather`.

Groq's chat completions API is OpenAI-compatible, so tools are declared as
plain JSON-schema dicts wrapped in a `{"type": "function", "function": {...}}`
envelope - no SDK-specific schema classes involved, which keeps this immune
to the kind of SDK enum/namespace issues we hit with the Gemini SDK.

The actual execution happens in `app.core.groq_client`, which dispatches to
`app.services.weather_service.get_weather`.
"""

GET_WEATHER_FUNCTION_NAME = "get_weather"

get_weather_function_spec = {
    "name": GET_WEATHER_FUNCTION_NAME,
    "description": (
        "Get current weather conditions and an optional multi-day forecast for a named "
        "location anywhere in the world. Always call this before stating any weather fact "
        "(temperature, conditions, wind, humidity, rain chance, etc.) - never invent numbers."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": (
                    "The location to get weather for, as a city name or 'city, country' "
                    "(e.g. 'Lahore', 'Tokyo, Japan', 'Paris, France'). Use the most specific "
                    "name the user gave; do not guess a different location."
                ),
            },
            "forecast_days": {
                "type": "string",
                "description": (
                    "Number of days of forecast to return, from 1 (today only) to 7. "
                    "Use 1 for 'right now' questions and a higher number for questions "
                    "about upcoming days or 'this weekend'."
                ),
            },
            "units": {
                "type": "string",
                "enum": ["metric", "imperial"],
                "description": (
                    "Unit system: 'metric' for Celsius/km per hour (default), 'imperial' for "
                    "Fahrenheit/mph. Use 'imperial' only if the user asks for it or clearly "
                    "expects US units."
                ),
            },
        },
        "required": ["location"],
    },
}

# Groq's chat.completions.create(..., tools=weather_tools) expects a list of
# these function-envelope dicts.
weather_tools = [
    {
        "type": "function",
        "function": get_weather_function_spec,
    }
]

SYSTEM_INSTRUCTION = """You are a friendly, concise global weather assistant.

Rules you must always follow:
1. You ONLY answer questions about current weather, forecasts, and climate conditions. \
For any unrelated question (chit-chat, general knowledge, other topics), politely decline \
and steer the conversation back to weather.
2. You must ALWAYS call the `get_weather` function before stating any weather fact. Never \
invent or guess temperatures, conditions, or forecasts from your own knowledge.
3. If the user's location is ambiguous or you are not confident which place they mean, ask \
a brief clarifying question instead of guessing.
4. When you do resolve a location, mention the resolved name naturally in your reply (e.g. \
"Showing weather for Lahore, Punjab, Pakistan").
5. Default to metric units (°C, km/h) unless the user asks for imperial units or is clearly \
in a country that uses them.
6. Be concise and friendly. Summarize the useful facts; don't dump raw data.
"""