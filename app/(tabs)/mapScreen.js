// import React, { useEffect, useState } from 'react';
// import { View, Text } from 'react-native';
// import MapView, { Polyline, UrlTile } from 'react-native-maps';

// export default function MapScreen() {
//   const [routeCoordinates, setRouteCoordinates] = useState([]);
//   const [error, setError] = useState(null);

//   const fetchRouteData = async () => {
//     try {
//       const query = `
//           [out:json][timeout:25];
//           area[name="Winnipeg"]->.searchArea;
//           (
//             relation["type"="route"]["route"="bus"]["ref"="60"](area.searchArea);
//           );
//           out geom;
//       `;
//       const response = await fetch('https://overpass-api.de/api/interpreter', {
//         method: 'POST',
//         body: query,
//       });
//       const data = await response.json();
//       console.log(data);

//       const coordinates = data.elements
//         .flatMap((element) =>
//           element.members
//             .filter((member) => member.type === 'way' && member.geometry)
//             .flatMap((way) =>
//               way.geometry.map((point) => ({
//                 latitude: point.lat,
//                 longitude: point.lon,
//               }))
//             )
//         );

//       setRouteCoordinates(coordinates);
//     } catch (err) {
//       console.error('Error fetching route data:', err);
//       setError('Failed to load route data');
//     }
//   };

//   useEffect(() => {
//     fetchRouteData();
//   }, []);

//   return (
//     <MapView
//       style={{ flex: 1 }}
//       initialRegion={{
//         latitude: routeCoordinates.length ? routeCoordinates[0].latitude : 49.8951,
//         longitude: routeCoordinates.length ? routeCoordinates[0].longitude : -97.1384,
//         latitudeDelta: 0.1,
//         longitudeDelta: 0.1,
//       }}
//     >
//       <UrlTile
//         urlTemplate={"http://c.tile.openstreetmap.org/{z}/{x}/{y}.png"}
//         maximumZ={19}
//       />
//       {routeCoordinates.length > 0 && (
//         <Polyline coordinates={routeCoordinates} strokeWidth={3} strokeColor="blue" />
//       )}
//     </MapView>
//   );
// }



import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Polyline, UrlTile } from 'react-native-maps';

// Parse `route` once outside the component to avoid re-triggering `useEffect` continuously
const parseRoute = (route) => {
  try {
    return typeof route === "string" ? JSON.parse(route) : route;
  } catch (error) {
    console.error("Error parsing route:", error);
    return null;
  }
};

export default function MapScreen() {


  const getGeographic = (location) => {
    if (location.hasOwnProperty('stop')) {
      return location.stop.centre.geographic;
    } else if (location.hasOwnProperty('origin')) {
      if (location.origin.hasOwnProperty('monument')) {
        return location.origin.monument.address.centre.geographic;
      } else if (location.origin.hasOwnProperty('point')) {
        return location.origin.point.centre.geographic;
      } else {
        return location.origin.address.centre.geographic;
      }
    } else if (location.hasOwnProperty('destination')) {
      if (location.destination.hasOwnProperty('monument')) {
        return location.destination.monument.address.centre.geographic;
      } else if (location.destination.hasOwnProperty('point')) {
        return location.destination.point.centre.geographic;
      } else {
        return location.destination.address.centre.geographic;
      }
    }
    return null;
  };



  const fetchRouteData = async () => {
    try {
      setRouteData([]); // Clear previous data
  
      const routeDataList = await Promise.all(rides.map(async (ride) => {
        const data = await fetchRouteAndNodes(ride);
  
        const { originNode, destinationNode } = extractNodes(data, ride);
        if (!originNode || !destinationNode) {
          console.warn("Origin or destination node not found for ride:", ride);
          return [];
        }
  
        const relation = findRelationWithNodes(data, originNode.id, destinationNode.id);
        if (!relation) {
          console.warn("No matching relation found for origin and destination nodes.");
          return [];
        }
        
        // TODO probably not convert to points before filtering?
        // const coordinates = extractRelationCoordinates(relation);
        const ways = [];
        relation.members
          .filter(m => m.type === 'way' && m.geometry)
          .map((way, index) => {
            // Convert geometry to { latitude, longitude }
            const coords = way.geometry.map(pt => ({
              latitude: pt.lat,
              longitude: pt.lon
            }));
            ways.push(coords);
          });
        const waysInBetween = extractWaysBetweenStops(ways, originNode.coordinates, destinationNode.coordinates);
        return waysInBetween;
        // return extractSegmentBetweenStops(coordinates, originNode.coordinates, destinationNode.coordinates);
      }));

      const wayList = [];
      routeDataList.map((ways) => (
        ways.map((way) => (
          wayList.push(way)
        ))
      ))
  
      setRouteData(wayList);
    } catch (err) {
      console.error("Error fetching route data:", err);
      setError("Failed to load route data");
    }
  };
  
  // Helper function: Fetch data from Overpass API
  const fetchRouteAndNodes = async (ride) => {
    const query = `
      [out:json][timeout:25];
      area[name="Winnipeg"]->.searchArea;
      (
        relation["type"="route"]["route"="bus"]["ref"="${ride.bus}"](area.searchArea);
        node["public_transport"="platform"]["name"="${ride.origin.name}"](area.searchArea);
        node["highway"="bus_stop"]["name"="${ride.origin.name}"](area.searchArea);
        node["public_transport"="platform"]["name"="${ride.destination.name}"](area.searchArea);
        node["highway"="bus_stop"]["name"="${ride.destination.name}"](area.searchArea);
      );
      out geom;
    `;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });
  
    if (!response.ok) throw new Error("Failed to fetch data from Overpass API");
  
    return await response.json();
  };
  
  // Helper function: Extract origin and destination nodes from API response
  const extractNodes = (data, ride) => {
    let originNode = null;
    let destinationNode = null;
  
    data.elements.forEach((element) => {
      if (element.type === "node") {
        const coordinates = { latitude: element.lat, longitude: element.lon };
        if (element.tags.name === ride.origin.name) originNode = { id: element.id, coordinates };
        if (element.tags.name === ride.destination.name) destinationNode = { id: element.id, coordinates };
      }
    });
  
    return { originNode, destinationNode };
  };
  
  // Helper function: Find the matching relation that includes origin and destination nodes in order
  const findRelationWithNodes = (data, originNodeId, destinationNodeId) => {
    return data.elements.find((element) => {
      if (element.type !== "relation") return false;
  
      const members = element.members;
      const originIndex = members.findIndex((member) => member.ref === originNodeId);
      const destinationIndex = members.findIndex((member) => member.ref === destinationNodeId);
  
      return originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex;
    });
  };
  
  // Helper function: Extract coordinates from a relation
  const extractRelationCoordinates = (relation) => {
    return relation.members
      .filter((member) => member.type === "way" && member.geometry)
      .flatMap((way) =>
        way.geometry.map((point) => ({
          latitude: point.lat,
          longitude: point.lon,
        }))
      );
  };
  
  // Helper function: Extract segment between origin and destination stops
  const extractSegmentBetweenStops = (coordinates, origin, destination) => {
    let capturing = false;
  
    return coordinates.filter((coord) => {
      if (!capturing && isCloseTo(coord, origin)) capturing = true;
      if (capturing && isCloseTo(coord, destination)) capturing = false;
  
      return capturing || isCloseTo(coord, origin) || isCloseTo(coord, destination);
    });
  };

  function extractWaysBetweenStops(ways, origin, destination) {
    let capturing = false;  // Whether we've encountered the origin yet
    let done = false;       // Whether we've encountered the destination
    const results = [];
  
    for (let w = 0; w < ways.length; w++) {
      const coords = ways[w];
      const keptPoints = [];
  
      // Walk through each coordinate in this way
      for (let c = 0; c < coords.length; c++) {
        const point = coords[c];
  
        // If we're not capturing yet, check if this coordinate is the origin
        if (!capturing) {
          if (isCloseTo(point, origin)) {
            capturing = true;
            keptPoints.push(point);
          }
        } else {
          // We are capturing: keep this point
          keptPoints.push(point);
  
          // Check if we've reached the destination
          if (isCloseTo(point, destination)) {
            capturing = false;
            done = true;
            break; // No need to check more points in this way
          }
        }
      }
  
      // If we kept any portion of this way, add it to results
      if (keptPoints.length > 0) {
        results.push(keptPoints);
      }
  
      // If we already found the destination, we're done
      if (done) {
        break;
      }
    }
  
    return results;
  }
  
  // Helper function: Check if a point is close to a target
  const isCloseTo = (point, target, threshold = 0.0003) => {
    return (
      Math.abs(point.latitude - target.latitude) < threshold &&
      Math.abs(point.longitude - target.longitude) < threshold
    );
  };


  const [error, setError] = useState(null);
  const [routeData, setRouteData] = useState([]);

  let { route: rawRoute } = useLocalSearchParams();
  let rides = [];

  useEffect(() => {
    const route = parseRoute(rawRoute);

    if (route) {
      let skipSeg = false;
      rides = [];
    
      route.segments.forEach((segment, index) => {
        if (!skipSeg) {
          if (segment.type === 'ride') {
            let nextSeg = route.segments[index + 1];
            if (nextSeg.type === 'ride') {
              nextSeg = route.segments[index + 2];
              skipSeg = true;
            }
            const toGeographic = getGeographic(nextSeg.from);
            const prevSeg = route.segments[index - 1];
            const fromGeographic = getGeographic(prevSeg.to);
    
            const ride = {
              bus: segment.route.key,
              origin: { latitude: parseFloat(fromGeographic.latitude), longitude: parseFloat(fromGeographic.longitude), name: prevSeg.to.stop.name },
              destination: { latitude: parseFloat(toGeographic.latitude), longitude: parseFloat(toGeographic.longitude), name: nextSeg.from.stop.name },
            };
    
            rides.push(ride);
          }
        } else {
            skipSeg = false;
        }
      });
  
      if (rides) fetchRouteData();

    }
  }, [rawRoute]); // Depend on `rawRoute` rather than `route` to avoid re-render loop

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: routeData.length && routeData[0].length ? routeData[0][0].latitude : 49.8951,
        longitude: routeData.length && routeData[0].length ? routeData[0][0].longitude : -97.1384,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
    >
      <UrlTile
        urlTemplate={"http://c.tile.openstreetmap.org/{z}/{x}/{y}.png"}
        maximumZ={19}
      />
      {routeData.map((way, index) => (
          <Polyline
            key={index}
            coordinates={way}
            strokeWidth={3}
            strokeColor="blue"
          />
      ))}
      {error && <Text style={{ color: 'red', position: 'absolute', top: 10 }}>{error}</Text>}
    </MapView>
  );
}

