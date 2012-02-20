dojo.provide("racquelDijits.siteSearch");
dojo.require("esri.tasks.identify");
dojo.declare("racquelDijits.siteSearch",[],{
	constructor:function(params){
		params = params || {};
		this.map = params.map || null
		this.identifyServiceLoc = params.serviceConfig.racquelSiteService.URL ||
			"http://wlwater.ceh.ac.uk/ArcGIS/rest/services/IRN/IRN_Polygon_Datasets/MapServer"; // default
		this.layerIds= params.serviceConfig.racquelSiteService.Layers || 
			[0,1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17]; // default
		this.layerOption= params.serviceConfig.racquelSiteService.LayerOption || 
			esri.tasks.IdentifyParameters.LAYER_OPTION_ALL;
	},
	runSiteSearch:function(searchPointGraphic){
		// Unlike Query Task, Identify Task uses a map to work out, from the visible extent, the tolerance 
		// for the search.
		// We want this dijit not to have to rely on a map, so if there isn't one then set some defaults
		// to give a 200m search radius.
		console.log("Site search initiating");
		var identifyParams = new esri.tasks.IdentifyParameters();
		identifyParams.returnGeometry = false;
		identifyParams.geometry = searchPointGraphic.geometry;
		identifyParams.tolerance = 1; // value is in screen pixels
		identifyParams.layerIds = this.layerIds;
        identifyParams.layerOption = this.layerOption;
       	var searchId = searchPointGraphic.attributes["searchId"];
		console.log("Initiating site search id: "+searchId);
		var identifyTask = new esri.tasks.IdentifyTask(this.identifyServiceLoc);
		if (this.map){
			var pixelwidth = map.extent.getWidth() / map.width;
			var pixelsin200m = Math.round(200/pixelwidth)
			if (pixelsin200m > 1) {identifyParams.tolerance = pixelsin200m;}
			identifyParams.width  = map.width; // need to change these if map resizes
        	identifyParams.height = map.height;
        	identifyParams.mapExtent = map.extent;
		}
		else {
			identifyParams.width = 20000;
			identifyParams.height = 20000;
			identifyParams.mapExtent = new esri.geometry.Extent(0,0,20000,20000,searchPointGraphic.geometry.spatialReference).
										centerAt(searchPointGraphic.geometry);
		}
        var identifyDeferred = identifyTask.execute(identifyParams)
        var siteSearchDeferred = new dojo.Deferred();
		identifyDeferred.then(dojo.hitch(this, function(idResults){
            //this.identifyResults.siteResults = idResults;
            // add location graphic too?
			console.log("Completed site search id: "+searchId);
			var resultObject = this._processIdentifyResults(idResults);
			resultObject["searchId"] = searchId;
			resultObject["searchLocation"] = searchPointGraphic;
			resultObject["racquelResultType"] = "racquelSiteResult";
			siteSearchDeferred.callback(resultObject);
        }));
        return siteSearchDeferred;
        // todo run and return a deferredlist so we can handle more than one identifytask
	},
	_processIdentifyResults:function(idResults){
		var resultObject = {};
		for (var i = 0, il = idResults.length; i < il; i++) {
                var idResult = idResults[i];
				var layerName = idResult.layerName
                var displayField = idResult.displayFieldName;
                var idValue = idResult.feature.attributes[displayField];
				// identify task may return more than one object for each layer, if there
				// are overlapping features or if multiple within search tolerance
				if (!resultObject.hasOwnProperty(layerName)) {
					resultObject[layerName] = idValue;
				}
				else {
					resultObject[layerName] = resultObject[layerName] + " | "+idValue;
				}
        }
		return {
			successful:true,
			results: resultObject
		};
	}
	
})
