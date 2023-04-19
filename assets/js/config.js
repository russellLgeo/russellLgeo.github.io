'use strict';

/**
 * UBC Wayfinding App
 * Version: {{VERSION}}
 * Author: LGeo
 * Description: Adds global constants to the scope of the script.
 */

const
    /* Production Values */
     //basemapPortalID ='edec0b0428134a69b6954659ffb77777', //Default basemap portal id
     //highContrastPortalID ='c73f7396554943339a2208a1013cefc9', //High contrast basemap portal id
	 basemapPortalID = "c60119036d11407596d92bb1b9dc23c8", //Old default basemap portal id 
	 highContrastPortalID = "c55e159550dd4499b43b234ab1f32736", //Old High contrast basemap portal id 
     routeUrl ='https://ags.gis.ubc.ca/arcgis/rest/services/Wayfinding/ubcv_wayfinding_NetworkAnalysisLayer/NAServer/Route', //Routing service URL

    /* Common Values */
    steepSlopeSegmentPortalID = '159428d89f3b412cae133a5e8c2a11ba', //Feature layer of routing segments that have been identified as steep
    poiForBasemapUrl = 'https://ags.gis.ubc.ca/arcgis/rest/services/ubcv_wayfind_poi/FeatureServer/1', //Unified POI feature layer
    poiForHighContrastUrl = 'https://ags.gis.ubc.ca/arcgis/rest/services/ubcv_wayfind_poi/FeatureServer/1', //Unified POI feature layer
    unifiedPOIUrl = "https://ags.gis.ubc.ca/arcgis/rest/services/Wayfinding/ubcv_wayfinding_test/FeatureServer/1",
    poiPolyUrl = 'https://ags.gis.ubc.ca/arcgis/rest/services/ubcv_wayfind_poi/FeatureServer/2',
    crosswalkUrl = 'https://ags.gis.ubc.ca/arcgis/rest/services/Wayfinding/ubcv_wayfinding_test/FeatureServer/0', //Crosswalk table to link building and entrances
    constructionURL = 'https://ags.gis.ubc.ca/arcgis/rest/services/Wayfinding/ubcv_Construction/FeatureServer/1', //Construction polygons displayed on the map
    pointBarrierPortalID = '2cecb4a75ae34b3eb75b742eff0336f2', //Construction polygons converted to point barriers
    UELBoundaryPortalID = 'c555b2518ad141fdb1ad135da0250b24', //UEL boundary that is used to geofence the tracking functionality
    apiKey = 'AAPK276cbb0d0adb46dd84559e3cc629b9ecltTU1snes6ZLNVPJfKUtP-Fy__eVTdXbkAxnPvlbd9t8BwVyimdY_FonEXjhEnCg',
    portalUrl = 'https://portal.gis.ubc.ca/arcgis',

	buildingLookupLayerUrl = "https://ags.gis.ubc.ca/arcgis/rest/services/Hosted/ubcv_wayfinding_OldWayfindingLookup_view/FeatureServer/0", //table used to lookup old wayfinding building IDs and get new IDs

 	permalinkRegexPatterns = [
{

    "pattern": /^\d{2,3}-(\d|\w){1,2}$/, //buiding code dashed with sub-building

    "class": "OldWayfinding"

},

{

    "pattern": /^\d{2,3}$/, //single number used for old bldgno

    "class": "OldWayfinding"

},

{

    "pattern": /^N\d{2,3}$/, //outdoor poi

    "class": "OldWayfinding"

},

{

    "pattern": /^VAD\d{5}$/, //unified wayfinding UID

    "class": "UnifiedPOIUID"

},

{

    "pattern": /^VPOI\d{5}$/, //unified wayfinding UID

    "class": "UnifiedPOIUID"

},

{

    "pattern": /^VBL\d{5}$/, //unified wayfinding UID for buildings

    "class": "BuildingUID"

},

{

    "pattern": /^VSBL\d{5}$/, //unified wayfinding UID for sub-buildings

    "class": "UnifiedPOIUID"

},

{

    "pattern": /^\w{2,5}$/, //building code TODO: this also matches the old building code so has to be placed last in this json. Not a good design

    "class": "BuildingCode"

}

],

    acceptedURLParams = ["code","find","locat1","from","to"];
