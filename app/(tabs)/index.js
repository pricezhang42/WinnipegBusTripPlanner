import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import MapboxPlacesAutocomplete from 'react-native-mapbox-places-autocomplete';
import { router } from 'expo-router';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoicmFtZXI0MiIsImEiOiJjbTd0YW9hMDUwb3dkMmtwbDIxYzlrMG1uIn0.RI7UnUqXMAh0IbYZNqRFMA'; // Replace with your Mapbox access token

const MapboxPlacesInput = ({ placeholder, onPlaceSelected }) => (
  <MapboxPlacesAutocomplete
    id={placeholder}
    placeholder={placeholder}
    accessToken={MAPBOX_ACCESS_TOKEN}
    onPlaceSelect={(data) => {
      onPlaceSelected({
        description: data.place_name,
        lat: data.geometry.coordinates[1],
        lng: data.geometry.coordinates[0],
      });
    }}
    countryId="ca" // Limit results to Canada
    inputClassName="input"
    containerClassName="container"
  />
);

export default function HomeScreen() {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);

  const searchRoutes = () => {
    if (origin && destination) {
      router.push({
        pathname: '/routeScreen',
        params: {
          origin: origin.description,
          destination: destination.description,
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
        },
      });
    } else {
      alert('Please select both origin and destination');
    }
  };

  return (
    <View style={styles.container}>
      <MapboxPlacesInput placeholder="Enter Origin" onPlaceSelected={setOrigin} />
      <MapboxPlacesInput placeholder="Enter Destination" onPlaceSelected={setDestination} />
      <Button title="Search Routes" onPress={searchRoutes} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  input: {
    height: 44,
    color: '#5d5d5d',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
});
