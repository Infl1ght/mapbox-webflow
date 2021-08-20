import mapboxgl from 'mapbox-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import turfBooleanPointInPolygon from '@turf/boolean-point-in-polygon';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import NewPolygonDraw from './new-polygon-draw.js';

module.exports = (objectsToShow = [], renderedObjectsChangedCallback, mapLoadedCallback) => {
  var abbreviateNumber = (valueUnparsed) => {
    var value = valueUnparsed;
    if(typeof valueUnparsed === 'string') {
      value = parseFloat(valueUnparsed.replace(/,/g, ''));
    }
    var newValue = value;
    if (value >= 1000) {
        var suffixes = ["", "K", "מ׳", "B","T"];
        var suffixNum = Math.floor( (""+value).length/3 );
        var shortValue = '';
        for (var precision = 2; precision >= 1; precision--) {
            shortValue = parseFloat( (suffixNum != 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
            var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
            if (dotLessShortValue.length <= 2) { break; }
        }
        if (shortValue % 1 != 0)  shortValue = shortValue.toFixed(1);
        newValue = shortValue+suffixes[suffixNum];
    }
    return newValue;
  }

  var coordsToFeatureCollection = (mapObjects) => {
    const featureCollection = [];
    for(var mapObject of mapObjects) {
      featureCollection.push({
        "type": "Feature",
        "id": mapObject.slug,
        "geometry": {
          "type": "Point",
          "coordinates": [mapObject.lat, mapObject.long]
        },
        "properties": {
          "price": mapObject.price,
          "priceShort": abbreviateNumber(mapObject.price),
          'description':
          `<div onclick="window.open('${mapObject.objectUrl}');" style="cursor: pointer; display: flex; font-size: 16px;">
            <div>
              <img src="${mapObject.imageUrl}" style="object-fit: cover; width: 110px; height: 89px;" />
            </div>
            <div style="display: flex; flex-direction: column; padding: 5px; padding-left: 10px; width: 200px;">
              <div style="height: 40px; font-weight: 600;">
                ${mapObject.address}
              </div>
              <div>
                <div>₪${mapObject.price}</div>
                <div style="font-size: 14px; padding-top: 5px;">
                  <div style="direction: rtl; display: inline-block;">${mapObject.bedrooms ? '| ' + mapObject.bedrooms + ' חד׳' : ''}</div>
                  <div style="direction: ltr; display: inline-block;">${mapObject.bathrooms ? mapObject.bathrooms + ' BA | ': ''}</div>
                  <div style="direction: rtl; display: inline-block;">${mapObject.squareMeters ? mapObject.squareMeters + ' מ״ר' : '' }</div>
                </div>
              </div>
            </div>
          </div>`,
        }
      });
    }
    return { type: 'FeatureCollection', features: featureCollection };
  }

  mapboxgl.accessToken = "pk.eyJ1IjoiZ2V0cGxhY2UiLCJhIjoiY2tzNG1zM2NiMnBnaDJwczdpZHE2aXhtZyJ9.1ZzWC4AMI2rHRCDs_IKseg";
  mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js');

  var CLUSTER_RADIUS_NORMAL = [
    'step',
    ['get', 'point_count'],
    10,
    0, 12,
    5, 14,
    25, 16,
    125, 18,
  ];
  var CLUSTER_RADIUS_HOVER = [
    'step',
    ['get', 'point_count'],
    10,
    0, 13,
    5, 15,
    25, 17,
    125, 19,
  ];
  var CLUSTER_SHADOW_RADIUS_NORMAL = [
    'step',
    ['get', 'point_count'],
    10,
    0, 16,
    5, 21,
    25, 24,
    125, 27,
  ];
  var CLUSTER_SHADOW_RADIUS_HOVER = [
    'step',
    ['get', 'point_count'],
    10,
    0, 18,
    5, 23,
    25, 26,
    125, 29,
  ];

  var map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v11",
    center: [34.825624, 32.029848],
    zoom: 11,
  });

  let polygon;
  let objectsList;
 
  const draw = new MapboxDraw({
    displayControlsDefault: false,
    modes: Object.assign({
      new_draw_polygon: NewPolygonDraw,
    }, MapboxDraw.modes),
  });
  
  const showItemsOnlyInPolygon = (e) => {
    polygon = e.features[0];
    if (polygon) {
      const objectsInPolygon = objectsList.filter((mapObject) => {
        return turfBooleanPointInPolygon([mapObject.lat, mapObject.long], polygon);
      });
      map.getSource('objects').setData(coordsToFeatureCollection(objectsInPolygon));
      map.getSource('objects-without-clusters').setData(coordsToFeatureCollection(objectsInPolygon));
    } else {
      map.getSource('objects').setData(coordsToFeatureCollection(objectsList));
      map.getSource('objects-without-clusters').setData(coordsToFeatureCollection(objectsList));
    }
  }

  map.on('draw.create', showItemsOnlyInPolygon);
  map.on('draw.update', showItemsOnlyInPolygon)
  map.addControl(draw);

  var onMapLoaded = () => {
    map.addControl(new MapboxLanguage({ defaultLanguage: 'mul' }));
    map.addSource('objects', {
      type: 'geojson',
      data: coordsToFeatureCollection(objectsToShow),
      cluster: true,
      clusterMaxZoom: 16, // Max zoom to cluster points on
      clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
    });
    map.addSource('objects-without-clusters', {
      type: 'geojson',
      data: coordsToFeatureCollection(objectsToShow),
      cluster: false,
    });
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'objects',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'rgb(0, 100, 229)',
        'circle-radius': CLUSTER_RADIUS_NORMAL,
      },
    });
    map.addLayer({
      id: 'clusters-shadow',
      type: 'circle',
      source: 'objects',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'rgb(0, 100, 229)',
        'circle-radius': CLUSTER_SHADOW_RADIUS_NORMAL,
        'circle-opacity': 0.2
      },
    }); 
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'objects',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 13,
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      },
      paint: {
        'text-color': '#FFFFFF',
      },
    });
    
    let markerImage = new Image(50, 30);
    markerImage.onload = () => map.addImage('marker-with-price', markerImage);
    markerImage.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2aWV3Qm94PSIwIDAgNTAgMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTSAxLjUxMzAwMDAxMTQ0NDA5MTggMSBMIDEuMzQ3MDAwMDAyODYxMDIzIDI0Ljg3NDAwMDU0OTMxNjQwNiBMIDIyLjEzMjk5OTQyMDE2NjAxNiAyNC44NzQwMDA1NDkzMTY0MDYgTCAyNS4xMzgwMDA0ODgyODEyNSAyOS4yMTUwMDAxNTI1ODc4OSBMIDI2Ljk3NDAwMDkzMDc4NjEzMyAyNC42MjQwMDA1NDkzMTY0MDYgTCA0OC43NjIwMDEwMzc1OTc2NTYgMjQuNzA3MDAwNzMyNDIxODc1IEwgNDguNjc5MDAwODU0NDkyMTkgMS4xNjYwMDAwMDg1ODMwNjg4IFoiIHN0eWxlPSJzdHJva2U6IHJnYigwLCAwLCAwKTsgZmlsbDogIzAyODc1MjsiLz4KPC9zdmc+";
    
    let markerSelectedImage = new Image(50, 30);
    markerSelectedImage.onload = () => map.addImage('marker-with-price-selected', markerSelectedImage);
    markerSelectedImage.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2aWV3Qm94PSIwIDAgNTAgMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTSAxLjUxMzAwMDAxMTQ0NDA5MTggMSBMIDEuMzQ3MDAwMDAyODYxMDIzIDI0Ljg3NDAwMDU0OTMxNjQwNiBMIDIyLjEzMjk5OTQyMDE2NjAxNiAyNC44NzQwMDA1NDkzMTY0MDYgTCAyNS4xMzgwMDA0ODgyODEyNSAyOS4yMTUwMDAxNTI1ODc4OSBMIDI2Ljk3NDAwMDkzMDc4NjEzMyAyNC42MjQwMDA1NDkzMTY0MDYgTCA0OC43NjIwMDEwMzc1OTc2NTYgMjQuNzA3MDAwNzMyNDIxODc1IEwgNDguNjc5MDAwODU0NDkyMTkgMS4xNjYwMDAwMDg1ODMwNjg4IFoiIHN0eWxlPSJzdHJva2U6IHJnYigwLCAwLCAwKTsgZmlsbDogIzQwMkE5MDsiLz4KPC9zdmc+";

    map.addLayer({
      id: 'items',
      type: 'symbol',
      filter: ['!', ['has', 'point_count']],
      source: 'objects',
      layout: {
        'icon-image': 'marker-with-price',
        'icon-size': 0.7,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'text-field': ['get', 'priceShort'],
        'text-allow-overlap': true,
        'text-font': [
          'Open Sans Semibold',
          'Arial Unicode MS Bold'
        ],
        'text-offset': [0, -0.4],
        'text-size': 12,
        'text-anchor': 'bottom',
      },
      paint: {
        "text-color": "#ffffff"
      }
    });
    map.on('mouseenter', 'items', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      map.setLayoutProperty(
        'items', 
        'icon-size', 
        ['match', ['id'], e.features[0].id, 0.9, 0.7],
      );
      map.setLayoutProperty(
        'items', 
        'text-size', 
        ['match', ['id'], e.features[0].id, 15, 12],
      );
    });
    map.on('mouseleave', 'items', (e) => {
      map.getCanvas().style.cursor = '';
      map.setLayoutProperty('items', 'icon-size', 0.7);
      map.setLayoutProperty('items', 'text-size', 12);
    });
    map.on('click', 'items', (e) => {
      var coordinates = e.features[0].geometry.coordinates.slice();
      var description = e.features[0].properties.description;
       
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
       
      new mapboxgl.Popup({ anchor: 'left', closeButton: false, offset: [25, 0], maxWidth: 345 })
        .setLngLat(coordinates)
        .setHTML(description)
        .addTo(map);
    });
    map.addLayer({
      id: 'items-unvisible',
      type: 'circle',
      source: 'objects-without-clusters',
      paint: {
        'circle-radius': 0,
      },
    });
    map.addLayer({
      id: 'items-in-clusters',
      type: 'symbol',
      source: 'objects-without-clusters',
      filter: false,
      layout: {
        'icon-image': 'marker-with-price-selected',
        'icon-size': 0.9,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'text-field': ['get', 'priceShort'],
        'text-allow-overlap': true,
        'text-font': [
          'Open Sans Semibold',
          'Arial Unicode MS Bold'
        ],
        'text-offset': [0, -0.4],
        'text-size': 15,
        'text-anchor': 'bottom',
      },
      paint: {
        "text-color": "#ffffff"
      }
    });
    map.on('click', 'clusters', (e) => {
      var features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });
      var clusterId = features[0].properties.cluster_id;
      map.getSource('objects').getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
          if (err) return;
          map.easeTo({
            center: e.lngLat,
            zoom,
          });
        },
      );
    });
    map.on('mouseenter', 'clusters', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      var features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });
      var clusterId = features[0].properties.cluster_id;
      map.setPaintProperty(
        'clusters', 
        'circle-radius', 
        ['match', ['id'], clusterId, 
          CLUSTER_RADIUS_HOVER,
          CLUSTER_RADIUS_NORMAL
        ],
      );
      map.setPaintProperty(
        'clusters-shadow', 
        'circle-radius', 
        ['match', ['id'], clusterId, 
          CLUSTER_SHADOW_RADIUS_HOVER,
          CLUSTER_SHADOW_RADIUS_NORMAL
        ],
      );
      map.setLayoutProperty('cluster-count', 'text-size', ['match', ['id'], clusterId, 14, 12]);  
    });
    map.on('mouseleave', 'clusters', (e) => {
      map.getCanvas().style.cursor = '';
      map.setPaintProperty(
        'clusters', 
        'circle-radius', 
        CLUSTER_RADIUS_NORMAL
      );
      map.setPaintProperty(
        'clusters-shadow', 
        'circle-radius', 
         CLUSTER_SHADOW_RADIUS_NORMAL
      );
      map.setLayoutProperty('cluster-count', 'text-size', 12);
    });

    if (mapLoadedCallback && typeof mapLoadedCallback === 'function') {
      mapLoadedCallback();
    }
  };
  map.on('load', onMapLoaded);

  function centerMap(objects) {
    if(!objects.length) {
      return;
    }
    const bounds = new mapboxgl.LngLatBounds();
    objects.forEach((object) => {
      bounds.extend([object.lat, object.long]);
    });

    map.fitBounds(bounds, { padding: 150, pitch: 0, bearing: 0 });
  }

  function getVisibleMarkers() {
    const features = map.queryRenderedFeatures({ layers: ['items-unvisible'] });
    const ids = features.map(o => o.id);
    let filtered = features.filter(({id}, index) => !ids.includes(id, index + 1));
    
    if (polygon) {
      filtered = filtered.filter((feature) => {
        return turfBooleanPointInPolygon(feature.geometry.coordinates, polygon);
      });
    }
    var filteredIds = filtered.map((obj) => obj.id);
    return filteredIds;
  }

  var visibleMarkersIds = getVisibleMarkers();

  setInterval(() => {
    var listsAreDifferent = (list1, list2) => {
      if (list1.length !== list2.length) {
        return true;
      }
      if(list1.sort().join(',') !== list2.sort().join(',')){
        return true;
      }
      return false;
    }

    var currentVisibleMarkers = getVisibleMarkers();
    if (listsAreDifferent(visibleMarkersIds, currentVisibleMarkers)) {
      visibleMarkersIds = currentVisibleMarkers;
      renderedObjectsChangedCallback(visibleMarkersIds);
    }
  }, 1000);

  var changeObjectsList = function(newList) {
    var setSourceData = () => {
      objectsList = newList.filter((mapObject) => mapObject.lat && mapObject.long);
      map.getSource('objects').setData(coordsToFeatureCollection(objectsList));
      map.getSource('objects-without-clusters').setData(coordsToFeatureCollection(objectsList));
      renderedObjectsChangedCallback(visibleMarkersIds);
      centerMap(objectsList);
    }

    if(!map.loaded()) {
      map.on('load', () => {
        setSourceData();
      });
    } else {
      setSourceData();
    }
  };

  const setAddingPolygonMode = () => {
    draw.deleteAll();
    draw.changeMode('new_draw_polygon');
  }

  const clearPolygon = () => {
    draw.deleteAll();
    map.getSource('objects').setData(coordsToFeatureCollection(objectsList));
    map.getSource('objects-without-clusters').setData(coordsToFeatureCollection(objectsList));
    polygon = undefined;
  }

  const highlightObjectWithId = (id) => {
    const featuresItems = map.queryRenderedFeatures({ layers: ['items'] });
    if (featuresItems.find(feature => feature.id === parseFloat(id))) {
      map.getCanvas().style.cursor = 'pointer';
      map.setLayoutProperty(
        'items', 
        'icon-size', 
        ['match', ['id'], parseFloat(id), 0.9, 0.7],
      );
      map.setLayoutProperty(
        'items', 
        'text-size', 
        ['match', ['id'], parseFloat(id), 15, 12],
      );
      map.setLayoutProperty(
        'items', 
        'icon-image', 
        ['match', ['id'], parseFloat(id), 'marker-with-price-selected', 'marker-with-price'],
      );
    } else {
      const featuresUnvisible = map.queryRenderedFeatures({ layers: ['items-unvisible'] });
      if (featuresUnvisible.find(feature => feature.id === parseFloat(id))) {
        map.setFilter(
          'items-in-clusters', 
          ['match', ['id'], parseFloat(id), true, false]
        );
      }
    }
  }

  const resetObjectHighlighting = () => {
    map.getCanvas().style.cursor = '';
    map.setLayoutProperty('items', 'icon-size', 0.7);
    map.setLayoutProperty('items', 'text-size', 12);
    map.setLayoutProperty('items', 'icon-image', 'marker-with-price');
    map.setFilter('items-in-clusters', false);
  }

  return {
    changeObjectsList,
    map,
    setAddingPolygonMode,
    clearPolygon,
    highlightObjectWithId,
    resetObjectHighlighting
  };
};
