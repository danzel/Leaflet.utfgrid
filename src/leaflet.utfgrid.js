



L.UtfGrid = L.Class.extend({
	includes: L.Mixin.Events,
	options: {
		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,

		resolution: 2,
		preload: true,

		useJsonP: true
	},

	//The thing the mouse is currently on
	_mouseOn: null,

	initialize: function (url, options) {
		options = L.setOptions(this, options);

		this._url = url;

		this._cache = {};

		if (options.clickCallback) {
			//TODO
		}
	},

	onAdd: function (map) {
		this._map = map;

		this._update();

		//TODO: on moveend update
		var zoom = this._map.getZoom();

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		map.on('click', this._click, this);
		map.on('mousemove', this._move, this);
		//TODO: Touch needs special support?
	},

	_click: function (e) {
		this.fire('click', this._objectForEvent(e));
	},
	_move: function (e) {
		var on = this._objectForEvent(e);

		if (on.data != this._mouseOn) {
			if (this._mouseOn) {
				this.fire('mouseout', { latlng: e.latlng, data: this._mouseOn });
			}
			this.fire('mouseover', on);

			this._mouseOn = on.data;
		}
	},

	_objectForEvent: function(e) {
		var x = Math.floor(e.layerPoint.x / this.options.tileSize), //FIXME: This can be -1 sometimes (or > than the size of the thing)
		    y = Math.round(e.layerPoint.y / this.options.tileSize),
		    gridX = Math.floor((e.layerPoint.x - (x * this.options.tileSize)) / this.options.resolution),
		    gridY = Math.floor((e.layerPoint.y - (y * this.options.tileSize) + (this.options.tileSize / 2)) / this.options.resolution);

		var data = this._cache[map.getZoom() + '_' + x + '_' + y];
		if (!data) {
			console.log('not cached ' + map.getZoom() + '_' + x + '_' + y);
			return { latlng: e.latlng, data: null };
		}

		var idx = this._utfDecode(data.grid[gridY][gridX]),
		    key = data.keys[idx],
		    result = data.data[key];

		if (!data.data.hasOwnProperty(key))
			result = null;

		return { latlng: e.latlng, data: result};
	},

	//Load up all required json grid files
	//TODO: Load from center etc
	_update: function () {

		//TODO: on moveend update
		var bounds = this._map.getPixelBounds(),
		    zoom = this._map.getZoom(),
		    tileSize = this.options.tileSize;

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		var nwTilePoint = new L.Point(
				Math.floor(bounds.min.x / tileSize),
				Math.floor(bounds.min.y / tileSize)),
			seTilePoint = new L.Point(
				Math.floor(bounds.max.x / tileSize),
				Math.floor(bounds.max.y / tileSize));

		//Load all required ones
		for (var x = nwTilePoint.x; x < seTilePoint.x; x++) {
			for (var y = nwTilePoint.y; y <= seTilePoint.y; y++) {
				if (this.options.useJsonP) {
					this._loadTileP(zoom, x, y);
				} else {
					this._loadTile(zoom, x, y);
				}
			}
		}
	},

	_loadTileP: function (zoom, x, y) {
		var head = document.getElementsByTagName('head')[0];
		var key = zoom + '_' + x + '_' + y;
		var functionName = 'lu_' + key;

		var url = L.Util.template(this._url, L.extend({
			//s: this._getSubdomain(tilePoint),
			z: zoom,
			x: x,
			y: y
		}, this.options));

		var script = document.createElement('script');
		script.setAttribute("type", "text/javascript");
		script.setAttribute("src", url + "?callback=" + functionName);

		var self = this;
		window[functionName] = function (data) {
			console.log('loaded ' + key);
			self._cache[key] = data;
			delete window[functionName];
			head.removeChild(script);
		};

		head.appendChild(script);
		//TODO: Create script tag
	},

	_loadTile: function (zoom, x, y) {
		var url = L.Util.template(this._url, L.extend({
			//s: this._getSubdomain(tilePoint),
			z: zoom,
			x: x,
			y: y
		}, this.options));

		var key = zoom + '_' + x + '_' + y;

		//FIXME: JQUERYING IN THE HJIZZLE
		//FIXME: NEED JSONP SUPPORT TOO
		$.ajax({
			url: url,
			context: this,
			type: 'GET'
		})
		.done(function (data) {
			console.log("loaded " + url);
			this._cache[key] = data;
		})
		.fail(function () {
			console.log("Failed to load " + url);
		});
	},
	_utfDecode: function (c) {
		c = c.charCodeAt(0);
		if (c >= 93)
			c--;
		if (c >= 35)
			c--;
		return c - 32;
	}
});