Leaflet.utfgrid
===============

A UTFGrid interaction implementation for leaflet that is super small.

Example: http://danzel.github.com/Leaflet.utfgrid/example/map.html

## Using the plugin
See the included example for the plugin in action.

### Usage

Create a new L.UtfGrid, optionally specifying the resolution
```javascript
var utfGrid = new L.UtfGrid('http://{s}.tiles.mapbox.com/v3/mapbox.geography-class/{z}/{x}/{y}.grid.json?callback={cb}', {
	resolution: 4
});
```
```?callback={cb}``` is required when using utfgrids in JSONP mode.

Add event listeners to it
```javascript
utfGrid.on('click', function (e) {
	if (e.data) {
		alert('click: ' + e.data.admin);
	} else {
		alert('click: nothing');
	}
}); 
utfGrid.on('mouseover', function (e) {
	if (e.data) {
		console.log('hover: ' + e.data.admin);
	} else {
		console.log('hover: nothing');
	}
});
utfGrid.on('mouseout', function (e) {
	console.log('mouseout: ' + e.data);
});
```

The callback object in all cases is:
```javascript
{
	latlng: L.LatLng
	data: Data object for the grid (whatever you are returning in the grid json)
}
```

We use JSONP by default which requires the query string part of the url to contain ```callback={cb}```.
To use an ajax query instead you need to include jquery (TODO: Remove this reliance!) and set useJsonP:false in the L.UtfGrid options.
Your grid json provider must return raw json to support this functionality.

```javascript
var utfGrid = new L.UtfGrid('http://myserver/amazingness/{z}/{x}/{y}.grid.json', {
	resolution: 4,
	useJsonP: false
});
```

### Turning interaction on and off

You can add and remove the UtfGrid layer from your map as per normal, even within a layers control.

Example: http://danzel.github.com/Leaflet.utfgrid/example/layers.html

## Other examples of UTFGrid

Spec: https://github.com/mapbox/utfgrid-spec

OpenLayers:
*   http://openlayers.org/dev/examples/utfgrid_twogrids.html
*   https://github.com/perrygeo/openlayers/blob/utfgrid/lib/OpenLayers/Tile/UTFGrid.js

Wax:
*   http://mapbox.com/wax/interaction-leaf-native.html (Doesn't work correctly in webkit)
*   https://github.com/mapbox/wax