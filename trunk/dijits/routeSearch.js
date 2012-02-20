dojo.provide("racquelDijits.routeSearch");
dojo.require("dojo.DeferredList");

dojo.declare("racquelDijits.routeSearch",[],{
	constructor:function(params){
		this.routeResults = {routeResults:null,location:null};
		this.routeService = params.serviceConfig.racquelRouteService;
		this.riverDataService = params.serviceConfig.racquelRiversDataService;
		//this.mouthRouteSymbol = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 2);
    	//this.sourceRouteSymbol = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 255]), 2);
    	//this.mouthSymbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 12, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0]), 1), new dojo.Color([0, 255, 0]));
    	//this.sourceSymbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_DIAMOND, 12, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0]), 1), new dojo.Color([255, 0, 0]));
    	//this.locatedPointSymbol = new esri.symbol.SimpleMarkerSymbol().setStyle(esri.symbol.SimpleMarkerSymbol.STYLE_X).setSize(12).setColor(new dojo.Color([0, 255, 0, 1])).setOutline(new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 255, 0]), 1));
		//this.riversSymbol = new esri.symbol.SimpleLineSymbol().setStyle(esri.symbol.SimpleLineSymbol.STYLE_SOLID).setWidth(2).setColor(new dojo.Color([0, 255, 0, 1]));
	},
    _getSourceAndMouth: function(riverReach){
        // uses the source and mouth id encoded as attributes in the RACQUEL river link to get the corresponding
        // source, mouth, and tidal mouth point geometries; in turn these will be passed to the network analysis
        var pointsDef = new dojo.Deferred();
        var dataUrl = this.riverDataService.URL;
        var sourceLayer = this.riverDataService.Sources.LayerNum;
        var mouthLayer = this.riverDataService.Mouths.LayerNum;
        var tideLayer = this.riverDataService.TidalMouths.LayerNum;
        var tasklist = [];
        var sourceQueryTask = new esri.tasks.QueryTask(dataUrl + "/"+ sourceLayer);
        var mouthQueryTask = new esri.tasks.QueryTask(dataUrl + "/" + mouthLayer);
        var query = new esri.tasks.Query();
        query.returnGeometry = true;
        // river line records number of its from-node. The from node, in turn, records the number of the source node.
        // so we could do two queries in turn but it is probably quicker over a network to encompass both into a single
        // where clause and let oracle deal with it. Does mean coding table name here though - maybe not ideal.
        query.where = this.riverDataService.Sources.IdField + " = (SELECT "+
						this.riverDataService.Nodes.NodeSourceField + " FROM " +
						this.riverDataService.Nodes.TableName + " WHERE " +
						this.riverDataService.Nodes.IdField + " = " +
						riverReach.attributes[this.riverDataService.RiverLines.FromField] + ")"
		//query.where = "SOURCEID_FULL = (SELECT SOURCENODE_FULL FROM NRFA_SDE.IRN_NODES WHERE NODEID_FULL = " +
        //riverReach.attributes.FNODE_FULL +
        //")";
		query.outFields = [this.riverDataService.Sources.IdField];
        //query.outFields = ["SOURCEID_FULL"];
        //console.log("executing source query with clause " + query.where);
        tasklist.push(sourceQueryTask.execute(query));
        // now do the mouth
		query.where = this.riverDataService.Mouths.IdField + " = (SELECT "+
						this.riverDataService.Nodes.NodeMouthField + " FROM " +
						this.riverDataService.Nodes.TableName + " WHERE " +
						this.riverDataService.Nodes.IdField + " = " +
						riverReach.attributes[this.riverDataService.RiverLines.ToField] + ")"
		//query.where = "MOUTHID_FULL = (SELECT MOUTHNODE_FULL FROM NRFA_SDE.IRN_NODES WHERE NODEID_FULL = " +
        //riverReach.attributes.TNODE_FULL +
        //")";
        query.outFields = [this.riverDataService.Mouths.IdField];
       	//query.outFields = ["MOUTHID_FULL"];
        //console.log("executing mouth query with clause " + query.where);
        tasklist.push(mouthQueryTask.execute(query));
		
        // use a deferredlist to handle waiting until all queries have done their thing
        var dl = new dojo.DeferredList(tasklist);
        dl.addCallback(dojo.hitch(this,function(res){
            // deferredlist fires callback when all the Deferreds that are part of it have themselves fired their 
            // callbacks. 
            // res will be an array of results from each of the deferred tasks (queries), pass this back to the 
            // calling function
            //var sourceGraphic = new esri.Graphic(res[0][1].features[0].geometry, this.sourceSymbol, {});
            //var mouthGraphic = new esri.Graphic(res[1][1].features[0].geometry, this.mouthSymbol, {});
            var sourceGraphic = new esri.Graphic(res[0][1].features[0].geometry, null, {});
            var mouthGraphic = new esri.Graphic(res[1][1].features[0].geometry, null, {});
   		pointsDef.callback({
                source: sourceGraphic,
                mouth: mouthGraphic
            });
        }));
        return pointsDef; // calling function will be alerted when pointsDef.callback is called above
    },
	
    /***
     * Finds a route between two points along the RACQUEL Rivers network, using a Network Analyst service. The service
     * is configured to respect flow direction so route will only be located from upstream->downstream. Returns the
     * dojo.Deferred, which will be callbacked with the routeresults object.
     * @param {esri.graphic} from
     * @param {esri.graphic} to
     */
	_getRouteBetweenPoints:function(from,to){
		var routeParams = new esri.tasks.RouteParameters();
		routeParams.stops = new esri.tasks.FeatureSet();
		routeParams.outSpatialReference = {"wkid":27700}; // TODO: get from map
		var routeTask = new esri.tasks.RouteTask(this.routeService.URL);
		routeParams.stops.features.push(from);
		routeParams.stops.features.push(to);
		console.log("Searching for route from: ("+from.geometry.x+","+from.geometry.y+") to ("+
				to.geometry.x+","+to.geometry.y+")");
		var routeDeferred = routeTask.solve(routeParams);
		return routeDeferred;	
	},
	/***
	 * Get the first or last vertex of a line as a point. Used to identify the network location that was applied
	 * in the route searches - i.e. the input point that has been snapped onto the river network by the internal
	 * logic of the Network Analysis service. Useful to ensure that catchment is delineated from a point actually
	 * on the network and is thus consistent with routes
	 * @param {Object} routeline
	 * @param {Object} whichend
	 */
	_getLineEndPoint:function(routeline,whichend){
		var startpoint;
		if(whichend=="start"){
			var linecoords = routeline.geometry.paths[0];
			var coords = linecoords[0];
			startpoint = new esri.geometry.Point(coords[0],coords[1],routeline.geometry.spatialReference);
		}
		else{
			var linecoords = routeline.geometry.paths[0];
			var length = linecoords.length;
			var coords = linecoords[length-1];
			startpoint = new esri.geometry.Point(coords[0],coords[1],routeline.geometry.spatialReference);
		}
		return startpoint;
	},
	/***
     * Main "public" function to tie together the stages in identifying the RACQUEL network routes. Takes an input point, 
     * retrieves the associated river reach, the associated source and mouth points, and creates routes. 
     * Returns a Dojo.Deferred that will be callback-ed with the RouteResults in an object
     * @param {esri.Graphic} searchPointGraphic
     */
	routeSearchDriver:function(searchPointGraphic){
		console.log("Route search initiating with id: "+searchPointGraphic.attributes["searchId"]);
		var routeSearchDeferred = new dojo.Deferred();
		var getRiverDef = this.getSelectedRiver(searchPointGraphic);
		var getPointsDef;
		getRiverDef.then(
			dojo.hitch(this,function(riverResult){
			var riverSegment = riverResult.features[0];
			if (!riverSegment){
				var overallResults={
							searchId: searchPointGraphic.attributes.searchId,
							successful:false,
							racquelResultType: "racquelRouteResult"
						};
				routeSearchDeferred.callback(overallResults);
				return;
			}
			//riverSegment.setSymbol(this.riversSymbol);
			getPointsDef = this._getSourceAndMouth(riverSegment);
			getPointsDef.then(dojo.hitch(this,function(pointsResult){
				var templist=[];
				var sourceGraphic = pointsResult.source;
				var mouthGraphic = pointsResult.mouth;
				// we've added an attribute called searchId to the searchPointGraphic. The network solver doesn't like
				// this so make a temporary copy without it.
				//var tempSearchGraphic = new esri.Graphic(searchPointGraphic.geometry,this.clickPointSymbol);
				var tempSearchGraphic = new esri.Graphic(searchPointGraphic.geometry);
				
				//getRouteBetweenPoints returns a dojo.deferred. Make a list of those and turn it into
				//a deferredlist to alert us when both calls to the route search have finished
				//console.log("Initiating route search from source to site");
				templist.push(this._getRouteBetweenPoints(sourceGraphic,tempSearchGraphic));
				//console.log("Initiating route search from site to mouth");
				templist.push(this._getRouteBetweenPoints(tempSearchGraphic,mouthGraphic));
				var dl = new dojo.DeferredList(templist);
				dl.addCallback(dojo.hitch(this,function(res){
					if(!res[0][0]||!res[1][0]){
						// one or both of the server calls didn't return a successful result
						var overallResults={
							searchId: searchPointGraphic.attributes.searchId,
							successful:false,
							racquelResultType: "racquelRouteResult"
						};
						routeSearchDeferred.callback(overallResults);
					}
                    if (res[0][1].routeResults[0] && res[1][1].routeResults[0]) {
						// both route tasks submitted to the server returned ok...
                        var sourceRoute = res[0][1].routeResults[0].route;
                        var mouthRoute = res[1][1].routeResults[0].route;
                       // sourceRoute.setSymbol(this.sourceRouteSymbol);
                        //mouthRoute.setSymbol(this.mouthRouteSymbol);
						// but if no route is found then there may be just a blank geometry. 
                        if (sourceRoute.geometry.paths.length == 0 || mouthRoute.geometry.paths.length == 0) {
							var overallResults = {
								searchId: searchPointGraphic.attributes.searchId,
								successful: false,
								racquelResultType: "racquelRouteResult"
							};
							console.log("Error in route search: no route found!");
							routeSearchDeferred.callback(overallResults);
						}
						else {
							// or everything might be ok
							var locPoint = this._getLineEndPoint(sourceRoute, "end");
							//var netLocationGraphic = new esri.Graphic(locPoint, this.locatedPointSymbol, {});
							var netLocationGraphic = new esri.Graphic(locPoint, null, {});
							var overallResults = {
								searchId: searchPointGraphic.attributes.searchId,
								successful: true,
								racquelResultType: "racquelRouteResult",
								riverSegment: riverSegment,
								source: sourceGraphic,
								mouth: mouthGraphic,
								sourceRoute: sourceRoute,
								mouthRoute: mouthRoute,
								searchLocation: searchPointGraphic,
								netLocation: netLocationGraphic
							}
							console.log("Route search completed for id: " + searchPointGraphic.attributes.searchId);
							routeSearchDeferred.callback(overallResults);
						}
                    }
					else{
						var overallResults = {
							searchId: searchPointGraphic.attributes.searchId,
							successful:false,
							racquelResultType: "racquelRouteResult"
						}
						routeSearchDeferred.callback(overallResults);
					}
				}));
			
			
			}));
		}));
		return routeSearchDeferred;
	},
    /***
     * "Public" method, also called internally. Takes an input point (e.g. from a map click event) and returns the nearest river line feature from the
     * racquel riverlines dataset, with a maximum search distance of 250m.
     * Query is executed using the sdo_geometry sdo_nn function to return the one nearest
     * line without the need to load all lines locally and use esri methods. Returns a dojo.deferred that will
     * be call-backed by the query task with a featureset containing the one reach as a graphic.
     * @param {esri.geometry.point} point
     */
    getSelectedRiver: function(searchPointGraphic){
        // first part of a search is getting the selected river reach. Network Analysis actually automatically 
        // snaps to the nearest section within a tolerance. But we need to do it manually too in order to look up
        // the node information. We are assuming that the network analysis will snap to the same reach...! 
        // The tolerance for snapping in the network layer service is set to 250m. So we do the same for this search.
        var sdoQuery = new esri.tasks.Query;
		var queryURL = this.riverDataService.URL;
		var queryLayer = this.riverDataService.RiverLines.LayerNum;
        var sdoQueryTask = new esri.tasks.QueryTask(queryURL + "/" + queryLayer);
        sdoQuery.outFields = this.riverDataService.RiverLines.FetchFields;
        sdoQuery.returnGeometry = true;
        var sdoResult;
        var point = searchPointGraphic.geometry;
        var x = point.x;
        var y = point.y;
        var where = "sdo_nn(shape,mdsys.sdo_geometry(2001,81989,mdsys.sdo_point_type(" +
        x +
        "," +
        y +
        ",null),null,null),'sdo_num_res=1',1)='TRUE' AND " +
        "sdo_within_distance(shape,mdsys.sdo_geometry(2001,81989,mdsys.sdo_point_type(" +
        x +
        "," +
        y +
        ",null),null,null),'distance=250 UNIT=M')='TRUE'";
        sdoQuery.where = where;
        sdoDeferred = sdoQueryTask.execute(sdoQuery);
        return sdoDeferred;
    }
})

