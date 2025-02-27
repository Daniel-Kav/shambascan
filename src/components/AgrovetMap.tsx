import  { useEffect, useState, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, StandaloneSearchBox } from '@react-google-maps/api';
import { Search, Navigation, Star, Phone, Globe } from 'lucide-react';

const libraries: ("places")[] = ["places"];

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
};

interface Agrovet {
  id: string;
  name: string;
  rating: number;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  phone?: string;
  website?: string;
}

export function AgrovetMap() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [center, setCenter] = useState({ lat: -1.2921, lng: 36.8219 }); // Default to Nairobi
  const [agrovets, setAgrovets] = useState<Agrovet[]>([]);
  const [selectedAgrovet, setSelectedAgrovet] = useState<Agrovet | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const mapRef = useRef<google.maps.Map>();
  const searchBoxRef = useRef<google.maps.places.SearchBox>();

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setCenter(location);
          searchNearbyAgrovets(location);
        },
        () => {
          console.log('Geolocation permission denied');
        }
      );
    }
  }, []);

  const searchNearbyAgrovets = async (location: { lat: number; lng: number }) => {
    if (!mapRef.current) return;

    const service = new google.maps.places.PlacesService(mapRef.current);
    const request = {
      location: location,
      radius: 5000, // 5km radius
      type: 'store',
      keyword: 'agrovet farm supplies agricultural',
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const agrovetResults = results.map((result) => ({
          id: result.place_id!,
          name: result.name!,
          rating: result.rating || 0,
          vicinity: result.vicinity!,
          geometry: {
            location: {
              lat: result.geometry!.location!.lat(),
              lng: result.geometry!.location!.lng(),
            },
          },
        }));
        setAgrovets(agrovetResults);
      }
    });
  };

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  const onSearchBoxLoad = (searchBox: google.maps.places.SearchBox) => {
    searchBoxRef.current = searchBox;
  };

  const onPlacesChanged = () => {
    if (!searchBoxRef.current) return;

    const places = searchBoxRef.current.getPlaces();
    if (places?.length) {
      const location = {
        lat: places[0].geometry!.location!.lat(),
        lng: places[0].geometry!.location!.lng(),
      };
      setCenter(location);
      searchNearbyAgrovets(location);
    }
  };

  const getDirections = (agrovet: Agrovet) => {
    if (!userLocation) return;
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${agrovet.geometry.location.lat},${agrovet.geometry.location.lng}`;
    window.open(url, '_blank');
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading maps...</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex-1">
          <StandaloneSearchBox
            onLoad={onSearchBoxLoad}
            onPlacesChanged={onPlacesChanged}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for agrovets in a different location"
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </StandaloneSearchBox>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Min Rating:</label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="border rounded-lg px-3 py-2"
          >
            <option value={0}>All</option>
            <option value={3}>3+ Stars</option>
            <option value={4}>4+ Stars</option>
            <option value={4.5}>4.5+ Stars</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden shadow-lg">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={13}
          center={center}
          options={options}
          onLoad={onMapLoad}
        >
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              }}
            />
          )}

          {agrovets
            .filter((agrovet) => agrovet.rating >= minRating)
            .map((agrovet) => (
              <Marker
                key={agrovet.id}
                position={agrovet.geometry.location}
                onClick={() => setSelectedAgrovet(agrovet)}
              />
            ))}

          {selectedAgrovet && (
            <InfoWindow
              position={selectedAgrovet.geometry.location}
              onCloseClick={() => setSelectedAgrovet(null)}
            >
              <div className="p-2 max-w-xs">
                <h3 className="font-semibold text-lg mb-1">{selectedAgrovet.name}</h3>
                <div className="flex items-center gap-1 mb-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span>{selectedAgrovet.rating.toFixed(1)}</span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{selectedAgrovet.vicinity}</p>
                <div className="flex gap-2">
                  {selectedAgrovet.phone && (
                    <a
                      href={`tel:${selectedAgrovet.phone}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                  )}
                  {selectedAgrovet.website && (
                    <a
                      href={selectedAgrovet.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                  <button
                    onClick={() => getDirections(selectedAgrovet)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Navigation className="w-4 h-4" />
                    Directions
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
} 