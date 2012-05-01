dojo.provide("racquelDijits.racquelSearchDijit");

dojo.declare("racquelDijits.racquelSearchDijit",[],{
	constructor:function(params){
		this.map = params.map || null;
		this.toolbar = params.racquelToolbar;
		this.searchEnabled = true;
		if (this.map){
			//this.mapConnection = dojo.connect(this.map,"onClick",dojo.hitch(this,this.runInteractiveSearch));
			var currentCentre = this.map.extent.getCenter();
			var symbol = this.toolbar.racquelMapSymbols.crossHairSymbol;
			this.crossHairGraphic = new esri.Graphic(currentCentre,symbol);
			if (this.map.loaded) {
				this.map.graphics.add(this.crossHairGraphic);
			}
			else {
				console.log ("Map not loaded when crosshair created");
				dojo.connect(this.map,"onLoad",dojo.hitch(this,function(){
					this.map.graphics.add(this.crossHairGraphic);
				}));
			}
			dojo.connect(this.map,"onExtentChange",dojo.hitch(this,function(ext){
				this.crossHairGraphic.setGeometry(ext.getCenter());
			}));
		}
	},
	runInteractiveSearch:function(evt){
		var searchPoint = evt.mapPoint;
		var randomSymbol = new esri.symbol.SimpleMarkerSymbol().setStyle(esri.symbol.SimpleMarkerSymbol.STYLE_CROSS).setSize(12).setColor(new dojo.Color([255, 0, 0, 1])).setOutline(new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1));
		// generate the searchId number. This will be passed to and returned from all server-side searches
		// and embedded into the results as a key to access / display / delete them etc
		var searchId = new Date().getTime();
		var searchGraphic = new esri.Graphic(searchPoint, randomSymbol,{searchId:searchId});
		console.log("Initiating searches with id: "+searchId);
		var params = this.toolbar.racquelInteractiveSettings;
		this.runSearch(searchGraphic,params);
	},
	runCrossHairSearch:function(){
		var searchPoint = this.crossHairGraphic.geometry;
		var searchSymbol = new esri.symbol.SimpleMarkerSymbol().setStyle(esri.symbol.SimpleMarkerSymbol.STYLE_CROSS).setSize(12).setColor(new dojo.Color([255, 0, 0, 1])).setOutline(new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1));
		var searchId = new Date().getTime();
		var searchGraphic = new esri.Graphic(searchPoint,searchSymbol,{searchId:searchId});
		var params = this.toolbar.racquelInteractiveSettings;
		this.runSearch(searchGraphic,params);
	},
	runSearch:function(searchGraphic,searchParams){
		if (!this.searchEnabled){
			console.error("Search is not ready!");
			return;
		}
		// call the method on the toolbar to unset the tool button, in turn it will call disableSearch here to disconnect the map
		this.toolbar.disableInteractiveSearch();
		this.toolbar.disableCrossHairSearch();
		this._setMapCursor("busy"); 
		var tasklist = [];
		if (searchParams.doSite()){
			var siteSearchDef = this.toolbar.racquelSiteDijit.runSiteSearch(searchGraphic);
			tasklist.push(siteSearchDef);
		}
		if (searchParams.doRoute()){
			var routeSearchDef = this.toolbar.racquelRouteDijit.routeSearchDriver(searchGraphic);
			tasklist.push(routeSearchDef);
		}
		if (searchParams.useNetLocation){
			// TODO - implement this. If set, wait for the routesearch to run and use its network location 
			// for the catchment search
		}
		
		// Catchment QC - implemented when a result is stored, not when a search is done.
		
		if (searchParams.doCatchment()){
			var catchSearchParams = {
				searchPoint: searchGraphic,
				extractionParams: searchParams.getCatchmentParams()
				//LCM2000: searchParams.doLCM2K(),
				//Elevation: searchParams.doElev(),
				//UpstreamLength:searchParams.doUpstream()
			};
			var catchSearchDef = this.toolbar.racquelCatchDijit.runCatchmentSearch(catchSearchParams);
			tasklist.push(catchSearchDef);
		}
		if (tasklist.length > 0){
			var deferredList = new dojo.DeferredList(tasklist);
			deferredList.then (dojo.hitch(this,function(res){
				this._storeSearchResults(res);
				this.enableSearch();
				this._setMapCursor("normal");
			}));
		}
		else {
			console.log("No search types requested! Nothing done.");
			this.enableSearch();
			this._setMapCursor("normal");
		}	
	},
	_storeSearchResults:function(res){
		console.log("all searches complete, processing results");
		// Length of res object from the deferredlist may
		// vary depending on number of tasks run, so need to check which is which
		// Format into results object and add to toolbar's result store (whic may have listeners) 
		var overallResult = {};
		for (var i=0,il=res.length;i<il;i++){
			var individualResultDLItem = res[i];
			if(individualResultDLItem[0]==true){
				var individualResult=individualResultDLItem[1];
				if (individualResult.racquelResultType == "racquelSiteResult")
				{
					if (!overallResult.hasOwnProperty("searchId")){
						overallResult["searchId"] = individualResult["searchId"];
					}
					else if (overallResult["searchId"] != individualResult["searchId"]){
						console.log("Error! Inconsistent searchId in site result set");
					}
					if (!overallResult.hasOwnProperty("searchLocation")){
						overallResult["searchLocation"] = individualResult["searchLocation"];
					}
					else if (overallResult["searchLocation"] != individualResult["searchLocation"]){
						console.log("Error! Inconsistent searchLocation in site result set");
					}
					overallResult["siteResult"]=individualResult;
				}
				else if (individualResult.racquelResultType == "racquelRouteResult")
				{
					if (!overallResult.hasOwnProperty("searchId")){
						overallResult["searchId"] = individualResult["searchId"];
					}
					else if (overallResult["searchId"] != individualResult["searchId"]){
						console.log("Error! Inconsistent searchId in route result set");
					}
					if (!overallResult.hasOwnProperty("searchLocation")){
						overallResult["searchLocation"] = individualResult["searchLocation"];
					}
					else if (overallResult["searchLocation"] != individualResult["searchLocation"]){
						console.log("Error! Inconsistent searchLocation in route result set");
					}
					overallResult["routeResult"]=individualResult;
				}
				else if (individualResult.racquelResultType == "racquelCatchResult")
				{
					if (!overallResult.hasOwnProperty("searchId")){
						overallResult["searchId"] = individualResult["searchId"];
					}
					else if (overallResult["searchId"] != individualResult["searchId"]){
						console.log("Error! Inconsistent searchId in catchment result set");
					}
					if (!overallResult.hasOwnProperty("searchLocation")){
						overallResult["searchLocation"] = individualResult["searchLocation"];
					}
					else if (overallResult["searchLocation"] != individualResult["searchLocation"]){
						console.log("Error! Inconsistent searchLocation in catch result set");
					}
					overallResult["catchResults"]=individualResult;
				}
				else {
					console.log("Unknown result type!");
				}
			}
			else {
				console.log("Error in result!");
			}
		}
		// MOVED CATCHMENT QC TO HERE
		var qcStatus = this._doCatchmentQC(overallResult);
		if(qcStatus){
			overallResult['catchResults']['catchmentQC'] = qcStatus;
		}
		this.toolbar.racquelResultStore.storeWholeResult(overallResult);
		console.log("RACQUEL Results are stored!");
	},
	_doCatchmentQC:function(racquelResultObject){
		if (racquelResultObject.catchResults && racquelResultObject.catchResults.successful &&
		racquelResultObject.routeResult &&
		racquelResultObject.routeResult.successful) {
			var polygon = racquelResultObject.catchResults.catchment.geometry;
			var sourcepoint = racquelResultObject.routeResult.source.geometry;
			if (polygon.contains(sourcepoint)) {
				return "QC_OK";
			}
			else {
				return "QC_ERROR";
			}
		}
		else {
			return false;
		}
	},
	disableSearch:function(){
		// disable click listening while a search is running
		if (this.mapConnection) {
			dojo.disconnect(this.mapConnection);
			this.mapConnection = null;
		}
		this.searchEnabled = false;
		dojo.publish("racquelSearchEnabled",[false]);
		this._setMapCursor("normal");
	},
	enableSearch:function(){
		this.searchEnabled = true;
		dojo.publish("racquelSearchEnabled",[true]);
	},
	enableInteractiveSearch:function(){
		// re-enable click listening when a search is done
		if (this.map && !this.mapConnection){
			this.mapConnection = dojo.connect(this.map, "onClick", dojo.hitch(this,this.runInteractiveSearch));
			this._setMapCursor("query");
		}
		else if (!this.map){
			console.error("racquelSearchDijit: Cannot enable interactive search with no map!");
		}
		this.enableSearch();
	},
	enableCrosshairSearch:function(){
		// run search at map centre point
		if (this.map && !this.crossHairConnection){
			this.crossHairConnection = dojo.connect(this.toolbar.searchHereButton,"onClick",dojo.hitch(this,this.runCrossHairSearch));
		}
		this.enableSearch();
	},
	_setMapCursor:function(cursor){
		if(this.map){
			// See http://forums.esri.com/Thread.asp?c=158&f=2396&t=280276
			// setting the cursor on the mapdiv itself doesn't work, you have to get the sub-div
			// with suffix _layers
            var mapDivName = this.map.container.id;
            var mapLayersDivName = mapDivName + "_layers";
            if (cursor == "query") {
                dojo.byId(mapLayersDivName).style.cursor = 'crosshair';
            }
            else if (cursor == "working") {
                dojo.byId(mapLayersDivName).style.cursor = 'progress';
            }
			else if (cursor == "busy"){
				dojo.byId(mapLayersDivName).style.cursor = 'wait'
			}
            else {
            	dojo.byId(mapLayersDivName).style.cursor = 'default';
            }
		}
		
	}
})
