/*global $*/
/*global require*/
/*global console*/
/*global document*/

//ESRI modules used
require(["esri/Graphic","esri/config","esri/WebMap","esri/views/MapView","esri/widgets/Search", "esri/layers/RouteLayer","esri/rest/support/PolygonBarrier","esri/rest/support/FeatureSet","esri/rest/support/PointBarrier","esri/rest/support/RouteParameters","esri/rest/route","esri/layers/FeatureLayer","esri/rest/support/Query","esri/rest/support/Stop","esri/rest/support/RouteInfo","esri/core/Collection","esri/rest/support/TravelMode","esri/rest/networkService","esri/rest/support/DirectionPoint","esri/PopupTemplate","esri/widgets/LayerList","esri/widgets/Legend","esri/widgets/Locate","esri/widgets/Track","esri/widgets/Expand","esri/core/watchUtils","esri/geometry/Point","./config.js"]
, function (Graphic,esriConfig,WebMap,MapView,Search,RouteLayer,PolygonBarrier,FeatureSet,PointBarrier,RouteParameters,route,FeatureLayer,Query,Stop,RouteInfo,Collection,TravelMode,networkService,DirectionPoint,PopupTemplate,LayerList,Legend,Locate,Track,Expand,watchUtils,Point,config) {

	//API key and portal URL 
    esriConfig.apiKey = "AAPK276cbb0d0adb46dd84559e3cc629b9ecltTU1snes6ZLNVPJfKUtP-Fy__eVTdXbkAxnPvlbd9t8BwVyimdY_FonEXjhEnCg";
	esriConfig.portalUrl = "https://portal.gis.ubc.ca/arcgis";
	
	//Global variables associated with setting the travel mode 
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
	var alerted = false
	
	//Default basemap 
	var webmap = new WebMap({

        portalItem: {
          id: basemapPortalID
        }
     });
	
	//Crosswalk table, used to associate a POI with an entrance 
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
	
	//Load in the clickable points of interest
	var poiFL = new FeatureLayer({
		url:poiForBasemapUrl,
		listMode: 'hide',
		popupEnabled:true,
		index:2
	})
	
	//Load in the clickable polygons of interest (ie building footprints)
	var poiPoly = new FeatureLayer({
		url:poiPolyUrl,
		popupEnabld:true,
		index:0
	})
	view.map.add(poiPoly)
	view.map.add(poiFL)
	
	//Slopes that have been identified as steep:
	//TODO we want these to appear when the accessible travel mode is selected
	var slopeFL = new FeatureLayer({
		portalItem: {
			id: steepSlopeSegmentPortalID
		},
		title:"Steep slopes",
		visible: false,
		popupEnabled:false
	})
	view.map.add(slopeFL)
	
	//The POIs that are used in the search bar, now these are the same as the 
	//POIs that appear on the map 
	var unifiedFL = new FeatureLayer({
		url: poiForSearchUrl
	})
	
	//A large polygon over the University Endowment Lands, used
	//to geofence the tracking app and only enable it when the user
	//is on campus. 
	var boundaryFL = new FeatureLayer({
		portalItem: {
			id: UELBoundaryPortalID
		}
	})

	//Construction point barriers
	var pointBarrierfl = new FeatureLayer({
		portalItem: {
			id: pointBarrierPortalID
		}
	})
	
	//Go through the point barrier feature layer 
	pointBarrierfl.queryFeatures().then(function(results){
	  // prints the array of result graphics to the console
	 
	  pointBarriers = []
	 	
		//And turn them all into point barrier objects, push these into a list 
		for (i = 0; i < results.features.length; i++) {
			
			aBarrier = new PointBarrier({ geometry: results.features[i].geometry})

			aBarrier.barrierType = 'restriction'
			pointBarriers.push(aBarrier)
		}
		
	})
	
	//Initialize the tracking widget
	var track = new Track({
          view: view,
		  visible:true,
		  useHeadingEnabled: false,
		  goToLocationEnabled:false,
		  arialabel:"Start tracking location",
		  role:"Button"
     });
	
	
	//Create a directions action for the popup
	const directionsAction = {
	  title: "Directions",
	  id: "directions",
	  image: "svgs/noun-route-939679.svg"
	};
	
	//Set the popup parameters 
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
	//Position the popup in the bottom left of the screen 
	view.popup.set("dockOptions", {
              breakpoint: false,
              buttonEnabled: false,
              position: 'bottom-left'
    });
	
	//Popup templating, to craete a custom popup
	function popupTemplating(feature) {
		const div = document.createElement("div");
		//Depending on how the data is stored, attributes might be lowercase or uppercase so we account for both with ?
		let photourl = (feature.graphic.attributes.photourl === undefined ? feature.graphic.attributes.PHOTOURL : feature.graphic.attributes.photourl)
		
		let location = (feature.graphic.attributes.location === undefined ? feature.graphic.attributes.LOCATION : feature.graphic.attributes.location)
		
		let url = (feature.graphic.attributes.url === undefined ? feature.graphic.attributes.URL : feature.graphic.attributes.url)
		
		let hours = (feature.graphic.attributes.hours === undefined ? feature.graphic.attributes.HOURS : feature.graphic.attributes.hours)
		
		let contact = (feature.graphic.attributes.contact === undefined ? feature.graphic.attributes.CONTACT : feature.graphic.attributes.contact)
		
		//Now either leave the HTML blank if the attribute is null, or populate it with the appropriate data
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
		//Append all the strings together and set to the popups div
		div.innerHTML = photoHTML + locHTML + urlHTML + statusHTML + hoursHTML + contactHTML//'<hr style="width:100%;height:25px;background-color:#002145;text-align:left;margin-left:0;margin-top:0">' + 
		return div;
	}
	//Now set the popup template to the one defined above
	popupTemplate = {title:"{PLACENAME}",
					  outFields: ["*"],
					 content:popupTemplating
					}
	//Set the POIs and building polygons to use the custom popup template. 
	poiPoly.popupTemplate = popupTemplate
	poiFL.popupTemplate = popupTemplate
	
	
	view.popup.on("trigger-action", (event) => {
		  //Create an action that will start directing the user to the popups location
		  if (event.action.id === "directions") {
			  window.toggleDirections()
			  //If the user has clicked the destination box put the popup as the desination
			  if (destFocus) {
				  searchWidget2.searchTerm = view.popup.title	
			  }
			  //Otherwise set it as the origin
			  if (originFocus) {
				  searchWidget1.searchTerm = view.popup.title	
			  }
			  //If the other search term is already filled in, and we haven't searched yet, fire the search. 
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
	
	//Function to grab one of the travel modes
	async function getTravelMode(fMode) {
		
   		const serviceDescription = await networkService.fetchServiceDescription(routeUrl);
		const { supportedTravelModes } = serviceDescription;
		return tMode = supportedTravelModes.find((mode) => mode.name === fMode);
	}
	
	//Function that fires when thecustom navigation modes are being turned on and off
	window.changeTravelModeAccess = function(){
		//If simplify route is checked add this to the string 
		if (document.getElementById("simplify").checked == true) {
			simplifyStr = " Simplified"
		}else {
			simplifyStr = ""
		}
		//If no slope is checked add this to the string 
		if (document.getElementById("noSlope").checked == true) {
			steepStr = " No Slopes"
		}else {
			steepStr = ""
		}
		//Add these strings to the base mode to get the compelte travel mode
		theMode = baseMode + steepStr + simplifyStr
		
		//Then route the results using this travel mode. 
		getTravelMode(theMode).then(function()
		{
			if (stopArray1.length > 0 && stopArray2.length > 0) {
				routeResults(stopArray1,stopArray2)
		 }
			
		})
	}
	//Function that fires when the base travel mode buttons are clicked 
	window.changeTravelMode = function(bMode){
		baseMode = bMode
		theMode = baseMode + steepStr + simplifyStr
		//For each mode, we need to style the buttons and then get the button modes, 
		//And change the available entrances to either all or only accessible. 
		if (baseMode == "Walking"){
			document.getElementById("walkButton").style.backgroundColor = "#0680A6"
			document.getElementById("accessButton").style.backgroundColor = ""
			document.getElementById("bikeButton").style.backgroundColor = ""
			document.getElementById("driveButton").style.backgroundColor = ""
			
			getTravelMode(theMode).then(function() {
				changeEntrances("all")
			})

			
		}
		if (baseMode == "Accessible"){
			document.getElementById("walkButton").style.backgroundColor = ""
			document.getElementById("accessButton").style.backgroundColor = "#0680A6"
			document.getElementById("bikeButton").style.backgroundColor = ""
			document.getElementById("driveButton").style.backgroundColor = ""
			
			getTravelMode(theMode).then(function() {
				changeEntrances("accessible")
			})
		}
		if (baseMode == "Biking"){
			document.getElementById("walkButton").style.backgroundColor = ""
			document.getElementById("accessButton").style.backgroundColor = ""
			document.getElementById("bikeButton").style.backgroundColor = "#0680A6"
			document.getElementById("driveButton").style.backgroundColor = ""
			getTravelMode(theMode).then(function() {
				changeEntrances("all")
			})
			
		}
		if (baseMode == "Driving"){
			document.getElementById("walkButton").style.backgroundColor = ""
			document.getElementById("accessButton").style.backgroundColor = ""
			document.getElementById("bikeButton").style.backgroundColor = ""
			document.getElementById("driveButton").style.backgroundColor = "#0680A6"
			getTravelMode(theMode).then(function() {
				changeEntrances("all")
			})
			
		}
	}
	
	//By default the travel mode box is hidden
	document.getElementById('travelmodeBox').style.display = 'none'
	//Function that fires when the direction button is clicked
	window.toggleDirections = function() {
		
		if (document.getElementById('travelmodeBox').style.display == 'none') {
			//Display the travel mode box
			document.getElementById('travelmodeBox').style.display = 'flex'
			document.getElementById('directionsButton').style.backgroundColor = "#0680A6"
			//Show the second search widget (Destination)
			searchWidget2.visible = true
			//And the box that displays the written directons
			directionsExpand.visible = true
			directionsMode = true
			
		}else {
			//Otherwise rehide all the elements that appear in the above step
			document.getElementById('travelmodeBox').style.display = 'none'
			document.getElementById('directionsButton').style.backgroundColor = ""
			searchWidget2.visible = false
			directionsExpand.visible = false
			//And clear the second search widget / directions, remove the route from the map. 
			searchWidget2.clear()
			document.getElementById("directionsBox").innerHTML = ""
			view.graphics.removeAll();
			directionsMode = false
		}
		
	}
	
	
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
			placeholder:"Search for a place",
			searchFields: ["placename","placename2","code"],
  			displayField:  "placename",
			name: "POI Seach",
  			exactMatch: false,
			outFields: ["*"],
			maxSuggestions: 6
		}],
		locationEnabled: false,
		popupEnabled: true,
		container:"searchBoxes",
		resultGraphicEnabled:true
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
			searchFields: ["placename","placename2","code"],
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
	
	//Remove the zoom buttons from the UI
	view.ui.remove("zoom");
	
	//Create the HTML for the additional custom navigation settings, the check boxes.  
	settingsDiv = document.createElement("div")
	settingsDiv.id = "accessBox"
	settingsDiv.style.visibility = 'block'
	settingsDiv.innerHTML = '<hr style="width:100%;height:25px;background-color:#002145;text-align:left;margin-left:0;margin-top:0"><div style="padding-left:5px"><b style="font-size:16px">Custom Navigation</b><br><input type="checkbox" id="noSlope" name="noSlope" value="NoSlope" onclick="window.parent.changeTravelModeAccess()"><label for="NoSlope">Avoid steep slopes</label><br><input type="checkbox" id="simplify" name="simplifyR" value="simplifyR" onclick="window.parent.changeTravelModeAccess()"><label for="accessE">Simplify route</label><br><b style="font-size:16px">Navigation Aids</b><br><input type="checkbox" id="highcont" name="highcont" value="HighContrast" onclick="window.parent.switchBasemaps()"><label for="HighContrast">High Contrast Visibility</label><br></div>'
	
	//Put the above html into an expand widget so it can be expanded and collapsed on click
	settingsExpand = new Expand({
		view: view,
		expandIconClass:"esri-icon-settings2",
		expandTooltip: "Show additional accessibility settings",
	  	content: settingsDiv,
	    mode: "floating",
		arialabel:"Show additional accessibility settings",
		role:"Button"
	});
	
	//Add the settings expand to the UI. 
	view.ui.add(settingsExpand, {
		position: "top-left",
		index: 5,
		
	});	
	
	//Create the div that will contain the written directions 
	directionsDiv = document.createElement("div")
	directionsDiv.id = "directions"
	directionsDiv.style.visibility = 'block'
	directionsDiv.innerHTML = '<hr style="width:100%;height:25px;background-color:#002145;text-align:left;margin-left:0;margin-top:0"><div id="directionsBox" style="padding-left:5px"></div>'
	
	//Put the above html into an expand widget so it can be expanded and collapsed on click
	directionsExpand = new Expand({
		view: view,
		expandIconClass:"esri-icon-documentation",
		expandTooltip: "Show written directions",
	  	content: directionsDiv,
		mode: "floating",
		visible: false
	});
	
	//Add the directions expand to the UI
	view.ui.add(directionsExpand, {
		position: "top-left",
		index: 5,
		
	});	
	 //Add the track widget to the UI
	 view.ui.add(track, {
		 position: "top-left",
		 useHeadingEnabled: false, // Don't change orientation of the map
		 
	 })
	
	//The routing is only on the UBC campus, so we want to geofence it.
	track.on("track", function(event) {
		
		//Check to see if the users location intersects with the polygon of the UEL
		boundaryquery = new Query();
  		boundaryquery.geometry = track.graphic.geometry;  
  		boundaryquery.spatialRelationship = "intersects";
		boundaryFL.queryFeatures(boundaryquery).then(function(results) {
			if (results.features.length > 0) {
				//If we're on campus enable the tracking
				track.goToLocationEnabled = true
			}else {
				//Otherwise display the message
				track.goToLocationEnabled = false
				alert('Tracking is only available on the UBC Vancouver Campus')
				track.stop()
			}
		});
	})
	 //Ensures that only one expand widget can be shown at a time, otherwise they overlap. 
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
	
	//We also want to collapse the expand widgets when autocomplete results are shown, oterwise they overlap.
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
		//If we're just searching we don't need directions 
		if (directionsMode == false) {
			view.graphics.removeAll();
			directionsHTML = ""
		}
		//If we're in directions mode we want to zoom to the whole route rather than the search location, so we turn 
		//on the goToOverride 
		if (directionsMode && searchWidget2.goToOverride == true) {
			searchWidget1.goToOverride = true
		//But if we're in search mode we do want to zoom to the search point. 
		}else {
			searchWidget1.goToOverride = false
		}
		
		//Reset the stop arrays
		stopArray1 = []
		stopArray1Removed = []
		
		//If more than one search result is returned match it with the popup title 
		if (result.results[0].results.length > 1) {
			for (i=0; i < result.results[0].results.length; i++) {
				
				if (view.popup.title == result.results[0].results[i].feature.attributes.PLACENAME) {
					origname = result.results[0].results[i].feature.attributes.PLACENAME
					poid1 = result.results[0].results[i].feature.attributes.WAYF_UID
				}
			}
			
		//Otherwise set the origname and poid from the search result 
		}else {
			origname = result.results[0].results[0].feature.attributes.PLACENAME
			poid1 = result.results[0].results[0].feature.attributes.WAYF_UID
		}
		//Grab the ID of the searched term and create a query
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
		
		//We never want to go to the location of the destination search
		searchWidget2.goToOverride = true
		
		//Reset the stop arrays
		stopArray2 = []
		stopArray2 = []
		stopArray2Removed = []
		
		//Grab the destination name and point of interest id
		destname = result.results[0].results[0].feature.attributes.PLACENAME
		poid2 = result.results[0].results[0].feature.attributes.WAYF_UID
		
		//Create a query
		const query = new Query();
		query.where = "WAYF_UID = " + "'" + poid2 + "'"  + entQuery;
		query.returnGeometry = true;
		query.outFields = ["WAYF_UID"];
		//This creates a promise that querys the data and populates the list 								 
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
		//Then, test the route of all these results 
		}).then(function(stopResultArray){
			if (directionsMode) {
				routeResults(stopArray1,stopResultArray)
			}
			
			})
			

	});
	
	//Keep track of whichs earch widget the user has clicked on 
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
			//We want to add the construction barriers to the route layer 
			routeLayer.pointBarriers = pointBarriers
			//Set the route parameters, using the correct travel mode, routing layer with barriers and the chosen
			//origin and destination stops
			const routeParams = new RouteParameters({
				returnRoutes: true,
				returnDirections: true,
				directionsOutputType: "standard",
				outputLines: "true-shape-with-measure",
				travelMode: tMode,
				
				layer: routeLayer,  
				directionsLengthUnits: "meters",
				
				stops: new Collection([
					new Stop({ name: origname, geometry: { x:stop1["geometry"]['x'], y: stop1["geometry"]['y'] }}),
					new Stop({ name: destname, geometry: { x:stop2["geometry"]['x'], y: stop2["geometry"]['y'] }})
				])
			})
			
			//Initialize the lists
			routeLengths = []
			routeObjects = []
			routeDirections = []
		    routeParams.pointBarriers = routeLayer.pointBarriers
			
			//Solve the route, if successful it goes into this block of code
			route.solve(routeUrl, routeParams).then(function(data) {
				
				var routeLength = 0
				//Route between all combination of origin and destination entrances
				data.routeResults.forEach(function(result) { 
					//Keep track of the length of each of these
					routeLengths.push(result.route.attributes.Total_Length)
					routeObjects.push(result.route)
					routeDirections.push(result.directions.features)
	
				})
				//If we've collected all the routes
				if (routeLengths.length == n) {
					//Chose the shortest route based on length, also grab it's associated directions 
					var chosenRoute = routeObjects[routeLengths.indexOf(Math.min.apply(Math, routeLengths))]
					var chosenDirections = routeDirections[routeLengths.indexOf(Math.min.apply(Math, routeLengths))]
					
					//Symbolize the line that is drawn for the route
					chosenRoute.symbol = {
					  type: "simple-line",
					  color: [5, 150, 255],
					  width: 3
					};
				
					directionsHTML = ''
					
					//Go through the returned directions and place gthem into the directions box, along with some 
					//custom changes to the HTML
					for (i=0; i < chosenDirections.length; i++) {
						
						lengthnum = Math.round(chosenDirections[i].attributes.length)

						if (i !=0 && i != chosenDirections.length - 1 && !chosenDirections[i].attributes.text.includes("then")) {

							directionsHTML += chosenDirections[i].attributes.text + " and continue for " + lengthnum.toString() + " metres <br>" + "<br>"
						}else{
							directionsHTML += chosenDirections[i].attributes.text + "<br>" + "<br>"
						}
					}
					
					document.getElementById("directionsBox").innerHTML = directionsHTML
					
					//Remove the previous route and
					view.graphics.removeAll();
					//Draw the chosen route
					view.graphics.add(chosenRoute);
					//And zoom to it's extent
					view.goTo(chosenRoute.geometry.extent)

					
				}
			}) 
		    //If the routing fails, display a message 
			route.solve(routeUrl, routeParams).catch(function(data){
				
				alert('Cannot find route between these two location')
			
				
			})
	}
	//Function that changes the entrances between accessible only and all
    window.changeEntrances = function(entranceMode) {
		
		//If we can route to all entrances
		if (entranceMode == "all") {
			//We don't need a query to filer
			entQuery = ""
			//And we can add back any non accessible entrances that were removed
			stopArray1 = stopArray1.concat(stopArray1Removed)
			stopArray2 = stopArray2.concat(stopArray2Removed)
			//And then we can reroute
			routeResults(stopArray1,stopArray2)
		//If we are only routing to accessible entrances
		}else {
			//We need a query to remove the non accessible entrances
			entQueryForFilter = "(WAYF_UID = '" + poid1 + "' OR WAYF_UID = '" + poid2 + "')" + " AND "  + "ACCESSIBLE = '0'"
			//And a query to select the accessible entrances or points that are not entrances (NULL) (such as a park) 
			entQuery = " AND (ACCESSIBLE = '1' OR ACCESSIBLE IS NULL)"
			//Set up a query with the entrances that we want to remove
			const query = new Query();
			query.where = entQueryForFilter;
			query.returnGeometry = true;
			query.outFields = ["WAYF_UID"];
	
			crosswalkTable.queryFeatures(query).then(function(results){
				//If we have entrances that need to be removed
				if (results.features.length > 1) {
					
				//Go through the results and push the stops into an array 
				for (i = 0; i < results.features.length; i++) {
				   
					//Organize them into stops that have been removed, sot hat they can be added back later, and also the new list of accessible only stops 
				   const stop = { geometry: { x: results.features[i].geometry.longitude, y: results.features[i].geometry.latitude}}
					stopArray2Removed = stopArray2.filter(function(item){ return item.geometry.x == stop.geometry.x && item.geometry.y == stop.geometry.y})
					
				   	stopArray2 = stopArray2.filter(function(item){ return item.geometry.x !== stop.geometry.x && item.geometry.y != stop.geometry.y})
					
					stopArray1Removed = stopArray1.filter(function(item){ return item.geometry.x == stop.geometry.x && item.geometry.y == 
					stop.geometry.y})
					
					stopArray1 = stopArray1.filter(function(item){ return item.geometry.x !== stop.geometry.x && item.geometry.y != stop.geometry.y})
					
				}
				
			//Otherwise just push the single stop into the array
			}else if (results.features.length == 1) {
				const stop = { geometry: { x: results.features[0].geometry.longitude, y: results.features[0].geometry.latitude}}
				
				stopArray2Removed = stopArray2.filter(function(item){ return item.geometry.x == stop.geometry.x && item.geometry.y == stop.geometry.y})
				
				stopArray2 = stopArray2.filter(function(item){ return item.geometry.x !== stop.geometry.x && item.geometry.y != stop.geometry.y})
				
				stopArray1Removed = stopArray1.filter(function(item){ return item.geometry.x == stop.geometry.x && item.geometry.y == 
				stop.geometry.y})
				
				stopArray1 = stopArray1.filter(function(item){ return item.geometry.x !== stop.geometry.x && item.geometry.y != stop.geometry.y})
			}

			return [stopArray1,stopArray2]
			//Then route using the new filtered stopArrays
			}).then(function(stopResultArray){
				if (directionsMode) {
					routeResults(stopResultArray[0],stopResultArray[1])
				}
			
			})
		}
	}
	
	//Function to switch between the high contrast basemap and the regular basemap
	window.switchBasemaps = function() {
		if (webmap.portalItem.id == basemapPortalID) {
			var webmap2 = new WebMap({
				portalItem: {
				  id: highContrastPortalID
				}
			 });
			//We need to re add the features to it as well
			view.map = webmap2 
			poiFL.url = poiForHighContrastUrl
			view.map.add(poiFL)
			view.map.add(poiPoly)
			webmap = webmap2
		}else {
			var webmap3 = new WebMap({
				portalItem: {
				  id: basemapPortalID
				}
			 });
			//We need to re add the features to it as well
			view.map = webmap3 
			poiFL.url = poiForBasemapUrl
			view.map.add(poiFL)
			view.map.add(poiPoly)
			webmap = webmap3
		}
	}
	//Function that displays a live status of whether or not a building is open or closed, uses external library
	//moment-timezone-with-data.min.js"></
	timezone = "America/Vancouver"
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
		
		//Set up an index for each day, and a dictionary to track the status of each day
		daysDict = {"Sun":0,"M":1,"Tu":2,"W":3,"Th":4,"F":5,"Sat":6}
		statusDict = {"Sun":"","M":"","Tu":"","W":"","Th":"","F":"","Sat":""}
		days = []
		statusList = []
		//Iterate though the hours list
		for (t=0; t < hoursList.length; t++) {
			//If the building isn't closed all day
			if (hoursList[t].split(": ")[1].includes("Closed") == false) {
				//Parse out the opening and closing hour
				openFromTo = hoursList[t].split(": ")[1].split("-")
				//If we see the keyword Daily, the building has 
				//the same opening and closing hours 7 days a week 
				if (hoursList[t].split(": ")[0] == "Daily") {
					//So we can go through all the days of the week with the same stsatus
					status = isOpen(openFromTo[0],openFromTo[1])
						Object.keys(statusDict).forEach(key => {
					  statusDict[key] = status;
					});
				//Otherwise the building has different hours depending on the day
				}else {
					//If we see a comma, it is indicating several distinct days (eg. M,W,F) 
					if (hoursList[t].split(": ")[0].includes(",")){
						//Split out these days 
						dayRange = hoursList[t].split(": ")[0].split(",")
						//And for each one grab it's associated hours 
						for (var n=0; n < dayRange.length; n++) {
							hoursList.push(dayRange[n].trim() + ": " + hoursList[t].split(": ")[1])
						}
					}
					//Otherwise if see a dash, it is indicating a day range (eg. M-F)
					else if (hoursList[t].split(": ")[0].includes("-")) {
						dayRange = hoursList[t].split(": ")[0].split("-")
						//Pull out the start day and end day
						startDay = daysDict[dayRange[0].trim()]
						endDay = daysDict[dayRange[1].trim()]
						//If the range doesn't overlap to a new week (Eg. M-W)
						if (startDay < endDay) {
							//Count through the days and calculate the status for each 
							for (var i = startDay; i <= endDay; i++) {
								daydesc = Object.keys(daysDict).find(key => daysDict[key] === i)
								
								statusDict[daydesc] = isOpen(openFromTo[0],openFromTo[1])
							}
						//Otherwise if it is an odd day range such as (F-M)
						}else {
							//Start at the start date and go to the end of the week
							for (var i = startDay; i <= 6; i++) {
								daydesc = Object.keys(daysDict).find(key => daysDict[key] === i)
								statusDict[daydesc] = isOpen(openFromTo[0],openFromTo[1])
							}
							//Then start on the next week and go tot he end day
							for (var i = 0; i <= endDay; i++) {
								daydesc = Object.keys(daysDict).find(key => daysDict[key] === i)
								statusDict[daydesc] = isOpen(openFromTo[0],openFromTo[1])
							}
						}
					}
					//Otherwise it is simply a unique day, so just check for the key word. 
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
		//Account for daylight savings time using timezone 
		now = moment.tz(timezone);
		//Grab the appropriate day
		today = now.day()
		todaydesc = Object.keys(daysDict).find(key => daysDict[key] === today)
		//And use this to access the correct status 
		return statusDict[todaydesc]
	}
	
	

})
