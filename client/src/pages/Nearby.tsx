import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin,
  Users,
  Star,
  Heart,
  MessageCircle,
  Navigation,
  Filter,
  Search,
  Map
} from 'lucide-react';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface NearbyCreator {
  id: string;
  username: string;
  profileImageUrl?: string;
  isVerified: boolean;
  bio?: string;
  followerCount: number;
  distance: number; // in miles
  location: {
    city: string;
    state: string;
    lat: number;
    lng: number;
  };
  lastActiveAt: string;
  isOnline: boolean;
  tags: string[];
}

// Custom marker icon for creators
const creatorIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Online creator marker (green)
const onlineCreatorIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.596 19.404 0 12.5 0z" fill="#10b981"/>
      <circle cx="12.5" cy="12.5" r="8" fill="white"/>
      <circle cx="12.5" cy="12.5" r="5" fill="#10b981"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const CreatorMap = ({ creators, center }: { creators: NearbyCreator[], center: [number, number] }) => {
  return (
    <MapContainer 
      center={center} 
      zoom={11} 
      style={{ height: '400px', width: '100%' }}
      className="rounded-lg overflow-hidden"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {creators.map((creator) => (
        <Marker 
          key={creator.id}
          position={[creator.location.lat, creator.location.lng]}
          icon={creator.isOnline ? onlineCreatorIcon : creatorIcon}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold">
                  {creator.username[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm">{creator.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {creator.location.city}, {creator.location.state}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {creator.followerCount.toLocaleString()} followers • {creator.distance.toFixed(1)} mi
              </div>
              {creator.bio && (
                <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {creator.bio}
                </div>
              )}
              <div className="flex gap-1">
                <Link 
                  href={`/creator/${creator.id}`} 
                  className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/80 transition-colors inline-block"
                >
                  View Profile
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default function Nearby() {
  const { user } = useAuth();
  const [searchRadius, setSearchRadius] = useState(25);
  const [locationFilter, setLocationFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userLocation, setUserLocation] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Location access denied, using default location');
        }
      );
    }
  }, []);

  const { data: nearbyCreators = [], isLoading } = useQuery<NearbyCreator[]>({
    queryKey: ['/api/creators/nearby', { radius: searchRadius, center: userLocation }],
  });

  const formatDistance = (miles: number) => {
    if (miles < 1) return `${Math.round(miles * 5280)} ft away`;
    return `${miles.toFixed(1)} miles away`;
  };

  const getLastActiveText = (lastActiveAt: string) => {
    const date = new Date(lastActiveAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Active now';
    if (hours < 24) return `Active ${hours}h ago`;
    return `Active ${days}d ago`;
  };

  const filteredCreators = nearbyCreators.filter(creator =>
    locationFilter === '' ||
    creator.location.city.toLowerCase().includes(locationFilter.toLowerCase()) ||
    creator.location.state.toLowerCase().includes(locationFilter.toLowerCase())
  );

  // Filter creators that have valid coordinates for map display
  const mappableCreators = filteredCreators.filter(creator => 
    creator.location?.lat && creator.location?.lng &&
    Number.isFinite(creator.location.lat) && Number.isFinite(creator.location.lng)
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-96" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" data-testid="nearby-page">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">
            Near by me
          </h1>
          <p className="text-muted-foreground">
            Discover creators in your area and connect locally
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
          data-testid="list-view-button"
        >
          <Users className="h-4 w-4 mr-2" />
          List View
        </Button>
        <Button
          variant={viewMode === 'map' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('map')}
          data-testid="map-view-button"
        >
          <Map className="h-4 w-4 mr-2" />
          Map View
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Radius</label>
            <select 
              value={searchRadius} 
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="w-full p-2 border rounded-md bg-background"
              data-testid="radius-select"
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
              <option value={100}>100 miles</option>
            </select>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Location Filter</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="City or state..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-10"
                data-testid="location-filter"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Results</label>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm" data-testid="results-count">
                {filteredCreators.length} creators found
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Map or List View */}
      {viewMode === 'map' && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Creators Map
            </CardTitle>
            <CardDescription>
              Click on markers to view creator profiles • Green markers indicate online creators
              {mappableCreators.length === 0 && filteredCreators.length > 0 && (
                <span className="text-yellow-600"> • Some creators may not appear due to missing location data</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreatorMap creators={mappableCreators} center={userLocation} />
          </CardContent>
        </Card>
      )}

      {filteredCreators.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="space-y-4">
              <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No creators found nearby</h3>
                <p className="text-muted-foreground mb-6">
                  Try expanding your search radius or check back later for new creators in your area.
                </p>
                <Button 
                  onClick={() => setSearchRadius(searchRadius * 2)}
                  data-testid="expand-search-button"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Expand Search to {searchRadius * 2} miles
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCreators.map((creator) => (
            <Card key={creator.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 group" data-testid={`creator-${creator.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Link href={`/creator/${creator.id}`}>
                        <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                          <AvatarImage src={creator.profileImageUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {creator.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      {creator.isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-background rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link href={`/creator/${creator.id}`}>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                          <h3 className="font-semibold truncate" data-testid={`creator-name-${creator.id}`}>
                            {creator.username}
                          </h3>
                          {creator.isVerified && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{creator.location.city}, {creator.location.state}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {creator.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2" data-testid={`creator-bio-${creator.id}`}>
                    {creator.bio}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                {/* Tags */}
                {creator.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {creator.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {creator.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{creator.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{creator.followerCount.toLocaleString()} followers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    <span data-testid={`creator-distance-${creator.id}`}>
                      {formatDistance(creator.distance)}
                    </span>
                  </div>
                </div>

                {/* Activity Status */}
                <div className="flex items-center justify-between text-xs mb-4">
                  <span className={creator.isOnline ? 'text-green-500' : 'text-muted-foreground'}>
                    {getLastActiveText(creator.lastActiveAt)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link href={`/creator/${creator.id}`}>
                    <Button size="sm" className="flex-1" data-testid={`view-profile-${creator.id}`}>
                      View Profile
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" data-testid={`message-${creator.id}`}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`follow-${creator.id}`}>
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}