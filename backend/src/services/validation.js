export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const bad = message => new ApiError(400, 'INVALID_INPUT', message);
export const conflict = message => new ApiError(409, 'CONFLICT', message);
export function identifier(value, field = 'id') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw bad(`${field} must be a valid identifier`);
  return value;
}
export function point(value) {
  const coords = value?.type === 'Point' ? value.coordinates : [value?.lng, value?.lat];
  if (!Array.isArray(coords) || coords.length !== 2 || !coords.every(Number.isFinite) ||
      Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) throw bad('Location must contain valid longitude and latitude');
  return { type: 'Point', coordinates: coords };
}
export function bookingInput(body) {
  const passengerCount = body?.passengerCount ?? 1;
  if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 8) throw bad('passengerCount must be 1–8');
  return { passengerId: identifier(body?.passengerId, 'passengerId'), pickup: point(body?.pickup), dropoff: point(body?.dropoff), passengerCount };
}
