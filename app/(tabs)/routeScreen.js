// import React, { useState, useEffect } from 'react';
// import { View, Text, Button, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
// import { useLocalSearchParams, router } from 'expo-router';
// import axios from 'axios';

// export default function RouteResultsScreen() {
//   const [routes, setRoutes] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Get origin and destination from params
//   const { origin, destination, originLat, originLng, destinationLat, destinationLng } = useLocalSearchParams();

//   useEffect(() => {
//     const fetchRoutes = async () => {
//       const coordOrigin = [originLat, originLng];
//       const coordDest = [destinationLat, destinationLng];
//       try {
        
//         const response = await axios.post('http://10.0.0.175:3000/myFunction', {
//           coordOrigin,
//           coordDest
//         });
//         console.log(response);
//         setRoutes(response.data[0]); // Assumes response has a list of routes as data[0]
//       } catch (err) {
//         console.error(err);
//         setError('Failed to load routes');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchRoutes();
//   }, [origin, destination]);

//   if (loading) {
//     return <ActivityIndicator size="large" color="#0000ff" />;
//   }

//   if (error) {
//     return <Text style={styles.errorText}>{error}</Text>;
//   }

//   return (
//     <FlatList
//       data={routes}
//       keyExtractor={(item, index) => index.toString()}
//       renderItem={({ item, index }) => (
//         <View style={styles.routeCard}>
//           <Text>Route {index + 1}</Text>
//           <Button
//             title="View on Map"
//             onPress={() => router.push({ pathname: '/mapScreen', params: { route: JSON.stringify(item) } })}
//           />
//         </View>
//       )}
//     />
//   );
// }

// const styles = StyleSheet.create({
//   routeCard: {
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ddd',
//   },
//   errorText: {
//     color: 'red',
//     textAlign: 'center',
//     marginTop: 20,
//   },
// });


import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import axios from 'axios';

export default function RouteResultsScreen() {
  const [routes, setRoutes] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { origin, destination, originLat, originLng, destinationLat, destinationLng } = useLocalSearchParams();

  useEffect(() => {
    const fetchRoutes = async () => {
      const coordOrigin = [originLat, originLng];
      const coordDest = [destinationLat, destinationLng];
      try {
        const response = await axios.post('http://10.0.0.189:3000/myFunction', {
          coordOrigin,
          coordDest,
        });
        const [routePlans, routeScores] = response.data;
        console.log(response.data);
        setRoutes(routePlans);
        setScores(routeScores);
      } catch (err) {
        console.error(err);
        setError('Failed to load routes');
      } finally {
        setLoading(false);
      }
    };
    if (origin && destination && originLat && originLng && destinationLat && destinationLng) {
      fetchRoutes();
    }
  }, [origin, destination]);
  if (!origin || !destination) {
    return <Text>Please Enter Origin and Destination</Text>;
  }
  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <FlatList
      data={routes}
      keyExtractor={(item, index) => index.toString()}
      renderItem={({ item, index }) => {
        const routeScore = scores.find(score => score.planId === item.number);
        return (
          <View style={styles.routeCard}>
            <Text style={styles.routeTitle}>Route {index + 1}</Text>
            <Text style={styles.infoText}>
              <Text style={styles.boldText}>Score:</Text> {routeScore?.score?.toFixed(2) || 'N/A'} |{' '}
              <Text style={styles.boldText}>Time Outside:</Text> {routeScore?.totalTimeOutside} min
            </Text>
            <View style={styles.segmentsContainer}>
              {item.segments.map((segment, segmentIndex) => {
                if (segment.type === 'ride') {
                  return (
                    <Text key={segmentIndex} style={styles.segmentText}>
                      ● <Text style={styles.boldText}>Ride:</Text> Bus {segment.route.key}, {segment.times.durations.riding} min
                    </Text>
                  );
                } else if (segment.type === 'walk') {
                  return (
                    <Text key={segmentIndex} style={styles.segmentText}>
                      ● <Text style={styles.boldText}>Walk:</Text>{segment.times.durations.walking} min
                    </Text>
                  );
                } else if (segment.type === 'transfer') {
                  return (
                    <Text key={segmentIndex} style={styles.segmentText}>
                      ● <Text style={styles.boldText}>Transfer:</Text> Walking: {segment.times.durations.walking} min, Waiting: {segment.times.durations.waiting} min{' '}
                      ({segment.to.stop.isSheltered ? 'Sheltered' : 'Unsheltered'})
                    </Text>
                  );
                }
                return null;
              })}
            </View>
            <Button
              title="View on Map"
              onPress={() =>
                router.push({
                  pathname: '/mapScreen',
                  params: { route: JSON.stringify(item) },
                })
              }
            />
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  routeCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  routeTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 10,
  },
  boldText: {
    fontWeight: 'bold',
  },
  segmentsContainer: {
    marginVertical: 10,
  },
  segmentText: {
    marginVertical: 2,
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

