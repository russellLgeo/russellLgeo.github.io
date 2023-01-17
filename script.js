/*global $*/
/*global d3*/
/*global require*/
/*global console*/
/*global document*/
var accessibleOn = false
var layerOn = false



//var infoboxsvg = d3.select("#directionsButton").append("svg")
//    .attr("id","theinfoboxcontrols")
//	.attr("height",50)
//	.attr("width",35)
// 	.attr("style", "outline-color: black")
//	.attr("style","outline-style:soild")

//ESRI modules used
require(["esri/Graphic","esri/config","esri/WebMap","esri/views/MapView","esri/widgets/Search","esri/widgets/Directions","esri/widgets/Directions/DirectionsViewModel", "esri/layers/RouteLayer","esri/rest/support/PolygonBarrier","esri/rest/support/FeatureSet","esri/rest/support/PointBarrier","esri/rest/support/RouteParameters","esri/rest/route","esri/layers/FeatureLayer","esri/rest/support/Query","esri/rest/support/Stop","esri/rest/support/RouteInfo","esri/core/Collection","esri/rest/support/TravelMode","esri/rest/networkService","esri/rest/support/DirectionPoint","esri/PopupTemplate","esri/widgets/LayerList","esri/widgets/Legend","esri/widgets/Locate","esri/widgets/Track"]
, function (Graphic,esriConfig,WebMap,MapView,Search,Directions,DirectionsVM,RouteLayer,PolygonBarrier,FeatureSet,PointBarrier,RouteParameters,route,FeatureLayer,Query,Stop,RouteInfo,Collection,TravelMode,networkService,DirectionPoint,PopupTemplate,LayerList,Legend,Locate,Track) {

	directionsMode = false
	//API key and portal URL 
    esriConfig.apiKey = "AAPK276cbb0d0adb46dd84559e3cc629b9ecltTU1snes6ZLNVPJfKUtP-Fy__eVTdXbkAxnPvlbd9t8BwVyimdY_FonEXjhEnCg";
	esriConfig.portalUrl = "https://portal.gis.ubc.ca/arcgis";
	
	const synth = window.speechSynthesis;
	const routeUrl = 'https://ags.gis.ubc.ca/arcgis/rest/services/Multimodal/NAServer/Route'
	const routePortalID = "b1846c8638bb4d679bd06f120c87825b"
	const routesWithSlopeLayerID = "0da466c9966f437080710bb40c58741c"
	const poiForBasemapUrl = "https://ags.gis.ubc.ca/arcgis/rest/services/Hosted/ubcv_poi_POI_view/FeatureServer/0"
	const unifiedflUrl = "https://ags.gis.ubc.ca/arcgis/rest/services/Wayfinding/ubcv_wayfinding_test/FeatureServer/1"
	const crosswalkUrl = "https://ags.gis.ubc.ca/arcgis/rest/services/Wayfinding/ubcv_wayfinding_test/FeatureServer/0"
	const basemapPortalID = "c60119036d11407596d92bb1b9dc23c8"
	const highContrastPortalID = "c55e159550dd4499b43b234ab1f32736"
	const constructionPortalID = "d4c7d27ddfb84795a93f83e65f707dac"
	
	//Basemap 
	var webmap = new WebMap({
        portalItem: {
          id: highContrastPortalID
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
		//layers: [routeLayer,crosswalkTable],
        container: "viewDiv",
    });
//	

//	
//	var polyBarrierfl = new FeatureLayer({
//		portalItem: {
//			id: constructionPortalID
//		},
//		visible: false,
//		popupEnabled: false
//		
//	})
//	
//	var poiFL = new FeatureLayer({
//		url:poiForBasemapUrl,
//		//url: poiForBasemapUrl,
//		listMode: 'hide',
//		popupEnabled:true
//	})
//	
//	var slopeFL = new FeatureLayer({
//		portalItem: {
//			id: routesWithSlopeLayerID
//		},
//		visible: false,
//		popupEnabled:false
//	})
//	
//	var unifiedFL = new FeatureLayer({
//		url: unifiedflUrl
//	})
//	
//	var pointBarrierfl = new FeatureLayer({
//		portalItem: {
//			id: "2cecb4a75ae34b3eb75b742eff0336f2"
//		}
//	})
//	
//	pointBarrierfl.queryFeatures().then(function(results){
//	  // prints the array of result graphics to the console
//	 
//	  pointBarriers = []
//	 
//		for (i = 0; i < results.features.length; i++) {
//			
//			aBarrier = new PointBarrier({ geometry: results.features[i].geometry})
//
//			aBarrier.barrierType = 'restriction'
//			pointBarriers.push(aBarrier)
//		       
//			
//		}
//		
//	})
//	document.getElementById('travelmodeBox').style.display = 'none'
//	window.toggleDirections = function() {
//		
//		if (document.getElementById('travelmodeBox').style.display == 'none') {
//			document.getElementById('travelmodeBox').style.display = 'block'
//			document.getElementById('directionsButton').style.backgroundColor = "#0680A6"
//			document.getElementById("walkButton").style.backgroundColor = "#0680A6"
//			searchWidget2.visible = true
//		}else {
//			document.getElementById('travelmodeBox').style.display = 'none'
//			document.getElementById('directionsButton').style.backgroundColor = ""
//			searchWidget2.visible = false
//			searchWidget2.clear()	
//			
//		}
//	
//	}
//	document.getElementById('accessBox').style.display = 'none'
//	window.toggleAccessBox = function() {
//		
//		if (document.getElementById('accessBox').style.display == 'none') {
//			document.getElementById('accessBox').style.display = 'block'
//			document.getElementById('accessButton').style.backgroundColor = "#0680A6"
//		}else {
//			document.getElementById('accessBox').style.display = 'none'
//			document.getElementById('accessButton').style.backgroundColor = ""
//		}
//	
//	}
//	//Function to grab one of the travel modes
//	async function getTravelMode(theMode) {
//		
//   		const serviceDescription = await networkService.fetchServiceDescription(routeUrl);
//		const { supportedTravelModes } = serviceDescription;
//		return tMode = supportedTravelModes.find((mode) => mode.name === theMode);
//	}
//	
//	//Default travel mode is walking
//    tMode = getTravelMode("Walking")
//
//	window.changeTravelModeAccess = function(){
//		
//		if (document.getElementById("simplify").checked == true) {
//			simplifyStr = " Simplified"
//		}else {
//			simplifyStr = ""
//		}
//		
//		if (document.getElementById("noStairs").checked == true && document.getElementById("noSlope").checked == true ){
//			theMode = "Avoid Stairs and Slopes"
//		}else if (document.getElementById("noStairs").checked == true){
//			theMode = "Avoid Stairs"
//		}else if (document.getElementById("noSlope").checked == true){
//			theMode = "Avoid Slopes"
//		}else {
//			theMode = "Walking"
//		} 
//		if (document.getElementById("noStairs").checked == true || document.getElementById("noSlope").checked == true || document.getElementById("simplify").checked == true){
//			document.getElementById("walkButton").style.backgroundColor = "#0680A6"
//			document.getElementById("bikeButton").style.backgroundColor = ""
//			document.getElementById("driveButton").style.backgroundColor = ""
//		}
//		theMode = theMode + simplifyStr
//		getTravelMode(theMode).then(function()
//		{
//			if (stopArray1.length > 0 && stopArray2.length > 0) {
//				routeResults(stopArray1,stopArray2)
//		 }
//			
//		})
//	}
//	
//	window.changeTravelMode = function(theMode){
//		if (theMode == "Walking"){
//			document.getElementById("walkButton").style.backgroundColor = "#0680A6"
//			document.getElementById("bikeButton").style.backgroundColor = ""
//			document.getElementById("driveButton").style.backgroundColor = ""
//		}
//		if (theMode == "Biking"){
//			document.getElementById("walkButton").style.backgroundColor = ""
//			document.getElementById("bikeButton").style.backgroundColor = "#0680A6"
//			document.getElementById("driveButton").style.backgroundColor = ""
//			document.getElementById("walking").checked = false
//			document.getElementById("noStairs").checked = false
//			document.getElementById("noSlope").checked = false
//		}
//		if (theMode == "Driving"){
//			document.getElementById("walkButton").style.backgroundColor = ""
//			document.getElementById("bikeButton").style.backgroundColor = ""
//			document.getElementById("driveButton").style.backgroundColor = "#0680A6"
//			document.getElementById("noStairs").checked = false
//			document.getElementById("noSlope").checked = false
//			document.getElementById("biking").checked = false
//			document.getElementById("driving").checked = true
//		}
//		
//		getTravelMode(theMode).then(function()
//		{
//			if (stopArray1.length > 0 && stopArray2.length > 0) {
//				routeResults(stopArray1,stopArray2)
//			}
//		})
//		
//		
//	}
//		
//    
//	const directionsAction = {
//	  title: "Directions",
//	  id: "directions",
//	  image: "/noun-route-939679.svg"
//	};
//	
//	view.map.add(polyBarrierfl)
//	view.map.add(poiFL)
//	view.map.add(slopeFL)
//
//	//Popup stuff
//	view.popup = {
//	  dockEnabled: true,
//	  dockOptions: {
//		// Disables the dock button from the popup
//		buttonEnabled: false,
//		// Ignore the default sizes that trigger responsive docking
//		breakpoint: true,
//		//position: 'bottom-left'
//	  },
//	  actions: [directionsAction],
//	  
//	};
//	
//	view.popup.set("dockOptions", {
//              breakpoint: false,
//              buttonEnabled: false,
//              position: 'bottom-left'
//    });
//	
////	layerListDiv = document.createElement('div');
////	layerListDiv.setAttribute("id", "layerListDiv");
////	
////	var layerList = new LayerList({
////		view: view,
////		container:layerListDiv
////	});
//
//    const locate = new Locate({
//		view: view,
//		container:"locationButton",
//	  	useHeadingEnabled: false,
//		visible: false,
//	  	goToOverride: function(view, options) {
//		options.target.scale = 1500;
//		return view.goTo(options.target);
//	  }
//	});
//    //view.ui.add(locate, "top-left");
//	// Adds widget below other elements in the top left corner of the view
//	view.ui.add(layerList, {
//	});
//	originFocus = false
//	destFocus = true
//	
//	prevsterm1 = null
//	prevsterm2 = null
//	
//	timezone = "America/Vancouver"
//	function isOpen(openTime, closeTime) {
//	 
//	  // handle special case
//	  if (openTime === "24HR") {
//		return "open";
//	  }
//
//	  // get the current date and time in the given time zone
//	  const now = moment.tz(timezone);
//
//	  // Get the exact open and close times on that date in the given time zone
//	  // See https://github.com/moment/moment-timezone/issues/119
//	  const date = now.format("YYYY-MM-DD");
//	  const storeOpenTime = moment.tz(date + ' ' + openTime, "YYYY-MM-DD h:mmA", timezone);
//	  const storeCloseTime = moment.tz(date + ' ' + closeTime, "YYYY-MM-DD h:mmA", timezone);
//
//	  let check;
//	  if (storeCloseTime.isBefore(storeOpenTime)) {
//		// Handle ranges that span over midnight
//		check = now.isAfter(storeOpenTime) || now.isBefore(storeCloseTime);
//	  } else {
//		// Normal range check using an inclusive start time and exclusive end time
//		check = now.isBetween(storeOpenTime, storeCloseTime, null, '[)');
//	  }
//	
//	  return check ? "Open" : "Closed";
//	}
//	//TODO: fringe cases such as Summer, By Appointmnent
//	function openOrClosed(hoursList) {
//		
//		currentDate = new Date() 
//		
//		
//		daysDict = {"Sun":0,"M":1,"Tu":2,"W":3,"Th":4,"F":5,"Sat":6}
//		statusDict = {"Sun":"","M":"","Tu":"","W":"","Th":"","F":"","Sat":""}
//		days = []
//		statusList = []
//		for (t=0; t < hoursList.length; t++) {
//			if (hoursList[t].split(": ")[1].includes("Closed") == false) {
//				openFromTo = hoursList[t].split(": ")[1].split("-")
//				if (hoursList[t].split(": ")[0] == "Daily") {
//					status = isOpen(openFromTo[0],openFromTo[1])
//						Object.keys(statusDict).forEach(key => {
//					  statusDict[key] = status;
//					});
//				}else {
//					if (hoursList[t].split(": ")[0].includes(",")){
//						
//						dayRange = hoursList[t].split(": ")[0].split(",")
//						for (var n=0; n < dayRange.length; n++) {
//							hoursList.push(dayRange[n].trim() + ": " + hoursList[t].split(": ")[1])
//						}
//					}
//					else if (hoursList[t].split(": ")[0].includes("-")) {
//						dayRange = hoursList[t].split(": ")[0].split("-")
//						startDay = daysDict[dayRange[0].trim()]
//						endDay = daysDict[dayRange[1].trim()]
//						if (startDay < endDay) {
//							for (var i = startDay; i <= endDay; i++) {
//								daydesc = Object.keys(daysDict).find(key => daysDict[key] === i)
//								
//								statusDict[daydesc] = isOpen(openFromTo[0],openFromTo[1])
//							}
//						}else {
//							for (var i = startDay; i <= 6; i++) {
//								daydesc = Object.keys(daysDict).find(key => daysDict[key] === i)
//								statusDict[daydesc] = isOpen(openFromTo[0],openFromTo[1])
//							}
//							for (var i = 0; i <= endDay; i++) {
//								daydesc = Object.keys(daysDict).find(key => daysDict[key] === i)
//								statusDict[daydesc] = isOpen(openFromTo[0],openFromTo[1])
//							}
//						}
//					}
//					else if (hoursList[t].split(": ")[0].includes("Sun")) {
//						statusDict["Sun"] = isOpen(openFromTo[0],openFromTo[1])
//					}
//					else if (hoursList[t].split(": ")[0].includes("M")) {
//						statusDict["M"] = isOpen(openFromTo[0],openFromTo[1])
//					} 
//					else if (hoursList[t].split(": ")[0].includes("Tu")) {
//						statusDict["Tu"] = isOpen(openFromTo[0],openFromTo[1])
//					}
//					else if (hoursList[t].split(": ")[0].includes("W")) {
//						statusDict["W"] = isOpen(openFromTo[0],openFromTo[1])
//					}
//					else if (hoursList[t].split(": ")[0].includes("Th")) {
//						statusDict["Th"] = isOpen(openFromTo[0],openFromTo[1])
//					}
//					else if (hoursList[t].split(": ")[0].includes("F")) {
//						statusDict["F"] = isOpen(openFromTo[0],openFromTo[1])
//					}
//					else if (hoursList[t].split(": ")[0].includes("Sat")) {
//						statusDict["Sat"] = isOpen(openFromTo[0],openFromTo[1])
//					}
//				}
//			}
//		}
//		now = moment.tz(timezone);
//		today = now.day()
//		todaydesc = Object.keys(daysDict).find(key => daysDict[key] === today)
//		return statusDict[todaydesc]
//	}
//	
//	//Popup stuff
//	function popupTemplating(feature) {
//		const div = document.createElement("div");
//		
//		if (feature.graphic.attributes.PHOTOURL == null) {
//			photoHTML = ""
//		}else {
//		
//			errStr = "this.style.display='none'"
//			
//			photoHTML = '<img id="popupphoto" src=' + feature.graphic.attributes.PHOTOURL + ' onerror=' + errStr + '>' + "<br>" + "<br>"
//			
//			//var image = document.getElementById('popupphoto');
//			//var isLoaded = image.complete && image.naturalHeight !== 0;
//			
//		}
//		
//		if (feature.graphic.attributes.LOCATION == null) {
//			locHTML = ""
//			
//			
//			
//			
//			
//
//		}else {
//			locHTML = "Location: " + feature.graphic.attributes.LOCATION + "<br>" + "<br>"
//		}
//		if (feature.graphic.attributes.URL == null) {
//			urlHTML = ""
//		}else {
//			urlHTML = '<a href="' + feature.graphic.attributes.URL + '" target="_blank">Website</a>' + "<br>"
//			
//		}
//	 	if (feature.graphic.attributes.CONTACT == null) {
//			urlHTML = ""
//		}else {
//			urlHTML = '<a href="' + feature.graphic.attributes.URL + '" target="_blank">Website</a>' + "<br>"
//			
//		}
//		if (feature.graphic.attributes.HOURS == null) {
//			statusHTML = ""
//			hoursHTML = ""
//		}else {
//			hoursHTML = "<b>Hours</b><br>"
//			hoursStr = feature.graphic.attributes.HOURS
//			if (hoursStr.includes(';')) {
//				hoursList = hoursStr.split(";")
//			}else {
//				hoursList = [hoursStr]
//			}
//			for (i=0; i < hoursList.length; i++) {
//				hoursHTML += hoursList[i] + "<br>" 
//			}
//			try {
//	
//			   status = openOrClosed(hoursList)
//			   if (status == "Closed") {
//				   statusHTML = '<p style="color:red">Location is: ' + status + '</p>'
//			   }else {
//				   statusHTML = '<p style="color:green">Location is: ' + status + '</p>'
//			   }
//			}
//			catch(err) {
//				statusHTML = ""
//			}
//		}
//		
//		if (feature.graphic.attributes.CONTACT == null) {
//			contactHTML = ""
//		}else {
//			contactHTML = "<br><b>Contacts</b><br>"
//			if (feature.graphic.attributes.CONTACT.includes(";") == false) {
//				contactHTML = feature.graphic.attributes.CONTACT
//			}else {
//				contactsList = feature.graphic.attributes.CONTACT.split(";")
//				for (i=0; i< contactsList.length; i++) {
//					contactHTML += contactsList[i] + "<br>"
//				}
//			}
//		}
//		div.innerHTML = photoHTML + locHTML + urlHTML + statusHTML + hoursHTML + contactHTML//'<hr style="width:100%;height:25px;background-color:#002145;text-align:left;margin-left:0;margin-top:0">' + 
//			
//		
//		return div;
//	}
//	//popupTemplate = new PopupTemplate()
//	popupTemplate = {title:"{PLACENAME}",
//					  outFields: ["*"],
//					 content:popupTemplating
//					}
//	
//	poiFL.popupTemplate = popupTemplate
//	view.popup.on("trigger-action", (event) => {
//		  // Execute the measureThis() function if the measure-this action is clicked
//		  if (event.action.id === "directions") {
//			  window.toggleDirections()
//			
//			  if (destFocus) {
//				  searchWidget2.searchTerm = view.popup.title	
//			  }
//			  if (originFocus) {
//				  searchWidget1.searchTerm = view.popup.title	
//			  }
//			
//			  cursterm1 = searchWidget1.searchTerm
//			  cursterm2 = searchWidget2.searchTerm 
//			  if (cursterm1.searchTerm != '' && cursterm1 != prevsterm1) {
//
//				  searchWidget1.search()
//				  prevsterm1 = cursterm1
//				  
//			  }
//			  if (cursterm2.searchTerm != '' && cursterm2 != prevsterm2) {
//				 
//				  searchWidget2.search()
//				  prevsterm2 = cursterm2
//			  }
//		  }
//	});
//	
//	//Remove the zoom from the map
//	view.ui.remove("zoom");
//
//	//The top search widget that acts as an origin in the routing 
//	var searchWidget1 = new Search({
//		view: view,
//		includeDefaultSources: false,
//		sources: [{
//			layer: new FeatureLayer({
//				//POI feature class
//        		url: unifiedflUrl,
//				popupTemplate:popupTemplate,
//				outFields: ["*"]
//     		}),
//			//placeholder:"Search for a place",
//			placeholder:"Search for a place",
//			searchFields: ["placename"],
//  			displayField:  "placename",
//			name: "POI Seach",
//  			exactMatch: false,
//			outFields: ["*"],
//			maxSuggestions: 6
//		}],
//		locationEnabled: false,
//		popupEnabled: true,
//		container:"searchBoxes"
//		//popupTemplate: popupTemplate
//	});
//	
//	
//	//The bottom search widget that acts as a destination in the routing 
//    var searchWidget2 = new Search({
//		view: view,
//		visible: false,
//		includeDefaultSources: false,
//		sources: [{
//			layer: new FeatureLayer({
//				//POI feature class
//        		url: unifiedflUrl,
//				outFields: ["*"]
//     		}),
//			placeholder:"Search for a place",
//			searchFields: ["placename"],
//  			displayField: "placename",
//			name: "POI Seach",
//  			exactMatch: false,
//			outFields: ["*"],
//			maxSuggestions: 6
//		}],
//		locationEnabled: false,
//		popupEnabled: false
//	});
//	
//	//Add the top search widget 
//	view.ui.add(searchWidget1, {
//		position: "top-left",
//		index: 10,
//		
//	});	
//	//searchWidget2.set("sources", sources)
//	//Add the bottom search widget to the top left corner of the view
//	view.ui.add(searchWidget2, {
//		position: "top-left",
//		index: 10
//	});	
//
//	var n = 0
//	var poid1 = ''
//	var origname = ''
//	var poid2 = ''
//	var destname = ''
//	var entQuery = ''
//	var stopArray1 = []
//	var stopArray2 = []
//	//When the user finishes the search
//	
//	
//	searchWidget1.on('search-complete', function(result){
//		stopArray1 = []
//		
//		//Grab the ID of the searched term and create a query
//		
//		if (result.results[0].results.length > 1) {
//			for (i=0; i < result.results[0].results.length; i++) {
//				if (view.popup.title == result.results[0].results[i].feature.attributes.PLACENAME) {
//					origname = result.results[0].results[i].feature.attributes.PLACENAME
//					poid1 = result.results[0].results[i].feature.attributes.WAYF_UID
//				}
//			}
//		}else {
//			origname = result.results[0].results[0].feature.attributes.PLACENAME
//			poid1 = result.results[0].results[0].feature.attributes.WAYF_UID
//		}
//		
//		const query = new Query();
//		query.where = "WAYF_UID = " + "'" + poid1 + "'" + entQuery;
//		query.returnGeometry = true;
//		query.outFields = [ "WAYF_UID"]//,"x","y" ];
//
//		//This creates a promise that querys the data and populates the list 
//		crosswalkTable.queryFeatures(query).then(function(results){
//
//			//If there is more than one stop associated with te POI iterate through them all 
//			if (results.features.length > 1) {
//				for (i = 0; i < results.features.length; i++) {
//					const stop = { geometry: { x: results.features[i].geometry.longitude, y: results.features[i].geometry.latitude}}
//					//We want to wait for this list to finish populating 
//					stopArray1.push(stop)
//
//				}
//				return stopArray1
//			//Otherwise just push the single one into the array
//			}else {
//
//				const stop = { geometry: { x: results.features[0].geometry.longitude, y: results.features[0].geometry.latitude}}
//				stopArray1.push(stop)
//				return stopArray1
//			}									 
//		//Then, test the route of all these results 
//		}).then(function(stopResultArray){routeResults(stopResultArray,stopArray2)})
//	})
//	
//	//When the user finishes the search
//	searchWidget2.on('search-complete', function(result){
//		
//		stopArray2 = []
//		//document.getElementsByClassName("esri-menu esri-search__warning-menu")[1].style.visibility = 'visible'
//		
//		destname = result.results[0].results[0].feature.attributes.PLACENAME
//		poid2 = result.results[0].results[0].feature.attributes.WAYF_UID
//		const query = new Query();
//		query.where = "WAYF_UID = " + "'" + poid2 + "'"  + entQuery;
//		query.returnGeometry = true;
//		query.outFields = ["WAYF_UID"];
//												 
//		crosswalkTable.queryFeatures(query).then(function(results){
//			
//			
//			if (results.features.length > 1) {
//				//Go through the results and push the stops into an array 
//				for (i = 0; i < results.features.length; i++) {
//					const stop = { geometry: { x: results.features[i].geometry.longitude, y: results.features[i].geometry.latitude}}
//					stopArray2.push(stop)
//				}
//				return stopArray2
//			//Otherwise just push the single one into the array
//			}else {
//				const stop = { geometry: { x: results.features[0].geometry.longitude, y: results.features[0].geometry.latitude}}
//				stopArray2.push(stop)
//				return stopArray2
//			}
//		}).then(function(stopResultArray){routeResults(stopArray1,stopResultArray)})
//
//	});
//	
//	if (directionsMode) {
//		searchWidget1.popupEnabled = false
//		searchWidget2.popupEnabled = true
//	}else {
//		searchWidget1.popupEnabled = true
//		searchWidget2.popupEnabled = false
//	}
//	searchWidget1.on("search-focus", function(event){
//		originFocus = true
//	 	destFocus = false
//	});
//	
//	searchWidget2.on("search-focus", function(event){
//	 	destFocus = true
//		originFocus = false
//	});
//	
//	//Function to test each entrance that was found
//	function routeResults(sArray1,sArray2) {
//		
//		//Only route if we have stops to test both to and from 
//		if (sArray1.length > 0 && sArray2.length > 0) {
//			n = 0
//			for (i = 0; i < sArray1.length; i++) {
//				for (j = 0; j < sArray2.length; j++) {
//					n += 1
//				}
//			}
//			
//			for (i = 0; i < sArray1.length; i++) {
//				for (j = 0; j < sArray2.length; j++) {
//					getRoute(sArray1[i],sArray2[j],n)
//				}
//			}
//		}
//	}
//	//Function the tests the length of each route and returns the shortest one 
//	function getRoute(stop1,stop2,n) {
//			
//			//routeLayer.polygonBarriers = polyBarriers
//			routeLayer.pointBarriers = pointBarriers
//			const routeParams = new RouteParameters({
//				returnRoutes: true,
//				returnDirections: true,
//				directionsOutputType: "standard",
//				outputLines: "true-shape-with-measure",
//				travelMode: tMode,
//				
//				layer: routeLayer,  
//				directionsLengthUnits: "meters",
//				// An authorization string used to access the routing service
//				stops: new Collection([
//					new Stop({ name: origname, geometry: { x:stop1["geometry"]['x'], y: stop1["geometry"]['y'] }}),
//					new Stop({ name: destname, geometry: { x:stop2["geometry"]['x'], y: stop2["geometry"]['y'] }})
//				])
//			})
//			
//			//routeParams.polygonBarriers = routeLayer.polygonBarriers
//			routeLengths = []
//			routeObjects = []
//			routeDirections = []
//		    routeParams.pointBarriers = routeLayer.pointBarriers
//			route.solve(routeUrl, routeParams).then(function(data) {
//				
//				var routeLength = 0
//				data.routeResults.forEach(function(result) { 
//					
//					routeLengths.push(result.route.attributes.Total_Length)
//					routeObjects.push(result.route)
//					routeDirections.push(result.directions.features)
//				})
//
//				if (routeLengths.length == n) {
//					
//					var chosenRoute = routeObjects[routeLengths.indexOf(Math.min.apply(Math, routeLengths))]
//					var chosenDirections = routeDirections[routeLengths.indexOf(Math.min.apply(Math, routeLengths))]
//					
//					chosenRoute.symbol = {
//					  type: "simple-line",
//					  color: [5, 150, 255],
//					  width: 3
//					};
//					directionsHTML = ''
//					
//					for (i=0; i < chosenDirections.length; i++) {
//						
//						lengthnum = Math.round(chosenDirections[i].attributes.length)
//
//						if (i !=0 && i != chosenDirections.length - 1 && !chosenDirections[i].attributes.text.includes("then")) {
//
//							directionsHTML += chosenDirections[i].attributes.text + " and continue for " + lengthnum.toString() + " metres <br>" + "<br>"
//						}else{
//							directionsHTML += chosenDirections[i].attributes.text + "<br>" + "<br>"
//						}
//					}
//					
//					document.getElementById("directionsBox").style.display = "block";
//					document.getElementById("directions").innerHTML = directionsHTML
//					view.graphics.removeAll();
//					
//					view.graphics.add(chosenRoute);
//					
//				}
//			}) 
//		    
//			route.solve(routeUrl, routeParams).catch(function(data){
//				
//				origGeom = JSON.parse(data.details['requestOptions']['query']['stops'])['features'][0]['geometry']
//				destGeom = JSON.parse(data.details['requestOptions']['query']['stops'])['features'][1]['geometry']
//	
//				stopArray1Adj = []
//				stopArray2Adj = []
//				
//				if (stopArray1.length > 1) {
//					for (i =0; i < stopArray1.length; i++) {
//						
//						
//						if (stopArray1[i]['geometry']['x'] == origGeom['x'] &&
//						    stopArray1[i]['geometry']['y'] == origGeom['y']
//						   ) {
//							
//							routeResults(stopArray1Adj,stopArray2)
//							
//						}else {
//							stopArray1Adj.push(stopArray1[i])
//						}
//					}
//				}
//				
//				if (stopArray2.length > 1) {
//					for (i =0; i < stopArray2.length; i++) {
//						if (stopArray2[i]['geometry']['x'] == destGeom['x'] &&
//						    stopArray2[i]['geometry']['y'] == destGeom['y']
//						   ) {
//							routeResults(stopArray1,stopArray2Adj)
//						}else {
//							stopArray2Adj.push(stopArray2[i])
//						}
//					}
//				}
//				
//				
//				
//			})
//	}
//	
//    window.changeEntrances = function() {
//		if (document.getElementById("accessE").checked == true) {
//			entQuery = " AND (ACCESSIBLE = '1' OR ACCESSIBLE IS NULL)"
//		}else {
//			entQuery = ""
//		}
//		if (searchWidget1.searchTerm != '') {
//			searchWidget1.search()
//	  	}
//		if (searchWidget2.searchTerm != '') {
//
//			searchWidget2.search()
//			prevsterm2 = cursterm2
//		}
//	}
//	window.switchBasemaps = function() {
//		if (webmap.portalItem.id == basemapPortalID) {
//			webmap.portalItem.id = highContrastPortalID
//		}else {
//			webmap.portalItem.id = basemapPortalID
//		}
//	}
//	document.getElementById('speak').addEventListener('click', speakText);
//
//	function speakText() {
//	  // stop any speaking in progress
//	  voices = window.speechSynthesis.getVoices()
//		
//	  window.speechSynthesis.cancel();
//		
//	  // speak text
//	  const text = document.getElementById('directions').textContent;
//		
//	  const utterance = new SpeechSynthesisUtterance(text);
//	  utterance.voice = voices[0];
//	  window.speechSynthesis.speak(utterance);
//	  
//	}

})
