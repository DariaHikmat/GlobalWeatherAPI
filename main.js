module.exports = async function (context, req) {

    context.log("Weather API called");

    function getAirQuality(pm25) {
        if (!pm25) return "unknown";
        if (pm25 < 5) return "Very good";
        if (pm25 < 10) return "Good";
        if (pm25 < 20) return "Moderate";
        if (pm25 < 30) return "Poor";
        return "Very poor";
    }

    const continents = {

        Europe: {
            stockholm: { lat: 59.33, lon: 18.06 },
            paris: { lat: 48.85, lon: 2.35 },
            berlin: { lat: 52.52, lon: 13.40 },
            london: { lat: 51.50, lon: -0.12 },
            madrid: { lat: 40.42, lon: -3.70 },
            rome: { lat: 41.90, lon: 12.50 }
        },

        Asia: {
            tokyo: { lat: 35.68, lon: 139.69 },
            dubai: { lat: 25.20, lon: 55.27 },
            singapore: { lat: 1.35, lon: 103.82 },
            mumbai: { lat: 19.08, lon: 72.88 },
            shanghai: { lat: 31.23, lon: 121.47 },
            seoul: { lat: 37.57, lon: 126.98 },
            bangkok: { lat: 13.75, lon: 100.52 }
        },

        "North America": {
            newyork: { lat: 40.71, lon: -74.00 },
            losangeles: { lat: 34.05, lon: -118.24 },
            toronto: { lat: 43.65, lon: -79.38 },
            chicago: { lat: 41.88, lon: -87.63 },
            mexicocity: { lat: 19.43, lon: -99.13 }
        },

        "South America": {
            saopaulo: { lat: -23.55, lon: -46.63 },
            buenosaires: { lat: -34.60, lon: -58.38 },
            bogota: { lat: 4.71, lon: -74.07 }
        },

        Africa: {
            cairo: { lat: 30.04, lon: 31.24 },
            nairobi: { lat: -1.29, lon: 36.82 },
            capetown: { lat: -33.92, lon: 18.42 },
            lagos: { lat: 6.52, lon: 3.38 },
            casablanca: { lat: 33.59, lon: -7.62 }
        },

        Oceania: {
            sydney: { lat: -33.86, lon: 151.20 },
            auckland: { lat: -36.85, lon: 174.76 },
            melbourne: { lat: -37.81, lon: 144.96 }
        }

    };

    const results = {};

    const cityScores = [];

    for (const continent in continents) {

        results[continent] = {};

        for (const city in continents[continent]) {

            try {

                const lat = continents[continent][city].lat;
                const lon = continents[continent][city].lon;
                const weatherURL =
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;

                const weatherResponse = await fetch(weatherURL);

                if (!weatherResponse.ok) {
                    throw new Error("Weather API failed");
                }

                const weather = await weatherResponse.json();

                if (!weather.current_weather) {
                    throw new Error("Weather data missing");
                }

                const airURL =
                `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,ozone`;

                const airResponse = await fetch(airURL);

                if (!airResponse.ok) {
                    throw new Error("Air API failed");
                }

                const air = await airResponse.json();

                const pm25 = air.current?.pm2_5 ?? null;

                const temp = weather.current_weather.temperature;
                const score = temp - (pm25 || 0);

                cityScores.push({ city, continent, score });

                results[continent][city] = {

                    temperature: temp,
                    windspeed: weather.current_weather.windspeed,
                    winddirection: weather.current_weather.winddirection,

                    local_time: weather.current_weather.time,

                    air_quality: {
                        pm2_5: pm25,
                        pm10: air.current?.pm10,
                        ozone: air.current?.ozone,
                        rating: getAirQuality(pm25)
                    }

                };

            } catch (error) {

                results[continent][city] = {
                    error: error.message
                };

            }

        }
    }
    
    cityScores.sort((a, b) => b.score - a.score);
    const top3 = cityScores.slice(0, 3).map((entry, index) => ({
        rank: index + 1,
        city: entry.city,
        continent: entry.continent,
        score: Math.round(entry.score * 10) / 10,
        data: results[entry.continent][entry.city]
    }));

    context.res = {
        status: 200,
        body: {
            best_city: cityScores[0]?.city || null,
            top3,
            data: results
        }
    };

};