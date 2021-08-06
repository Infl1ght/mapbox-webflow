var initMap = (objectsToShow = [], renderedObjectsChangedCallback) => {
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
    featureCollection = [];
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
          `<div onclick="window.open('${mapObject.objectUrl}');" style="cursor: pointer; display: flex; font-size: 15px;"><div><img src="${mapObject.imageUrl}" width="200" /></div><div style="display: flex; flex-direction: column; justify-content: space-between; padding: 5px; min-width: 100px;"><strong>${mapObject.address}</strong><div>₪${mapObject.price}</div></div></div>`,
        }
      });
    }
    return { type: 'FeatureCollection', features: featureCollection };
  }

  mapboxgl.accessToken = "pk.eyJ1IjoiaW5mbDFnaHQiLCJhIjoiY2tybHd3aG54MWdnMTJxcHY0ZXJ3bzBkZyJ9.8eEZH-KSJ9FVynPwjpet_g";
  mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js');
  
  var map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v11",
    center: [34.825624, 32.029848],
    zoom: 11,
  });

  var onMapLoaded = () => {
    map.addControl(new MapboxLanguage());
    map.addSource('objects', {
      type: 'geojson',
      data: coordsToFeatureCollection(objectsToShow),
      cluster: true,
      clusterMaxZoom: 14, // Max zoom to cluster points on
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
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          10,
          0, 12,
          5, 14,
          25, 16,
          125, 18,
        ],
      },
    });    
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'objects',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 14,
      },
      paint: {
        'text-color': '#FFFFFF',
      },
    });
    
    let img = new Image(50, 30);
    img.onload = () => map.addImage('marker-with-price', img);
    img.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2aWV3Qm94PSIwIDAgNTAgMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTSAxLjUxMzAwMDAxMTQ0NDA5MTggMSBMIDEuMzQ3MDAwMDAyODYxMDIzIDI0Ljg3NDAwMDU0OTMxNjQwNiBMIDIyLjEzMjk5OTQyMDE2NjAxNiAyNC44NzQwMDA1NDkzMTY0MDYgTCAyNS4xMzgwMDA0ODgyODEyNSAyOS4yMTUwMDAxNTI1ODc4OSBMIDI2Ljk3NDAwMDkzMDc4NjEzMyAyNC42MjQwMDA1NDkzMTY0MDYgTCA0OC43NjIwMDEwMzc1OTc2NTYgMjQuNzA3MDAwNzMyNDIxODc1IEwgNDguNjc5MDAwODU0NDkyMTkgMS4xNjYwMDAwMDg1ODMwNjg4IFoiIHN0eWxlPSJzdHJva2U6IHJnYigwLCAwLCAwKTsgZmlsbDogIzAyODc1MjsiLz4KPC9zdmc+";
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
        ['match', ['id'], e.features[0].id, 0.8, 0.7],
      );
      map.setLayoutProperty(
        'items', 
        'text-size', 
        ['match', ['id'], e.features[0].id, 13, 12],
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
       
      new mapboxgl.Popup({ anchor: 'left', closeButton: false })
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
          [
            'step',
            ['get', 'point_count'],
            10,
            0, 13,
            5, 15,
            25, 17,
            125, 19,
          ],
          [
            'step',
            ['get', 'point_count'],
            10,
            0, 12,
            5, 14,
            25, 16,
            125, 18,
          ]
        ],
      );
      map.setLayoutProperty('cluster-count', 'text-size', ['match', ['id'], clusterId, 16, 14]);  
    });
    map.on('mouseleave', 'clusters', (e) => {
      map.getCanvas().style.cursor = '';
      map.setPaintProperty(
        'clusters', 
        'circle-radius', 
        [
          'step',
          ['get', 'point_count'],
          10,
          0, 12,
          5, 14,
          25, 16,
          125, 18,
        ]
      );
      map.setLayoutProperty('cluster-count', 'text-size', 14);
    });
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
    if(!map.loaded()) {
      return [];
    }
    var features = map.queryRenderedFeatures({ layers: ['items-unvisible'] });
    var ids = features.map(o => o.id);
    var filteredDuplicates = features.filter(({id}, index) => !ids.includes(id, index + 1));
    var filteredIds = filteredDuplicates.map((obj) => obj.id);
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
      newObjectsListFiltered = newList.filter((mapObject) => mapObject.lat && mapObject.long);
      map.getSource('objects').setData(coordsToFeatureCollection(newObjectsListFiltered));
      map.getSource('objects-without-clusters').setData(coordsToFeatureCollection(newObjectsListFiltered));
      renderedObjectsChangedCallback(visibleMarkersIds);
      centerMap(newObjectsListFiltered);
    }

    if(!map.loaded()) {
      map.on('load', () => {
        setSourceData();
      });
    } else {
      setSourceData();
    }
  };

  return {
    changeObjectsList,
  };
};
