'use strict';

/**
 * UBC Wayfinding App
 * Version: {{VERSION}}
 * Author: LGeo
 */

/*
global console,
    document,
    window,
    window.jQuery,
    window.lodash,
    window.require,
    window.moment,
    TravelMode,
    Graphic,
    PolygonBarrier,
    FeatureSet,
    RouteInfo,
    DirectionPoint,
    PopupTemplate,
    LayerList,
    Legend,
    Locate,
    HTMLElement,
    Text,
    DocumentFragment,
    RouteSolveResult,
    RouteResult,
*/

/**
 * Anonymous, self-invoking function. This function is defined and immediately run. It sets up and runs
 * all logic required to run the UBC Wayfinding App on a browser page. For more information on anonymous,
 * self-invoking functions and last param of this function, see Paul Irish's talk "10 Things I Learned
 * from the jQuery Source", link below
 *
 * @param {Window}    window    Instance of the browser Window object
 * @param {Document}  document  Instance of the current DOM Document
 * @param {Function}  $         Instance of jQuery
 * @param {Function}  _         Instance of Lodash
 * @param {Function}  require   Reference to the require function imported by the ArcGIS JS library
 * @param {Function}  moment    Instance of Lodash
 * @param {undefined} undefined Undefined. This parameter is always intentionally left unused in order to force
 *                              undefined to actually be undefined. This is a safeguard against undefined being
 *                              redefined as some other value due to the fact that undefined is actually a
 *                              variable within the global scope of the document. Creating a parameter called
 *                              undefined and never passing a value ensures that within the scope of our script
 *                              undefined stays undefined as it was intended to be.
 *
 * @see https://www.youtube.com/watch?v=i_qE1iAmjFg&t=253s
 */
(
    function (window, document, $, _, require, moment, undefined) {
        // ESRI modules required by this script
        const requirements = [
            /* Requirements used directly within requireCallback(), these have parameters directly
               associated with them */
            'esri/config',
            'esri/rest/route',
            'esri/rest/networkService',
            'esri/core/reactiveUtils',
            'esri/WebMap',
            'esri/views/MapView',
            'esri/widgets/Search',
            'esri/layers/RouteLayer',
            'esri/rest/support/PointBarrier',
            'esri/rest/support/RouteParameters',
            'esri/layers/FeatureLayer',
            'esri/rest/support/Query',
            'esri/rest/support/Stop',
            'esri/core/Collection',
            'esri/widgets/Track',
            'esri/widgets/Expand',
			'esri/symbols/SimpleMarkerSymbol'
        ];

        /**
         * Helper function. Logs an error to the console.
         *
         * @param {*|string} msg
         */
        function logError(msg) {
            if (_.isFunction(console.error)) {
                console.error(msg);
            } else {
                console.log('ERROR:', msg);
            }
        }

        /**
         * Helper function. Logs a warning to the console.
         *
         * @param {*|string} msg
         */
        function logWarning(msg) {
            if (_.isFunction(console.warn)) {
                console.warn(msg);
            } else {
                console.log('WARNING:', msg);
            }
        }

        /**
         * Makes a rest request to get the travel mode.
         *
         * @param {string} fMode
         * @return {Promise<TravelMode>}
         */
        async function getTravelMode(fMode) {
            const networkService = _.get(window, 'esri.networkService');
            let errMsg = '';

            if (!_.isUndefined(networkService)) {
                const serviceDescription = await networkService.fetchServiceDescription(routeUrl),
                    supportedTravelModes = _.get(serviceDescription, 'supportedTravelModes');

                if (!_.isUndefined(supportedTravelModes) && _.isArray(supportedTravelModes) && !_.isEmpty(supportedTravelModes)) {
                    const tMode = supportedTravelModes.find((mode) => _.get(mode, 'name', '').toLowerCase() === fMode.toLowerCase());

                    if (_.isUndefined(tMode)) {
                        errMsg = `Unable to find a supported travel mode with a name of '${fMode}'.`;
                        logError(errMsg);

                        return Promise.reject(new Error(errMsg));
                    }

                    return Promise.resolve(tMode);
                } else {
                    errMsg = 'Unable to get supported travel modes.';
                    logError(errMsg);

                    return Promise.reject(new Error(errMsg));
                }
            } else {
                errMsg = 'ESRI networkService is unavailable.';
                logError(errMsg);

                return Promise.reject(new Error(errMsg));
            }
        }

        /**
         * Callback. Sets up all the variables and functions required to load and display the wayfinding map. Once
         * setup is complete, initializes and loads the map.
         *
         * @param esriConfig
         * @param route
         * @param networkService
         * @param reactiveUtils
         * @param WebMap
         * @param MapView
         * @param Search
         * @param RouteLayer
         * @param PointBarrier
         * @param RouteParameters
         * @param FeatureLayer
         * @param Query
         * @param Stop
         * @param Collection
         * @param Track
         * @param Expand
         * @param Graphic
         * @param PolygonBarrier
         * @param FeatureSet
		 * @param SimpleMarkerSymbol
         */
        function requireCallback(
            esriConfig,
            route,
            networkService,
            reactiveUtils,
            WebMap,
            MapView,
            Search,
            RouteLayer,
            PointBarrier,
            RouteParameters,
            FeatureLayer,
            Query,
            Stop,
            Collection,
            Track,
            Expand,
            Graphic,
            PolygonBarrier,
            FeatureSet,
			SimpleMarkerSymbol
        ) {
            // Set the API key and portal URL on the Esri config object
            _.set(esriConfig, 'apiKey', apiKey);
            _.set(esriConfig, 'portalUrl', portalUrl);
			
			esriConfig.request.interceptors.push({

				urls: unifiedPOIUrl,
				before: (params) => {
					if(params.requestOptions.query.where !== undefined && params.requestOptions.query.where != "1=1"){
						if(params.requestOptions.query.where.search(/LIKE '%\D/) > 0){
							params.requestOptions.query.where = "".concat("(",params.requestOptions.query.where,")", " AND (UPPER(CATEGORY) <> 'ADDRESS' OR UPPER(CATEGORY) IS NULL)");}}}
				
			});
				
            // Expose some esri components to the global scope
            _.set(window, 'esri.networkService', networkService);

            /* String constants */
            // Travel mode constants
            /** @type {string} */
            const TRAVEL_MODE_WALKING = 'Walking',
                /** @type {string} */
                TRAVEL_MODE_ACCESSIBLE = 'Accessible',
                /** @type {string} */
                TRAVEL_MODE_BIKING = 'Biking',

                // Travel mode modifiers
                /** @type {string} */
                TRAVEL_MODE_MODIFIER_SIMPLIFIED = 'Simplified',
                /** @type {string} */
                TRAVEL_MODE_MODIFIER_NO_SLOPES = 'No Slopes',

                // Entrance Type Constants
                /** @type {string} */
                ENTRANCE_TYPE_ALL = 'All',
                /** @type {string} */
                ENTRANCE_TYPE_ACCESSIBLE = 'Accessible',

                // Expand Widget
                /** @type {string} */
                EXPAND_WIDGET_ACCESSIBILITY_HELP_TEXT = 'Show additional accessibility settings',
                /** @type {string} */
                EXPAND_WIDGET_ACCESSIBILITY_ICON_CLASS = 'esri-icon-settings2',
                /** @type {string} */
                EXPAND_WIDGET_DIRECTIONS_HELP_TEXT = 'Show written directions',
                /** @type {string} */
                EXPAND_WIDGET_DIRECTIONS_ICON_CLASS = 'esri-icon-documentation',

                // Settings text
                /** @type {string} */
                SETTINGS_CUSTOM_NAVIGATION = 'Custom Navigation',
                /** @type {string} */
                SETTINGS_SIMPLIFY_ROUTE = 'Simplify route',
                /** @type {string} */
                SETTINGS_AVOID_STEEP_SLOPES = 'Avoid steep slopes',
                /** @type {string} */
                SETTINGS_NAVIGATION_AIDS = 'Navigation Aids',
                /** @type {string} */
                SETTINGS_HIGH_CONTRAST_VISIBILITY = 'High Contrast Visibility',

                // Search Widget
                /** @type {string} */
                SEARCH_WIDGET_PLACEHOLDER = 'Search for a place',
                /** @type {string} */
                SEARCH_WIDGET_NAME = 'POI Search',

                // Text - labels and other text
                /** @type {string} */
                DIRECTIONS = 'Directions',
                /** @type {string} */
                STEEP_SLOPES = 'Steep slopes',
                /** @type {string} */
                START_TRACKING_LOCATION = 'Start tracking location',
                /** @type {string} */
                OPEN = 'Open',
                /** @type {string} */
                CLOSED = 'Closed',
                /** @type {string} */
                DAILY = 'Daily',
                /** @type {string} */
                STATUS_UNKNOWN = 'Status Unknown',
                /** @type {string} */
                LOCATION = 'Location',
                /** @type {string} */
                WEBSITE = 'Website',
                /** @type {string} */
                HOURS = 'Hours',
                /** @type {string} */
                LOCATION_IS = 'Location is',
                /** @type {string} */
                CONTACTS = 'Contact',

                // Stop filter types
                /** @type {string} */
                STOP_FILTER_TYPE_REMOVED = 'removed';

                // Global variables associated with setting the travel mode
            /** @type {Promise<TravelMode>} Travel mode used for determining directions*/
            let tMode,
                /** @type {string} base travel mode */
                baseMode = TRAVEL_MODE_WALKING,
                /** @type {string} string to modify the travel mode, @see changeTravelModeAccess() */
                simplifyStr = '',
                /** @type {string} string to modify the travel mode, @see changeTravelModeAccess() */
                steepStr = '',
                /** @type {DocumentFragment} DOM Document fragment used to create HTML to display route directions */
                directionsHTML = null,

                // Global variables associated with the search bars and routing
                /** @type {boolean} Flag to determine is directions mode is active or not */
                directionsMode = false,
                /** @type {number} Counter to hold the total number of route results */
                routeCount = 0,
                /** @type {string} Stores the WAYF_UID attribute from a route origin */
                poId1 = '',
                /** @type {string} Stores the PLACENAME attribute from a route origin */
                origName = '',
                /** @type {string} Stores the WAYF_UID attribute from a route destination */
                poId2 = '',
                /** @type {string} Stores the PLACENAME attribute from a route destination */
                destName = '',
                /** @type {string} Stores a query modifier */
                endQuery = '',
                /** @type {Array<Graphic>} Stores stops */
                stopArray1 = [],
                /** @type {Array<Graphic>} Stores stops */
                stopArray2 = [],
                /** @type {Array<Graphic>} Stores removed stops */
                stopArray1Removed = [],
                /** @type {Array<Graphic>} Stores removed stops */
                stopArray2Removed = [],
                /** @type {boolean} */
                originFocus = false,
                /** @type {boolean} */
                destFocus = true,
                /** @type {boolean} */
                prevSrchTerm1 = null,
                /** @type {boolean} */
                prevSrchTerm2 = null;

            /**
             * Assigns the new travel mode to the tMode variable
             *
             * @param {TravelMode} newTMode The new travel mode
             * @return {Promise<TravelMode>}
             */
            function setTMode(newTMode) {
                tMode = newTMode;
                return Promise.resolve(tMode);
            }

            // Initialize the travel mode
            getTravelMode(TRAVEL_MODE_WALKING)
                .then(setTMode);

            // Default basemap
            /** @type {WebMap} A low-contrast web map to serve as the base layer for the wayfinding app */
            const defaultBaseMap = new WebMap(
                    {
                        portalItem: {
                            id: basemapPortalID
                        }
                    }
                ),

                /** @type {WebMap} High-contrast basemap to be used for accessible maps */
                highContrastBaseMap = new WebMap(
                    {
                        portalItem: {
                            id: highContrastPortalID
                        }
                    }
                ),

                /** @type {string} Working timezone for use by moment.js*/
                timezone = 'America/Vancouver',

                /** @type {Array<PointBarrier>} Point barriers array for construction */
                pointBarriers = [],

                /** @type {FeatureLayer} Crosswalk table, used to associate a POI with an entrance */
                crosswalkTable = new FeatureLayer(
                    {
                        url: crosswalkUrl
                    }
                ),

                /** @type {RouteLayer} Routing layer, used to draw routes */
                routeLayer = new RouteLayer(
                    {
                        url: routeUrl
                    }
                ),

                /** @type {Object} Create a directions action for the popup */
                directionsAction = {
                    title: DIRECTIONS,
                    id: 'directions',
                    image: './assets/svgs/noun-route-939679.svg'
                },

                /** @type {MapView} Adds the basemap, the routing / crosswalk layers and the popup options */
                view = new MapView(
                    {
                        map: defaultBaseMap,
                        layers: [routeLayer, crosswalkTable],
                        container: 'viewDiv',
                        popup: {
                            dockEnabled: true,
                            dockOptions: {
                                breakpoint: false,
                                buttonEnabled: false,
                                position: 'bottom-left'
                            },
                            actions: [directionsAction],
                        },

                        // Remove the zoom buttons from the UI by overriding the ui.components property,
                        // doing this here avoids them flashing on and then off the map
//                        ui: {
//                            components: [
//                                'attribution'
//                            ]
//                        }
                    }
                ),
				
                /** @type {FeatureLayer} Load in the clickable points of interest */
                poiFL = new FeatureLayer(
                    {
                        url: poiForBasemapUrl,
                        listMode: 'hide',
                        popupEnabled: true,
                        index: 2
                    }
                ),

                /** @type {FeatureLayer} Load in the clickable polygons of interest (ie building footprints) */
                poiPoly = new FeatureLayer(
                    {
                        url: poiPolyUrl,
                        popupEnabld: true,
                        index: 0
                    }
                ),

                /** @type {FeatureLayer} Slopes that have been identified as steep: */
                slopeFL = new FeatureLayer(
                    {
                        portalItem: {
                            id: steepSlopeSegmentPortalID
                        },
                        title: STEEP_SLOPES,
                        visible: false,
                        popupEnabled: false
                    }
                ),

                /**
                 * @type {FeatureLayer} The POIs that are used in the search bar, now these are the
                 *                      same as the POIs that appear on the map
                 */
                unifiedFL = new FeatureLayer(
                    {
                        url: unifiedPOIUrl
                    }
                ),

                /**
                 * @type {FeatureLayer} A large polygon over the University Endowment Lands, used to
                 *                      geofence the tracking app and only enable it when the user is on campus.
                 */
                boundaryFL = new FeatureLayer(
                    {
                        portalItem: {
                            id: UELBoundaryPortalID
                        }
                    }
                ),

                /** @type {FeatureLayer} Construction point barriers */
                pointBarrierfl = new FeatureLayer(
                    {
                        portalItem: {
                            id: pointBarrierPortalID
                        }
                    }
                ),

                /** @type {Track} Initialize the tracking widget */
                track = new Track(
                    {
                        view: view,
                        visible: true,
                        useHeadingEnabled: false,
                        goToLocationEnabled: false,
                        arialabel: START_TRACKING_LOCATION,
                        role: 'button'
                    }
                )
//				zoom = new zoom({
//				  view: view
//				});
				
				view.ui.move("zoom", { position: "top-right" });

            /** @type {WebMap} Holds reference to the web map that is currently in use */
            let webMap = defaultBaseMap;
				
            /**
             * Go through the point barrier feature layer, turn them all into point barrier
             * objects, push these into a list
             *
             * @param {FeatureSet} results
             */
            function ptBarrierFtrLayerQueryCb(results) {
                if (!_.isUndefined(_.get(results, 'features.length'))) {
                    /** @type {number} Holds the length of the features array */
                    const length = _.get(results, 'features.length', 0);

                    /** @type {number} Holds current iteration value in for loop */
                    for (let i = 0; i < length; i++) {
                        /** @type {Object} Properties defining a restriction on the map */
                        const aBarrierProps = {
                            geometry: _.get(results, `features[${i}].geometry`, null),
                            barrierType: 'restriction'
                        };

                        if (!_.isNull(_.get(aBarrierProps, 'geometry'))) {
                            pointBarriers.push(new PointBarrier(aBarrierProps));
                        }
                    }
                }
            }

            /**
             * Handles the errors when loading images
             *
             * @param {Event} e An error event
             */
            function hideImageOnError(e) {
                /** @type {jquery} A jQuery object representing the image that failed to load the image */
                const img = $(this),
                    /** @type {string} The src attribute of the image element that triggered the error */
                    src = img.prop('src');
                img.remove();
                logError(`Could not load the image at '${src}'`);
            }

            /**
             * Helper function to append one or more elements as children to a supplied parent element
             *
             * @param {DocumentFragment|HTMLElement}          parentElem The element or document fragment
             *                                                           that will have the child elements appended
             *                                                           to it. Must not be a void element.
             * @param {Array<HTMLElement>|HTMLElement|string} childElems An array of elements, a single element or a
             *                                                           string to be appended
             *
             * @see (@link https://developer.mozilla.org/en-US/docs/Glossary/Void_element) for more information on void elements.
             *
             * @return {HTMLElement|DocumentFragment}
             */
            function appendChildElements(parentElem, childElems) {
                /** @type {Array<string>} List of void HTML elements, these elements cannot have child nodes */
                const voidElems = [
                    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
                ];

                /** @type {Array<HTMLElement>|HTMLElement|string} assign the possible child/children to a local variable */
                let toBeAppended = childElems;

                // make sure we have an element or document fragment as the parent
                if (!_.isElement(parentElem) && !(parentElem instanceof DocumentFragment)) {
                    throw new TypeError('The value passed to the parentElem param must be an HTMLElement or a DocumentFragment.');
                }

                // make sure the parent is not a void element
                if (voidElems.indexOf(_.get(parentElem, 'nodeName', '').toLowerCase()) > -1) {
                    throw new TypeError('The element passed as the parentElem param cannot be a void element. See https://developer.mozilla.org/en-US/docs/Glossary/Void_element for more information on void elements.');
                }

                // if we got an element in childElems, wrap it with an array
                if (_.isElement(childElems) || _.isString(childElems)) {
                    toBeAppended = [childElems];
                }

                // Ensure we are dealing with an array at this point. If childElems was not an array or a single element,
                // this check will fail because toBeAppended will not an array at this point in the function's execution
                if (!_.isArray(toBeAppended)) {
                    throw new TypeError('The value passed to the childElems param must be an array or a single HTMLElement.');
                }

                // Sanitize the array of childElements. Necessary because it is possible to pass an array that does not
                // contain elements. We filter out any items that are not HTMLElement objects
                toBeAppended = toBeAppended.filter((elem) => (elem instanceof HTMLElement || (_.isString(elem) && !_.isEmpty(elem))));

                // Now, we check to see if our array is empty after sanitizing it. If it is, we send a warning to the
                // console and stop the function execution by returning the unmodified parent element
                if (toBeAppended.length === 0) {
                    /** @type {string} */
                    const warning = 'appendChildElements() received no valid HTMLElement objects. Nothing will be appended.';
                    logWarning(warning);

                    return parentElem;
                }

                // Since this function was written in 2023, MOST browsers should implement the `append()` method
                // on HTMLElements, so if it's there, use it in conjunction with the spread operator to `...` to pass
                // each of the elements as a parameter to `append()`
                if (_.isFunction(parentElem.append)) {
                    parentElem.append(...toBeAppended);
                // If the browser does not support `append()`, then do things the old-fashioned way with a for loop
                // and `appendChild()`
                } else if (_.isFunction(parentElem.appendChild)) {
                    /** @type {number} i */
                    for (let i = 0; i < _.get(toBeAppended, 'length', 0); i++) {
                        /** @type {HTMLElement|string} newChild */
                        let newChild = toBeAppended[i];

                        if (_.isString(newChild)) {
                            newChild = new Text(newChild);
                        }

                        parentElem.appendChild(newChild);
                    }
                }

                // Return the parent element
                return parentElem;
            }

            /**
             * Helper function to append <br> elements to an element's children.
             *
             * @param {HTMLElement|DocumentFragment} parentElem The parent element to which <br> elements will be appended
             * @param {number}      numBrs     The number of <br> elements to append
             *
             * @return {HTMLElement|DocumentFragment}
             */
            function appendTrailingBrElement(parentElem, numBrs) {
                /** @type {number} A sanitized version of numBrs. Ensures that we are only working with positive integers */
                const saniNumBrs = ((numBrs < 0) ? 0 : Math.round(numBrs)),
                    /**
                     * @type {Array<HTMLBRElement>} Array containing the <br> elements to append
                     *                              Uses Array.from() to create an array from an array-like object, and
                     *                              fill it with unique <br> elements. `{length: saniNumBrs}` is
                     *                              array-like because it has a length property, like a native JS Array.
                     *
                     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
                     *
                     */
                    brList = Array.from({length: saniNumBrs}, () => document.createElement('br'));

                // Append the `<br>` elements and return the parent
                try {
                    parentElem = appendChildElements(parentElem, brList);
                } catch (e) {
                    logError(e);
                }

                return parentElem;
            }

            /**
             * Function that displays a live status of whether a building is open or closed, uses external library
             * moment-timezone-with-data.min.js
             *
             * @param {string} openTime  String indicating the location's opening time
             * @param {string} closeTime String indicating the location's closing time
             *
             * @return {string}
             */
            function isOpen(openTime, closeTime) {
                // handle special case
                if (openTime === '24HR') {
                    return OPEN;
                }

                /** @type {Object} get the current date and time in the given time zone */
                const now = moment.tz(timezone),
                    /**
                     * Get the exact open and close times on that date in the given time zone
                     *
                     * @see https://github.com/moment/moment-timezone/issues/119
                     */
                    /** @type {string} The current date */
                    date = now.format('YYYY-MM-DD'),
                    /** @type {string} The localized opening time for today */
                    storeOpenTime = moment.tz(date + ' ' + openTime, 'YYYY-MM-DD h:mmA', timezone),
                    /** @type {string} The localized closing time for today */
                    storeCloseTime = moment.tz(date + ' ' + closeTime, 'YYYY-MM-DD h:mmA', timezone);

                /** @type {boolean} Flag to indicate if location is open or not */
                let check;

                // Handle ranges that span over midnight
                if (storeCloseTime.isBefore(storeOpenTime)) {
                    check = now.isAfter(storeOpenTime) || now.isBefore(storeCloseTime);
                // Normal range check using an inclusive start time and exclusive end time
                } else {
                    check = now.isBetween(storeOpenTime, storeCloseTime, null, '[)');
                }

                return check ? OPEN : CLOSED;
            }

            //
            /**
             * Attempts to determine if a location is open or closed, based on the supplied list of hours
             *
             * @param {Array<string>} hoursList
             * @return {string}
             *
             * @todo: fringe cases such as Summer, By Appointmnent
             */
            function openOrClosed(hoursList) {
                if (_.isArray(hoursList)) {
                    // Set up an index for each day, and a dictionary to track the status of each day
                    /** @type {Object} */
                    const daysDict = { 'Sun': 0, 'M': 1, 'Tu': 2, 'W': 3, 'Th': 4, 'F': 5, 'Sat': 6 },
                        /** @type {Object} */
                        statusDict = { 'Sun': '', 'M': '', 'Tu': '', 'W': '', 'Th': '', 'F': '', 'Sat': '' };

                    // Iterate though the hours list
                    /** @type {number} t Iteration counter */
                    for (let t = 0; t < _.get(hoursList, 'length', 0); t++) {
                        // If the building isn't closed all day
                        if (hoursList[t].includes(CLOSED) === false) {
                            // Parse out the opening and closing hour
                            /** @type {Array<string>} */
                            const hoursListingSplit = hoursList[t].split(': '),
                                /** @type {string} */
                                daysOpen = _.get(hoursListingSplit, '[0]', ''),
                                /** @type {Array<string>} */
                                openFromTo = _.get(hoursListingSplit, '[1]', '').split('-')
                                    .map((fromTo) => fromTo.trim()),
                                openFrom = _.get(openFromTo, '[0]', ''),
                                openTo = _.get(openFromTo, '[1]', '');

                            // If we see the keyword Daily, the building has
                            // the same opening and closing hours 7 days a week
                            if (daysOpen === DAILY) {
                                // So we can go through all the days of the week with the same status
                                /** @type {string} */
                                const statusStr = isOpen(openFrom, openTo);

                                Object.keys(statusDict).forEach(key => _.set(statusDict, key, statusStr));
                            // Otherwise the building has different hours depending on the day
                            } else {
                                /** @type {Array<string>} */
                                let dayRange;

                                // If we see a comma, it is indicating several distinct days (eg. M,W,F)
                                if (daysOpen.includes(',')) {
                                    // Split out these days
                                    dayRange = daysOpen.split(',')
                                        .map((range) => range.trim());
                                    // And for each one grab it's associated hours
                                    for (let n = 0; n < _.get(dayRange, 'length', 0); n++) {
                                        hoursList.push(`${dayRange[n]}: ${hoursListingSplit[1]}`);
                                    }
                                    // Otherwise if we see a dash, it is indicating a day range (eg. M-F)
                                } else if (daysOpen.includes('-')) {
                                    dayRange = daysOpen.split('-')
                                        .map((range) => range.trim());
                                    // Pull out the start day and end day
                                    /** @type {number} */
                                    const startDay = _.get(daysDict, `[${_.get(dayRange, '[0]', '')}]`, -1),
                                        /** @type {boolean} */
                                        hasStartDay = startDay > -1 && startDay < 7,
                                        /** @type {number} */
                                        endDay = _.get(daysDict, `[${_.get(dayRange, '[1]', '')}]`, -1),
                                        /** @type {boolean} */
                                        hasEndDay = endDay > -1 && endDay < 7;

                                    /** @type {string} */
                                    let dayDesc;

                                    // ensure we have a start and end day to work with
                                    if (hasStartDay && hasEndDay) {
                                        // If the range doesn't overlap to a new week (Eg. M-W)
                                        if (startDay < endDay) {
                                            // Count through the days and calculate the status for each
                                            for (let i = startDay; i <= endDay; i++) {
                                                dayDesc = Object.keys(daysDict).find(key => _.get(daysDict, key, -1) === i);
                                                _.set(statusDict, dayDesc, isOpen(openFrom, openTo));
                                            }
                                            // Otherwise if it is an odd day range such as (F-M)
                                        } else {
                                            // Start at the start date and go to the end of the week
                                            /** @type {number} */
                                            for (let i = startDay; i <= 6; i++) {
                                                dayDesc = Object.keys(daysDict).find(key => _.get(daysDict, key, -1) === i);
                                                _.set(statusDict, dayDesc, isOpen(openFrom, openTo));
                                            }

                                            // Then start on the next week and go to the end day
                                            /** @type {number} */
                                            for (let i = 0; i <= endDay; i++) {
                                                dayDesc = Object.keys(daysDict).find(key => _.get(daysDict, key, -1) === i);
                                                _.set(statusDict, dayDesc, isOpen(openFrom, openTo));
                                            }
                                        }
                                    }
                                // Otherwise it is simply a unique day, so just check for the key word.
                                } else if (daysOpen.includes('Sun')) {
                                    _.set(statusDict, 'Sun', isOpen(openFrom, openTo));
                                } else if (daysOpen.includes('M')) {
                                    _.set(statusDict, 'M', isOpen(openFrom, openTo));
                                } else if (daysOpen.includes('Tu')) {
                                    _.set(statusDict, 'Tu', isOpen(openFrom, openTo));
                                } else if (daysOpen.includes('W')) {
                                    _.set(statusDict, 'W', isOpen(openFrom, openTo));
                                } else if (daysOpen.includes('Th')) {
                                    _.set(statusDict, 'Th', isOpen(openFrom, openTo));
                                } else if (daysOpen.includes('F')) {
                                    _.set(statusDict, 'F', isOpen(openFrom, openTo));
                                } else if (daysOpen.includes('Sat')) {
                                    _.set(statusDict, 'Sat', isOpen(openFrom, openTo));
                                }
                            }
                        }
                    }

                    // Account for daylight savings time using timezone
                    /** @type {Object} get the current date and time in the given time zone */
                    const now = moment.tz(timezone),
                        // Grab the appropriate day
                        /** @type {number} */
                        today = now.day(),
                        /** @type {string} */
                        todayDesc = Object.keys(daysDict).find(key => _.get(daysDict, key, -1) === today);

                    // And use this to access the correct status
                    return _.get(statusDict, todayDesc, STATUS_UNKNOWN);
                }

                return STATUS_UNKNOWN;
            }

            /**
             * Custom popup template function. Crates an HTMLDivElement (`<div>`) containing all the available
             * location's information. This `<div>` will be used as the content for the popup.
             *
             * @param {{graphic: {attributes: Object}}} feature
             * @return {HTMLDivElement}
             */
            function popupTemplating(feature) {
                const photoUrl = !_.isUndefined(_.get(feature, 'graphic.attributes.photourl')) ? _.get(feature, 'graphic.attributes.photourl') : _.get(feature, 'graphic.attributes.PHOTOURL'),
                    location = !_.isUndefined(_.get(feature, 'graphic.attributes.location')) ? _.get(feature, 'graphic.attributes.location') : _.get(feature, 'graphic.attributes.LOCATION'),
//					address = !_.isUndefined(_.get(feature, 'graphic.attributes.full_address')) ? _.get(feature, 'graphic.attributes.full_address') : _.get(feature, 'graphic.attributes.FULL_ADDRESS'),
                    url = !_.isUndefined(_.get(feature, 'graphic.attributes.url')) ? _.get(feature, 'graphic.attributes.url') : _.get(feature, 'graphic.attributes.URL'),
                    hours = !_.isUndefined(_.get(feature, 'graphic.attributes.hours')) ? _.get(feature, 'graphic.attributes.hours') : _.get(feature, 'graphic.attributes.HOURS'),
                    contact = !_.isUndefined(_.get(feature, 'graphic.attributes.contact')) ? _.get(feature, 'graphic.attributes.contact') : _.get(feature, 'graphic.attributes.CONTACT');

                /** @type {HTMLDivElement} The div this function will return */
                let div = document.createElement('div'),
                    /** @type {HTMLImageElement|undefined} */
                    photoHTML,
                    /** @type {HTMLAnchorElement|undefined} */
                    urlHTML,
                    /** @type {HTMLParagraphElement|undefined} */
                    statusHTML,
                    /** @type {string|undefined} */
                    statusClass,
                    /** @type {HTMLElement|undefined} */
                    hoursHeading,
                    /** @type {Array<string>|undefined} */
                    hoursList,
                    /** @type {string|undefined} */
                    statusStr,
                    /** @type {HTMLParagraphElement|undefined} */
                    contactHTML,
                    /** @type {HTMLElement|undefined} */
                    contactHeading;

                // if we have an image URL, attempt to create an image element. If there are any load errors, remove
                // the element from the DOM.
                if (!_.isEmpty(photoUrl)) {
                    photoHTML = document.createElement('img');
                    _.set(photoHTML, 'src', photoUrl);
                    photoHTML.addEventListener('error', hideImageOnError);

                    try {
                        div = appendChildElements(div, photoHTML);
                        div = appendTrailingBrElement(div, 2);
                    } catch (e) {
                        logError(e);
                    }
                }

                // If we have a location string
                if (!_.isEmpty(location)) {
                    try {
                        div = appendChildElements(div, `${LOCATION}: ${location}`);
                        div = appendTrailingBrElement(div, 2);
                    } catch (e) {
                        logError(e);
                    }
                }
// 				// If we have a location string
//                if (!_.isEmpty(address)) {
//                    try {
//                        div = appendChildElements(div, `${FULL_ADDESS}: ${full_address}`);
//                        div = appendTrailingBrElement(div, 2);
//                    } catch (e) {
//                        logError(e);
//                    }
//                }

                // if the location has a link associated with it, add a link to the location's website
                if (!_.isEmpty(url)) {
                    urlHTML = document.createElement('a');
                    _.set(urlHTML, 'href', url);
                    _.set(urlHTML, 'target', '_blank');
                    try {
                        urlHTML = appendChildElements(urlHTML, WEBSITE);
                        div = appendChildElements(div, urlHTML);
                        div = appendTrailingBrElement(div, 1);
                    } catch (e) {
                        logError(e);
                    }
                }

                // if the location has set hours, display the hours in the popup
                if (!_.isEmpty(hours)) {
                    hoursList = hours.split(';');

                    try {
                        statusStr = openOrClosed(hoursList);
                        statusHTML = document.createElement('p');
                        statusHTML = appendChildElements(statusHTML, `${LOCATION_IS}: ${statusStr}`);

                        if (statusStr === CLOSED) {
                            statusClass = 'hours-closed';
                        } else {
                            statusClass = 'hours-open';
                        }

                        if (_.get(statusHTML, 'classList') instanceof DOMTokenList) {
                            statusHTML.classList.add(statusClass);
                        } else {
                            _.set(statusHTML, 'className', statusClass);
                        }

                        div = appendChildElements(div, statusHTML);
                    } catch (err) {
                        logError(err);
                    }

                    hoursHeading = document.createElement('b');

                    try {
                        hoursHeading = appendChildElements(hoursHeading, HOURS);
                        div = appendChildElements(div, hoursHeading);
                        div = appendTrailingBrElement(div, 1);

                        /** @type {number} */
                        for (let i = 0; i < _.get(hoursList, 'length', 0); i++) {
                            div = appendChildElements(div, hoursList[i]);
                            div = appendTrailingBrElement(div, 1);
                        }
                    } catch (e) {
                        logError(e);
                    }
                }

                // If the location has contact information, display it
                if (!_.isEmpty(contact)) {
                    contactHTML = document.createElement('p');
                    contactHeading = document.createElement('b');
                    try {
                        contactHeading = appendChildElements(contactHeading, CONTACTS);
                        contactHTML = appendChildElements(contactHTML, contactHeading);
                        contactHTML = appendTrailingBrElement(contactHTML, 1);

                        if (contact.includes(';') === false) {
                            contactHTML = appendChildElements(contactHTML, contact);
                        } else {
                            const contactsList = contact.split(';');

                            /** @type {number} */
                            for (let i = 0; i < _.get(contactsList, 'length', 0); i++) {
                                contactHTML = appendChildElements(contactHTML, _.get(contactsList, `[${i}]`, ''));
                                contactHTML = appendTrailingBrElement(contactHTML, 1);
                            }
                        }

                        div = appendChildElements(div, contactHTML);
                    } catch (e) {
                        logError(e);
                    }
                }

                return div;
            }
				
            /**
             * Callback. Runs when `getTravelMode()` returns a fulfilled promise. Ensures that stopArray1 and
             * stopArray2 both have items, and if so, runs `routeResults()`
             *
             * @see {@link getTravelMode}
             * @see {@link routeResults}
             */
            function afterGetTravelMode() {
                if (!_.isEmpty(stopArray1) && !_.isEmpty(stopArray2)) {
                    routeResults(stopArray1, stopArray2);
                }
            }

            /**
             * Click handler. Fires when the custom navigation modes are being turned on and off.
             *
             * @see {@link createSettingsDiv}
             */
            function changeTravelModeAccess() {
                /** @type {boolean} Flag indicating if the simplify setting is checked */
                const simplifyChecked = $('#simplify:checked').length > 0,
                    /** @type {boolean} Flag indicating if the no slopes setting is checked */
                    noSlopeChecked = $('#noSlope:checked').length > 0;

                // If simplify route is checked add this to the string
                simplifyStr = simplifyChecked ? TRAVEL_MODE_MODIFIER_SIMPLIFIED : '';

                // If no slope is checked add this to the string
                steepStr = noSlopeChecked ? TRAVEL_MODE_MODIFIER_NO_SLOPES : '';

                /**
                 * Create the complete travel mode by adding the previous two modifier strings.
                 * The call to trim() ensures the travel mode has no trailing spaces.
                 * The call to replace() ensures two or more spaces are collapsed into one. Required if steepStr is
                 *     empty and simplifyStr is not.
                 */
                /** @type {string} */
                const theMode = (`${baseMode} ${steepStr} ${simplifyStr}`)
                    .trim()
                    .replace(/\s{2,}/, ' ');

                // Then route the results using this travel mode.
                getTravelMode(theMode)
                    .then(setTMode)
                    .then(afterGetTravelMode);
            }

            /**
             * Click handler. Fires when the user switches between the default map and the high contrast map
             */
            function switchBasemaps() {
                // if the currently displayed map is the base map, switch it out for the high contrast map
                if (_.get(webMap, 'portalItem.id', '') === basemapPortalID) {
                    webMap = highContrastBaseMap;

                    // Update the points of interest URL
                    _.set(poiFL, 'url', poiForHighContrastUrl);
                // otherwise, the current map must be the high contrast map, so swap it for the base map
                } else {
                    webMap = defaultBaseMap;

                    // Update the points of interest URL
                    _.set(poiFL, 'url', poiForBasemapUrl);
                }

                // Change the basemap
                _.set(view, 'map', webMap);

                // We need to re add the features to it as well
                if (_.isFunction(_.get(view, 'map.add'))) {
                    // Add the clickable points of interest
                    view.map.add(poiPoly);
                    // Add the clickable polygons of interest (ie building footprints)
                    view.map.add(poiFL);
                    // Add the slopes that have been identified as steep
                    view.map.add(slopeFL);
                }
            }

            /**
             * Helper function. Dynamically creates the contents for the settings widget
             *
             * @return {HTMLDivElement}
             */
            function createSettingsDiv() {
                /** @type {HTMLDivElement} */
                let settingsDiv = document.createElement('div'),
                    /** @type {HTMLDivElement} */
                    settingsDivContent = document.createElement('div'),
                    /** @type {HTMLHRElement} */
                    hr = document.createElement('hr'),
                    /** @type {HTMLElement} */
                    customNav = document.createElement('b'),
                    /** @type {HTMLInputElement} */
                    noSlopeInput = document.createElement('input'),
                    /** @type {HTMLLabelElement} */
                    noSlopeLabel = document.createElement('label'),
                    /** @type {HTMLInputElement} */
                    simplifyInput = document.createElement('input'),
                    /** @type {HTMLLabelElement} */
                    simplifyLabel = document.createElement('label'),
                    /** @type {HTMLElement} */
                    navAids = document.createElement('b'),
                    /** @type {HTMLInputElement} */
                    hiContrastInput = document.createElement('input'),
                    /** @type {HTMLLabelElement} */
                    hiContrastLabel = document.createElement('label');

                // Using jQuery here to help simplify the configuration of each element we are creating. The call to
                // get(0) returns the modified DOM element and assigns it back to the correct variable.
                settingsDiv = $(settingsDiv).prop('id', 'accessBox')
                    .css('display', 'block')
                    .get(0);

                settingsDivContent = $(settingsDivContent).css('paddingLeft', '5px')
                    .get(0);

                hr = $(hr).css(
                    {
                        width: '100%',
                        height: '25px',
                        backgroundColor: '#002145',
                        textAlign: 'left',
                        marginLeft: '0',
                        marginTop: '0'
                    }
                )
                    .get(0);

                customNav = $(customNav).css('fontSize', '16px')
                    .text(SETTINGS_CUSTOM_NAVIGATION)
                    .get(0);

                noSlopeInput = $(noSlopeInput).prop(
                    {
                        type: 'checkbox',
                        id: 'noSlope',
                        name: 'noSlope',
                        value: 'NoSlope'
                    }
                )
                    .on('change', changeTravelModeAccess)
                    .get(0);

                noSlopeLabel = $(noSlopeLabel).prop('for', 'noSlope')
                    .text(SETTINGS_AVOID_STEEP_SLOPES)
                    .get(0);

                simplifyInput = $(simplifyInput).prop(
                    {
                        type: 'checkbox',
                        id: 'simplify',
                        name: 'simplifyR',
                        value: 'simplifyR'
                    }
                )
                    .on('change', changeTravelModeAccess)
                    .get(0);

                simplifyLabel = $(simplifyLabel).prop('for', 'simplify')
                    .text(SETTINGS_SIMPLIFY_ROUTE)
                    .get(0);

                navAids = $(navAids).css('fontSize', '16px')
                    .text(SETTINGS_NAVIGATION_AIDS)
                    .get(0);

                hiContrastInput = $(hiContrastInput).prop(
                    {
                        type: 'checkbox',
                        id: 'highCont',
                        name: 'highCont',
                        value: 'HighContrast'
                    }
                )
                    .on('click', switchBasemaps)
                    .get(0);

                hiContrastLabel = $(hiContrastLabel).prop('for', 'highCont')
                    .text(SETTINGS_HIGH_CONTRAST_VISIBILITY)
                    .get(0);

                // Once all elements are ready, we append them to the content <div>
                try {
                    settingsDivContent = appendChildElements(
                        settingsDivContent,
                        [
                            customNav,
                            document.createElement('br'),
                            noSlopeInput,
                            noSlopeLabel,
                            document.createElement('br'),
                            simplifyInput,
                            simplifyLabel,
                            document.createElement('br'),
                            navAids,
                            document.createElement('br'),
                            hiContrastInput,
                            hiContrastLabel,
                            document.createElement('br')
                        ]
                    );
                    settingsDiv = appendChildElements(settingsDiv, [hr, settingsDivContent]);
                } catch (e) {
                    logError(e);
                }

                // Finally, we return the main container div with the <hr> and the content <div>
                return settingsDiv;
            }

            /**
             * Helper function. Dynamically creates the directions widget that displays the text directions
             * when a user is mapping a route
             *
             * @return {HTMLDivElement}
             */
            function createDirectionsDiv() {
                /** @type {HTMLDivElement} */
                let directionsDiv = document.createElement('div'),
                    /** @type {HTMLHRElement} */
                    hr = document.createElement('hr'),
                    /** @type {HTMLDivElement} */
                    directionsBox = document.createElement('div');

                // Using jQuery here to help simplify the configuration of each element we are creating. The call to
                // get(0) returns the modified DOM element and assigns it back to the correct variable.
                directionsDiv = $(directionsDiv).prop('id', 'directions')
                    .css('display', 'block')
                    .get(0);

                hr = $(hr).css(
                    {
                        width: '100%',
                        height: '25px',
                        backgroundColor: '#002145',
                        textAlign: 'left',
                        marginLeft: '0',
                        marginTop: '0'
                    }
                )
                    .get(0);

                directionsBox = $(directionsBox).prop('id', 'directionsBox')
                    .css('paddingLeft', '5px')
                    .get(0);

                // Once all elements are ready, we append them to the directions <div> and return it
                try {
                    directionsDiv = appendChildElements(directionsDiv, [hr, directionsBox]);
                } catch (e) {
                    logError(e);
                }

                return directionsDiv;
            }
			const searchParams = new URLSearchParams(window.location.search); //window.location.search contains everything to the right of a ? in the url

 

			view.when(() =>{    //wait for the mapview to be ready otherwise the zoom to does not function

				testURLParams(searchParams);

			})
				
			 function testURLParams(params){

			acceptedURLParams.forEach((urlParam) => {

				//TODO: accepting multiple params as well as a to... from... param for directions

				//TODO: there is no error code for an invalid parameter name

				if(params.has(urlParam)){

					let value = params.get(urlParam);

					classifyURLParams(value);

				}

			})

		}



		function classifyURLParams(param){

			permalinkRegexPatterns.forEach((obj,index,arr) => {

				if(obj.pattern.test(param)){

					//TODO: get unique values from the permalinkRegexPatterns classes instead of hard coding them here in the switch statement

					//arr.length = index++; breaks the forEach loop

					switch(obj.class){

						case "OldWayfinding":

							arr.length = index++;

							lookupOldWAYFUID(param);

							break;

						case "UnifiedPOIUID":

							arr.length = index++;

							searchUnifiedPOI(param)

							break;

						case "BuildingCode":

							arr.length = index++;

							searchBuildingCode(param);

							break;

						case "BuildingUID":

							arr.length = index++;

							selectBuildingPoly(param);

							break;



					}

				}

				if(arr.length == index + 1){

					console.error("Invalid URL Parameter value");

				}

			})

		}



		function lookupOldWAYFUID(bldgno){

			let query = buildingLookupFl.createQuery();

			query.where = "bldgno = '" + bldgno + "'";

			buildingLookupFl.queryFeatures(query)

				.then((response) => {

					if(response.features.length > 0){

						selectBuildingPoly(response.features[0].attributes.wayf_uid);

					} else {

						console.error("cannot find bldgno " + bldgno + " in buildingLookupFl");

					}

				}), (error) => {

					console.error(error);

				};

		};



		function searchUnifiedPOI(wayf_uid){

			let query = unifiedFL.createQuery();

			query.where = "WAYF_UID = '" + wayf_uid.toUpperCase() + "'";

			unifiedFL.queryFeatures(query)

				.then((response) => {

					if(response.features.length > 0){

						searchWidget1.search(response.features[0].attributes.PLACENAME);

					} else {

						console.error("cannot find WAYF_UID in unified POI");

					}

				}), (error) => {

					console.error(error);

				};

		};

				

		function searchBuildingCode(buildingCode){

			let query = unifiedFL.createQuery();

			query.where = "CODE = '" + buildingCode.toUpperCase() + "'";

			unifiedFL.queryFeatures(query)

				.then((response) => {

					if(response.features.length > 0){

						selectBuildingPoly(response.features[0].attributes.WAYF_UID);

					} else {

						console.error("cannot find BUILDING_CODE in unified POI");

					}

				}), (error) => {

					console.error(error);

				};

		};



		function selectBuildingPoly(wayf_uid){

			let query = poiPoly.createQuery();

			query.where = "WAYF_UID = '" + wayf_uid.toUpperCase() + "'";

			query.returnGeometry = true;

			poiPoly.queryFeatures(query)

				.then((response) => {

					if(response.features.length > 0){

						view.goTo(response.features[0].geometry.extent.expand(2));

						view.popup.open({

							features: response.features

						});

					} else {

						console.error("cannot find WAYF_UID in poiPoly");

					}

				}), (error) => {

					console.error(error);

				};

		}
            /** @type {Object} popup template settings for various feature layers */
            const popupTemplate = {
                title: '{PLACENAME}',
                outFields: ['*'],
                content: popupTemplating
            },
                /** @type {FeatureLayer} Feature layer for search widget 1 */
                sw1FeatureLayer = new FeatureLayer(
                    {
                        // POI feature class
                        url: unifiedPOIUrl,
                        popupTemplate: popupTemplate,
                        outFields: ['*']
                    }
                ),

                /** @type {Search} The top search widget that acts as an origin in the routing */
                searchWidget1 = new Search(
                    {
                        container: 'searchBox1',
                        includeDefaultSources: false,
                        locationEnabled: false,
                        maxResults: 6,
                        maxSuggestions: 6,
                        popupEnabled: true,
                        resultGraphicEnabled: true,
                        searchFields: ['placename', 'placename2', 'code'],
                        sources: [
                            {
                                displayField: 'placename',
                                exactMatch: false,
                                layer: sw1FeatureLayer,
                                maxResults: 6,
                                maxSuggestions: 6,
                                name: SEARCH_WIDGET_NAME,
                                outFields: ['*'],
                                placeholder: SEARCH_WIDGET_PLACEHOLDER,
                                searchFields: ['placename', 'placename2', 'code'],
								resultSymbol: {
								   type: "simple-marker",  // autocasts as new PictureMarkerSymbol()
								  //url: this.basePath + "/images/search/search-symbol-32.png",
								   size: 15,
								   color:"#B21511",
								   outline: {  // autocasts as new SimpleLineSymbol()
									   
									color: [ 234, 67, 45, 1 ],
									width: "5px"
								  }
							   }
                            }
                        ],
												
                        view: view
                    }
                ),
				 
                /** @type {FeatureLayer} Feature layer for search widget 2 */
                sw2FeatureLayer = new FeatureLayer(
                    {
                        // POI feature class
                        url: unifiedPOIUrl,
                        outFields: ['*']
                    }
                ),

                /** @type {Search} The bottom search widget that acts as a destination in the routing */
                searchWidget2 = new Search(
                    {
                        container: 'searchBox2',
                        includeDefaultSources: false,
                        locationEnabled: false,
                        maxResults: 6,
                        maxSuggestions: 6,
                        popupEnabled: false,
                        sources: [
                            {
                                displayField: 'placename',
                                exactMatch: false,
                                layer: sw2FeatureLayer,
                                maxResults: 6,
                                maxSuggestions: 6,
                                name: SEARCH_WIDGET_NAME,
                                outFields: ['*'],
                                placeholder: SEARCH_WIDGET_PLACEHOLDER,
                                searchFields: ['placename', 'placename2', 'code']
                            }
                        ],
                        view: view,
                        visible: false
                    }
                ),

                /** @type {HTMLDivElement} Create the HTML for the additional custom navigation settings, the checkboxes. */
                settingsDiv = createSettingsDiv(),

                /** @type {Expand} Put the above html into an expand widget, so it can be expanded and collapsed on click */
                settingsExpand = new Expand(
                    {
                        view: view,
                        expandIconClass: EXPAND_WIDGET_ACCESSIBILITY_ICON_CLASS,
                        expandTooltip: EXPAND_WIDGET_ACCESSIBILITY_HELP_TEXT,
                        content: settingsDiv,
                        mode: 'floating',
                        arialabel: EXPAND_WIDGET_ACCESSIBILITY_HELP_TEXT,
                        role: 'Button'
                    }
                ),

                /** @type {HTMLDivElement} Create the div that will contain the written directions */
                directionsDiv = createDirectionsDiv(),

                /** @type {Expand} Put the above html into an expand widget, so it can be expanded and collapsed on click */
                directionsExpand = new Expand(
                    {
                        view: view,
                        expandIconClass: EXPAND_WIDGET_DIRECTIONS_ICON_CLASS,
                        expandTooltip: EXPAND_WIDGET_DIRECTIONS_HELP_TEXT,
                        content: directionsDiv,
                        mode: 'floating',
                        visible: false
                    }
                ),

                // Initialize the lists we will need for mapping routes
                /** @type {Array<number>} Contains a list of returned route lengths, used for determining shortest route */
                routeLengths = [],
                /** @type {Array<Object>} Contains a list of route objects, each with information about each returned route */
                routeObjects = [],
                /** @type {Array<Object>} Contains a list of route directions for each returned route */
                routeDirections = [];

				

			/**
             * Start of permalink code
             */
		
            /**
             * Click handler. Fires when the direction button is clicked
             */
            function toggleDirections() {
				
                /** @type {jQuery} jQuery object representing the travel mode box element */
                const travelModeBox = $('#travelModeBox'),
                    /** @type {jQuery} jQuery object representing the directions button */
                    directionsButton = $('#directionsButton'),
                    /** @type {jQuery} jQuery object representing the directions box element */
                    directionsBox = $('#directionsBox'),
                    /** @type {boolean} Flag indicating whether the travel mode box element is hidden or not */
                    isTravelBoxHidden = $('#travelModeBox:hidden').length > 0;

                // if the travel mode box element is hidden
                if (isTravelBoxHidden) {
					searchWidget1.sources.items[0].placeholder = "Enter your starting location"
					searchWidget2.sources.items[0].placeholder = "Enter your desination"
					

                    // Display the travel mode box
                    travelModeBox.css('display', 'flex');
                    directionsButton.addClass('active-button');

                    // Show the second search widget (Destination)
                    _.set(searchWidget2, 'visible', true);
                    // And the box that displays the written direction)s
                    _.set(directionsExpand, 'visible', true);
                    directionsMode = true;
                // if the travel mode box element is not hidden
                } else {
					searchWidget1.sources.items[0].placeholder = "Search for a place"
                    // hide all the elements that appear in the above step
                    travelModeBox.css('display', 'none');
                    directionsButton.removeClass('active-button');
                    _.set(searchWidget2, 'visible', false);
                    _.set(directionsExpand, 'visible', false);
                    // And clear the second search widget / directions, remove the route from the map).
                    searchWidget2.clear();
                    directionsBox.html('');
                    view.graphics.removeAll();
                    directionsMode = false;
                }
            }

            /**
             * Event handler. Fires when the 'trigger-action' event is dispatched
             * @param event
             */
            function popupTriggerAction(event) {
                // Create an action that will start directing the user to the popups location
                if (!_.isUndefined(_.get(event, 'action.id')) && _.get(event, 'action.id') === 'directions') {
                    toggleDirections();

                    // If the user has clicked the destination box put the popup as the destination
                    if (destFocus) {
                        _.set(searchWidget2, 'searchTerm', _.get(view, 'popup.title'));
                    }

                    // Otherwise set it as the origin
                    if (originFocus) {
                        _.set(searchWidget1, 'searchTerm', _.get(view, 'popup.title'));
                    }

                    // If the other search term is already filled in, and we haven't searched yet, fire the search.
                    /** @type {string} */
                    const curSrchTerm1 = _.get(searchWidget1, 'searchTerm', ''),
                        /** @type {string} */
                        curSrchTerm2 = _.get(searchWidget2, 'searchTerm', '');

                    if (!_.isEmpty(curSrchTerm1) && curSrchTerm1 !== prevSrchTerm1) {
                        searchWidget1.search();
                        prevSrchTerm1 = curSrchTerm1;

                    }

                    if (!_.isEmpty(curSrchTerm2) && curSrchTerm2 !== prevSrchTerm2) {
                        searchWidget2.search();
                        prevSrchTerm2 = curSrchTerm2;
                    }
                }
            }

            /**
             * Function the tests the length of each route and returns the shortest one
             *
             * @param {Stop} stop1
             * @param {Stop} stop2
             * @param {number} n
             */
            function getRoute(stop1, stop2, n) {
				
                // We want to add the construction barriers to the route layer
                _.set(routeLayer, 'pointBarriers', pointBarriers);

                /** @type {Object} Options for the route params*/
                const routeParamsOptions = {
                    returnRoutes: true,
                    returnDirections: true,
                    directionsOutputType: 'standard',
                    outputLines: 'true-shape-with-measure',
                    travelMode: tMode,
                    layer: routeLayer,
                    // We want to add the construction barriers from the route layer
                    pointBarriers: _.get(routeLayer, 'pointBarriers', []),
                    directionsLengthUnits: 'meters',
                    stops: new Collection(
                        [
                            new Stop(
                                {
                                    name: origName,
                                    geometry: {
                                        x: _.get(stop1, 'geometry.x', 0),
                                        y: _.get(stop1, 'geometry.y', 0)
                                    }
                                }
                            ),
                            new Stop(
                                {
                                    name: destName,
                                    geometry: {
                                        x: _.get(stop2, 'geometry.x', 0),
                                        y: _.get(stop2, 'geometry.y', 0)
                                    }
                                }
                            )
                        ]
                    )
                },
                    // Set the route parameters, using the correct travel mode, routing layer with barriers and the
                    // chosen origin and destination stops
                    /** @type {RouteParameters} */
                    routeParams = new RouteParameters(routeParamsOptions);

                // Clear the route lists
                _.remove(routeLengths);
                _.remove(routeObjects);
                _.remove(routeDirections);

                /**
                 * Callback. Used to iterate through all the route results and populate the route list arrays
                 *
                 * @param {RouteResult} result
                 */
                function populateRouteLists(result) {
					
                    // Keep track of the length of each of these
                    /** @type {number} */
                    const totalLength = _.get(result, 'route.attributes.Total_Length', 0),
                        /** @type {Object} */
                        routeObject = _.get(result, 'route', {}),
                        /** @type {Array<Graphic>} */
                        directions = _.get(result, 'directions.features', []);
                    // make sure we don't grab any empty data
                    if (totalLength > 0 && !_.isEmpty(directions)) {
                        routeLengths.push(totalLength);
						
                        routeObjects.push(routeObject);
                        routeDirections.push(directions);
                    }
                }

                /**
                 * Helper function. Finds the smallest number in an array filled with numbers
                 *
                 * @param {Array<number>} arr
                 * @return {number}
                 */
                function arrayMin(arr) {
                    return Math.min.apply(Math, arr);
                }

                /**
                 * Callback. Fires when the route.solve() method returns a fulfilled promise with a RouteSolveResult set
                 *
                 * @param {RouteSolveResult} data
                 */
                function routeSolveCallback(data) {
					
                    // Route between all combination of origin and destination entrances
                    data.routeResults.forEach(populateRouteLists);
					
                    // If we've collected all the routes
                    if (_.get(routeLengths, 'length', 0) === n) {
						
                        // Chose the shortest route based on length, also grab it's associated directions
                        /** @type {number} */
                        const chosenRouteIndex = routeLengths.indexOf(arrayMin(routeLengths)),
                            /** @type {Object} */
                            chosenRoute = _.get(routeObjects, `[${chosenRouteIndex}]`, {}),
                            /** @type {Array} */
                            chosenDirections = _.get(routeDirections, `[${chosenRouteIndex}]`, []),
                            /** @type {number} */
                            chosenDirectionsLength = _.get(chosenDirections, 'length', 0),
                            /** @type {jQuery} */
                            directionsBox = $('#directionsBox'),
                            /** @type {Object} */
                            chosenRouteSymbol = {
                                type: 'simple-line',
                                color: [5, 150, 255],
                                width: 3
                            };

                        // Symbolize the line that is drawn for the route
                        _.set(chosenRoute, 'symbol', chosenRouteSymbol);

                        /** @type {DocumentFragment} a document fragment to hold our directions instructions */
                        directionsHTML = document.createDocumentFragment();

                        // Go through the returned directions and place them into the directions box, along with some
                        // custom changes to the HTML
                        /** @type {number} */
                        for (let i = 0; i < chosenDirectionsLength; i++) {
                            /** @type {Object} */
                            const directionsAttrs = _.get(chosenDirections, `[${i}].attributes`, {}),
                                /** @type {number} The number of meters to be travelled during this step of the directions */
                                lengthNum = Math.round(_.get(directionsAttrs, 'length', 0));

                                /** @type {string} The directions for this step */
                            let directionsText = _.get(directionsAttrs, 'text', '');
							
                            if (!_.isEmpty(directionsText)) {
                                // if this is not the first or the last step, we'll append instructions to indicate
                                // how many meters to travel
                                if (i !== 0 && i !== (chosenDirectionsLength - 1) && !directionsText.includes('then')) {
                                    directionsText = `${directionsText} and continue for ${lengthNum.toString()} metres`;
                                }

                                // Add this step to the new directions box content
                                try {
                                    directionsHTML = appendChildElements(directionsHTML, directionsText);
                                    directionsHTML = appendTrailingBrElement(directionsHTML, 2);
                                } catch (e) {
                                    logError(e);
                                }
                            }
                        }

                        // Clear the directions box and add the new directions to it
                        directionsBox.html('')
                            .append(directionsHTML);

                        // Remove the previous route and
                        view.graphics.removeAll();
						view.graphics.add(chosenRoute);
      					view.goTo(chosenRoute.geometry.extent)
                    }
                }

                /**
                 * Callback. Fires when the route.solve() fails to return a fulfilled promise.
                 *
                 * @param {Error} err
                 */
                function routeSolveCatchCallback(err) {
                    alert('Cannot find route between these two locations.');
                    logError(err);
                }

                // Solve the route. If successful, routeSolveCallback() is executed
                route.solve(routeUrl, routeParams).then(routeSolveCallback)
                    // If the routing fails, display a message to the user and in the console
                    .catch(routeSolveCatchCallback);
            }

            /**
             * Function to test each entrance that was found
             * @param {Array<Stop>} sArray1
             * @param {Array<Stop>} sArray2
             */
            function routeResults(sArray1, sArray2) {
				
                /** @type {number} */
                const sa1Length = _.get(sArray1, 'length', 0),
                    /** @type {number} */
                    sa2Length = _.get(sArray2, 'length', 0);

                // Only route if we have stops to test both to and from
                if (sa1Length > 0 && sa2Length > 0) {
                    // reset the route count
                    routeCount = 0;

                    for (let i = 0; i < sa1Length; i++) {
                        for (let j = 0; j < sa2Length; j++) {
                            routeCount += 1;
                        }
                    }

                    for (let i = 0; i < sa1Length; i++) {
                        for (let j = 0; j < sa2Length; j++) {
                            getRoute(sArray1[i], sArray2[j], routeCount);
                        }
                    }
                }
            }

            /**
             * Creates a filter callback. Used by entranceQueryCallbackOne() to filter the stop arrays
             * @param {Object} stop
             * @param {string|undefined} filterType
             * @return {(function(Object): boolean)}
             */
            function createFilterCallback(stop, filterType) {
                /**
                 * Filter callback. Used to filter out stop arrays
                 *
                 * @param {Object} item A stop object
                 */
                return function (item) {
                /** @type {number} */
                const itemGeomX = _.get(item, 'geometry.x'),
                    /** @type {number} */
                    itemGeomY = _.get(item, 'geometry.y'),
                    /** @type {number} */
                    stopGeomX = _.get(stop, 'geometry.x'),
                    /** @type {number} */
                    stopGeomY = _.get(stop, 'geometry.y');

                    // Ensure we have all the x and y values we need, otherwise we return false to remove this item
                    if (!_.isUndefined(itemGeomX) && !_.isUndefined(itemGeomY) && !_.isUndefined(stopGeomX) && !_.isUndefined(stopGeomY)) {
                        // check to see if we are filtering a removed stop array or not
                        if (!_.isUndefined(filterType) && filterType === STOP_FILTER_TYPE_REMOVED) {
                            return itemGeomX === stopGeomX && itemGeomY === stopGeomY;
                        } else {
                            return itemGeomX !== stopGeomX && itemGeomY !== stopGeomY;
                        }
                    } else {
                        return false;
                    }
                }
            }

            /**
             * Callback. Fires when the crosswalkTable.queryFeatures() method returns a fulfilled promise.
             *
             * @param {FeatureSet} results
             * @return {Array[]}
             */
            function entranceQueryCallbackOne(results) {
                /** @type {number} */
                const numResultFeatures = _.get(results, 'features.length', 0);

                // If we have entrances that need to be removed
                if (numResultFeatures > 1) {
                    // Go through the results and push the stops into an array
                    for (let i = 0; i < numResultFeatures; i++) {
                        // Organize them into stops that have been removed, sot hat they can be added back later, and also the new list of accessible only stops
                        /** @type {Object} */
                        const stop = {
                            geometry: {
                                x: _.get(results, `features[${i}].geometry.longitude`),
                                y: _.get(results, `features[${i}].geometry.latitude`)
                            }
                        };

                        // Ensure we have actual geometry values to work with
                        if (!_.isUndefined(_.get(stop, 'geometry.x')) && !_.isUndefined(_.get(stop, 'geometry.y'))) {
                            // Filter the stop arrays
                            stopArray2Removed = stopArray2.filter(createFilterCallback(stop, STOP_FILTER_TYPE_REMOVED));
                            stopArray2 = stopArray2.filter(createFilterCallback(stop));
                            stopArray1Removed = stopArray1.filter(createFilterCallback(stop, STOP_FILTER_TYPE_REMOVED));
                            stopArray1 = stopArray1.filter(createFilterCallback(stop));
                        }
                    }
                // Otherwise just push the single stop into the array
                } else if (numResultFeatures === 1) {
                    /** @type {Object} */
                    const stop = {
                        geometry: {
                            x: _.get(results, 'features[0].geometry.longitude'),
                            y: _.get(results, 'features[0].geometry.latitude')
                        }
                    };

                    // Ensure we have actual geometry values to work with
                    if (!_.isUndefined(_.get(stop, 'geometry.x')) && !_.isUndefined(_.get(stop, 'geometry.y'))) {
                        // Filter the stop arrays
                        stopArray2Removed = stopArray2.filter(createFilterCallback(stop, STOP_FILTER_TYPE_REMOVED));
                        stopArray2 = stopArray2.filter(createFilterCallback(stop));
                        stopArray1Removed = stopArray1.filter(createFilterCallback(stop, STOP_FILTER_TYPE_REMOVED));
                        stopArray1 = stopArray1.filter(createFilterCallback(stop));
                    }
                }

                return Promise.resolve([stopArray1, stopArray2]);
            }

            // Then route using the new filtered stopArrays
            /**
             * Callback. Fires when entranceQueryCallbackOne() returns a fulfilled promise.
             *
             * @param {Array<Array>} stopResultArray
             */
            function entranceQueryCallbackTwo(stopResultArray) {
                // If the user is in directions mode, call routeResults()
                if (directionsMode) {
                    routeResults(stopResultArray[0], stopResultArray[1])
                }
            }

            /**
             * Function that changes the entrances between accessible only and all
             *
             * @param {string} entranceMode
             */
            function changeEntrances(entranceMode) {
                // If we are only routing to accessible entrances
                if (entranceMode === ENTRANCE_TYPE_ACCESSIBLE) {
                    // We need a query to remove the non-accessible entrances
                    /** @type {string} */
                    const endQueryForFilter = `(WAYF_UID = '${poId1}' OR WAYF_UID = '${poId2}') AND ACCESSIBLE = '0'`,
                        /** @type {Query} */
                        query = new Query();

                    // And a query to select the accessible entrances or points that are not entrances (NULL) (such as a park)
                    endQuery = ' AND (ACCESSIBLE = \'1\' OR ACCESSIBLE IS NULL)';

                    // Set up a query with the entrances that we want to remove
                    _.set(query, 'where', endQueryForFilter);
                    _.set(query, 'returnGeometry', true);
                    _.set(query, 'outFields', ['WAYF_UID']);

                    // query the stop features
                    crosswalkTable.queryFeatures(query).then(entranceQueryCallbackOne)
                        .then(entranceQueryCallbackTwo);
                // If we can route to all entrances
                } else if (entranceMode === ENTRANCE_TYPE_ALL) {
                    // We don't need a query to filer
                    endQuery = '';

                    // And we can add back any non-accessible entrances that were removed
                    stopArray1 = stopArray1.concat(stopArray1Removed);
                    stopArray2 = stopArray2.concat(stopArray2Removed);

                    // And then we can reroute
                    routeResults(stopArray1, stopArray2);
                    // If we are only routing to accessible entrances
                }
            }

            //
            /**
             * Click handler. Fires when the base travel mode buttons are clicked
             *
             * @param {string} bMode
             */
            function changeTravelMode(bMode) {
                /** @type {string} */
                const theMode = (`${bMode} ${steepStr} ${simplifyStr}`)
                        .trim()
                        .replace(/\s{2,}/, ' '),
                    /** @type {jQuery} */
                    walkButton = $('#walkButton'),
                    /** @type {jQuery} */
                    accessButton = $('#accessButton'),
                    /** @type {jQuery} */
                    bikeButton = $('#bikeButton'),
                    /** @type {jQuery} */
                    allButtons = walkButton.add(accessButton).add(bikeButton);

                // Update the global base mode
                baseMode = bMode;

                // remove all the background colour
                allButtons.removeClass('active-button');

                // callback generator
                /**
                 * Callback generator. Creates a callback that will fire when getTravelMode() returns a fulfilled
                 * promise, using the supplied entrance type
                 *
                 * @param {string} entranceType
                 * @return {(function(): void)}
                 */
                function changeEntrancesCallback(entranceType) {
                    /**
                     * Fulfilled promise callback. Runs the changeEntrances() function with the supplied entrance type
                     */
                    return function() {
                        changeEntrances(entranceType);
                    }
                }

                // For each mode, we need to style the buttons and then get the button modes,
                // And change the available entrances to either all or only accessible.
                if (baseMode === TRAVEL_MODE_WALKING) {
                    walkButton.addClass('active-button');
                    getTravelMode(theMode)
                        .then(setTMode)
                        .then(changeEntrancesCallback(ENTRANCE_TYPE_ALL));
                    _.set(slopeFL, 'visible', false);
                } else if (baseMode === TRAVEL_MODE_ACCESSIBLE) {
                    accessButton.addClass('active-button');
                    getTravelMode(theMode)
                        .then(setTMode)
                        .then(changeEntrancesCallback(ENTRANCE_TYPE_ACCESSIBLE));
                    _.set(slopeFL, 'visible', true);
                } else if (baseMode === TRAVEL_MODE_BIKING) {
                    bikeButton.addClass('active-button');
                    getTravelMode(theMode)
                        .then(setTMode)
                        .then(changeEntrancesCallback(ENTRANCE_TYPE_ALL));
                    _.set(slopeFL, 'visible', false);
                }
            }

            /**
             * Callback. Fires when the boundary feature layer queryFeatures() method returns a fulfilled promise.
             * Creates a geofence around the UBC campus
             *
             * @param {FeatureSet} results
             */
            function geoFenceQueryCallback(results) {
                if (_.get(results, 'features.length', 0) > 0) {
                    // If we're on campus enable the tracking
                    _.set(track, 'goToLocationEnabled', true);
                } else {
                    // Otherwise display the message
                    _.set(track, 'goToLocationEnabled', false);
                    alert('Tracking is only available on the UBC Vancouver Campus')
                    track.stop()
                }
            }

            /**
             * Event Handler. Fires when the 'track' event is dispatched. Checks to see if the user is on campus or not
             */
            function geoFenceRouting() {
                // Check to see if the users location intersects with the polygon of the University Endowment Lands
                /** @type {Query} */
                const boundaryQuery = new Query();

                _.set(boundaryQuery, 'geometry', _.get(track, 'graphic.geometry'));
                _.set(boundaryQuery, 'spatialRelationship', 'intersects');
                boundaryFL.queryFeatures(boundaryQuery).then(geoFenceQueryCallback);
            }

            /**
             * Watch callback generator. Creates a callback that can be used to watch an Expand widget's expanded property.
             * Attempts to avoid UI collisions. In other words, only one expand widget can be shown at a time. This makes
             * sure that happens.
             *
             * @param {Expand} otherExpandWidget An Expand widget to test against
             * @return {(function(*, *): void)|*}
             */
            function expandWidgetCollisionDetection(otherExpandWidget) {
                /**
                 * Watch Callback. Fires when an Expand widget's expanded property changes
                 *
                 * @param {boolean} expanded
                 */
                return function (expanded) {
                    if (expanded && !!(_.get(otherExpandWidget, 'expanded')) === true) {
                        if (_.isFunction(_.get(otherExpandWidget, 'collapse'))) {
                            otherExpandWidget.collapse();
                        }
                    }
                }
            }


            /**
             * Callback Generator. Creates a callback that will fire when a search widget's search returns a
             * fulfilled promise
             * @param {number} searchWidget
             * @return {(function(*): (Array<Graphic>|[]))|*}
             */
            function createSearchQueryCallbackOne(searchWidget) {
                /**
                 * Fulfilled promise callback. Processes search results returned from a search widget
                 *
                 * @param {FeatureSet} results
                 */
                return function(results) {
                    /** @type {number} */
                    const featuresLength = _.get(results, 'features.length', 0);

                    /** @type {Array} */
                    let stopArray;

                    // Make a copy of the required stop array
                    if (searchWidget === 1) {
                        stopArray = _.cloneDeep(stopArray1);
                    } else if (searchWidget === 2) {
                        stopArray = _.cloneDeep(stopArray2);
                    }

                    // Ensure we have a copy
                    if (!_.isUndefined(stopArray)) {
                        if (featuresLength > 1) {
                            // Go through the results and push the stops into an array
                            for (let i = 0; i < featuresLength; i++) {
                                /** @type {Object} */
                                const stop = {
                                    geometry: {
                                        x: _.get(results, `features[${i}].geometry.longitude`),
                                        y: _.get(results, `features[${i}].geometry.latitude`)
                                    }
                                };

                                // Ensure the stop has x and y coordinates
                                if (!_.isUndefined(_.get(stop, 'geometry.x')) && !_.isUndefined(_.get(stop, 'geometry.y'))) {
                                    stopArray.push(stop);
                                }
                            }
                            // Otherwise just push the single one into the array
                        } else {
                            /** @type {Object} */
                            const stop = {
                                geometry: {
                                    x: _.get(results, 'features[0].geometry.longitude'),
                                    y: _.get(results, 'features[0].geometry.latitude')
                                }
                            };

                            // Ensure the stop has x and y coordinates
                            if (!_.isUndefined(_.get(stop, 'geometry.x')) && !_.isUndefined(_.get(stop, 'geometry.y'))) {
                                stopArray.push(stop);
                            }
                        }

                        // Now that we've modified the stopArray, we overwrite the original array
                        // with the updated copy.
                        if (searchWidget === 1) {
                            stopArray1 = _.cloneDeep(stopArray);
                        } else if (searchWidget === 2) {
                            stopArray2 = _.cloneDeep(stopArray);
                        }
                    }

                    // Return the appropriate array
                    if (searchWidget === 1) {
                        return Promise.resolve(stopArray1);
                    } else if (searchWidget === 2) {
                        return Promise.resolve(stopArray2);
                    }

                    // Reject the promise if the search widget isn't recognized
                    return Promise.reject(new Error('Unknown search widget.'));
                };
            }

            /**
             * Callback generator. Creates a callback that fires once the first search query callback returns a
             * fulfilled promise
             *
             * @param {number} searchWidget
             * @return {(function(*): void)|*}
             */
            function createSearchQueryCallbackTwo(searchWidget) {
                /**
                 * Fulfilled promise callback. Executes routeResults() if in directions mode after a search
                 *
                 * @param {Array}
                 */
                return function (stopResultArray) {
                    if (directionsMode) {
                        if (searchWidget === 1) {
                            routeResults(stopResultArray, stopArray2);
                        } else if (searchWidget === 2) {
                            routeResults(stopArray1, stopResultArray);
                        }
                    }
                };
            }

            /**
             * Event handler. Fires when the 'search-complete' event has been dispatched for search widget 1
             *
             * @param {Object} searchCompleteEvent
             */
            function searchOneCompleteHandler(searchCompleteEvent) {
                /** @type {Array<Object>} */
                const results = _.get(searchCompleteEvent, 'results[0].results', []),
                    /** @type {number} */
                    numResults = _.get(results, 'length', 0),
                    /** @type {Query} */
                    query = new Query();

                // If we're just searching we don't need directions
                if (directionsMode === false) {
                    view.graphics.removeAll();
                    directionsHTML = null;
                }

                // If we're in directions mode we want to zoom to the whole route rather than the search location,
                // so we turn on the goToOverride, but if we're in search mode we do want to zoom to the search point.
                _.set(searchWidget1, 'goToOverride', (directionsMode && (!!_.get(searchWidget2, 'goToOverride')) === true));

                // Reset the stop arrays
                _.remove(stopArray1);
                _.remove(stopArray1Removed);

                // If more than one search result is returned match it with the popup title
                if (numResults > 1) {
                    /** @type {number} */
                    for (let i = 0; i < numResults; i++) {
                        /** @type {Object} */
                        const attrs = _.get(results, `[${i}].feature.attributes`, {});

                        if (_.get(view, 'popup.title', '') === _.get(attrs, 'PLACENAME', '')) {
                            origName = _.get(attrs, 'PLACENAME', '');
                            poId1 = _.get(attrs, 'WAYF_UID', '');
                        }
                    }
                    // Otherwise set the origname and poid from the search result
                } else {
                    /** @type {Object} */
                    const attrs = _.get(results, '[0].feature.attributes', {});
                    origName = _.get(attrs, 'PLACENAME', '');
                    poId1 = _.get(attrs, 'WAYF_UID', '');
                }

                // Grab the ID of the searched term and create a query
                _.set(query, 'where', `WAYF_UID = '${poId1}'${endQuery}`);
                _.set(query, 'returnGeometry', true);
                _.set(query, 'outFields', ['WAYF_UID']);

                // This creates a promise that queries the data and populates the list
                crosswalkTable.queryFeatures(query).then(createSearchQueryCallbackOne(1))
                    // Then, test the route of all these results
                    .then(createSearchQueryCallbackTwo(1));
            }

            /**
             * Event handler. Fires when the 'search-complete' event has been dispatched for search widget 1
             *
             * @param {Object} searchCompleteEvent
             */
            function searchTwoCompleteHandler(searchCompleteEvent) {
                /** @type {Object} */
                const attrs = _.get(searchCompleteEvent, 'results[0].results[0].feature.attributes', {}),
                    /** @type {Query} */
                    query = new Query();

                // We never want to go to the location of the destination search
                _.set(searchWidget2, 'goToOverride', true);

                // Reset the stop arrays
                _.remove(stopArray2);
                _.remove(stopArray2Removed);

                // Grab the destination name and point of interest id
                destName = _.get(attrs, 'PLACENAME', '');
                poId2 = _.get(attrs, 'WAYF_UID', '');

                // Create a query
                _.set(query, 'where', `WAYF_UID = '${poId2}'${endQuery}`);
                _.set(query, 'returnGeometry', true);
                _.set(query, 'outFields', ['WAYF_UID']);

                // This creates a promise that querys the data and populates the list
                crosswalkTable.queryFeatures(query).then(createSearchQueryCallbackOne(2))
                    .then(createSearchQueryCallbackTwo(2));
            }

            /**
             * Helper function to help toggle the origin and destination focus flags
             *
             * @param {Event} event
             */
            function toggleFocus(event) {
                originFocus = !originFocus;
                destFocus = !destFocus;
            }

            /**
             * Click handler generator. Returns a callback that will call changeTravelMode with the supplied travel mode
             *
             * @param {string} travelMode
             * @return {(function(): void)}
             */
            function changeTravelModeClickHandler(travelMode) {
                /**
                 * Click handler. Changes the travel mode based on the supplied travel mode.
                 */
                return function () {
                    changeTravelMode(travelMode);
                }
            }

            /**
             * Callback. Fires when the MapView has successfully loaded. Finishes all map and app configurations and
             * ensures map is ready for use.
             */
            function mapLoadedCallback() {
                if (!_.isUndefined(_.get(view, 'map')) && _.isFunction(_.get(view, 'map.add'))) {
                    // Add the clickable points of interest
                    view.map.add(poiPoly);

                    // Add the clickable polygons of interest (ie building footprints)
                    view.map.add(poiFL);

                    // Add the slopes that have been identified as steep
                    view.map.add(slopeFL);
                }

                // Get all the point barrier objects
                pointBarrierfl.queryFeatures().then(ptBarrierFtrLayerQueryCb);

                // Set the POIs and building polygons to use the custom popup template.
                _.set(poiPoly, 'popupTemplate', popupTemplate);
                _.set(poiFL, 'popupTemplate', popupTemplate);

                // Add a trigger-action event handler for the popup
                if (!_.isUndefined(_.get(view, 'popup')) && _.isFunction(_.get(view, 'popup.on'))) {
                    view.popup.on('trigger-action', popupTriggerAction);
                }

                if (!_.isUndefined(_.get(view, 'ui')) && _.isFunction(_.get(view, 'ui.add'))) {
                    // Add the top search widget
                    view.ui.add(
                        searchWidget1,
                        {
                            position: 'top-left',
                            index: 10,
                        }
                    );

                    // Add the bottom search widget to the top left corner of the view
                    view.ui.add(
                        searchWidget2,
                        {
                            position: 'top-left',
                            index: 10
                        }
                    );

                    // Add the settings expand to the UI.
                    view.ui.add(
                        settingsExpand,
                        {
                            position: 'top-left',
                            index: 5,
                        }
                    );

                    // Add the directions expand to the UI
                    view.ui.add(
                        directionsExpand,
                        {
                            position: 'top-left',
                            index: 5,
                        }
                    );

                    // Add the track widget to the UI
                    view.ui.add(
                        track,
                        {
                            position: 'top-left',
                            useHeadingEnabled: false, // Don't change orientation of the map
                        }
                    );
                }

                if (_.isFunction(_.get(track, 'on'))) {
                    // The routing is only on the UBC campus, so we want to geofence it.
                    track.on('track', geoFenceRouting);
                }

                // Ensures that only one expand widget can be shown at a time, otherwise they overlap.
                reactiveUtils.watch(
                    () => _.get(directionsExpand, 'expanded', false),
                    expandWidgetCollisionDetection(settingsExpand)
                );

                reactiveUtils.watch(
                    () => _.get(settingsExpand, 'expanded', false),
                    expandWidgetCollisionDetection(directionsExpand)
                );

                if (_.isFunction(_.get(searchWidget1, 'on'))) {
                    // We also want to collapse the expand widgets when autocomplete results are shown,
                    // otherwise they overlap.
                   searchWidget1.on('suggest-complete', function(event) {

					   directionsExpand.collapse();
					   settingsExpand.collapse();
					   if(event.numResults > 1)

						event.results[0].results.sort(suggestionsOrder);    //sort results alphabetically

					})

                    // When the user finishes the search
                    searchWidget1.on('search-complete', searchOneCompleteHandler);

                    // Keep track of which search widget the user has clicked on
                    searchWidget1.on('search-focus', toggleFocus);
					
                }

                if (_.isFunction(_.get(searchWidget2, 'on'))) {
                    // We also want to collapse the expand widgets when autocomplete results are shown,
                    // otherwise they overlap.
                    searchWidget2.on('suggest-complete', function(event) {

					   directionsExpand.collapse();
					   settingsExpand.collapse();
					   if(event.numResults > 1)

						event.results[0].results.sort(suggestionsOrder);    //sort results alphabetically

					})

                    // When the user finishes the search
                    searchWidget2.on('search-complete', searchTwoCompleteHandler);

                    // Keep track of which search widget the user has clicked on
                    searchWidget2.on('search-focus', toggleFocus);
                }

                /* Manipulate DOM elements with jQuery */
                // By default, the travel mode box is hidden
                $('#travelModeBox').css('display', 'none');

                // Add a click handler to the directions toggle button
                $('#directionsButton').on('click', toggleDirections);

                // Make the walk button the default selected button, and add a click handler to set the travel mode
                $('#walkButton').addClass('active-button')
                    .on('click', changeTravelModeClickHandler(TRAVEL_MODE_WALKING));

                // Add click handlers to set travel mode when the other buttons are clicked
                $('#accessButton').on('click', changeTravelModeClickHandler(TRAVEL_MODE_ACCESSIBLE));
                $('#bikeButton').on('click', changeTravelModeClickHandler(TRAVEL_MODE_BIKING));

                // Ensure the topbuttons element is visible
                $('#topButtons').css('display', 'block');
            }

            /**
             * Callback. Fires when there is an error loading the map
             * @param {Error} err
             */
            function mapErrorCallback(err) {
                logError(err);
            }

            if (_.isFunction(_.get(view, 'when'))) {
                view.when(mapLoadedCallback, mapErrorCallback).catch(mapErrorCallback);
            }
        }
			//Array.sort() can normally be used to sort arrays, but because results are an array of objects with a "text" attribute, suggestionsOrder is used to compare a.text with b.text

		function suggestionsOrder(a,b){

			if (a.text < b.text)

				return -1;

			if (a.text > b.text)

				return 1;

			return 0; // equal

		}
		

        // Load all of our script's requirements and run requireCallback() when loading has completed
        if (_.isFunction(require)) {
            require(requirements, requireCallback);
        }
    }
)(window, document, window.jQuery, window.lodash, window.require, window.moment);
