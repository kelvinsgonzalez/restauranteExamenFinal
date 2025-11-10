import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const coordinates = {
  latitude: 14.6349,
  longitude: -90.5069,
};

const MapWidget = () => (
  <div className="h-64 overflow-hidden rounded-2xl border border-neutral-200">
    <Map
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      initialViewState={{ ...coordinates, zoom: 14 }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      <NavigationControl position="bottom-right" />
      <Marker latitude={coordinates.latitude} longitude={coordinates.longitude}>
        <span className="rounded-full bg-brand px-3 py-1 text-xs text-white">
          Restaurante
        </span>
      </Marker>
    </Map>
  </div>
);

export default MapWidget;
