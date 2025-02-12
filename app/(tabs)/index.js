import 'react-native-get-random-values';
import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { router } from 'expo-router';

const GOOGLE_PLACES_API_KEY = 'AIzaSyDjpkA1wkyhf5VjzfkeIOqP9IzZLn55C80'; // Replace with your API key

// Reusable GooglePlacesInput component
const GooglePlacesInput = ({ placeholder, onPlaceSelected }) => (
  <GooglePlacesAutocomplete
    placeholder={placeholder}
    onPress={(data, details = null) => {
      onPlaceSelected({
        description: data.description,
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng,
      });
    }}
    query={{
      key: GOOGLE_PLACES_API_KEY,
      language: 'en',
      location: '49.8951,-97.1384', // Center point of Winnipeg
      radius: 50000, // 50 km radius
    }}
    minLength={4}
    fetchDetails={true}
    styles={{
      textInputContainer: styles.inputContainer,
      textInput: styles.textInput,
      listView: styles.listView,
      row: styles.row,
    }}
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
      <GooglePlacesInput placeholder="Enter Origin" onPlaceSelected={setOrigin} />
      <GooglePlacesInput placeholder="Enter Destination" onPlaceSelected={setDestination} />
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
  inputContainer: {
    width: '100%',
    marginBottom: 10,
  },
  textInput: {
    height: 44,
    color: '#5d5d5d',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  listView: {
    backgroundColor: '#fff',
    position: 'absolute',
    top: 60,
    width: '100%',
    zIndex: 1,
  },
  row: {
    padding: 13,
    height: 44,
    flexDirection: 'row',
  },
});
