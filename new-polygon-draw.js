import MapboxDraw from "@mapbox/mapbox-gl-draw";
import * as Constants from '@mapbox/mapbox-gl-draw/src/constants';
import isEventAtCoordinates from '@mapbox/mapbox-gl-draw/src/lib/is_event_at_coordinates';
  //New behaviour
const NewPolygonDraw = MapboxDraw.modes.draw_polygon;

NewPolygonDraw.clickAnywhere = function (state, e) {
  console.log(state);

  if (state.currentVertexPosition > 0 && isEventAtCoordinates(e, state.polygon.coordinates[0][state.currentVertexPosition - 1])) {
    return this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.polygon.id] });
  }
  this.updateUIClasses({ mouse: Constants.cursors.ADD });
  state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat);
  state.currentVertexPosition++;
  state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat);
  if(state.currentVertexPosition >= 4) {
    return this.changeMode(Constants.modes.SIMPLE_SELECT);
  }
}

export default NewPolygonDraw;