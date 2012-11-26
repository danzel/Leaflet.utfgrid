



L.UtfGrid = L.Class.extend({
	includes: L.Mixin.Events,
	options: {
		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,

		resolution: 2,
		preload: true,

	},

	initialize: function (url, options) {
		options = L.setOptions(this, options);

		this._url = url;

		this._update
	},

	onAdd: function (map) {
		this._map = map;

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
				Math.floor(bounds.max.y / tileSize)),

			tileBounds = new L.Bounds(nwTilePoint, seTilePoint);

		map.on('click', function (e) {
			//	e.latlng, e.layerPoint, e.containerPoint

			var x = Math.floor(e.layerPoint.x / this.options.tileSize), //FIXME: This can be -1 sometimes
				y = Math.round(e.layerPoint.y / this.options.tileSize),
				gridX = Math.floor((e.layerPoint.x - (x * this.options.tileSize)) / this.options.resolution),
				gridY = Math.floor((e.layerPoint.y - (y * this.options.tileSize) + (this.options.tileSize / 2)) / this.options.resolution);
			//console.log(tileBounds);
			console.log(e.layerPoint);
			console.log(x + ", " + y);
			console.log("-> " + gridX + ", " + gridY);

			var url = L.Util.template(this._url, L.extend({
				//s: this._getSubdomain(tilePoint),
				z: this._map.getZoom(),
				x: x,
				y: y
			}, this.options));
			console.log(url);

			//FIXME: JQUERYING IN THE HJIZZLE
			//FIXME: NEED JSONP SUPPORT TOO
			$.ajax({
				url: url,
				context: this,
				type: 'GET'
			})
			.done(function (data) {
				var idx = this._utfDecode(data.grid[gridY][gridX]);
				var key = data.keys[idx];
				var result = data.data[key];

				console.log(result);
				//TODO: callback with the result
				//debugger;
			})
			.fail(function(data) {
				debugger;
			});

			//debugger;
			//debugger;
		}, this);
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