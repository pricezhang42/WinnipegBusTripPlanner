import React, { useEffect, useState } from 'react';
import { Text, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Polyline, UrlTile, Circle  } from 'react-native-maps';

// Define a color palette
const colorPalette = ['blue', 'black', 'green'];

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
          return [ride.origin, ride.destination];
        }
  
        const relation = findRelationWithNodes(data, originNode.id, destinationNode.id);
        if (!relation) {
          console.warn("No matching relation found for origin and destination nodes.");
          return [originNode.coordinates, destinationNode.coordinates];
        }

        const nodes = extractAllNodes(relation);
  
        const points = extractWayCoordinates(relation, nodes);
        return extractCoordinatesBetweenStops(points, originNode.coordinates, destinationNode.coordinates);
      }));
  
      setRouteData(routeDataList);
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

  const extractAllNodes = (relation) => {
    return relation.members
      .filter((member) => member.type === "node" && member.lat && member.lon)
      .map((node) => ({
        latitude: node.lat,
        longitude: node.lon,
      }));
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
  const extractWayCoordinates = (relation, nodes) => {
    const coordinates = [];
    const ways = relation.members.filter(m => m.type === 'way' && m.geometry);

    ways.map((way, index) => {
        // Convert geometry to { latitude, longitude }
        const coords = way.geometry.map(pt => ({
          latitude: pt.lat,
          longitude: pt.lon
        }));
        if (index === 0) {
          startNodeOfWay = nodes[0];
        } else {
          startNodeOfWay = coordinates[coordinates.length-1];
        }
        dis_start = squareDistanceOfTwoPonits(coords[0], startNodeOfWay);
        dis_end = squareDistanceOfTwoPonits(coords[coords.length - 1], startNodeOfWay);
        if (dis_start > dis_end){
          coords.reverse();
        }
        for (let i= 0; i < coords.length; i++) {
          coordinates.push(coords[i]);
        }
      });
    const coordinates_new = [];
    for (let i= 0; i < coordinates.length; i++) {
      if (!coordinates[i+1] || coordinates[i].latitude !== coordinates[i+1].latitude || coordinates[i].longitude !== coordinates[i+1].longitude) {
        coordinates_new.push(coordinates[i]);
      }
    }
    return coordinates_new;
  };

  function squareDistanceOfTwoPonits(a, b) {
    return (a.latitude - b.latitude)**2 + (a.longitude - b.longitude)**2
  }

  function extractCoordinatesBetweenStops(coordinates, origin, destination) {
    startIndex = 0;
    endIndex = 0;
    closestDistanceStart = 999;
    closestDistanceEnd = 999;
    for (let p = 0; p < coordinates.length; p++) {
      const point = coordinates[p];
      dis_start = squareDistanceOfTwoPonits(point, origin);
      dis_end = squareDistanceOfTwoPonits(point, destination);
      if (dis_start < closestDistanceStart) {
        closestDistanceStart = dis_start;
        startIndex = p;
      }
      if (dis_end < closestDistanceEnd) {
        closestDistanceEnd = dis_end;
        endIndex = p;
      }
    }

    pointsInBetween = []
    for (let i = startIndex; i <= endIndex; i++) {
      pointsInBetween.push(coordinates[i])
    }
  
    return pointsInBetween;
  }
  
  // Helper function: Extract segment between origin and destination stops
  const extractSegmentBetweenStops = (coordinates, origin, destination) => {
    let capturing = false;
  
    return coordinates.filter((coord) => {
      if (!capturing && isCloseTo(coord, origin)) capturing = true;
      if (capturing && isCloseTo(coord, destination)) capturing = false;
  
      return capturing || isCloseTo(coord, origin) || isCloseTo(coord, destination);
    });
  };
  
  // Helper function: Check if a point is close to a target
  const isCloseTo = (point, target, threshold = 0.0005) => {
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
      mapType={Platform.OS == "android" ? "none" : "standard"}
    >
      <UrlTile
        urlTemplate={"https://tile.openstreetmap.de/{z}/{x}/{y}.png"}
        maximumZ={19}
        zIndex={-1} // Render beneath other components
      />
      {routeData.map((coordinates, index) => (
        <React.Fragment key={index}>
        <Polyline
          coordinates={coordinates}
          strokeWidth={3}
          strokeColor={colorPalette[index % colorPalette.length]} // Assign color based on index
          zIndex={1} // Render above UrlTile
        />
        {/* {route.map((way, index) => (
          <Polyline
            key={index}
            coordinates={way}
            strokeWidth={3}
            strokeColor="blue"
          />
        ))} */}
        {/* Hollow Circle at the Start Point */}
        {/* <Circle
          center={coordinates[0]}
          radius={10} // Radius in meters
          strokeWidth={2}
          strokeColor={colorPalette[index % colorPalette.length]}
          fillColor="transparent"
          zIndex={2} // Render above Polyline
        /> */}
        {/* Hollow Circle at the End Point */}
        {/* <Circle
          center={coordinates[coordinates.length - 1]}
          radius={10} // Radius in meters
          strokeWidth={2}
          strokeColor={colorPalette[index % colorPalette.length]}
          fillColor="transparent"
          zIndex={2} // Render above Polyline
        /> */}
      </React.Fragment>
      ))}
      {error && <Text style={{ color: 'red', position: 'absolute', top: 10 }}>{error}</Text>}
    </MapView>
  );
}

