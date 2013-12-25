L.Util.ajax = function (url, cb) {
	// the following is from JavaScript: The Definitive Guide
	// and https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Using_XMLHttpRequest_in_IE6
	if (window.XMLHttpRequest === undefined) {
		window.XMLHttpRequest = function () {
			/*global ActiveXObject:true */
			try {
				return new ActiveXObject("Microsoft.XMLHTTP");
			}
			catch  (e) {
				throw new Error("XMLHttpRequest is not supported");
			}
		};
	}
	var response, request = new XMLHttpRequest();
	request.open("GET", url);
	request.onreadystatechange = function () {
		/*jshint evil: true */
		if (request.readyState === 4 && request.status === 200) {
			if (window.JSON) {
				response = JSON.parse(request.responseText);
			} else {
				response = eval("(" + request.responseText + ")");
			}
			cb(response);
		}
	};
	request.send();
};
L.UtfGrid = L.Class.extend({
	// FIXME : L.GridLayer is not a complete asbtrasction of a
	// tiling system and still assumes image tiles in some ways
	// Tiling behavior should be abstracted out.
	includes: L.Mixin.Events,
	options: {
		subdomains: 'abc',

		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,

		resolution: 4,

		pointerCursor: true,
	},

	// The thing the mouse is currently on
	_mouseOn: null,
	// Tile data cache
	_tiles: {},

	initialize: function (url, options) {
		options = L.setOptions(this, options);

		this._url = url;

		if (options.pointerCursor) this.on({
			mouseover: this._pointerOn,
			add: this._pointerOn,
			mouseout: this._pointerOff,
			remove: this._pointerOff,
		}, this);

		// FIXME : subdomains handling here is not DRY
		// FIXME : too opinionated, not compatible with
		// TileJSON's multiple source urls for example
		if (typeof options.subdomains === 'string')
			options.subdomains = options.subdomains.split('');
	},

	onAdd: function (map) {
		this._map = map;
		this._map.on(this.getEvents(), this);

		this._update();

		this.fire('add');
	},

	onRemove: function () {
		this.fire('remove');

		this._map.off(this.getEvents(), this);
		this._map = null;
	},

	getEvents: function() {
		return {
			click: this._click,
			mousemove: this._move,
			mouseout: this._out,
			moveend: this._update,
		};
	},

	_getTilePane: function () {
		if (this._map) return this._map.getPanes().tilePane;
	},

	// Pointer cursor handlers
	_pointerOn: function(e){
		L.DomUtil.addClass( this._getTilePane(), 'leaflet-clickable');
	},

	_pointerOff: function(e){
		L.DomUtil.removeClass( this._getTilePane(), 'leaflet-clickable');
	},

	// MouseEvents handlers
	_click: function (e) {
		var data = this._getData(e.latlng);
		this.fire('click', {latlng: e.latlng, data: data});
	},
	_move: function (e) {
		var data = this._getData(e.latlng);

		if (data !== this._mouseOn) {
			if (this._mouseOn) this._out(e);
			if (data) this.fire('mouseover', {latlng: e.latlng, data: data});
			this._mouseOn = data;
		} else {
			this.fire('mousemove', {latlng: e.latlng, data: data});
		}
	},
	_out: function (e) {
		this.fire('mouseout', null);
		this._mouseOn = null;
	},

	_getData: function (latlng) {
		var map = this._map,
			point = map.project(latlng.wrap()),
			tileSize = this.options.tileSize,
			resolution = this.options.resolution,
			x = Math.floor(point.x / tileSize),
			y = Math.floor(point.y / tileSize),
			max = map.options.crs.scale(map.getZoom()) / tileSize;

		x = (x + max) % max;
		y = (y + max) % max;

		var gridX = Math.floor((point.x - (x * tileSize)) / resolution),
			gridY = Math.floor((point.y - (y * tileSize)) / resolution);

		var key = this._getTileKey({z:map.getZoom(), x:x, y:y}),
			data = this._tiles[key];

		if (typeof data === "function")
			return L.bind(data, this)(gridX, gridY);
	},

	//Load up all required json grid files
	//TODO: Load from center etc
	_update: function () {

		var bounds = this._map.getPixelBounds(),
			zoom = this._map.getZoom(),
			tileSize = this.options.tileSize,
			max = this._map.options.crs.scale(zoom) / tileSize;

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) return;

		bounds = L.bounds(
					bounds.min.divideBy(tileSize).floor(),
					bounds.max.divideBy(tileSize).floor());

		for (var x = bounds.min.x; x <= bounds.max.x; x++) {
			for (var y = bounds.min.y; y <= bounds.max.y; y++) {
				var coords = {
						x: (x + max) % max,
						y: (y + max) % max,
						z: zoom
					},
					key = this._getTileKey(coords);

				if (!this._tiles.hasOwnProperty(key)) {
					this._tiles[key] = null;
					this._loadTile(coords, this._cacheData(key));
				}
			}
		}
	},

	_cacheData: function(key) {
		return L.bind(function (data) {
			this._tiles[key] = this._gridData(data);
		}, this);
	},

	_getTileKey: function (coords) {
		// valid property name
		// NOTE : leaflet choses not to use z
		return L.Util.template("tile_{z}_{x}_{y}", coords);
	},

	_getTileUrl: function(options) {
		options = L.extend({
			s: L.TileLayer.prototype._getSubdomain.call(this, options),
			}, options);
		options = L.extend(options, this.options);
		options = L.extend(options, {
		});
		return L.Util.template(this._url, options);
	},

	// actually fetch the tile
	_loadTile: function(coords, callback) {
		L.Util.ajax(this._getTileUrl(coords), cb);
	},

	// UTFGrid data handling
	_gridData: function (data) {
		return function (x,y){
			if (!data || !data.grid) return;
			var idx = this._utfDecode(data.grid[y].charCodeAt(x)),
				key = data.keys[idx];
			return data.data[key];
		};
	},

	_utfDecode: function (c) {
		if (c >= 93) c--;
		if (c >= 35) c--;
		return c - 32;
	}
});

L.utfGrid = function (url, options) {
	return new L.UtfGrid(url, options);
};

/* UtfGrid with JSONP */
L.UtfGridP = L.UtfGrid.extend({
	statics: {
		_cb:{},
	},

	initialize: function (url, options) {
		options = L.setOptions(this, options);
		L.UtfGrid.prototype.initialize.call(this, url, options);

		this.gridName = options.gridName ? options.gridName : "grid_"+L.stamp(this);
		L.UtfGridP._cb[this.gridName] = this._callbacks = {};
	},

	_loadTile: function (coords, callback) {
		var key = this._getTileKey(coords),
			cb = L.Util.template("L.UtfGridP._cb.{gridName}.{tileKey}",
				{gridName: this.gridName,tileKey: key}),
			options = L.Util.extend({cb: cb}, coords),
			url = this._getTileUrl(options);

		var head = document.getElementsByTagName('head')[0],
			script = document.createElement('script');

		script.setAttribute("type", "text/javascript");
		script.setAttribute("src", url);

		this._callbacks[key] = L.bind(function (data) {
			callback(data);
			delete this._callbacks[key];
			head.removeChild(script);
		}, this);

		head.appendChild(script);
	},
});

L.utfGridP = function (url, options) {
	return new L.UtfGridP(url, options);
};
