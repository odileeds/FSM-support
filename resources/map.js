(function(root){

	if(!root.ODI) root.ODI = {};

	if(!root.ODI.ready){
		root.ODI.ready = function(f){
			if(/in/.test(document.readyState)) setTimeout('ODI.ready('+f+')',9);
			else f();
		};
	}

	root.ODI.ajax = function(url,attrs){
		//=========================================================
		// ajax(url,{'complete':function,'error':function,'dataType':'json'})
		// complete: function - a function executed on completion
		// error: function - a function executed on an error
		// cache: break the cache
		// dataType: json - will convert the text to JSON
		//			  jsonp - will add a callback function and convert the results to JSON

		if(typeof url!=="string") return false;
		if(!attrs) attrs = {};
		var cb = "",qs = "";
		var oReq,urlbits;
		// If part of the URL is query string we split that first
		if(url.indexOf("?") > 0){
			urlbits = url.split("?");
			if(urlbits.length){
				url = urlbits[0];
				qs = urlbits[1];
			}
		}
		if(attrs.dataType=="jsonp"){
			cb = 'fn_'+(new Date()).getTime();
			window[cb] = function(rsp){
				if(typeof attrs.success==="function") attrs.success.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
			};
		}
		if(typeof attrs.cache==="boolean" && !attrs.cache) qs += (qs ? '&':'')+(new Date()).valueOf();
		if(cb) qs += (qs ? '&':'')+'callback='+cb;
		if(attrs.data) qs += (qs ? '&':'')+attrs.data;

		// Build the URL to query
		if(attrs.method=="POST") attrs.url = url;
		else attrs.url = url+(qs ? '?'+qs:'');

		if(attrs.dataType=="jsonp"){
			var script = document.createElement('script');
			script.src = attrs.url;
			document.body.appendChild(script);
			return this;
		}

		// code for IE7+/Firefox/Chrome/Opera/Safari or for IE6/IE5
		oReq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
		oReq.addEventListener("load", window[cb] || complete);
		oReq.addEventListener("error", error);
		oReq.addEventListener("progress", progress);
		var responseTypeAware = 'responseType' in oReq;
		if(attrs.beforeSend) oReq = attrs.beforeSend.call((attrs['this'] ? attrs['this'] : this), oReq, attrs);
		if(attrs.dataType=="script") oReq.overrideMimeType('text/javascript');

		function complete(evt) {
			attrs.header = oReq.getAllResponseHeaders();
			var rsp;
			if(oReq.status == 200 || oReq.status == 201 || oReq.status == 202) {
				rsp = oReq.response;
				if(oReq.responseType=="" || oReq.responseType=="text") rsp = oReq.responseText;
				if(attrs.dataType=="json"){
					try {
						if(typeof rsp==="string") rsp = JSON.parse(rsp.replace(/[\n\r]/g,"\\n").replace(/^([^\(]+)\((.*)\)([^\)]*)$/,function(e,a,b,c){ return (a==cb) ? b:''; }).replace(/\\n/g,"\n"));
					} catch(e){ error(e); }
				}

				// Parse out content in the appropriate callback
				if(attrs.dataType=="script"){
					var fileref=document.createElement('script');
					fileref.setAttribute("type","text/javascript");
					fileref.innerHTML = rsp;
					document.head.appendChild(fileref);
				}
				attrs.statusText = 'success';
				if(typeof attrs.success==="function") attrs.success.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
			}else{
				attrs.statusText = 'error';
				error(evt);
			}
			if(typeof attrs.complete==="function") attrs.complete.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
		}

		function error(evt){
			if(typeof attrs.error==="function") attrs.error.call((attrs['this'] ? attrs['this'] : this),evt,attrs);
		}

		function progress(evt){
			if(typeof attrs.progress==="function") attrs.progress.call((attrs['this'] ? attrs['this'] : this),evt,attrs);
		}

		if(responseTypeAware && attrs.dataType){
			try { oReq.responseType = attrs.dataType; }
			catch(err){ error(err); }
		}

		try{ oReq.open((attrs.method||'GET'), attrs.url, true); }
		catch(err){ error(err); }

		if(attrs.method=="POST") oReq.setRequestHeader('Content-type','application/x-www-form-urlencoded');

		try{ oReq.send((attrs.method=="POST" ? qs : null)); }
		catch(err){ error(err); }

		return this;
	};

	ODI.FSM = function(a,opts){
		this.sheetid = "";
		if(!opts) opts = {};
		this.opts = opts;
		this.el = a;
		this.href = a.getAttribute('href');
		this.postcodes = {'loading':{},'loaded':{},'lookup':{}};
		var _obj = this;
		
		this.init = function(){
			var href = this.href.replace(/spreadsheets\/d\/([^\/]+)\//,function(m,p1){ _obj.sheetid = p1; return p1; });
			this.makeMap();
			this.get();
			return this;
		}

		this.get = function(){
			var url = 'https://docs.google.com/spreadsheets/d/'+this.sheetid+'/gviz/tq?tqx=out:csv&sheet=details';
			if(location.href.indexOf('file')==0) url = "data.csv";
			console.info('Getting '+url);
			ODI.ajax(url,{
				"this":this,
				"success":function(d){
					this.update(CSVToArray(d));
				},
				"error":function(e){
					console.error('Unable to load sheet',e);
				}
			});
			setTimeout(function(){ _obj.get(); },300000);
			return this;
		}
		
		this.getPostcode = function(pcd,callback){
			var ocd,parea,district,sector;
			pcd.replace(/^([^\s]+) ([0-9A-Z])/,function(m,p1,p2){ ocd = p1; sector = p2; return ""; });
			ocd.replace(/^([A-Z]{1,2})([0-9]+|[0-9][A-Z])$/,function(m,p1,p2){ parea = p1; district = p2; return ""; });
			var path = parea+'/'+district+'/'+sector;
			console.log('getPostcode',pcd,path,this.postcodes.loading[path]);
			if(!this.postcodes.loading[path]){
				this.postcodes.loading[path] = true;
				ODI.ajax('postcodes/'+path+'.csv',{
					'dataType':'text/csv',
					'this': this,
					'path': path,
					'callback': callback,
					'pcd': pcd,
					'success':function(data,attr){
						var r,c;
						data = CSVToArray(data);
						for(r = 0; r < data.length; r++){
							if(data[r][0]) this.postcodes.lookup[data[r][0]] = [parseFloat(data[r][2]),parseFloat(data[r][1])];
						}
						this.postcodes.loaded[attr.path] = true;
						if(typeof attr.callback==="function") attr.callback.call(this,attr.pcd,this.postcodes.lookup[attr.pcd]);
					},
					'error': function(e,attr){
						console.error('Unable to load '+attr.url);
					}
				})
				
			}
			return this;
		}
		
		this.update = function(d){
			this.data = [];
			this.header = {};
			// Name	Town	City/Region	Postcode	Specific schools?	How to claim	Link to post	More details
			for(var c = 0; c < d[0].length; c++){
				// Clean first column
				if(c==0) d[0][c] = d[0][c].replace(/^.*\. ([^\.]*)$/g,function(m,p1){ return p1; });
				this.header[d[0][c]] = c;
			}
			var toload = 0;
			var loaded = 0;
			var pcd;
			for(var i = 1; i < d.length; i++){
				o = {};
				for(c = 0; c < d[i].length; c++){
					o[d[0][c]] = d[i][c];
				}
				pcd = d[i][this.header['Postcode']];
				if(pcd && !this.postcodes.lookup[pcd]) toload++;
				this.data.push(o);
			}
			console.info('data',this.data);
			list = '';
			for(var i = 1; i < this.data.length; i++){
				list += '<li>';
				list += '<div class="padded b5-bg">';
				list += '<h3><a href="'+this.data[i]['Link to post']+'">'+this.data[i]['Name']+'</a></h3>';
				list += '<p>Location: '+this.data[i]['Town']+', '+this.data[i]['City/Region']+(this.data[i]['Postcode'] ? ', '+this.data[i]['Postcode'] : '')+'</p>';
				list += '<p>How to claim: '+this.data[i]['How to claim']+'</p>';
				list += '<p>More details: '+this.data[i]['More details']+'</p>';
				list += '</div>';
				list += '</li>'
			}
			console.log('toload',toload,loaded);
			if(toload > loaded){
				for(var i = 1; i < this.data.length; i++){
					if(this.data[i]['Postcode'] && !this.postcodes.lookup[this.data[i]['Postcode']]){
						this.getPostcode(this.data[i]['Postcode'],function(pcd,pos){
							loaded++;
							if(toload==loaded) this.addToMap();
						});
					}
				}
			}else{
				this.addToMap();
			}
			
			var ul = document.getElementById('output');
			ul.innerHTML = list;
			return this;
		}
		
		this.addToMap = function(){
			var geojson = {"type": "FeatureCollection","features":[]};

			function onEachFeature(feature, layer) {
				popup = buildDefaultPopup(feature,"",true);
				if(popup) layer.bindPopup(popup);
			}

			var geoattrs = {
				'style': { "color": "#2254F4", "weight": 2, "opacity": 0.65 },
				'pointToLayer': function(geoJsonPoint, latlng) { return L.marker(latlng,{icon: makeMarker('#D60303')}); },
				'onEachFeature': onEachFeature
			};
			
			for(var i = 0; i < this.data.length; i++){
				pcd = this.data[i]['Postcode'];
				if(pcd){
					if(this.postcodes.lookup[pcd]){
						geojson.features.push({'type':'Feature','properties':this.data[i],'geometry':{'type':'Point','coordinates':this.postcodes.lookup[pcd]}});
					}else{
						console.error('Failed to lookup '+pcd);
					}
				}
			}
			if(this.features) this.features.remove(); 
			this.features = L.geoJSON(geojson,geoattrs);
			this.features.addTo(this.map);
			return this;
		}
		
		this.makeMap = function(){
			this.baseMaps = {};
			this.baseMaps['CartoDB Voyager'] = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
				attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
				subdomains: 'abcd',
				maxZoom: 19
			});

			// Make the Leaflet map
			var mapel = this.opts.map || document.getElementById('location');
			var id = mapel.getAttribute('id');
			this.selectedBaseMap = "CartoDB Voyager";
			this.map = L.map(id,{'layers':[this.baseMaps[this.selectedBaseMap]],'center': [53.4629,-2.2916],'zoom':6,'scrollWheelZoom':true});
			
			// Update attribution
			this.map.attributionControl.setPrefix('Data: <a href="'+this.href+'">Anjali / Marcus Rashford').setPosition('bottomleft');

			var icon = L.Icon.extend({
				options: {
					shadowUrl: '/resources/images/marker-shadow.png',
					iconSize:     [25, 41], // size of the icon
					shadowSize:   [41, 41], // size of the shadow
					iconAnchor:   [12.5, 41], // point of the icon which will correspond to marker's location
					shadowAnchor: [12.5, 41],  // the same for the shadow
					popupAnchor:  [0, -41] // point from which the popup should open relative to the iconAnchor
				}
			});

			var icons = {
				'black': new icon({iconUrl: '/resources/images/marker.svg'}),
				'c-1': new icon({iconUrl: '/resources/images/marker-1.svg'}),
				'c-2': new icon({iconUrl: '/resources/images/marker-2.svg'}),
				'c-3': new icon({iconUrl: '/resources/images/marker-3.svg'}),
				'c-4': new icon({iconUrl: '/resources/images/marker-4.svg'}),
				'c-5': new icon({iconUrl: '/resources/images/marker-5.svg'}),
				'c-6': new icon({iconUrl: '/resources/images/marker-6.svg'}),
				'c-7': new icon({iconUrl: '/resources/images/marker-7.svg'}),
				'c-8': new icon({iconUrl: '/resources/images/marker-8.svg'}),
				'c-9': new icon({iconUrl: '/resources/images/marker-9.svg'}),
				'c-10': new icon({iconUrl: '/resources/images/marker-10.svg'}),
				'c-11': new icon({iconUrl: '/resources/images/marker-11.svg'}),
				'c-12': new icon({iconUrl: '/resources/images/marker-12.svg'}),
				'c-13': new icon({iconUrl: '/resources/images/marker-13.svg'}),
				'c-14': new icon({iconUrl: '/resources/images/marker-14.svg'}),
				's-1': new icon({iconUrl: '/resources/images/marker-s1.svg'}),
				's-2': new icon({iconUrl: '/resources/images/marker-s2.svg'}),
				's-3': new icon({iconUrl: '/resources/images/marker-s3.svg'}),
				'seasonal': new icon({iconUrl: '/resources/images/marker-seasonal.svg'})
			}
			return this;
		}

		function makeMarker(colour){
			return L.divIcon({
				'className': '',
				'html':	'<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="7.0556mm" height="11.571mm" viewBox="0 0 25 41.001" id="svg2" version="1.1"><g id="layer1" transform="translate(1195.4,216.71)"><path style="fill:%COLOUR%;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.1;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" d="M 12.5 0.5 A 12 12 0 0 0 0.5 12.5 A 12 12 0 0 0 1.8047 17.939 L 1.8008 17.939 L 12.5 40.998 L 23.199 17.939 L 23.182 17.939 A 12 12 0 0 0 24.5 12.5 A 12 12 0 0 0 12.5 0.5 z " transform="matrix(1,0,0,1,-1195.4,-216.71)" id="path4147" /><ellipse style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:1.428;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" id="path4173" cx="-1182.9" cy="-204.47" rx="5.3848" ry="5.0002" /></g></svg>'.replace(/%COLOUR%/,colour||"#000000"),
				iconSize:	 [25, 41], // size of the icon
				shadowSize:	 [41, 41], // size of the shadow
				iconAnchor:	 [12.5, 41], // point of the icon which will correspond to marker's location
				shadowAnchor: [12.5, 41],	// the same for the shadow
				popupAnchor:	[0, -41] // point from which the popup should open relative to the iconAnchor
			});
		}
		function buildDefaultPopup(feature,popup,osm){
			// does this feature have a property named popupContent?
			if(feature.properties){
				if(feature.properties.amenity == "bicycle_parking"){
					popup = "<h3>Bicycle parking</h3>";
				}else{
					// If this feature has a default popup
					// Convert "other_tags" e.g "\"ele:msl\"=>\"105.8\",\"ele:source\"=>\"GPS\",\"material\"=>\"stone\""
					if(feature.properties.other_tags){
						tags = feature.properties.other_tags.split(/,/);
						for(var t = 0; t < tags.length; t++){
							tags[t] = tags[t].replace(/\"/g,"");
							bits = tags[t].split(/\=\>/);
							if(bits.length == 2){
								if(!feature.properties[bits[0]]) feature.properties[bits[0]] = bits[1];
							}
						}
					}
				}
			
				if(feature.properties && feature.properties.popup){
					popup = feature.properties.popup.replace(/\n/g,"<br />");
				}
			}
			if(!popup){
				title = '';
				if(feature.properties) title = (feature.properties.title || feature.properties.name || feature.properties.Name || '');
				if(title) popup += '<h3>'+(title)+'</h3>';
				var added = 0;
				if(feature.properties){
					for(var f in feature.properties){
						if(f != "Name" && f!="name" && f!="title" && f!="other_tags" && (typeof feature.properties[f]==="number" || (typeof feature.properties[f]==="string" && feature.properties[f].length > 0))){
							popup += (added > 0 ? '<br />':'')+'<strong>'+f+':</strong> '+(typeof feature.properties[f]==="string" && feature.properties[f].indexOf("http")==0 ? '<a href="'+feature.properties[f]+'" target="_blank">'+feature.properties[f]+'</a>' : feature.properties[f])+'';
							added++;
						}
					}
				}
			}
			if(osm) popup += '<p style="border-top: 1px solid #000; padding-top:0.25em;font-size: 0.8em;">Something not quite right? <a href="'+_obj.href+'">Help improve the data</a>.</p>';
			if(popup){
				if(popup.indexOf("{{") >= 0){
					//popup = popup.replace(new RegExp(/\%IF ([^\s]+) (.*) ENDIF\%/,"g"),function(str,p1,p2){ return (feature.properties[p1] && feature.properties[p1] != "N/a" ? p2 : ''); });
					popup = popup.replace(/\{\{IF ([^\s]+) (.*) ENDIF\}\}/g,function(str,p1,p2){ return (feature.properties[p1] && feature.properties[p1] != "N/a" ? p2 : ''); });
					// Loop over properties and replace anything
					if(feature.properties){
						for(p in feature.properties){
							while(popup.indexOf("{{"+p+"}}") >= 0){
								popup = popup.replace("{{"+p+"}}",feature.properties[p] || "?");
							}
						}
					}
					for(p in feature){
						if(typeof feature[p]==="string"){
							while(popup.indexOf("{{"+p+"}}") >= 0){
								popup = popup.replace("{{"+p+"}}",feature[p] || "?");
							}
						}
					}
					if(feature.properties){
						popup = popup.replace(/\{\{Latitude\}\}/g,(feature.properties.centroid ? feature.properties.centroid.latitude : (feature.geometry.coordinates ? feature.geometry.coordinates[1] : '')));
						popup = popup.replace(/\{\{Longitude\}\}/g,(feature.properties.centroid ? feature.properties.centroid.longitude : (feature.geometry.coordinates ? feature.geometry.coordinates[0] : '')));
					}
					popup = popup.replace(/\{\{Zoom\}\}/g,18);
					popup = popup.replace(/\{\{type\}\}/g,feature.geometry.type.toLowerCase());
					// Replace any remaining unescaped parts
					popup = popup.replace(/\{\{[^\\}]+\}\}/g,"?");

				}else{
					//popup = popup.replace(new RegExp(/\%IF ([^\s]+) (.*) ENDIF\%/,"g"),function(str,p1,p2){ return (feature.properties[p1] && feature.properties[p1] != "N/a" ? p2 : ''); });
					popup = popup.replace(/\%IF ([^\s]+) (.*) ENDIF\%/g,function(str,p1,p2){ return (feature.properties[p1] && feature.properties[p1] != "N/a" ? p2 : ''); });
					// Loop over properties and replace anything
					for(p in feature.properties){
						while(popup.indexOf("%"+p+"%") >= 0){
							popup = popup.replace("%"+p+"%",feature.properties[p] || "?");
						}
					}
					popup = popup.replace(/%Latitude%/g,(feature.properties.centroid ? feature.properties.centroid.latitude : (feature.geometry.coordinates ? feature.geometry.coordinates[1] : '')));
					popup = popup.replace(/%Longitude%/g,(feature.properties.centroid ? feature.properties.centroid.longitude : (feature.geometry.coordinates ? feature.geometry.coordinates[0] : '')));
					popup = popup.replace(/%Zoom%/g,18);
					popup = popup.replace(/%type%/g,feature.geometry.type.toLowerCase());
					// Replace any remaining unescaped parts
					popup = popup.replace(/%[^\%]+%/g,"?");
					// Put back percent signs
					popup = popup.replace(/PERCENTSIGN/g,"\%");
				}
			}
			
			return popup;
		}
		
		this.init();

		return this;
	}

	/**
	 * CSVToArray parses any String of Data including '\r' '\n' characters,
	 * and returns an array with the rows of data.
	 * @param {String} CSV_string - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray (CSV_string, delimiter) {
		delimiter = (delimiter || ","); // user-supplied delimeter or default comma

		var pattern = new RegExp( // regular expression to parse the CSV values.
			( // Delimiters:
				"(\\" + delimiter + "|\\r?\\n|\\r|^)" +
				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
				// Standard fields.
				"([^\"\\" + delimiter + "\\r\\n]*))"
			), "gi"
		);

		var rows = [[]];  // array to hold our data. First row is column headers.
		// array to hold our individual pattern matching groups:
		var matches = false; // false if we don't find any matches
		// Loop until we no longer find a regular expression match
		while (matches = pattern.exec( CSV_string )) {
			var matched_delimiter = matches[1]; // Get the matched delimiter
			// Check if the delimiter has a length (and is not the start of string)
			// and if it matches field delimiter. If not, it is a row delimiter.
			if (matched_delimiter.length && matched_delimiter !== delimiter) {
				// Since this is a new row of data, add an empty row to the array.
				rows.push( [] );
			}
			var matched_value;
			// Once we have eliminated the delimiter, check to see
			// what kind of value was captured (quoted or unquoted):
			if (matches[2]) { // found quoted value. unescape any double quotes.
				matched_value = matches[2].replace(
					new RegExp( "\"\"", "g" ), "\""
				);
			} else { // found a non-quoted value
				matched_value = matches[3];
			}
			// Now that we have our value string, let's add
			// it to the data array.
			rows[rows.length - 1].push(matched_value);
		}
		return rows; // Return the parsed data Array
	}

	ODI.ready(function(){

		
		
		var a = document.querySelector('a.sheet-link');
		var href = a.getAttribute('href');
		if(href.indexOf('https://docs.google.com/spreadsheets')==0){
			fsm = new ODI.FSM(a,{'map':document.getElementById('location')});
		}

	});

})(window || this);

var map;