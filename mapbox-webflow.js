var initMap = (objectsToShow = [], renderedObjectsChangedCallback) => {
  var abbreviateNumber = (value) => {
    var newValue = value;
    if (value >= 1000) {
        var suffixes = ["", "K", "M", "B","T"];
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
          "price": abbreviateNumber(mapObject.price),
        }
      });
      console.log(abbreviateNumber(mapObject.price));
    }
    return { type: 'FeatureCollection', features: featureCollection };
  }


  mapboxgl.accessToken = "pk.eyJ1IjoiaW5mbDFnaHQiLCJhIjoiY2tybHd3aG54MWdnMTJxcHY0ZXJ3bzBkZyJ9.8eEZH-KSJ9FVynPwjpet_g";
  var map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v11",
    center: [34.825624, 32.029848],
    zoom: 11,
  });

  var onMapLoaded = () => {
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
    
    let img = new Image(120, 72);
    img.onload = () => map.addImage('marker-with-price', img);
    img.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2aWV3Qm94PSIwIDAgNTAgMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTSAxLjUxMzAwMDAxMTQ0NDA5MTggMSBMIDEuMzQ3MDAwMDAyODYxMDIzIDI0Ljg3NDAwMDU0OTMxNjQwNiBMIDIyLjEzMjk5OTQyMDE2NjAxNiAyNC44NzQwMDA1NDkzMTY0MDYgTCAyNS4xMzgwMDA0ODgyODEyNSAyOS4yMTUwMDAxNTI1ODc4OSBMIDI2Ljk3NDAwMDkzMDc4NjEzMyAyNC42MjQwMDA1NDkzMTY0MDYgTCA0OC43NjIwMDEwMzc1OTc2NTYgMjQuNzA3MDAwNzMyNDIxODc1IEwgNDguNjc5MDAwODU0NDkyMTkgMS4xNjYwMDAwMDg1ODMwNjg4IFoiIHN0eWxlPSJzdHJva2U6IHJnYigwLCAwLCAwKTsgZmlsbDogcmdiKDY4LCAxMDYsIDc2KTsiLz4KPC9zdmc+";
    map.addLayer({
      id: 'items',
      type: 'symbol',
      filter: ['!', ['has', 'point_count']],
      source: 'objects',
      layout: {
        'icon-image': 'marker-with-price',
        'icon-size': 0.3,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'text-field': ['get', 'price'],
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
  };
  map.on('load', onMapLoaded);

  function intersectRect(r1, r2) {
    return !(
      r2.left > r1.right ||
      r2.right < r1.left ||
      r2.top > r1.bottom ||
      r2.bottom < r1.top
    );
  };

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
      map.getSource('objects').setData(coordsToFeatureCollection(newList));
      map.getSource('objects-without-clusters').setData(coordsToFeatureCollection(newList));
      renderedObjectsChangedCallback(visibleMarkersIds);
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
