const SYNODIC = 29.53058867;
const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14, 0);

export function getMoonPhase(date = new Date()) {
  const days = (date.getTime() - KNOWN_NEW) / 86400000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const illumination = Math.round(((1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2) * 100);

  let name = 'New Moon';
  if (age < 1.84566) name = 'New Moon';
  else if (age < 5.53699) name = 'Waxing Crescent';
  else if (age < 9.22831) name = 'First Quarter';
  else if (age < 12.91963) name = 'Waxing Gibbous';
  else if (age < 16.61096) name = 'Full Moon';
  else if (age < 20.30228) name = 'Waning Gibbous';
  else if (age < 23.99361) name = 'Last Quarter';
  else if (age < 27.68493) name = 'Waning Crescent';

  const moonrise = new Date(date);
  moonrise.setHours(19, 10, 0, 0);
  const moonset = new Date(date);
  moonset.setHours(7, 42, 0, 0);

  return {
    name,
    illumination,
    age,
    moonrise: moonrise.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    moonset: moonset.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}
