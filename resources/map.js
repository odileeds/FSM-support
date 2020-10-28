(function(root){

	if(!root.ODI) root.ODI = {};

	if(!root.ODI.ready){
		root.ODI.ready = function(f){
			if(/in/.test(document.readyState)) setTimeout('ODI.ready('+f+')',9);
			else f();
		};
	}

	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}
	
	// Sort the data
	function sortBy(arr,i){
		return arr.sort(function (a, b) {
			return a[i] < b[i] ? 1 : -1;
		});
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

	ODI.FSM = function(opts){
		if(!opts) opts = {};
		this.opts = opts;
		this.name = "FSM-support";
		this.postcodes = {'loading':{},'loaded':{},'lookup':{}};
		var _obj = this;
		console.info('Map inspired by Marcus Rashford\'s campaign for Free School Meals. Sign his petition at https://petition.parliament.uk/petitions/554276/');

		this.sources = {
			'anjali': {
				'name': 'Anjali / Marcus Rashford',
				'id': 'sheet-anjali',
				'href': 'https://docs.google.com/spreadsheets/d/106f8g5TUtBm7cB7RSXJQCC7eaLM_4Xf4RCliaStyuGw/edit',
				'url': (location.href.indexOf('file')==0 ? 'data/data.csv' : 'https://docs.google.com/spreadsheets/d/106f8g5TUtBm7cB7RSXJQCC7eaLM_4Xf4RCliaStyuGw/gviz/tq?tqx=out:csv&sheet=details'),
				'data': [],
				'header': {},
				'class': 'c3-bg',
				'edit': 'Source: Anjali - Help improve the data'
			},
			'alltogether': {
				'name': 'TechForUK',
				'id': 'sheet-all-together',
				'href': 'https://allofustogether.uk/',
				'url': (location.href.indexOf('file')==0 ? 'data/all-of-us-together.csv' : 'https://docs.google.com/spreadsheets/d/1EesLuKPJG970wu7mcmqMgWCxGSKm1cwn2LlBMbNKHLk/gviz/tq?tqx=out:csv&sheet=details'),
				'data': [],
				'header': {},
				'columnmap': {'Org Name':'Name','Town/City':'Town','County':'City/Region','Other info or description about the free meals':'More details','How to claim the meal':'How to claim','The URL of their announcement':'Link to post','Street Address 1 (building number + street)':'Address 1','Street Address 2':'Address 2','What time does the organisation open?':'Opens','What time does the organisation close?':'Closing','Which days are the meals available?':'Days','What is the organisation\'s phone number? Please include the area code.':'Phone number','The website of the organisation giving the free meals':'Website'},
				'class': 'c7-bg',
				'edit': 'Source: TechForUK'
			}
		};

		this.init = function(){
			this.makeMap();
			this.get();
			this.buildSearchForm('search');
			return this;
		}

		// We have a pre-compiled list of postcodes with coordinates (to reduce load) 
		ODI.ajax("postcodes.json",{
			"dataType": "json",
			"this": this,
			"success": function(d){
				for(var p in d) this.postcodes.lookup[p] = d[p];
				this.init();
			},
			"error": function(d,attr){
				console.error('Unable to load '+attr.url);
			}
		});

		this.get = function(){

			var lid,el,src,ul;

			// Reset the data
			this.toload = 0;
			this.loaded = 0;
			
			el = document.getElementById('output');
			el.innerHTML = '<p>List contains <span class="listtotal">?</span> places:</p>';
			for(src in this.sources){

				this.sources[src].data = [];
				this.sources[src].header = {};
				
				this.message('',{'id':this.sources[src].id+'-msg','type':'ERROR'});

				// Add list holders
				lid = this.sources[src].id+'-list';
				if(!el.querySelector('#'+lid)){
					ul = document.createElement('ul');
					ul.setAttribute('id',lid);
					el.appendChild(ul);
				}
				// Increment number of sources to load
				this.toload++;
			}

			for(var src in this.sources){
				console.info('Getting '+this.sources[src].url);
				ODI.ajax(this.sources[src].url,{
					"dataType": "text",
					"this":this,
					"src": src,
					"success":function(d,attr){
						this.update(CSVToArray(d),attr.src);
					},
					"error":function(e){
						console.error('Unable to load sheet',e);
					}
				});
			}
			setTimeout(function(){ _obj.get(); },300000);
			return this;
		}
		
		this.getPostcode = function(pcd,callback){
			var ocd,parea,district,sector;

			// Extract the outcode and sector
			pcd.replace(/^([^\s]+) ([0-9A-Z])/,function(m,p1,p2){ ocd = p1; sector = p2; return ""; });

			if(ocd){
				ocd.replace(/^([A-Z]{1,2})([0-9]+|[0-9][A-Z])$/,function(m,p1,p2){ parea = p1; district = p2; return ""; });
				var path = parea+'/'+district+'/'+sector;
				//console.log('getPostcode',pcd,this.postcodes.lookup[pcd],this.postcodes.loaded[path]);
				if(parea && district && !this.postcodes.loaded[path]){
					ODI.ajax('postcodes/'+path+'.csv',{
						'dataType':'text',
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
							console.error('Unable to load '+attr.url+' for /'+attr.pcd+'/');
							if(typeof attr.callback==="function") attr.callback.call(this,attr.pcd,this.postcodes.lookup[attr.pcd]);
						}
					})
					
				}else{
					console.warn('No path '+path,ocd);
					if(typeof callback==="function") callback.call(this,pcd,this.postcodes.lookup[pcd]);
				}
				
			}else{
				console.warn('No outcode in '+pcd);
				if(typeof callback==="function") callback.call(this,pcd,this.postcodes.lookup[pcd]);
			}
			
			return this;
		}
		
		this.update = function(d,src){
			
			var hrow,r,c,i,list,pcd,el,lid,ul,loc,s,id;
			
			this.sources[src].toload = 0;
			this.sources[src].loaded = 0;

			function cleanPostcode(pcd){
				if(pcd){
					// Remove trailing/leading spaces
					pcd = pcd.replace(/(^ | $)/g,"");
					
					// Remove non alpha-numeric-space characters
					pcd = pcd.replace(/[^0-9A-Z\s]/g,"");

					// Remove N/A or "-" values
					if(pcd == "-" || pcd.indexOf(/N\/A/i)>=0) pcd = "";

					// Remove long values
					if(pcd.length > 8 || pcd.length < 5) pcd = "";

					// Add a space if there isn't one
					if(pcd.indexOf(" ") < 0 && pcd.length >= 5){
						pcd = pcd.replace(/([0-9][A-Z]{2})$/,function(m,p1){ return " "+p1; });
					}
				}
				return pcd;
			}
			hrow = 0;
			for(r = 0; r < d.length; r++){
				if(d[r][0]=="Name" || d[r][0]=="Org Name"){
					hrow = r;
					r = d.length;
				}
			}

			// Name	Town	City/Region	Postcode	Specific schools?	How to claim	Link to post	More details
			for(c = 0; c < d[hrow].length; c++){
				// Map column headings
				if(this.sources[src].columnmap && this.sources[src].columnmap[d[hrow][c]]){
					d[hrow][c] = this.sources[src].columnmap[d[hrow][c]];
				}
				if(d[hrow][c]) this.sources[src].header[d[hrow][c]] = c;
			}
			console.info('Header starts on line '+hrow);
			for(i = hrow+1; i < d.length; i++){
				o = {};
				if(d[i][this.sources[src].header['Postcode']]) d[i][this.sources[src].header['Postcode']] = d[i][this.sources[src].header['Postcode']].toUpperCase();
				for(c = 0; c < d[i].length; c++){
					if(typeof this.sources[src].header[d[hrow][c]]==="number") o[d[hrow][c]] = d[i][c];
				}

				o['_postcode'] = cleanPostcode(d[i][this.sources[src].header['Postcode']]);

				if(o['_postcode'] && typeof this.postcodes.lookup[o['_postcode']]==="undefined") this.sources[src].toload++;
				this.sources[src].data.push(o);
			}

			el = document.getElementById('output');
			lid = this.sources[src].id+'-list';
			ul = el.querySelector('#'+lid);


			s = this.sources[src];
			for(i = 0; i < s.data.length; i++){
				this.sources[src].data[i]._id = 'list-'+src+'-'+i;

				li = document.createElement('li');
				li.setAttribute('id',this.sources[src].data[i]._id);
				list = "";
				list += '<div class="padded b5-bg">';
				list += '<h3>'+s.data[i]['Name']+'</h3>';
				list += '<p><strong>Location:</strong> ';
				loc = '';
				if(s.data[i]['Street Address 1 (building number + street)']) loc += (loc ? ', ':'')+s.data[i]['Street Address 1 (building number + street)'];
				if(s.data[i]['Town']) loc += (loc ? ', ':'')+s.data[i]['Town'];
				if(s.data[i]['City/Region']) loc += (loc ? ', ':'')+s.data[i]['City/Region'];
				if(s.data[i]['Postcode']) loc += (loc ? ', ':'')+s.data[i]['Postcode'];
				list += loc+'</p>';
				if(s.data[i]['How to claim']) list += '<p><strong>How to claim:</strong> '+s.data[i]['How to claim']+'</p>';
				if(s.data[i]['More details']) list += '<p><strong>More details:</strong> '+s.data[i]['More details']+'</p>';
				if(s.data[i]['Link to post']){
					list += '<p><a href="'+s.data[i]['Link to post']+'">Link to original post';
					if(s.data[i]['Link to post'].indexOf('twitter.com')>0) list += ' on Twitter';
					if(s.data[i]['Link to post'].indexOf('facebook.com')>0) list += ' on Facebook';
					list += '</a></p>';
				}
				list += '</div>';
				list += '<a href="'+s.href+'" class="source '+(s['class']||'b2-bg')+'">'+s.edit.replace(/\%HREF\%/g,s.href)+'</a>';
				li.innerHTML = list;
				this.sources[src].data[i]._el = li;
				ul.appendChild(li)
			}

			if(this.sources[src].toload > this.sources[src].loaded){
				for(i = 0; i < this.sources[src].data.length; i++){
					pcd = this.sources[src].data[i]['_postcode']
					if(pcd){
						if(typeof this.postcodes.lookup[pcd]==="undefined"){
							console.log('Trying to find '+pcd);
							this.getPostcode(pcd,function(pcd,pos){
								this.sources[src].loaded++;
								if(this.sources[src].toload==this.sources[src].loaded) this.loadedSource(src);
							});
						}
					}
				}
			}
			if(this.sources[src].toload==this.sources[src].loaded) this.loadedSource(src);
			
			return this;
		}
		
		this.loadedSource = function(src){
			console.info('Loaded: '+this.sources[src].name);
			this.loaded++;
			if(this.toload == this.loaded) this.addToMap();
			return this;
		}

		// Define a function for scoring how well a string matches
		function getScore(str1,str2,v1,v2,v3){
			if(!str2 || !str1) return 0;
			var r = 0;
			str1 = str1.toUpperCase();
			str2 = str2.toUpperCase();
			words = str1.split(/\W/);
			if(str2.indexOf(str1)==0) r += (v1||3);
			if(str2.indexOf(str1)>0) r += (v2||1);
			if(str1==str2) r += (v3||4);
			for(var w = 0; w < words.length; w++){
				if(str2.indexOf(words[w])==0) r += (v1||3)/(w+1);
				if(str2.indexOf(words[w])>0) r += (v2||1)/(w+1);
				if(str2==words[w]) r += (v3||4)/(w+1);
			}
			return r;
		}

		this.orderList = function(s,e,t){
			var i,tmp,datum,str,li;

			str = s.toUpperCase();

			// Rank the results
			tmp = [];
			var n = 0;

			for(src in this.sources){
				for(i = 0; i < this.sources[src].data.length; i++){
					datum = {'rank':0,'el':this.sources[src].data[i]._el};
					datum.rank += getScore(str,this.sources[src].data[i]['Name'],4,1,2);
					datum.rank += getScore(str,this.sources[src].data[i]['Town'],2,1,2);
					datum.rank += getScore(str,this.sources[src].data[i]['City/Region'],2,1,2);
					datum.rank += getScore(str,this.sources[src].data[i]['Postcode'],2,1,2);
					tmp.push(datum);
				}
			}
			if(str){
				tmp = sortBy(tmp,'rank');
				for(i = 0; i < tmp.length; i++){
					if(tmp[i].rank > 0){
						// Make sure it is visible
						tmp[i].el.classList.remove('hide');
						// Re-order the DOM
						if(i==0) tmp[i].el.parentNode.childNodes[0].insertAdjacentElement('beforebegin', tmp[i].el);
						else tmp[i-1].el.insertAdjacentElement('afterend', tmp[i].el);
						n++;
					}else{
						// Hide it
						tmp[i].el.classList.add('hide');
					}
				}
			}else{
				n = tmp.length;
			}
			
			this.updatePlaces(n,null);
			return this;
		}

		this.buildSearchForm = function(id){
			var frm;
			var _obj = this;

			this.search = document.getElementById(id);

			if(this.search.form){
				frm = this.search.form;
				frm.addEventListener('submit',function(e){
					e.preventDefault();
					e.stopPropagation();
					return false;
				},false);
			}
			if(this.search){
				this.search.setAttribute('autocomplete','off');
				this.search.addEventListener('keyup',function(e){
					e.preventDefault();
					e.stopPropagation();
					if(e.keyCode==40 || e.keyCode==38){
						//highlight(e.keyCode);
					}else{
						_obj.orderList(this.value,e,event);
					}
				});
			}
			return this;
		}
		
		this.addToMap = function(){
			var geojson = {"type": "FeatureCollection","features":[]};
			var markerList = [];

			var geoattrs = {
				'style': { "color": "#2254F4", "weight": 2, "opacity": 0.65 },
				'pointToLayer': function(geoJsonPoint, latlng) { return L.marker(latlng,{icon: makeMarker('#D60303')}); },
				'onEachFeature': function(feature, layer) {
					popup = buildDefaultPopup(feature,"");
					if(popup) layer.bindPopup(popup);
				}
			};

			this.nodes = L.markerClusterGroup({
				chunkedLoading: true,
				maxClusterRadius: 40,
				iconCreateFunction: function (cluster) {
					var pins = cluster.getAllChildMarkers();
					return L.divIcon({ html: '<div class="marker-group c12-bg">'+pins.length+'</div>', className: '',iconSize: L.point(40, 40) });
				},
				// Disable all of the defaults:
				spiderfyOnMaxZoom: true,
				showCoverageOnHover: false,
				zoomToBoundsOnClick: true
			});

			var total = 0;
			var ltotal = 0;
			var src,i,id;
			for(src in this.sources){
				ltotal += this.sources[src].data.length;
				for(i = 0; i < this.sources[src].data.length; i++){
					pcd = this.sources[src].data[i]['_postcode'];
					if(pcd){
						if(typeof this.postcodes.lookup[pcd]==="object"){
							feature = {'type':'Feature','properties':this.sources[src].data[i],'geometry':{'type':'Point','coordinates':this.postcodes.lookup[pcd]}};
							feature.properties._src = this.sources[src];
							tempmark = L.marker([this.postcodes.lookup[pcd][1],this.postcodes.lookup[pcd][0]],{icon: makeMarker('#D60303')}).bindPopup(buildDefaultPopup(feature,""));
							markerList.push(tempmark);
							total++;
						}else{
							this.message('Failed to find <em>'+pcd+'</em> for '+this.sources[src].data[i]['Name']+', '+this.sources[src].data[i]['Town']+' ('+this.sources[src].name+')',{'id':this.sources[src].id+'-msg','append':true,'type':'ERROR'});
						}
					}
				}
			}
			if(this.nodegroup) this.map.removeLayer(this.nodegroup);
			this.nodes.addLayers(markerList);
			this.map.addLayer(this.nodes);
			
			this.updatePlaces(ltotal,total);
			
			return this;
		}
		
		this.updatePlaces = function(ltotal,total){
			var li,i;
			if(typeof ltotal==="number"){
				li = document.getElementsByClassName('listtotal');
				for(i = 0 ; i < li.length; i++) li[i].innerHTML = ltotal;
			}
			if(typeof total==="number"){
				li = document.getElementsByClassName('maptotal');
				for(i = 0 ; i < li.length; i++) li[i].innerHTML = total;
			}
			return this;
		}
		
		this.makeMap = function(){
			this.baseMaps = {};
			this.baseMaps['CartoDB Voyager'] = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
				attribution: 'Map: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
				subdomains: 'abcd',
				maxZoom: 19
			});

			// Make the Leaflet map
			var mapel = this.opts.map || document.getElementById('location');
			var id = mapel.getAttribute('id');
			this.selectedBaseMap = "CartoDB Voyager";
			this.map = L.map(id,{'layers':[this.baseMaps[this.selectedBaseMap]],'center': [53.4629,-2.2916],'zoom':6,'scrollWheelZoom':true});
			
			// Update attribution
			var prefix = "";
			for(var src in this.sources){
				prefix += (prefix ? ' / ' : '')+'<a href="'+this.sources[src].href+'">'+this.sources[src].name+'</a>';
			}
			this.map.attributionControl.setPrefix('Data: '+prefix).setPosition('bottomleft');

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

			return this;
		}

		this.log = function(){
			if(this.logging || arguments[0]=="ERROR"){
				var args = Array.prototype.slice.call(arguments, 0);
				if(console && typeof console.log==="function"){
					if(arguments[0] == "ERROR") console.error('%c'+this.name+'%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
					else if(arguments[0] == "WARNING") console.warn('%c'+this.name+'%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
					else console.log('%c'+this.name+'%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
				}
			}
			return this;
		};

		this.message = function(msg,attr){
			if(!attr) attr = {};
			if(!attr.id) attr.id = 'default';
			if(!attr['type']) attr['type'] = 'message';
			if(msg) this.log(attr['type'],msg.replace(/<[^\>]*>/g,""));
			var css = "b5-bg";
			if(attr['type']=="ERROR") css = "c12-bg";
			if(attr['type']=="WARNING") css = "c14-bg";

			var msgel = document.querySelector('.message');
			var el;
			if(!msgel) return this;
		
			if(!msg){
				if(msgel){
					el = msgel.querySelector('#'+attr.id);
					// Remove the specific message container
					if(el) el.parentNode.removeChild(el);
				}
			}else if(msg){
				// Pad the container
				//msgel.parent().addClass('padded');
				// We make a specific message container
				if(!msgel.querySelector('#'+attr.id)){
					var div = document.createElement('div');
					div.setAttribute('id',attr.id);
					div.innerHTML = '<div class="holder padded"></div>';
					msgel.appendChild(div);
				}
				msgel = msgel.querySelector('#'+attr.id);
				msgel.classList.add(css);
				if(attr.append) msgel.querySelector('.holder').innerHTML += (msgel.querySelector('.holder').innerHTML.length > 0 ? '<br />' : '')+msg;
				else msgel.querySelector('.holder').innerHTML = msg;
			}

			return this;
		};
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
		function buildDefaultPopup(feature,popup){
			// does this feature have a property named popupContent?
			if(feature.properties){			
				if(feature.properties && feature.properties.popup){
					popup = feature.properties.popup.replace(/\n/g,"<br />");
				}
			}
			if(!popup){
				title = '';
				popup += '<div class="info">';
				if(feature.properties) title = (feature.properties.title || feature.properties.name || feature.properties.Name || '');
				if(title) popup += '<h3>'+(title)+'</h3>';
				var added = 0;
				if(feature.properties){
					for(var f in feature.properties){
						if(f != "Name" && f!="name" && f!="title" && f!="other_tags" && f.indexOf("_")!=0 && (typeof feature.properties[f]==="number" || (typeof feature.properties[f]==="string" && feature.properties[f].length > 0))){
							popup += (added > 0 ? '<br />':'')+'<strong>'+f+':</strong> '+(typeof feature.properties[f]==="string" && feature.properties[f].indexOf("http")==0 ? '<a href="'+feature.properties[f]+'" target="_blank">'+feature.properties[f]+'</a>' : feature.properties[f])+'';
							added++;
						}
					}
				}
				popup += '</div>';
			}
			if(feature.properties._src.edit) popup += '<p class="more"><a href="'+feature.properties._src.href+'">'+feature.properties._src.edit+'</a></p>';
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

		fsm = new ODI.FSM({'map':document.getElementById('location')});

	});

})(window || this);

var map;