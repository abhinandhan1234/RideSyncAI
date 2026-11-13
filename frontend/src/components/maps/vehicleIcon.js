import L from 'leaflet';

const shapes = {
  bike: '<path fill="#202a30" d="M13 1h4v9h-4zm0 31h4v9h-4z"/><path fill="#2c868e" d="M10 10q5-5 10 0v20q-5 7-10 0z"/><path stroke="#15252b" stroke-width="3" d="M5 12h20"/>',
  auto: '<path fill="#dfac36" d="M12 2h6l8 16v17q0 5-6 5H10q-6 0-6-5V18z"/><path fill="#243c43" d="m10 13 3-7h4l3 7z"/><rect x="7" y="18" width="16" height="15" rx="3" fill="#186857"/>',
  cab: '<rect x="5" y="2" width="20" height="38" rx="7" fill="#f2c66d" stroke="#39454a" stroke-width="2"/><path fill="#314c57" d="m8 13 2-5h10l2 5-2 3H10zm2 15h10l2 5H8z"/><path stroke="white" stroke-width="2" d="M7 6h4m8 0h4"/>'
};

export function vehicleIcon(type) {
  const key = String(type).toLowerCase();
  const shape = shapes[key === 'bike' || key === 'auto' ? key : 'cab'];
  return L.divIcon({className:'vehicle-position',iconSize:[30,42],iconAnchor:[15,21],
    html:'<svg aria-hidden="true" viewBox="0 0 30 42" width="30" height="42">'+shape+'</svg>'});
}
