/*global $*/
/*global d3*/
/*global require*/
/*global console*/
/*global document*/

//ESRI modules used
require(["esri/Graphic","esri/config","esri/WebMap","esri/views/MapView","esri/widgets/Search", "esri/layers/RouteLayer","esri/rest/support/PolygonBarrier","esri/rest/support/FeatureSet","esri/rest/support/PointBarrier","esri/rest/support/RouteParameters","esri/rest/route","esri/layers/FeatureLayer","esri/rest/support/Query","esri/rest/support/Stop","esri/rest/support/RouteInfo","esri/core/Collection","esri/rest/support/TravelMode","esri/rest/networkService","esri/rest/support/DirectionPoint","esri/PopupTemplate","esri/widgets/LayerList","esri/widgets/Legend","esri/widgets/Locate","esri/widgets/Track","esri/widgets/Expand","esri/core/watchUtils"]
, function (Graphic,esriConfig,WebMap,MapView,Search,RouteLayer,PolygonBarrier,FeatureSet,PointBarrier,RouteParameters,route,FeatureLayer,Query,Stop,RouteInfo,Collection,TravelMode,networkService,DirectionPoint,PopupTemplate,LayerList,Legend,Locate,Track,Expand,watchUtils) {
	
	
	//API key and portal URL 
    esriConfig.apiKey = "AAPK276cbb0d0adb46dd84559e3cc629b9ecltTU1snes6ZLNVPJfKUtP-Fy__eVTdXbkAxnPvlbd9t8BwVyimdY_FonEXjhEnCg";
	esriConfig.portalUrl = "https://portal.gis.ubc.ca/arcgis";
	
	const synth = window.speechSynthesis;
	const routeUrl = 'https://ags.gis.ubc.ca/arcgis/rest/services/Multimodal/NAServer/Route'
	const routePortalID = "b1846c8638bb4d679bd06f120c87825b"
	const steepSlopeSegmentPortalID = "159428d89f3b412cae133a5e8c2a11ba"
	const poiForBasemapUrl = "https://ags.gis.ubc.ca/arcgis/rest/services/Hosted/ubcv_poi_POI_view/FeatureServer/0"
	const poiForSearchUrl = "https://ags.gis.ubc.ca/arcgis/rest/services/Wayfinding/ubcv_wayfinding_test/FeatureServer/1"
	const crosswalkUrl = "https://ags.gis.ubc.ca/arcgis/rest/services/Wayfinding/ubcv_wayfinding_test/FeatureServer/0"
	const basemapPortalID = "c60119036d11407596d92bb1b9dc23c8"
	const highContrastPortalID = "c55e159550dd4499b43b234ab1f32736"
	const constructionURL = "https://ags.gis.ubc.ca/arcgis/rest/services/Wayfinding/ubcv_Construction/FeatureServer/1"
	const pointBarrierPortalID = "2cecb4a75ae34b3eb75b742eff0336f2"
	
	//Global variables associated with travel modes
    
	var tMode = getTravelMode("Walking")
	var baseMode = "Walking"
	document.getElementById("walkButton").style.backgroundColor = "#0680A6"
	var simplifyStr = ""
	var steepStr = ""
	var directionsHTML = ""
	
	//Global variables associated with the search bars and routing 
	var directionsMode = false
	var n = 0
	var poid1 = ''
	var origname = ''
	var poid2 = ''
	var destname = ''
	var entQuery = ''
	var stopArray1 = []
	var stopArray2 = []
	var stopArray1Removed = []
	var stopArray2Removed = []
	var originFocus = false
	var destFocus = true
	var prevsterm1 = null
	var prevsterm2 = null
	//Basemap 
	var webmap = new WebMap({
        portalItem: {
          id: basemapPortalID
        }
     });
	
	//Crosswalk table
	var crosswalkTable = new FeatureLayer({
        url: crosswalkUrl
     });
	
	//Routing layer
	const routeLayer = new RouteLayer({
		portalItem: {
			id: routePortalID
		},
	})
	
	//Adds the basemap and the routing / crosswalk layers
	var view = new MapView({
        map: webmap,
		layers: [routeLayer,crosswalkTable],
        container: "viewDiv",
    });
	
	//Remove the zoom from the map
	view.ui.remove("zoom");
	
	var poiFL = new FeatureLayer({
		url:poiForBasemapUrl,
		//url: poiForBasemapUrl,
		listMode: 'hide',
		popupEnabled:true
	})
	view.map.add(poiFL)
	
	var slopeFL = new FeatureLayer({
		portalItem: {
			id: steepSlopeSegmentPortalID
		},
		title:"Steep slopes",
		visible: false,
		popupEnabled:false
	})
	view.map.add(slopeFL)
	
	
	var unifiedFL = new FeatureLayer({
		url: poiForSearchUrl
	})

	 	//Construction polygons
	var polyBarrierfl = new FeatureLayer({
		url:constructionURL,
		title: "Construction",
		visible: false,
		popupEnabled: false
		
	})
	view.map.add(polyBarrierfl)
	
	//Construction point barriers
	var pointBarrierfl = new FeatureLayer({
		portalItem: {
			id: pointBarrierPortalID
		}
	})
	
	
	pointBarrierfl.queryFeatures().then(function(results){
	  // prints the array of result graphics to the console
	 
	  pointBarriers = []
	 
		for (i = 0; i < results.features.length; i++) {
			
			aBarrier = new PointBarrier({ geometry: results.features[i].geometry})

			aBarrier.barrierType = 'restriction'
			pointBarriers.push(aBarrier)
		}
		
	})
	
	var track = new Track({
          view: view,
		  
		  useHeadingEnabled: true,
		  container:'trackingBox',
		  visible:true
     });
    view.ui.add(track);
	const directionsAction = {
	  title: "Directions",
	  id: "directions",
	  image: "svgs/noun-route-939679.svg"
	};
	
	//Popup stuff
	view.popup = {
	  dockEnabled: true,
	  dockOptions: {
		// Disables the dock button from the popup
		buttonEnabled: false,
		// Ignore the default sizes that trigger responsive docking
		breakpoint: true,
		//position: 'bottom-left'
	  },
	  actions: [directionsAction],
	  
	};
	
	view.popup.set("dockOptions", {
              breakpoint: false,
              buttonEnabled: false,
              position: 'bottom-left'
    });
	
	
	//Function to grab one of the travel modes
	async function getTravelMode(fMode) {
		
   		const serviceDescription = await networkService.fetchServiceDescription(routeUrl);
		const { supportedTravelModes } = serviceDescription;
		return tMode = supportedTravelModes.find((mode) => mode.name === fMode);
	}
	
	
	window.changeTravelModeAccess = function(){
		if (document.getElementById("simplify").checked == true) {
			simplifyStr = " Simplified"
		}else {
			simplifyStr = ""
		}
		if (document.getElementById("simplify").checked == true) {
			steepStr = " No Slopes"
		}else {
			steepStr = ""
		}
		theMode = baseMode + steepStr + simplifyStr
		getTravelMode(theMode).then(function()
		{
			if (stopArray1.length > 0 && stopArray2.length > 0) {
				routeResults(stopArray1,stopArray2)
		 }
			
		})
	}
	
	window.changeTravelMode = function(baseMode){
		theMode = baseMode + steepStr + simplifyStr
		if (baseMode == "Walking"){
			document.getElementById("walkButton").style.backgroundColor = "#0680A6"
			document.getElementById("accessButton").style.backgroundColor = ""
			document.getElementById("bikeButton").style.backgroundColor = ""
			
			getTravelMode(theMode).then(function() {
				changeEntrances("all")
			})

			
		}
		if (baseMode == "Accessible"){
			document.getElementById("walkButton").style.backgroundColor = ""
			document.getElementById("accessButton").style.backgroundColor = "#0680A6"
			document.getElementById("bikeButton").style.backgroundColor = ""
			
			getTravelMode(theMode).then(function() {
				changeEntrances("accessible")
			})
		}
		if (baseMode == "Biking"){
			document.getElementById("walkButton").style.backgroundColor = ""
			document.getElementById("accessButton").style.backgroundColor = ""
			document.getElementById("bikeButton").style.backgroundColor = "#0680A6"
			getTravelMode(theMode).then(function() {
				changeEntrances("all")
			})
			
		}
	}
	
	
	document.getElementById('travelmodeBox').style.display = 'none'
	document.getElementById('trackingBox').style.display = 'none'
	
	window.toggleDirections = function() {
		
		if (document.getElementById('travelmodeBox').style.display == 'none') {
			
			document.getElementById('travelmodeBox').style.display = 'block'
			document.getElementById('directionsButton').style.backgroundColor = "#0680A6"
			document.getElementById('trackingBox').style.display = 'block'
			searchWidget2.visible = true
			directionsExpand.visible = true
			settingsExpand.visible = true
			directionsMode = true
			
		}else {
			
			document.getElementById('travelmodeBox').style.display = 'none'
			document.getElementById('directionsButton').style.backgroundColor = ""
			document.getElementById('trackingBox').style.display = 'none'
			searchWidget2.visible = false
			directionsExpand.visible = false
			settingsExpand.visible = false
			searchWidget2.clear()	
			directionsMode = false
		}
		
	}
	
	//document.getElementById('accessBox').style.display = 'none'
	window.toggleAccessBox = function() {
		
		if (document.getElementById('accessBox').style.display == 'none') {
			document.getElementById('hiddenMenus').style.display = 'block'
			document.getElementById('accessBox').style.display = 'block'
			document.getElementById('settingsButton').style.backgroundColor = "#0680A6"
		}else {
			document.getElementById('accessBox').style.display = 'none'
			document.getElementById('settingsButton').style.backgroundColor = ""
		}
	}

	// Adds widget below other elements in the top left corner of the view

	
	timezone = "America/Vancouver"
	
	//Popup stuff
	function popupTemplating(feature) {
		const div = document.createElement("div");
		
		let photourl = (feature.graphic.attributes.photourl === undefined ? feature.graphic.attributes.PHOTOURL : feature.graphic.attributes.photourl)
		
		let location = (feature.graphic.attributes.location === undefined ? feature.graphic.attributes.LOCATION : feature.graphic.attributes.location)
		
		let url = (feature.graphic.attributes.url === undefined ? feature.graphic.attributes.URL : feature.graphic.attributes.url)
		
		let hours = (feature.graphic.attributes.hours === undefined ? feature.graphic.attributes.HOURS : feature.graphic.attributes.hours)
		
		let contact = (feature.graphic.attributes.contact === undefined ? feature.graphic.attributes.CONTACT : feature.graphic.attributes.contact)
		
		

				
		if (photourl == null) {
			photoHTML = ""
		}else {
		
			errStr = "this.style.display='none'"
			
			photoHTML = '<img id="popupphoto" src=' + photourl+ ' onerror=' + errStr + '>' + "<br>" + "<br>"
		}
		if (location == null) {
			locHTML = ""
		}else {
			locHTML = "Location: " + location + "<br>" + "<br>"
		}
		if (url == null) {
			urlHTML = ""
		}else {
			urlHTML = '<a href="' + url + '" target="_blank">Website</a>' + "<br>"
		}
		if (hours == null) {
			statusHTML = ""
			hoursHTML = ""
		}else {
			hoursHTML = "<b>Hours</b><br>"
			hoursStr = hours
			if (hoursStr.includes(';')) {
				hoursList = hoursStr.split(";")
			}else {
				hoursList = [hoursStr]
			}
			for (i=0; i < hoursList.length; i++) {
				hoursHTML += hoursList[i] + "<br>" 
			}
			try {
	
			   status = openOrClosed(hoursList)
			   if (status == "Closed") {
				   statusHTML = '<p style="color:red">Location is: ' + status + '</p>'
			   }else {
				   statusHTML = '<p style="color:green">Location is: ' + status + '</p>'
			   }
			}
			catch(err) {
				statusHTML = ""
			}
		}
		
		if (contact == null) {
			contactHTML = ""
		}else {
			contactHTML = "<br><b>Contacts</b><br>"
			if (contact.includes(";") == false) {
				contactHTML = contact
			}else {
				contactsList = contact.split(";")
				for (i=0; i< contactsList.length; i++) {
					contactHTML += contactsList[i] + "<br>"
				}
			}
		}
		div.innerHTML = photoHTML + locHTML + urlHTML + statusHTML + hoursHTML + contactHTML//'<hr style="width:100%;height:25px;background-color:#002145;text-align:left;margin-left:0;margin-top:0">' + 
		return div;
	}
	//popupTemplate = new PopupTemplate()
	popupTemplate = {title:"{PLACENAME}",
					  outFields: ["*"],
					 content:popupTemplating
					}
	
	poiFL.popupTemplate = popupTemplate
	view.popup.on("trigger-action", (event) => {
		  // Execute the measureThis() function if the measure-this action is clicked
		  if (event.action.id === "directions") {
			  window.toggleDirections()
			
			  if (destFocus) {
				  searchWidget2.searchTerm = view.popup.title	
			  }
			  if (originFocus) {
				  searchWidget1.searchTerm = view.popup.title	
			  }
			
			  cursterm1 = searchWidget1.searchTerm
			  cursterm2 = searchWidget2.searchTerm 
			  if (cursterm1.searchTerm != '' && cursterm1 != prevsterm1) {

				  searchWidget1.search()
				  prevsterm1 = cursterm1
				  
			  }
			  if (cursterm2.searchTerm != '' && cursterm2 != prevsterm2) {
				 
				  searchWidget2.search()
				  prevsterm2 = cursterm2
			  }
		  }
	});
	

	//The top search widget that acts as an origin in the routing 
	var searchWidget1 = new Search({
		view: view,
		includeDefaultSources: false,
		sources: [{
			layer: new FeatureLayer({
				//POI feature class
        		url: poiForSearchUrl,
				popupTemplate:popupTemplate,
				outFields: ["*"]
     		}),
			//placeholder:"Search for a place",
			placeholder:"Search for a place",
			searchFields: ["placename"],
  			displayField:  "placename",
			name: "POI Seach",
  			exactMatch: false,
			outFields: ["*"],
			maxSuggestions: 6
		}],
		locationEnabled: false,
		popupEnabled: true,
		container:"searchBoxes"
		//popupTemplate: popupTemplate
	});
	
    
	//The bottom search widget that acts as a destination in the routing 
    var searchWidget2 = new Search({
		view: view,
		visible: false,
		includeDefaultSources: false,
		sources: [{
			layer: new FeatureLayer({
				//POI feature class
        		url: poiForSearchUrl,
				outFields: ["*"]
     		}),
			placeholder:"Search for a place",
			searchFields: ["placename"],
  			displayField: "placename",
			name: "POI Seach",
  			exactMatch: false,
			outFields: ["*"],
			maxSuggestions: 6
		}],
		locationEnabled: false,
		popupEnabled: false
	});
	
	//Add the top search widget 
	view.ui.add(searchWidget1, {
		position: "top-left",
		index: 10,
		
	});	

	
	//Add the bottom search widget to the top left corner of the view
	view.ui.add(searchWidget2, {
		position: "top-left",
		index: 10
	});	
	
	settingsDiv = document.createElement("div")
	settingsDiv.id = "accessBox"
	settingsDiv.style.visibility = 'block'
	settingsDiv.innerHTML = '<hr style="width:100%;height:25px;background-color:#002145;text-align:left;margin-left:0;margin-top:0"><div style="padding-left:5px"><b style="font-size:16px">Custom Navigation</b><br><input type="checkbox" id="noSlope" name="noSlope" value="NoSlope" onclick="window.parent.changeTravelModeAccess()"><label for="NoSlope">Avoid steep slopes</label><br><input type="checkbox" id="simplify" name="simplifyR" value="simplifyR" onclick="window.parent.changeTravelModeAccess()"><label for="accessE">Simplify route</label><br><b style="font-size:16px">Navigation Aids</b><br><input type="checkbox" id="highcont" name="highcont" value="HighContrast" onclick="window.parent.switchBasemaps()"><label for="HighContrast">High Contrast Visibility</label><br></div>'
	
	
	settingsExpand = new Expand({
		view: view,
		expandIconClass:"esri-icon-settings2",
		expandTooltip: "Show additional custom ",
	  	content: settingsDiv,
		visible: false
	});
	
	view.ui.add(settingsExpand, {
		position: "top-left",
		index: 5,
		
	});	
	
	directionsDiv = document.createElement("div")
	directionsDiv.id = "directions"
	directionsDiv.style.visibility = 'block'
	directionsDiv.innerHTML = '<hr style="width:100%;height:25px;background-color:#002145;text-align:left;margin-left:0;margin-top:0"><div id="directionsBox" style="padding-left:5px"></div>'
	
	directionsExpand = new Expand({
		view: view,
		expandIconClass:"esri-icon-documentation",
		expandTooltip: "Show written directions",
	  	content: directionsDiv,
		visible: false
	});
	
	view.ui.add(directionsExpand, {
		position: "top-left",
		index: 5,
		
	});	
	
	 expandHandle1 = watchUtils.pausable(directionsExpand, "expanded", function(newValue, oldValue){
        if(newValue === true){
          expandHandle1.pause();
          setTimeout(function(){
            expandHandle2.resume();
          }, 100);
        }else{
          expandHandle1.resume();
        }
        if(settingsExpand.expanded){
          settingsExpand.collapse();
        }
      });

      expandHandle2 = watchUtils.pausable(settingsExpand, "expanded", function(newValue, oldValue){
        if(newValue === true){
          expandHandle2.pause();
          setTimeout(function(){
            expandHandle1.resume();
          }, 100);
        }else{
          expandHandle2.resume();
        }
        if(directionsExpand.expanded){
          directionsExpand.collapse();
        }
      });
	
	searchWidget1.on('suggest-complete', function(event) {
		directionsExpand.collapse();
		settingsExpand.collapse();
	})
	searchWidget2.on('suggest-complete', function(event) {
		directionsExpand.collapse();
		settingsExpand.collapse();
	})

	//When the user finishes the search
	searchWidget1.on('search-complete', function(result){
		if (directionsMode == false) {
			view.graphics.removeAll();
			directionsHTML = ""
		}
		if (directionsMode && searchWidget2.goToOverride == true) {
			searchWidget1.goToOverride = true
		}else {
			searchWidget1.goToOverride = false
		}
		
		stopArray1 = []
		stopArray1Removed = []
		//Grab the ID of the searched term and create a query
		
		if (result.results[0].results.length > 1) {
			for (i=0; i < result.results[0].results.length; i++) {
				if (view.popup.title == result.results[0].results[i].feature.attributes.PLACENAME) {
					origname = result.results[0].results[i].feature.attributes.PLACENAME
					poid1 = result.results[0].results[i].feature.attributes.WAYF_UID
				}
			}
		}else {
			origname = result.results[0].results[0].feature.attributes.PLACENAME
			poid1 = result.results[0].results[0].feature.attributes.WAYF_UID
		}
		
		const query = new Query();
		query.where = "WAYF_UID = " + "'" + poid1 + "'" + entQuery;
		query.returnGeometry = true;
		query.outFields = [ "WAYF_UID"]//,"x","y" ];

		//This creates a promise that querys the data and populates the list 
		crosswalkTable.queryFeatures(query).then(function(results){

			//If there is more than one stop associated with te POI iterate through them all 
			if (results.features.length > 1) {
				for (i = 0; i < results.features.length; i++) {
					const stop = { geometry: { x: results.features[i].geometry.longitude, y: results.features[i].geometry.latitude}}
					//We want to wait for this list to finish populating 
					stopArray1.push(stop)

				}
				return stopArray1
			//Otherwise just push the single one into the array
			}else {

				const stop = { geometry: { x: results.features[0].geometry.longitude, y: results.features[0].geometry.latitude}}
				stopArray1.push(stop)
				return stopArray1
			}									 
		//Then, test the route of all these results 
		}).then(function(stopResultArray){
			if (directionsMode) {
				routeResults(stopResultArray,stopArray2)
			}
			
			})
		
	})
	
	//When the user finishes the search
	searchWidget2.on('search-complete', function(result){
		
		searchWidget2.goToOverride = true
		
		stopArray2 = []
		stopArray2 = []
		stopArray2Removed = []
		
		destname = result.results[0].results[0].feature.attributes.PLACENAME
		poid2 = result.results[0].results[0].feature.attributes.WAYF_UID
		const query = new Query();
		query.where = "WAYF_UID = " + "'" + poid2 + "'"  + entQuery;
		query.returnGeometry = true;
		query.outFields = ["WAYF_UID"];
										 
		crosswalkTable.queryFeatures(query).then(function(results){
			if (results.features.length > 1) {
				//Go through the results and push the stops into an array 
				for (i = 0; i < results.features.length; i++) {
					const stop = { geometry: { x: results.features[i].geometry.longitude, y: results.features[i].geometry.latitude}}
					stopArray2.push(stop)
				}
				return stopArray2
			//Otherwise just push the single one into the array
			}else {
				const stop = { geometry: { x: results.features[0].geometry.longitude, y: results.features[0].geometry.latitude}}
				stopArray2.push(stop)
				return stopArray2
			}
		}).then(function(stopResultArray){
			if (directionsMode) {
				routeResults(stopArray1,stopResultArray)
			}
			
			})
			

	});
	
	searchWidget1.on("search-focus", function(event){
		originFocus = true
	 	destFocus = false
	});
	
	searchWidget2.on("search-focus", function(event){
	 	destFocus = true
		originFocus = false
	});
	
	//Function to test each entrance that was found
	function routeResults(sArray1,sArray2) {
		//console.log('in route results')
		//Only route if we have stops to test both to and from 
		if (sArray1.length > 0 && sArray2.length > 0) {
	
			n = 0
			for (var i = 0; i < sArray1.length; i++) {
				for (var j = 0; j < sArray2.length; j++) {
					n += 1
				}
			}

			for (var i = 0; i < sArray1.length; i++) {
				for (var j = 0; j < sArray2.length; j++) {
					
					getRoute(sArray1[i],sArray2[j],n)
				}
			}
		}
	}
	//Function the tests the length of each route and returns the shortest one 
	function getRoute(stop1,stop2,n) {
			//console.log('in get route')
			//routeLayer.polygonBarriers = polyBarriers
			routeLayer.pointBarriers = pointBarriers
			const routeParams = new RouteParameters({
				returnRoutes: true,
				returnDirections: true,
				directionsOutputType: "standard",
				outputLines: "true-shape-with-measure",
				travelMode: tMode,
				
				layer: routeLayer,  
				directionsLengthUnits: "meters",
				// An authorization string used to access the routing service
				stops: new Collection([
					new Stop({ name: origname, geometry: { x:stop1["geometry"]['x'], y: stop1["geometry"]['y'] }}),
					new Stop({ name: destname, geometry: { x:stop2["geometry"]['x'], y: stop2["geometry"]['y'] }})
				])
			})
			
			//routeParams.polygonBarriers = routeLayer.polygonBarriers
			routeLengths = []
			routeObjects = []
			routeDirections = []
		    routeParams.pointBarriers = routeLayer.pointBarriers
			
			route.solve(routeUrl, routeParams).then(function(data) {
				var routeLength = 0
				data.routeResults.forEach(function(result) { 
					
					routeLengths.push(result.route.attributes.Total_Length)
					routeObjects.push(result.route)
					routeDirections.push(result.directions.features)
	
				})

				if (routeLengths.length == n) {
					
					var chosenRoute = routeObjects[routeLengths.indexOf(Math.min.apply(Math, routeLengths))]
					var chosenDirections = routeDirections[routeLengths.indexOf(Math.min.apply(Math, routeLengths))]
					
					chosenRoute.symbol = {
					  type: "simple-line",
					  color: [5, 150, 255],
					  width: 3
					};
					//console.log('chose the route')
					directionsHTML = ''
					
					for (i=0; i < chosenDirections.length; i++) {
						
						lengthnum = Math.round(chosenDirections[i].attributes.length)

						if (i !=0 && i != chosenDirections.length - 1 && !chosenDirections[i].attributes.text.includes("then")) {

							directionsHTML += chosenDirections[i].attributes.text + " and continue for " + lengthnum.toString() + " metres <br>" + "<br>"
						}else{
							directionsHTML += chosenDirections[i].attributes.text + "<br>" + "<br>"
						}
					}
					
					document.getElementById("directionsBox").innerHTML = directionsHTML
					view.graphics.removeAll();
					view.graphics.add(chosenRoute);
					view.goTo(chosenRoute.geometry.extent)

					
				}
			}) 
		    
//			route.solve(routeUrl, routeParams).catch(function(data){
//				alert('Cannot find route between these two points')
//			})
	}
	
    window.changeEntrances = function(entranceMode) {
		if (entranceMode == "all") {
			entQuery = ""
			stopArray1 = stopArray1.concat(stopArray1Removed)
			stopArray2 = stopArray2.concat(stopArray2Removed)
			
			routeResults(stopArray1,stopArray2)
			
		}else {
			entQueryForFilter = "(WAYF_UID = '" + poid1 + "' OR WAYF_UID = '" + poid2 + "')" + " AND "  + "ACCESSIBLE = '0'"
			entQuery = " AND (ACCESSIBLE = '1' OR ACCESSIBLE IS NULL)"
			const query = new Query();
			query.where = entQueryForFilter;
			query.returnGeometry = true;
			query.outFields = ["WAYF_UID"];
	
			crosswalkTable.queryFeatures(query).then(function(results){

				if (results.features.length > 1) {
					
				//Go through the results and push the stops into an array 
				for (i = 0; i < results.features.length; i++) {
				   
					
				   const stop = { geometry: { x: results.features[i].geometry.longitude, y: results.features[i].geometry.latitude}}
					stopArray2Removed = stopArray2.filter(function(item){ return item.geometry.x == stop.geometry.x && item.geometry.y == stop.geometry.y})
					
				   	stopArray2 = stopArray2.filter(function(item){ return item.geometry.x !== stop.geometry.x && item.geometry.y != stop.geometry.y})
					
					stopArray1Removed = stopArray1.filter(function(item){ return item.geometry.x == stop.geometry.x && item.geometry.y == 
					stop.geometry.y})
					
					stopArray1 = stopArray1.filter(function(item){ return item.geometry.x !== stop.geometry.x && item.geometry.y != stop.geometry.y})
					
				}
				
			//Otherwise just push the single one into the array
			}else if (results.features.length == 1) {
				const stop = { geometry: { x: results.features[0].geometry.longitude, y: results.features[0].geometry.latitude}}
				
				stopArray2Removed = stopArray2.filter(function(item){ return item.geometry.x == stop.geometry.x && item.geometry.y == stop.geometry.y})
				
				stopArray2 = stopArray2.filter(function(item){ return item.geometry.x !== stop.geometry.x && item.geometry.y != stop.geometry.y})
				
				stopArray1Removed = stopArray1.filter(function(item){ return item.geometry.x == stop.geometry.x && item.geometry.y == 
				stop.geometry.y})
				
				stopArray1 = stopArray1.filter(function(item){ return item.geometry.x !== stop.geometry.x && item.geometry.y != stop.geometry.y})
			}

			return [stopArray1,stopArray2]
			}).then(function(stopResultArray){
				if (directionsMode) {
					routeResults(stopResultArray[0],stopResultArray[1])
				}
			
			})
		}
	}
	
	//webmap.portalItem.id = highContrastPortalID
	window.switchBasemaps = function() {
		if (webmap.portalItem.id == basemapPortalID) {
			var webmap2 = new WebMap({
				portalItem: {
				  id: highContrastPortalID
				}
			 });
			view.map = webmap2 
			webmap = webmap2
		}else {
			var webmap3 = new WebMap({
				portalItem: {
				  id: basemapPortalID
				}
			 });
			view.map = webmap3 
			webmap = webmap3
		}
	}
	
	function isOpen(openTime, closeTime) {
	 
	  // handle special case
	  if (openTime === "24HR") {
		return "open";
	  }

	  // get the current date and time in the given time zone
	  const now = moment.tz(timezone);

	  // Get the exact open and close times on that date in the given time zone
	  // See https://github.com/moment/moment-timezone/issues/119
	  const date = now.format("YYYY-MM-DD");
	  const storeOpenTime = moment.tz(date + ' ' + openTime, "YYYY-MM-DD h:mmA", timezone);
	  const storeCloseTime = moment.tz(date + ' ' + closeTime, "YYYY-MM-DD h:mmA", timezone);

	  let check;
	  if (storeCloseTime.isBefore(storeOpenTime)) {
		// Handle ranges that span over midnight
		check = now.isAfter(storeOpenTime) || now.isBefore(storeCloseTime);
	  } else {
		// Normal range check using an inclusive start time and exclusive end time
		check = now.isBetween(storeOpenTime, storeCloseTime, null, '[)');
	  }
	
	  return check ? "Open" : "Closed";
	}
	//TODO: fringe cases such as Summer, By Appointmnent
	function openOrClosed(hoursList) {
		
		currentDate = new Date() 
		
		
		daysDict = {"Sun":0,"M":1,"Tu":2,"W":3,"Th":4,"F":5,"Sat":6}
		statusDict = {"Sun":"","M":"","Tu":"","W":"","Th":"","F":"","Sat":""}
		days = []
		statusList = []
		for (t=0; t < hoursList.length; t++) {
			if (hoursList[t].split(": ")[1].includes("Closed") == false) {
				openFromTo = hoursList[t].split(": ")[1].split("-")
				if (hoursList[t].split(": ")[0] == "Daily") {
					status = isOpen(openFromTo[0],openFromTo[1])
						Object.keys(statusDict).forEach(key => {
					  statusDict[key] = status;
					});
				}else {
					if (hoursList[t].split(": ")[0].includes(",")){
						
						dayRange = hoursList[t].split(": ")[0].split(",")
						for (var n=0; n < dayRange.length; n++) {
							hoursList.push(dayRange[n].trim() + ": " + hoursList[t].split(": ")[1])
						}
					}
					else if (hoursList[t].split(": ")[0].includes("-")) {
						dayRange = hoursList[t].split(": ")[0].split("-")
						startDay = daysDict[dayRange[0].trim()]
						endDay = daysDict[dayRange[1].trim()]
						if (startDay < endDay) {
							for (var i = startDay; i <= endDay; i++) {
								daydesc = Object.keys(daysDict).find(key => daysDict[key] === i)
								
								statusDict[daydesc] = isOpen(openFromTo[0],openFromTo[1])
							}
						}else {
							for (var i = startDay; i <= 6; i++) {
								daydesc = Object.keys(daysDict).find(key => daysDict[key] === i)
								statusDict[daydesc] = isOpen(openFromTo[0],openFromTo[1])
							}
							for (var i = 0; i <= endDay; i++) {
								daydesc = Object.keys(daysDict).find(key => daysDict[key] === i)
								statusDict[daydesc] = isOpen(openFromTo[0],openFromTo[1])
							}
						}
					}
					else if (hoursList[t].split(": ")[0].includes("Sun")) {
						statusDict["Sun"] = isOpen(openFromTo[0],openFromTo[1])
					}
					else if (hoursList[t].split(": ")[0].includes("M")) {
						statusDict["M"] = isOpen(openFromTo[0],openFromTo[1])
					} 
					else if (hoursList[t].split(": ")[0].includes("Tu")) {
						statusDict["Tu"] = isOpen(openFromTo[0],openFromTo[1])
					}
					else if (hoursList[t].split(": ")[0].includes("W")) {
						statusDict["W"] = isOpen(openFromTo[0],openFromTo[1])
					}
					else if (hoursList[t].split(": ")[0].includes("Th")) {
						statusDict["Th"] = isOpen(openFromTo[0],openFromTo[1])
					}
					else if (hoursList[t].split(": ")[0].includes("F")) {
						statusDict["F"] = isOpen(openFromTo[0],openFromTo[1])
					}
					else if (hoursList[t].split(": ")[0].includes("Sat")) {
						statusDict["Sat"] = isOpen(openFromTo[0],openFromTo[1])
					}
				}
			}
		}
		now = moment.tz(timezone);
		today = now.day()
		todaydesc = Object.keys(daysDict).find(key => daysDict[key] === today)
		return statusDict[todaydesc]
	}
	
	

})
