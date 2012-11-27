//minified version of https://github.com/douglascrockford/JSON-js/blob/master/json_parse.js, we could also just use eval
L.Util.json_parse=function(){var h,a,k={'"':'"',"\\":"\\","/":"/",b:"\b",f:"\f",n:"\n",r:"\r",t:"\t"},j,e=function(a){throw{name:"SyntaxError",message:a,at:h,text:j};},c=function(b){b&&b!==a&&e("Expected '"+b+"' instead of '"+a+"'");a=j.charAt(h);h+=1;return a},l=function(){var b;b="";"-"===a&&(b="-",c("-"));for(;"0"<=a&&"9">=a;)b+=a,c();if("."===a)for(b+=".";c()&&"0"<=a&&"9">=a;)b+=a;if("e"===a||"E"===a){b+=a;c();if("-"===a||"+"===a)b+=a,c();for(;"0"<=a&&"9">=a;)b+=a,c()}b=+b;if(isFinite(b))return b;
e("Bad number")},m=function(){var b,g,f="",d;if('"'===a)for(;c();){if('"'===a)return c(),f;if("\\"===a)if(c(),"u"===a){for(g=d=0;4>g;g+=1){b=parseInt(c(),16);if(!isFinite(b))break;d=16*d+b}f+=String.fromCharCode(d)}else if("string"===typeof k[a])f+=k[a];else break;else f+=a}e("Bad string")},d=function(){for(;a&&" ">=a;)c()},n=function(){switch(a){case "t":return c("t"),c("r"),c("u"),c("e"),!0;case "f":return c("f"),c("a"),c("l"),c("s"),c("e"),!1;case "n":return c("n"),c("u"),c("l"),c("l"),null}e("Unexpected '"+
a+"'")},i;i=function(){d();switch(a){case "{":var b;a:{var g={};if("{"===a){c("{");d();if("}"===a){c("}");b=g;break a}for(;a;){b=m();d();c(":");Object.hasOwnProperty.call(g,b)&&e('Duplicate key "'+b+'"');g[b]=i();d();if("}"===a){c("}");b=g;break a}c(",");d()}}e("Bad object");b=void 0}return b;case "[":a:{b=[];if("["===a){c("[");d();if("]"===a){c("]");break a}for(;a;){b.push(i());d();if("]"===a){c("]");break a}c(",");d()}}e("Bad array");b=void 0}return b;case '"':return m();case "-":return l();default:return"0"<=
a&&"9">=a?l():n()}};return function(b,c){var f;j=b;h=0;a=" ";f=i();d();a&&e("Syntax error");return"function"===typeof c?function p(a,b){var d,f,e=a[b];if(e&&"object"===typeof e)for(d in e)Object.prototype.hasOwnProperty.call(e,d)&&(f=p(e,d),void 0!==f?e[d]=f:delete e[d]);return c.call(a,b,e)}({"":f},""):f}}();
L.Util.ajax = function (url, cb){
	// the following is from JavaScript: The Definitive Guide
	if (window.XMLHttpRequest === undefined){
		window.XMLHttpRequest = function(){
			try{
				return new ActiveXObject("Microsoft.XMLHTTP.6.0");
			}
			catch  (e1) {
				try{
					return new ActiveXObject("Microsoft.XMLHTTP.3.0");
				}
				catch (e2) {
					thrw new Error("XMLHttpRequest is not supported");
				}
			}
		};
	}
    var response, request = new XMLHttpRequest();
    request.open("GET", url);
    request.onreadystatechange = function(){
        if (request.readyState === 4 && request.status === 200 ){
        	var JSON = JSON || false;
        	if(JSON){
                response = JSON.parse(request.responseText);
        	}else{
        		response = L.Util.json_parse(request.responseText);
        	}
            cb(response);
        }
    };
    request.send();    
};
L.UtfGrid = L.Class.extend({
	includes: L.Mixin.Events,
	options: {
		subdomains: 'abc',

		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,

		resolution: 2,

		useJsonP: true
	},

	//The thing the mouse is currently on
	_mouseOn: null,

	initialize: function (url, options) {
		L.Util.setOptions(this, options);

		this._url = url;
		this._cache = {};
	},

	onAdd: function (map) {
		this._map = map;

		this._update();

		var zoom = this._map.getZoom();

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		map.on('click', this._click, this);
		map.on('mousemove', this._move, this);
		map.on('moveend', this._update, this);
		//TODO: Touch may need special support?
	},

	onRemove: function () {
		map.off('click', this._click, this);
		map.off('mousemove', this._move, this);
		map.off('moveend', this._update, this);
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

	_objectForEvent: function (e) {
		var map = this._map,
		    point = map.project(e.latlng),
		    tileSize = this.options.tileSize,
		    resolution = this.options.resolution,
		    x = Math.floor(point.x / tileSize),
		    y = Math.floor(point.y / tileSize),
		    gridX = Math.floor((point.x - (x * tileSize)) / resolution),
		    gridY = Math.floor((point.y - (y * tileSize)) / resolution),
			max = map.options.crs.scale(map.getZoom()) / tileSize;

		x = (x + max) % max;
		y = (y + max) % max;

		var data = this._cache[map.getZoom() + '_' + x + '_' + y];
		if (!data) {
			//console.log('not cached ' + map.getZoom() + '_' + x + '_' + y);
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
				max = this._map.options.crs.scale(zoom) / tileSize;

		//Load all required ones
		for (var x = nwTilePoint.x; x <= seTilePoint.x; x++) {
			for (var y = nwTilePoint.y; y <= seTilePoint.y; y++) {

				var xw = (x + max) % max, yw = (y + max) % max;
				var key = zoom + '_' + xw + '_' + yw;

				if (!this._cache.hasOwnProperty(key)) {
					this._cache[key] = null;

					if (this.options.useJsonP) {
						this._loadTileP(zoom, xw, yw);
					} else {
						this._loadTile(zoom, xw, yw);
					}
				}
			}
		}
	},

	_loadTileP: function (zoom, x, y) {
		var head = document.getElementsByTagName('head')[0];
		var key = zoom + '_' + x + '_' + y;
		var functionName = 'lu_' + key;

		var url = L.Util.template(this._url, L.Util.extend({
			s: L.TileLayer.prototype._getSubdomain.call(this, { x: x, y: y }),
			z: zoom,
			x: x,
			y: y
		}, this.options));

		var script = document.createElement('script');
		script.setAttribute("type", "text/javascript");
		script.setAttribute("src", url + "?callback=" + functionName);

		var self = this;
		window[functionName] = function (data) {
			self._cache[key] = data;
			delete window[functionName];
			head.removeChild(script);
		};

		head.appendChild(script);
	},

	_loadTile: function (zoom, x, y) {
		var url = L.Util.template(this._url, L.extend({
			s: L.TileLayer.prototype._getSubdomain.call(this, { x: x, y: y }),
			z: zoom,
			x: x,
			y: y
		}, this.options));

		var key = zoom + '_' + x + '_' + y;
        var self = this; //is this neccesary?
		L.Util.ajax(url, function (data) {
            self._cache[key] = data;
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